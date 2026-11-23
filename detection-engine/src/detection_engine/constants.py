"""Shared constants for the conduct-detection engine.

Single source of truth for the conduct feature names, channel values and
offence-type labels. These mirror the data contracts in the dissertation vault:
  - Features:      dissertation-vault/03-methodology/Features.md
  - OffenceType:   dissertation-vault/04-architecture/Data-Model.md ("OffenceType values")

Keeping them here means generate_dataset, features, train and the /score API all
agree on the exact field order and label set.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Conduct features (six). Order is significant — it is the column order in the
# dataset and the model's input vector. "Suspicious direction" is documented in
# Features.md. The hard task is separating genuinely toxic conduct from robust-
# but-acceptable competitive banter, so the shallow features (lexicon, caps)
# deliberately overlap and the signal lives in the COMBINATION with severity and
# targeted-harassment.
#   Lexical    : toxicityLexiconScore, severityWeighted
#   Target     : targetedHarassment
#   Structural : capsRatio, repetitionRate, messageBurstRate
# ---------------------------------------------------------------------------
FEATURE_NAMES: list[str] = [
    "toxicityLexiconScore",
    "severityWeighted",
    "targetedHarassment",
    "capsRatio",
    "repetitionRate",
    "messageBurstRate",
]

# ---------------------------------------------------------------------------
# Channels. A conduct sample is either text chat or (transcribed) voice chat.
# The channel determines the conduct OffenceType when a sample is flagged:
#   text  -> chatAbuse
#   voice -> voiceAbuse
# "Which" conduct offence it is = the channel, so it is derived (not a second
# ML head). Cheat offences (aimbot, wallhack, ...) are NOT produced here — they
# are ingested from external anti-cheat (see Anti-Cheat-Integration.md).
# ---------------------------------------------------------------------------
CHANNEL_TEXT = "text"
CHANNEL_VOICE = "voice"
CHANNELS: list[str] = [CHANNEL_TEXT, CHANNEL_VOICE]

OFFENCE_NONE = "none"
OFFENCE_CHAT = "chatAbuse"
OFFENCE_VOICE = "voiceAbuse"
CONDUCT_OFFENCES: list[str] = [OFFENCE_CHAT, OFFENCE_VOICE]


def offence_for_channel(channel: str) -> str:
    """Map a channel to its conduct offence type (text->chatAbuse, voice->voiceAbuse)."""
    return OFFENCE_VOICE if channel == CHANNEL_VOICE else OFFENCE_CHAT


# Binary target labels.
LABEL_ACCEPTABLE = "acceptable"
LABEL_TOXIC = "toxic"

# Column names used in the generated dataset (features + these label columns).
COL_CHANNEL = "channel"      # text | voice
COL_LABEL = "label"          # acceptable | toxic
COL_OFFENCE = "offenceType"  # none | chatAbuse | voiceAbuse
COL_IS_TOXIC = "isToxic"     # 0 | 1  (numeric target for models)

