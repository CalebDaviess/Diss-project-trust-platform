# Trust Platform

> A BSc dissertation prototype for **conduct detection** (toxic text/voice chat), single-identity **accountability**, external **anti-cheat verdict ingest**, and fair **governance** in competitive online games.

**Source code & documentation:** https://github.com/CalebDaviess/Diss-project-trust-platform

---

## Important — Run as a Full Stack (Not Standalone)

This image is part of a **5-container Docker Compose stack** (`trust-platform`):

| Image / Service | Role | Port |
|---|---|---|
| `calebdavies03/trust-platform-portal` | **Web UI** (React + Nginx; proxies `/api/*` to the backend) | **http://localhost:5173** |
| `calebdavies03/trust-platform-api` | Accountability Service (Java 21 / Quarkus REST API + simulated operator) | http://localhost:8081 |
| `calebdavies03/trust-platform-engine` | Conduct Detection Engine (Python / FastAPI / scikit-learn ML scorer) | http://localhost:8000/docs |
| `postgres:16-alpine` | PostgreSQL 16 database (internal) | — |
| `apache/kafka:3.9.0` | Apache Kafka 3.9 broker in KRaft mode (internal) | — |

---

## Quick Start (2 Commands — Only Docker Required)

Make sure **Docker Desktop** (or Docker Engine + Compose) is running, then run:

### 1. Download `docker-compose.yml`

```powershell
# Windows (PowerShell)
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/CalebDaviess/Diss-project-trust-platform/main/docker-compose.yml" -OutFile "docker-compose.yml"
```

```bash
# macOS / Linux
curl -fsSLO https://raw.githubusercontent.com/CalebDaviess/Diss-project-trust-platform/main/docker-compose.yml
```

### 2. Pull the latest images & start the stack

```bash
docker compose up -d --pull always
```

### 3. Open the Player Portal

Wait ~20 seconds on first boot for PostgreSQL, Kafka, and database migrations to finish, then open:

- **Player Portal UI:** http://localhost:5173
- **Demo login (prefilled):** `player@example.com` / `demo-password` *(pre-seeded with synthetic cross-game history across VALORANT and Counter-Strike 2, or click **Create account** to start fresh)*
- **ML Scorer Swagger UI (optional):** http://localhost:8000/docs

### Stopping & Resetting

```bash
docker compose down      # stop containers (keeps local database)
docker compose down -v   # stop containers and reset local database
```

---

## Safety & Privacy Note

- Runs **100% locally** using **synthetic test accounts and events only** — never connects to live games, real anti-cheat vendors, or real identity providers.
- Images are built automatically via GitHub Actions (multi-arch `linux/amd64` + `linux/arm64`) with verifiable SHA-256 digests, run as non-root containers, generate fresh runtime JWT keys on startup, and collect **no administrative, diagnostic, or telemetry data**.
- Do not enter real credentials or personal information into the prototype.
