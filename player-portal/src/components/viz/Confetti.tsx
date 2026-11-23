import { useMemo } from "react";

const COLORS = ["#8b5cf6", "#22d3ee", "#e879f9", "#34d399", "#fbbf24", "#60a5fa"];

interface ConfettiProps {
  /** Number of confetti pieces. */
  pieces?: number;
}

/**
 * Lightweight, dependency-free confetti. Pieces are randomised once and animated with CSS
 * (see .confetti in App.css). Decorative only — hidden from assistive tech.
 */
export function Confetti({ pieces = 70 }: ConfettiProps) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 1.9 + Math.random() * 1.6,
        drift: (Math.random() - 0.5) * 180,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        w: 5 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        round: Math.random() > 0.65,
      })),
    [pieces],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti__bit"
          style={
            {
              left: `${b.left}%`,
              background: b.color,
              width: `${b.w}px`,
              height: `${b.h}px`,
              borderRadius: b.round ? "50%" : "2px",
              "--drift": `${b.drift}px`,
              "--rot": `${b.rotate}deg`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
