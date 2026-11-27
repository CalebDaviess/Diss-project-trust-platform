import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  submitAppeal,
  type AppealableSanction,
  type AppealView,
} from "../api/accountabilityApi";
import { sourceLabel } from "../features/activity";
import { StatDetailDialog } from "./StatDetailDialog";
import { GameLogo } from "./GameLogo";

interface AppealModalProps {
  token: string;
  sanction: AppealableSanction;
  onClose: () => void;
  onSubmitted: (appeal: AppealView) => void;
}

const GROUNDS = [
  { value: "not-me", label: "It wasn't me (account shared / compromised)" },
  { value: "wrong-call", label: "The detection was wrong" },
  { value: "missing-context", label: "Important context was missed" },
  { value: "already-resolved", label: "Already resolved with the game" },
  { value: "other", label: "Other" },
];

/** Appeal form: offence context + grounds + description + mock evidence upload. */
export function AppealModal({ token, sanction, onClose, onSubmitted }: AppealModalProps) {
  const [grounds, setGrounds] = useState("not-me");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (uploadTimer.current) window.clearTimeout(uploadTimer.current);
    };
  }, []);

  function addEvidence(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const names = Array.from(fileList).map((f) => f.name);
    // Mock upload: nothing leaves the browser, we just simulate a short processing delay.
    setUploading(true);
    if (uploadTimer.current) window.clearTimeout(uploadTimer.current);
    uploadTimer.current = window.setTimeout(() => {
      setFiles((prev) => [...prev, ...names]);
      setUploading(false);
    }, 1200);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (description.trim().length < 10) {
      setError("Please describe what happened (at least 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const appeal = await submitAppeal(token, {
        connectionId: sanction.connectionId,
        grounds,
        description: description.trim(),
        evidenceCount: files.length,
      });
      onSubmitted(appeal);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An appeal for this game is already under review.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError("This sanction can no longer be appealed.");
      } else {
        setError("Could not submit your appeal. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <StatDetailDialog
      title="Appeal a sanction"
      subtitle="Your appeal is sent to the game studio's review team"
      onClose={onClose}
    >
      <form className="appeal-form" onSubmit={handleSubmit}>
        <div className="appeal-ctx">
          <GameLogo src={sanction.imageUrl} appId={sanction.gameId} name={sanction.gameName ?? sanction.gameId} provider={sanction.provider} width={96} />
          <div>
            <span className="appeal-ctx__game">{sanction.gameName ?? sanction.gameId}</span>
            <span className="muted appeal-ctx__meta">
              {sanction.offenceType ?? "offence"} ·{" "}
              {sanction.source ? sourceLabel(sanction.source) : "detected"}
              {sanction.score != null ? ` · score ${sanction.score}` : ""}
            </span>
          </div>
          <span className="pill pill--bad">Confirmed</span>
        </div>

        <label className="field">
          <span>Grounds for appeal</span>
          <select value={grounds} onChange={(e) => setGrounds(e.target.value)}>
            {GROUNDS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>What happened?</span>
          <textarea
            className="appeal-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain why this sanction should be reviewed. Be specific — this goes to the studio's reviewers."
            rows={5}
            required
          />
        </label>

        <div className="appeal-evidence">
          <div className="appeal-evidence__head">
            <span>Evidence (optional)</span>
            <label className="btn btn--ghost btn--sm appeal-evidence__add">
              {uploading ? "Adding…" : "+ Add screenshots / clips"}
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                hidden
                onChange={(e) => addEvidence(e.target.files)}
              />
            </label>
          </div>
          {files.length > 0 ? (
            <ul className="appeal-evidence__list">
              {files.map((f, i) => (
                <li key={`${f}-${i}`}>
                  <span aria-hidden="true">📎</span> {f}
                  <button
                    type="button"
                    className="linkbtn"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted appeal-evidence__hint">Prototype: files are listed only — nothing is uploaded.</p>
          )}
        </div>

        {error && <p className="alert alert--error" role="alert">{error}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting || uploading}>
          {submitting ? "Submitting appeal…" : "Submit appeal for review"}
        </button>
        <p className="muted appeal-form__note">
          You'll see this as “Under review” until the studio's reviewers respond.
        </p>
      </form>
    </StatDetailDialog>
  );
}
