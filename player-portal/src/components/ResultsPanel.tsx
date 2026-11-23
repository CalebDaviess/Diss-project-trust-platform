import type { OffenceSource, ResultView } from "../api/accountabilityApi";

interface ResultsPanelProps {
  result: ResultView | null;
  loading: boolean;
  error: string | null;
}

/** Coarse trust band used only for the visual accent + screen-reader hint. */
function trustBand(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** Plain-English reliability verdict shown to the player alongside the score. */
function verdictLabel(score: number): string {
  switch (trustBand(score)) {
    case "high":
      return "Trusted";
    case "medium":
      return "Caution";
    default:
      return "At risk";
  }
}

/** Human-readable label for a signal's detection source. */
function sourceLabel(source: OffenceSource): string {
  switch (source) {
    case "conductEngine":
      return "Conduct engine";
    case "antiCheat":
      return "Anti-cheat";
    case "operator":
      return "Operator";
    default:
      return source;
  }
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function ResultsPanel({ result, loading, error }: ResultsPanelProps) {
  // Product requirement: the global trust score must be visible AT ALL TIMES.
  // We render the score header whenever we have a result, independent of the
  // per-game record state below.
  const hasResult = result !== null;

  return (
    <section className="card results" aria-labelledby="results-heading" aria-busy={loading}>
      <h2 id="results-heading">Your reliability &amp; record</h2>

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="results__loading" role="status">
          Loading results…
        </p>
      )}

      {!hasResult && !loading && !error && (
        <p className="results__empty">
          Sign in to see your reliability across games, your record and your activity log.
        </p>
      )}

      {hasResult && (
        <>
          <div
            className={`trust-score trust-score--${trustBand(result.globalTrustScore)}`}
            aria-label={`Your reliability across all games: ${result.globalTrustScore} out of 100 (${verdictLabel(
              result.globalTrustScore,
            )})`}
          >
            <span className="trust-score__label">Global trust score</span>
            <span className="trust-score__value" data-testid="global-trust-score">
              {result.globalTrustScore}
              <span className="trust-score__max">/100</span>
            </span>
            <span
              className={`trust-score__verdict trust-score__verdict--${trustBand(
                result.globalTrustScore,
              )}`}
            >
              {verdictLabel(result.globalTrustScore)}
            </span>
            <span className="trust-score__hint">
              One reliability score that follows you across every linked game.
            </span>
          </div>

          <div className="results__connection">
            <h3>
              Record for game: <code>{result.gameConnectionId}</code>
            </h3>

            {result.conductScore === null ? (
              <p className="results__no-records" data-testid="no-records">
                No records for this game.
              </p>
            ) : (
              <p className="results__game-status">
                Harassment conduct score:{" "}
                <strong data-testid="conduct-score">{result.conductScore}</strong>
                {" · "}
                Status:{" "}
                <span className={`status-badge status-badge--${result.status ?? "none"}`}>
                  {result.status ?? "—"}
                </span>
              </p>
            )}
          </div>

          <CaseHistory result={result} formatTimestamp={formatTimestamp} />
          <AuditTrail result={result} formatTimestamp={formatTimestamp} />
          <CrossGameWarnings result={result} />
        </>
      )}
    </section>
  );
}

function CaseHistory({
  result,
  formatTimestamp,
}: {
  result: ResultView;
  formatTimestamp: (iso: string) => string;
}) {
  return (
    <div className="results__section">
      <h4>Your record</h4>
      {result.caseHistory.length === 0 ? (
        <p className="muted">No record for this game yet.</p>
      ) : (
        <table className="data-table" data-testid="case-history">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Offence</th>
              <th scope="col">Source</th>
              <th scope="col">Score</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.caseHistory.map((entry, index) => (
              <tr key={`${entry.timestamp}-${index}`}>
                <td>{formatTimestamp(entry.timestamp)}</td>
                <td>{entry.offenceType}</td>
                <td>
                  <span className={`source-badge source-badge--${entry.source}`}>
                    {sourceLabel(entry.source)}
                  </span>
                </td>
                <td>{entry.score}</td>
                <td>{entry.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AuditTrail({
  result,
  formatTimestamp,
}: {
  result: ResultView;
  formatTimestamp: (iso: string) => string;
}) {
  return (
    <div className="results__section">
      <h4>Activity log</h4>
      {result.auditTrail.length === 0 ? (
        <p className="muted">No activity recorded for this game yet.</p>
      ) : (
        <table className="data-table" data-testid="audit-trail">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Source</th>
              <th scope="col">Action</th>
              <th scope="col">Actor</th>
              <th scope="col">Detail</th>
            </tr>
          </thead>
          <tbody>
            {result.auditTrail.map((entry, index) => (
              <tr key={`${entry.occurredAt}-${index}`}>
                <td>{formatTimestamp(entry.occurredAt)}</td>
                <td>
                  <span className={`source-badge source-badge--${entry.source}`}>
                    {sourceLabel(entry.source)}
                  </span>
                </td>
                <td>{entry.action}</td>
                <td>{entry.actor}</td>
                <td>{entry.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CrossGameWarnings({ result }: { result: ResultView }) {
  if (result.crossGameSignals.length === 0) {
    return (
      <div className="results__section">
        <h4>Seen in other games</h4>
        <p className="muted">No signals from other games.</p>
      </div>
    );
  }

  return (
    <div className="results__section">
      <h4>Seen in other games</h4>
      <ul className="cross-game" data-testid="cross-game-warnings">
        {result.crossGameSignals.map((signal, index) => (
          <li
            key={`${signal.operatorId}-${signal.gameId}-${index}`}
            className={`cross-game__item${signal.hasActiveBan ? " cross-game__item--banned" : ""}`}
          >
            <span className="cross-game__game">
              <strong>{signal.gameId}</strong> <span className="muted">({signal.operatorId})</span>
            </span>
            <span className="cross-game__meta">
              Confirmed offences: {signal.confirmedOffenceCount}
              {signal.hasActiveBan && <span className="ban-flag"> · Active ban</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

