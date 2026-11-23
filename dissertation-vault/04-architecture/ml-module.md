---
tags: [architecture, empirical]
---
# detection-engine module (conduct)

**Python conduct-detection engine — built & evaluated.** Code lives in the repo's [`detection-engine/`](../../detection-engine/) folder. *(The folder will be renamed to `conduct-detection-engine/` in the code phase; this note keeps the `ml-module` filename only to preserve wikilinks.)*

## Responsibility
Turn a supplied **six-feature numerical vector** into a calibrated **0–100 toxicity score** (+ conduct offence type) and expose it over HTTP. The empirical evaluation uses wholly synthetic numerical feature records; the engine does not process raw messages, transcripts or audio. **It does not detect cheating** — cheating is detected by third-party anti-cheat and ingested separately ([[Anti-Cheat-Integration]]).

## Synthetic channels
- **Text** and **voice** are channel labels on generated feature rows.
- The current experiment does not run NLP over messages, transcribe speech or extract acoustic measurements. The simulated voice channel adds numerical noise to represent a simplified channel difference ([[Synthetic-Data]], [[Features]]).

## Data handling
The current model experiment uses generated numerical features only. No real chat, audio, transcript or participant response is sent to the model or retained by it. Any future processing of real player communications would require a separately assessed data-protection and ethics design; the current prototype does not implement that processing.

## Pipeline
`generate_dataset.py` → `features.py` → `train.py` → `evaluate.py`, served by `app.py`.

## API (built)
- `POST /score` — accepts a `ScoreRequest` (profile/connection + a **conduct feature vector** covering the text and/or voice channel), returns
  `{ toxicityScore 0-100, confidence, flagged, offenceType, threshold, modelVersion }`. Loads the saved artifact (model +
  scaler + feature order), so scoring applies the identical training transform. Implements
  [[Data-Model#Contract 1 — POST /score platform → ml|Contract 1]]. Consumed by [[platform-module]].
- `GET /health` — liveness + whether a model is loaded.
- Run: `uvicorn detection_engine.app:app --port 8000`. Tests: `tests/test_app.py`.

## Stack
Python · scikit-learn · FastAPI · pandas · numpy · matplotlib · pytest. The current pipeline uses
synthetic numerical data and does not include an ASR or transformer component.

## Model versioning & continuous learning
`train.py` saves model version metadata and the `POST /score` response returns `modelVersion`, so
each score can be traced to its model artifact. The current model is trained and evaluated only on
synthetic data; it does not learn from the survey or real player records. Any future retraining on
human-reviewed real conduct would require separate ethics approval and data-protection safeguards.

## Related
- [[Synthetic-Data]] · [[Features]] · [[Models]] · [[Evaluation]]
- [[Anti-Cheat-Integration]] · [[Architecture-Overview]]
