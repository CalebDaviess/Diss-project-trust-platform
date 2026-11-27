import { useEffect, useState, type ReactNode } from "react";
import { listActivity, type ActivityItem, type ResultView } from "../../api/accountabilityApi";
import { activityKind, formatDateTime, formatRelativeTime, sourceLabel } from "../../features/activity";
import { deriveMetrics, trustTrend } from "../../features/metrics";
import type { StatCardKey } from "../../features/mascotState";
import type { TabKey } from "../AppShell";
import { Sparkline, TrustGauge } from "../viz/charts";
import { TrustHistoryChart } from "../viz/TrustHistoryChart";
import { StatCard } from "../viz/StatCard";
import { GameLogo } from "../GameLogo";

interface DashboardTabProps {
  token: string;
  result: ResultView | null;
  appealableCount?: number;
  loading: boolean;
  error: string | null;
  onNavigate: (tab: TabKey, opts?: { accountCard?: StatCardKey; gameFilter?: string }) => void;
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

export function DashboardTab({
  token,
  result,
  appealableCount = 0,
  loading,
  error,
  onNavigate,
}: DashboardTabProps) {
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
      <div className="dash" aria-busy="true" aria-label="Loading your dashboard">
        <section className="metric-row">
          <div className="skeleton skeleton--metric" />
          <div className="skeleton skeleton--metric" />
          <div className="skeleton skeleton--metric" />
          <div className="skeleton skeleton--metric" />
        </section>
        <section className="dash__grid">
          <div className="skeleton skeleton--panel" />
          <div className="skeleton skeleton--panel" />
        </section>
      </div>
    );
  }

  const m = deriveMetrics(result);
  const trend = trustTrend(m.trustScore);
  const recentActivity = (
    activity && activity.length > 0
      ? activity.slice(0, 6).map((a) => ({
          occurredAt: a.occurredAt,
          source: a.source,
          action: a.action,
          gameName: a.gameName ?? a.gameId ?? null,
          actor: a.actor,
        }))
      : [...result.auditTrail].reverse().slice(0, 6).map((a) => ({
          occurredAt: a.occurredAt,
          source: a.source,
          action: a.action,
          gameName: result.gameName ?? null,
          actor: a.actor,
        }))
  );

  return (
    <div className="dash">
      {appealableCount > 0 && (
        <section className="actionbar" role="status">
          <div className="actionbar__body">
            <span className="feed__badge feed__badge--warn">Action available</span>
            <span>
              You have <strong>{appealableCount}</strong> confirmed {appealableCount === 1 ? "sanction" : "sanctions"} open to appeal.
            </span>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => onNavigate("appeals")}
          >
            Review &amp; appeal →
          </button>
        </section>
      )}

      <section className="metric-row">
        <MetricCard
          label="Global trust score"
          value={m.trustScore}
          caption={`${m.verdict} · out of 100`}
          tone={m.trustScore >= 70 ? "good" : m.trustScore >= 40 ? "warn" : "bad"}
          chart={<Sparkline data={trend} tone={m.trustScore >= 70 ? "good" : m.trustScore >= 40 ? "warn" : "bad"} />}
        />
        <StatCard
          card="offences"
          label="Confirmed offences"
          value={m.confirmedOffences}
          onOpen={() => onNavigate("account", { accountCard: "offences" })}
        />
        <StatCard
          card="bans"
          label="Active bans"
          value={m.activeBans}
          onOpen={() => onNavigate("account", { accountCard: "bans" })}
        />
        <StatCard
          card="games"
          label="Linked games"
          value={m.linkedGames}
          onOpen={() => onNavigate("games")}
        />
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
            <div className="panel__head-right">
              <span className="chip chip--muted">{result.crossGameSignals.length}</span>
              <button type="button" className="linkbtn panel__link" onClick={() => onNavigate("games")}>
                Manage games →
              </button>
            </div>
          </div>
          {result.crossGameSignals.length === 0 ? (
            <div className="goodstate">
              <span className="goodstate__icon" aria-hidden="true">✓</span>
              <p className="muted">No signals from other games. Your identity is clean elsewhere.</p>
            </div>
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
            <button type="button" className="linkbtn panel__link" onClick={() => onNavigate("record")}>
              Full record →
            </button>
          </div>
          {recentActivity.length === 0 ? (
            <p className="muted">No activity recorded yet.</p>
          ) : (
            <ul className="timeline">
              {recentActivity.map((a, i) => {
                const kind = activityKind({ source: a.source, action: a.action });
                return (
                  <li key={`${a.occurredAt}-${i}`} className="timeline__item">
                    <span className={`timeline__dot timeline__dot--${a.source}`} aria-hidden="true" />
                    <div className="timeline__body">
                      <span className="timeline__headline">
                        <span className="timeline__action">{kind.label}</span>
                        <span className={`feed__badge feed__badge--${kind.tone}`}>{kind.badge}</span>
                      </span>
                      <span className="muted timeline__meta" title={formatDateTime(a.occurredAt)}>
                        {a.gameName ? <><strong>{a.gameName}</strong> · </> : null}
                        {sourceLabel(a.source)} · {formatRelativeTime(a.occurredAt)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
