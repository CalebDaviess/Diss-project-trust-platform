import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  listAppeals,
  resolveAppeal,
  type AppealView,
  type AppealableSanction,
} from "../../api/accountabilityApi";
import { companyLabel, formatDateTime, formatRelativeTime, offenceLabel, sourceLabel } from "../../features/activity";
import { DEMO_CONTROLS_ENABLED } from "../../features/demo";
import type { TabKey } from "../AppShell";
import { GameLogo } from "../GameLogo";
import { AppealModal } from "../AppealModal";
import { StatDetailDialog } from "../StatDetailDialog";

interface AppealsTabProps {
  token: string;
  onChanged?: () => void;
  onNavigate?: (tab: TabKey) => void;
}

interface PendingDecision {
  appeal: AppealView;
  decision: "approved" | "denied";
}

const STATUS_META: Record<AppealView["status"], { label: string; tone: string }> = {
  submitted: { label: "Under review", tone: "warn" },
  approved: { label: "Approved — overturned", tone: "good" },
  denied: { label: "Denied — upheld", tone: "bad" },
};

function AppealStepper({ status, company }: { status: AppealView["status"]; company: string }) {
  const decided = status !== "submitted";
  return (
    <ol className="appeal-steps" aria-label="Appeal progress">
      <li className="appeal-step is-done">
        <span className="appeal-step__dot" aria-hidden="true">✓</span>
        <span>Submitted</span>
      </li>
      <li className={`appeal-step ${decided ? "is-done" : "is-active"}`}>
        <span className="appeal-step__dot" aria-hidden="true">{decided ? "✓" : "2"}</span>
        <span>Review by {company}</span>
      </li>
      <li
        className={`appeal-step ${
          status === "approved" ? "is-good" : status === "denied" ? "is-bad" : ""
        }`}
      >
        <span className="appeal-step__dot" aria-hidden="true">
          {status === "approved" ? "✓" : status === "denied" ? "!" : "3"}
        </span>
        <span>
          {status === "approved" ? "Overturned" : status === "denied" ? "Upheld" : "Decision"}
        </span>
      </li>
    </ol>
  );
}

