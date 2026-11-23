---
tags: [build-log]
---
# Build Log — Step 2 (2026-07-27)

## Goal this week
> Complete **Step 2 — Behavioural features**: a clean transform layer feeding the models.

## Done
- Added `features.py` — `load_dataset`, `select_features` (canonical order), `make_split` (stratified 80/20), `scale_features` (StandardScaler, fit on train only) → [[Features]].
- Added `tests/test_features.py` — **6 tests passing** (order, missing-column guard, split sizes, stratification, no-leakage scaling, missing-file error).
- Full suite now **14 passing** (Step 1 + Step 2).
- Updated [[Features]] with an "Implementation (as built)" section; marked feature task done in [[ToDo]].

## Decisions & rationale
- **Canonical feature order in one place** (`FEATURE_NAMES`) — the guarantee that training and the `POST /score` API use identical vectors ([[Data-Model]]).
- **Stratified split** — preserves the 70/30 balance in train and test, keeping the low-FPR target meaningful in [[Evaluation]].
- **Scaler fit on TRAIN only** — prevents test-set leakage that would inflate results.
- **No feature selection yet** — all six retained; revisit during model comparison.

## Blockers
- None.

## Next week
- **Step 3 — Train & compare ≥3 models** (`train.py`): Logistic Regression, Random Forest, Gradient Boosting; calibrate the 0–100 score → [[Models]].

## Links
- [[Definition-of-Done]] · [[ToDo]] · [[Features]] · [[Models]]

