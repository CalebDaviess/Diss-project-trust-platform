---
tags: [architecture]
---
# player-portal/ module

**React frontend — built (first slice).** Code lives in the repo's [`player-portal/`](../../player-portal/) folder (Vite + React + TypeScript).

## Responsibility
Let players sign in or create an account, link their games, submit synthetic conduct-feature samples, see their trust results, record and **audit trail**, track their trust over time, and raise appeals.

## Functional (built)
- **Sign in / create account** — the app opens on a combined sign-in / create-account screen. Sign in via `POST /auth` → JWT (stored, sent as `Authorization: Bearer` on every request; **Sign out** clears it). Create-account collects email + password and a **verified-ID step** (ID type picker — passport / driving licence / etc. — with a mocked 2-second "upload"), then registers via `POST /auth/register`. An **age gate** asks whether the holder is 18+; the mocked ID check reads the date of birth and confirms it. Under-18s create a **guardian-controlled account** (a verified adult guardian vouches, and chooses whether 18+ games are allowed).
- **Age-appropriate access** — guardian-controlled accounts show a "Parent-controlled" banner, block 18+ titles in the Games tab unless the guardian consented, and offer a "verify my own ID" upgrade on turning 18 (`POST /profile/verify-adult`). See [[Age-Assurance]].
- **App shell** — sidebar navigation across **Dashboard**, **My Record**, **Games**, **Appeals**, **Account**, plus a light/dark theme toggle (dark neon default).
- **Dashboard** — reactive stat cards (trust, confirmed offences, active bans, linked games) with an escalating **mascot scene** tier (confetti / thunder / grass / feast / heaven) that reacts to each count, a live **trust-over-time graph**, reliability gauge, cross-game signals and recent activity.
- **Games** — search a live catalogue (Steam store search + curated non-Steam set) with cover art; **Connect** a game (mocked publisher-OAuth consent) to mint a connection; per-connection dev actions submit synthetic feature samples or simulate anti-cheat verdicts/operator bans.
- **My Record** — recent activity by game (reports, appeals, bans) with game art and plain-English outcomes; filter to a single game's history; **active bans** section showing ban type, extent and appealability.
- **Appeals** — submit and track appeals against appealable sanctions through the full lifecycle; non-appealable bans are shown read-only.
- **Account** — identity card, reliability gauge, the same reactive stat cards and trust-over-time graph, ban & sanction records, and case history.
- **Trust over time (built)** — a real graph fed by `GET /trust-history`: it starts at 100 on account creation and steps with every sanction and overturned appeal, filterable **1Y / 5Y / Lifetime**.
- **Game & launcher logos** — Steam titles use real cover art (`steamcdn` hotlink); non-Steam titles fall back to their **launcher brand mark** (Epic / Riot / Battle.net …) via the CC0 `simple-icons` set.

## Mocked and out-of-scope integrations
- Identity and age verification use mocked flows and synthetic test accounts; no real ID provider or document is used → [[Identity-Model]], [[Age-Assurance]].
- The prototype is not connected to live games or real anti-cheat vendors. Anti-cheat events are simulated or supplied as test data.

## Talks to
`player-portal` →(REST + JWT)→ [[platform-module]]. API base URL via `VITE_API_BASE_URL`.

**Contracts it uses** ([[Data-Model]]):
- [[Data-Model#Contract 0 — POST /auth web → platform|`POST /auth`]] → sign in, obtain a JWT; `POST /auth/register` → create account.
- `GET` / `POST` / `DELETE /connections` → list, link and unlink games; `GET /games/search` → catalogue search.
- [[Data-Model#Contract 4 — POST /samples web → platform|`POST /samples`]] → submit a sample (sends `Authorization: Bearer`).
- [[Data-Model#Contract 5 — results view platform → web|`ResultView`]] → render global trust + score + case history + cross-game signals + linked-game / active-ban counts.
- `GET /bans`, `GET /activity`, appeal endpoints, and `GET /trust-history` → record, appeals and the trust graph.

## Related
- [[Architecture-Overview]]