export function AppealsTab({ token, onChanged, onNavigate }: AppealsTabProps) {
  const [appealable, setAppealable] = useState<AppealableSanction[]>([]);
  const [appeals, setAppeals] = useState<AppealView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; showAccountLink?: boolean } | null>(null);
  const [appealSanction, setAppealSanction] = useState<AppealableSanction | null>(null);
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await listAppeals(token);
      setAppealable(overview.appealable);
      setAppeals(overview.appeals);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your appeals.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function confirmResolve() {
    if (!pendingDecision) return;
    const { appeal, decision } = pendingDecision;
    const gameName = appeal.gameName ?? appeal.gameId;
    const company = companyLabel(appeal.provider);
    setResolving(appeal.appealId);
    setError(null);
    setNotice(null);
    try {
      await resolveAppeal(token, appeal.appealId, decision);
      setPendingDecision(null);
      await reload();
      onChanged?.();
      setNotice(
        decision === "approved"
          ? {
              text: `Demo outcome: ${company} overturned the sanction for ${gameName} — active ban removed and trust score restored.`,
              showAccountLink: true,
            }
          : {
              text: `Demo outcome: ${company} declined the appeal for ${gameName} — the ban remains upheld on your Account screen.`,
              showAccountLink: true,
            },
      );
    } catch (err) {
      setPendingDecision(null);
      setError(err instanceof ApiError ? err.message : "Could not resolve appeal. Please try again.");
      await reload();
    } finally {
      setResolving(null);
    }
  }

  const modalCompany = pendingDecision ? companyLabel(pendingDecision.appeal.provider) : "";
  const modalGame = pendingDecision ? pendingDecision.appeal.gameName ?? pendingDecision.appeal.gameId : "";

  return (
    <div className="appeals">
      <section className="panel panel--hint">
        <h2>Appeals &amp; due process</h2>
        <p className="muted">
          Contest a confirmed sanction. Your appeal — with your explanation and any evidence — is
          routed to the game company's reviewers (such as Riot Games, Valve, or Battle.net), who
          uphold or overturn it. An overturned sanction is lifted and the trust it cost is restored.
        </p>
      </section>

      {error && <p className="alert alert--error" role="alert">{error}</p>}
      {notice && (
        <div className="alert alert--info alert--row" role="status">
          <span>{notice.text}</span>
          <div className="alert__actions">
            {notice.showAccountLink && onNavigate && (
              <button type="button" className="linkbtn" onClick={() => onNavigate("account")}>
                View Account →
              </button>
            )}
            <button type="button" className="alert__dismiss" aria-label="Dismiss notice" onClick={() => setNotice(null)}>
              ×
            </button>
          </div>
        </div>
      )}

      <section className="panel">
        <div className="panel__head">
          <h2>Open to appeal</h2>
          <span className="chip chip--muted">{appealable.length}</span>
        </div>
        {loading ? (
          <div className="skeleton-stack" aria-busy="true">
            <div className="skeleton skeleton--row" />
          </div>
        ) : appealable.length === 0 ? (
          <div className="goodstate">
            <span className="goodstate__icon" aria-hidden="true">✓</span>
            <p>No sanctions open to appeal. Confirmed appealable offences will appear here with an Appeal button.</p>
          </div>
        ) : (
          <ul className="appealable-list">
            {appealable.map((s) => (
              <li key={s.connectionId} className="appealable-item">
                <GameLogo src={s.imageUrl} appId={s.gameId} name={s.gameName ?? s.gameId} provider={s.provider} width={84} />
                <div className="appealable-item__body">
                  <span className="appealable-item__game">{s.gameName ?? s.gameId}</span>
                  <span className="muted">
                    {offenceLabel(s.offenceType)} · {s.source ? sourceLabel(s.source) : "Detected"} · reviewed by{" "}
                    <strong>{companyLabel(s.provider, s.operatorId)}</strong>
                  </span>
                </div>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setAppealSanction(s)}>
                  Appeal
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Your appeals</h2>
          <span className="chip chip--muted">{appeals.length}</span>
        </div>
        {loading ? (
          <div className="skeleton-stack" aria-busy="true">
            <div className="skeleton skeleton--row" />
          </div>
        ) : appeals.length === 0 ? (
          <p className="muted">You haven't submitted any appeals yet.</p>
        ) : (
          <ul className="appeal-cards">
            {appeals.map((a) => {
              const meta = STATUS_META[a.status];
              const gameLabel = a.gameName ?? a.gameId;
              const company = companyLabel(a.provider);
              return (
                <li key={a.appealId} className="appeal-card">
                  <GameLogo src={a.imageUrl} appId={a.gameId} name={gameLabel} provider={a.provider} width={84} />
                  <div className="appeal-card__body">
                    <span className="appeal-card__head">
                      <strong>{gameLabel}</strong>
                      <span className={`feed__badge feed__badge--${meta.tone}`}>{meta.label}</span>
                    </span>
                    <span className="muted appeal-card__meta" title={formatDateTime(a.submittedAt)}>
                      {offenceLabel(a.offenceType)} · submitted {formatRelativeTime(a.submittedAt)}
                      {a.evidenceCount > 0 ? ` · ${a.evidenceCount} attachment${a.evidenceCount === 1 ? "" : "s"}` : ""}
                    </span>
                    <AppealStepper status={a.status} company={company} />
                    {a.status === "submitted" && (
                      <p className="appeal-card__routed">
                        We've sent your appeal request off for review by <strong>{company}</strong>.
                        <span className="muted"> (Prototype — nothing is sent externally.)</span>
                      </p>
                    )}
                    <p className="appeal-card__desc">{a.description}</p>
                    {a.decisionNote && a.status !== "submitted" && (
                      <div className={`appeal-card__decisionbox appeal-card__decisionbox--${meta.tone}`}>
                        <strong>{company} reviewer:</strong> {a.decisionNote}
                      </div>
                    )}
                  </div>
                  {DEMO_CONTROLS_ENABLED && a.status === "submitted" && (
                    <div className="appeal-card__resolve">
                      <span className="muted appeal-card__devlabel">Demo: simulate {company} decision</span>
                      <div className="appeal-card__resolvebtns">
                        <button
                          type="button"
                          className="btn btn--good btn--sm"
                          disabled={resolving === a.appealId}
                          onClick={() => setPendingDecision({ appeal: a, decision: "approved" })}
                        >
                          Accept appeal
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={resolving === a.appealId}
                          onClick={() => setPendingDecision({ appeal: a, decision: "denied" })}
                        >
                          Decline appeal
                        </button>
                      </div>
                    </div>
                  )}
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
            const company = companyLabel(appealSanction.provider, appealSanction.operatorId);
            setAppealSanction(null);
            setNotice({
              text: `We've sent your appeal request for ${gameLabel} off for review by ${company} (simulated for demo — nothing is sent externally).`,
              showAccountLink: true,
            });
            void reload();
            onChanged?.();
          }}
        />
      )}

      {pendingDecision && (
        <StatDetailDialog
          title={
            pendingDecision.decision === "approved"
              ? "Demo simulation — Accept appeal"
              : "Demo simulation — Decline appeal"
          }
          subtitle={`${modalGame} · ${modalCompany}`}
          onClose={() => {
            if (!resolving) setPendingDecision(null);
          }}
        >
          <div className="demo-confirm">
            <div className="demo-confirm__warn" role="note">
              <strong>Dummy demo behaviour only</strong>
              <p className="muted">
                This button simulates a response from <strong>{modalCompany}</strong> so you can test
                the full appeal lifecycle in this dissertation prototype. Nothing is actually sent to{" "}
                {modalCompany} or any external game company.
              </p>
            </div>
            <p className="demo-confirm__effect">
              {pendingDecision.decision === "approved" ? (
                <>
                  Simulating <strong>Accept appeal</strong> will overturn the sanction for{" "}
                  <strong>{modalGame}</strong>, remove the active ban from your Account and My Record
                  screens, and restore the trust score it cost.
                </>
              ) : (
                <>
                  Simulating <strong>Decline appeal</strong> will uphold the sanction with a sample
                  reviewer note and update the ban status on your Account screen to{" "}
                  <strong>Banned</strong> (appeal declined — final).
                </>
              )}
            </p>
            <div className="demo-confirm__actions">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={resolving !== null}
                onClick={() => setPendingDecision(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${pendingDecision.decision === "approved" ? "btn--good" : "btn--danger"}`}
                disabled={resolving !== null}
                onClick={confirmResolve}
              >
                {resolving
                  ? "Simulating…"
                  : pendingDecision.decision === "approved"
                    ? "Simulate accept (demo)"
                    : "Simulate decline (demo)"}
              </button>
            </div>
          </div>
        </StatDetailDialog>
      )}
    </div>
  );
}
