import { useMemo } from "react";
import { Mascot } from "./Mascot";
import { Confetti } from "./Confetti";
import type { MascotState } from "../../features/mascotState";

const FOODS = ["🍗", "🥔", "🥕", "🍖", "🧀", "🍞", "🍅"];

/** Emoji "food rain" for the feast tier (same mechanics as Confetti). */
function FoodRain() {
  const bits = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        duration: 2 + Math.random() * 1.6,
        drift: (Math.random() - 0.5) * 120,
        rot: (Math.random() - 0.5) * 120,
        food: FOODS[i % FOODS.length],
        size: 14 + Math.random() * 10,
      })),
    [],
  );
  return (
    <div className="foodrain" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className="foodrain__bit"
          style={
            {
              left: `${b.left}%`,
              fontSize: `${b.size}px`,
              "--drift": `${b.drift}px`,
              "--rot": `${b.rot}deg`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            } as React.CSSProperties
          }
        >
          {b.food}
        </span>
      ))}
    </div>
  );
}

/** Flashing lightning bolts for the thunder scene. */
function Lightning() {
  return (
    <div className="lightning" aria-hidden="true">
      <svg viewBox="0 0 120 120" className="lightning__bolt lightning__bolt--a">
        <path d="M70 8 L40 60 H60 L48 112 L92 48 H68 Z" fill="#ffe14d" />
      </svg>
      <svg viewBox="0 0 120 120" className="lightning__bolt lightning__bolt--b">
        <path d="M40 10 L18 54 H34 L24 104 L60 44 H40 Z" fill="#fff3a0" />
      </svg>
    </div>
  );
}

/** Halo + rays for the heaven scene. */
function Halo() {
  return (
    <div className="halo" aria-hidden="true">
      <span className="halo__ring" />
      <span className="halo__rays" />
    </div>
  );
}

interface MascotSceneProps {
  state: MascotState;
  variant?: "compact" | "large";
  /** Show the sub line (modal only). */
  showSub?: boolean;
}

/**
 * Renders the mascot inside its value-driven scene (thunder / grass field / feast / heaven),
 * with the right effects (confetti, food rain, lightning, halo). Used on the stat cards (compact)
 * and in the detail modal (large).
 */
export function MascotScene({ state, variant = "compact", showSub = false }: MascotSceneProps) {
  const big = variant === "large";
  const mascotSize = big ? 112 : 42;
  return (
    <div className={`scene scene--${state.scene} scene--${variant}`}>
      {state.scene === "thunder" && <Lightning />}
      {state.scene === "feast" && <FoodRain />}
      {state.scene === "heaven" && <Halo />}
      {state.confetti && <Confetti pieces={big ? 70 : 24} />}
      <Mascot
        mood={state.mood}
        golden={state.golden}
        size={mascotSize}
        className={state.lounging ? "mascot--lounging" : ""}
      />
      <div className="scene__text">
        <span className={`scene__label scene__label--${state.tone}`}>{state.label}</span>
        {showSub && big && <span className="scene__sub">{state.sub}</span>}
      </div>
    </div>
  );
}
