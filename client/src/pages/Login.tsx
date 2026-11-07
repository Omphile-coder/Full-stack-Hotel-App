import goldClover from "../assets/gold-clover.png";
import { FcGoogle } from "react-icons/fc";
import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  Link,
  NavLink,
  Navigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { PasswordField } from "../components/guest/PasswordField";
import { Feedback, Field } from "../components/shared/Shared";
import { useSession } from "../hooks/useSession";
import { accountDestination, safeReturnPath } from "../lib/auth";
import { submitCredentials } from "../lib/credentials";

/** Keep form validation and pending feedback local to the selected login or sign-up tab. */
function CredentialsForm({
  signup,
  callback,
  query,
}: {
  signup: boolean;
  callback: string;
  query: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [mismatch, setMismatch] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setError(undefined);
    const passwordsDiffer =
      signup && fields.get("password") !== fields.get("confirmPassword");
    setMismatch(passwordsDiffer);
    if (passwordsDiffer) return;
    fields.delete("confirmPassword");
    setBusy(true);
    try {
      await submitCredentials(signup ? "register" : "login", fields);
      // Reload the app to read the new session and discard the previous account's cached data.
      window.location.replace(callback);
    } catch (requestError) {
      setError(requestError);
      setBusy(false);
    }
  }

  return (
    <form className="stack auth-form" onSubmit={submit}>
      {signup && (
        <Field label="Full name">
          <input name="name" autoComplete="name" maxLength={100} required />
        </Field>
      )}
      <Field label="Email">
        <input
          type="email"
          name="email"
          autoComplete="username"
          maxLength={254}
          required
        />
      </Field>
      <PasswordField label="Password" newPassword={signup} />
      {signup ? (
        <>
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            newPassword
          />
          <p className="auth-help">Use at least 15 characters.</p>
        </>
      ) : (
        <Link
          className="explore-link forgot-password"
          to={"/forgot-password" + query}
        >
          Forgot password?
        </Link>
      )}
      {mismatch && (
        <p className="notice error" role="alert">
          The passwords must match.
        </p>
      )}
      <Feedback error={error} />
      <button className="button full" disabled={busy}>
        {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
      </button>
    </form>
  );
}

/** Email and Google sign-in both return through the existing account routing flow. */
export function Login() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const signup = pathname === "/register";
  const session = useSession();
  const next = safeReturnPath(params.get("next"));
  const [starting, setStarting] = useState(false);
  const query = next ? "?next=" + encodeURIComponent(next) : "";
  const callback = "/auth/callback" + query;

  function signInWithGoogle() {
    setStarting(true);
    session.startGoogle(callback);
  }

  if (params.get("complete") === "1") return <Navigate to={callback} replace />;
  return (
    <main className="section auth-page" id="main" tabIndex={-1}>
      <section className="auth-card stack">
        <p className="wordmark guest-wordmark">
          <img src={goldClover} alt="" width={128} height={128} />
          Black Clover
        </p>
        <p className="eyebrow">HOTELS & HOSPITALITY</p>
        <h1>{signup ? "Create your account" : "Welcome back"}</h1>
        <nav className="auth-tabs" aria-label="Account access">
          <NavLink to={"/signin" + query} className={!signup ? "active" : ""}>
            Log in
          </NavLink>
          <NavLink to={"/register" + query} className={signup ? "active" : ""}>
            Sign up
          </NavLink>
        </nav>
        {params.get("error") && (
          <p className="notice error" role="alert">
            Google sign-in could not be completed. Please try again.
          </p>
        )}
        {params.get("reset") === "1" && (
          <p className="notice success" role="status">
            Password updated. You can now log in.
          </p>
        )}
        <CredentialsForm
          key={pathname}
          signup={signup}
          callback={callback}
          query={query}
        />
        <p className="auth-divider" aria-hidden="true">
          or
        </p>
        <button
          className="button outline full"
          disabled={starting}
          onClick={signInWithGoogle}
        >
          <FcGoogle className="ui-icon google-icon" aria-hidden="true" />
          {starting ? "Opening Google…" : "Continue with Google"}
        </button>
        {session.user && (
          <Link
            className="button outline full"
            to={accountDestination(session.user, next)}
          >
            Continue as {session.user.name}
          </Link>
        )}
      </section>
      <Link className="explore-link" to="/hotels">
        <ArrowLeft className="ui-icon" aria-hidden="true" /> Back to our
        locations
      </Link>
    </main>
  );
}
