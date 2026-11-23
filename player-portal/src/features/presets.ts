import type { ConductFeatureVector } from "../api/accountabilityApi";

/** Demo presets that fill the conduct feature form in one click. */
export interface FeaturePreset {
  key: string;
  label: string;
  description: string;
  features: ConductFeatureVector;
}

/**
 * "Acceptable banter" — competitive trash-talk: can be loud/sweary (some caps, some lexicon
 * hits) but NOT targeted harassment and low on severity. Should score as acceptable, i.e. the
 * conduct engine must NOT flag banter as abuse (this is the hard, low-false-positive case).
 */
export const ACCEPTABLE_BANTER: FeaturePreset = {
  key: "banter",
  label: "Acceptable banter (text)",
  description: "Loud, competitive trash-talk — not targeted or severe. Should NOT be flagged.",
  features: {
    channel: "text",
    toxicityLexiconScore: 0.32,
    severityWeighted: 0.16,
    targetedHarassment: 0.12,
    capsRatio: 0.38,
    repetitionRate: 0.2,
    messageBurstRate: 0.3,
  },
};

/**
 * "Toxic chat" — targeted, severe abuse in text: high severity + targeted-harassment, with
 * heavy lexicon and shouting. Should score as toxic conduct (pending human review).
 */
export const TOXIC_CHAT: FeaturePreset = {
  key: "toxic-chat",
  label: "Toxic chat (text)",
  description: "Targeted, severe text abuse — should be flagged for review.",
  features: {
    channel: "text",
    toxicityLexiconScore: 0.85,
    severityWeighted: 0.8,
    targetedHarassment: 0.82,
    capsRatio: 0.68,
    repetitionRate: 0.55,
    messageBurstRate: 0.64,
  },
};

/**
 * "Toxic voice" — the same targeted, severe abuse observed on voice chat (transcribed via ASR).
 * Mirrors toxic chat but on the voice channel, so the flagged offence is voiceAbuse.
 */
export const TOXIC_VOICE: FeaturePreset = {
  key: "toxic-voice",
  label: "Toxic voice (voice)",
  description: "Targeted, severe voice abuse (ASR-transcribed) — should be flagged for review.",
  features: {
    channel: "voice",
    toxicityLexiconScore: 0.8,
    severityWeighted: 0.78,
    targetedHarassment: 0.75,
    capsRatio: 0.6,
    repetitionRate: 0.5,
    messageBurstRate: 0.7,
  },
};

export const FEATURE_PRESETS: FeaturePreset[] = [
  ACCEPTABLE_BANTER,
  TOXIC_CHAT,
  TOXIC_VOICE,
];
