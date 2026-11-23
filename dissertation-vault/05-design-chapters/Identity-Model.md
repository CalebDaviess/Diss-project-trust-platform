---
tags: [design]
---
# Identity Model

**Login & tokens built; identity *verification* designed (not built).** How the platform ties each player to one verified profile and many linked game accounts.

> **Build status:** `POST /auth` now checks stored bcrypt credentials and issues a stateless
> RS256 JWT whose `sub` is the hashed `profileId`; the backend enforces the JWT `sub` as identity
> (production is JWT-only). What remains **designed, not built** is the *certified-provider
> verification* that creates a credential in the first place — see [[Data-Model#Contract 0 — POST /auth web → platform|Contract 0]].

## Intro
The core principle is **one verified human = one platform profile**. That profile can link to multiple game/operator accounts (one per game/operator pair). Onboarded games require the player to **link their verified platform identity before they are allowed to play**, which is what makes cross-game accountability enforceable. This separation keeps game-level case handling local while preserving platform-level accountability.

## Mechanism
- Identity verified via a **certified provider**.
- **Original documents are never stored** — only a **hashed token** is retained.
- The hashed token becomes the `profileId` for the platform profile and linked game records.
- A **global trust score** is maintained at profile level and is visible across games.
- Offence/case history is stored per game account (via per-connection [[Accountability-Record]] entries), **audited**, and spans every signal source — the platform's **conduct** detection and **ingested external anti-cheat** verdicts.
- Games receive cross-game warning summaries: a **cheat ban, chat ban or voice ban in one game is visible on the player's single account everywhere** (confirmed-offence count + active-ban flag).

## Ban-evasion resistance
Because sanctions attach to the identity-linked profile (not a disposable account), a banned human cannot simply re-register to escape their history. A ban or anti-cheat verdict enforced in one game feeds back into the platform and reduces global trust for all linked games.

## Critique (SQ3, literature-based)
- **Acceptance:** will players accept a single-identity requirement? Privacy concerns, friction at sign-up.
- **Deterrence:** would one-human-one-account deter harmful behaviour, or push it elsewhere?
- Treated as **literature-based discussion**, not a measured outcome.

## Related
- [[Accountability-Record]] · [[Age-Assurance]] · [[Governance]] · [[Legal-Compliance]]
- [[Game-Operator-Integration]]
- [[Research-Questions]]

