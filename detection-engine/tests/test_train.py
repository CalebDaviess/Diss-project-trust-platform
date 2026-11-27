"""Tests for model training, comparison, calibration and persistence."""

from __future__ import annotations

import numpy as np
import pytest

from detection_engine.features import make_split, scale_features
from detection_engine.generate_dataset import generate_dataset
from detection_engine.train import (
    MODEL_FACTORIES,
    load_artifact,
    run_training,
    save_artifact,
    select_best,
    toxicity_score,
    train_and_compare,
)


@pytest.fixture(scope="module")
def trained():
    """Train once for the module (training is the slow part)."""
    df = generate_dataset(n_samples=2000, toxic_fraction=0.30, seed=7)
    split = make_split(df, seed=7)
    X_train, X_test, scaler = scale_features(split.X_train, split.X_test)
    results = train_and_compare(X_train, split.y_train, X_test, split.y_test, seed=7)
    return results, split, X_test, scaler


def test_three_models_trained(trained):
    results, *_ = trained
    assert len(results) == 3
    assert {r.name for r in results} == set(MODEL_FACTORIES)


def test_models_beat_chance(trained):
    """With realistic banter/abuse overlap the task is non-trivial, but every model
    should still clearly beat random guessing and the best should be strong."""
    results, *_ = trained
    for r in results:
        assert r.roc_auc > 0.80, f"{r.name} ROC-AUC too low: {r.roc_auc}"
    assert max(r.roc_auc for r in results) > 0.90


def test_toxicity_score_range(trained):
    results, _, X_test, _ = trained
    best = select_best(results)
    scores = toxicity_score(best.model, X_test)
    assert scores.min() >= 0
    assert scores.max() <= 100
    assert scores.dtype == int or np.issubdtype(scores.dtype, np.integer)


def test_select_best_is_highest_auc(trained):
    results, *_ = trained
    best = select_best(results)
    assert best.roc_auc == max(r.roc_auc for r in results)


def test_save_and_load_roundtrip(trained, tmp_path):
    results, split, _, scaler = trained
    best = select_best(results)
    path = tmp_path / "model.joblib"
    save_artifact(path, best, scaler, seed=7)
    loaded = load_artifact(path)
    assert loaded["model_name"] == best.name
    assert loaded["features"] == list(split.X_train.columns)
    assert "scaler" in loaded
    assert loaded["metrics"]["roc_auc"] == pytest.approx(best.roc_auc)


def test_run_training_end_to_end(tmp_path):
    """Full pipeline against the real generated dataset writes an artifact."""
    model_path = tmp_path / "model.joblib"
    results, best = run_training(seed=42, model_path=model_path)
    assert model_path.exists()
    assert best.roc_auc >= max(r.roc_auc for r in results)


def test_artifact_stores_tuned_threshold(tmp_path):
    """run_training should persist a tuned decision threshold in (0,1)."""
    model_path = tmp_path / "model.joblib"
    run_training(seed=42, model_path=model_path)
    loaded = load_artifact(model_path)
    assert "threshold" in loaded
    assert 0.0 < loaded["threshold"] < 1.0


def test_model_version_tags_conduct(tmp_path):
    """The persisted model_version should mark this as a conduct model."""
    model_path = tmp_path / "model.joblib"
    run_training(seed=42, model_path=model_path)
    loaded = load_artifact(model_path)
    assert loaded["model_version"].startswith("conduct-")


def test_run_training_autogenerates_missing_dataset(tmp_path, monkeypatch):
    """Fresh clones / CI runners without conduct_dataset.csv should still train cleanly."""
    import detection_engine.train as train_mod

    missing_csv = tmp_path / "data" / "conduct_dataset.csv"
    monkeypatch.setattr(train_mod, "DEFAULT_DATASET_PATH", missing_csv)

    model_path = tmp_path / "model.joblib"
    run_training(seed=42, model_path=model_path)
    assert missing_csv.exists()
    assert model_path.exists()

