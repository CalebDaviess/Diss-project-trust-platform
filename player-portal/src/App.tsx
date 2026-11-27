import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  emptyResult,
  getProfile,
  getResult,
  listAppeals,
  listConnections,
  login,
  register,
  simulateAntiCheatVerdict,
  simulateBan,
  submitSample,
  verifyAdult,
  type ProfileView,
  type RegisterRequest,
  type ResultView,
  type SampleSubmission,
  type SimulateAntiCheatRequest,
  type SimulateBanRequest,
} from "./api/accountabilityApi";
import { useTheme } from "./hooks/useTheme";
import type { StatCardKey } from "./features/mascotState";
import { AuthScreen } from "./components/AuthScreen";
import { AppShell, type NavBadge, type TabKey } from "./components/AppShell";
import { DashboardTab } from "./components/tabs/DashboardTab";
import { RecordTab } from "./components/tabs/RecordTab";
import { GamesTab } from "./components/tabs/GamesTab";
import { AppealsTab } from "./components/tabs/AppealsTab";
import { AccountTab } from "./components/tabs/AccountTab";
import { ConceptTab } from "./components/tabs/ConceptTab";
import "./App.css";

/** Connection auto-loaded into the dashboard the moment a player signs in. */
const DEFAULT_CONNECTION = "gc-1";
const SESSION_KEY = "trust_platform_session_v1";

interface SavedSession {
  token: string;
  signedInAs: string;
}

function readSavedSession(): SavedSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedSession>;
    if (typeof parsed.token === "string" && parsed.token && typeof parsed.signedInAs === "string") {
      return { token: parsed.token, signedInAs: parsed.signedInAs };
    }
    return null;
  } catch {
    return null;
  }
}

