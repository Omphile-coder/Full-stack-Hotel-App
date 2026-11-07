import { createHash, randomBytes } from "node:crypto";
import { Router, type Request, type RequestHandler } from "express";
import { ApiError, object, string } from "../api.js";
import prisma from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { hashPassword, matchesPassword } from "../services/password.js";

const sessionUser = { id: true, name: true, email: true, profilePicture: true, role: true, passwordVersion: true } as const;
const resetLifetimeMs = 30 * 60 * 1000;

/** Use the same normalized email format as Google account registration. */
function emailAddress(value: unknown) {
  const email = string(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "Enter a valid email address.");
  return email;
}

/** Preserve passwords exactly as entered, including any spaces. */
function passwordInput(value: unknown, minimum: number) {
  if (typeof value !== "string" || value.length < minimum || value.length > 128) {
    throw new ApiError(400, minimum > 1 ? "Choose a password with 15 to 128 characters." : "Enter your password.");
  }
  return value;
}

/** Bound attempts per client and keep a fixed memory budget for the limiter. */
function limitAttempts(maxAttempts: number): RequestHandler {
  const windowMs = 15 * 60 * 1000;
  let renewAt = Date.now() + windowMs;
  const attempts = new Map<string, number>();
  return (req, res, next) => {
    const now = Date.now();
    if (now >= renewAt) {
      attempts.clear();
      renewAt = now + windowMs;
    }
    const client = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const count = attempts.get(client) ?? 0;
    if (count >= maxAttempts || (count === 0 && attempts.size >= 5000)) {
      res.set("Retry-After", String(Math.ceil((renewAt - now) / 1000)));
      return next(new ApiError(429, "Too many attempts. Please try again later."));
    }
    attempts.set(client, count + 1);
    res.set("Cache-Control", "no-store");
    if (!req.is("application/json")) return next(new ApiError(415, "Send a JSON request."));
    next();
  };
}

/** Passport regenerates the session ID and stores the same cookie as Google sign-in. */
function establishSession(req: Request, user: Express.User) {
  return new Promise<void>((resolve, reject) => req.logIn(user, error => {
    if (error) reject(error);
    else resolve();
  }));
}

/** Keep raw recovery tokens out of the database and use the configured frontend URL. */
function tokenDigest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function deliverReset(email: string, apiKey: string, sender: string, url: URL) {
  const now = new Date();
  const token = randomBytes(32).toString("hex");
  const resetTokenHash = tokenDigest(token);
  const resetTokenExpiresAt = new Date(now.getTime() + resetLifetimeMs);
  const cooldown = new Date(resetTokenExpiresAt.getTime() - 60_000);
  const { count } = await prisma.user.updateMany({
    where: { email, passwordHash: { not: null }, OR: [{ resetTokenExpiresAt: null }, { resetTokenExpiresAt: { lte: cooldown } }] },
    data: { resetTokenHash, resetTokenExpiresAt },
  });
  if (!count) return;
  // A fragment keeps the token out of server access logs and referrer headers.
  url.hash = new URLSearchParams({ token }).toString();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ from: sender, to: [email], subject: "Reset your Black Clover password",
        text: `Open this link within 30 minutes to reset your password:\n\n${url.href}\n\nIf you did not request this, you can ignore this email.` }),
    });
    if (!response.ok) throw new Error("Password reset delivery failed");
  } catch (error) {
    await prisma.user.updateMany({ where: { email, resetTokenHash }, data: { resetTokenHash: null, resetTokenExpiresAt: null } });
    throw error;
  }
}

export const passwordAuth = Router();

passwordAuth.post("/register", limitAttempts(8), async (req, res) => {
  const body = object(req.body);
  const name = string(body.name, "Full name", 100);
  const email = emailAddress(body.email);
  const password = passwordInput(body.password, 15);
  const duplicate = new ApiError(409, "An account already uses this email. Sign in with your original method.");
  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (existing) throw duplicate;
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "USER" }, select: sessionUser,
  }).catch(error => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw duplicate;
    throw error;
  });
  await establishSession(req, user);
  res.status(201).json({ success: true });
});

passwordAuth.post("/login", limitAttempts(12), async (req, res) => {
  const body = object(req.body);
  const email = emailAddress(body.email);
  const password = passwordInput(body.password, 1);
  const account = await prisma.user.findUnique({ where: { email }, select: { ...sessionUser, passwordHash: true } });
  const matches = await matchesPassword(password, account?.passwordHash);
  if (!account || !matches) throw new ApiError(401, "Email or password is incorrect.");
  const { passwordHash: _passwordHash, ...user } = account;
  await establishSession(req, user);
  res.json({ success: true });
});

passwordAuth.post("/forgot-password", limitAttempts(5), (req, res) => {
  const email = emailAddress(object(req.body).email);
  const key = process.env.RESEND_API_KEY?.trim();
  const sender = process.env.AUTH_EMAIL_FROM?.trim();
  if (!key || !sender) throw new ApiError(503, "Password reset email is unavailable. Please contact the hotel for help.");
  const url = new URL("/reset-password", process.env.CLIENT_URL ?? "http://localhost:5173");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new ApiError(503, "Password reset email is unavailable. Please contact the hotel for help.");
  }
  // Return the same response before looking up the account or sending email.
  res.status(202).json({ success: true });
  void deliverReset(email, key, sender, url).catch(() => console.error("Password reset email delivery failed"));
});

passwordAuth.post("/reset-password", limitAttempts(10), async (req, res) => {
  const body = object(req.body);
  const password = passwordInput(body.password, 15);
  const invalidLink = new ApiError(400, "This reset link is invalid or expired. Request a new one.");
  if (typeof body.token !== "string" || !/^[\da-f]{64}$/.test(body.token)) throw invalidLink;
  const resetTokenHash = tokenDigest(body.token);
  const activeToken = { resetTokenHash, passwordHash: { not: null } };
  const user = await prisma.user.findFirst({ where: { ...activeToken, resetTokenExpiresAt: { gt: new Date() } }, select: { id: true } });
  if (!user) throw invalidLink;
  const passwordHash = await hashPassword(password);
  // A single conditional update consumes the token and invalidates existing sessions.
  const result = await prisma.user.updateMany({
    where: { id: user.id, ...activeToken, resetTokenExpiresAt: { gt: new Date() } },
    data: { passwordHash, passwordVersion: { increment: 1 }, resetTokenHash: null, resetTokenExpiresAt: null },
  });
  if (!result.count) throw invalidLink;
  res.json({ success: true });
});
