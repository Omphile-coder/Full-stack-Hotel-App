import type { RequestHandler } from "express";

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      success: false,
      message: "You must sign in to continue",
    });
    return;
  }

  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      success: false,
      message: "You must sign in to continue",
    });
    return;
  }

  if (req.user.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      message: "Administrator access is required",
    });
    return;
  }

  next();
};