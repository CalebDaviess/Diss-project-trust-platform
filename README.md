# Trust Platform

> A BSc dissertation prototype for **conduct detection** (toxic text & voice chat), single-identity **accountability**, external **anti-cheat verdict ingest**, and fair **governance** in competitive online games.

The **conduct detection engine** is **built and evaluated**; cheating is detected by **external third-party anti-cheats** and **ingested** as audited verdicts; the identity, age-assurance, and governance layers are demonstrated as **designed concepts**.

```text
detect conduct (own ML) + ingest cheat verdicts (external)
  ──▶ build an audited case ──▶ govern fairly ──▶ bind to a verified identity
```

---

## Quick Start (Docker — Recommended)

Try the full 5-container platform (Web UI, Quarkus API, Python ML engine, PostgreSQL, and Kafka) without installing Python, Java, Maven, or Node.js. **You only need [Docker Desktop](https://www.docker.com/products/docker-desktop/) running.**

### 1. Download `docker-compose.yml`
Run in any empty folder (no need to clone the repository):

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

This pulls the newest public images from Docker Hub ([`calebdavies03`](https://hub.docker.com/u/calebdavies03)) and starts all 5 containers grouped under **`trust-platform`** in Docker Desktop.

### 3. Open the app
Wait ~20 seconds on first start for PostgreSQL, Kafka, and Flyway migrations to finish, then open **http://localhost:5173**:

| Service | URL | Notes |
|---------|-----|-------|
| **Player Portal (start here)** | http://localhost:5173 | Demo login prefilled: `player@example.com` / `demo-password` (or click **Create account**) |
| **ML Scorer (Swagger UI)** | http://localhost:8000/docs | FastAPI interactive docs for `POST /score` |
| **Accountability API** | http://localhost:8081 | Quarkus REST API (runs in background behind the portal) |

- **Update to the newest version anytime:** re-run `docker compose up -d --pull always`
- **Stop containers:** `docker compose down` *(keeps database)* or `docker compose down -v` *(resets database)*
- **Full Docker & Docker Hub guide:** see **[DOCKER_INSTRUCTIONS.md](DOCKER_INSTRUCTIONS.md)**

> **Demo posture:** Conduct input is **synthetic** — the detect → report → Kafka operator pipeline and inbound anti-cheat ingest are real, while the gameplay data feeding them is simulated.

---

## How the Services Interact

Three code modules form a single pipeline with clear seams: a REST call to the ML scorer, a Kafka CloudEvent to the operator, and an inbound endpoint for external anti-cheat verdicts.

```text
 player-portal/ ──REST + JWT──▶ accountability-service/ ──POST /score──▶ detection-engine/
                                         │  ▲
                 external anti-cheat ────┼──┘  POST /anti-cheat-verdicts (inbound)
                                         └──Kafka CloudEvent──▶ Simulated Operator
```

1. **Portal → Backend** — A player signs in (or registers) to receive a stateless RS256 JWT, then views their global trust score, per-game conduct score, case history, and audit trail over REST.
2. **Backend → Detection Engine** — Conduct samples (text/voice feature vectors) are sent to `POST /score` and return a calibrated **0–100 toxicity score** plus a flag.
3. **Case Building & Audit Trail** — `accountability-service` persists the record in PostgreSQL and appends a source-attributed case event and immutable audit entry. Flagged conduct cases are marked **pending** human review.
4. **Inbound Anti-Cheat Verdicts** — External verdicts arriving at `POST /anti-cheat-verdicts` are ingested as **auto-confirmed, appealable, fully audited** signals that adjust global trust (*detection-source asymmetry*).
5. **Kafka CloudEvent Delivery** — Flagged conduct cases publish a `com.trustplatform.conduct.reported` CloudEvent to Kafka (`conduct-reports`), consumed and acknowledged by the in-module simulated operator.
6. **Concept UI** — Identity verification, age assurance, and governance screens live in `player-portal/` as designed-not-built conceptual journeys.

---

## Repository Structure

| Path | Stack | Responsibility | Status |
|------|-------|----------------|--------|
| [`detection-engine/`](detection-engine/) | Python · scikit-learn · FastAPI | Synthetic dataset, feature scaling, 3 compared ML models, calibrated 0–100 conduct score (`POST /score`) | Working |
| [`accountability-service/`](accountability-service/) | Java 21 · Quarkus · Postgres · Kafka | Accountability records, source-attributed audit trail, anti-cheat ingest, appeals, Kafka CloudEvents, JWT auth | Working |
| [`player-portal/`](player-portal/) | React · TypeScript · Vite | Self-service portal: sign-in/register, trust gauge & history, sample simulator, bans, appeals, concept UI | Working |
| [`dissertation-vault/`](dissertation-vault/) | Obsidian | Proposal, literature review, methodology, architecture, build logs, results, ethics & writing | Notes |

---

## Local Development (From Source)

If you want to edit code or run the test suites directly without Docker Compose:

**Prerequisites:** **Python 3.11+**, **JDK 21+**, **Node 20+**, **Docker or Podman** (for Quarkus Dev Services Postgres + Kafka), and **OpenSSL** (generates local dev JWT keys on first run; never committed).

### One-command dev launcher

```bash
# macOS / Linux
./dev.sh
```

```powershell
# Windows (PowerShell)
.\dev.ps1
```

This creates the Python venv, trains `models/model.joblib` if missing, installs npm packages, boots PostgreSQL + Kafka automatically via Quarkus Dev Services, streams colour-prefixed logs, and opens **http://localhost:5173** (`Ctrl+C` stops all services). Quarkus Dev UI is also available at http://localhost:8081/q/dev.

<details>
<summary><strong>Launcher flags, manual per-service commands &amp; running tests</strong></summary>

#### Launcher overrides
```bash
# macOS / Linux
NO_OPEN=1 ./dev.sh                          # don't auto-open the browser
NO_RELOAD=1 ./dev.sh                        # disable uvicorn auto-reload
API_PORT=9090 PORTAL_PORT=3000 ./dev.sh     # custom ports
```
```powershell
# Windows (PowerShell)
.\dev.ps1 -NoOpen
.\dev.ps1 -NoReload
.\dev.ps1 -ApiPort 9090 -PortalPort 3000
```

#### Run each module manually (3 terminals, in order)
```bash
# 1. Detection engine -> http://localhost:8000/docs
cd detection-engine
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
python -m detection_engine.train
uvicorn detection_engine.app:app --port 8000 --reload

# 2. Accountability service -> http://localhost:8081/q/dev
cd accountability-service
./mvnw quarkus:dev -Dquarkus.http.port=8081          # Windows: .\mvnw.cmd quarkus:dev

# 3. Player portal -> http://localhost:5173
cd player-portal
npm install && npm run dev
```

#### Run test suites
```bash
cd detection-engine       && pytest           # 36 tests
cd accountability-service && ./mvnw test      # 39 tests (uses H2 + in-memory Kafka, no Docker needed)
cd player-portal          && npm test         # 33 tests (Vitest)
```

</details>

---

## Scope & Academic Integrity

| Built & Evaluated | Designed Only (Concept) | Out of Scope |
|---|---|---|
| Synthetic conduct dataset + 6 features (text & voice) | Single-identity verification model | Live commercial game integration |
| ≥3 ML models + calibrated conduct score | Governance & appeals policy | Production identity / age-assurance vendors |
| Evaluation (P/R/F1/ROC-AUC, FPR, per-channel) | Age assurance & legal framing (OSA/GDPR/ICO) | Real third-party anti-cheat vendors |
| Case-building, audit trail, Kafka CloudEvent report | Acceptance & deterrence (literature + survey) | Real-world accuracy validation |
| Inbound anti-cheat verdict ingest (auto-confirmed, appealable) | ASR voice → text transcription | Live audio capture or storage |

> **Academic Integrity:** Training and evaluation use **synthetic data**. Results demonstrate technical feasibility under controlled conditions, not validated real-world accuracy; validation on authentic gameplay data is identified as future work.

---

## Dissertation Notes & User Research

- **Obsidian Vault:** Open [`dissertation-vault/`](dissertation-vault/) as a vault in Obsidian (**File → Open folder as vault**) and start at `00-home/Home.md`.
- **Participant Survey:** An anonymous survey is being prepared to evaluate player acceptance and deterrence of cross-game single-identity accountability (Cardiff Metropolitan University ethics forms are kept locally under `dissertation-vault/10-SurveyForms/` and excluded from Git; the questionnaire runs on Microsoft Forms).
