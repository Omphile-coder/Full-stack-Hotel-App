import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

const minimumNewPasswordLength = 16;

/** Give each password field an independent visibility toggle and a native label. */
export function PasswordField({
  label,
  name = "password",
  newPassword = false,
}: {
  label: string;
  name?: string;
  newPassword?: boolean;
}) {
  const id = useId();
  const showGuide = name === "password";
  const showLengthHint = showGuide && newPassword;
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
          aria-describedby={showLengthHint ? id + "-hint" : undefined}
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
