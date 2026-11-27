import { useState } from "react";
import {
  ApiError,
  emptyResult,
  getProfile,
  getResult,
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
import { AuthScreen } from "./components/AuthScreen";
import { AppShell, type TabKey } from "./components/AppShell";
import { DashboardTab } from "./components/tabs/DashboardTab";
import { RecordTab } from "./components/tabs/RecordTab";
import { GamesTab } from "./components/tabs/GamesTab";
import { AppealsTab } from "./components/tabs/AppealsTab";
import { AccountTab } from "./components/tabs/AccountTab";
import { ConceptTab } from "./components/tabs/ConceptTab";
import "./App.css";

/** Connection auto-loaded into the dashboard the moment a player signs in. */
const DEFAULT_CONNECTION = "gc-1";

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

  const [token, setToken] = useState<string | null>(null);
  const [signedInAs, setSignedInAs] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [result, setResult] = useState<ResultView | null>(null);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Load the account-level profile (type, guardian, 18+ access) for the shell banner. */
  async function loadProfile(activeToken: string) {
    try {
      setProfile(await getProfile(activeToken));
    } catch {
      setProfile(null);
    }
  }

  /** Initial post-sign-in load: pick the player's first active game connection, or fall back cleanly. */
  async function loadInitial(activeToken: string) {
    setLoading(true);
    setError(null);
    void loadProfile(activeToken);
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
        // New account: no game connection yet — show a clean empty record.
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
  }

  /** Run an authenticated data action, refreshing the shared ResultView. */
  async function runWith(activeToken: string, action: (t: string) => Promise<ResultView>): Promise<ResultView | null> {
    setLoading(true);
    setError(null);
    try {
      const updated = await action(activeToken);
      setResult(updated);
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

  function handleSignOut() {
    setToken(null);
    setSignedInAs("");
    setResult(null);
    setProfile(null);
    setError(null);
    setAuthError(null);
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

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
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
          loading={loading}
          error={error}
          onOpenAccount={() => setActiveTab("account")}
        />
      )}
      {activeTab === "record" && <RecordTab token={token} onChanged={refreshResult} />}
      {activeTab === "games" && (
        <GamesTab
          token={token}
          profile={profile}
          onChanged={refreshResult}
          onSubmitSample={handleSubmitSample}
          onSimulateAntiCheat={handleSimulateAntiCheat}
          onSimulateBan={handleSimulateBan}
        />
      )}
      {activeTab === "appeals" && <AppealsTab token={token} onChanged={refreshResult} />}
      {activeTab === "account" && (
        <AccountTab
          token={token}
          result={result}
          profile={profile}
          loading={loading}
          error={error}
          signedInAs={signedInAs}
          onComeOfAge={handleComeOfAge}
        />
      )}
      {activeTab === "concept" && <ConceptTab />}
    </AppShell>
  );
}
