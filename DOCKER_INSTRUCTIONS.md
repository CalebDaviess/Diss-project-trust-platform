# Trust Platform — Docker & Docker Hub Instructions

This guide explains how to:
1. **Run the full Trust Platform using prebuilt Docker Hub images** (no Python, Java, Maven, or Node.js installation needed — only Docker).
2. **Build and publish the images to Docker Hub** so anyone can pull and test the project.

---

## How the Docker Stack Is Organised

When running, Docker Desktop shows a single grouped stack named **`trust-platform`** containing **5 containers**:

| Container | Role | Runs in | Port |
|---|---|---|---|
| `trust-platform-portal` | **Web UI** (React + Nginx; proxies `/api/*` to the backend) | **User-facing UI** | http://localhost:5173 |
| `trust-platform-api` | Accountability Service (Java 21 / Quarkus REST API + simulated operator) | Background | http://localhost:8081 |
| `trust-platform-engine` | Conduct Detection Engine (Python / FastAPI / scikit-learn ML scorer) | Background | http://localhost:8000/docs |
| `trust-platform-postgres` | PostgreSQL 16 database (persisted in a Docker volume) | Background | Internal (`5432`) |
| `trust-platform-kafka` | Apache Kafka 3.9 broker (KRaft mode — CloudEvent conduct reports) | Background | Internal (`9092`) |

> All backend services (`detection-engine`, `accountability-service`, `postgres`, `kafka`) run automatically in the background and talk over an internal Docker network. Users only need to open **http://localhost:5173** in their browser.

---

## Part 1: Running the App via Docker Hub (For Testers / Evaluators)

### Prerequisites
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Windows / macOS) or Docker Engine + Docker Compose plugin (Linux), **running**.

### Option A — Run with just `docker-compose.yml` (no source code needed)

1. Download [`docker-compose.yml`](./docker-compose.yml) into any empty folder (or clone this repo):
   ```powershell
   # Windows PowerShell
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/CalebDaviess/Diss-project-trust-platform/main/docker-compose.yml" -OutFile "docker-compose.yml"
   ```
   ```bash
   # macOS / Linux
   curl -fsSLO https://raw.githubusercontent.com/CalebDaviess/Diss-project-trust-platform/main/docker-compose.yml
   ```

2. Pull the images from Docker Hub and start all containers in the background:
   ```bash
   docker compose pull
   docker compose up -d
   ```
   *(If you are pulling from a different Docker Hub account than `calebdaviess`, set `DOCKERHUB_USER=<username>` first.)*

3. Wait ~15–25 seconds for PostgreSQL, Kafka, and Quarkus to become healthy, then check status:
   ```bash
   docker compose ps
   ```
   You can also open **Docker Desktop → Containers** and expand **`trust-platform`** to see all 5 running containers, inspect their logs, or click the port link `5173:80` on `trust-platform-portal`.

4. Open the **Player Portal UI** in your browser:
   - **Player Portal (start here):** http://localhost:5173
   - **ML Detection Engine Swagger UI (optional):** http://localhost:8000/docs
   - **Accountability API (optional):** http://localhost:8081

### Demo Credentials & Quick Walkthrough

On the sign-in screen at http://localhost:5173:
- **Email:** `player@example.com` *(prefilled)*
- **Password:** `demo-password` *(prefilled)*
- Or click **Create account** to register a new adult or guardian-controlled minor account.

Once signed in you can test the entire live pipeline:
1. **Games / Link Game** — link games to your single identity.
2. **Submit & Simulate / Record** — submit a conduct sample (try the **Acceptable banter**, **Toxic chat**, and **Toxic voice** presets) to score it live through `detection-engine`, persist the case & audit trail in PostgreSQL, and publish a CloudEvent to Kafka.
3. **Simulate Anti-Cheat Verdict / Operator Ban** — test the external auto-confirmed verdict flow and observe the global trust score drop and cross-game warnings.
4. **Appeals** — submit an appeal and simulate a studio review decision.

### Stopping & Resetting

```bash
# Stop and remove containers (keeps database data)
docker compose down

# Stop, remove containers, AND wipe the database volume for a clean slate
docker compose down -v
```

---

## Part 2: Building & Publishing to Docker Hub (For the Repo Owner)

Follow these steps from the root of the repository whenever you want to publish (or update) the images on Docker Hub.

### 1. Sign in to Docker Hub

Create a free account at https://hub.docker.com if you don't already have one, then run:

```bash
docker login
```
Enter your Docker Hub username (default in `docker-compose.yml` is `calebdaviess`) and password / Personal Access Token.

> **Using a different Docker Hub username?**
> - **PowerShell:** `$env:DOCKERHUB_USER="your-username"`
> - **Bash:** `export DOCKERHUB_USER="your-username"`
>
> You can also permanently change the default `calebdaviess` in `docker-compose.yml`.

### 2. Build all 3 custom images locally

```bash
docker compose build
```

This builds and tags:
- `<DOCKERHUB_USER>/trust-platform-engine:latest`
- `<DOCKERHUB_USER>/trust-platform-api:latest`
- `<DOCKERHUB_USER>/trust-platform-portal:latest`

*(The ML model is trained automatically inside `trust-platform-engine` during build, and the Quarkus API generates a fresh runtime RS256 JWT keypair on container startup so no private keys are ever baked into public images.)*

### 3. Test locally before pushing

```bash
docker compose up -d
docker compose ps
```
Open http://localhost:5173 and verify sign-in, sample submission, and results work as expected.

### 4. Push the images to Docker Hub

```bash
docker compose push
```

Once pushed, all 3 repositories appear under your Docker Hub profile (`hub.docker.com/u/<username>`). Make sure they are set to **Public** on Docker Hub so anyone can pull them without logging in.

### Optional: Publish a versioned release tag

```powershell
# PowerShell
$env:IMAGE_TAG = "v1.0"
docker compose build
docker compose push
```

### Optional: Multi-architecture push (Windows/Linux Intel + Apple Silicon Macs)

If testers may run on both Intel/AMD (`amd64`) and Apple Silicon M1–M4 (`arm64`) machines:

```bash
docker buildx create --use --name trust-builder || docker buildx use trust-builder
docker buildx build --platform linux/amd64,linux/arm64 -t calebdaviess/trust-platform-engine:latest --push ./detection-engine
docker buildx build --platform linux/amd64,linux/arm64 -t calebdaviess/trust-platform-api:latest --push ./accountability-service
docker buildx build --platform linux/amd64,linux/arm64 -t calebdaviess/trust-platform-portal:latest --push ./player-portal
```

---

## Troubleshooting

- **Port already in use (`5173`, `8081`, or `8000`):**
  Stop any local `dev.ps1` / `dev.sh` process first, or override ports before starting:
  ```powershell
  $env:PORTAL_PORT="3000"; docker compose up -d
  # Then open http://localhost:3000
  ```
- **Inspect logs for a specific service:**
  ```bash
  docker compose logs -f accountability-service
  docker compose logs -f detection-engine
  docker compose logs -f player-portal
  ```
- **`accountability-service` takes ~20 seconds on first start:**
  Kafka and PostgreSQL start first and pass their health checks before Quarkus boots and runs all 8 Flyway database migrations automatically.
- **Want to verify Kafka CloudEvent delivery:**
  Submit a toxic sample in the UI, then run:
  ```bash
  docker compose logs accountability-service | grep "Simulated operator"
  ```
  *(In PowerShell: `docker compose logs accountability-service | Select-String "Simulated operator"`)*
