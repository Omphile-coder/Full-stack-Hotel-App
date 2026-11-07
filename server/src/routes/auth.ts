import {
  Router,
  type ErrorRequestHandler,
} from "express";
import passport from "../config/passport.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const authRouter = Router();

authRouter.get(
  "/google",
  // Remember only local frontend paths before redirecting to the Google provider.
  (req, _res, next) => {
    const returnTo = req.query.returnTo;
    if (typeof returnTo === "string" && returnTo.startsWith("/") &&
        !returnTo.startsWith("//") && !/[\\\r\n]/.test(returnTo) && returnTo.length <= 2000) {
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

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/v1/auth/failure",
    keepSessionInfo: true,
  }),
  (req, res) => {
    const returnTo = req.session.frontendReturnTo;
    delete req.session.frontendReturnTo;
    if (returnTo) {
      const client = new URL(process.env.CLIENT_URL ?? "http://localhost:5173");
      res.redirect(client.origin + returnTo);
      return;
    }
    res.redirect("/api/v1/auth/me");
  },
);

authRouter.get("/failure", (req, res) => {
  if (req.session.frontendReturnTo) {
    delete req.session.frontendReturnTo;
    const client = new URL(process.env.CLIENT_URL ?? "http://localhost:5173");
    res.redirect(client.origin + "/signin?error=google");
    return;
  }
  res.status(401).json({
    success: false,
    message: "Google sign-in was unsuccessful",
  });
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

const handleAuthError: ErrorRequestHandler = (
  _error,
  _req,
  res,
  _next,
) => {
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
