---
tags: [build-log]
---
# Build Log — Step 11 (2026-11-16)
## Goal this period
> Build **age assurance** into the self-service account flow: an 18+ gate at sign-up, under-18
> **guardian-controlled accounts** with a vouching adult, 18+ game gating, and a "coming of age"
> upgrade — on the live JWT backend ([[Age-Assurance]], [[web-module]], [[Data-Model]]).
## Done
- **Age gate at sign-up** — create-account asks "Are you 18 or over?". The mocked ID "scan & verify"
  now reads a **date of birth** off the document and confirms the subject is an adult; a false 18+
  declaration is caught and switched to the parental path (the declaration alone is never trusted).
- **Guardian-controlled (under-18) accounts** — an under-18 registers with the child's name, a
  **verified adult guardian** (own name, email as the login, and their own adult-checked ID), and a
  guardian consent toggle for **18+ games**. `PlayerProfile` gained `account_type`, `holder_name`,
  `guardian_name`, `guardian_email`, `mature_access_allowed` (V8 migration, all DB-defaulted so
  lazily-created / demo profiles stay full adult accounts). **No date of birth is stored.**
- **Profile API** — `GET /profile` (`ProfileView`: account type, guardian, 18+ access — works with
  no linked games) and `POST /profile/verify-adult` (coming of age). `register()` now creates the
  profile up-front so the account type is known from first sign-in.
- **18+ game gating** — `POST /connections` carries a best-effort `mature` flag; the server rejects
  (403) a mature link for a guardian-controlled account without consent. The Games tab shows an
  **18+ badge**, a lock on blocked titles, and an age-lock notice instead of Connect. Maturity is a
  curated heuristic in the prototype (production would use the operator's PEGI/ESRB rating).
- **Coming of age** — the Account tab shows guardian details and a "Turned 18? Verify my ID & unlock
  full access" action that converts the account to adult and lifts parental control + the 18+ block.
- **Shell** — a "Parent-controlled account" banner (holder + guardian + 18+ status) under the topbar
  and a matching sidebar state.
- **Verified gates** — backend `mvn test` **37/37** (JDK 21; +minor-register, come-of-age, 18+ gate
  allow/block tests); portal `tsc` clean, `vitest` **33/33** (+maturity helper), prod build clean.
  Smoke-tested end-to-end: minor register → `GET /profile` guardian-controlled → GTA V link **403**
  → Rocket League link **200** → `verify-adult` → GTA V link **200**.
## Decisions & rationale
- **Toggle + ID age check** — the holder self-declares, but the (mocked) ID carries the real age and
  overrides a false declaration. Mirrors how a real certified check would work while staying mocked.
- **Guardian vouches with their own adult ID** — the under-18 never "becomes" an adult by declaring
  it; an adult must pass the check, matching the parental-attestation tier in [[Age-Assurance]].
- **No DOB stored** — only the boolean access state is persisted; the DOB is transient. Keeps the
  ICO Children's Code data-minimisation stance in [[Legal-Compliance]].
- **Operator owns the rating (in principle)** — the prototype's maturity heuristic is a stand-in for
  the operator's official age rating, consistent with operator-owned appealability from Step 10.
- **Profile created at register** — so account type is available before any game is linked; the
  native profile upsert still works because every new column is DB-defaulted.
## Blockers / caveats
- Title maturity is a **curated heuristic** (no free, reliable age-rating API wired in yet).
- ID / age verification remains **mocked** — the flow and access control are real, the biometric
  check is not. Parental identity is self-asserted in the prototype.
## Where we are vs the spec ([[Definition-of-Done]])
Age-appropriate access ([[Age-Assurance]]) moves from *designed-only* to a **working flow**:
self-service 18+ gate, guardian-controlled minors, 18+ gating and a coming-of-age upgrade — with
real server enforcement and minimised data.
## Next
- A free, reliable age-rating source for titles (replace the maturity heuristic).
- Package the app to **run through Docker** (still deferred) + CI gates.
- Real certified ID / facial-age providers behind the mocked steps.
## Links
- [[Age-Assurance]] · [[web-module]] · [[Data-Model]] · [[Identity-Model]] · [[Legal-Compliance]]
- [[Definition-of-Done]] · [[ToDo]] · [[2026-11-16-step10-portal-redesign-selfservice]]
