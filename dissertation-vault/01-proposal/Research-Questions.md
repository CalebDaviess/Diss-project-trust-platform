---
tags: [proposal]
---
# Research Questions

## Primary RQ
> Can a **third-party, cross-game accountability platform** unify safety signals (harassment and external anti-cheat verdicts) against a **single verified identity** into a **portable trust score** that other games can check, and **govern** the resulting outcomes **fairly** (age-appropriate access and appealable sanctions)?

## Sub-questions

### SQ1 — Cross-source accountability #design #empirical
How can **heterogeneous external anti-cheat verdicts** (different vendors, games and offence types), **operator bans**, and the platform's **own harassment signals** be **ingested, audited and unified** on a single verified identity into **one portable trust score** other games can query?
→ Explored in [[Anti-Cheat-Integration]], [[Accountability-Record]], [[Identity-Model]].

### SQ2 — Governance, safety & platform fit #design
How can the platform turn these signals into **fair, accountable, appealable** outcomes — including **age-appropriate access** to older games and the asymmetry that **harassment flags are human-reviewed** while **external anti-cheat verdicts are auto-confirmed but appealable** — **ethically and legally**?
→ Explored in [[Governance]], [[Identity-Model]], [[Legal-Compliance]], [[Age-Assurance]].

### SQ3 — Synthetic conduct classification as a platform input #empirical
Under controlled conditions using **wholly synthetic numerical feature records** (not real messages or audio), can a classifier distinguish simulated toxic from acceptable text/voice conduct while keeping false positives low and recall useful? How do the generated feature proxies affect that trade-off?
→ Explored in [[Features]], [[Models]], [[Evaluation]]. (This is where the detection metrics now sit — a feature, not the headline.)

### SQ4 — Online safety priorities (exploratory survey) #design #empirical
How important do adult gamers and parents/guardians consider addressing cheating and abusive behaviour to be for making online games safer? The survey captures self-reported priorities only; it does not assess acceptance of the proposed platform, measure actual behaviour or prove deterrence.
→ Explored through the anonymous survey and discussed in relation to [[Identity-Model]].

### SQ5 — Optional prototype feedback (exploratory) #design #empirical
What feedback do eligible participants who choose to try the local prototype demo provide about its setup, clarity and usefulness? This is optional, self-selected feedback and will not be treated as representative usability validation.
→ Explored through the optional Docker Desktop demo and feedback section of the anonymous survey.

## Related
- [[Aim]]
- [[Objectives]]
- [[Evaluation]]
