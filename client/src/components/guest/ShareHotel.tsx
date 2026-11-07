import { useEffect, useState } from "react";
import { Field, Heading } from "../shared/Shared";

/** Focus remains within the gallery-style share overlay until it is dismissed. */
export function ShareDialog({
  name,
  copied,
  copyError,
  onCopy,
  onClose,
}: {
  name: string;
  copied: boolean;
  copyError: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  const [element, setElement] = useState<HTMLDialogElement | null>(null);
  useEffect(() => {
    element?.showModal();
    return () => element?.close();
  }, [element]);
  return (
    <dialog ref={setElement} onCancel={onClose}>
      <Heading eyebrow="SHARE A STAY">A place worth sharing.</Heading>
      <p>{name}</p>
      <Field label="Hotel link">
        <input
          readOnly
          value={window.location.href}
          onFocus={(event) => event.currentTarget.select()}
        />
      </Field>
      <p role="status">
        {copied
          ? "Link copied."
          : copyError
            ? "Select and copy the link above."
            : ""}
      </p>
      <div className="actions">
        <button className="button" onClick={onCopy}>
          Copy link
        </button>
        <button className="button outline" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}
