import type { ReactNode } from "react";
import type { ProfileView } from "../api/accountabilityApi";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "../hooks/useTheme";

export type TabKey = "dashboard" | "record" | "games" | "appeals" | "account" | "concept";

interface TabDef {
  key: TabKey;
  label: string;
  icon: ReactNode;
}

/** Minimal line icons (stroke uses currentColor so they follow the active/inactive colour). */
const I = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </svg>
  ),
  record: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  ),
  submit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 13a8 8 0 0 1 8-8 8 8 0 0 1 8 8" strokeLinecap="round" />
      <path d="M12 13l5-3M12 13v6" strokeLinecap="round" />
      <circle cx="12" cy="13" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  games: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="11" rx="5.5" />
      <path d="M7 10v4M5 12h4" strokeLinecap="round" />
      <circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  appeals: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v18M7 21h10" strokeLinecap="round" />
      <path d="M5 7h14M5 7l-2.5 5a3 3 0 0 0 5 0L5 7Zm14 0l-2.5 5a3 3 0 0 0 5 0L19 7Z" strokeLinejoin="round" />
      <path d="M12 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  ),
  concept: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3a6 6 0 0 1 4 10.5c-.7.6-1 1.1-1 2V16H9v-.5c0-.9-.3-1.4-1-2A6 6 0 0 1 12 3Z" />
      <path d="M9.5 19h5M10 21h4" strokeLinecap="round" />
    </svg>
  ),
};

const TABS: TabDef[] = [
  { key: "dashboard", label: "Dashboard", icon: I.dashboard },
  { key: "record", label: "My Record", icon: I.record },
  { key: "games", label: "Games", icon: I.games },
  { key: "appeals", label: "Appeals", icon: I.appeals },
  { key: "account", label: "Account", icon: I.account },
  { key: "concept", label: "Concept journeys", icon: I.concept },
];

const TAB_SUBTITLES: Record<TabKey, string> = {
  dashboard: "Your reliability at a glance",
  record: "Reports, verdicts, bans and appeals across your games",
  games: "Link your games and manage connections",
  appeals: "Contest a sanction and track the review",
  account: "Your identity, trust and sanctions",
  concept: "Where the wider product is heading",
};

interface AppShellProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  signedInAs: string;
  profile?: ProfileView | null;
  theme: Theme;
  onToggleTheme: () => void;
  onSignOut: () => void;
  children: ReactNode;
}

function initials(email: string): string {
  const name = email.split("@")[0] ?? email;
  return name.slice(0, 2).toUpperCase();
}

export function AppShell({
  activeTab,
  onTabChange,
  signedInAs,
  profile,
  theme,
  onToggleTheme,
  onSignOut,
  children,
}: AppShellProps) {
  const current = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  const guardianControlled = profile?.guardianControlled ?? false;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand brand">
          <span className="brand__mark" aria-hidden="true">◈</span>
          <span className="brand__name">Trust Platform</span>
        </div>

        <nav className="sidebar__nav" aria-label="Main">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`navitem ${activeTab === tab.key ? "is-active" : ""}`}
              aria-current={activeTab === tab.key ? "page" : undefined}
              onClick={() => onTabChange(tab.key)}
            >
              <span className="navitem__icon">{tab.icon}</span>
              <span className="navitem__label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className={`upsell ${guardianControlled ? "upsell--minor" : ""}`}>
            <p className="upsell__title">{guardianControlled ? "Parent-controlled" : "Identity verified"}</p>
            <p className="upsell__body muted">
              {guardianControlled
                ? `Vouched for by ${profile?.guardianName ?? "a guardian"}. ${profile?.matureAccessAllowed ? "18+ games allowed." : "18+ games blocked."}`
                : "Your trust score follows this verified identity across every linked game."}
            </p>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar__title">
            <h1>{current.label}</h1>
            <p className="muted">{TAB_SUBTITLES[activeTab]}</p>
          </div>
          <div className="topbar__actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <div className="userchip">
              <span className="userchip__avatar" aria-hidden="true">{initials(signedInAs)}</span>
              <span className="userchip__name">{signedInAs}</span>
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </header>

        {guardianControlled && (
          <div className="guardbanner" role="status">
            <span className="guardbanner__icon" aria-hidden="true">🛡️</span>
            <span className="guardbanner__text">
              <strong>Parent-controlled account{profile?.holderName ? ` · ${profile.holderName}` : ""}.</strong>{" "}
              Managed by {profile?.guardianName ?? "a guardian"}.{" "}
              {profile?.matureAccessAllowed ? "18+ games are allowed." : "18+ games are blocked until they turn 18."}
            </span>
          </div>
        )}

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
