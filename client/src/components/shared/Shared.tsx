import type { PropsWithChildren,ReactNode } from 'react';
import { useEffect,useState } from 'react';
import { errorMessage } from '../../lib/format';

/** Keep headings consistent with the typography and spacing in both Figma prototypes. */
export function Heading({
  eyebrow,
  children,
  subtitle,
}: PropsWithChildren<{ eyebrow: string; subtitle?: string }>) {
  return (
    <div className="heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{children}</h1>
      {subtitle && <p className="muted lead">{subtitle}</p>}
    </div>
  );
}

/** Announce loading or API failures accessibly, with an optional retry action. */
export function Feedback({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: unknown;
  retry?: () => void;
}) {
  if (loading)
    return (
      <p className="notice" role="status">
        Loading…
      </p>
    );
  if (!error) return null;
  return (
    <div className="notice error" role="alert">
      <p>{errorMessage(error)}</p>
      {retry && (
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Reusable form label keeps every native input associated with its visible label. */
export function Field({
  label,
  children,
}: PropsWithChildren<{ label: string }>) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Paginate API collections using the backend's fixed 20-record page size. */
export function Pagination({
  offset,
  count,
  setOffset,
}: {
  offset: number;
  count: number;
  setOffset: (value: number) => void;
}) {
  if (!offset && count < 20) return null;
  return (
    <nav className="actions pagination" aria-label="Pagination">
      <button
        className="button outline"
        disabled={!offset}
        onClick={() => setOffset(Math.max(0, offset - 20))}
      >
        Previous
      </button>
      <span>Page {offset / 20 + 1}</span>
      <button
        className="button outline"
        disabled={count < 20}
        onClick={() => setOffset(offset + 20)}
      >
        Next
      </button>
    </nav>
  );
}

/** Native dialog provides focus trapping, escape-to-close, and return focus automatically. */
export function ConfirmDialog({
  title,
  children,
  onConfirm,
  busy,
  error,
  onClose,
  confirmLabel = "Confirm change",
  cancelLabel = "Go back without saving",
  eyebrow = "REVIEW YOUR CHANGE",
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  busy?: boolean;
  error?: unknown;
  onClose: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  eyebrow?: string;
}) {
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  useEffect(() => {
    dialog?.showModal();
    return () => dialog?.close();
  }, [dialog]);
  return (
    <dialog
      ref={setDialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
      <Feedback error={error} />
      <div className="actions">
        <button className="button" disabled={busy} onClick={onConfirm}>
          {busy ? "Saving…" : confirmLabel}
        </button>
        <button className="button outline" disabled={busy} onClick={onClose}>
          {cancelLabel}
        </button>
      </div>
    </dialog>
  );
}

