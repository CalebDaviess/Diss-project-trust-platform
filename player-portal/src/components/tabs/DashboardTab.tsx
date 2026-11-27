import { useEffect, useState, type ReactNode } from "react";
import { listActivity, type ActivityItem, type ResultView } from "../../api/accountabilityApi";
import { deriveMetrics, trustTrend } from "../../features/metrics";
import { Sparkline, TrustGauge } from "../viz/charts";
import { TrustHistoryChart } from "../viz/TrustHistoryChart";
import { StatCard } from "../viz/StatCard";
import { GameLogo } from "../GameLogo";

interface DashboardTabProps {
  token: string;
  result: ResultView | null;
  loading: boolean;
  error: string | null;
  /** Jump to the Account tab for full detail when a reactive metric card is clicked. */
  onOpenAccount: () => void;
}

interface MetricCardProps {
  label: string;
  value: ReactNode;
  caption?: string;
  chart?: ReactNode;
  tone?: "accent" | "good" | "bad" | "warn";
}

function MetricCard({ label, value, caption, chart, tone = "accent" }: MetricCardProps) {
  return (
    <article className={`metric metric--${tone}`}>
      <div className="metric__head">
        <span className="metric__label">{label}</span>
      </div>
      <div className="metric__body">
        <span className="metric__value">{value}</span>
        {chart && <div className="metric__chart">{chart}</div>}
      </div>
      {caption && <span className="metric__caption muted">{caption}</span>}
    </article>
  );
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function DashboardTab({ token, result, loading, error, onOpenAccount }: DashboardTabProps) {
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listActivity(token)
      .then((items) => {
        if (!cancelled) setActivity(items);
      })
      .catch(() => {
        if (!cancelled) setActivity(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, result]);

  if (error) {
    return <p className="alert alert--error" role="alert">{error}</p>;
  }
  if (!result || loading) {
    return (
      <div className="panel panel--empty" aria-busy={loading}>
        <p className="muted">{loading ? "Loading your dashboard…" : "No data yet."}</p>
      </div>
    );
  }

  const m = deriveMetrics(result);
  const trend = trustTrend(m.trustScore);
  const recentActivity = (activity && activity.length > 0
    ? activity.slice(0, 6).map((a) => ({
        occurredAt: a.occurredAt,
        source: a.source,
        action: a.gameName ? `${a.action} · ${a.gameName}` : a.action,
        actor: a.actor,
      }))
    : [...result.auditTrail].reverse().slice(0, 6));

  return (
    <div className="dash">
      <section className="metric-row">
        <MetricCard
          label="Global trust score"
          value={m.trustScore}
          caption={`${m.verdict} · out of 100`}
          tone={m.trustScore >= 70 ? "good" : m.trustScore >= 40 ? "warn" : "bad"}
          chart={<Sparkline data={trend} tone={m.trustScore >= 70 ? "good" : m.trustScore >= 40 ? "warn" : "bad"} />}
        />
        <StatCard card="offences" label="Confirmed offences" value={m.confirmedOffences} onOpen={onOpenAccount} />
        <StatCard card="bans" label="Active bans" value={m.activeBans} onOpen={onOpenAccount} />
        <StatCard card="games" label="Linked games" value={m.linkedGames} onOpen={onOpenAccount} />
      </section>

      <section className="dash__grid">
        <article className="panel panel--hero">
          <div className="panel__head">
            <h2>Reliability</h2>
            <span className="chip">Always visible</span>
          </div>
          <div className="hero__gauge">
            <TrustGauge score={m.trustScore} verdict={m.verdict} />
          </div>
          <p className="muted hero__note">
            One reliability score that follows you across every linked game.
          </p>
        </article>

        <article className="panel panel--trend">
          <div className="panel__head">
            <h2>Trust over time</h2>
            <span className="chip chip--muted">Live</span>
          </div>
          <TrustHistoryChart token={token} refreshKey={m.trustScore} />
        </article>
      </section>

      <section className="dash__grid dash__grid--2to1">
        <article className="panel">
          <div className="panel__head">
            <h2>Seen in other games</h2>
            <span className="chip chip--muted">{result.crossGameSignals.length}</span>
          </div>
          {result.crossGameSignals.length === 0 ? (
            <p className="muted">No signals from other games. Your identity is clean elsewhere.</p>
          ) : (
            <ul className="xgame">
              {result.crossGameSignals.map((s, i) => (
                <li key={`${s.operatorId}-${s.gameId}-${i}`} className="xgame__item">
                  <GameLogo src={s.imageUrl} appId={s.gameId} name={s.gameName ?? s.gameId} provider={s.provider} width={64} />
                  <span className="xgame__game">
                    <strong>{s.gameName ?? s.gameId}</strong>
                    <span className="muted"> · {s.operatorId}</span>
                  </span>
                  <span className="xgame__meta">
                    <span className="pill">{s.confirmedOffenceCount} confirmed</span>
                    {s.hasActiveBan && <span className="pill pill--bad">Active ban</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <div className="panel__head">
            <h2>Recent activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="muted">No activity recorded yet.</p>
          ) : (
            <ul className="timeline">
              {recentActivity.map((a, i) => (
                <li key={`${a.occurredAt}-${i}`} className="timeline__item">
                  <span className={`timeline__dot timeline__dot--${a.source}`} aria-hidden="true" />
                  <div className="timeline__body">
                    <span className="timeline__action">{a.action}</span>
                    <span className="muted timeline__meta">
                      {a.actor} · {formatTimestamp(a.occurredAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
