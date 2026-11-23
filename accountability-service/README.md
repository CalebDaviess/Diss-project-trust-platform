# accountability-service

Quarkus backend slice for Trust Platform accountability.

## Included in this slice
- `POST /auth` — verifies bcrypt credentials and issues a stateless RS256 JWT (`sub` = hashed profile id).
- `POST /samples` — calls the Python **conduct** scorer (toxic chat/voice), ignores clean samples, persists flagged samples as a **pending**, source-attributed case for human review.
- Flagged samples publish a `com.trustplatform.conduct.reported` **CloudEvent** to **Kafka** (topic `conduct-reports`, binary mode — CloudEvent attributes travel as Kafka headers); an in-module simulated operator consumes it via `@Incoming`.
- `POST /anti-cheat-verdicts` — **inbound anti-cheat hook**: ingests a verdict from an external third-party anti-cheat as an **auto-confirmed, appealable, fully-audited** signal (`source = antiCheat`), idempotent on `verdictId`, adjusting global trust. The platform never re-adjudicates detection — the deliberate *detection-source asymmetry* vs its own conduct engine.
- `POST /ban-notifications` — ingests operator ban decisions, applies trust deltas idempotently, and confirms pending accountability state for the matching connection.
- `GET /results/{connectionId}` — returns one connection's detailed case history, **source-attributed audit trail**, plus cross-game summary signals.
- Flyway-managed schema for profiles, connections, records (with `conduct_score`), source-attributed case events, an immutable **audit trail**, external bans, **anti-cheat verdicts**, and user credentials.

## Identity & auth
Identity is the **JWT `sub`**, resolved by `ProfileIdResolver` and always taking priority.
Production is **JWT-only**. The interim `X-Profile-Id` header is honoured **only** in the
`dev`/`test` profiles (`accountability.auth.allow-header-fallback=true`) so the player-portal keeps
working locally until its login is wired.

Log in to obtain a token (a demo user is seeded in dev/test only):
```bash
curl -sX POST http://localhost:8081/auth \
  -H 'Content-Type: application/json' \
  -d '{"username":"player@example.com","password":"demo-password"}'
# → { "token": "<jwt>", "tokenType": "Bearer", "expiresIn": 3600 }

curl http://localhost:8081/results/gc-1 -H "Authorization: Bearer <jwt>"
```

> **Dev keys:** an RS256 keypair is committed under `src/main/resources/jwt/` for local/dev/test
> **only**. Production must inject real keys via `smallrye.jwt.sign.key.location` /
> `mp.jwt.verify.publickey.location`.

## Run
```bash
mvn quarkus:dev
```
By default Quarkus Dev Services will start PostgreSQL **and Kafka** for local development (Docker required).
The Python scorer URL defaults to `http://localhost:8000` and can be overridden with
`DETECTION_ENGINE_URL`.

## Test
```bash
mvn test
```
Tests use an in-memory H2 datasource in PostgreSQL compatibility mode, mock the Python `/score`
client, and swap the conduct-report channels to the **in-memory messaging connector** — so the
CloudEvent flow, anti-cheat verdict ingest and ban-ingestion paths run without Kafka, Docker, or
other external brokers.
