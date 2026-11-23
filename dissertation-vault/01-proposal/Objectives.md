---
tags: [proposal]
---
# Objectives

Each objective is tagged **#empirical** (built & evaluated) or **#design** (designed & critiqued). See [[Scope-and-Management]] for the discipline behind this split.

## Empirical — built & evaluated
- [ ] Build a functional **prototype** (front end + conduct detection + accountability backend end to end) #empirical
- [ ] Generate a **labelled synthetic numerical-feature dataset** representing toxic vs acceptable **text and voice** conduct (no real messages/audio or public-corpus rows) #empirical → [[Synthetic-Data]]
- [ ] **Generate and justify** synthetic numerical proxies for conduct features (no raw text/audio processing) #empirical → [[Features]]
- [ ] **Train & compare ≥3 ML models** producing a calibrated conduct (toxicity) score #empirical → [[Models]]
- [ ] **Evaluate** on unseen data (precision/recall/F1/ROC-AUC); target **≥85% recall, false positives <5%** #empirical → [[Evaluation]]
- [ ] Build the **single-identity accountability record + append-only audit trail** spanning all linked games #empirical → [[Accountability-Record]]
- [ ] Build the **anti-cheat verdict ingestion hook** (external verdict → auto-confirmed, appealable, audited case) #empirical → [[Anti-Cheat-Integration]]
- [ ] **Simulate** the conduct case-building + reporting pipeline to the operator #empirical → [[Cheat-Report-Event|Offence reporting]]

## Design — designed & critiqued
- [ ] **Design & critique** identity *verification* + age assurance + governance #design → [[Identity-Model]], [[Age-Assurance]], [[Governance]]
- [ ] **Critique** the detection-source asymmetry: human-reviewed conduct flags vs auto-confirmed external anti-cheat verdicts #design → [[Governance]]
- [ ] Explore adult gamers’ and parents’/guardians’ views on the **importance of addressing cheating and abusive behaviour** through an anonymous survey; discuss platform acceptance and deterrence through literature only, without claiming measured behavioural change #design
- [ ] Invite survey participants to optionally try a local synthetic-data prototype demo and provide anonymous exploratory feedback on setup, clarity and usefulness; do not treat the self-selected feedback as representative usability validation #design
- [ ] Evaluate **ethics & compliance** (OSA 2023, ICO Children's Code, GDPR) #design → [[Legal-Compliance]]

## Related
- [[Aim]]
- [[Research-Questions]]
- [[Definition-of-Done]]
