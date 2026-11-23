"""Tests for the feature transform layer."""

from __future__ import annotations

import numpy as np
import pytest

from detection_engine.constants import FEATURE_NAMES
from detection_engine.features import (
    load_dataset,
    make_split,
    scale_features,
    select_features,
)
from detection_engine.generate_dataset import generate_dataset


@pytest.fixture
def df():
    """In-memory dataset so tests don't depend on the CSV existing."""
    return generate_dataset(n_samples=2000, toxic_fraction=0.30, seed=7)


def test_select_features_enforces_order(df):
    X = select_features(df)
    assert list(X.columns) == FEATURE_NAMES


def test_select_features_missing_column_raises(df):
    broken = df.drop(columns=["toxicityLexiconScore"])
    with pytest.raises(ValueError, match="missing feature columns"):
        select_features(broken)


def test_split_sizes(df):
    split = make_split(df, test_size=0.20, seed=1)
    assert len(split.X_train) == 1600
    assert len(split.X_test) == 400
    assert list(split.X_train.columns) == FEATURE_NAMES


def test_split_is_stratified(df):
    split = make_split(df, test_size=0.20, seed=1)
    # 30% toxic preserved (±1%) in both partitions.
    assert split.y_train.mean() == pytest.approx(0.30, abs=0.01)
    assert split.y_test.mean() == pytest.approx(0.30, abs=0.01)


def test_split_carries_channel_and_offence(df):
    split = make_split(df, seed=1)
    assert len(split.channel_test) == len(split.X_test)
    assert len(split.offence_test) == len(split.X_test)


def test_scaler_fit_on_train_only(df):
    split = make_split(df, seed=1)
    X_train_scaled, X_test_scaled, scaler = scale_features(split.X_train, split.X_test)
    # Train set standardised => ~0 mean, ~1 std per column.
    assert np.allclose(X_train_scaled.mean(axis=0), 0, atol=1e-6)
    assert np.allclose(X_train_scaled.std(axis=0), 1, atol=1e-6)
    # Test set uses train stats => mean not forced to exactly 0 (no leakage).
    assert not np.allclose(X_test_scaled.mean(axis=0), 0, atol=1e-6)
    assert scaler.n_features_in_ == len(FEATURE_NAMES)


def test_load_dataset_missing_path(tmp_path):
    with pytest.raises(FileNotFoundError, match="generate_dataset"):
        load_dataset(tmp_path / "does_not_exist.csv")

