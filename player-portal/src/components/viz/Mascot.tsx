import { useId } from "react";

export type MascotMood = "cheer" | "happy" | "neutral" | "sad";

interface MascotProps {
  mood?: MascotMood;
  size?: number;
  /** Golden glowing eyes for the "heaven" tier. */
  golden?: boolean;
  /** Extra class (e.g. a lounging tilt). */
  className?: string;
}

const MOUTHS: Record<MascotMood, string> = {
  cheer: "M33 59 Q48 80 63 59",
  happy: "M35 62 Q48 73 61 62",
  neutral: "M37 65 H59",
  sad: "M35 67 Q48 56 61 67",
};

/**
 * A friendly shield-faced mascot. Its mouth reflects the mood; eyes can turn golden for the
 * top "heaven" tier. Gentle bob animation via CSS (.mascot).
 */
export function Mascot({ mood = "happy", size = 72, golden = false, className = "" }: MascotProps) {
  const gid = useId();
  const pupil = golden ? "#f6c945" : "#1b1030";
  return (
    <div className={`mascot ${golden ? "mascot--golden" : ""} ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 96 104" role="img" aria-label="Mascot">
        <defs>
          <linearGradient id={`${gid}-body`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-3)" />
            <stop offset="55%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <path d="M48 4 L86 18 V50 C86 78 68 94 48 100 C28 94 10 78 10 50 V18 Z" fill={`url(#${gid}-body)`} />
        <path d="M48 4 L86 18 V50 C86 78 68 94 48 100 C28 94 10 78 10 50 V18 Z" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        {/* Eyes */}
        <circle cx="36" cy="46" r="5.5" fill="#fff" />
        <circle cx="60" cy="46" r="5.5" fill="#fff" />
        <circle cx={mood === "sad" ? 37 : 36} cy={mood === "sad" ? 48 : 47.5} r="2.6" fill={pupil} className={golden ? "mascot__pupil" : ""} />
        <circle cx={mood === "sad" ? 61 : 60} cy={mood === "sad" ? 48 : 47.5} r="2.6" fill={pupil} className={golden ? "mascot__pupil" : ""} />
        {/* Sad brows */}
        {mood === "sad" && (
          <g stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <path d="M30 38 L42 42" />
            <path d="M66 38 L54 42" />
          </g>
        )}
        {/* Mouth */}
        <path d={MOUTHS[mood]} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        {/* Cheer sparkles */}
        {mood === "cheer" && (
          <g fill="#fff">
            <path d="M20 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" opacity="0.9" />
            <path d="M78 30 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 z" opacity="0.8" />
          </g>
        )}
      </svg>
    </div>
  );
}
