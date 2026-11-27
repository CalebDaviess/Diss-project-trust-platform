import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  listActivity,
  listAppeals,
  listBans,
  type ActivityItem,
  type AppealableSanction,
  type BanView,
  type ConnectionView,
} from "../../api/accountabilityApi";
import {
  activityCategory,
  activityKind,
  formatDateTime,
  formatRelativeTime,
  offenceLabel,
  sourceLabel,
  type ActivityCategory,
} from "../../features/activity";
import { banExtent, banStatusMeta, banTypeLabel } from "../../features/bans";
import type { TabKey } from "../AppShell";
import { GameLogo } from "../GameLogo";
import { AppealModal } from "../AppealModal";

interface RecordTabProps {
  token: string;
  connections: ConnectionView[];
  initialGameFilter?: string;
  /** Called after an appeal is submitted so other tabs (trust score) can refresh. */
  onChanged?: () => void;
  onNavigate?: (tab: TabKey) => void;
}

const CATEGORIES: Array<{ id: ActivityCategory; label: string }> = [
  { id: "all", label: "All events" },
  { id: "report", label: "Reports" },
  { id: "anticheat", label: "Anti-cheat" },
  { id: "ban", label: "Bans" },
  { id: "appeal", label: "Appeals" },
];

/** My Record: a unified, cross-game activity feed with game + category filters and inline appeal access. */
export function RecordTab({ token, connections, initialGameFilter = "", onChanged, onNavigate }: RecordTabProps) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [appealable, setAppealable] = useState<AppealableSanction[]>([]);
  const [bans, setBans] = useState<BanView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState<string>(initialGameFilter);
  const [category, setCategory] = useState<ActivityCategory>("all");
  const [appealSanction, setAppealSanction] = useState<AppealableSanction | null>(null);

  useEffect(() => {
    setGameFilter(initialGameFilter);
  }, [initialGameFilter]);

  useEffect(() => {
    if (gameFilter && !connections.some((c) => c.connectionId === gameFilter)) {
      setGameFilter("");
    }
  }, [connections, gameFilter]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [act, appeals, banList] = await Promise.all([
        listActivity(token),
        listAppeals(token),
        listBans(token),
      ]);
      setActivity(act);
      setAppealable(appeals.appealable);
      setBans(banList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your record.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const gameScoped = useMemo(
    () => (gameFilter ? activity.filter((a) => a.connectionId === gameFilter) : activity),
    [activity, gameFilter],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<ActivityCategory, number> = {
      all: gameScoped.length,
      report: 0,
      anticheat: 0,
      ban: 0,
      appeal: 0,
    };
    for (const item of gameScoped) {
      counts[activityCategory(item)] += 1;
    }
    return counts;
  }, [gameScoped]);

  const filtered = useMemo(
    () => (category === "all" ? gameScoped : gameScoped.filter((a) => activityCategory(a) === category)),
    [gameScoped, category],
  );

  const visibleAppealable = gameFilter
    ? appealable.filter((s) => s.connectionId === gameFilter)
    : appealable;
  const visibleBans = gameFilter ? bans.filter((b) => b.connectionId === gameFilter) : bans;

  return (
    <div className="record">
      <section className="panel record__controls">
        <div>
          <h2>Activity across your games</h2>
          <p className="muted">Reports, anti-cheat verdicts, bans and appeals on your account — newest first.</p>
        </div>
        <label className="field record__filter">
          <span>Filter by game</span>
          <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)}>
            <option value="">All games ({connections.length})</option>
            {connections.map((c) => (
              <option key={c.connectionId} value={c.connectionId}>{c.gameName}</option>
            ))}
          </select>
        </label>
      </section>

      {error && <p className="alert alert--error" role="alert">{error}</p>}
      {notice && (
        <div className="alert alert--info alert--row" role="status">
          <span>{notice}</span>
          <div className="alert__actions">
            {onNavigate && (
              <button type="button" className="linkbtn" onClick={() => onNavigate("appeals")}>
                Track in Appeals →
              </button>
            )}
            <button type="button" className="alert__dismiss" aria-label="Dismiss notice" onClick={() => setNotice(null)}>
              ×
            </button>
          </div>
        </div>
      )}

      {visibleBans.length > 0 && (
        <section className="panel bans-banner">
          <div className="panel__head">
            <h2>Active bans</h2>
            <span className="chip chip--muted">{visibleBans.length}</span>
          </div>
          <ul className="appealable-list">
            {visibleBans.map((b) => {
              const status = banStatusMeta(b);
              return (
                <li key={b.connectionId} className="appealable-item">
                  <GameLogo src={b.imageUrl} appId={b.gameId} name={b.gameName ?? b.gameId} provider={b.provider} width={84} />
                  <div className="appealable-item__body">
                    <span className="appealable-item__game">
                      {banTypeLabel(b.banType)} · {b.gameName ?? b.gameId}
                    </span>
                    <span className="muted">
                      {banExtent(b)} · {status.detail}
                      {b.reason ? ` · ${b.reason}` : ""}
                    </span>
                  </div>
                  <span className={`feed__badge feed__badge--${status.tone}`}>
                    {status.badge}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {visibleAppealable.length > 0 && (
        <section className="panel appealable-banner">
          <div className="panel__head">
            <h2>Open to appeal</h2>
            <span className="chip chip--muted">{visibleAppealable.length}</span>
          </div>
          <ul className="appealable-list">
            {visibleAppealable.map((s) => (
              <li key={s.connectionId} className="appealable-item">
                <GameLogo src={s.imageUrl} appId={s.gameId} name={s.gameName ?? s.gameId} provider={s.provider} width={84} />
                <div className="appealable-item__body">
                  <span className="appealable-item__game">{s.gameName ?? s.gameId}</span>
                  <span className="muted">
                    {offenceLabel(s.offenceType)} · {s.source ? sourceLabel(s.source) : "Detected"}
                  </span>
                </div>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setAppealSanction(s)}>
                  Appeal
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <div className="panel__head">
          <h2>{gameFilter ? "Game activity" : "Recent activity"}</h2>
          <span className="chip chip--muted">{filtered.length}</span>
        </div>

        <div className="filterchips" role="group" aria-label="Filter activity by type">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`filterchip ${category === c.id ? "is-active" : ""}`}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              <span>{c.label}</span>
              <span className="filterchip__count">{categoryCounts[c.id]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="skeleton-stack" aria-busy="true" aria-label="Loading activity">
            <div className="skeleton skeleton--row" />
            <div className="skeleton skeleton--row" />
            <div className="skeleton skeleton--row" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="record__empty">
            <span aria-hidden="true">🗒️</span>
            <p className="muted">
              {category !== "all"
                ? `No ${CATEGORIES.find((c) => c.id === category)?.label.toLowerCase()} events yet${gameFilter ? " for this game" : ""}.`
                : `No activity yet${gameFilter ? " for this game" : ""}. Reports, verdicts, bans and appeals will appear here.`}
            </p>
            {category !== "all" ? (
              <button type="button" className="linkbtn" onClick={() => setCategory("all")}>
                Show all events
              </button>
            ) : connections.length === 0 && onNavigate ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => onNavigate("games")}>
                Link your first game
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="feed">
            {filtered.map((item, i) => {
              const kind = activityKind(item);
              return (
                <li key={`${item.connectionId}-${item.occurredAt}-${i}`} className="feed__item">
                  <GameLogo src={item.imageUrl} appId={item.gameId} name={item.gameName ?? item.gameId} provider={item.provider} width={72} />
                  <div className="feed__body">
                    <span className="feed__headline">
                      {kind.label}
                      <span className={`feed__badge feed__badge--${kind.tone}`}>{kind.badge}</span>
                    </span>
                    <span className="muted feed__meta" title={formatDateTime(item.occurredAt)}>
                      <strong>{item.gameName ?? item.gameId}</strong> · {sourceLabel(item.source)} · {formatRelativeTime(item.occurredAt)}
                    </span>
                    {item.detail && <span className="muted feed__detail">{item.detail}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {appealSanction && (
        <AppealModal
          token={token}
          sanction={appealSanction}
          onClose={() => setAppealSanction(null)}
          onSubmitted={() => {
            const gameLabel = appealSanction.gameName ?? appealSanction.gameId;
            setAppealSanction(null);
            setNotice(`Appeal submitted for ${gameLabel} — now under studio review.`);
            void reload();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
