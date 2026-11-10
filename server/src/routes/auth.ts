import {
  Router,
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import passport from "../config/passport.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const authRouter = Router();

const clientOrigin = new URL(
  process.env.CLIENT_URL ?? "http://localhost:5173",
).origin;

type GoogleFailure =
  | "google"
  | "google-cancelled"
  | "google-session"
  | "google-email-in-use";

/** Return to the sign-in screen even if the browser lost its OAuth session. */
function redirectGoogleFailure(req: Request, res: Response, reason: GoogleFailure) {
  delete req.session.frontendReturnTo;
  res.redirect(clientOrigin + "/signin?error=" + reason);
}

authRouter.get(
  "/google",
  // Remember only local frontend paths before redirecting to the Google provider.
  (req, _res, next) => {
    const returnTo = req.query.returnTo;
    if (
      typeof returnTo === "string" &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//") &&
      !/[\\\r\n]/.test(returnTo) &&
      returnTo.length <= 2000
    ) {
      req.session.frontendReturnTo = returnTo;
    } else {
      delete req.session.frontendReturnTo;
    }
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

authRouter.get("/google/callback", (req, res, next) => {
  if (req.query.error === "access_denied") {
    redirectGoogleFailure(req, res, "google-cancelled");
    return;
  }
  if (!req.query.code && !req.query.error) {
    redirectGoogleFailure(req, res, "google-session");
    return;
  }

  passport.authenticate("google", (error: unknown, user?: Express.User | false | null, info?: unknown) => {
    if (error) {
      console.error("Google authentication request failed");
      redirectGoogleFailure(req, res, "google");
      return;
    }
    if (!user) {
      let reason: GoogleFailure = "google";
      if (info && typeof info === "object") {
        if ("code" in info && info.code === "email-in-use") {
          reason = "google-email-in-use";
        } else if (
          "message" in info &&
          typeof info.message === "string" &&
          info.message.includes("authorization request state")
        ) {
          reason = "google-session";
        }
      }
      redirectGoogleFailure(req, res, reason);
      return;
    }

    // Passport regenerates the session on login, so read the return path first.
    const returnTo = req.session.frontendReturnTo;
    req.logIn(user, (loginError) => {
      if (loginError) {
        console.error("Google sign-in session could not be saved");
        redirectGoogleFailure(req, res, "google");
        return;
      }
      res.redirect(returnTo ? clientOrigin + returnTo : "/api/v1/auth/me");
    });
  })(req, res, next);
});

authRouter.get("/failure", (req, res) => {
  redirectGoogleFailure(req, res, "google");
});

authRouter.get("/me", requireAuth, (req, res) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "You are not signed in",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      profilePicture: req.user.profilePicture,
      role: req.user.role,
    },
  });
});

authRouter.post("/logout", requireAuth, (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) {
      next(logoutError);
      return;
    }

    req.session.destroy((sessionError) => {
      if (sessionError) {
        next(sessionError);
        return;
      }

      res.status(200).json({
        success: true,
        message: "You have been signed out",
      });
    });
  });
});

const handleAuthError: ErrorRequestHandler = (_error, _req, res, _next) => {
  console.error("Authentication request failed");

  res.status(500).json({
    success: false,
    message: "Unable to complete authentication",
  });
};

authRouter.get("/admin-check", requireAdmin, (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Administrator access granted",
  });
});

authRouter.use(handleAuthError);

export default authRouter;
