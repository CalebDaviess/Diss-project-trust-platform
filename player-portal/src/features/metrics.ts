import type { ResultView } from "../api/accountabilityApi";

export interface PlayerMetrics {
  trustScore: number;
  verdict: "Trusted" | "Caution" | "At risk";
  /** Confirmed offences on the current game plus confirmed offences seen in other games. */
  confirmedOffences: number;
  /** Cases still pending or under appeal on the current game. */
  openCases: number;
  /** Games this identity is seen in (current game, if it has a record, + cross-game signals). */
  linkedGames: number;
  /** Games where another operator currently has an active ban. */
  activeBans: number;
}

export function verdictLabel(score: number): PlayerMetrics["verdict"] {
  if (score >= 70) return "Trusted";
  if (score >= 40) return "Caution";
  return "At risk";
}

function isConfirmed(status: string): boolean {
  return status.toLowerCase() === "confirmed";
}

function isOpen(status: string): boolean {
  const s = status.toLowerCase();
  return s === "pending" || s === "appealed";
}

/** Derive the headline account metrics shown on the dashboard and account tabs. */
export function deriveMetrics(result: ResultView): PlayerMetrics {
  // An overturned sanction is revoked, so the current game's confirmed cases no longer count.
  const thisGameConfirmed =
    result.status === "overturned"
      ? 0
      : result.caseHistory.filter((c) => isConfirmed(c.status)).length;
  const crossGameConfirmed = result.crossGameSignals.reduce(
    (sum, s) => sum + s.confirmedOffenceCount,
    0,
  );
  const openCases = result.caseHistory.filter((c) => isOpen(c.status)).length;

  // Linked games and active bans are profile-level totals from the backend (real connections),
  // so they never collapse to 0 when a sanction is cleared. Fall back to the old derivation only
  // if the counts are absent.
  const linkedGames =
    result.linkedGamesCount ??
    result.crossGameSignals.length + (result.conductScore !== null ? 1 : 0);
  const activeBans =
    result.activeBanCount ?? result.crossGameSignals.filter((s) => s.hasActiveBan).length;

  return {
    trustScore: result.globalTrustScore,
    verdict: verdictLabel(result.globalTrustScore),
    confirmedOffences: thisGameConfirmed + crossGameConfirmed,
    openCases,
    linkedGames,
    activeBans,
  };
}

/**
 * A deterministic, illustrative trust-score trend ending at the current score.
 * Synthetic-data prototype: there is no historical score series in the backend, so we derive a
 * stable curve from the score itself (same score → same curve) purely for the dashboard visual.
 */
export function trustTrend(score: number, points = 12): number[] {
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    // Start a little above/below and ease toward the real score, with a gentle deterministic wave.
    const drift = (1 - t) * 10 * Math.sin(score + i * 1.3);
    const base = score - (1 - t) * Math.min(18, score * 0.2);
    out.push(Math.max(0, Math.min(100, Math.round(base + drift))));
  }
  out[points - 1] = Math.max(0, Math.min(100, Math.round(score)));
  return out;
}

/** Small deterministic series for a metric-card sparkline, ending near `end`. */
export function miniTrend(seed: number, end: number, points = 10): number[] {
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const wave = Math.sin(seed + i * 0.9) * 0.5 + 0.5;
    out.push(Math.round((end * (0.4 + 0.6 * t) + wave * 3) * 10) / 10);
  }
  return out;
}
