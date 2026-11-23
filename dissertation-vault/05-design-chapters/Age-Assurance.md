---
tags: [design]
---
# Age Assurance

**Designed & critiqued (not built).** Brief design for age-appropriate access controls.

## Intro
The platform supports **age-appropriate access controls** so under-age players are handled correctly. Assurance is **tiered** to accommodate players without formal ID, while minimising data retention.

## Tiers
1. **ID-based** — via the certified provider used for [[Identity-Model]] (documents never stored; hashed token only).
2. **Parental attestation** — for those without ID.
3. **Facial age estimation** — e.g. **Yoti**-style estimation; **images deleted after hashing**.

## Privacy stance
- Minimise collection; retain only hashed tokens.
- Images/documents **deleted after hashing**.
- Aligns with [[Legal-Compliance]] (ICO Children's Code data-minimisation).

## Out of scope
Production identity / facial-age services are **not built** — designed and critiqued only.

## Built in the prototype (self-service age gate)
The create-account flow now implements a working age gate on top of the mocked ID step
([[web-module]], [[Game-Operator-Integration]]).

1. **Self-declaration** — the player answers "Are you 18 or over?" at sign-up.
2. **ID age check (mocked)** — the mocked "scan & verify" reads the date of birth off the document
   and confirms the subject is an adult. If someone declares 18+ but their ID shows under 18, the
   form blocks them and switches to the parental path — the declaration alone is never trusted.
3. **Parental access (under-18)** — an under-18 gets a **guardian-controlled account**: a verified
   adult guardian vouches for them with their *own* ID (which must pass the adult check), the login
   is the guardian's email, and the guardian chooses whether the account may reach **18+ rated
   games** (tier 2, *parental attestation*, from the list above).
4. **Coming of age** — on turning 18 the holder verifies their own ID from the Account tab; the
   account converts to a full adult account, parental control is lifted and full access granted.
5. **18+ game gating** — a guardian-controlled account without consent cannot link an 18+ title.
   The portal shows a lock and the `POST /connections` call is rejected server-side (403). Title
   maturity is a best-effort heuristic in the prototype (a curated 18+ list); production would use
   the operator's official PEGI/ESRB rating at connect time.

### Data stored (minimised)
Only what the access model needs: `account_type` (adult / guardian-controlled), the holder's and
guardian's display names, the guardian's email, and a boolean `mature_access_allowed`. **No date of
birth is stored** — the DOB is used transiently by the mocked check and discarded, consistent with
the data-minimisation stance above and [[Legal-Compliance]].

### Still designed-only
Real ID/age providers (tier 1 certified provider, tier 3 facial estimation) remain mocked; the
prototype proves the *flow and access control*, not the biometric verification.

## Related
- [[Identity-Model]] · [[Legal-Compliance]] · [[Governance]] · [[web-module]] · [[Game-Operator-Integration]]

