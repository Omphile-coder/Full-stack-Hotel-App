import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
  }),
);

app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Halden Hotel API is running",
  });
});

export default app;