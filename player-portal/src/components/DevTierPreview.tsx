import type { StatCardKey } from "../features/mascotState";

export type PreviewValues = Record<StatCardKey, number>;

interface DevTierPreviewProps {
  value: PreviewValues | null;
  realValues: PreviewValues;
  onChange: (next: PreviewValues | null) => void;
  score: number | null;
  onScoreChange: (next: number | null) => void;
}

const CHIPS: Record<StatCardKey, Array<{ label: string; v: number }>> = {
  games: [
    { label: "Storm · 0", v: 0 },
    { label: "Happy · 3", v: 3 },
    { label: "Confetti · 7", v: 7 },
    { label: "Field · 14", v: 14 },
    { label: "Feast · 24", v: 24 },
    { label: "Heaven · 30", v: 30 },
  ],
  offences: [
    { label: "Clear · 0", v: 0 },
    { label: "Few · 3", v: 3 },
    { label: "Storm · 8", v: 8 },
  ],
  open: [
    { label: "Clear · 0", v: 0 },
    { label: "Few · 3", v: 3 },
    { label: "Storm · 8", v: 8 },
  ],
  bans: [
    { label: "Good · 0", v: 0 },
    { label: "Sad · 3", v: 3 },
    { label: "Storm · 8", v: 8 },
  ],
};

const ROW_LABELS: Record<StatCardKey, string> = {
  games: "Linked games",
  offences: "Confirmed offences",
  open: "Open cases",
  bans: "Active bans",
};

/**
 * Dev-only control to preview every mascot tier without needing real data. The parent should only
 * render this when `import.meta.env.DEV` is true, so it is tree-shaken out of production builds.
 */
const SCORE_CHIPS = [
  { label: "Pole · 100", v: 100 },
  { label: "Cruising · 82", v: 82 },
  { label: "Caution · 55", v: 55 },
  { label: "Pit · 22", v: 22 },
];

export function DevTierPreview({ value, realValues, onChange, score, onScoreChange }: DevTierPreviewProps) {
  if (value === null) {
    return (
      <button type="button" className="devpreview__open" onClick={() => onChange({ ...realValues })}>
        ▶ Preview mascot tiers (dev)
      </button>
    );
  }

  const set = (card: StatCardKey, v: number) => onChange({ ...value, [card]: v });

  return (
    <section className="devpreview" aria-label="Developer tier preview">
      <div className="devpreview__head">
        <span className="devpreview__title">Mascot &amp; reliability preview <span className="devpreview__tag">dev only</span></span>
        <button type="button" className="linkbtn" onClick={() => onChange(null)}>✕ Exit preview (live data)</button>
      </div>
      <div className="devpreview__row">
        <span className="devpreview__rowlabel">Trust score (gauge)</span>
        <div className="devpreview__chips">
          <button
            type="button"
            className={`devpreview__chip ${score === null ? "is-active" : ""}`}
            onClick={() => onScoreChange(null)}
          >
            Live
          </button>
          {SCORE_CHIPS.map((chip) => (
            <button
              key={chip.v}
              type="button"
              className={`devpreview__chip ${score === chip.v ? "is-active" : ""}`}
              onClick={() => onScoreChange(chip.v)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
      {(Object.keys(CHIPS) as StatCardKey[]).map((card) => (
        <div key={card} className="devpreview__row">
          <span className="devpreview__rowlabel">{ROW_LABELS[card]}</span>
          <div className="devpreview__chips">
            {CHIPS[card].map((chip) => (
              <button
                key={chip.v}
                type="button"
                className={`devpreview__chip ${value[card] === chip.v ? "is-active" : ""}`}
                onClick={() => set(card, chip.v)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
