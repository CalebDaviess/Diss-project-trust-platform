---
tags: [meta]
---
# Glossary

| Term | Meaning |
|------|---------|
| **Accountability Record** | Per-player record (hashed id, conduct score, case history, **audit trail**, evidence refs, status). See [[Accountability-Record]]. |
| **Aimbot** | Cheat that automates aiming; detected by **external anti-cheat**, ingested here. See [[Anti-Cheat-Integration]]. |
| **Anti-cheat verdict** | A cheat detection pushed in by a third-party anti-cheat; recorded **auto-confirmed, appealable**. See [[Anti-Cheat-Integration]]. |
| **ASR (Automatic Speech Recognition)** | A possible future method for converting speech to text. The current model experiment uses synthetic numerical features and has no ASR or speech input. See [[ml-module]]. |
| **Audit trail** | Append-only log of every action on a record (source, actor, time, evidence). See [[Accountability-Record]]. |
| **Ban-evasion** | A banned player returning under a new account; blocked by [[Identity-Model]]. |
| **Calibration** | Adjusting model outputs so scores reflect true probabilities → 0–100 score. See [[Models]]. |
| **Case-building** | Assembling evidence + context once a conduct threshold is breached. See [[Governance]]. |
| **CloudEvent** | Standard event format used for the **conduct-report**. See [[Cheat-Report-Event]]. |
| **Conduct offence** | A synthetic text/voice conduct class (`chatAbuse`/`voiceAbuse`) classified from generated numerical features; not a finding about real participant communications. See [[Data-Model#`OffenceType` values|Data-Model]]. |
| **Conduct / toxicity score** | Calibrated 0–100 output of the conduct-detection engine. See [[ml-module]]. |
| **Detection-source asymmetry** | Conduct flags are human-reviewed (`pending`); external cheat verdicts are auto-confirmed. See [[Governance]]. |
| **FPR (False-Positive Rate)** | Fraction of acceptable synthetic feature samples wrongly flagged; the experiment targets < 5% on its held-out test data. See [[Evaluation]]. |
| **Ground truth** | Generated class labels assigned under the project's synthetic data rules; not human-annotated real conduct. See [[Synthetic-Data]]. |
| **Hashed identity token** | One-way hash standing in for identity; raw documents never stored. See [[Identity-Model]]. |
| **ROC-AUC** | Threshold-independent measure of separability. See [[Evaluation]]. |
| **Smurfing** | A skilled player using a low-ranked alternate account. |
| **Trust score** | Global, player-facing score (fed by conduct + ingested cheat/ban signals) visible to games they join. See [[Identity-Model]]. |
| **Voice scrubbing** | A proposed privacy safeguard for possible future real voice processing; no voice audio or transcript is processed or retained in the current experiment. See [[ml-module]], [[Legal-Compliance]]. |
| **Zen script** | Scripted input (macro) automating in-game actions; a cheat detected externally (`scripting`). |

## Related
- [[Home]]
