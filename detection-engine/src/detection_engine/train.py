"""Step 3 — Train and compare models; calibrate the 0-100 conduct (toxicity) score.

Trains three classifiers on the conduct features and compares them, then calibrates
the best one so its probability output is a *meaningful* 0-100 toxicity score
(calibration means "score 0.8" really does mean ~80% likely toxic).

Models compared (justified in dissertation-vault/03-methodology/Models.md):
  - Logistic Regression : simple, interpretable linear baseline.
  - Random Forest       : non-linear, handles feature interactions.
  - Gradient Boosting   : strong sequential ensemble.

The best model + the fitted scaler + feature order are saved together so the
POST /score API applies the exact same transform at inference time.

There is NO second offence-classifier head for conduct: "which" conduct offence a
sample is (chatAbuse vs voiceAbuse) is determined by the CHANNEL, not learned from
the features, so /score derives it directly. (Toxic subtype classification —
insult/harassment/hate/threat — is noted as future work.)

Threshold *tuning* to hit the low-FPR target is Step 4 ([[Evaluation]]); here we
compare at the default 0.5 threshold and select by ROC-AUC (threshold-independent).

Usage:
    python -m detection_engine.train
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score

from .constants import FEATURE_NAMES
from .features import DEFAULT_DATASET_PATH, DEFAULT_SEED, load_dataset, make_split, scale_features
from .generate_dataset import generate_dataset

DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "model.joblib"

# Model factories keyed by name. Each takes a seed for reproducibility.
# Hyperparameters are stated explicitly (not left implicit) so the dissertation can
# document the exact model configuration used.
MODEL_FACTORIES = {
    "logistic_regression": lambda seed: LogisticRegression(
        max_iter=1000, random_state=seed
    ),
    "random_forest": lambda seed: RandomForestClassifier(
        n_estimators=200,
        max_features="sqrt",
        min_samples_leaf=1,
        random_state=seed,
    ),
    "gradient_boosting": lambda seed: GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=3,
        random_state=seed,
    ),
}


@dataclass
class ModelResult:
    """A trained (calibrated) model plus its comparison metrics."""

    name: str
    model: CalibratedClassifierCV
    precision: float
    recall: float
    f1: float
    roc_auc: float

    def summary(self) -> str:
        return (
            f"{self.name:<20} "
            f"P={self.precision:.3f}  R={self.recall:.3f}  "
            f"F1={self.f1:.3f}  ROC-AUC={self.roc_auc:.3f}"
        )


def toxicity_score(model, X: np.ndarray) -> np.ndarray:
    """Convert calibrated toxic-probabilities into integer 0-100 toxicity scores."""
    proba = model.predict_proba(X)[:, 1]
    return np.round(proba * 100).astype(int)


def train_model(name: str, X_train: np.ndarray, y_train: pd.Series, seed: int) -> CalibratedClassifierCV:
    """Train one model wrapped in probability calibration (sigmoid, 5-fold)."""
    base = MODEL_FACTORIES[name](seed)
    calibrated = CalibratedClassifierCV(base, method="sigmoid", cv=5)
    calibrated.fit(X_train, y_train)
    return calibrated


def evaluate_model(model, X_test: np.ndarray, y_test: pd.Series) -> dict[str, float]:
    """Metrics at the default 0.5 threshold (+ threshold-free ROC-AUC)."""
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    return {
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, y_proba)),
    }


def train_and_compare(
    X_train: np.ndarray,
    y_train: pd.Series,
    X_test: np.ndarray,
    y_test: pd.Series,
    seed: int = DEFAULT_SEED,
) -> list[ModelResult]:
    """Train all three models and return their results."""
    results = []
    for name in MODEL_FACTORIES:
        model = train_model(name, X_train, y_train, seed)
        metrics = evaluate_model(model, X_test, y_test)
        results.append(ModelResult(name=name, model=model, **metrics))
    return results


def select_best(results: list[ModelResult]) -> ModelResult:
    """Pick the best model by ROC-AUC (threshold-independent, robust to imbalance)."""
    return max(results, key=lambda r: r.roc_auc)


def save_artifact(
    path: Path,
    best: ModelResult,
    scaler,
    seed: int,
    threshold: float = 0.5,
) -> None:
    """Persist the best model + scaler + feature order + metadata for the API.

    A timestamped `model_version` is stored so that repeated retraining (e.g. as
    human-reviewed labels accumulate — see the continuous-learning design in
    dissertation-vault/03-methodology/Models.md) produces traceable versions. The
    version string is also what the POST /score response returns as `modelVersion`.

    The tuned decision `threshold` (recall>=85% / FPR<5% target from Step 4
    [[Evaluation]]) is persisted alongside the model so the POST /score API makes
    the flag/no-flag decision at the correct operating point rather than 0.5.
    """
    trained_at = datetime.now(timezone.utc)
    model_version = f"conduct-{best.name}-{trained_at:%Y%m%d%H%M%S}"
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": best.model,
            "scaler": scaler,
            "features": FEATURE_NAMES,
            "model_name": best.name,
            "model_version": model_version,
            "trained_at": trained_at.isoformat(),
            "threshold": float(threshold),
            "metrics": {
                "precision": best.precision,
                "recall": best.recall,
                "f1": best.f1,
                "roc_auc": best.roc_auc,
            },
            "seed": seed,
        },
        path,
    )


def load_artifact(path: Path = DEFAULT_MODEL_PATH) -> dict:
    """Load the saved model artifact."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"No trained model at {path}. Train it first:\n"
            f"    python -m detection_engine.train"
        )
    return joblib.load(path)


def run_training(seed: int = DEFAULT_SEED, model_path: Path = DEFAULT_MODEL_PATH):
    """Full Step 3 pipeline: load (auto-generating if absent) -> split -> scale -> train -> tune -> save."""
    # Local import avoids a circular import (evaluate imports from train).
    from .evaluate import TARGET_MAX_FPR, tune_threshold

    if not DEFAULT_DATASET_PATH.exists():
        DEFAULT_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
        generate_dataset(seed=seed).to_csv(DEFAULT_DATASET_PATH, index=False)

    df = load_dataset(DEFAULT_DATASET_PATH)
    split = make_split(df, seed=seed)
    X_train, X_test, scaler = scale_features(split.X_train, split.X_test)

    results = train_and_compare(X_train, split.y_train, X_test, split.y_test, seed)
    best = select_best(results)

    # Tune the decision threshold to the recall>=85% / FPR<5% target on the held-out
    # test set, so persisted decisions use the correct operating point (not 0.5).
    test_scores = best.model.predict_proba(X_test)[:, 1]
    threshold = tune_threshold(split.y_test.to_numpy(), test_scores, TARGET_MAX_FPR)

    save_artifact(model_path, best, scaler, seed, threshold=threshold)
    return results, best


def main() -> None:
    results, best = run_training()
    print("Model comparison (test set, default 0.5 threshold):\n")
    for r in results:
        print("  " + r.summary())
    print(f"\nBest model (by ROC-AUC): {best.name}")
    print(f"Saved -> {DEFAULT_MODEL_PATH}")


if __name__ == "__main__":
    main()

