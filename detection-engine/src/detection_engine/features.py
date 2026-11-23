"""Step 2 — Conduct features.

The transform layer between the raw synthetic conduct dataset and the models. It:
  - loads the labelled dataset (Step 1 output),
  - enforces the canonical feature order (constants.FEATURE_NAMES) so the models
    and the /score API always agree on the input vector,
  - produces a stratified train/test split,
  - standardises features (fit on TRAIN ONLY — no leakage into the test set).

Feature definitions and justification live in:
    dissertation-vault/03-methodology/Features.md

The same feature order defined here backs the POST /score contract:
    dissertation-vault/04-architecture/Data-Model.md ("Contract 1")

Usage:
    from detection_engine.features import load_dataset, make_split, scale_features
    df = load_dataset()
    split = make_split(df)
    X_train, X_test, scaler = scale_features(split.X_train, split.X_test)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from .constants import COL_CHANNEL, COL_IS_TOXIC, COL_OFFENCE, FEATURE_NAMES

DEFAULT_DATASET_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "sample" / "conduct_dataset.csv"
)
DEFAULT_TEST_SIZE = 0.20
DEFAULT_SEED = 42


@dataclass
class Split:
    """A stratified train/test split, features in canonical order.

    `offence` and `channel` are carried alongside for reporting / per-channel
    evaluation; the models consume only the feature matrix + binary target.
    """

    X_train: pd.DataFrame
    X_test: pd.DataFrame
    y_train: pd.Series
    y_test: pd.Series
    offence_train: pd.Series
    offence_test: pd.Series
    channel_train: pd.Series
    channel_test: pd.Series


def load_dataset(path: Path | str = DEFAULT_DATASET_PATH) -> pd.DataFrame:
    """Load the labelled synthetic conduct dataset from CSV.

    Raises:
        FileNotFoundError: with a hint to run the generator if the CSV is missing.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {path}. Generate it first:\n"
            f"    python -m detection_engine.generate_dataset"
        )
    return pd.read_csv(str(path))


def select_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return just the feature columns, in the canonical FEATURE_NAMES order.

    Enforcing the order here is the single guarantee that training and scoring
    see identical vectors.
    """
    missing = [c for c in FEATURE_NAMES if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset is missing feature columns: {missing}")
    return df[FEATURE_NAMES].copy()


def make_split(
    df: pd.DataFrame,
    test_size: float = DEFAULT_TEST_SIZE,
    seed: int = DEFAULT_SEED,
) -> Split:
    """Stratified train/test split (stratified on the binary toxic label).

    Stratifying preserves the class balance in both partitions, which keeps the
    evaluation honest for the low-FPR target.
    """
    X = select_features(df)
    y = df[COL_IS_TOXIC]
    offence = df[COL_OFFENCE]
    channel = df[COL_CHANNEL]

    (
        X_train, X_test,
        y_train, y_test,
        off_train, off_test,
        ch_train, ch_test,
    ) = train_test_split(
        X, y, offence, channel, test_size=test_size, random_state=seed, stratify=y
    )
    return Split(
        X_train, X_test, y_train, y_test,
        off_train, off_test, ch_train, ch_test,
    )


def scale_features(
    X_train: pd.DataFrame, X_test: pd.DataFrame
) -> tuple[np.ndarray, np.ndarray, StandardScaler]:
    """Standardise features. The scaler is fit on TRAIN ONLY, then applied to both.

    Fitting only on train prevents test-set statistics leaking into training —
    a common methodological error that inflates results.

    Returns:
        (X_train_scaled, X_test_scaled, fitted_scaler)
    """
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    return X_train_scaled, X_test_scaled, scaler