function writeSavedSession(session: SavedSession | null) {
  try {
    if (session) {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
  }
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Session expired or not authorised. Please sign in again.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Could not reach the backend. Is accountability-service running, and is CORS configured for this origin? See README.";
  }
  return error instanceof Error ? error.message : "Unexpected error.";
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [saved] = useState<SavedSession | null>(() => readSavedSession());

  const [token, setToken] = useState<string | null>(saved?.token ?? null);
  const [signedInAs, setSignedInAs] = useState(saved?.signedInAs ?? "");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [accountFocusCard, setAccountFocusCard] = useState<StatCardKey | null>(null);
  const [recordGameFilter, setRecordGameFilter] = useState<string>("");

  const [result, setResult] = useState<ResultView | null>(null);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [appealableCount, setAppealableCount] = useState(0);
  const [openAppealsCount, setOpenAppealsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = useCallback(() => {
    writeSavedSession(null);
    setToken(null);
    setSignedInAs("");
    setResult(null);
    setProfile(null);
    setAppealableCount(0);
    setOpenAppealsCount(0);
    setError(null);
    setAuthError(null);
    setAccountFocusCard(null);
    setRecordGameFilter("");
  }, []);

  /** Load the account-level profile (type, guardian, 18+ access) for the shell banner. */
  const loadProfile = useCallback(async (activeToken: string) => {
    try {
      setProfile(await getProfile(activeToken));
    } catch {
      setProfile(null);
    }
  }, []);

  const loadAppealCounts = useCallback(async (activeToken: string) => {
    try {
      const overview = await listAppeals(activeToken);
      setAppealableCount(overview.appealable.length);
      setOpenAppealsCount(overview.appeals.filter((a) => a.status === "submitted").length);
    } catch {
      // Non-critical sidebar badge refresh.
    }
  }, []);

  /** Initial post-sign-in load: pick the player's first active game connection, or fall back cleanly. */
  const loadInitial = useCallback(
    async (activeToken: string) => {
      setLoading(true);
      setError(null);
      void loadProfile(activeToken);
      void loadAppealCounts(activeToken);
      let targetConnection = DEFAULT_CONNECTION;
      try {
        const conns = await listConnections(activeToken);
        if (conns.length > 0) {
          targetConnection = conns[0].connectionId;
        }
      } catch {
        // Fall back to DEFAULT_CONNECTION if connections list isn't reachable yet.
      }
      try {
        setResult(await getResult(activeToken, targetConnection));
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setResult(emptyResult(targetConnection));
        } else if (err instanceof ApiError && err.status === 401) {
          handleSignOut();
        } else {
          setResult(emptyResult(targetConnection));
          setError(messageFor(err));
        }
      } finally {
        setLoading(false);
      }
    },
    [handleSignOut, loadAppealCounts, loadProfile],
  );

  // Hydrate dashboard state if restoring an existing browser session across refresh.
  useEffect(() => {
    if (saved?.token) {
      void loadInitial(saved.token);
    }
  }, [saved, loadInitial]);

  /** Run an authenticated data action, refreshing the shared ResultView + sidebar badges. */
  async function runWith(activeToken: string, action: (t: string) => Promise<ResultView>): Promise<ResultView | null> {
    setLoading(true);
    setError(null);
    try {
      const updated = await action(activeToken);
      setResult(updated);
      void loadAppealCounts(activeToken);
      return updated;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleSignOut();
      }
      setError(messageFor(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(username: string, password: string) {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const auth = await login(username, password);
      writeSavedSession({ token: auth.token, signedInAs: username });
      setToken(auth.token);
      setSignedInAs(username);
      setActiveTab("dashboard");
      void loadInitial(auth.token);
    } catch (err) {
      setAuthError(
        err instanceof ApiError && err.status === 401
          ? "Invalid email or password."
          : messageFor(err),
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegister(request: RegisterRequest) {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const auth = await register(request);
      writeSavedSession({ token: auth.token, signedInAs: request.username });
      setToken(auth.token);
      setSignedInAs(request.username);
      setActiveTab("dashboard");
      void loadInitial(auth.token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAuthError("An account with this email already exists. Try signing in.");
      } else if (err instanceof ApiError && err.status === 400) {
        setAuthError("Please check your details and try again.");
      } else {
        setAuthError(messageFor(err));
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function run(action: (t: string) => Promise<ResultView>): Promise<ResultView | null> {
    if (!token) {
      setError("Please sign in first.");
      return null;
    }
    return runWith(token, action);
  }

  function handleSubmitSample(submission: SampleSubmission) {
    return run((t) => submitSample(t, submission));
  }
  function handleSimulateAntiCheat(request: SimulateAntiCheatRequest) {
    return run((t) => simulateAntiCheatVerdict(t, request));
  }
  function handleSimulateBan(request: SimulateBanRequest) {
    return run((t) => simulateBan(t, request));
  }
  /** Reload the shared result so trust/record changes (e.g. appeal outcomes) show on other tabs. */
  function refreshResult() {
    if (token) void loadInitial(token);
  }

  /** Smart cross-tab jump (optionally opening an Account detail modal or pre-filtering My Record). */
  function navigateTo(tab: TabKey, opts?: { accountCard?: StatCardKey; gameFilter?: string }) {
    setAccountFocusCard(opts?.accountCard ?? null);
    if (tab === "record" && opts?.gameFilter !== undefined) {
      setRecordGameFilter(opts.gameFilter);
    } else if (tab !== "record") {
      setRecordGameFilter("");
    }
    setActiveTab(tab);
  }

  /** The holder has turned 18 and verified their own ID: convert to a full adult account. */
  async function handleComeOfAge() {
    if (!token) return;
    const updated = await verifyAdult(token);
    setProfile(updated);
  }

  if (token === null) {
    return (
      <AuthScreen
        busy={authBusy}
        error={authError}
        onLogin={handleLogin}
        onRegister={handleRegister}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const badges: Partial<Record<TabKey, NavBadge>> = {};
  if ((result?.linkedGamesCount ?? 0) > 0) {
    badges.games = { count: result!.linkedGamesCount!, tone: "muted" };
  }
  if ((result?.activeBanCount ?? 0) > 0) {
    badges.record = { count: result!.activeBanCount!, tone: "bad" };
  }
  const appealAttention = appealableCount + openAppealsCount;
  if (appealAttention > 0) {
    badges.appeals = { count: appealAttention, tone: appealableCount > 0 ? "warn" : "accent" };
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={(tab) => navigateTo(tab)}
      badges={badges}
      signedInAs={signedInAs}
      profile={profile}
      theme={theme}
      onToggleTheme={toggleTheme}
      onSignOut={handleSignOut}
    >
      {activeTab === "dashboard" && (
        <DashboardTab
          token={token}
          result={result}
          appealableCount={appealableCount}
          loading={loading}
          error={error}
          onNavigate={navigateTo}
        />
      )}
      {activeTab === "record" && (
        <RecordTab
          token={token}
          initialGameFilter={recordGameFilter}
          onChanged={refreshResult}
          onNavigate={navigateTo}
        />
      )}
      {activeTab === "games" && (
        <GamesTab
          token={token}
          profile={profile}
          onChanged={refreshResult}
          onNavigate={navigateTo}
          onSubmitSample={handleSubmitSample}
          onSimulateAntiCheat={handleSimulateAntiCheat}
          onSimulateBan={handleSimulateBan}
        />
      )}
      {activeTab === "appeals" && (
        <AppealsTab token={token} onChanged={refreshResult} onNavigate={navigateTo} />
      )}
      {activeTab === "account" && (
        <AccountTab
          token={token}
          result={result}
          profile={profile}
          loading={loading}
          error={error}
          signedInAs={signedInAs}
          initialCard={accountFocusCard}
          onClearInitialCard={() => setAccountFocusCard(null)}
          onNavigate={navigateTo}
          onComeOfAge={handleComeOfAge}
        />
      )}
      {activeTab === "concept" && <ConceptTab />}
    </AppShell>
  );
}
