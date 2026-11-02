import {
  Router,
  type ErrorRequestHandler,
} from "express";
import passport from "../config/passport.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const authRouter = Router();

authRouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/v1/auth/failure",
  }),
  (_req, res) => {
    res.redirect("/api/v1/auth/me");
  },
);

authRouter.get("/failure", (_req, res) => {
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