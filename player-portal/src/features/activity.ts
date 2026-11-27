import type { ActivityItem, OffenceSource } from "../api/accountabilityApi";

export type ActivityTone = "good" | "warn" | "bad" | "accent" | "neutral";
export type ActivityCategory = "all" | "report" | "anticheat" | "ban" | "appeal";

export interface ActivityKind {
  /** Readable headline for the event. */
  label: string;
  /** Short badge text. */
  badge: string;
  tone: ActivityTone;
  /** True for appeal-related events (submitted / approved / denied). */
  isAppeal: boolean;
}

const OFFENCE_LABELS: Record<string, string> = {
  chatabuse: "Chat abuse",
  voiceabuse: "Voice abuse",
  aimbot: "Aimbot",
  wallhack: "Wallhack",
  speedhack: "Speedhack",
  macro: "Macro / scripting",
  tampering: "Client tampering",
  accountsharing: "Account sharing",
  misconduct: "Misconduct",
  none: "General conduct",
};

const COMPANY_LABELS: Record<string, string> = {
  steam: "Valve (Steam)",
  riot: "Riot Games",
  battlenet: "Blizzard (Battle.net)",
  epic: "Epic Games",
  xbox: "Xbox",
  psn: "PlayStation",
  ea: "EA",
  ubisoft: "Ubisoft",
  microsoft: "Microsoft",
  roblox: "Roblox",
  hoyoverse: "HoYoverse",
  supercell: "Supercell",
  niantic: "Niantic",
  "square-enix": "Square Enix",
  jagex: "Jagex",
};

/** Friendly publisher / game-company name for a provider or operator id (e.g. "Riot Games", "Valve (Steam)"). */
export function companyLabel(provider?: string | null, operatorId?: string | null): string {
  const candidates = [provider, operatorId?.replace(/^op-/i, "")];
  for (const raw of candidates) {
    if (!raw || !raw.trim()) continue;
    const key = raw.trim().toLowerCase();
    if (COMPANY_LABELS[key]) return COMPANY_LABELS[key];
    return raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1);
  }
  return "the game company";
}

/** Turn machine offence codes (e.g. "chatAbuse", "aimbot") into plain English labels. */
export function offenceLabel(raw?: string | null): string {
  if (!raw || !raw.trim()) return "Offence";
  const key = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (OFFENCE_LABELS[key]) return OFFENCE_LABELS[key];
  // Split camelCase / kebab-case gracefully for any future enum values.
  const spaced = raw
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function sourceLabel(source: OffenceSource): string {
  switch (source) {
    case "conductEngine":
      return "Conduct engine";
    case "antiCheat":
      return "Anti-cheat";
    case "operator":
      return "Operator";
    case "player":
      return "You";
    default:
      return source;
  }
}

/** Map an audited event (source + action) to a readable label, badge and tone. */
export function activityKind(item: Pick<ActivityItem, "source" | "action">): ActivityKind {
  const action = (item.action ?? "").toUpperCase();
  switch (action) {
    case "APPEAL_SUBMITTED":
      return { label: "Appeal submitted", badge: "Appeal", tone: "accent", isAppeal: true };
    case "APPEAL_APPROVED":
      return { label: "Appeal approved — sanction overturned", badge: "Overturned", tone: "good", isAppeal: true };
    case "APPEAL_DENIED":
      return { label: "Appeal denied — sanction upheld", badge: "Upheld", tone: "warn", isAppeal: true };
    case "BAN":
      return { label: "Ban applied", badge: "Ban", tone: "bad", isAppeal: false };
    case "FLAGGED":
      return { label: "Conduct report filed", badge: "Report", tone: "warn", isAppeal: false };
    case "VERDICT_CONFIRMED":
      return { label: "Anti-cheat verdict confirmed", badge: "Anti-cheat", tone: "bad", isAppeal: false };
    default:
      break;
  }
  switch (item.source) {
    case "antiCheat":
      return { label: "Anti-cheat verdict confirmed", badge: "Anti-cheat", tone: "bad", isAppeal: false };
    case "conductEngine":
      return { label: "Conduct report", badge: "Report", tone: "warn", isAppeal: false };
    case "operator":
      return { label: "Operator action", badge: "Operator", tone: "bad", isAppeal: false };
    case "player":
      return { label: "Your action", badge: "You", tone: "accent", isAppeal: true };
    default:
      return { label: item.action || "Event", badge: "Event", tone: "neutral", isAppeal: false };
  }
}

/** Bucket an activity event for the My Record quick-filter chips. */
export function activityCategory(item: Pick<ActivityItem, "source" | "action">): Exclude<ActivityCategory, "all"> {
  const action = (item.action ?? "").toUpperCase();
  if (action.startsWith("APPEAL") || item.source === "player") return "appeal";
  if (action === "BAN") return "ban";
  if (action === "VERDICT_CONFIRMED" || item.source === "antiCheat") return "anticheat";
  return "report";
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/** Concise human-friendly relative time ("Just now", "5m ago", "12d ago") with short-date fallback. */
export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffSec = Math.round((nowMs - d.getTime()) / 1000);
  if (diffSec < 45) return "Just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.round(diffHr / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
