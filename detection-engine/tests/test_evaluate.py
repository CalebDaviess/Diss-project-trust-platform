"""Tests for Step 4 evaluation (threshold tuning + figure generation)."""

from __future__ import annotations

import numpy as np

from detection_engine.constants import CHANNEL_TEXT, CHANNEL_VOICE
from detection_engine.evaluate import (
    _operating_point,
    evaluate,
    tune_threshold,
)
from detection_engine.train import run_training


def test_tune_threshold_respects_fpr_budget():
    """Synthetic scores: threshold should keep FPR within budget and maximise recall."""
    rng = np.random.default_rng(0)
    # 200 negatives near 0.2, 200 positives near 0.7 (some overlap).
    y = np.array([0] * 200 + [1] * 200)
    scores = np.concatenate([
        rng.normal(0.25, 0.12, 200),
        rng.normal(0.70, 0.15, 200),
    ]).clip(0, 1)
    thr = tune_threshold(y, scores, max_fpr=0.05)
    op = _operating_point(y, scores, thr)
    assert op.fpr <= 0.05 + 1e-9
    assert 0.0 <= thr <= 1.0


def test_operating_point_math():
    y = np.array([0, 0, 1, 1])
    scores = np.array([0.1, 0.9, 0.8, 0.4])
    op = _operating_point(y, scores, 0.5)
    # threshold 0.5: preds = [0,1,1,0] -> tp=1, fn=1, fp=1, tn=1
    assert (op.tp, op.fn, op.fp, op.tn) == (1, 1, 1, 1)
    assert op.recall == 0.5
    assert op.precision == 0.5
    assert op.fpr == 0.5


def test_evaluate_end_to_end_writes_figures(tmp_path):
    """Train, then evaluate; figures + summary written, targets met on realistic data."""
    model_path = tmp_path / "model.joblib"
    run_training(seed=42, model_path=model_path)

    fig_dir = tmp_path / "figures"
    result = evaluate(model_path=model_path, seed=42, fig_dir=fig_dir)

    for fname in ("roc_curve.png", "precision_recall_curve.png",
                  "confusion_matrix.png", "evaluation_summary.json"):
        assert (fig_dir / fname).exists(), f"missing {fname}"

    # Realistic data should still clear the targets after tuning.
    assert result.roc_auc > 0.90
    assert result.tuned.fpr < 0.05
    assert result.tuned.recall >= 0.85
    assert result.meets_targets is True

    # Per-channel breakdown (text vs voice) is reported.
    assert result.per_channel is not None
    assert set(result.per_channel) <= {CHANNEL_TEXT, CHANNEL_VOICE}

