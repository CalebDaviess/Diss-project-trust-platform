---
tags: [build-log]
---
# Definition of Done

Tick-box tracker for the **minimum viable pipeline**. The conduct sample in this prototype is a synthetic numerical feature vector, not real chat or voice. The MVP is "done" when this sample flows through, a simulated external anti-cheat verdict is ingested, and both are visible — audited on one demo identity — in the UI.

> **Current scope:** the empirical core is a conduct classifier evaluated on synthetic numerical
> features representing text/voice conduct, alongside an accountability platform that ingests
> simulated anti-cheat verdicts. The prototype is not connected to live games, real identity
> providers or real player communications.

## MVP pipeline
- [x] **Synthetic conduct-feature dataset** (toxic vs acceptable text/voice labels) → [[Synthetic-Data]]
- [x] **Trained conduct model** (≥3 compared, best selected) → [[Models]]
- [x] **Calibrated 0–100 conduct score** exposed via `POST /score` → [[ml-module]]
- [x] **Accountability record + audit trail** in Postgres (score, case history, audit) → [[Accountability-Record]]
- [x] **Conduct threshold check** applied (tuned in [[Evaluation]]; `flagged` on `POST /score`)
- [x] **Conduct-report CloudEvent** on flag → [[Cheat-Report-Event|Offence reporting]]
- [x] **Delivered (Kafka)** to the simulated operator → [[platform-module]]
- [x] **Anti-cheat verdict ingest** `POST /anti-cheat-verdicts` → auto-confirmed, appealable, audited (+ simulated vendor) → [[Anti-Cheat-Integration]]
- [x] **Shown in web UI** (results + case + audit history) → [[web-module]]

## Supporting done-criteria
- [x] Evaluation meets targets (recall ≥ 85%, FPR < 5%) on synthetic conduct features → [[Evaluation]]
- [x] **Ban feedback loop** — `POST /ban-notifications` updates global trust + confirms cases → [[Game-Operator-Integration]] · [[Data-Model#Contract 3a — POST /ban-notifications operator → platform|Contract 3a]]
- [x] Auth working end-to-end (JWT/OIDC) · *`POST /auth` issues an RS256 JWT; backend + portal use the JWT `sub`. Identity *verification* that creates a credential is still designed, not built.*
- [ ] Concept UI present for identity / age / governance → [[Identity-Model]], [[Age-Assurance]], [[Governance]]
- [ ] End-to-end demo runnable from the [root README](../../README.md) Quick Start

> **Legend:** `[x]` done · `[~]` built-but-needs-repointing (reusable from the cheat build) · `[ ]` not started.

## Related
- [[Objectives]] · [[Scope-and-Management]] · [[Architecture-Overview]]
