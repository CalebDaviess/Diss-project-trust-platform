---
tags: [build-log]
---
# Build Log — Step 7 (2026-09-11)

## Goal this period
> Build the **`POST /auth` + JWT identity** slice on the accountability-service so the platform
> has a real authenticated identity path (JWT `sub`) instead of the interim `X-Profile-Id`
> header — the first, backend-first half of closing the auth seam
> ([[Identity-Model]], [[Data-Model#Contract 0 — POST /auth web → platform|Contract 0]]).

## Done
- **Credential store** — Flyway `V2__auth_user_credentials.sql` adds a `user_credential` table
  (`username` PK, `profile_id`, `password_hash`, `roles`). Only **bcrypt** hashes are stored;
  raw passwords are never persisted. `UserCredential` entity + `UserCredentialRepository`.
- **`POST /auth` (Contract 0)** — `AuthResource` + `AuthService` verify username/password and
  mint a **stateless RS256 JWT** (`sub` = hashed `profileId`, `iss` = `trust-platform`,
  `groups` = roles, 1h TTL). Same `401` for unknown user *and* bad password (no username probing).
- **Password handling** — `PasswordHasher` hashes via Quarkus `BcryptUtil` and verifies via
  Elytron `PasswordFactory` (no third-party bcrypt dependency).
- **JWT-first identity** — `ProfileIdResolver` now resolves the JWT `sub` as the profile id and
  **always** prefers it. The interim `X-Profile-Id` header is honoured **only** in `dev`/`test`
  (`accountability.auth.allow-header-fallback`), so **production is JWT-only** and a header can't
  be used to impersonate a profile.
- **Dev keypair** — a dev-only RS256 keypair committed under `resources/jwt/`
  (`smallrye.jwt.sign.key.location` / `mp.jwt.verify.publickey.location`); prod injects real keys
  via the same properties.
- **Demo login (dev/test only)** — `DemoUserSeeder` seeds `player@example.com` / `demo-password`
  (profile `sha256:demo-player`) on startup, guarded by `accountability.auth.seed-demo-user`.
- **Tests: 11 passing** — 5 new (`AuthResourceTest`: valid login → Bearer token; wrong password →
  401; unknown user → 401; JWT `sub` resolves identity; JWT `sub` wins over a conflicting header)
  plus the existing 6 (`AccountabilityResourceTest`), all green (`mvn test`).

## Decisions & rationale
- **Real credentials, not demo-simple** — a bcrypt `user_credential` table makes the login flow
  production-shaped; the *identity verification* that creates a credential stays designed-not-built.
- **Backend-first** — build `/auth` + JWT validation now and leave the portal on the header; the
  portal login swap is isolated and comes next.
- **Safest fallback** — production is JWT-only; the header survives **only** in dev/test so the
  portal keeps working locally without weakening prod. Config-gated, not code-branched.
- **Elytron over a new dep** — verification uses Quarkus/Elytron already on the classpath rather
  than pulling in a third-party bcrypt library (smaller supply-chain surface).

## Blockers / caveats
- **Portal not wired yet** — it still sends `X-Profile-Id`; the `POST /auth` form + `Bearer`
  swap + dropping the manual Profile-Id box is the next step.
- **Dev keypair is committed** — intentional and clearly marked dev-only; prod must inject real keys.
- Endpoints aren't annotated `@RolesAllowed` yet — identity is resolved manually via the resolver;
  role-based authorization can be layered on later.

## Where we are vs the spec ([[Definition-of-Done]])
Auth is now **backend-built**: `POST /auth` issues a JWT and the backend enforces the JWT `sub`
as identity (prod = JWT-only). Remaining on the auth line: **wire the portal login**. Other open
items unchanged: Kafka + CloudEvents transport, and scorer offence taxonomy.

## Next
- **Wire portal login**: `POST /auth` form in `player-portal`, store the token, send
  `Authorization: Bearer`, and drop the manual Profile-Id box.
- **Transport**: swap the in-process cheat-report event for a CloudEvents envelope over Kafka.

## Links
- [[Identity-Model]] · [[Data-Model]] · [[platform-module]] · [[web-module]]
- [[Definition-of-Done]] · [[ToDo]] · [[2026-08-24-step6-player-portal]]

