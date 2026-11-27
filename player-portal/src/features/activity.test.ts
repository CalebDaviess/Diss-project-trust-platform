import { describe, expect, it } from "vitest";
import { activityCategory, activityKind, formatRelativeTime, offenceLabel } from "./activity";

describe("offenceLabel", () => {
  it("formats known camelCase and enum codes into plain English", () => {
    expect(offenceLabel("chatAbuse")).toBe("Chat abuse");
    expect(offenceLabel("voiceAbuse")).toBe("Voice abuse");
    expect(offenceLabel("aimbot")).toBe("Aimbot");
    expect(offenceLabel("accountSharing")).toBe("Account sharing");
    expect(offenceLabel("none")).toBe("General conduct");
  });

  it("handles unknown and blank offence values gracefully", () => {
    expect(offenceLabel("customHeuristicFlag")).toBe("Custom heuristic flag");
    expect(offenceLabel("")).toBe("Offence");
    expect(offenceLabel(null)).toBe("Offence");
  });
});

describe("activityCategory & activityKind", () => {
  it("maps backend actions to human headlines and filter buckets", () => {
    expect(activityKind({ source: "antiCheat", action: "VERDICT_CONFIRMED" }).label).toBe("Anti-cheat verdict confirmed");
    expect(activityCategory({ source: "antiCheat", action: "VERDICT_CONFIRMED" })).toBe("anticheat");
    expect(activityCategory({ source: "operator", action: "BAN" })).toBe("ban");
    expect(activityCategory({ source: "conductEngine", action: "FLAGGED" })).toBe("report");
    expect(activityCategory({ source: "player", action: "APPEAL_SUBMITTED" })).toBe("appeal");
  });
});

describe("formatRelativeTime", () => {
  it("returns readable relative offsets and falls back to short dates after 30 days", () => {
    const now = Date.parse("2026-11-27T12:00:00Z");
    expect(formatRelativeTime("2026-11-27T11:59:40Z", now)).toBe("Just now");
    expect(formatRelativeTime("2026-11-27T11:52:00Z", now)).toBe("8m ago");
    expect(formatRelativeTime("2026-11-27T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-11-26T12:00:00Z", now)).toBe("Yesterday");
    expect(formatRelativeTime("2026-11-15T12:00:00Z", now)).toBe("12d ago");
    expect(formatRelativeTime("2026-09-01T12:00:00Z", now)).toContain("2026");
  });
});
