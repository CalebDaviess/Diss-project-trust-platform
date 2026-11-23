---
tags: [build-log]
---
# Build Log — Step 1 (2026-07-27)

## Goal this week
> Complete **Step 1 — Synthetic dataset** (first tick of the [[Definition-of-Done]] MVP pipeline).

## Done
- Created the `detection_engine` Python package under `src/` (`__init__.py`, `constants.py`).
- Built `generate_dataset.py` — labelled synthetic generator with documented ground-truth distributions per cheat archetype → [[Synthetic-Data]].
- Generated `data/sample/synthetic_dataset.csv`: **5000 samples, 70/30 legit/cheat**, seed 42.
- Added `tests/test_generate_dataset.py` — **8 tests passing** (shape, balance, label consistency, reproducibility, feature ranges, archetype separation).
- Ticked "Synthetic data" in [[Definition-of-Done]].

## Decisions & rationale
- **`constants.py` as single source of truth** for feature names + offence labels — keeps generate/features/train/API aligned with [[Data-Model]].
- **70/30 class imbalance** (not 50/50) — realistic, and makes the low-FPR target in [[Evaluation]] meaningful.
- **Archetypes perturb only their target feature family** — keeps the "why these features" argument in [[Features]] clean (aimbot→Aim, timing→Timing, reaction→Reaction, triggerbot→Reaction+Aim).
- **CSV git-ignored, seed fixed** — reproducible from code rather than committing data.

## Blockers
- None.

## Next week
- **Step 2 — Behavioural features** (`features.py`): load the dataset, formalise the feature transform/scaling used by the models → [[Features]].

## Links
- [[Definition-of-Done]] · [[ToDo]] · [[Synthetic-Data]] · [[Features]]

