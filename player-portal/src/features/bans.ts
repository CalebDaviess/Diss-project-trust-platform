import type { BanView } from "../api/accountabilityApi";

const TYPE_LABELS: Record<string, string> = {
  communication: "Communication ban",
  temporary: "Temporary ban",
  permanent: "Permanent ban",
  gameplay: "Gameplay ban",
};

export function banTypeLabel(banType: string): string {
  return TYPE_LABELS[banType] ?? `${banType.charAt(0).toUpperCase()}${banType.slice(1)} ban`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Human-readable extent/length of a ban, e.g. "Permanent" or "6 days left · until 23 Nov 2026". */
export function banExtent(ban: Pick<BanView, "bannedAt" | "expiresAt">): string {
  if (!ban.expiresAt) return "Permanent · no end date";
  const end = new Date(ban.expiresAt).getTime();
  if (Number.isNaN(end)) return `Until ${formatDate(ban.expiresAt)}`;
  const daysLeft = Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
  const left = daysLeft === 0 ? "expires today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  return `${left} · until ${formatDate(ban.expiresAt)}`;
}

/** Tone for a ban type (permanent = worst). */
export function banTone(banType: string): "bad" | "warn" {
  return banType === "permanent" ? "bad" : "warn";
}
