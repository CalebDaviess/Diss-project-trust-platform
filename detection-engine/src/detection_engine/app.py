"""FastAPI service — exposes the trained conduct detector over HTTP.

Implements Contract 1 (dissertation-vault/04-architecture/Data-Model.md):
  POST /score  { profileId, features{ channel, 6 conduct features } }
    ->  { toxicityScore, confidence, flagged, offenceType, threshold, modelVersion }

The accountability-service (platform) calls this; it never talks to the model directly.
The saved artifact carries the model, the fitted scaler, the canonical feature order
and the tuned decision threshold, so scoring applies the exact same transform used in
training and flags at the tuned operating point (not a naive 0.5).

"Which" conduct offence a flagged sample is (chatAbuse vs voiceAbuse) is determined by
the CHANNEL, so it is derived here rather than learned. Cheat offences are never
produced here — they are ingested from external anti-cheat (Anti-Cheat-Integration.md).

Run:
    uvicorn detection_engine.app:app --reload --port 8000
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

from . import __version__
from .constants import CHANNEL_TEXT, CHANNEL_VOICE, FEATURE_NAMES, OFFENCE_NONE, offence_for_channel
from .train import DEFAULT_MODEL_PATH, load_artifact


class ConductFeatureVector(BaseModel):
    """The six conduct features (see Features.md) plus the channel they came from.

    Field order is irrelevant here; the service reorders to the canonical
    FEATURE_NAMES before scoring. `channel` is metadata (text | voice) used to name
    the offence; it is NOT a model input.
    """

    channel: Literal["text", "voice"] = CHANNEL_TEXT
    toxicityLexiconScore: float = Field(ge=0, le=1)
    severityWeighted: float = Field(ge=0, le=1)
    targetedHarassment: float = Field(ge=0, le=1)
    capsRatio: float = Field(ge=0, le=1)
    repetitionRate: float = Field(ge=0, le=1)
    messageBurstRate: float = Field(ge=0, le=1)


class ScoreRequest(BaseModel):
    profileId: str
    features: ConductFeatureVector


class ScoreResponse(BaseModel):
    toxicityScore: int    # 0-100 calibrated
    confidence: float     # how confident the model is in its call (max class prob)
    flagged: bool         # whether the model considers this toxic
    offenceType: str      # chatAbuse | voiceAbuse when flagged, else "none"
    threshold: float      # the threshold applied
    modelVersion: str


app = FastAPI(title="conduct-detection-engine", version=__version__)


@lru_cache
def _cached_artifact() -> dict:
    return load_artifact(DEFAULT_MODEL_PATH)


def get_artifact() -> dict:
    """Dependency: the loaded model artifact (503 if not trained yet).

    Tests override this via app.dependency_overrides.
    """
    try:
        return _cached_artifact()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/health")
def health() -> dict:
    """Liveness + whether a model is loaded."""
    try:
        art = _cached_artifact()
        return {"status": "ok", "modelLoaded": True, "modelVersion": art.get("model_version")}
    except FileNotFoundError:
        return {"status": "ok", "modelLoaded": False}


@app.post("/score")
def score(request: ScoreRequest, artifact: Annotated[dict, Depends(get_artifact)]) -> ScoreResponse:
    """Return a calibrated 0-100 conduct (toxicity) score for one feature vector."""
    model = artifact["model"]
    scaler = artifact["scaler"]
    threshold = float(artifact.get("threshold", 0.5))  # fallback for older artifacts

    # Build a single-row frame in canonical column order (matches training), then
    # apply the training-time scaler. `channel` is excluded — it is not a model input.
    row = pd.DataFrame([[getattr(request.features, name) for name in FEATURE_NAMES]], columns=FEATURE_NAMES)
    row_scaled = scaler.transform(row)

    p_toxic = float(model.predict_proba(row_scaled)[0, 1])
    flagged = bool(p_toxic >= threshold)
    # The conduct offence is the channel (text -> chatAbuse, voice -> voiceAbuse);
    # clean samples carry no offence.
    offence_type = offence_for_channel(request.features.channel) if flagged else OFFENCE_NONE
    return ScoreResponse(
        toxicityScore=int(round(p_toxic * 100)),
        confidence=round(max(p_toxic, 1 - p_toxic), 4),
        flagged=flagged,
        offenceType=offence_type,
        threshold=round(threshold, 4),
        modelVersion=artifact.get("model_version", "unknown"),
    )

