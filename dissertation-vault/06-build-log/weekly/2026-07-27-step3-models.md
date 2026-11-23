---
tags: [build-log]
---
# Build Log — Step 3 (2026-07-27)

## Goal this week
> Complete **Step 3 — Train & compare ≥3 models**, calibrate the 0–100 suspicion score.

## Done
- Added `train.py` — trains Logistic Regression, Random Forest, Gradient Boosting with explicit hyperparameters; calibrates each (`CalibratedClassifierCV`, sigmoid, 5-fold); compares by P/R/F1/ROC-AUC; selects best; saves model + scaler + feature order to `models/model.joblib` → [[Models]].
- Added `suspicion_score()` — calibrated probability → integer 0–100.
- Added `tests/test_train.py` — **6 tests**; full suite now **20 passing**.
- Ticked "Trained model" in [[Definition-of-Done]].

## Decisions & rationale
- **Calibration** (not raw probabilities) — so a score of 80 genuinely means ~80% likely cheating; essential for a fair 0–100 scale.
- **Select by ROC-AUC** — threshold-independent, robust to the 70/30 imbalance.
- **Save scaler + feature order with the model** — guarantees the `POST /score` API transforms inputs identically to training.
- **Explicit hyperparameters** — documented and reproducible for the write-up.

## Blockers / issues
- ⚠️ **Near-perfect scores** (RF/GB ROC-AUC = 1.000). The synthetic archetypes are **too separable** — the task is currently trivial. Logged as a limitation in [[Synthetic-Data]] and [[Models]]; **next action** is to make the data realistic (overlap/noise/subtle cheats) before [[Evaluation]].

## Next week
- **Make synthetic data harder** → then re-run the comparison → then **Step 4 — Evaluation** (threshold tuning to FPR < 5%) → [[Evaluation]].

## Links
- [[Definition-of-Done]] · [[ToDo]] · [[Models]] · [[Synthetic-Data]] · [[Evaluation]]

