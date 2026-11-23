import { useMemo, useState } from "react";

/**
 * Age-appropriate access demo (frontend-only, "designed not built").
 *
 * Illustrates the platform's governance of age-restricted games: a player's
 * verified age decides whether an older/age-restricted game may let them in.
 * This is a privacy-preserving *concept* — the date of birth is evaluated
 * locally in the browser and never stored or sent anywhere. In the real
 * platform this check would be answered by a verified age-assurance signal
 * bound to the identity, not a raw date of birth.
 */

interface RatedGame {
  id: string;
  title: string;
  /** Minimum age permitted (e.g. PEGI rating). */
  minAge: number;
  rating: string;
}

const RATED_GAMES: RatedGame[] = [
  { id: "g-puzzle", title: "Puzzle Kingdom", minAge: 3, rating: "PEGI 3" },
  { id: "g-racer", title: "Turbo League", minAge: 7, rating: "PEGI 7" },
  { id: "g-arena", title: "Arena Clash", minAge: 12, rating: "PEGI 12" },
  { id: "g-ops", title: "Night Ops", minAge: 18, rating: "PEGI 18" },
];

function ageFrom(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function AgeGateDemo() {
  const [dob, setDob] = useState("");
  const [gameId, setGameId] = useState(RATED_GAMES[RATED_GAMES.length - 1].id);
  const [checked, setChecked] = useState(false);

  const game = RATED_GAMES.find((g) => g.id === gameId) ?? RATED_GAMES[0];
  const age = useMemo(() => ageFrom(dob), [dob]);
  const allowed = age !== null && age >= game.minAge;

  function handleCheck(event: React.FormEvent) {
    event.preventDefault();
    setChecked(true);
  }

  return (
    <form className="card age-gate" onSubmit={handleCheck} aria-labelledby="agegate-heading">
      <h2 id="agegate-heading">Age-appropriate access</h2>
      <p className="muted age-gate__intro">
        Check whether a player may enter an age-restricted game. Your date of birth is
        evaluated in your browser only — it is never stored or sent. Designed, not built.
      </p>

      <div className="field-grid">
        <label className="field">
          <span>Date of birth</span>
          <input
            type="date"
            value={dob}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              setDob(e.target.value);
              setChecked(false);
            }}
            required
          />
        </label>
        <label className="field">
          <span>Game</span>
          <select
            value={gameId}
            onChange={(e) => {
              setGameId(e.target.value);
              setChecked(false);
            }}
          >
            {RATED_GAMES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} ({g.rating})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn--primary">
          Check access
        </button>
      </div>

      <div className="age-gate__result" role="status" aria-live="polite">
        {checked && age !== null && (
          <p
            className={`age-gate__verdict age-gate__verdict--${allowed ? "allow" : "block"}`}
            data-testid="age-gate-verdict"
          >
            {allowed ? (
              <>
                <strong>Access allowed.</strong> Age {age} meets the {game.rating} minimum of{" "}
                {game.minAge}+ for <strong>{game.title}</strong>.
              </>
            ) : (
              <>
                <strong>Access blocked.</strong> Age {age} is under the {game.rating} minimum of{" "}
                {game.minAge}+ for <strong>{game.title}</strong>.
              </>
            )}
          </p>
        )}
      </div>
    </form>
  );
}

