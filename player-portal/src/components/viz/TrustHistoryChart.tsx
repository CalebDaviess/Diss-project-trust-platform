import { useEffect, useId, useMemo, useState } from "react";
import { getTrustHistory, type TrustPointView } from "../../api/accountabilityApi";

type Range = "1y" | "5y" | "life";

const RANGES: Array<{ id: Range; label: string; days: number | null }> = [
  { id: "1y", label: "1Y", days: 365 },
  { id: "5y", label: "5Y", days: 365 * 5 },
  { id: "life", label: "Lifetime", days: null },
];

/** Human label for the machine reason codes recorded alongside each trust change. */
function reasonLabel(reason: string): string {
  switch (reason) {
    case "account_created":
      return "Account created";
    case "current":
      return "Current standing";
    case "ban":
    case "external-ban":
      return "External ban applied";
    case "anti-cheat":
    case "anti-cheat-verdict":
      return "Anti-cheat verdict";
    case "appeal-overturned":
      return "Appeal overturned";
    default:
      return reason.replace(/[-_]+/g, " ");
  }
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

interface TrustHistoryChartProps {
  token: string;
  /** Re-fetch when this changes (e.g. after a simulate action updates the score). */
  refreshKey?: unknown;
}

/**
 * Real trust-over-time graph. Fetches the stored series (GET /trust-history) which always
 * starts at 100 on account creation and steps up/down with every sanction and overturned
 * appeal. Hovering or keyboard-focusing any marker inspects the exact event, date, score, and delta.
 */
export function TrustHistoryChart({ token, refreshKey }: TrustHistoryChartProps) {
  const gid = useId();
  const [series, setSeries] = useState<TrustPointView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("life");
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getTrustHistory(token)
      .then((data) => {
        if (!cancelled) setSeries(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load trust history.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const points = useMemo(() => {
    if (!series) return [];
    return series
      .map((p) => ({ t: new Date(p.occurredAt).getTime(), score: p.score, reason: p.reason }))
      .filter((p) => !Number.isNaN(p.t))
      .sort((a, b) => a.t - b.t);
  }, [series]);

  const view = useMemo(() => {
    if (points.length === 0) return [];
    const cfg = RANGES.find((r) => r.id === range)!;
    if (cfg.days === null) return points;
    const cutoff = Date.now() - cfg.days * 86_400_000;
    const inRange = points.filter((p) => p.t >= cutoff);
    const prior = points.filter((p) => p.t < cutoff);
    const before = prior.length > 0 ? prior[prior.length - 1] : undefined;
    if (before) return [{ ...before, t: cutoff }, ...inRange];
    return inRange.length > 0 ? inRange : points.slice(-1);
  }, [points, range]);

  useEffect(() => {
    setActiveIdx(null);
  }, [range, series]);

  const realChanges = useMemo(
    () => points.filter((p) => p.reason !== "account_created" && p.reason !== "current").length,
    [points],
  );

  const w = 640;
  const h = 200;
  const padL = 34;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const geometry = useMemo(() => {
    if (view.length === 0) return null;
    const tMin = view[0].t;
    const tMax = Math.max(view[view.length - 1].t, Date.now());
    const tSpan = tMax - tMin || 1;
    const x = (t: number) => padL + ((t - tMin) / tSpan) * plotW;
    const y = (s: number) => padT + (1 - s / 100) * plotH;
    const nodes: Array<[number, number]> = [];
    view.forEach((p, i) => {
      const px = x(p.t);
      const py = y(p.score);
      if (i > 0) nodes.push([px, nodes[nodes.length - 1][1]]);
      nodes.push([px, py]);
    });
    const nowX = x(tMax);
    const lastY = y(view[view.length - 1].score);
    nodes.push([nowX, lastY]);
    const line = nodes.map((n, i) => `${i === 0 ? "M" : "L"} ${n[0].toFixed(1)} ${n[1].toFixed(1)}`).join(" ");
    const area = `${line} L ${nowX.toFixed(1)} ${padT + plotH} L ${padL} ${padT + plotH} Z`;
    const markers = view.map((p, i) => ({
      x: x(p.t),
      y: y(p.score),
      delta: i > 0 ? p.score - view[i - 1].score : 0,
      ...p,
    }));
    const trustedY = y(70);
    return { line, area, markers, nowX, lastY, tMin, tMax, trustedY };
  }, [view, plotW, plotH]);

  const inspected =
    activeIdx !== null && geometry && geometry.markers[activeIdx]
      ? geometry.markers[activeIdx]
      : null;

  return (
    <div className="trustchart">
      <div className="trustchart__bar">
        <div className="trustchart__readout" aria-live="polite">
          {inspected ? (
            <>
              <strong>{reasonLabel(inspected.reason)}</strong>
              <span className="muted"> · {formatDate(inspected.t)} · </span>
              <span className="trustchart__score">{inspected.score}/100</span>
              {inspected.delta !== 0 && (
                <span className={`trustchart__delta ${inspected.delta > 0 ? "is-good" : "is-bad"}`}>
                  {inspected.delta > 0 ? `+${inspected.delta}` : inspected.delta}
                </span>
              )}
            </>
          ) : (
            <span className="muted">Hover or focus any event point to inspect changes</span>
          )}
        </div>
        <div className="trustchart__controls" role="group" aria-label="Trust history range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`rangebtn ${range === r.id ? "rangebtn--on" : ""}`}
              aria-pressed={range === r.id}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="muted">{error}</p>
      ) : !series ? (
        <div className="skeleton skeleton--chart" aria-busy="true" aria-label="Loading trust history" />
      ) : !geometry ? (
        <p className="muted">No trust history yet.</p>
      ) : (
        <>
          <svg
            className="trustchart__svg"
            viewBox={`0 0 ${w} ${h}`}
            role="img"
            aria-label="Trust score over time"
            onMouseLeave={() => setActiveIdx(null)}
          >
            <defs>
              <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`${gid}-stroke`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--accent-3)" />
                <stop offset="100%" stopColor="var(--accent-2)" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map((g) => {
              const gy = padT + (1 - g / 100) * plotH;
              return (
                <g key={g}>
                  <line x1={padL} y1={gy} x2={w - padR} y2={gy} stroke="var(--surface-3)" strokeWidth="1" />
                  <text x={padL - 8} y={gy + 3} textAnchor="end" className="trustchart__axis">
                    {g}
                  </text>
                </g>
              );
            })}
            <line
              x1={padL}
              y1={geometry.trustedY}
              x2={w - padR}
              y2={geometry.trustedY}
              stroke="var(--good)"
              strokeOpacity="0.28"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <path d={geometry.area} fill={`url(#${gid}-fill)`} />
            <path d={geometry.line} fill="none" stroke={`url(#${gid}-stroke)`} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            {inspected && (
              <line
                x1={inspected.x}
                y1={padT}
                x2={inspected.x}
                y2={padT + plotH}
                stroke="var(--accent-2)"
                strokeOpacity="0.55"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            )}
            {geometry.markers.map((mk, i) => {
              const isActive = activeIdx === i;
              return (
                <g
                  key={i}
                  className="trustchart__marker"
                  tabIndex={0}
                  role="button"
                  aria-label={`${reasonLabel(mk.reason)} on ${formatDate(mk.t)}: ${mk.score} out of 100`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onFocus={() => setActiveIdx(i)}
                  onBlur={() => setActiveIdx(null)}
                >
                  {isActive && (
                    <circle cx={mk.x} cy={mk.y} r="9" fill="var(--accent-2)" fillOpacity="0.22" />
                  )}
                  <circle cx={mk.x} cy={mk.y} r="11" fill="transparent" />
                  <circle
                    cx={mk.x}
                    cy={mk.y}
                    r={isActive ? "5" : "3.8"}
                    fill={isActive ? "var(--accent)" : "var(--accent-2)"}
                    stroke="var(--surface)"
                    strokeWidth="1.8"
                  >
                    <title>{`${reasonLabel(mk.reason)} · ${formatDate(mk.t)} · ${mk.score}/100`}</title>
                  </circle>
                </g>
              );
            })}
            <circle cx={geometry.nowX} cy={geometry.lastY} r="4.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
            <text x={padL} y={h - 6} textAnchor="start" className="trustchart__axis">
              {formatDate(geometry.tMin)}
            </text>
            <text x={w - padR} y={h - 6} textAnchor="end" className="trustchart__axis">
              Now
            </text>
          </svg>
          <div className="legend">
            <span className="legend__item"><i className="dot dot--accent" /> Global trust score</span>
            <span className="legend__item"><i className="dot dot--good" /> Trusted band (70+)</span>
            <span className="muted">
              {realChanges === 0 ? "Clean record — held at 100 since account creation." : `${realChanges} trust ${realChanges === 1 ? "change" : "changes"} on record`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
