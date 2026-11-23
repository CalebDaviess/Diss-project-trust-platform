---
tags: [methodology, empirical]
---
# Models

## Intro
The conduct engine trains and compares three models on the **synthetic numerical feature dataset**
([[Synthetic-Data]]), then selects a calibrated **0–100 conduct (toxicity) score** model
([[ml-module]] → `train.py`). The experiment does not use text vectorisation, real chat or audio.
Its metrics describe performance on the generated feature distributions, not real-world accuracy.

## Models compared
1. **Logistic Regression** — a linear baseline on the generated numerical features.
2. **Random Forest** — a tree-ensemble comparison.
3. **Gradient Boosting** — a boosted-tree comparison.

All three are calibrated using sigmoid calibration with five-fold cross-validation. The selected
model and measured results are reported in [[Results]]. `channel` is metadata, not a model input;
the same numeric features are used for synthetic `text` and `voice` rows.

## From probability to a 0–100 score
The selected model's calibrated probability is scaled to 0–100. The decision threshold is tuned in
[[Evaluation]] to meet the false-positive target on the synthetic test set. Calibration does not
make the score a validated measure of real-world conduct.

## Selection criteria
- Recall and **false-positive rate** (primary — avoid punishing banter).
- ROC-AUC and F1 (overall discrimination / balance).
- Calibration quality and interpretability.
- **Fairness** — important for a real deployment, but cannot be tested with this synthetic dataset because it contains no dialect or identity-term language ([[Governance]], [[Legal-Compliance]]).

## Implementation
Trainer: `detection-engine/src/detection_engine/train.py`. It loads the synthetic dataset,
creates a stratified split, scales the numerical features and trains/calibrates the three models.
The selected model artifact is consumed by `POST /score`. Evaluation results and the limitations of
the synthetic test data are reported in [[Results]].

## Offence taxonomy
The binary model determines whether a synthetic sample is flagged. The API maps the sample's
`channel` metadata to `chatAbuse` or `voiceAbuse` when flagged; it does not train a separate offence
classifier. Clean samples carry `offenceType = none`.

> **Cheat** offences (`aimbot`, `wallhack`, …) are **not** produced by any model here — they are
> ingested from external anti-cheat ([[Anti-Cheat-Integration]]) and recorded auto-confirmed.

## Continuous learning (future work)
The governance design considers whether human-reviewed outcomes could support future model
improvement. This is **not part of the current experiment**:

1. The engine flags a conduct case → `pending` (nothing auto-confirmed).
2. A human reviewer would uphold or overturn it.
3. Any use of reviewed real-world data would require separate ethics approval, data-protection
   safeguards and a revised methodology before collection or retraining.

The current model is trained and evaluated only on synthetic data. It does not learn from the
survey responses or real player records.

## Related
- [[Features]] · [[Evaluation]] · [[Synthetic-Data]] · [[Governance]]
