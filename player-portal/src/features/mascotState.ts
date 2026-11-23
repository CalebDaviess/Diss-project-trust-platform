import type { MascotMood } from "../components/viz/Mascot";

export type StatCardKey = "offences" | "open" | "games" | "bans";
export type SceneKind = "none" | "thunder" | "field" | "feast" | "heaven";
export type MascotTone = "good" | "warn" | "bad" | "accent";

export interface MascotState {
  mood: MascotMood;
  scene: SceneKind;
  confetti: boolean;
  golden: boolean;
  lounging: boolean;
  tone: MascotTone;
  /** Short label shown on the card and as the scene headline. */
  label: string;
  /** Longer supporting line shown in the detail modal. */
  sub: string;
}

/** Negative metrics (fewer is better): confirmed offences / open cases / active bans. */
function negativeState(
  value: number,
  labels: { zero: string; low: string; high: string },
  subs: { zero: string; low: string; high: string },
  low: { mood: MascotMood; tone: MascotTone },
): MascotState {
  if (value === 0) {
    return { mood: "cheer", scene: "none", confetti: true, golden: false, lounging: false, tone: "good", label: labels.zero, sub: subs.zero };
  }
  if (value <= 5) {
    return { mood: low.mood, scene: "none", confetti: false, golden: false, lounging: false, tone: low.tone, label: labels.low, sub: subs.low };
  }
  return { mood: "sad", scene: "thunder", confetti: false, golden: false, lounging: false, tone: "bad", label: labels.high, sub: subs.high };
}

/**
 * Map a stat-card metric value to a mascot "state" (mood + scene + effects + copy). Linked games
 * is a gamified ladder (more is better); the other three are negative metrics (fewer is better).
 */
export function mascotStateFor(card: StatCardKey, value: number): MascotState {
  switch (card) {
    case "games":
      if (value === 0)
        return { mood: "sad", scene: "thunder", confetti: false, golden: false, lounging: false, tone: "bad", label: "No games yet", sub: "Play a linked game and your record starts here." };
      if (value < 5)
        return { mood: "happy", scene: "none", confetti: false, golden: false, lounging: false, tone: "accent", label: "Getting started", sub: "Your identity is linked and building a history." };
      if (value < 10)
        return { mood: "cheer", scene: "none", confetti: true, golden: false, lounging: false, tone: "good", label: "On a roll!", sub: "You're active across several linked games." };
      if (value < 20)
        return { mood: "happy", scene: "field", confetti: false, golden: false, lounging: true, tone: "good", label: "Living the dream", sub: "Kicking back — your reputation travels with you." };
      if (value < 28)
        return { mood: "cheer", scene: "feast", confetti: true, golden: false, lounging: false, tone: "good", label: "Absolute feast!", sub: "A full spread of linked games under one identity." };
      return { mood: "cheer", scene: "heaven", confetti: true, golden: true, lounging: false, tone: "good", label: "Ascended ✨", sub: "Legendary reach — your identity is everywhere." };

    case "offences":
      return negativeState(
        value,
        { zero: "All clear!", low: "On your record", high: "Needs attention" },
        {
          zero: "Your record is clean across every linked game. Nice work!",
          low: "A few confirmed offences are on your record.",
          high: "Several confirmed offences — time to turn this around.",
        },
        { mood: "neutral", tone: "warn" },
      );

    case "open":
      return negativeState(
        value,
        { zero: "All caught up!", low: "Awaiting review", high: "Piling up" },
        {
          zero: "Nothing is awaiting review right now.",
          low: "Some cases are still pending or under appeal.",
          high: "A lot of cases are open — they need resolving.",
        },
        { mood: "neutral", tone: "warn" },
      );

    case "bans":
      return negativeState(
        value,
        { zero: "Good standing!", low: "Ban active", high: "Serious trouble" },
        {
          zero: "You are in good standing everywhere. Keep it up!",
          low: "An operator currently has an active ban on you.",
          high: "Multiple active bans — your identity is in serious trouble.",
        },
        { mood: "sad", tone: "bad" },
      );
  }
}
