import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  listAppeals,
  resolveAppeal,
  type AppealView,
  type AppealableSanction,
} from "../../api/accountabilityApi";
import { sourceLabel } from "../../features/activity";
import { GameLogo } from "../GameLogo";
import { AppealModal } from "../AppealModal";

interface AppealsTabProps {
  token: string;
  onChanged?: () => void;
}

const STATUS_META: Record<AppealView["status"], { label: string; tone: string }> = {
  submitted: { label: "Under review", tone: "warn" },
  approved: { label: "Approved — overturned", tone: "good" },
  denied: { label: "Denied — upheld", tone: "bad" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function AppealsTab({ token, onChanged }: AppealsTabProps) {
  const [appealable, setAppealable] = useState<AppealableSanction[]>([]);
  const [appeals, setAppeals] = useState<AppealView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appealSanction, setAppealSanction] = useState<AppealableSanction | null>(null);
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

  async function resolve(appealId: string, decision: "approved" | "denied") {
    setResolving(appealId);
    try {
      // No note passed: the operator/reviewer decides the wording. In the demo the backend fills a
      // representative reason (random on a denial), mirroring an operator leaving a comment.
      await resolveAppeal(token, appealId, decision);
      await reload();
      onChanged?.();
    } catch {
      await reload();
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="appeals">
      <section className="panel panel--hint">
        <h2>Appeals &amp; due process</h2>
        <p className="muted">
          Contest a confirmed sanction. Your appeal — with your explanation and any evidence — is sent
          to the game studio's reviewers, who uphold or overturn it. An overturned sanction is lifted
          and the trust it cost is restored.
        </p>
      </section>

      {error && <p className="alert alert--error" role="alert">{error}</p>}

      <section className="panel">
        <div className="panel__head">
          <h2>Open to appeal</h2>
          <span className="chip chip--muted">{appealable.length}</span>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : appealable.length === 0 ? (
          <div className="goodstate">
            <span className="goodstate__icon" aria-hidden="true">✓</span>
            <p>No sanctions to appeal. Confirmed offences would appear here with an Appeal button.</p>
          </div>
        ) : (
          <ul className="appealable-list">
            {appealable.map((s) => (
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
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Your appeals</h2>
          <span className="chip chip--muted">{appeals.length}</span>
        </div>
        {appeals.length === 0 ? (
          <p className="muted">You haven't submitted any appeals yet.</p>
        ) : (
          <ul className="appeal-cards">
            {appeals.map((a) => {
              const meta = STATUS_META[a.status];
              return (
                <li key={a.appealId} className="appeal-card">
                  <GameLogo src={a.imageUrl} appId={a.gameId} name={a.gameName ?? a.gameId} provider={a.provider} width={84} />
                  <div className="appeal-card__body">
                    <span className="appeal-card__head">
                      <strong>{a.gameName ?? a.gameId}</strong>
                      <span className={`feed__badge feed__badge--${meta.tone}`}>{meta.label}</span>
                    </span>
                    <span className="muted appeal-card__meta">
                      {a.offenceType ?? "offence"} · submitted {formatDate(a.submittedAt)}
                      {a.evidenceCount > 0 ? ` · ${a.evidenceCount} attachment(s)` : ""}
                    </span>
                    <p className="appeal-card__desc">{a.description}</p>
                    {a.decisionNote && a.status !== "submitted" && (
                      <p className="muted appeal-card__decision">Reviewer: {a.decisionNote}</p>
                    )}
                  </div>
                  {import.meta.env.DEV && a.status === "submitted" && (
                    <div className="appeal-card__resolve">
                      <span className="muted appeal-card__devlabel">Simulate studio review:</span>
                      <button type="button" className="btn btn--ghost btn--sm" disabled={resolving === a.appealId} onClick={() => resolve(a.appealId, "approved")}>
                        Approve
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" disabled={resolving === a.appealId} onClick={() => resolve(a.appealId, "denied")}>
                        Deny
                      </button>
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
            setAppealSanction(null);
            void reload();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
