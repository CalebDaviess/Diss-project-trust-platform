# Trust Platform

> A BSc dissertation prototype for **conduct detection** (toxic chat/voice), single-identity
> **accountability**, external **anti-cheat ingest**, and fair **governance** in competitive
> online games.

The **conduct detection engine** is **built and evaluated**; cheating is detected by
**external third-party anti-cheats** and **ingested** as audited verdicts; the identity,
age-assurance and governance layers are demonstrated as **designed concepts**.

---

## The Pipeline

```
detect conduct (own ML) + ingest cheat verdicts (external) → build an audited case → govern fairly → bind to a verified identity
```

---

## Repository Structure

One repo, four folders — three code modules plus the notes vault.

| Path | Stack | Purpose | Status |
|------|-------|---------|--------|
| [`detection-engine/`](detection-engine/) | Python · scikit-learn · FastAPI | Synthetic data, feature engineering, ≥3 models, calibrated 0–100 **toxicity (conduct) score** for text & voice, `POST /score` API | Working |
| [`accountability-service/`](accountability-service/) | Java · Quarkus · Postgres · Kafka | Accountability record + **source-attributed audit trail**, case-building, **inbound anti-cheat verdict ingest**, CloudEvent conduct-report, Kafka delivery, JWT auth | Working |
| [`player-portal/`](player-portal/) | Node · React | Account creation, login, results, case history & **audit trail**; identity/governance as concept UI | Working |
| [`dissertation-vault/`](dissertation-vault/) | Obsidian | Proposal, literature, methodology, architecture, writing | Notes |

---

## How the Services Interact

The three code modules form a single pipeline. Each has one clear responsibility,
and they meet at just two seams — a REST call to the scorer and a Kafka event to
the operator — plus one **inbound** seam where external anti-cheats push verdicts.

```
 player-portal/ ──REST + JWT──▶ accountability-service/ ──POST /score──▶ detection-engine/
                                         │  ▲
                 external anti-cheat ────┼──┘  POST /anti-cheat-verdicts (inbound)
                                         └──Kafka event──▶  Simulated Operator
```

1. **`player-portal/` → `accountability-service/`** — A player signs in (JWT) and the
   frontend requests their results, case history and audit trail from the backend over REST.
2. **`accountability-service/` → `detection-engine/`** — When a conduct sample (text/voice)
   needs analysing, the backend calls the engine's `POST /score` endpoint and receives a
   calibrated 0–100 **conduct (toxicity) score** plus a flag.
3. **`accountability-service/` (internal)** — The backend updates the player's
   **accountability record** in Postgres, appends a source-attributed **case event** and
   **audit entry**, and checks the score against the reporting threshold. A flagged conduct
   case is **pending** human review.
4. **external anti-cheat → `accountability-service/`** — A third-party anti-cheat (or the
   operator relaying it) pushes a verdict to `POST /anti-cheat-verdicts`. The platform ingests
   it as an **auto-confirmed, appealable, fully-audited** signal (it does not re-adjudicate
   detection) and adjusts global trust — the deliberate *detection-source asymmetry*.
5. **`accountability-service/` → Operator** — On a flagged conduct case the backend mints a
   hashed identity token, builds a **CloudEvent conduct-report**, and publishes it once to
   **Kafka**, where an in-module simulated operator consumes and acknowledges it.
6. **`accountability-service/` → `player-portal/`** — Updated scores, case history, audit
   trail and report status flow back to the frontend for display.

> The identity, age-assurance and governance screens live in `player-portal/` as
> conceptual UI only — they illustrate the journey without a live backend.

---

## Prerequisites

- **Python 3.11+** — detection engine
- **JDK 21+** — accountability service
- **Node 20+** — player portal
- **Podman or Docker** — Quarkus Dev Services starts PostgreSQL + Kafka in
  containers automatically (no manual setup)
- **OpenSSL** — used once to generate a local dev JWT signing keypair (the keys
  are git-ignored and never committed; production injects real keys)

`./dev.sh` handles the rest (Python venv, model training, npm install) on first run.

---

## Quick Start

### One command (recommended)

