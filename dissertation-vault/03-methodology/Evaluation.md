---
tags: [methodology, empirical]
---
# Evaluation

## Intro
Models are evaluated on a held-out test split of **synthetic numerical feature records** to estimate how well they separate the generated toxic and acceptable classes and to choose an operating threshold. Because a false accusation of abuse is more damaging than a missed borderline case, evaluation **prioritises a low false-positive rate** ([[ml-module]] → `evaluate.py`). These results do not establish performance on real messages or voice.

## Metrics
- **Precision** — of flagged messages, how many are truly toxic.
- **Recall** — of truly toxic messages, how many we catch.
- **F1** — balance of precision and recall.
- **ROC-AUC** — threshold-independent discrimination.
- **Fairness slice** — planned for representative real data; it cannot be meaningfully measured with the current synthetic feature dataset.

## Targets
- **Recall ≥ 85%**
- **False-positive rate < 5%**

## Threshold tuning
Sweep the calibrated 0–100 score threshold; pick the operating point that meets the **FPR target** while maximising recall. Record the chosen threshold — it is the value `accountability-service` uses for the conduct reporting decision ([[Accountability-Record]], [[Cheat-Report-Event|Offence reporting]]).

## Protocol
- Train/validation/test split (or cross-validation) on the conduct dataset.
- No test data seen during training or threshold selection.
- Evaluate synthetic **text** and **voice** channel labels separately **and** combined (the generated voice channel has additional numerical noise, not transcription error).
- Figures (ROC curve, PR curve, confusion matrix) exported to `07-results/figures/`.

## Honest caveat
Metrics reflect the generator's controlled feature distributions and labels, not real-world accuracy. See [[Synthetic-Data]] and [[Results]].

## Implementation
Evaluator: `detection-engine/src/detection_engine/evaluate.py`. It loads the saved model
artifact, score the **held-out test set** (same split as training, so no leakage), compute
**ROC-AUC** and **PR-AUC**, **tune the threshold** via the ROC curve (maximise recall while keeping
FPR ≤ 5% — FPR-first, because a false abuse flag is the worst outcome), report the operating point at
both the default 0.5 and the tuned threshold, and write figures + an `evaluation_summary.json`.

The evaluation results are reported in [[Results]]. The retired cheat-detection prototype is
documented separately and is not evidence about real conduct detection.

## Related
- [[Models]] · [[Results]] · [[Cheat-Report-Event]]
