import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  createConnection,
  listConnections,
  removeConnection,
  searchGames,
  type ConnectionView,
  type GameSearchResult,
  type ProfileView,
  type ResultView,
  type SampleSubmission,
  type SimulateAntiCheatRequest,
  type SimulateBanRequest,
} from "../../api/accountabilityApi";
import { TOXIC_CHAT } from "../../features/presets";
import { isMatureGame } from "../../features/maturity";
import { DEMO_CONTROLS_ENABLED } from "../../features/demo";
import { StatDetailDialog } from "../StatDetailDialog";
import { GameLogo } from "../GameLogo";

interface GamesTabProps {
  token: string;
  profile?: ProfileView | null;
  onChanged?: () => void;
  onSubmitSample: (submission: SampleSubmission) => Promise<ResultView | null>;
  onSimulateAntiCheat: (request: SimulateAntiCheatRequest) => Promise<ResultView | null>;
  onSimulateBan: (request: SimulateBanRequest) => Promise<ResultView | null>;
}

interface Provider {
  id: string;
  label: string;
}

/** Publisher identity providers shown as "Connect with" options (mocked OAuth in the prototype). */
const CORE_PROVIDERS: Provider[] = [
  { id: "steam", label: "Steam" },
  { id: "battlenet", label: "Battle.net" },
  { id: "riot", label: "Riot Games" },
  { id: "epic", label: "Epic Games" },
  { id: "xbox", label: "Xbox" },
  { id: "psn", label: "PlayStation" },
];

/** Display labels for every provider a catalogue hit might carry. */
const PROVIDER_LABELS: Record<string, string> = {
  steam: "Steam",
  battlenet: "Battle.net",
  riot: "Riot Games",
  epic: "Epic Games",
  xbox: "Xbox",
  psn: "PlayStation",
  ea: "EA",
  ubisoft: "Ubisoft Connect",
  microsoft: "Microsoft",
  roblox: "Roblox",
  hoyoverse: "HoYoverse",
  supercell: "Supercell",
  niantic: "Niantic",
  "square-enix": "Square Enix",
  jagex: "Jagex",
};

function providerLabel(id: string): string {
  return PROVIDER_LABELS[id] ?? id;
}

function mockAccountRef(provider: string): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  if (provider === "steam") return `7656119${Math.floor(1000000 + Math.random() * 8999999)}`;
  if (provider === "battlenet") return `Player#${n}`;
  return `Player${n}`;
}

const BAN_OPTIONS: Array<{ label: string; req: Omit<SimulateBanRequest, "connectionId"> }> = [
  { label: "Comms ban · 7d · appealable", req: { banType: "communication", durationDays: 7, appealable: true } },
  { label: "Temp ban · 14d · appealable", req: { banType: "temporary", durationDays: 14, appealable: true } },
  { label: "Permanent · appealable", req: { banType: "permanent", durationDays: null, appealable: true } },
  { label: "Permanent · final (no appeal)", req: { banType: "permanent", durationDays: null, appealable: false } },
];

