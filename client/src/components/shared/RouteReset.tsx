import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Restore scroll and focus on page navigation so keyboard users follow the route change. */
export function RouteReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = window.setTimeout(
      () =>
        document
          .querySelector<HTMLElement>("main")
          ?.focus({ preventScroll: true }),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}
