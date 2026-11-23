---
tags: [build-log]
---
# Build Log — Step 8 (2026-09-11)
## Goal this period
> Wire the **player-portal** to the JWT auth built in Step 7 so identity is a real signed-in
> session end-to-end — sign in via `POST /auth`, send `Authorization: Bearer`, and remove the
> interim `X-Profile-Id` header from the browser ([[web-module]], [[Identity-Model]],
> [[Data-Model#Contract 0 — POST /auth web → platform|Contract 0]]).
## Done
- **API client (`accountabilityApi.ts`)** — added `login(username, password)` (`POST /auth` →
  `AuthResponse`), and switched `submitSample` / `getResult` to take a **token** and send
  `Authorization: Bearer <token>`. The `X-Profile-Id` header is gone.
- **Login gate (`App.tsx`)** — token held in React state; when signed-out the app shows only the
  sign-in form, when signed-in it shows the sample/lookup/results UI. A `401` on any request
  clears the token (forces re-login).
- **`LoginForm`** — username/password form, prefilled with the dev demo login for a one-click
  sign-in; shows an inline error on bad credentials.
- **`SessionBar`** — now a "Signed in as … / Sign out" bar (was the interim Profile-Id input).
- **Env (`.env.example`)** — dropped `VITE_PROFILE_ID`; added `VITE_DEMO_USERNAME` /
  `VITE_DEMO_PASSWORD` (match the backend's seeded dev/test demo user).
- **Tests: 11 passing** — API tests now assert the `Bearer` header + no `X-Profile-Id`, plus a new
  `login` test (posts creds to `/auth`; 401 → `ApiError`); ResultsPanel tests unchanged.
- **Verified gates:** portal `npm run build` clean (tsc + vite) and `npm test` 11/11.
## Decisions & rationale
- **Token in memory (React state)** — simplest for a prototype; a refresh requires re-login. Avoids
  the `localStorage`-vs-XSS debate; can be revisited if session persistence is needed.
- **Prefilled demo login** — keeps the score→UI story a one-click demo while using the real auth path.
- **401 → sign out** — a natural, honest handling of an expired/invalid token in the UI.
- **Removed the header entirely from the portal** — the browser now only ever sends a Bearer token,
  matching the production JWT-only backend; the `X-Profile-Id` dev fallback remains for curl/tests.
## Blockers / caveats
- **No refresh flow** — 1h token; expiry means re-login (acceptable for the prototype).
- Conceptual journeys (identity / age / governance) are still **static placeholders**.
- Report transport is still **in-process** (Kafka/CloudEvents pending) — unchanged this step.
## Where we are vs the spec ([[Definition-of-Done]])
The auth seam is now **closed end-to-end**: sign in → JWT → every call authenticated by the token
`sub`, backend and portal agree, and the MVP loop still shows global trust + case history +
cross-game warnings. Remaining: Kafka + CloudEvents transport, and scorer offence taxonomy.
## Next
- **Transport**: swap the in-process cheat-report event for a CloudEvents envelope over Kafka.
- **Offence taxonomy**: have the scorer return an offence type so case events aren't fixed to aimbot.
## Links
- [[web-module]] · [[Identity-Model]] · [[Data-Model]] · [[platform-module]]
- [[Definition-of-Done]] · [[ToDo]] · [[2026-09-11-step7-jwt-auth]]