/** Dev-only control: pick a ban type/duration/appealability and apply it to this game. */
function BanSimControl({
  connectionId,
  disabled,
  onSimulateBan,
}: {
  connectionId: string;
  disabled?: boolean;
  onSimulateBan: (request: SimulateBanRequest) => void;
}) {
  const [idx, setIdx] = useState(0);
  return (
    <span className="bansim">
      <select className="bansim__select" value={idx} onChange={(e) => setIdx(Number(e.target.value))} aria-label="Ban type" disabled={disabled}>
        {BAN_OPTIONS.map((o, i) => (
          <option key={i} value={i}>{o.label}</option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn--ghost btn--sm btn--demo"
        title="Dev: simulate a typed operator ban on this game"
        disabled={disabled}
        onClick={() => onSimulateBan({ connectionId, ...BAN_OPTIONS[idx].req })}
      >
        Simulate ban
      </button>
    </span>
  );
}

export function GamesTab({ token, profile, onChanged, onSubmitSample, onSimulateAntiCheat, onSimulateBan }: GamesTabProps) {
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Guardian-controlled minor without 18+ consent: 18+ games are blocked.
  const blockMature = (profile?.guardianControlled ?? false) && !(profile?.matureAccessAllowed ?? true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConnections(await listConnections(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your games.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleUnlink(connectionId: string) {
    setError(null);
    setNotice(null);
    setBusyId(connectionId);
    try {
      await removeConnection(token, connectionId);
      setConnections((prev) => prev.filter((c) => c.connectionId !== connectionId));
      onChanged?.();
      setNotice("Game unlinked from your identity.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not unlink game. Please try again.");
      void reload();
    } finally {
      setBusyId(null);
    }
  }

  async function runDemoAction(connectionId: string, action: () => Promise<ResultView | null>, successMessage: (r: ResultView | null) => string) {
    setError(null);
    setNotice(null);
    setBusyId(connectionId);
    try {
      const updated = await action();
      setNotice(successMessage(updated));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed. Check that the backend and detection engine are running.");
    } finally {
      setBusyId(null);
    }
  }

  function simulateToxic(c: ConnectionView) {
    const submission: SampleSubmission = {
      gameConnectionId: c.connectionId,
      operatorId: c.operatorId,
      gameId: c.gameId,
      features: TOXIC_CHAT.features,
    };
    void runDemoAction(
      c.connectionId,
      () => onSubmitSample(submission),
      (r) => `Conduct sample scored for ${c.gameName}${r?.conductScore != null ? ` (score ${r.conductScore}, status: ${r.status ?? "pending"})` : ""} — view in My Record.`,
    );
  }

  function simulateAntiCheat(c: ConnectionView) {
    void runDemoAction(
      c.connectionId,
      () => onSimulateAntiCheat({ connectionId: c.connectionId, operatorId: c.operatorId, gameId: c.gameId }),
      (r) => `External anti-cheat verdict ingested for ${c.gameName}${r ? ` (global trust now ${r.globalTrustScore}/100)` : ""} — view in My Record or Appeals.`,
    );
  }

  function handleSimBan(c: ConnectionView, req: SimulateBanRequest) {
    void runDemoAction(
      c.connectionId,
      () => onSimulateBan(req),
      (r) => `Simulated ${req.banType} ban applied on ${c.gameName}${r ? ` (global trust now ${r.globalTrustScore}/100)` : ""} — view in My Record or Account.`,
    );
  }

  return (
    <div className="games">
      <section className="panel games__header">
        <div>
          <h2>Your linked games</h2>
          <p className="muted">
            Link a game once and your trust score follows you across every connected title. Linking
            uses your publisher sign-in (Steam, Battle.net, Riot…) — no work for the game studio.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setAddOpen(true)}>
          + Add a game
        </button>
      </section>

      {error && <p className="alert alert--error" role="alert">{error}</p>}
      {notice && <p className="alert" role="status">{notice}</p>}

      {loading ? (
        <div className="panel panel--empty"><p className="muted">Loading your games…</p></div>
      ) : connections.length === 0 ? (
        <div className="panel games__empty">
          <span className="games__emptyicon" aria-hidden="true">🎮</span>
          <h3>No games linked yet</h3>
          <p className="muted">Link your first game to start building one accountability record across every title you play.</p>
          <button type="button" className="btn btn--primary" onClick={() => setAddOpen(true)}>Add a game</button>
        </div>
      ) : (
        <ul className="gamelist">
          {connections.map((c) => (
            <li key={c.connectionId} className="gamecard">
              <GameLogo src={c.imageUrl} appId={c.gameId} name={c.gameName} provider={c.provider} width={92} />
              <div className="gamecard__body">
                <span className="gamecard__name">{c.gameName}</span>
                <span className="muted gamecard__meta">
                  <span className="provider-badge">{providerLabel(c.provider)}</span>
                  {c.operatorAccountRef ? ` · ${c.operatorAccountRef}` : ""}
                  {c.linkedAt ? ` · linked ${new Date(c.linkedAt).toLocaleDateString()}` : ""}
                </span>
              </div>
              <div className="gamecard__actions">
                {DEMO_CONTROLS_ENABLED && (
                  <>
                    <button type="button" className="btn btn--ghost btn--sm" disabled={busyId === c.connectionId} onClick={() => simulateToxic(c)} title="Demo: submit a toxic conduct sample for this game">
                      Simulate report
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm btn--demo" disabled={busyId === c.connectionId} onClick={() => simulateAntiCheat(c)} title="Demo: land a simulated anti-cheat verdict for this game">
                      Simulate anti-cheat
                    </button>
                    <BanSimControl connectionId={c.connectionId} disabled={busyId === c.connectionId} onSimulateBan={(req) => handleSimBan(c, req)} />
                  </>
                )}
                <button type="button" className="btn btn--ghost btn--sm" disabled={busyId === c.connectionId} onClick={() => handleUnlink(c.connectionId)}>
                  Unlink
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {addOpen && (
        <AddGameModal
          token={token}
          blockMature={blockMature}
          onClose={() => setAddOpen(false)}
          onLinked={() => {
            setAddOpen(false);
            setNotice("Game linked to your identity.");
            void reload();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}

function AddGameModal({
  token,
  blockMature,
  onClose,
  onLinked,
}: {
  token: string;
  blockMature: boolean;
  onClose: () => void;
  onLinked: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<GameSearchResult | null>(null);
  const [provider, setProvider] = useState<string>("steam");
  const [connecting, setConnecting] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  // Core sign-ins plus the selected game's native launcher (so e.g. Epic appears for Rocket League).
  const providerOptions = useMemo(() => {
    const native = selected?.provider;
    const base = CORE_PROVIDERS.map((p) => p.id);
    const ids = native && !base.includes(native) ? [native, ...base] : base;
    return ids.map((id) => ({ id, label: providerLabel(id) }));
  }, [selected]);

  function choose(game: GameSearchResult) {
    setSelected(game);
    setProvider(game.provider ?? "steam");
  }

  const trimmed = query.trim();

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        setResults(await searchGames(token, trimmed));
      } catch {
        setSearchError("Search is unavailable right now.");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [trimmed, token]);

  async function connect() {
    if (!selected) return;
    if (blockMature && isMatureGame(selected.name)) {
      setSearchError("This game is rated 18+ and is blocked on this parent-controlled account.");
      return;
    }
    setConnecting(true);
    // Mocked publisher OAuth: in production this is a real redirect/consent to the publisher.
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await createConnection(token, {
        gameId: selected.id,
        gameName: selected.name,
        provider,
        operatorId: `op-${provider}`,
        operatorAccountRef: mockAccountRef(provider),
        imageUrl: selected.imageUrl ?? undefined,
        mature: isMatureGame(selected.name),
      });
      onLinked();
    } catch (err) {
      setConnecting(false);
      if (err instanceof ApiError && err.status === 403) {
        setSelected(null);
        setSearchError("This game is rated 18+ and is blocked on this parent-controlled account.");
      } else {
        setSearchError(err instanceof ApiError ? err.message : "Could not link this game. Please try again.");
      }
    }
  }

  const providerLabelText = useMemo(() => providerLabel(provider), [provider]);
  const selectedBlocked = selected != null && blockMature && isMatureGame(selected.name);

  return (
    <StatDetailDialog title="Add a game" subtitle="Search thousands of games, then connect with your publisher sign-in" onClose={onClose}>
      {selected ? (
        <div className="addgame__connect">
          <div className="addgame__chosen">
            <GameLogo src={selected.imageUrl} appId={selected.id} name={selected.name} provider={selected.provider} width={128} />
            <div>
              <span className="addgame__chosenname">{selected.name}</span>
              <button type="button" className="linkbtn" onClick={() => setSelected(null)} disabled={connecting}>
                ← choose a different game
              </button>
            </div>
          </div>

          <p className="muted">Connect the account you play <strong>{selected.name}</strong> on. You verify ownership by signing in to the publisher — the game studio does nothing.</p>

          <div className="addgame__providers">
            {providerOptions.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`provider-chip ${provider === p.id ? "is-active" : ""}`}
                onClick={() => setProvider(p.id)}
                disabled={connecting}
              >
                {p.label}
              </button>
            ))}
          </div>

          {selectedBlocked ? (
            <div className="agelock" role="alert">
              <span className="agelock__badge">18+</span>
              <div>
                <strong>Rated 18+ — blocked on this account.</strong>
                <p className="muted">A parent or guardian can allow 18+ games, or you can unlock full access when you turn 18 from the Account tab.</p>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn--primary btn--block" onClick={connect} disabled={connecting}>
              {connecting ? (
                <><span className="spinner" aria-hidden="true" /> Connecting with {providerLabelText}…</>
              ) : (
                <>Connect with {providerLabelText}</>
              )}
            </button>
          )}
          {searchError && <p className="alert alert--error" role="alert">{searchError}</p>}
          <p className="muted addgame__note">Prototype: the publisher sign-in is simulated — nothing is sent to {providerLabelText}.</p>
        </div>
      ) : (
        <div className="addgame__search">
          <label className="field">
            <span>Search games</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Overwatch, Dota 2, Rocket League…"
              autoFocus
            />
          </label>

          {searching && <p className="muted">Searching…</p>}
          {searchError && <p className="muted">{searchError}</p>}
          {!searching && trimmed.length >= 2 && results.length === 0 && !searchError && (
            <p className="muted">No games found for “{trimmed}”.</p>
          )}

          <ul className="searchlist">
            {results.map((g) => {
              const mature = isMatureGame(g.name);
              const locked = mature && blockMature;
              return (
                <li key={g.id}>
                  <button type="button" className={`searchlist__item ${locked ? "searchlist__item--locked" : ""}`} onClick={() => choose(g)}>
                    <GameLogo src={g.imageUrl} appId={g.id} name={g.name} provider={g.provider} width={92} />
                    <span className="searchlist__name">{g.name}</span>
                    {mature && <span className="age-badge" title="Rated 18+">18+</span>}
                    {g.provider && <span className="provider-badge">{providerLabel(g.provider)}</span>}
                    <span className="searchlist__cta" aria-hidden="true">{locked ? "Blocked" : "Connect →"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </StatDetailDialog>
  );
}
