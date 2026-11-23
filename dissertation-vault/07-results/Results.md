---
tags: [results]
---
# Results

> [!note] Scope of results
> The empirical core is now **conduct classification on synthetic numerical features representing
> text/voice conduct**. Those results are
> **in place** (below). The cheat-detection numbers further down are preserved as a
> **retired prototype** — they demonstrate the pipeline methodology, not the current core.

## Conduct detection (built)
Produced by the conduct-detection engine ([[ml-module]], [[Models]], [[Evaluation]]) on the
held-out test set (1,000 samples: 696 text, 304 voice). Figures:
[ROC](figures/roc_curve.png) · [PR](figures/precision_recall_curve.png) ·
[confusion](figures/confusion_matrix.png) · raw numbers in
[`evaluation_summary.json`](figures/evaluation_summary.json).

### Model comparison (test set, default 0.5 threshold)
| Model | Precision | Recall | F1 | ROC-AUC |
|-------|-----------|--------|----|---------|
| **Logistic Regression** (selected) | 0.926 | 0.833 | 0.877 | **0.974** |
| Random Forest | 0.917 | 0.813 | 0.862 | 0.968 |
| Gradient Boosting | 0.919 | 0.830 | 0.872 | 0.974 |

All three are **calibrated** (sigmoid, 5-fold) so the probability output is a meaningful
0–100 toxicity score. Selection is by ROC-AUC (threshold-independent). Notably the **linear
model is competitive here** — unlike the retired cheat prototype, where Random Forest clearly
won. The engineered conduct features (lexicon / severity / targeting / caps / repetition /
burst) are close to linearly separable, so the signal is carried by the features more than by
non-linear interactions — a point returned to in [[Models]] and the discussion.

### Chosen operating point (FPR-first threshold tuning)
The selected model's decision threshold is tuned **down** from 0.5 to **0.380** to lift recall
over the 85% target while holding FPR under 5%:

| Operating point | Threshold | Precision | Recall | FPR | F1 |
|-----------------|-----------|-----------|--------|-----|----|
| Default | 0.500 | 0.926 | 0.833 | 2.9% | 0.877 |
| **Tuned** | **0.380** | 0.887 | **86.7%** | **4.7%** | 0.877 |

**Both targets met** (recall ≥ 85%, FPR < 5%). ROC-AUC 0.974 / PR-AUC 0.956.

### Per-channel: text vs voice (at the tuned threshold)
| Channel | Support | Recall | FPR | Precision | F1 |
|---------|---------|--------|-----|-----------|----|
| Text | 696 | **0.899** | 5.2% | 0.887 | 0.893 |
| Voice | 304 | **0.780** | 3.6% | 0.889 | 0.831 |

Voice recall is materially lower than text (0.780 vs 0.899) in this generated dataset. The
simulated voice channel receives additional numerical noise; this difference is a property of the
generator, not a measured effect of transcription or real speech. The comparison therefore cannot
establish real-world text-versus-voice performance.

> [!todo] Still to add
> - **Fairness slice:** not measurable with the current synthetic features; requires a separately approved, representative real-world dataset ([[Governance]]).
> - Toxic-subtype head (insult / harassment / hate / threat) — currently offence is derived
>   from channel (`chatAbuse` vs `voiceAbuse`), subtype classification is future work.

## Accountability & audit (integration results)
Qualitative/structural results for the governance backbone (**built** — exercised by the
service tests and demonstrable live from the portal):
- Conduct flag → `pending` → human review → `confirmed`/overturned, fully audited.
- **External anti-cheat verdict** ingested → `confirmed` (auto), appealable, audited
  ([[Anti-Cheat-Integration]]). Idempotent on `verdictId`; adjusts global trust.
- Operator ban → global trust update + cross-game signal propagation.
- Every state change appends an immutable, **source-attributed** audit entry
  (who / what / when / why), surfaced in the portal.
- **Detection-source asymmetry** made concrete: the platform's *own* conduct detector opens a
  `pending` case (human-reviewed), whereas a *trusted external* anti-cheat verdict is recorded
  `confirmed` — the critique examined in [[Governance]] / SQ3.
- An in-module **simulated anti-cheat vendor** (dev/test-gated) issues verdicts through the real
  ingest path, so the external-verdict → confirmed → audited → trust-drop → cross-game story runs
  end-to-end without a real vendor.
- End-to-end: one identity carrying conduct + cheat + ban signals across linked games.

## Retired cheat-detection prototype
> Earlier prototype that detected **cheating** from aim/timing/reaction behaviour. It is **retired
> as the empirical core** (cheat detection is now delegated to third-party anti-cheat — see
> [[Scope-and-Management]], [[Anti-Cheat-Integration]]) but is documented here because it
> validated the exact dataset → ≥3 calibrated models → FPR-first threshold tuning → evaluation
> pipeline the conduct engine reuses.

| Model | Precision | Recall | F1 | ROC-AUC |
|-------|-----------|--------|----|---------|
| Logistic Regression | 0.779 | 0.680 | 0.726 | 0.900 |
| **Random Forest** (selected) | 0.945 | 0.863 | 0.902 | **0.977** |
| Gradient Boosting | 0.938 | 0.863 | 0.899 | 0.976 |

- Tuned threshold 0.276 → **Recall 90.3%, FPR 4.7%** (both targets met); offence head ~91% across four cheat archetypes.
- The linear baseline being clearly weaker showed the signal lived in **feature combinations** — the same justification expected to hold for conduct (target + severity + structure).

## Interpretation
> What the numbers mean under **controlled conditions** — not real-world accuracy (see [[Synthetic-Data]]).

The central story is a **deliberate FPR-first trade-off**: for conduct, protecting robust-but-acceptable **banter** from false abuse flags is the priority, exactly as protecting skilled players was for the retired cheat prototype.

## Future work
- **Validate on appropriately sourced, consented game chat/voice** only after separate ethics and data-protection review (the core limitation, see [[Synthetic-Data]]).
- **Richer voice modelling** — real speech, prosody and acoustic models would require a separate study and safeguards.
- **Bias/fairness hardening** — dialect and identity-term robustness in toxicity detection.
- **Live game integration**, **production identity / facial-age services**, and **more anti-cheat vendor adapters** (currently out of scope).

## Related
- [[Evaluation]] · [[Models]] · [[Scope-and-Management]] · [[Anti-Cheat-Integration]]
