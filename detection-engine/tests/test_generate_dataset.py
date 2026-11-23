"""Tests for the synthetic conduct dataset generator."""

from __future__ import annotations

import pandas as pd

from detection_engine.constants import (
    CHANNEL_TEXT,
    CHANNEL_VOICE,
    COL_CHANNEL,
    COL_IS_TOXIC,
    COL_LABEL,
    COL_OFFENCE,
    CONDUCT_OFFENCES,
    FEATURE_NAMES,
    LABEL_ACCEPTABLE,
    LABEL_TOXIC,
    OFFENCE_CHAT,
    OFFENCE_NONE,
    OFFENCE_VOICE,
)
from detection_engine.generate_dataset import generate_dataset


def test_shape_and_columns():
    df = generate_dataset(n_samples=1000, seed=1)
    assert len(df) == 1000
    expected = FEATURE_NAMES + [COL_CHANNEL, COL_LABEL, COL_OFFENCE, COL_IS_TOXIC]
    assert list(df.columns) == expected


def test_class_balance_matches_fraction():
    df = generate_dataset(n_samples=2000, toxic_fraction=0.30, seed=1)
    n_toxic = int((df[COL_LABEL] == LABEL_TOXIC).sum())
    assert n_toxic == 600  # 30% of 2000


def test_labels_consistent():
    df = generate_dataset(n_samples=500, seed=2)
    acceptable = df[df[COL_LABEL] == LABEL_ACCEPTABLE]
    toxic = df[df[COL_LABEL] == LABEL_TOXIC]
    # acceptable <-> offence none <-> isToxic 0
    assert (acceptable[COL_OFFENCE] == OFFENCE_NONE).all()
    assert (acceptable[COL_IS_TOXIC] == 0).all()
    # toxic <-> isToxic 1 <-> conduct offence
    assert (toxic[COL_IS_TOXIC] == 1).all()
    assert set(toxic[COL_OFFENCE].unique()).issubset(set(CONDUCT_OFFENCES))


def test_offence_matches_channel_for_toxic():
    """A flagged conduct offence is derived from its channel (text->chat, voice->voice)."""
    df = generate_dataset(n_samples=2000, seed=3)
    toxic = df[df[COL_IS_TOXIC] == 1]
    text = toxic[toxic[COL_CHANNEL] == CHANNEL_TEXT]
    voice = toxic[toxic[COL_CHANNEL] == CHANNEL_VOICE]
    assert (text[COL_OFFENCE] == OFFENCE_CHAT).all()
    assert (voice[COL_OFFENCE] == OFFENCE_VOICE).all()


def test_both_channels_present():
    df = generate_dataset(n_samples=2000, voice_fraction=0.30, seed=3)
    channels = set(df[COL_CHANNEL].unique())
    assert channels == {CHANNEL_TEXT, CHANNEL_VOICE}


def test_reproducible_with_seed():
    a = generate_dataset(n_samples=300, seed=42)
    b = generate_dataset(n_samples=300, seed=42)
    pd.testing.assert_frame_equal(a, b)


def test_different_seeds_differ():
    a = generate_dataset(n_samples=300, seed=1)
    b = generate_dataset(n_samples=300, seed=2)
    assert not a.equals(b)


def test_features_within_range():
    df = generate_dataset(n_samples=1000, seed=3)
    for name in FEATURE_NAMES:
        assert df[name].between(0, 1).all(), f"{name} out of [0,1]"


def test_toxic_more_severe_and_targeted_than_acceptable():
    """Toxic conduct should score clearly higher on the discriminative features."""
    df = generate_dataset(n_samples=4000, seed=4)
    acc = df[df[COL_IS_TOXIC] == 0]
    tox = df[df[COL_IS_TOXIC] == 1]
    assert tox["severityWeighted"].mean() > acc["severityWeighted"].mean() + 0.1
    assert tox["targetedHarassment"].mean() > acc["targetedHarassment"].mean() + 0.1

