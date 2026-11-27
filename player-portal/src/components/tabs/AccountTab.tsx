import { useEffect, useState, type ReactNode } from "react";
import {
  ApiError,
  getResult,
  listBans,
  type BanView,
  type CaseView,
  type ConnectionView,
  type OffenceSource,
  type ProfileView,
  type ResultView,
} from "../../api/accountabilityApi";
import { offenceLabel } from "../../features/activity";
import { deriveMetrics, trustTrend, verdictLabel } from "../../features/metrics";
import { mascotStateFor, type StatCardKey } from "../../features/mascotState";
import { banExtent, banTypeLabel } from "../../features/bans";
import { DEMO_CONTROLS_ENABLED } from "../../features/demo";
import type { TabKey } from "../AppShell";
import { Sparkline, TrustGauge } from "../viz/charts";
import { TrustHistoryChart } from "../viz/TrustHistoryChart";
import { StatCard } from "../viz/StatCard";
import { MascotScene } from "../viz/MascotScene";
import { StatDetailDialog } from "../StatDetailDialog";
import { DevTierPreview, type PreviewValues } from "../DevTierPreview";
import { GameLogo } from "../GameLogo";

interface AccountTabProps {
  token: string;
  result: ResultView | null;
  connections: ConnectionView[];
  profile?: ProfileView | null;
  loading: boolean;
  error: string | null;
  signedInAs: string;
  initialCard?: StatCardKey | null;
  onClearInitialCard?: () => void;
  onNavigate?: (tab: TabKey) => void;
  onComeOfAge?: () => Promise<void> | void;
}

type Tone = "accent" | "good" | "bad" | "warn";

interface DetailLogo {
  src?: string | null;
  appId?: string;
  provider?: string | null;
  name: string;
}

interface DetailItem {
  id: string;
  tone?: Tone;
  logo?: DetailLogo;
  title: ReactNode;
  meta?: ReactNode;
  tag?: string;
}

const CARD_TITLES: Record<StatCardKey, { title: string; subtitle: string }> = {
  offences: { title: "Confirmed offences", subtitle: "Confirmed cases across your linked games" },
  open: { title: "Open cases", subtitle: "Cases still pending or under appeal" },
  games: { title: "Linked games", subtitle: "Games seen under your single identity" },
  bans: { title: "Active bans", subtitle: "Bans currently in force from other operators" },
};

