import "dotenv/config";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const sessionSecret = process.env.SESSION_SECRET;
const databaseUrl = process.env.DATABASE_URL;

if (!sessionSecret) {
  throw new Error("SESSION_SECRET is missing");
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const PgSessionStore = connectPgSimple(session);

const sessionMiddleware = session({
  name: "blackclover.sid",

  store: new PgSessionStore({
    conString: databaseUrl,
    schemaName: "auth",
    tableName: "sessions",
    createTableIfMissing: true,
  }),

  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
});

export default sessionMiddleware;
