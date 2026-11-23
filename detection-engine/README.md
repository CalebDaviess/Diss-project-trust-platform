# detection-engine
**Conduct-detection engine** — the empirical core of the Trust Platform dissertation
(toxic text/voice chat detection).
Turns conduct features (from chat/voice) into a calibrated **0–100 toxicity score** and
serves it over HTTP (`POST /score`), which the `accountability-service` calls. It detects
**toxic conduct vs acceptable competitive banter** — it does **not** detect cheating
(cheating is detected by third-party anti-cheat and ingested by the platform; see
`dissertation-vault/04-architecture/Anti-Cheat-Integration.md`).
## Layout
```
detection-engine/
├── pyproject.toml            # deps + src layout + pytest config (Python's "pom")
├── src/detection_engine/
│   ├── constants.py          # feature names + channel/offence labels (single source of truth)
│   ├── generate_dataset.py   # Step 1 — synthetic conduct dataset (latent aggression/severity)
│   ├── features.py           # Step 2 — load, split (stratified), scale (no leakage)
│   ├── train.py              # Step 3 — train/compare 3 models, calibrate, save artifact
│   ├── evaluate.py           # Step 4 — threshold tuning + ROC/PR/confusion figures
│   └── app.py                # FastAPI service — POST /score, GET /health (Contract 1)
├── tests/                    # pytest suite (36 tests)
├── data/sample/              # generated dataset (git-ignored)
└── models/                   # trained model artifact (git-ignored)
```
## Setup
```bash
cd detection-engine
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"        # deps from pyproject.toml (+ dev tools)
```
## The pipeline
```bash
python -m detection_engine.generate_dataset   # 1. synthetic conduct dataset -> data/sample/
python -m detection_engine.train              # 2. train/compare -> models/model.joblib
python -m detection_engine.evaluate           # 3. tune threshold + write figures
uvicorn detection_engine.app:app --reload --port 8000   # 4. serve POST /score
```
Example score request (a blatantly toxic text message, featurised at source):
```bash
curl -X POST localhost:8000/score -H 'Content-Type: application/json' \
  -d '{"profileId":"sha256:abc","features":{
       "channel":"text","toxicityLexiconScore":0.95,"severityWeighted":0.92,
       "targetedHarassment":0.90,"capsRatio":0.80,"repetitionRate":0.70,
       "messageBurstRate":0.75}}'
# -> {"toxicityScore":96,"confidence":0.96,"flagged":true,"offenceType":"chatAbuse",...}
```
The six conduct features are: `toxicityLexiconScore`, `severityWeighted`,
`targetedHarassment`, `capsRatio`, `repetitionRate`, `messageBurstRate`. The `channel`
(`text` | `voice`) is metadata that names the offence when flagged (`text → chatAbuse`,
`voice → voiceAbuse`); it is not a model input.
## Tests
```bash
pytest                          # 36 tests
```
`pyproject.toml` is the single source of truth for dependencies (Python's equivalent of a
pom). The dataset and model artifact are **regenerated from code** (git-ignored), so the
code + fixed seed is the reproducible source of truth.
