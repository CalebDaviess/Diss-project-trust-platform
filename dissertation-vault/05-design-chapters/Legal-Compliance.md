---
tags: [design]
---
# Legal & Compliance

**Designed & critiqued (not built).** How the platform's design engages with the relevant legal and regulatory framework.

## Intro
The proposed platform raises issues around **chat/voice conduct content**, identity, children's access, and **third-party anti-cheat verdicts**. In the current dissertation, the conduct model uses synthetic numerical features only; no real chat, audio, player identities or identity documents are processed. This chapter critiques the safeguards that a real deployment would require.

## Frameworks

### Online Safety Act 2023 (OSA)
- Duties around user safety and protecting children from harm.
- Relevance: **conduct (toxic chat/voice) detection & reporting**, cross-game accountability, and age-appropriate access.

### UK GDPR / Data Protection Act 2018
- Lawful basis, **data minimisation**, purpose limitation, storage limitation.
- Relevance: identity, chat/voice evidence and anti-cheat verdicts would need a lawful basis, minimisation and retention controls in production. The prototype uses synthetic/demo identifiers and evidence references; it does not hold real identity documents, communications or participant data in the model pipeline.

### ICO Age-Appropriate Design Code (Children's Code)
- Best interests of the child, data minimisation, high-privacy defaults.
- Relevance: [[Age-Assurance]] tiers, deleting images after hashing.

## Design responses
- **Proposed production safeguard:** store hashed tokens, not raw identity/documents.
- **Real-content processing is not implemented.** The current model experiment uses synthetic feature values and does not receive or retain chat, transcripts or audio. A future real-time design would need a separate lawful-basis, minimisation, retention and evidence-handling assessment ([[ml-module#Data handling]]).
- **Proposed production safeguard:** delete images after hashing (age estimation); this prototype uses no real age-assurance images.
- **Human-reviewed, appealable** enforcement (proportionality) — see [[Governance]].
- The prototype's evidence and case flows use synthetic/demo data; any production evidence handling is a proposed design, not an activity in this study.

## Tensions to critique
Content moderation vs. privacy/free expression; **toxicity-model bias** against dialects/identity terms vs. safety; **over-trusting opaque third-party anti-cheat** verdicts vs. due process; accuracy of age estimation vs. exclusion risk; transparency vs. anti-evasion.

## Related
- [[Identity-Model]] · [[Age-Assurance]] · [[Governance]]
