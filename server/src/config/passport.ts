import "dotenv/config";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "./prisma.js";

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = process.env.GOOGLE_CALLBACK_URL;

if (!clientID || !clientSecret || !callbackURL) {
  throw new Error("Missing Google OAuth environment variables");
}

passport.use(
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL,
      state: true,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const oauthProviderId = `google:${profile.id}`;

        const existingUser = await prisma.user.findUnique({
          where: { oauthProviderId },
        });

        if (existingUser) {
          return done(null, existingUser);
        }

        const email = profile.emails?.[0]?.value.trim().toLowerCase();

        const claims = profile._json as {
          email_verified?: boolean;
          verified_email?: boolean;
        };

        const emailIsVerified =
          claims.email_verified === true || claims.verified_email === true;

        if (!email || !emailIsVerified) {
          return done(null, false, {
            message: "A verified Google email is required",
          });
        }

        const emailOwner = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });

        if (emailOwner) {
          return done(null, false, {
            message: "This email already belongs to another account",
            code: "email-in-use",
          });
        }

        const user = await prisma.user.create({
          data: {
            oauthProviderId,
            name: profile.displayName || "Google user",
            email,
            profilePicture: profile.photos?.[0]?.value ?? null,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, { id: user.id, passwordVersion: user.passwordVersion ?? 0 });
});

// Legacy Google sessions store a user ID. Password sessions carry a revocable version.
passport.deserializeUser(
  async (session: string | { id: string; passwordVersion: number }, done) => {
    const id = typeof session === "string" ? session : session.id;
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          profilePicture: true,
          role: true,
          passwordVersion: true,
          oauthProviderId: true,
        },
      });

      if (
        !user ||
        (typeof session === "string"
          ? !user.oauthProviderId
          : user.passwordVersion !== session.passwordVersion)
      ) {
        return done(null, false);
      }
      const {
        oauthProviderId: _provider,
        passwordVersion: _version,
        ...profile
      } = user;
      done(null, profile);
    } catch (error) {
      done(error);
    }
  },
);

export default passport;
