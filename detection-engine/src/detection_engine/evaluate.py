"""Step 4 — Evaluation.

Loads the trained model artifact, evaluates it on the held-out test set, and tunes
the decision threshold to the project targets:
  - recall >= 85%  (catch most toxic conduct)
  - false-positive rate (FPR) < 5%  (rarely flag acceptable banter as abuse)

FPR is prioritised: wrongly sanctioning a player for ordinary banter is the worst
outcome. We pick the threshold that MAXIMISES recall while keeping FPR <= max_fpr.

Produces figures for the Results chapter (saved into the dissertation vault):
  - roc_curve.png
  - precision_recall_curve.png
  - confusion_matrix.png
and an evaluation_summary.json with the exact numbers (including a per-channel
text vs voice breakdown, since voice carries transcription error).

Metrics and targets are documented in dissertation-vault/03-methodology/Evaluation.md.

Usage:
    python -m detection_engine.evaluate
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # headless (no display in WSL/CI)
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    ConfusionMatrixDisplay,
    auc,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)

from .constants import CHANNEL_TEXT, CHANNEL_VOICE  # noqa: E402
from .features import DEFAULT_SEED, load_dataset, make_split  # noqa: E402
from .train import DEFAULT_MODEL_PATH, load_artifact  # noqa: E402

# Figures live in the dissertation vault so they are part of the write-up.
_REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_FIG_DIR = _REPO_ROOT / "dissertation-vault" / "07-results" / "figures"

TARGET_MAX_FPR = 0.05
TARGET_MIN_RECALL = 0.85


@dataclass
class OperatingPoint:
    threshold: float
    precision: float
    recall: float
    f1: float
    fpr: float
    tn: int
    fp: int
    fn: int
    tp: int


@dataclass
class EvaluationResult:
    model_name: str
    model_version: str
    roc_auc: float
    pr_auc: float
    default: OperatingPoint       # at 0.5
    tuned: OperatingPoint         # at the tuned threshold
    meets_targets: bool
    per_channel: dict | None = None  # text vs voice breakdown at the tuned threshold


def _operating_point(y: np.ndarray, scores: np.ndarray, threshold: float) -> OperatingPoint:
    """Compute metrics at a probability threshold."""
    pred = (scores >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    fpr = fp / (fp + tn) if (fp + tn) else 0.0
    return OperatingPoint(
        threshold=float(threshold),
        precision=float(precision),
        recall=float(recall),
        f1=float(f1),
        fpr=float(fpr),
        tn=int(tn),
        fp=int(fp),
        fn=int(fn),
        tp=int(tp),
    )


def tune_threshold(
    y: np.ndarray,
    scores: np.ndarray,
    max_fpr: float = TARGET_MAX_FPR,
) -> float:
    """Return the threshold that maximises recall while keeping FPR <= max_fpr.

    Uses the ROC curve's thresholds. If no point satisfies the FPR budget, falls back
    to the threshold with the smallest FPR (most conservative).
    """
    fpr, tpr, thresholds = roc_curve(y, scores)
    ok = fpr <= max_fpr
    if not ok.any():
        return float(thresholds[np.argmin(fpr)])
    # Among thresholds within the FPR budget, take the one with highest recall (tpr).
    idx_candidates = np.nonzero(ok)[0]
    best = idx_candidates[np.argmax(tpr[idx_candidates])]
    return float(thresholds[best])


def _plot_roc(y: np.ndarray, scores: np.ndarray, tuned: OperatingPoint, out: Path) -> None:
    fpr, tpr, _ = roc_curve(y, scores)
    plt.figure(figsize=(5, 5))
    plt.plot(fpr, tpr, label=f"ROC (AUC = {roc_auc_score(y, scores):.3f})")
    plt.plot([0, 1], [0, 1], "--", color="grey", label="chance")
    plt.scatter([tuned.fpr], [tuned.recall], color="red", zorder=5,
                label=f"operating point\n(FPR={tuned.fpr:.2f}, recall={tuned.recall:.2f})")
    plt.xlabel("False positive rate")
    plt.ylabel("True positive rate (recall)")
    plt.title("ROC curve — toxic vs acceptable")
    plt.legend(loc="lower right", fontsize=8)
    plt.tight_layout()
    plt.savefig(out, dpi=150)
    plt.close()


def _plot_pr(y: np.ndarray, scores: np.ndarray, out: Path) -> float:
    precision, recall, _ = precision_recall_curve(y, scores)
    pr_auc = auc(recall, precision)
    plt.figure(figsize=(5, 5))
    plt.plot(recall, precision, label=f"PR (AUC = {pr_auc:.3f})")
    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.title("Precision–Recall curve — toxic vs acceptable")
    plt.legend(loc="lower left", fontsize=8)
    plt.tight_layout()
    plt.savefig(out, dpi=150)
    plt.close()
    return float(pr_auc)


def _plot_confusion(op: OperatingPoint, out: Path) -> None:
    cm = np.array([[op.tn, op.fp], [op.fn, op.tp]])
    disp = ConfusionMatrixDisplay(cm, display_labels=["acceptable", "toxic"])
    disp.plot(cmap="Blues", colorbar=False)
    plt.title(f"Confusion matrix (threshold = {op.threshold:.3f})")
    plt.tight_layout()
    plt.savefig(out, dpi=150)
    plt.close()


def _per_channel(
    y: np.ndarray,
    scores: np.ndarray,
    channel: np.ndarray,
    threshold: float,
) -> dict:
    """Recall/FPR broken down by channel (text vs voice) at the tuned threshold."""
    out: dict = {}
    for ch in (CHANNEL_TEXT, CHANNEL_VOICE):
        mask = channel == ch
        if not mask.any():
            continue
        op = _operating_point(y[mask], scores[mask], threshold)
        out[ch] = {
            "support": int(mask.sum()),
            "recall": op.recall,
            "fpr": op.fpr,
            "precision": op.precision,
            "f1": op.f1,
        }
    return out


def evaluate(
    model_path: Path = DEFAULT_MODEL_PATH,
    seed: int = DEFAULT_SEED,
    fig_dir: Path = DEFAULT_FIG_DIR,
    max_fpr: float = TARGET_MAX_FPR,
    min_recall: float = TARGET_MIN_RECALL,
) -> EvaluationResult:
    """Full evaluation: load model, score test set, tune threshold, write figures."""
    artifact = load_artifact(model_path)
    model = artifact["model"]
    scaler = artifact["scaler"]

    df = load_dataset()
    split = make_split(df, seed=seed)
    X_test = scaler.transform(split.X_test)
    y = split.y_test.to_numpy()
    scores = model.predict_proba(X_test)[:, 1]

    roc = float(roc_auc_score(y, scores))
    default_op = _operating_point(y, scores, 0.5)
    thr = tune_threshold(y, scores, max_fpr)
    tuned_op = _operating_point(y, scores, thr)

    fig_dir.mkdir(parents=True, exist_ok=True)
    _plot_roc(y, scores, tuned_op, fig_dir / "roc_curve.png")
    pr_auc = _plot_pr(y, scores, fig_dir / "precision_recall_curve.png")
    _plot_confusion(tuned_op, fig_dir / "confusion_matrix.png")
    per_channel = _per_channel(y, scores, split.channel_test.to_numpy(), thr)

    meets = tuned_op.recall >= min_recall and tuned_op.fpr <= max_fpr
    result = EvaluationResult(
        model_name=artifact.get("model_name", "unknown"),
        model_version=artifact.get("model_version", "unknown"),
        roc_auc=roc,
        pr_auc=pr_auc,
        default=default_op,
        tuned=tuned_op,
        meets_targets=bool(meets),
        per_channel=per_channel,
    )

    with open(fig_dir / "evaluation_summary.json", "w") as fh:
        json.dump(asdict(result), fh, indent=2)

    return result


def main() -> None:
    r = evaluate()
    print(f"Model: {r.model_name} ({r.model_version})")
    print(f"ROC-AUC: {r.roc_auc:.3f}   PR-AUC: {r.pr_auc:.3f}\n")
    print("Default threshold (0.5):")
    print(f"  precision={r.default.precision:.3f} recall={r.default.recall:.3f} "
          f"F1={r.default.f1:.3f} FPR={r.default.fpr:.3f}")
    print(f"\nTuned threshold ({r.tuned.threshold:.3f})  [max FPR {TARGET_MAX_FPR}]:")
    print(f"  precision={r.tuned.precision:.3f} recall={r.tuned.recall:.3f} "
          f"F1={r.tuned.f1:.3f} FPR={r.tuned.fpr:.3f}")
    print(f"  confusion: TP={r.tuned.tp} FN={r.tuned.fn} FP={r.tuned.fp} TN={r.tuned.tn}")
    print(f"\nMeets targets (recall>=85%, FPR<5%): {r.meets_targets}")
    if r.per_channel:
        print("\nPer channel (tuned threshold):")
        for ch, m in r.per_channel.items():
            print(f"  {ch:<6} recall={m['recall']:.3f} FPR={m['fpr']:.3f} (n={m['support']})")
    print(f"Figures -> {DEFAULT_FIG_DIR}")


if __name__ == "__main__":
    main()