function displayName(email: string): string {
  const handle = email.split("@")[0] ?? email;
  return (
    handle
      .split(/[._-]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ") || email
  );
}

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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

interface AnnotatedCase extends CaseView {
  connectionId: string;
  gameId?: string;
  gameName: string;
  gameImageUrl?: string | null;
  gameProvider?: string | null;
  recordStatus: ResultView["status"];
}

/** Build the drill-in list for a given card from the current result + fetched games/bans/cases. */
function itemsFor(
  card: StatCardKey,
  result: ResultView,
  connections: ConnectionView[],
  bans: BanView[],
  allCases: AnnotatedCase[],
): DetailItem[] {
  const bannedConnectionIds = new Set(bans.map((b) => b.connectionId));

  switch (card) {
    case "offences": {
      if (allCases.length > 0) {
        return allCases
          .filter((c) => c.recordStatus !== "overturned" && c.status.toLowerCase() === "confirmed")
          .map((c, i) => ({
            id: `case-off-${c.connectionId}-${i}`,
            tone: "bad" as Tone,
            logo: { src: c.gameImageUrl, appId: c.gameId, provider: c.gameProvider, name: c.gameName },
            title: <><strong>{c.gameName}</strong> — {offenceLabel(c.offenceType)}</>,
            meta: `${sourceLabel(c.source)} · ${formatDate(c.timestamp)}${c.recordStatus === "appealed" ? " · appeal under review" : ""}`,
            tag: c.recordStatus === "appealed" ? "appealed" : `score ${c.score}`,
          }));
      }
      const thisGame: DetailLogo = {
        src: result.gameImageUrl,
        provider: result.gameProvider,
        name: result.gameName ?? result.gameConnectionId,
      };
      const underAppeal = result.status === "appealed";
      const overturned = result.status === "overturned";
      const local: DetailItem[] = overturned
        ? []
        : result.caseHistory
            .filter((c) => c.status.toLowerCase() === "confirmed")
            .map((c, i) => ({
              id: `local-${i}`,
              tone: "bad" as Tone,
              logo: thisGame,
              title: <><strong>{thisGame.name}</strong> — {offenceLabel(c.offenceType)}</>,
              meta: `${sourceLabel(c.source)} · ${formatDate(c.timestamp)}${underAppeal ? " · appeal under review" : ""}`,
              tag: underAppeal ? "appealed" : `score ${c.score}`,
            }));
      const cross: DetailItem[] = result.crossGameSignals
        .filter((s) => s.confirmedOffenceCount > 0)
        .map((s, i) => ({
          id: `cross-${i}`,
          tone: "bad" as Tone,
          logo: { src: s.imageUrl, appId: s.gameId, provider: s.provider, name: s.gameName ?? s.gameId },
          title: <><strong>{s.gameName ?? s.gameId}</strong> — {s.confirmedOffenceCount} confirmed offence{s.confirmedOffenceCount === 1 ? "" : "s"}</>,
          meta: `Operator ${s.operatorId}`,
          tag: s.recordStatus === "appealed" ? "appealed" : undefined,
        }));
      return [...local, ...cross];
    }
    case "open": {
      const openSource: AnnotatedCase[] =
        allCases.length > 0
          ? allCases
          : result.caseHistory.map((c) => ({
              ...c,
              connectionId: result.gameConnectionId,
              gameName: result.gameName ?? result.gameConnectionId,
              gameImageUrl: result.gameImageUrl,
              gameProvider: result.gameProvider,
              recordStatus: result.status,
            }));
      return openSource
        .filter((c) => ["pending", "appealed"].includes(c.status.toLowerCase()) || c.recordStatus === "appealed")
        .map((c, i) => ({
          id: `open-${c.connectionId}-${i}`,
          tone: c.status.toLowerCase() === "appealed" || c.recordStatus === "appealed" ? "accent" : "warn",
          logo: { src: c.gameImageUrl, appId: c.gameId, provider: c.gameProvider, name: c.gameName },
          title: <><strong>{c.gameName}</strong> — {offenceLabel(c.offenceType)}</>,
          meta: `${sourceLabel(c.source)} · ${formatDate(c.timestamp)}`,
          tag: c.recordStatus === "appealed" ? "appealed" : c.status,
        }));
    }
    case "games": {
      return connections.map((c, i) => ({
        id: `game-${i}`,
        tone: bannedConnectionIds.has(c.connectionId) ? "bad" : "accent",
        logo: { src: c.imageUrl, appId: c.gameId, provider: c.provider, name: c.gameName },
        title: <strong>{c.gameName}</strong>,
        meta: `${c.provider ?? c.operatorId}${c.linkedAt ? ` · linked ${formatDate(c.linkedAt)}` : ""}`,
        tag: bannedConnectionIds.has(c.connectionId) ? "banned" : undefined,
      }));
    }
    case "bans":
      return bans.map((b, i) => ({
        id: `ban-${i}`,
        tone: b.banType === "permanent" ? "bad" : "warn",
        logo: { src: b.imageUrl, appId: b.gameId, provider: b.provider, name: b.gameName ?? b.gameId },
        title: <><strong>{b.gameName ?? b.gameId}</strong> — {banTypeLabel(b.banType)}</>,
        meta: (
          <>
            {banExtent(b)}
            {b.reason ? ` · ${b.reason}` : ""}
          </>
        ),
        tag: b.appealable ? "appealable" : "final",
      }));
  }
}

export function AccountTab({
  token,
  result,
  connections,
  profile,
  loading,
  error,
  signedInAs,
  initialCard = null,
  onClearInitialCard,
  onNavigate,
  onComeOfAge,
}: AccountTabProps) {
  const [openCard, setOpenCard] = useState<StatCardKey | null>(initialCard);
  const [preview, setPreview] = useState<PreviewValues | null>(null);
  const [scorePreview, setScorePreview] = useState<number | null>(null);
  const [comingOfAge, setComingOfAge] = useState(false);
  const [comeOfAgeError, setComeOfAgeError] = useState<string | null>(null);
  const [bans, setBans] = useState<BanView[]>([]);
  const [bansLoaded, setBansLoaded] = useState(false);
  const [allCases, setAllCases] = useState<AnnotatedCase[]>([]);

  useEffect(() => {
    if (initialCard) {
      setOpenCard(initialCard);
      onClearInitialCard?.();
    }
  }, [initialCard, onClearInitialCard]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [banList, perGameResults] = await Promise.all([
          listBans(token),
          Promise.all(connections.map((c) => getResult(token, c.connectionId).catch(() => null))),
        ]);
        const mergedCases: AnnotatedCase[] = [];
        perGameResults.forEach((res, idx) => {
          if (!res) return;
          const conn = connections[idx];
          for (const c of res.caseHistory) {
            mergedCases.push({
              ...c,
              connectionId: conn.connectionId,
              gameId: conn.gameId,
              gameName: res.gameName ?? conn.gameName,
              gameImageUrl: res.gameImageUrl ?? conn.imageUrl,
              gameProvider: res.gameProvider ?? conn.provider,
              recordStatus: res.status,
            });
          }
        });
        mergedCases.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (!cancelled) {
          setBans(banList);
          setBansLoaded(true);
          setAllCases(mergedCases);
        }
      } catch (err) {
        if (!(err instanceof ApiError)) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, result, connections]);

  if (error) {
    return <p className="alert alert--error" role="alert">{error}</p>;
  }
  if (!result || loading) {
    return (
      <div className="account" aria-busy="true" aria-label="Loading your account">
        <section className="account__top">
          <div className="skeleton skeleton--panel" />
          <div className="skeleton skeleton--panel" />
        </section>
        <section className="account__stats">
          <div className="skeleton skeleton--metric" />
          <div className="skeleton skeleton--metric" />
          <div className="skeleton skeleton--metric" />
          <div className="skeleton skeleton--metric" />
        </section>
      </div>
    );
  }

  const m = deriveMetrics(result);
  const openCasesAcrossGames =
    allCases.length > 0
      ? allCases.filter((c) => ["pending", "appealed"].includes(c.status.toLowerCase()) || c.recordStatus === "appealed").length
      : m.openCases;
  const realValues: PreviewValues = {
    offences: m.confirmedOffences,
    open: openCasesAcrossGames,
    games: connections.length,
    bans: bansLoaded ? bans.length : m.activeBans,
  };
  const valueByCard = preview ?? realValues;
  const gaugeScore = scorePreview ?? m.trustScore;
  const gaugeVerdict = scorePreview === null ? m.verdict : verdictLabel(gaugeScore);

  const bannedSignals = bans;
  const displayedCases: AnnotatedCase[] =
    allCases.length > 0
      ? allCases
      : result.caseHistory.map((c) => ({
          ...c,
          connectionId: result.gameConnectionId,
          gameName: result.gameName ?? result.gameConnectionId,
          gameImageUrl: result.gameImageUrl,
          gameProvider: result.gameProvider,
          recordStatus: result.status,
        }));
  const confirmedCases = displayedCases.filter(
    (c) => c.recordStatus !== "overturned" && c.status.toLowerCase() === "confirmed",
  );
  const hasSanctions = bannedSignals.length > 0 || confirmedCases.length > 0;

  const detailItems = openCard ? itemsFor(openCard, result, connections, bans, allCases) : [];

  const guardianControlled = profile?.guardianControlled ?? false;

  /** Mock the holder verifying their own ID at 18, then convert the account to adult. */
  async function handleComeOfAge() {
    if (comingOfAge || !onComeOfAge) return;
    setComingOfAge(true);
    setComeOfAgeError(null);
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await onComeOfAge();
    } catch (err) {
      setComeOfAgeError(err instanceof ApiError ? err.message : "Could not verify ID right now. Please try again.");
    } finally {
      setComingOfAge(false);
    }
  }

  return (
    <div className="account">
      <section className="account__top">
        <article className="idcard">
          <div className="idcard__row">
            <div className="idcard__id">
              <span className="idcard__avatar" aria-hidden="true">{displayName(signedInAs).slice(0, 1)}</span>
              <div>
                <span className="idcard__name">{profile?.holderName ?? displayName(signedInAs)}</span>
                <span className="idcard__sub">{guardianControlled ? "Parent-controlled identity" : "Verified identity"}</span>
              </div>
            </div>
            <span className="idcard__badge">{m.verdict}</span>
          </div>
          <div className="idcard__scoreline">
            <span className="idcard__scorelabel">Global trust score</span>
            <span className="idcard__meta">one identity · all games</span>
          </div>
          <div className="idcard__score">{m.trustScore}<span className="idcard__max">/100</span></div>
          <div className="idcard__spark"><Sparkline data={trustTrend(m.trustScore)} tone="accent" /></div>
          <span className="idcard__chip">{signedInAs}</span>
        </article>

        <article className="panel account__gauge">
          <div className="panel__head"><h2>Reliability</h2></div>
          <TrustGauge score={gaugeScore} verdict={gaugeVerdict} size={210} />
        </article>
      </section>

      {profile && (
        <section className="account__access">
          <article className={`panel accesscard ${guardianControlled ? "accesscard--minor" : "accesscard--adult"}`}>
            <div className="panel__head">
              <h2>Account access</h2>
              <span className={`chip ${guardianControlled ? "chip--warn" : "chip--good"}`}>
                {guardianControlled ? "Parent-controlled" : "Full adult access"}
              </span>
            </div>
            {guardianControlled ? (
              <div className="accesscard__body">
                <dl className="accesscard__grid">
                  <div><dt>Player</dt><dd>{profile.holderName ?? displayName(signedInAs)}</dd></div>
                  <div><dt>Guardian</dt><dd>{profile.guardianName ?? "—"}</dd></div>
                  <div><dt>Guardian email</dt><dd>{profile.guardianEmail ?? signedInAs}</dd></div>
                  <div>
                    <dt>18+ games</dt>
                    <dd>{profile.matureAccessAllowed
                      ? <span className="pill pill--good">Allowed by guardian</span>
                      : <span className="pill pill--bad">Blocked</span>}</dd>
                  </div>
                </dl>
                <div className="comeofage">
                  <div>
                    <p className="comeofage__title">Turned 18?</p>
                    <p className="muted">Verify your own ID to unlock full access to all games and remove parental controls.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleComeOfAge}
                    disabled={comingOfAge}
                  >
                    {comingOfAge ? "Verifying your ID…" : "Verify my ID & unlock full access"}
                  </button>
                </div>
                {comeOfAgeError && <p className="alert alert--error" role="alert">{comeOfAgeError}</p>}
              </div>
            ) : (
              <p className="muted accesscard__note">
                This is a full adult account with access to all games. Your verified identity carries your
                trust score across every linked game.
              </p>
            )}
          </article>
        </section>
      )}

      <section className="account__stats">
        <StatCard card="offences" label="Confirmed offences" value={valueByCard.offences} onOpen={() => setOpenCard("offences")} />
        <StatCard card="open" label="Open cases" value={valueByCard.open} onOpen={() => setOpenCard("open")} />
        <StatCard card="games" label="Linked games" value={valueByCard.games} onOpen={() => setOpenCard("games")} />
        <StatCard card="bans" label="Active bans" value={valueByCard.bans} onOpen={() => setOpenCard("bans")} />
      </section>

      {DEMO_CONTROLS_ENABLED && (
        <DevTierPreview
          value={preview}
          realValues={realValues}
          onChange={(v) => {
            setPreview(v);
            if (v === null) setScorePreview(null);
          }}
          score={scorePreview}
          onScoreChange={setScorePreview}
        />
      )}

      <section className="account__trend">
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
            <h2>Ban &amp; sanction records</h2>
            <span className="chip chip--muted">{bannedSignals.length + confirmedCases.length}</span>
          </div>
          {!hasSanctions ? (
            <div className="goodstate">
              <span className="goodstate__icon" aria-hidden="true">✓</span>
              <p>No bans or confirmed sanctions on your record. Keep it up.</p>
            </div>
          ) : (
            <ul className="banlist">
              {bannedSignals.map((b, i) => (
                <li key={`ban-${i}`} className="banlist__item banlist__item--ban">
                  <GameLogo src={b.imageUrl} appId={b.gameId} name={b.gameName ?? b.gameId} provider={b.provider} width={64} />
                  <div className="banlist__body">
                    <span className="banlist__title">
                      {banTypeLabel(b.banType)} · <strong>{b.gameName ?? b.gameId}</strong>
                    </span>
                    <span className="muted">
                      {banExtent(b)}
                      {` · ${b.appealable ? "appealable" : "final — not appealable"}`}
                    </span>
                  </div>
                  {b.appealable && onNavigate ? (
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => onNavigate("appeals")}>
                      Appeal →
                    </button>
                  ) : (
                    <span className={`pill ${b.appealable ? "" : "pill--bad"}`}>
                      {b.appealable ? "Appealable" : "Final"}
                    </span>
                  )}
                </li>
              ))}
              {confirmedCases.map((c, i) => (
                <li key={`case-${c.connectionId}-${i}`} className="banlist__item">
                  <GameLogo src={c.gameImageUrl} appId={c.gameId} name={c.gameName} provider={c.gameProvider} width={64} />
                  <div className="banlist__body">
                    <span className="banlist__title"><strong>{c.gameName}</strong> · {offenceLabel(c.offenceType)}</span>
                    <span className="muted">{sourceLabel(c.source)} · {formatDate(c.timestamp)}</span>
                  </div>
                  <span className="pill">score {c.score}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <div className="panel__head">
            <h2>Case history</h2>
            <div className="panel__head-right">
              <span className="chip chip--muted">{displayedCases.length}</span>
              {onNavigate && (
                <button type="button" className="linkbtn panel__link" onClick={() => onNavigate("record")}>
                  Full record →
                </button>
              )}
            </div>
          </div>
          {displayedCases.length === 0 ? (
            <p className="muted">No cases on your record yet.</p>
          ) : (
            <ul className="caselist">
              {displayedCases.map((c, i) => (
                <li key={`${c.connectionId}-${c.timestamp}-${i}`} className="caselist__item">
                  <span className={`source-badge source-badge--${c.source}`}>{sourceLabel(c.source)}</span>
                  <span className="caselist__offence"><strong>{c.gameName}</strong> · {offenceLabel(c.offenceType)}</span>
                  <span className={`status-badge status-badge--${c.status.toLowerCase()}`}>{c.status}</span>
                  <span className="muted caselist__when">{formatDate(c.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {openCard && (
        <StatDetailDialog
          title={CARD_TITLES[openCard].title}
          subtitle={CARD_TITLES[openCard].subtitle}
          onClose={() => setOpenCard(null)}
        >
          <div className="modal__hero">
            <MascotScene state={mascotStateFor(openCard, valueByCard[openCard])} variant="large" showSub />
          </div>
          {detailItems.length > 0 && (
            <ul className="detaillist">
              {detailItems.map((it) => (
                <li key={it.id} className={`detaillist__item detaillist__item--${it.tone ?? "accent"}`}>
                  {it.logo && <GameLogo src={it.logo.src} appId={it.logo.appId} name={it.logo.name} provider={it.logo.provider} width={64} />}
                  <div className="detaillist__body">
                    <span className="detaillist__title">{it.title}</span>
                    {it.meta && <span className="muted detaillist__meta">{it.meta}</span>}
                  </div>
                  {it.tag && <span className={`pill ${it.tone === "bad" ? "pill--bad" : ""}`}>{it.tag}</span>}
                </li>
              ))}
            </ul>
          )}
        </StatDetailDialog>
      )}
    </div>
  );
}
