---
tags: [build-log]
---
# Build Log — Step 4 (2026-07-27)

## Goal this week
> Evaluate on unseen data and **tune the decision threshold** to hit the targets
> (recall ≥ 85%, FPR < 5%); produce Results-chapter figures.

## Done
- Added `evaluate.py` — loads the model artifact, scores the held-out test set, tunes the
  threshold (maximise recall subject to **FPR ≤ 5%**), and exports figures + summary JSON.
- **Results (Random Forest, seed 42):** ROC-AUC 0.977, PR-AUC 0.964.

  | Operating point | Threshold | Precision | Recall | F1 | FPR |
  |-----------------|-----------|-----------|--------|----|-----|
  | Default | 0.500 | 0.945 | 0.863 | 0.902 | 0.021 |
  | **Tuned** | 0.276 | 0.891 | **0.903** | 0.897 | **0.047** |

  → **Both targets met.** Tuning spends the FPR budget to lift recall 86.3% → 90.3%.
- Generated `roc_curve.png`, `precision_recall_curve.png`, `confusion_matrix.png`,
  `evaluation_summary.json` in `07-results/figures/` (tracked — dissertation deliverables).
- Added `tests/test_evaluate.py` (3 tests). **Suite: 23 passing.**
- Filled [[Results]] (metrics table, operating point, embedded figures); updated
  [[Evaluation]] with the "as built" section; ticked [[Definition-of-Done]] boxes
  (threshold check + evaluation targets).

## Decisions & rationale
- **FPR-first tuning** — a false ban is the worst outcome; we maximise recall only within
  the 5% FPR budget.
- **Figures into the vault** — versioned alongside the write-up, regenerable via
  `evaluate.py`.
- **Same seed/split as training** — no test-set leakage into threshold selection.

## Blockers
- None. The empirical ML core (Steps 1–4) is complete and meets targets.

## Next week
- **Step 5 — Case & reporting pipeline** (platform): expose `POST /score`, update the
  [[Accountability-Record]], apply the threshold, build the [[Cheat-Report-Event]] and
  deliver once via Kafka to the simulated operator.

## Links
- [[Evaluation]] · [[Results]] · [[Models]] · [[Definition-of-Done]] · [[ToDo]]

