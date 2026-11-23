/**
 * Best-effort 18+ / mature detection for the game catalogue. The public Steam search doesn't return
 * an age rating, so the prototype derives maturity from a curated set of well-known mature titles and
 * keywords. It is intentionally conservative: unknown titles are treated as non-mature. In a real
 * deployment this would come from the operator's official age rating (PEGI/ESRB) at connect time.
 */

const MATURE_TITLES = [
  "grand theft auto",
  "gta",
  "call of duty",
  "cyberpunk 2077",
  "mortal kombat",
  "doom",
  "the witcher 3",
  "red dead redemption",
  "resident evil",
  "god of war",
  "the last of us",
  "dying light",
  "dead by daylight",
  "mafia",
  "far cry",
  "hitman",
  "manhunt",
  "postal",
  "saints row",
  "sniper elite",
  "wolfenstein",
  "dead space",
  "left 4 dead",
  "counter-strike",
  "rust",
  "scum",
  "warhammer 40",
  "elden ring",
  "dark souls",
  "sekiro",
  "diablo iv",
  "diablo 4",
  "valorant",
];

/** True when a catalogue title is (best-effort) rated 18+ / mature. */
export function isMatureGame(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return MATURE_TITLES.some((t) => n.includes(t));
}
