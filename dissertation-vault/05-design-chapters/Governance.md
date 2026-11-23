---
tags: [design]
---
# Governance

**Designed & critiqued — on top of a built record + audit trail.** How the platform turns a signal (its own conduct flag or an external anti-cheat verdict) into a fair, accountable outcome.

## Intro
Detection alone is not justice. All enforcement must be **proportional, appealable and auditable**. The governance model must handle **two detection sources with different trust**: the platform's own conduct engine (which only ever produces a **pending** flag) and external anti-cheat verdicts (which arrive **already adjudicated**).

## Principles
- **Human-in-the-loop (conduct):** a conduct flag is stored privately as **pending** for **human review**; nothing is confirmed until reviewed.
- **Trusted-source but appealable (cheat):** an external anti-cheat verdict is recorded **confirmed** (the vendor is the specialist), but the player can always **appeal** → re-review.
- **Proportionality:** sanctions scale with severity, history and cross-game pattern.
- **Appealability:** every finding — conduct or cheat — can be appealed → `status: appealed`.
- **Auditability:** every action is written to the append-only [[Accountability-Record#Each case event carries its source|audit trail]] with its source, actor and timestamp.
- **Privacy:** evidence held as secure references, not exposed publicly.
- **Offence-agnostic workflow:** the same review/appeal machinery governs **conduct** offences (`chatAbuse`, `voiceAbuse` — detected here) and **cheat** offences (ingested from anti-cheat). Offence taxonomy: [[Data-Model#`OffenceType` values|Data-Model]].

## Detection-source asymmetry (key critique — SQ3)
| | Conduct (my engine) | Cheat (external anti-cheat) |
|-|---------------------|------------------------------|
| Initial status | `pending` | `confirmed` (auto) |
| Who adjudicates first | Human reviewer | The vendor |
| Appeal | Yes | Yes |
| Risk | Missed/false toxicity flags | **Over-trusting** a vendor; opaque models; no insight into their FP rate |

> Critique: auto-confirming external verdicts imports the vendor's error rate and opacity.
> Mitigations (designed): store vendor `confidence`, allow appeal, and let **cross-game
> corroboration** rather than a single verdict drive the heaviest sanctions. See
> [[Anti-Cheat-Integration]].

## Thresholds (conduct)
- The reporting **threshold** comes from [[Evaluation]] (tuned to keep FPR < 5% — protecting banter).
- Above threshold → build a case → generate a [[Cheat-Report-Event|conduct-report]] to the operator.

## Review & appeals workflow
1. **Conduct:** engine flags → `pending` → human reviewer → `confirmed` / cleared.
2. **Cheat:** verdict ingested → `confirmed` (auto) → audited.
3. Player appeals (either) → `appealed` → re-review.

## Critique
Cost of false positives (banter vs abuse; dialect/identity-term bias), reviewer bias, over-trust of opaque third-party anti-cheat, transparency vs. gaming-the-system, consistency of decisions across sources.

## Feeds continuous learning
Human review of **conduct** cases is designed to support a **fair outcome** and could create a trusted label (`confirmed`/overturned) in a future, separately approved workflow. The prototype does not collect real reviewed cases or retrain on them; continuous learning remains future work in [[Models]] and [[ml-module]].

## Related
- [[Accountability-Record]] · [[Cheat-Report-Event]] · [[Anti-Cheat-Integration]] · [[Evaluation]] · [[Legal-Compliance]]
