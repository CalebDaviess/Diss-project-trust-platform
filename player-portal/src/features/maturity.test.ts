import { describe, expect, it } from "vitest";
import { isMatureGame } from "./maturity";

describe("isMatureGame", () => {
  it("flags well-known 18+ titles (case-insensitive, substring)", () => {
    expect(isMatureGame("Grand Theft Auto V")).toBe(true);
    expect(isMatureGame("call of duty: modern warfare")).toBe(true);
    expect(isMatureGame("Cyberpunk 2077")).toBe(true);
    expect(isMatureGame("VALORANT")).toBe(true);
  });

  it("treats unknown / family titles as non-mature", () => {
    expect(isMatureGame("Rocket League")).toBe(false);
    expect(isMatureGame("Minecraft")).toBe(false);
    expect(isMatureGame("Overwatch 2")).toBe(false);
  });

  it("is safe for empty / missing names", () => {
    expect(isMatureGame("")).toBe(false);
    expect(isMatureGame(null)).toBe(false);
    expect(isMatureGame(undefined)).toBe(false);
  });
});
