import { useId } from "react";

/* Hand-built, dependency-free SVG visuals. Each is responsive (viewBox + width:100%)
 * and themed entirely through CSS variables, so they re-skin with the light/dark toggle. */

/** Coarse trust band → semantic colour var. Shared by the gauge and score chips. */
export function trustBandColor(score: number): string {
  if (score >= 70) return "var(--good)";
  if (score >= 40) return "var(--warn)";
  return "var(--bad)";
}

/** Catmull-Rom → cubic-bezier smoothing for a set of [x,y] points. */
function smoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

interface TrustGaugeProps {
  /** 0..100 */
  score: number;
  /** Plain-English verdict shown under the number. */
  verdict?: string;
  size?: number;
}

/** Semicircular trust-score gauge with a glowing progress arc and centred value. */
export function TrustGauge({ score, verdict, size = 230 }: TrustGaugeProps) {
  const gid = useId();
  const clamped = Math.max(0, Math.min(100, score));
  const w = size;
  const h = size * 0.62;
  const stroke = size * 0.1;
  const r = (w - stroke) / 2;
  const cx = w / 2;
  const cy = h - stroke / 2;
  const semi = Math.PI * r;
  const offset = semi * (1 - clamped / 100);
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const color = trustBandColor(clamped);

  return (
    <div className="gauge" style={{ maxWidth: w }}>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Trust score ${clamped} out of 100`}>
        <defs>
          <linearGradient id={`${gid}-g`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-3)" />
            <stop offset="55%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <path d={arc} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          className="gauge__arc"
          d={arc}
          fill="none"
          stroke={`url(#${gid}-g)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={semi}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="gauge__center">
        <span className="gauge__value" style={{ color }}>
          {clamped}
        </span>
        <span className="gauge__max">/ 100</span>
        {verdict && (
          <span className="gauge__verdict" style={{ color }}>
            {verdict}
          </span>
        )}
      </div>
    </div>
  );
}

interface AreaChartProps {
  data: number[];
  height?: number;
  labels?: string[];
  highlightLast?: boolean;
}

/** Smooth gradient area chart. Values are normalised to their own min/max range. */
export function AreaChart({ data, height = 180, labels, highlightLast = true }: AreaChartProps) {
  const gid = useId();
  const w = 640;
  const h = height;
  const padX = 12;
  const padY = 16;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const stepX = (w - padX * 2) / Math.max(data.length - 1, 1);
  const points: Array<[number, number]> = data.map((v, i) => [
    padX + i * stepX,
    padY + (1 - (v - min) / span) * (h - padY * 2),
  ]);
  const line = smoothPath(points);
  const area = `${line} L ${points[points.length - 1][0]} ${h} L ${points[0][0]} ${h} Z`;
  const last = points[points.length - 1];

  return (
    <div className="areachart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${gid}-stroke`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-3)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid}-fill)`} />
        <path d={line} fill="none" stroke={`url(#${gid}-stroke)`} strokeWidth="3" vectorEffect="non-scaling-stroke" />
        {highlightLast && (
          <circle cx={last[0]} cy={last[1]} r="4.5" fill="var(--accent-2)" stroke="var(--surface)" strokeWidth="2" />
        )}
      </svg>
      {labels && (
        <div className="areachart__labels">
          {labels.map((l, i) => (
            <span key={`${l}-${i}`}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

interface SparklineProps {
  data: number[];
  variant?: "line" | "bar";
  tone?: "accent" | "good" | "bad" | "warn";
}

const TONE_VAR: Record<NonNullable<SparklineProps["tone"]>, string> = {
  accent: "var(--accent)",
  good: "var(--good)",
  bad: "var(--bad)",
  warn: "var(--warn)",
};

/** Tiny inline trend for metric cards. */
export function Sparkline({ data, variant = "line", tone = "accent" }: SparklineProps) {
  const w = 120;
  const h = 40;
  const color = TONE_VAR[tone];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;

  if (variant === "bar") {
    const gap = 3;
    const barW = (w - gap * (data.length - 1)) / data.length;
    return (
      <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        {data.map((v, i) => {
          const bh = ((v - min) / span) * (h - 4) + 4;
          return (
            <rect
              key={i}
              x={i * (barW + gap)}
              y={h - bh}
              width={barW}
              height={bh}
              rx={Math.min(barW / 2, 2)}
              fill={color}
              opacity={0.45 + 0.55 * ((v - min) / span)}
            />
          );
        })}
      </svg>
    );
  }

  const stepX = w / Math.max(data.length - 1, 1);
  const points: Array<[number, number]> = data.map((v, i) => [
    i * stepX,
    (1 - (v - min) / span) * (h - 6) + 3,
  ]);
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={smoothPath(points)} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface DonutStatProps {
  value: number;
  max: number;
  /** Colour var, defaults to accent. */
  color?: string;
  size?: number;
  caption?: string;
}

/** Ring progress for a value/max fraction (e.g. games with a clean record). */
export function DonutStat({ value, max, color = "var(--accent)", size = 76, caption }: DonutStatProps) {
  const gid = useId();
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const frac = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <div className="donut" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={caption ?? `${value} of ${max}`}>
        <defs>
          <linearGradient id={`${gid}-d`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid}-d)`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="donut__text">
          {value}
        </text>
      </svg>
    </div>
  );
}

interface BarMeterProps {
  /** 0..1 */
  value: number;
  tone?: "accent" | "good" | "bad" | "warn";
}

/** Segmented strength meter (5 pips) like a threat-level indicator. */
export function BarMeter({ value, tone = "accent" }: BarMeterProps) {
  const pips = 5;
  const active = Math.round(Math.max(0, Math.min(1, value)) * pips);
  const color = TONE_VAR[tone];
  return (
    <span className="barmeter" role="img" aria-label={`${active} of ${pips}`}>
      {Array.from({ length: pips }).map((_, i) => (
        <span
          key={i}
          className="barmeter__pip"
          style={{ background: i < active ? color : "var(--surface-3)" }}
        />
      ))}
    </span>
  );
}
