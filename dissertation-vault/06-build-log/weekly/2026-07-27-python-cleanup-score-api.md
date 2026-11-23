---
tags: [build-log]
---
# Build Log — Python cleanup + /score API (2026-07-27)

## Goal this week
> Finish the Python side cleanly: expose the trained model over HTTP and tidy the module.

## Done
- **Added `app.py`** — FastAPI service implementing [[Data-Model#Contract 1 — POST /score platform → ml|Contract 1]]:
  `POST /score` → `{ suspicionScore, confidence, modelVersion }`, plus `GET /health`.
  Loads the saved artifact (model + scaler + feature order) so scoring matches training.
- **Verified as a real server** (uvicorn + curl): cheat-like input → `suspicionScore 96`.
- Added `tests/test_app.py` (4 tests). **Suite: 27 passing.**
- Ticked the last ML box in [[Definition-of-Done]] (calibrated score exposed via `/score`);
  updated [[ml-module]] (API built).
- **Cleanup:** removed stray `src/.gitkeep` and `tests/.gitkeep`; rewrote the stale
  `detection-engine/README.md` to document the real pipeline + commands; added `httpx`
  dev dep; silenced two library-only deprecation warnings in `pyproject.toml`.

## Decisions & rationale
- **DataFrame (named columns) into the scaler** — matches how the scaler was fit; removes a
  sklearn feature-name warning and guarantees train/serve parity.
- **Dependency-injected artifact** (`get_artifact`) — lets tests inject a temp model and
  returns 503 cleanly if no model is trained yet.

## Blockers
- None. The Python empirical core (Steps 1–4 + serving API) is complete.

## Next week
- **Step 5 — accountability-service (Java/Quarkus)**: call `POST /score`, persist the
  [[Accountability-Record]], apply the threshold, emit the [[Cheat-Report-Event]] to Kafka.

## Links
- [[ml-module]] · [[Data-Model]] · [[Definition-of-Done]] · [[ToDo]]

