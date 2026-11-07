import { useEffect, useRef } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Feedback, Heading } from "../components/shared/Shared";
import { api } from "../lib/api";

/** Paystack returns a reference; the server checks ownership, currency, amount, and payment status. */
export function PaymentCallback() {
  const [params] = useSearchParams();
  const reference = params.get("reference") || params.get("trxref") || "";
  const [verifyPayment, state] = api.useVerifyPaymentMutation();
  const attempted = useRef("");
  useEffect(() => {
    if (!reference || attempted.current === reference) return;
    attempted.current = reference;
    void verifyPayment(reference);
  }, [reference, verifyPayment]);
  const data = state.originalArgs === reference ? state.data : undefined;
  const error = state.originalArgs === reference ? state.error : undefined;
  if (data?.status === "COMPLETED")
    return <Navigate to={"/bookings/" + data.bookingId} replace />;
  let title = "Checking your payment.";
  if (!reference) title = "Payment reference missing.";
  else if (error) title = "We could not check your payment.";
  else if (data?.status === "PENDING")
    title = "Payment is awaiting confirmation.";
  else if (data?.status === "FAILED") title = "Payment was not completed.";

  return (
    <main className="section form-page" id="main" tabIndex={-1}>
      <Heading eyebrow="YOUR PAYMENT">{title}</Heading>
      {!reference ? (
        <p className="notice error" role="alert">
          No payment reference was provided. Open your reservation to check its
          status.
        </p>
      ) : (
        <>
          <Feedback loading={state.isLoading} error={error} />
          {data?.status === "PENDING" && (
            <p className="notice">
              Payment has not been confirmed yet. You can check again or return
              to your reservation.
            </p>
          )}
          {data?.status === "FAILED" && (
            <p className="notice">
              Return to your reservation to retry secure payment.
            </p>
          )}
          <button
            className="button"
            disabled={state.isLoading}
            onClick={() => verifyPayment(reference)}
          >
            Check payment status
          </button>
          {data && (
            <Link className="button outline" to={"/bookings/" + data.bookingId}>
              View reservation
            </Link>
          )}
        </>
      )}
      <Link className="button outline" to="/bookings">
        My bookings
      </Link>
    </main>
  );
}
