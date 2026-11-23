---
tags: [build-log]
---
# Build Log — Realism upgrade (2026-07-27)

## Goal this week
> Fix the trivial-separability problem: make the synthetic data realistic so results are
> credible and [[Evaluation]] is meaningful. Grounded in real human-performance research.

## Done
- **Rebuilt `generate_dataset.py` (v2)** around a latent-variable model:
  - **skill** `s ~ Beta(2,3)` shapes legitimate play — skilled humans overlap with cheats.
  - **strength** `c` per cheat — subtle→blatant spectrum; `feat → feat + c·(extreme − feat)`.
  - **Reaction time = ex-Gaussian** (`N + Exp`), grounded in [[Luce-1986-Response-Times]].
  - **Aim = ballistic-then-corrective**, grounded in [[Fitts-1954-Law]].
- **Re-ran the model comparison** — realistic, differentiated results:

  | Model | P | R | F1 | ROC-AUC |
  |-------|---|---|----|---------|
  | Logistic Regression | 0.779 | 0.680 | 0.726 | 0.900 |
  | **Random Forest** | 0.945 | 0.863 | 0.902 | **0.977** |
  | Gradient Boosting | 0.938 | 0.863 | 0.899 | 0.976 |

- **Model versioning** added to the artifact (`model_version`, `trained_at`) → underpins
  the continuous-learning design ([[Models]], [[ml-module]], [[Governance]]).
- Added source notes [[Luce-1986-Response-Times]], [[Fitts-1954-Law]]; linked in [[Literature-Review]].
- Updated test for the non-trivial task (ensembles beat linear baseline). **Suite: 20 passing.**
- Silenced a noisy library deprecation warning in `pyproject.toml`.

## Decisions & rationale
- **Grounded overlap, not arbitrary noise** — realism is defensible because it's tied to
  published human-performance findings, not hand-waving.
- **Signal in the combination** — the linear model's weakness (F1 0.73) *proves* a
  non-linear model is warranted, strengthening the [[Models]] justification.
- **Versioning now, auto-retrain later** — honest scoping of the "improves over time" claim.

## Blockers
- None.

## Next week
- **Step 4 — Evaluation**: tune the decision threshold to FPR < 5% while keeping recall
  ≥ 85%; ROC / PR curves; confusion matrix → [[Evaluation]], [[Results]].

## Links
- [[Synthetic-Data]] · [[Models]] · [[Evaluation]] · [[Definition-of-Done]] · [[ToDo]]

