"""Tests for the FastAPI /score service (conduct detection)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from detection_engine.app import app, get_artifact
from detection_engine.train import load_artifact, run_training

# A blatantly toxic text sample (high severity + targeted + lexicon).
TOXIC_FEATURES = {
    "channel": "text",
    "toxicityLexiconScore": 0.95,
    "severityWeighted": 0.92,
    "targetedHarassment": 0.90,
    "capsRatio": 0.80,
    "repetitionRate": 0.70,
    "messageBurstRate": 0.75,
}
# Acceptable (loud but not targeted or severe) banter.
ACCEPTABLE_FEATURES = {
    "channel": "text",
    "toxicityLexiconScore": 0.40,
    "severityWeighted": 0.15,
    "targetedHarassment": 0.12,
    "capsRatio": 0.55,
    "repetitionRate": 0.20,
    "messageBurstRate": 0.30,
}
# A blatantly toxic VOICE sample.
TOXIC_VOICE_FEATURES = {**TOXIC_FEATURES, "channel": "voice"}


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    """Train a model to a temp path and point the app at it via dependency override."""
    model_path = tmp_path_factory.mktemp("model") / "model.joblib"
    run_training(seed=42, model_path=model_path)
    artifact = load_artifact(model_path)
    app.dependency_overrides[get_artifact] = lambda: artifact
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_score_response_shape(client):
    r = client.post("/score", json={"profileId": "sha256:abc", "features": TOXIC_FEATURES})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"toxicityScore", "confidence", "flagged", "offenceType", "threshold", "modelVersion"}
    assert body["offenceType"] in {"chatAbuse", "voiceAbuse", "none"}
    assert 0 <= body["toxicityScore"] <= 100
    assert 0.5 <= body["confidence"] <= 1.0
    assert 0.0 <= body["threshold"] <= 1.0
    assert isinstance(body["flagged"], bool)


def test_toxic_scores_higher_than_acceptable(client):
    toxic = client.post("/score", json={"profileId": "p1", "features": TOXIC_FEATURES}).json()
    acceptable = client.post("/score", json={"profileId": "p2", "features": ACCEPTABLE_FEATURES}).json()
    assert toxic["toxicityScore"] > acceptable["toxicityScore"]


def test_blatant_toxic_is_flagged(client):
    body = client.post("/score", json={"profileId": "p", "features": TOXIC_FEATURES}).json()
    assert body["flagged"] is True


def test_flagged_text_names_chat_abuse(client):
    body = client.post("/score", json={"profileId": "p", "features": TOXIC_FEATURES}).json()
    assert body["flagged"] is True
    assert body["offenceType"] == "chatAbuse"


def test_flagged_voice_names_voice_abuse(client):
    body = client.post("/score", json={"profileId": "p", "features": TOXIC_VOICE_FEATURES}).json()
    assert body["flagged"] is True
    assert body["offenceType"] == "voiceAbuse"


def test_clean_sample_has_no_offence(client):
    body = client.post("/score", json={"profileId": "p", "features": ACCEPTABLE_FEATURES}).json()
    assert body["flagged"] is False
    assert body["offenceType"] == "none"


def test_missing_feature_returns_422(client):
    bad = dict(TOXIC_FEATURES)
    del bad["severityWeighted"]
    r = client.post("/score", json={"profileId": "p", "features": bad})
    assert r.status_code == 422


def test_invalid_channel_returns_422(client):
    bad = {**TOXIC_FEATURES, "channel": "telepathy"}
    r = client.post("/score", json={"profileId": "p", "features": bad})
    assert r.status_code == 422

