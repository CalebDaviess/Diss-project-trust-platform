import { describe, expect, it } from "vitest";
import { activityCategory, activityKind, companyLabel, formatRelativeTime, offenceLabel } from "./activity";
import { banStatusMeta } from "./bans";

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

describe("companyLabel & banStatusMeta", () => {
  it("maps publisher/provider codes to readable game company names", () => {
    expect(companyLabel("riot")).toBe("Riot Games");
    expect(companyLabel("steam")).toBe("Valve (Steam)");
    expect(companyLabel("battlenet")).toBe("Blizzard (Battle.net)");
    expect(companyLabel(null, "op-epic")).toBe("Epic Games");
    expect(companyLabel(null, null)).toBe("the game company");
  });

  it("reflects open, denied, final, and appealable ban states consistently", () => {
    const open = banStatusMeta({ appealable: true, appealStatus: "open", provider: "steam", operatorId: "steam" });
    expect(open.badge).toBe("Appeal open");
    expect(open.appealOpen).toBe(true);
    expect(open.canAppeal).toBe(false);
    expect(open.detail).toContain("Valve (Steam)");

    const denied = banStatusMeta({ appealable: true, appealStatus: "denied", provider: "riot", operatorId: "riot" });
    expect(denied.badge).toBe("Banned");
    expect(denied.tone).toBe("bad");
    expect(denied.canAppeal).toBe(false);
    expect(denied.detail).toContain("Riot Games");

    const finalBan = banStatusMeta({ appealable: false, appealStatus: "none", provider: "epic", operatorId: "epic" });
    expect(finalBan.badge).toBe("Banned · final");
    expect(finalBan.canAppeal).toBe(false);

    const appealable = banStatusMeta({ appealable: true, appealStatus: "none", provider: "steam", operatorId: "steam" });
    expect(appealable.badge).toBe("Appealable");
    expect(appealable.canAppeal).toBe(true);
  });
});
