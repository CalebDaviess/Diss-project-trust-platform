import { useEffect, useRef, useState } from "react";
import type { IdDocumentType, RegisterRequest } from "../api/accountabilityApi";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "../hooks/useTheme";

interface AuthScreenProps {
  busy: boolean;
  error: string | null;
  onLogin: (username: string, password: string) => void;
  onRegister: (request: RegisterRequest) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

type Mode = "signin" | "create";

const ID_TYPES: Array<{ value: IdDocumentType; label: string; hint: string }> = [
  { value: "passport", label: "Passport", hint: "Machine-readable photo page" },
  { value: "drivers-licence", label: "Driver's licence", hint: "Front & back of card" },
  { value: "national-id", label: "National ID card", hint: "Government-issued ID" },
  { value: "residence-permit", label: "Residence permit", hint: "Biometric permit card" },
  { value: "credit-card", label: "Credit card", hint: "For payment-level assurance" },
];

const DEMO_USER = (import.meta.env.VITE_DEMO_USERNAME as string) ?? "player@example.com";
const DEMO_PASS = (import.meta.env.VITE_DEMO_PASSWORD as string) ?? "demo-password";

/** Whole years between a date-of-birth string and today, or null if unparseable. */
function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function AuthScreen({ busy, error, onLogin, onRegister, theme, onToggleTheme }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("signin");

  // Sign-in fields (prefilled with the dev demo login for one-click entry).
  const [email, setEmail] = useState(DEMO_USER);
  const [password, setPassword] = useState(DEMO_PASS);
  const [showSignInPw, setShowSignInPw] = useState(false);

  // Create-account fields.
  const [over18, setOver18] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [holderName, setHolderName] = useState("");
  const [idType, setIdType] = useState<IdDocumentType>("passport");
  const [dobOnId, setDobOnId] = useState("");
  const [idUploaded, setIdUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Guardian (under-18 only).
  const [guardianName, setGuardianName] = useState("");
  const [allowMature, setAllowMature] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const uploadTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (uploadTimer.current) window.clearTimeout(uploadTimer.current);
    };
  }, []);

  const selectedId = ID_TYPES.find((t) => t.value === idType) ?? ID_TYPES[0];
  const verifySubject = over18 ? "your" : "the guardian's";
  const pwLongEnough = newPassword.length >= 8;
  const pwMatches = confirm.length > 0 && newPassword === confirm;
  const isUsingDemo = email.trim().toLowerCase() === DEMO_USER.toLowerCase() && password === DEMO_PASS;

  function switchMode(next: Mode) {
    setMode(next);
    setLocalError(null);
  }

  /** Flip the 18+ self-declaration — the verified document subject changes, so reset the ID step. */
  function setOver(next: boolean) {
    setOver18(next);
    setIdUploaded(false);
    setLocalError(null);
  }

  function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    if (email.trim() && password) onLogin(email.trim(), password);
  }

  /**
   * Mock ID "scan & verify": no real upload happens. We read the date of birth entered off the
   * document and check the subject is actually an adult (the holder in adult mode, the guardian in
   * under-18 mode).
   */
  function startIdUpload() {
    if (uploading) return;
    const age = ageFromDob(dobOnId);
    if (age === null) {
      setLocalError(`Enter the date of birth shown on ${verifySubject} document.`);
      return;
    }
    setLocalError(null);
    setIdUploaded(false);
    setUploading(true);
    uploadTimer.current = window.setTimeout(() => {
      setUploading(false);
      if (age < 18) {
        if (over18) {
          setOver18(false);
          setIdUploaded(false);
          setLocalError("Your ID shows you are under 18. Switched to “Under 18” — please add a parent or guardian.");
        } else {
          setLocalError("The guardian's ID shows they are under 18. A guardian must be a verified adult.");
        }
        return;
      }
      setIdUploaded(true);
    }, 1500);
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLocalError(null);
    if (!pwLongEnough) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setLocalError("Passwords do not match.");
      return;
    }
    if (!over18 && !holderName.trim()) {
      setLocalError("Enter the player's name.");
      return;
    }
    if (!over18 && !guardianName.trim()) {
      setLocalError("Enter the parent or guardian's full name.");
      return;
    }
    if (!idUploaded) {
      setLocalError(`Please add and verify ${verifySubject} ID document first.`);
      return;
    }

    const emailValue = newEmail.trim();
    if (over18) {
      onRegister({
        username: emailValue,
        password: newPassword,
        idType,
        over18: true,
        holderName: holderName.trim() || undefined,
      });
    } else {
      onRegister({
        username: emailValue,
        password: newPassword,
        idType,
        over18: false,
        holderName: holderName.trim(),
        guardian: { name: guardianName.trim(), email: emailValue, idType },
        allowMatureGames: allowMature,
      });
    }
  }

  const shownError = localError ?? error;

  return (
    <div className="auth">
      <div className="auth__toggle">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <aside className="auth__brand">
        <div className="auth__brand-inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">◈</span>
            <span className="brand__name">Trust Platform</span>
          </div>
          <h1 className="auth__headline">
            One identity.
            <br />
            One reliability score.
          </h1>
          <p className="auth__tagline">
            Your conduct and trust follow you across every linked game — transparent,
            source-attributed and always in your control.
          </p>
          <ul className="auth__points">
            <li><span aria-hidden="true">✦</span> A global trust score, visible at all times</li>
            <li><span aria-hidden="true">✦</span> Source-attributed cases &amp; a full activity log</li>
            <li><span aria-hidden="true">✦</span> Cross-game warnings &amp; fair due-process appeals</li>
          </ul>
          <p className="auth__scope muted">Dissertation prototype · synthetic data only</p>
        </div>
      </aside>

      <main className="auth__panel">
        <div className="auth__card">
          <div className="segmented" role="tablist" aria-label="Sign in or create account">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={`segmented__btn ${mode === "signin" ? "is-active" : ""}`}
              onClick={() => switchMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "create"}
              className={`segmented__btn ${mode === "create" ? "is-active" : ""}`}
              onClick={() => switchMode("create")}
            >
              Create account
            </button>
          </div>

          {mode === "signin" ? (
            <form className="auth__form" onSubmit={handleSignIn} aria-label="Sign in">
              <h2>Welcome back</h2>
              <p className="muted">Sign in to see your reliability across games.</p>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <div className="password-wrap">
                  <input
                    type={showSignInPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowSignInPw((v) => !v)}
                    aria-label={showSignInPw ? "Hide password" : "Show password"}
                  >
                    {showSignInPw ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              {shownError && <p className="alert alert--error" role="alert">{shownError}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
              <div className="auth__hint-row">
                <p className="muted auth__hint">
                  Demo account: <code>{DEMO_USER}</code> / <code>demo-password</code>
                </p>
                {!isUsingDemo && (
                  <button
                    type="button"
                    className="linkbtn auth__hint"
                    onClick={() => {
                      setEmail(DEMO_USER);
                      setPassword(DEMO_PASS);
                    }}
                  >
                    Fill demo login
                  </button>
                )}
              </div>
            </form>
          ) : (
            <form className="auth__form" onSubmit={handleCreate} aria-label="Create account">
              <h2>Create your account</h2>
              <p className="muted">Set your details and verify an ID. Under 18s need a parent or guardian.</p>

              <p className="step-heading"><span className="step-heading__num">1</span> Age check</p>
              <fieldset className="agegate">
                <legend>Are you 18 or over?</legend>
                <div className="agegate__opts">
                  <button
                    type="button"
                    className={`agegate__btn ${over18 ? "is-active" : ""}`}
                    aria-pressed={over18}
                    onClick={() => setOver(true)}
                  >
                    Yes, I'm 18+
                  </button>
                  <button
                    type="button"
                    className={`agegate__btn ${!over18 ? "is-active" : ""}`}
                    aria-pressed={!over18}
                    onClick={() => setOver(false)}
                  >
                    No, I'm under 18
                  </button>
                </div>
              </fieldset>

              <p className="step-heading"><span className="step-heading__num">2</span> Account details</p>
              {!over18 && (
                <label className="field">
                  <span>Player's name</span>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="The young player's name"
                    required
                  />
                </label>
              )}

              <label className="field">
                <span>{over18 ? "Email" : "Parent or guardian's email"}</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="username"
                  placeholder={over18 ? "you@example.com" : "parent@example.com"}
                  required
                />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>Password</span>
                  <div className="password-wrap">
                    <input
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="8+ characters"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPw((v) => !v)}
                      aria-label={showNewPw ? "Hide password" : "Show password"}
                    >
                      {showNewPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                <label className="field">
                  <span>Confirm password</span>
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    required
                  />
                </label>
              </div>
              {(newPassword.length > 0 || confirm.length > 0) && (
                <div className="pw-checks" aria-live="polite">
                  <span className={`pw-check ${pwLongEnough ? "is-ok" : ""}`}>
                    {pwLongEnough ? "✓" : "○"} 8+ characters
                  </span>
                  <span className={`pw-check ${pwMatches ? "is-ok" : ""}`}>
                    {pwMatches ? "✓" : "○"} Passwords match
                  </span>
                </div>
              )}

              {!over18 && (
                <div className="guardian">
                  <p className="guardian__lead">
                    <span className="guardian__badge">Parental access</span>
                    A parent or guardian vouches for this account with their own verified ID.
                  </p>
                  <label className="field">
                    <span>Parent or guardian's full name</span>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="As shown on their ID"
                      required
                    />
                  </label>
                </div>
              )}

              <p className="step-heading"><span className="step-heading__num">3</span> Identity verification</p>
              <div className="idverify">
                <div className="field-grid">
                  <label className="field">
                    <span>{over18 ? "Identity document" : "Guardian's identity document"}</span>
                    <select
                      value={idType}
                      onChange={(e) => {
                        setIdType(e.target.value as IdDocumentType);
                        setIdUploaded(false);
                      }}
                    >
                      {ID_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Date of birth on document</span>
                    <input
                      type="date"
                      value={dobOnId}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        setDobOnId(e.target.value);
                        setIdUploaded(false);
                      }}
                      required
                    />
                  </label>
                </div>

                <div className={`idverify__drop ${idUploaded ? "is-done" : ""} ${uploading ? "is-busy" : ""}`}>
                  {uploading ? (
                    <div className="idverify__status" role="status" aria-live="polite">
                      <span className="spinner" aria-hidden="true" />
                      <span>Scanning &amp; verifying {verifySubject} {selectedId.label.toLowerCase()}…</span>
                    </div>
                  ) : idUploaded ? (
                    <div className="idverify__status idverify__status--done" role="status" aria-live="polite">
                      <span aria-hidden="true">✓</span>
                      <span><strong>{selectedId.label}</strong> verified · adult confirmed</span>
                      <button type="button" className="linkbtn" onClick={() => setIdUploaded(false)}>Replace</button>
                    </div>
                  ) : (
                    <>
                      <p className="idverify__hint">{selectedId.hint} · demo only, nothing is uploaded</p>
                      <button type="button" className="btn btn--ghost" onClick={startIdUpload}>
                        Add &amp; verify ID
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!over18 && (
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={allowMature}
                    onChange={(e) => setAllowMature(e.target.checked)}
                  />
                  <span>
                    As the parent or guardian, I allow this account to connect games rated 18+.
                    <span className="muted"> Leave unticked to block 18+ games until they turn 18.</span>
                  </span>
                </label>
              )}

              {shownError && <p className="alert alert--error" role="alert">{shownError}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={busy || uploading}>
                {busy ? "Creating account…" : over18 ? "Create account" : "Create parental account"}
              </button>
              <p className="muted auth__hint">
                ID verification is simulated for this prototype — no document is stored or scanned.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
