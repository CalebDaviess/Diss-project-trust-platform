import { MascotScene } from "./MascotScene";
import { mascotStateFor, type StatCardKey } from "../../features/mascotState";

interface StatCardProps {
  card: StatCardKey;
  label: string;
  value: number;
  onOpen: () => void;
}

/**
 * A metric card whose mascot reacts to the value: mood, scene (thunder / grass / feast / heaven)
 * and effects all change with the number (see mascotStateFor). The whole card opens a detail view.
 */
export function StatCard({ card, label, value, onOpen }: StatCardProps) {
  const state = mascotStateFor(card, value);
  const valueClass = state.tone === "bad" ? "is-bad" : state.tone === "good" ? "is-good" : "";

  return (
    <button
      type="button"
      className={`statcard statcard--clickable statcard--scene-${state.scene}`}
      onClick={onOpen}
      aria-label={`${label}: ${value}. ${state.label}. View details.`}
    >
      <div className="statcard__head">
        <span>{label}</span>
        <span className="statcard__expand" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <span className={`statcard__value ${valueClass}`}>{value}</span>

      <MascotScene state={state} variant="compact" />
    </button>
  );
}
