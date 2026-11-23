---
tags: [proposal]
---
# Scope & Management

The project deliberately separates what is **built and measured** from what is **designed and argued**. The unifying artefact is the **Accountability Record** — an *accountability-record framing* where every player carries a single, identity-linked, **audited** record that the built pipeline reads and writes, and the designed layers reason about. See [[Accountability-Record]].

## Accountability-record framing
The **Accountability Record** is the spine of the whole system:
- The **empirical** pipeline writes to it from two sources: the conduct scorer evaluated on **synthetic numerical feature records** and the **ingested external anti-cheat verdicts**.
- The **designed** layers (identity verification, age, governance) define *who* the record belongs to, *how* it is created, and *how* it is enforced and appealed.
- Everything is **audited**: an append-only trail of who flagged what, when, by which detector/vendor, and the governance outcome.

This lets a small buildable core carry the weight of a much larger conceptual platform without over-claiming.

## In / Designed / Out

| Built & evaluated (in) | Designed & critiqued | Out of scope |
|------------------------|----------------------|--------------|
| Labelled **synthetic numerical-feature** dataset representing toxic vs acceptable text/voice conduct | Single-identity model (one human = one account) | Live game integration |
| Synthetic feature proxies; no real messages, transcripts or audio | Identity *verification* via certified provider | Production identity / facial-age services |
| ≥3 ML models + calibrated 0–100 **conduct (toxicity) score** | Tiered age assurance (parental attestation / facial age est.) | Building a **cheat detector** (delegated to third-party anti-cheat) |
| **Single-identity accountability record + append-only audit trail** | Governance, sanctions, appeals (offence-agnostic) | Real-world accuracy validation |
| **Anti-cheat verdict ingestion hook** (external → auto-confirmed, appealable, audited) | Detection-source asymmetry critique (human-reviewed conduct vs auto-confirmed cheat) | Running / hosting a production anti-cheat |
| Conduct case-building + simulated operator report | Legal compliance (OSA 2023, GDPR, ICO Children's Code) | |
| Evaluation (P/R/F1/ROC-AUC) on synthetic data, low-FPR priority | Importance placed on online-game safety issues (exploratory survey); platform acceptance/deterrence (literature only) | Real behavioural impact / causal deterrence |
| Optional Docker Desktop demo using synthetic data, with anonymous exploratory feedback | Setup, clarity and perceived usefulness among participants who opt in | Representative usability validation or live-game testing |

> **Conduct vs cheating.** The empirical core evaluates a conduct classifier on **synthetic numerical features** representing text/voice conduct; it does not process real chat or audio. **Cheating** (aimbot, wallhack, scripting) is detected by **third-party anti-cheat**; the platform **ingests, audits and governs** those verdicts but does **not** build the detector. The offence taxonomy is in [[Data-Model#`OffenceType` values|Data-Model]].

## The built join points
1. A **conduct-report CloudEvent** (my engine → operator): demo identity token + conduct offence + score + synthetic evidence reference.
2. An **anti-cheat verdict ingest** (external anti-cheat → my platform): hashed identity + cheat offence + vendor + evidence, recorded auto-confirmed and appealable.

See [[Cheat-Report-Event|Offence Reporting & Anti-Cheat Ingest]] and [[Anti-Cheat-Integration]].

## Management (build plan)
- **Step 0** Setup — monorepo; define Accountability Record + audit trail first; prepare and submit survey ethics application before any recruitment.
- **Step 1** Generate the synthetic conduct feature dataset and document its assumptions.
- **Step 2** Prepare the synthetic numerical feature proxies used by the conduct models.
- **Step 3** Train/compare ≥3 models, calibrate toxicity score, expose `/score`.
- **Step 4** Evaluation (P/R/F1/ROC-AUC; tune threshold to FPR target).
- **Step 5** Accountability record + audit trail + conduct report pipeline (CloudEvent to sim operator).
- **Step 6** Anti-cheat verdict ingestion hook (+ simulated vendor) → auto-confirmed, appealable, audited.
- **Step 7** App prototype (auth + results + case/audit history; identity/governance concept UI).
- **Step 8** Prepare a local Docker Desktop demo using synthetic data; offer it only as an optional activity after ethics approval.
- **Step 9** Wrap up (end-to-end demo; analyse survey and any optional demo feedback if ethics approval is granted and responses are collected).

## Related
- [[Objectives]]
- [[Definition-of-Done]]
- [[Architecture-Overview]]
