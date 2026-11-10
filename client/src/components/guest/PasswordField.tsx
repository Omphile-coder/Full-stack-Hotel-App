import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

const minimumNewPasswordLength = 8;

/** Give each password field an independent visibility toggle and a native label. */
export function PasswordField({
  label,
  name = "password",
  newPassword = false,
  showGuide = false,
  error,
}: {
  label: string;
  name?: string;
  newPassword?: boolean;
  showGuide?: boolean;
  error?: string;
}) {
  const id = useId();
  const showLengthHint = newPassword && name === "password";
  const description = [showLengthHint && id + "-hint", error && id + "-error"]
    .filter(Boolean)
    .join(" ");
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={newPassword ? "new-password" : "current-password"}
          minLength={newPassword ? minimumNewPasswordLength : undefined}
          aria-describedby={description || undefined}
          aria-invalid={error ? true : undefined}
          maxLength={128}
        />
        <button
          type="button"
          aria-controls={id}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          onClick={() => setVisible(!visible)}
        >
          {visible ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
      </div>
      {showLengthHint && (
        <p id={id + "-hint"} className="auth-help">
          Use at least {minimumNewPasswordLength} characters. Spaces are allowed.
        </p>
      )}
      {error && (
        <p id={id + "-error"} className="notice error" role="alert">
          {error}
        </p>
      )}
      {showGuide && (
        <details className="auth-help password-guide">
          <summary>How to make a strong password</summary>
          <ul>
            <li>
              <strong>Long.</strong> Choose {minimumNewPasswordLength} or more
              characters.
            </li>
            <li>
              <strong>Random.</strong> Use a generated mix of letters, numbers,
              and symbols, or a passphrase of 4 to 7 unrelated words.
            </li>
            <li>
              <strong>Unique.</strong> Use a different password for each account.
            </li>
          </ul>
        </details>
      )}
    </div>
  );
}
