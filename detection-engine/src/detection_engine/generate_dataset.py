"""Step 1 — Synthetic conduct dataset generator.

Generates a labelled synthetic dataset of CONDUCT samples (chat/voice), toxic vs
acceptable. The hard case this models is the overlap between genuinely abusive
conduct and robust-but-acceptable *competitive banter / trash-talk*: both can be
loud and use profanity, so the shallow features (lexicon, caps) overlap and the
true signal lives in the COMBINATION with severity and targeted harassment. This
deliberate overlap is the false-positive risk that makes the low-FPR target
meaningful (don't punish banter as abuse).

Grounding (see dissertation-vault/03-methodology/Synthetic-Data.md):
  - Acceptable banter can be rude/sweary (moderate lexicon, high caps) but is NOT
    targeted at a person and NOT severe (no slurs/threats).
  - Toxic conduct is parameterised by a latent severity c in [0,1]: mild insult
    (c~0) -> targeted harassment -> slurs/hate/threats (c~1). c~0 is borderline
    banter, creating genuinely hard cases.
  - Voice is the transcribed channel: same features from the transcript, plus a
    little extra noise to represent transcription error.

Two latent variables drive realism:
  - aggression a in [0,1] (Beta) — how loud/sweary an ACCEPTABLE player is. Louder
    banter overlaps toxic on the shallow features (the FP risk).
  - severity   c in [0,1]        — how severe a TOXIC sample is. Subtle toxicity
    (low c) overlaps acceptable, keeping the task non-trivial.

Usage:
    python -m detection_engine.generate_dataset --n-samples 5000 --seed 42
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from .constants import (
    CHANNEL_TEXT,
    CHANNEL_VOICE,
    COL_CHANNEL,
    COL_IS_TOXIC,
    COL_LABEL,
    COL_OFFENCE,
    FEATURE_NAMES,
    LABEL_ACCEPTABLE,
    LABEL_TOXIC,
    OFFENCE_NONE,
    offence_for_channel,
)

DEFAULT_N_SAMPLES = 5000
DEFAULT_TOXIC_FRACTION = 0.30
DEFAULT_VOICE_FRACTION = 0.30  # share of samples that are voice (rest text)
DEFAULT_SEED = 42
DEFAULT_OUT = Path(__file__).resolve().parents[2] / "data" / "sample" / "conduct_dataset.csv"

# Extra Gaussian noise added to voice rows to represent transcription error.
VOICE_NOISE_STD = 0.04


def _sample_aggression(rng: np.random.Generator, n: int) -> np.ndarray:
    """Latent banter aggression in [0,1]; Beta(2,3) => most mild, some very loud."""
    return rng.beta(2.0, 3.0, size=n)


def _sample_severity(rng: np.random.Generator, n: int) -> np.ndarray:
    """Toxic severity in [0.1,1.0]; many subtle, some blatant (Beta(2,2))."""
    return 0.10 + 0.90 * rng.beta(2.0, 2.0, size=n)


def _acceptable_features(rng: np.random.Generator, aggression: np.ndarray) -> dict[str, np.ndarray]:
    """Acceptable banter as a function of latent aggression (+ noise).

    Loud banter scores HIGH on lexicon/caps (profanity, shouting) and can even be
    mildly pointed ("you're trash"), but stays comparatively LOW on severity and
    targeted-harassment — it is rude about the game/play, not abusive to a person.
    Crucially the ranges OVERLAP the subtle end of toxic, so no single feature
    cleanly separates the classes and the model must use the combination.
    """
    n = len(aggression)
    a = aggression
    return {
        "toxicityLexiconScore": np.clip(0.14 + 0.50 * a + rng.normal(0, 0.09, n), 0, 1),
        "severityWeighted": np.clip(0.10 + 0.38 * a + rng.normal(0, 0.09, n), 0, 1),
        "targetedHarassment": np.clip(0.10 + 0.40 * a + rng.normal(0, 0.09, n), 0, 1),
        "capsRatio": np.clip(0.12 + 0.52 * a + rng.normal(0, 0.09, n), 0, 1),
        "repetitionRate": np.clip(0.10 + 0.33 * a + rng.normal(0, 0.08, n), 0, 1),
        "messageBurstRate": np.clip(0.15 + 0.40 * a + rng.normal(0, 0.08, n), 0, 1),
    }


def _toxic_features(rng: np.random.Generator, severity: np.ndarray) -> dict[str, np.ndarray]:
    """Toxic conduct as a function of latent severity (+ noise).

    Severity and targeted-harassment are the discriminative signals (slurs/threats
    directed at a person); lexicon/caps overlap heavily with loud banter. At the
    subtle end (low severity) toxic genuinely overlaps acceptable, creating hard
    cases — this is the false-positive risk that makes the low-FPR target real.
    """
    n = len(severity)
    c = severity
    return {
        "toxicityLexiconScore": np.clip(0.34 + 0.55 * c + rng.normal(0, 0.09, n), 0, 1),
        "severityWeighted": np.clip(0.24 + 0.58 * c + rng.normal(0, 0.10, n), 0, 1),
        "targetedHarassment": np.clip(0.26 + 0.57 * c + rng.normal(0, 0.10, n), 0, 1),
        "capsRatio": np.clip(0.18 + 0.52 * c + rng.normal(0, 0.10, n), 0, 1),
        "repetitionRate": np.clip(0.18 + 0.50 * c + rng.normal(0, 0.09, n), 0, 1),
        "messageBurstRate": np.clip(0.22 + 0.50 * c + rng.normal(0, 0.09, n), 0, 1),
    }


def _sample_group(
    rng: np.random.Generator,
    toxic: bool,
    channel: str,
    n: int,
) -> pd.DataFrame:
    """Build n samples for one (label, channel) group."""
    if toxic:
        feats = _toxic_features(rng, _sample_severity(rng, n))
    else:
        feats = _acceptable_features(rng, _sample_aggression(rng, n))

    # Voice is transcribed: add a little extra noise to represent ASR error.
    if channel == CHANNEL_VOICE:
        for k in FEATURE_NAMES:
            feats[k] = np.clip(feats[k] + rng.normal(0, VOICE_NOISE_STD, n), 0, 1)

    frame = pd.DataFrame({name: feats[name] for name in FEATURE_NAMES})
    frame[COL_CHANNEL] = channel
    frame[COL_LABEL] = LABEL_TOXIC if toxic else LABEL_ACCEPTABLE
    frame[COL_OFFENCE] = offence_for_channel(channel) if toxic else OFFENCE_NONE
    frame[COL_IS_TOXIC] = int(toxic)
    return frame


def _split_counts(total: int, fraction: float) -> tuple[int, int]:
    """Split `total` into (positive, negative) by `fraction` positive."""
    pos = int(round(total * fraction))
    return pos, total - pos


def generate_dataset(
    n_samples: int = DEFAULT_N_SAMPLES,
    toxic_fraction: float = DEFAULT_TOXIC_FRACTION,
    voice_fraction: float = DEFAULT_VOICE_FRACTION,
    seed: int = DEFAULT_SEED,
) -> pd.DataFrame:
    """Generate the labelled synthetic conduct dataset (see module docstring)."""
    if not 0.0 <= toxic_fraction <= 1.0:
        raise ValueError("toxic_fraction must be between 0 and 1")
    if not 0.0 <= voice_fraction <= 1.0:
        raise ValueError("voice_fraction must be between 0 and 1")
    if n_samples <= 0:
        raise ValueError("n_samples must be positive")

    rng = np.random.default_rng(seed)

    n_toxic, n_acceptable = _split_counts(n_samples, toxic_fraction)

    groups = []
    for toxic, n in ((True, n_toxic), (False, n_acceptable)):
        n_voice, n_text = _split_counts(n, voice_fraction)
        if n_text > 0:
            groups.append(_sample_group(rng, toxic, CHANNEL_TEXT, n_text))
        if n_voice > 0:
            groups.append(_sample_group(rng, toxic, CHANNEL_VOICE, n_voice))

    data = pd.concat(groups, ignore_index=True)
    data = data.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    return data


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Generate the synthetic conduct-detection dataset.")
    parser.add_argument("--n-samples", type=int, default=DEFAULT_N_SAMPLES)
    parser.add_argument("--toxic-fraction", type=float, default=DEFAULT_TOXIC_FRACTION)
    parser.add_argument("--voice-fraction", type=float, default=DEFAULT_VOICE_FRACTION)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(argv)

    data = generate_dataset(args.n_samples, args.toxic_fraction, args.voice_fraction, args.seed)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(args.out, index=False)

    print(f"Wrote {len(data)} samples -> {args.out}")
    print(f"Seed: {args.seed}  Toxic fraction: {args.toxic_fraction}  Voice fraction: {args.voice_fraction}")
    print("\nClass balance:")
    print(data[COL_LABEL].value_counts().to_string())
    print("\nChannels:")
    print(data[COL_CHANNEL].value_counts().to_string())
    print("\nOffence types:")
    print(data[COL_OFFENCE].value_counts().to_string())


if __name__ == "__main__":
    main()






