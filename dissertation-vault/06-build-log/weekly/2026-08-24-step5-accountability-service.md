---
tags: [build-log]
---
# Build Log — Step 5 (2026-08-24)

## Goal this period
> Stand up the **accountability-service** (Quarkus): call the Python `POST /score`,
> persist the per-game [[Accountability-Record]], apply the reporting decision, and wire
> the operator seam — cheat-report out, ban feedback in — against the verified-profile +
> linked game-account model in [[Data-Model]].

## Done
### Prerequisite — Python `/score` decision fields
- Persisted the tuned threshold into the model artifact and exposed `flagged` + `threshold`
  on `POST /score` (recall ≥ 85% / FPR < 5% operating point, not a naive 0.5) →
  [[Data-Model#Contract 1 — POST /score platform → ml|Contract 1]].

### accountability-service (Quarkus / Java) — first runnable slice
- **Converted the empty Maven skeleton to a Quarkus app** — REST + Jackson, Hibernate ORM
  Panache, Flyway, PostgreSQL, reactive REST client, SmallRye JWT, and JUnit5 + RestAssured
  + Mockito for tests. Java release pinned to 21 (workspace JDK).
- **Flyway schema `V1`** for the whole spine: `player_profile`, `game_connection`,
  `accountability_record`, `case_event`, `external_ban` — one verified profile → many
  game connections → one per-game record → append-only case history.
- **`POST /samples`** — derives the `ScoreRequest`, calls the scorer, and:
  - `flagged = false` → **stores nothing** (clean players leave no trace),
  - `flagged = true` → upserts profile + connection, upserts the per-game record,
    appends a `CaseEvent`, and publishes a cheat-report event.
- **`POST /ban-notifications`** ([[Data-Model#Contract 3a — POST /ban-notifications operator → platform|Contract 3a]]) —
  validates the connection/profile/operator/game match, persists an `ExternalBan`,
  applies `trustDelta` to the **global** trust score (clamped 0–100), confirms the pending
  per-game record + case events, and is **idempotent** on duplicate `banId`.
- **`GET /results/{connectionId}`** — returns one game's detailed history plus the
  always-visible **global trust score** and **cross-game warning signals**
  (`operatorId`, `gameId`, `confirmedOffenceCount`, `hasActiveBan`) from *other* games only.
- **Cheat-report event + simulated operator** — flagged samples publish a
  `com.trustplatform.cheat.reported` event that an in-module simulated operator consumes
  and acknowledges (keeps the case `pending`), exercising the [[Cheat-Report-Event]] seam.
- **Tests: 6 passing** — clean-ignored, flagged-persisted + report consumed, history
  appended, cross-game summary, ban ingest (trust + confirm), duplicate-ban idempotency.

## Decisions & rationale
- **Per-game records, global trust** — case history is scoped to a `connectionId`; trust is
  aggregated on the `PlayerProfile` so a low score follows the human across games
  ([[Identity-Model]]). Other games see *summary* signals only, never raw evidence.
- **Flagged-only persistence** — storing nothing for clean players keeps the store small
  and privacy-preserving; matches the agreed product behaviour.
- **In-process event first, Kafka later** — the report is currently a CDI event consumed
  in-module. This validates the *business* flow (report → operator ack → status) without
  standing up a broker before the UI exists. Swapping to a CloudEvents envelope over Kafka
  is a transport change behind the same seam.
- **Interim `X-Profile-Id` header** — identity is a header for now with a JWT `sub`
  fallback, so the storage/orchestration slice is testable before full auth lands. A TODO
  marks the swap to JWT-only.
- **`offenceType` fixed to `aimbot`** — the scorer does not yet return an offence taxonomy,
  so case events use a placeholder; noted for replacement.
- **Idempotent bans + trust clamp** — duplicate operator notifications must not double-dock
  trust; trust stays within 0–100.

## Blockers / caveats
- Report transport is **in-process**, not Kafka; **CloudEvents 1.0 envelope** not built yet.
- Auth is **interim** (header), no `POST /auth` JWT issuance yet.
- `offenceType` is a **placeholder** pending scorer taxonomy.
- No **web UI** yet — results/case history are API-only.

## Where we are vs the spec ([[Definition-of-Done]])
| MVP step | State |
|----------|-------|
| Synthetic data → model → calibrated `/score` | ✅ done |
| Threshold check / `flagged` decision | ✅ done |
| Accountability record updated (Postgres, case history) | ✅ done (flagged-only) |
| Cheat-report built on breach | 🟡 in-process event (CloudEvent envelope pending) |
| Delivered once (Kafka) to simulated operator | 🟡 in-process consume (Kafka pending) |
| Shown in web UI | ⬜ not started |
| Auth end-to-end (JWT/OIDC) | 🟡 interim header (JWT pending) |

## Next
- **Step 6 — web slice ([[web-module]])**: wire `player-portal` to `POST /samples` and
  `GET /results/{connectionId}`; render global trust, per-game case history, and cross-game
  warnings. Then close the loop with `POST /auth` (JWT) and, finally, Kafka + CloudEvent
  transport for the report.

## Links
- [[platform-module]] · [[Data-Model]] · [[Accountability-Record]] · [[Cheat-Report-Event]]
- [[Game-Operator-Integration]] · [[Identity-Model]] · [[Definition-of-Done]] · [[ToDo]]

