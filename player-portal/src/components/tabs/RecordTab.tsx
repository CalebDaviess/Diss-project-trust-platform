import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  listActivity,
  listAppeals,
  listBans,
  listConnections,
  type ActivityItem,
  type AppealableSanction,
  type BanView,
  type ConnectionView,
} from "../../api/accountabilityApi";
import { activityKind, formatDateTime, sourceLabel } from "../../features/activity";
import { banExtent, banTypeLabel } from "../../features/bans";
import { GameLogo } from "../GameLogo";
import { AppealModal } from "../AppealModal";

interface RecordTabProps {
  token: string;
  /** Called after an appeal is submitted so other tabs (trust score) can refresh. */
  onChanged?: () => void;
}

/** My Record: a unified, cross-game activity feed with a game filter and inline appeal access. */
export function RecordTab({ token, onChanged }: RecordTabProps) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [appealable, setAppealable] = useState<AppealableSanction[]>([]);
  const [bans, setBans] = useState<BanView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState<string>("");
  const [appealSanction, setAppealSanction] = useState<AppealableSanction | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [act, conns, appeals, banList] = await Promise.all([
        listActivity(token),
        listConnections(token),
        listAppeals(token),
        listBans(token),
      ]);
      setActivity(act);
      setConnections(conns);
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

  const filtered = useMemo(
    () => (gameFilter ? activity.filter((a) => a.connectionId === gameFilter) : activity),
    [activity, gameFilter],
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
            <option value="">All games</option>
            {connections.map((c) => (
              <option key={c.connectionId} value={c.connectionId}>{c.gameName}</option>
            ))}
          </select>
        </label>
      </section>

      {error && <p className="alert alert--error" role="alert">{error}</p>}

      {visibleBans.length > 0 && (
        <section className="panel bans-banner">
          <div className="panel__head">
            <h2>Active bans</h2>
            <span className="chip chip--muted">{visibleBans.length}</span>
          </div>
          <ul className="appealable-list">
            {visibleBans.map((b) => (
              <li key={b.connectionId} className="appealable-item">
                <GameLogo src={b.imageUrl} appId={b.gameId} name={b.gameName ?? b.gameId} provider={b.provider} width={84} />
                <div className="appealable-item__body">
                  <span className="appealable-item__game">
                    {banTypeLabel(b.banType)} · {b.gameName ?? b.gameId}
                  </span>
                  <span className="muted">
                    {banExtent(b)}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </span>
                </div>
                <span className={`feed__badge feed__badge--${b.appealable ? "accent" : "bad"}`}>
                  {b.appealable ? "Appealable" : "Final · not appealable"}
                </span>
              </li>
            ))}
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
                    {s.offenceType ?? "offence"} · {s.source ? sourceLabel(s.source) : "detected"}
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
        {loading ? (
          <p className="muted">Loading your activity…</p>
        ) : filtered.length === 0 ? (
          <div className="record__empty">
            <span aria-hidden="true">🗒️</span>
            <p className="muted">No activity yet{gameFilter ? " for this game" : ""}. Reports, verdicts, bans and appeals will appear here.</p>
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
                    <span className="muted feed__meta">
                      <strong>{item.gameName ?? item.gameId}</strong> · {sourceLabel(item.source)} · {formatDateTime(item.occurredAt)}
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
            setAppealSanction(null);
            void reload();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
