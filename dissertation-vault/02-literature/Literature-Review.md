---
tags: [moc, literature]
---
# Literature Review (MOC)

Map of Content for the literature review chapter (~2000 words — see [[Word-Budget]]).

## Themes to cover
1. **Harm in online games** — toxic chat/voice abuse and cheating; prevalence, impact on fairness, retention and player safety.
2. **Toxicity / hate-speech detection (context)** — NLP features and models, public corpora (e.g. Jigsaw), the banter-vs-abuse boundary, context dependence and annotation subjectivity. Public corpora are literature context only; the experiment uses generated numerical features, not corpus rows.
3. **Voice / multimodal moderation (future-work context)** — ASR-then-classify vs acoustic models; transcription error; prosody as an aggression cue. The current experiment does not process speech or evaluate these methods.
4. **Fairness & bias in moderation** — dialect/identity-term bias, false-positive cost, calibration.
5. **Third-party anti-cheat landscape (context, not built)** — signature/kernel vs behavioural/ML services; why detection is delegated here; verdict trust/opacity.
6. **Identity & Sybil resistance** — one-human-one-account, ban-evasion, smurfing, cross-game accountability.
7. **Age assurance** — methods, accuracy, privacy.
8. **Governance & fairness** — proportionality, appeals, human-in-the-loop, auditability, the trusted-source-but-appealable asymmetry.
9. **Regulation** — Online Safety Act 2023, GDPR, ICO Children's Code. See [[Legal-Compliance]].
10. **Player acceptance & deterrence** — literature context only; SQ4's survey measures general online-safety priorities, not platform acceptance or behavioural effects.

## Sources
> One note per source in `sources/`, created from [[_source-template]].
> Each records: full citation, key points, and **how it supports my argument**.

- _(add toxicity / hate-speech / content-moderation source notes here as `[[wikilinks]]` — the new empirical grounding)_
- [[Luce-1986-Response-Times]] — reaction-time distributions (ex-Gaussian); grounded the **retired** cheat prototype's reaction model (now context only).
- [[Fitts-1954-Law]] — ballistic-then-corrective aiming; grounded the **retired** cheat prototype's aim model (now context only).

## Reading notes
Free-form reading notes live in `reading-notes/`.

## Related
- [[Research-Questions]]
- [[Features]]
- [[Models]]
- [[Legal-Compliance]]
