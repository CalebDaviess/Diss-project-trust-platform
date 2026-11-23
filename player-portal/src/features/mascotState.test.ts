import { describe, it, expect } from "vitest";
import { mascotStateFor } from "./mascotState";

/**
 * Locks the mascot "mood ladder" to the product rules:
 * - Linked games (more is better): 0 sad+thunder, 1–4 happy, 5–9 confetti, 10–19 grass field,
 *   20–27 feast, 28+ heaven (golden).
 * - Confirmed offences / open cases (fewer is better): 0 cheer+confetti, 1–5 straight face,
 *   6+ sad+thunder.
 * - Active bans (fewer is better): 0 cheer+confetti, 1–5 sad, 6+ sad+thunder.
 */
describe("mascotStateFor — linked games ladder", () => {
  it("0 games is sad with a thunder scene", () => {
    const s = mascotStateFor("games", 0);
    expect(s.mood).toBe("sad");
    expect(s.scene).toBe("thunder");
  });

  it("1–4 games is happy with no confetti", () => {
    for (const n of [1, 4]) {
      const s = mascotStateFor("games", n);
      expect(s.mood).toBe("happy");
      expect(s.scene).toBe("none");
      expect(s.confetti).toBe(false);
    }
  });

  it("5–9 games adds confetti", () => {
    for (const n of [5, 9]) {
      expect(mascotStateFor("games", n).confetti).toBe(true);
    }
  });

  it("10–19 games is the grass field (lounging)", () => {
    for (const n of [10, 19]) {
      const s = mascotStateFor("games", n);
      expect(s.scene).toBe("field");
      expect(s.lounging).toBe(true);
    }
  });

  it("20–27 games is the feast", () => {
    for (const n of [20, 27]) {
      expect(mascotStateFor("games", n).scene).toBe("feast");
    }
  });

  it("28+ games is heaven with golden eyes", () => {
    const s = mascotStateFor("games", 28);
    expect(s.scene).toBe("heaven");
    expect(s.golden).toBe(true);
  });
});

describe("mascotStateFor — negative metrics", () => {
  it.each(["offences", "open", "bans"] as const)("%s at 0 is cheerful with confetti", (card) => {
    const s = mascotStateFor(card, 0);
    expect(s.mood).toBe("cheer");
    expect(s.confetti).toBe(true);
    expect(s.tone).toBe("good");
  });

  it("offences/open at 1–5 show a straight (neutral) face", () => {
    for (const card of ["offences", "open"] as const) {
      for (const n of [1, 5]) {
        expect(mascotStateFor(card, n).mood).toBe("neutral");
        expect(mascotStateFor(card, n).scene).toBe("none");
      }
    }
  });

  it("bans at 1–5 are already sad", () => {
    for (const n of [1, 5]) {
      const s = mascotStateFor("bans", n);
      expect(s.mood).toBe("sad");
      expect(s.scene).toBe("none");
    }
  });

  it.each(["offences", "open", "bans"] as const)("%s at 6+ is sad with thunder", (card) => {
    const s = mascotStateFor(card, 6);
    expect(s.mood).toBe("sad");
    expect(s.scene).toBe("thunder");
  });
});
