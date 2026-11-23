import type { ActivityItem, OffenceSource } from "../api/accountabilityApi";

export type ActivityTone = "good" | "warn" | "bad" | "accent" | "neutral";

export interface ActivityKind {
  /** Readable headline for the event. */
  label: string;
  /** Short badge text. */
  badge: string;
  tone: ActivityTone;
  /** True for appeal-related events (submitted / approved / denied). */
  isAppeal: boolean;
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

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
