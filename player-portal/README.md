# player-portal

**Trust Platform frontend (Vite + React + TypeScript)** — the Player
Accountability pillar. Players sign in (or **create an account**), then land on a
dashboard that shows their **global trust score** (always visible), per-game
**conduct score**, case history, a **source-attributed audit trail**, and any
**cross-game warnings** carried by their single identity.

The UI is a sidebar-driven dashboard with a **dark neon theme by default and a
one-click light theme** (persisted). Tabs:

- **Dashboard** — headline metrics, trust gauge and trend, recent activity.
- **My Record** — per-game conduct score, case history and activity log (look up any connection).
- **Submit & Simulate** — submit a conduct sample or trigger a simulated anti-cheat verdict.
- **Account** — identity card, big trust score, ban/sanction records and case history.
- **Concept journeys** — identity verification, age assurance, governance/appeals, shown as **designed-not-built** placeholders.

All data visuals (gauge, area/spark charts, donuts) are hand-built SVG — no charting
dependency — and re-skin with the theme toggle.

---

## Prerequisites

- **Node 20+** and npm
- The **accountability-service** backend running (Quarkus). By default this
  portal expects it at `http://localhost:8081`.

---

## Environment variables

Copy `.env.example` to `.env.local` and adjust as needed:

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8081` | Base URL of `accountability-service`. |
| `VITE_DEMO_USERNAME` | `player@example.com` | Dev username prefilled in the sign-in form. |
| `VITE_DEMO_PASSWORD` | *(empty)* | Dev password prefilled in the sign-in form. |

```bash
cp .env.example .env.local
```

---

## Identity — JWT bearer token

The player signs in via `POST /auth`, or creates an account via `POST /auth/register`
(see **Account creation** below); both return a stateless JWT. This portal then sends
an `Authorization` bearer header on **every** request, and the backend resolves
identity from the token's `sub`. There is no `X-Profile-Id` header.

The headers are built in one place, `buildHeaders()` in
[`src/api/accountabilityApi.ts`](src/api/accountabilityApi.ts). On the backend,
`ProfileIdResolver` reads the verified JWT subject; the legacy `X-Profile-Id`
header is accepted only as a dev/test fallback and is disabled by default
(`accountability.auth.allow-header-fallback=false`), so production is JWT-only.

---

## Account creation

The landing screen offers **Sign in** or **Create account**. Creating an account
collects an email and password and an **identity-document type** (passport, driver's
licence, national ID, …). The ID step is a **mock**: it shows a ~2s "scan & verify"
animation but nothing is uploaded, scanned or stored. On submit the portal calls
`POST /auth/register`, which mints a real player credential and returns a JWT, so the
new account is signed straight in. A brand-new account starts with the default trust
score and an empty record until it generates activity on **Submit & Simulate**.

Registration is gated on the backend by `accountability.auth.allow-self-register`
(dev/test only — `403` in production, where real accounts come from identity
verification). Duplicate emails return `409`; weak passwords return `400`.

---

## Run against the backend

```bash
# 1. Start accountability-service (separate terminal)
cd ../accountability-service && mvn quarkus:dev   # serves the REST API on :8081

# 2. Start the portal
npm install
npm run dev        # http://localhost:5173
```

Then in the UI:

1. **Sign in** with the demo credentials (prefilled from `VITE_DEMO_USERNAME` /
   `VITE_DEMO_PASSWORD`), or **Create account** to register a new player.
2. On **Submit & Simulate**, pick a **channel** (text/voice) and a preset
   (**Acceptable banter**, **Toxic chat**, **Toxic voice**) to one-click-fill the six
   conduct feature values, then **Submit sample** — or **Simulate anti-cheat verdict**
   to land a confirmed, audited external case that drops your trust score.
3. On **My Record**, **Look up results** for any `gameConnectionId` to `GET` the latest view.
4. **Dashboard** and **Account** always show the global trust score, plus conduct
   score/status, case history (with detection source), the audit trail and cross-game
   warnings/bans. Use the **theme toggle** (top bar) to switch dark/light.

### CORS + port (already configured)

The backend is pre-configured for this portal, so no extra setup is needed:

- `accountability-service` is pinned to **`:8081`** (`quarkus.http.port=8081`), matching
  this portal's default `VITE_API_BASE_URL`.
- CORS already allows the Vite dev origin `http://localhost:5173`
  (`quarkus.http.cors.*` in the backend's `application.properties`).

> If you change the Vite dev port or the backend port, update
> `quarkus.http.cors.origins` on the backend and/or `VITE_API_BASE_URL` here to match.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite dev server on `:5173`. |
| `npm run build` | Type-check (`tsc -b`) and produce a production build. |
| `npm run preview` | Preview the production build locally. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |

---

## Project layout

```
player-portal/
├─ index.html
├─ vite.config.ts            # Vite + Vitest config
├─ src/
│  ├─ main.tsx               # entry point
│  ├─ App.tsx                # orchestrates auth, theme, active tab + data loading
│  ├─ index.css              # design tokens (dark default + [data-theme=light]) + base
│  ├─ App.css                # shell, auth, charts, tabs + legacy component styles
│  ├─ api/
│  │  ├─ accountabilityApi.ts       # typed client (auth/register/results/samples) + types
│  │  └─ accountabilityApi.test.ts
│  ├─ hooks/useTheme.ts      # theme state, persisted + applied to <html data-theme>
│  ├─ features/
│  │  ├─ presets.ts          # "Acceptable banter" / "Toxic chat" / "Toxic voice" values
│  │  └─ metrics.ts          # derive dashboard metrics + illustrative trends from a ResultView
│  └─ components/
│     ├─ AuthScreen.tsx      # sign in / create account (+ mock ID verify)
│     ├─ ThemeToggle.tsx     # dark/light switch
│     ├─ AppShell.tsx        # sidebar nav + top bar
│     ├─ SampleForm.tsx      # POST /samples + demo presets
│     ├─ LookupForm.tsx      # GET /results/{connectionId}
│     ├─ ResultsPanel.tsx    # trust score (always) + records + audit trail + warnings
│     ├─ ConceptualSections.tsx / AgeGateDemo.tsx   # designed-not-built placeholders
│     ├─ viz/charts.tsx      # hand-built SVG gauge / area / spark / donut / bar
│     └─ tabs/               # DashboardTab, RecordTab, SubmitTab, AccountTab, ConceptTab
```

---

## Testing

Vitest + React Testing Library (jsdom). Coverage focuses on the two riskiest
seams:

- **API client** builds the correct URL + headers and parses a `ResultView`
  (fetch mocked; also asserts URL-encoding and `ApiError` on non-2xx).
- **Results panel** always renders the global trust score, shows "No records"
  when `conductScore` is null, renders the source-attributed case history and
  audit trail, and shows cross-game warnings when present.

```bash
npm test
```

---

## Scope note

Dissertation prototype. Training/evaluation use **synthetic data**; this portal
demonstrates the accountability journey, not validated real-world accuracy.

