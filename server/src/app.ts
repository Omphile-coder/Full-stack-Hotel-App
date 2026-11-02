import "dotenv/config";
import express from "express";
import cors from "cors";
import prisma from "./config/prisma.js";
import sessionMiddleware from "./config/session.js";
import passport from "./config/passport.js";
import authRouter from "./routes/auth.js";
import accommodationsRouter from "./routes/accommodations.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

// Load sessions before routes that use req.session.
app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/accommodations", accommodationsRouter);


app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Black Clover Hotel API is running",
  });
});

app.get("/api/v1/health/database", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Database connection successful",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      message: "Database connection unavailable",
    });
  }
});

// Temporary development endpoint for checking session persistence.
if (process.env.NODE_ENV !== "production") {
  app.post("/api/v1/auth/session-check", (req, res, next) => {
    req.session.setupCheckCount =
      (req.session.setupCheckCount ?? 0) + 1;

    req.session.save((error) => {
      if (error) {
        next(error);
        return;
      }

      res.status(200).json({
        success: true,
        message: "PostgreSQL session is working",
        count: req.session.setupCheckCount,
      });
    });
  });
}

export default app;