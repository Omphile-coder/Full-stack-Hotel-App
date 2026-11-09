import { useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { PasswordField } from "../components/guest/PasswordField";
import { Feedback, Field } from "../components/shared/Shared";
import { safeReturnPath } from "../lib/auth";
import { submitCredentials } from "../lib/credentials";

/** Request an email link or use its one-time token to set a new password. */
export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const { hash } = useLocation();
  const [params] = useSearchParams();
  const next = safeReturnPath(params.get("next"));
  const signInQuery = next ? "?next=" + encodeURIComponent(next) : "";
  const token = new URLSearchParams(hash.slice(1)).get("token");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>();
  const [mismatch, setMismatch] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setError(undefined);
    const passwordsDiffer =
      reset && fields.get("password") !== fields.get("confirmPassword");
    setMismatch(passwordsDiffer);
    if (passwordsDiffer) return;
    setBusy(true);
    try {
      if (reset) {
        fields.delete("confirmPassword");
        fields.set("token", token ?? "");
        await submitCredentials("reset-password", fields);
        // Re-read the session after the backend revokes the old password sessions.
        window.location.replace("/signin?reset=1");
      } else {
        await submitCredentials("forgot-password", fields);
        setSent(true);
      }
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section auth-page" id="main" tabIndex={-1}>
      <section className="auth-card stack">
        <h1>{reset ? "Choose a new password" : "Reset your password"}</h1>
        {reset && !token ? (
          <p className="notice error" role="alert">
            Open the reset link from your email to set a new password.
          </p>
        ) : sent ? (
          <p className="notice success" role="status">
            If an email and password account matches that address, you’ll
            receive a reset link shortly.
          </p>
        ) : (
          <form className="stack auth-form" onSubmit={submit}>
            {reset ? (
              <>
                <PasswordField label="New password" newPassword />
                <PasswordField
                  label="Confirm password"
                  name="confirmPassword"
                  newPassword
                />
              </>
            ) : (
              <>
                <p>Enter the email you used to create your password account.</p>
                <Field label="Email">
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                  />
                </Field>
              </>
            )}
            {mismatch && (
              <p className="notice error" role="alert">
                The passwords must match.
              </p>
            )}
            <Feedback error={error} />
            <button className="button full" disabled={busy}>
              {busy
                ? "Please wait…"
                : reset
                  ? "Save new password"
                  : "Send reset link"}
            </button>
          </form>
        )}
        {reset && (
          <Link className="explore-link" to="/forgot-password">
            Request a new reset link
          </Link>
        )}
        <Link className="explore-link" to={"/signin" + signInQuery}>
          Back to log in
        </Link>
      </section>
    </main>
  );
}