Boot **all four parts** — the ML scorer, the backend (which auto-starts PostgreSQL + Kafka
via Quarkus Dev Services), and the web portal — with a single script:

```bash
# macOS / Linux
./dev.sh
```

```powershell
# Windows (PowerShell)
.\dev.ps1
```

It streams colour-prefixed logs from every service and stops everything cleanly on `Ctrl+C`.
On first run it auto-creates the Python venv, trains a model if none exists, and installs
npm deps. Once the portal is ready it **opens in your browser automatically**. Requires a
running container runtime (Podman or Docker) for Dev Services.

| Service | URL |
|---------|-----|
| Web app (start here) | http://localhost:5173 |
| Platform API / Dev UI | http://localhost:8081/q/dev |
| ML scorer (Swagger) | http://localhost:8000/docs |

**Useful overrides:**

```bash
NO_OPEN=1 ./dev.sh                          # don't auto-open the browser (macOS/Linux)
NO_RELOAD=1 ./dev.sh                        # disable uvicorn auto-reload (macOS/Linux)
API_PORT=9090 PORTAL_PORT=3000 ./dev.sh     # change ports (macOS/Linux)
```

```powershell
.\dev.ps1 -NoOpen                           # don't auto-open the browser (Windows)
.\dev.ps1 -NoReload                         # disable uvicorn auto-reload (Windows)
.\dev.ps1 -ApiPort 9090 -PortalPort 3000    # change ports (Windows)
```

> **Demo posture:** this is a local, run-on-demand setup, not a 24/7 service. The servers
> run only while `./dev.sh` is active; `Ctrl+C` shuts them all down. Conduct input is
> **synthetic** — the detect → report → operator pipeline (and the inbound anti-cheat ingest)
> is real, but the data feeding it is simulated.

### Or run each module manually

Run each in its own terminal, in order
(`detection-engine/` → `accountability-service/` → `player-portal/`):

```bash
# 1. Detection engine  ->  http://localhost:8000/docs
cd detection-engine && python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m detection_engine.train          # train a model if models/model.joblib is missing
uvicorn detection_engine.app:app --port 8000 --reload

# 2. Backend  ->  http://localhost:8081/q/dev   (auto-starts Postgres + Kafka via Dev Services)
cd accountability-service && mvn quarkus:dev -Dquarkus.http.port=8081

# 3. Frontend  ->  http://localhost:5173
cd player-portal && npm install && npm run dev
```

| Service | URL |
|---------|-----|
| ML scorer | http://localhost:8000/docs |
| Platform API | http://localhost:8081/q/dev |
| Web app | http://localhost:5173 |

---

## Dissertation Notes

Open [`dissertation-vault/`](dissertation-vault/) as a vault in Obsidian
(**File → Open folder as vault**) and start at `00-home/Home.md`.

### User research (in progress)

A short **anonymous participant survey** is being prepared to assess player acceptance and
deterrence of cross-game single-identity accountability (the "acceptance & deterrence" objective).
The Cardiff Metropolitan University ethics paperwork (participant information sheet, consent form
and withdrawal form) is drafted in `dissertation-vault/10-SurveyForms/`, and the questionnaire
itself will be built and run on **Microsoft Forms**.

---

## Scope

| Built & evaluated | Designed only | Out of scope |
|-------------------|---------------|--------------|
| Synthetic conduct dataset + features (text & voice) | Single-identity model | Live game integration |
| ≥3 ML models + conduct (toxicity) score | Governance & appeals | Production identity/age services |
| Evaluation (P/R/F1/ROC-AUC, FPR, per-channel) | Age assurance, legal (OSA/GDPR/ICO) | Real third-party anti-cheat vendors |
| Case-building, audit trail, simulated report | Acceptance & deterrence (literature + participant survey) | Real-world accuracy validation |
| Inbound anti-cheat verdict ingest (auto-confirmed, appealable) | ASR voice→text transcription | Live audio capture / storage |

---

## Academic Integrity

Training and evaluation use **synthetic data**; results show technical feasibility
under controlled conditions, not validated real-world accuracy. Validation on
authentic gameplay data is identified as future work.