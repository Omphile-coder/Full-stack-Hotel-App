import { X } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { ConfirmDialog } from "../components/shared/Shared";
import { api } from "../lib/api";
import { clearStay } from "../lib/bookingDraft";
import type { Confirmation } from "./sessionContext";
import { SessionContext } from "./sessionContext";

/** Share the cookie-backed session, confirmation dialog, and feedback across guest and admin pages. */
export function AppProvider({ children }: PropsWithChildren) {
  const session = api.useMeQuery(undefined, { refetchOnFocus: true });
  const [endSession, logoutState] = api.useLogoutMutation();
  const dispatch = useDispatch();
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<Confirmation | null>(null);
  const confirmation = useRef<((confirmed: boolean) => void) | null>(null);

  const toast = useCallback((message: string) => setNotice(message), []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const confirm = useCallback((options: Confirmation) => {
    confirmation.current?.(false);
    return new Promise<boolean>((resolve) => {
      confirmation.current = resolve;
      setDialog(options);
    });
  }, []);
  const finishConfirmation = useCallback((confirmed: boolean) => {
    confirmation.current?.(confirmed);
    confirmation.current = null;
    setDialog(null);
  }, []);

  const logout = useCallback(async () => {
    await endSession().unwrap();
    dispatch(clearStay());
    dispatch(api.util.resetApiState());
  }, [dispatch, endSession]);

  const value = useMemo(
    () => ({
      user: session.data,
      loading: session.isLoading,
      error: session.error,
      refresh: session.refetch,
      logout,
      logoutPending: logoutState.isLoading,
      logoutError: logoutState.error,
      toast,
      confirm,
    }),
    [
      session.data,
      session.isLoading,
      session.error,
      session.refetch,
      logout,
      logoutState.isLoading,
      logoutState.error,
      toast,
      confirm,
    ],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
      {notice && (
        <div className="app-toast" role="status">
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X className="ui-icon" aria-hidden="true" />
          </button>
        </div>
      )}
      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          confirmLabel={dialog.confirmLabel || "Confirm"}
          cancelLabel="Cancel"
          eyebrow="YOUR ACCOUNT"
          onConfirm={() => finishConfirmation(true)}
          onClose={() => finishConfirmation(false)}
        >
          <p>{dialog.message}</p>
        </ConfirmDialog>
      )}
    </SessionContext.Provider>
  );
}
