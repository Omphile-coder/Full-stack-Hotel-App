import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Feedback, Heading } from "../components/shared/Shared";
import { useSession } from "../hooks/useSession";
import { accountDestination } from "../lib/auth";

/** The backend finishes OAuth and sets the session cookie before this page resolves the user's role. */
export default function GoogleCallback() {
  const session = useSession();
  const [params] = useSearchParams();
  if (session.user)
    return (
      <Navigate
        to={accountDestination(session.user, params.get("next"))}
        replace
      />
    );
  return (
    <main className="section auth-page" id="main" tabIndex={-1}>
      <section className="auth-card stack">
        <Heading eyebrow="YOUR ACCOUNT">
          {session.loading ? "Signing you in…" : "Complete sign-in"}
        </Heading>
        <Feedback
          loading={session.loading}
          error={session.error}
          retry={session.refresh}
        />
        {!session.loading && (
          <Link
            className="button full"
            to={
              "/signin" +
              (params.get("next")
                ? "?next=" + encodeURIComponent(params.get("next")!)
                : "")
            }
          >
            Back to login
          </Link>
        )}
      </section>
    </main>
  );
}
