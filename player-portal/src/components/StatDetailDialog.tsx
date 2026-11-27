import { useEffect, useRef, type ReactNode } from "react";

interface StatDetailDialogProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Accessible modal dialog: Esc + backdrop close, body-scroll lock, initial focus on close. */
export function StatDetailDialog({ title, subtitle, onClose, children }: StatDetailDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    // Only focus the close button if no child inside the dialog (e.g. an autoFocus input) already holds focus.
    if (!dialogRef.current?.contains(document.activeElement)) {
      closeRef.current?.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="modal" role="presentation">
      <div className="modal__backdrop" onClick={onClose} />
      <div ref={dialogRef} className="modal__card" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button ref={closeRef} type="button" className="modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
