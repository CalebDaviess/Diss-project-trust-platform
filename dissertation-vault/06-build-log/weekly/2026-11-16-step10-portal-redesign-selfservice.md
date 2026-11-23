---
tags: [build-log]
---
# Build Log — Step 10 (2026-11-16)
## Goal this period
> Turn the player-portal from a single-screen demo into a proper **accessible, self-service app**:
> sign-in / create-account, a sidebar app shell, player-linked games, appeals, operator-declared
> bans, a **real trust-over-time graph**, and reactive visual feedback — all on the existing
> JWT backend ([[web-module]], [[Game-Operator-Integration]], [[Data-Model]]).
## Done
- **Auth UX** — combined sign-in / create-account entry screen. Create-account collects email +
  password and a **verified-ID step** (ID-type picker with a mocked 2-second upload), then
  registers via `POST /auth/register`. Sign-in unchanged (`POST /auth` → JWT).
- **App shell** — sidebar nav (Dashboard / My Record / Games / Appeals / Account) + light/dark
  theme toggle (dark neon default). Hand-built, dependency-free SVG visuals re-skin with the theme.
- **Games tab (replaces Submit & Simulate)** — live catalogue search (`GET /games/search`: Steam
  store search + a curated non-Steam set covering Epic / Riot / Battle.net etc.), cover art, and
  **Connect** (mocked publisher-OAuth consent) → `POST /connections`. Per-connection dev actions
  (submit sample, simulate anti-cheat verdict, simulate operator ban).
- **Logos** — Steam titles use real cover art (`steamcdn` hotlink); non-Steam titles fall back to
  their **launcher brand mark** via the CC0 `simple-icons` package (`LauncherLogo` / `GameLogo`).
- **Bans with types** — `ExternalBan` + ban-notification gained `banType` / `appealable`; the
  operator declares type, extent and appealability (platform honours, never decides). `GET /bans`
  surfaces them; non-appealable bans are read-only and rejected by the appeal endpoints. Fixed the
  "linked games → 0 after a ban resolves" bug by counting real connections/bans in `ResultView`
  (`linkedGamesCount` / `activeBanCount`); a ban no longer removes the connection.
- **Appeals tab** — submit + track appeals through the full lifecycle; overturning restores trust.
- **My Record** — recent activity by game with art + plain-English outcomes, single-game filter,
  and an active-bans section (type / extent / appealability).
- **Reactive feedback** — stat cards drive an escalating **mascot scene** tier (confetti / thunder
  / grass / feast / heaven) reacting to each count, on both Dashboard and Account.
- **Trust over time (real graph)** — new `TrustHistory` entity + `GET /trust-history`. Always
  anchored at **100 on account creation** (`PlayerProfile.createdAt`, DB-defaulted so the native
  upsert still works), a point appended on every trust change (`ban`, `anti-cheat`,
  `appeal-overturned`). New `TrustHistoryChart` renders a real step area over calendar dates on a
  fixed 0–100 axis, filterable **1Y / 5Y / Lifetime**; replaces the old synthetic trend.
- **Verified gates** — backend `mvn test` **32/32** (JDK 21), portal `tsc` clean + `vitest`
  **30/30**. Smoke-tested `GET /trust-history` end-to-end: `account_created@100 → ban@65 →
  current@65`.
## Decisions & rationale
- **Player-initiated linking** — connecting a game starts in the portal with a mocked
  publisher-OAuth consent, so the trust model demos with **zero operator setup** yet maps onto a
  real OAuth hand-off later.
- **Operator owns appealability** — `appealable` is a flag on the incoming ban, not a platform
  rule; keeps governance honest and avoids hard-coding policy.
- **Trust is a step function** — it holds between events, so the graph is drawn as a step (not a
  smoothed line) and the series is stored, not derived, so it is **real history** not decoration.
- **`created_at` DB-defaulted** (`insertable=false`) so the lazy-create / native-MERGE profile
  paths both get a creation anchor without Hibernate fighting the upsert.
- **Logos via `simple-icons` (CC0)** — launcher brand marks are used purely as functional
  identifiers where real cover art isn't hotlinkable through the corporate proxy.
## Blockers / caveats
- Create-account **ID verification** and **age assurance / parental vouch** remain mocked stand-ins
  (→ [[Identity-Model]], [[Age-Assurance]]).
- Per-title cover art only for Steam; other launchers show the **launcher** mark, not the game's.
- Dev Postgres is **ephemeral** (Quarkus dev-services) — linked games / history reset on restart.
## Where we are vs the spec ([[Definition-of-Done]])
The portal is now a coherent self-service product: identity session, game linking, record, appeals,
operator bans, and a **real** trust-over-time graph — all on the live JWT backend. Conceptual
journeys (ID / age) stay as mocked steps by design.
## Next
- Package the app to **run through Docker** (deferred this step) and add CI gates.
- Real identity/age-assurance provider behind the mocked create-account steps.
- Per-title art for non-Steam launchers if a free, hotlink-friendly source is found (e.g. IGDB with
  Twitch creds).
## Links
- [[web-module]] · [[Game-Operator-Integration]] · [[Data-Model]] · [[Identity-Model]]
- [[Definition-of-Done]] · [[ToDo]] · [[2026-09-11-step8-portal-login]]
