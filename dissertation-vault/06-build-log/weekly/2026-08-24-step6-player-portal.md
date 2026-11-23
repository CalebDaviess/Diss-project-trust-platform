---
tags: [build-log]
---
# Build Log — Step 6 (2026-08-24)

## Goal this period
> Stand up the **player-portal** (Vite + React + TypeScript) and wire it to the built
> accountability-service so a player can submit a gameplay sample and see their **global
> trust score**, per-game suspicion + case history, and **cross-game warnings** — closing the
> MVP loop from score → record → UI ([[web-module]], [[Data-Model#Contract 5 — results view platform → web|Contract 5]]).

## Done
- **Scaffolded the portal** — Vite + React 18 + TypeScript into `player-portal/` (replacing the
  empty placeholder). Scripts: `dev`, `build` (tsc + vite), `preview`, `test`, `test:watch`.
- **Typed API client** (`src/api/accountabilityApi.ts`) — shared types (`FeatureVector`,
  `SampleSubmission`, `ResultView`, `CrossGameSignalView`, `CaseView`), `submitSample` +
  `getResult`, sends the interim `X-Profile-Id` header, throws a typed `ApiError` on non-2xx.
  Base URL from `VITE_API_BASE_URL` (default `http://localhost:8081`).
- **UI** — session bar (interim Profile Id), sample form with one-click **Legit player** /
  **Blatant cheat** presets, results lookup by `gameConnectionId`, and a results panel that
  **always** shows the global trust score, then per-game suspicion/status (or "No records for
  this game"), a case-history table, and a cross-game warnings section. Loading + error states.
- **Conceptual journeys** (identity / age assurance / governance) shown as clearly-labelled
  "designed, not built" placeholders so the design story is present.
- **Backend wiring made demo-ready** — pinned `accountability-service` to `:8081`
  (`quarkus.http.port`) to match the portal default, and enabled **CORS** for the Vite dev
  origin (`http://localhost:5173`) in `application.properties`. No Java code changed.
- **Tests: 9 passing** (Vitest + React Testing Library) — API client URL/headers/parsing +
  encoding + `ApiError`; results panel trust-always / null-records / cross-game warnings.
- **Verified gates:** portal `npm run build` clean + `npm test` 9/9; backend `mvn test` still
  6/6 after the CORS/port change.

## Decisions & rationale
- **Build against the real backend, not the aspirational contract** — the portal sends
  `X-Profile-Id` (what's actually built) rather than a JWT, so the slice is runnable today.
  The swap to `Authorization: Bearer` is isolated to `buildHeaders()`.
- **Match against the backend `SampleSubmission`** — the request carries `gameConnectionId` /
  `operatorId` / `gameId` explicitly (the built DTO), rather than deriving them from a token.
- **Demo presets** — "Legit player" / "Blatant cheat" make the score→UI story a one-click demo.
- **Fix CORS/port in backend config** — a browser demo needs one origin + CORS; doing it in
  `application.properties` keeps it config-only and out of the Java code.

## Blockers / caveats
- **No login yet** — identity is the interim header; `POST /auth` (JWT) still pending.
- Conceptual journeys are **static placeholders** only.
- Report transport is still **in-process** (Kafka/CloudEvents pending) — unchanged this step.

## Where we are vs the spec ([[Definition-of-Done]])
The MVP loop is now **visible end-to-end**: synthetic data → model → `/score` → per-game
record + case history → results shown in the web UI, with global trust + cross-game warnings.
Remaining: JWT auth (`POST /auth`), Kafka + CloudEvents transport, and scorer offence taxonomy.

## Next
- **Auth**: `POST /auth` issuing a JWT, then drop the interim `X-Profile-Id` header end-to-end.
- **Transport**: swap the in-process cheat-report event for a CloudEvents envelope over Kafka.

## Links
- [[web-module]] · [[platform-module]] · [[Data-Model]] · [[Identity-Model]]
- [[Definition-of-Done]] · [[ToDo]] · [[2026-08-24-step5-accountability-service]]

