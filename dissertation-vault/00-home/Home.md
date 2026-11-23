---
tags: [moc]
---
# 🏠 Home — Map of Content

**One Human, One Account: A Trust and Accountability Platform for Safer, Fairer Competitive Online Games.**

An independent third-party platform, outside individual games, that is designed around **one verified identity**, records safety signals from across games, and **audits** outcomes on a single record. Its conduct classifier is evaluated using **synthetic numerical features**, not real chat or voice recordings.

> [!info] The Pipeline
> `detect conduct · ingest anti-cheat verdict → audit on one identity → govern fairly → act across games`

---

## 📌 Status Board

| Section | State | Start here |
|---------|-------|------------|
| Proposal | ✅ Seeded | [[Aim]] |
| Literature | 🟡 Stub | [[Literature-Review]] |
| Methodology | ✅ Seeded (intros) | [[Synthetic-Data]] |
| Architecture | ✅ Seeded | [[Architecture-Overview]] |
| Design chapters | ✅ Seeded (intros) | [[Identity-Model]] |
| Build log | 🟡 Stub | [[Definition-of-Done]] |
| Results | 🟡 Stub | [[Results]] |
| Writing | ✅ Seeded | [[Word-Budget]] |
| Meta | 🟢 Living | [[ToDo]] |

---

## 01 · Proposal
- [[Aim]]
- [[Research-Questions]]
- [[Objectives]]
- [[Scope-and-Management]]

## 02 · Literature
- [[Literature-Review]] (MOC)
- [[_source-template]] — source note template

## 03 · Methodology
- [[Synthetic-Data]]
- [[Features]]
- [[Models]]
- [[Evaluation]]

## 04 · Architecture
- [[Architecture-Overview]]
- [[Data-Model]]
- [[ml-module]]
- [[platform-module]]
- [[web-module]]
- [[Accountability-Record]]
- [[Cheat-Report-Event]]
- [[Anti-Cheat-Integration]]

## 05 · Design Chapters
- [[Identity-Model]]
- [[Governance]]
- [[Age-Assurance]]
- [[Legal-Compliance]]

## 06 · Build Log
- [[Definition-of-Done]]

## 07 · Results
- [[Results]]

## 08 · Writing
- [[Word-Budget]]

## 99 · Meta
- [[ToDo]]
- [[Glossary]]

---

## 🔑 Scope at a glance

| Built & evaluated (empirical) | Designed & critiqued | Out of scope |
|------------------------------|----------------------|--------------|
| Synthetic numerical-feature conduct dataset + ≥3 calibrated ML models | Single-identity model | Live game integration |
| Accountability record + anti-cheat verdict ingest | Identity *verification* + age assurance | Production identity/age services |
| Evaluation (P/R/F1/ROC-AUC, FPR) | Governance & appeals | Building a cheat detector (third-party) |
| Single-identity record + **append-only audit trail** | Detection-source asymmetry critique | Real-world accuracy validation |
| **Anti-cheat verdict ingest** + conduct report | Legal (OSA 2023 / GDPR / ICO) | Running a production anti-cheat |

**The built join points:** (1) a **conduct-report CloudEvent** emitted from the synthetic-feature scoring flow to the simulated operator, and (2) an **anti-cheat verdict** ingested by the platform (auto-confirmed, appealable). The prototype uses synthetic test accounts and is not connected to live games. See [[Cheat-Report-Event]] and [[Anti-Cheat-Integration]].
