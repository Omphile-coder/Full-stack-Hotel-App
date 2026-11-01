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

        const email = profile.emails?.[0]?.value
          .trim()
          .toLowerCase();

        const claims = profile._json as {
          email_verified?: boolean;
          verified_email?: boolean;
        };

        const emailIsVerified =
          claims.email_verified === true ||
          claims.verified_email === true;

        if (!email || !emailIsVerified) {
          return done(null, false, {
            message: "A verified Google email is required",
          });
        }

        const emailOwner = await prisma.user.findUnique({
          where: { email },
        });

        if (emailOwner) {
          return done(null, false, {
            message: "This email already belongs to another account",
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
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        role: true,
      },
    });

    done(null, user ?? false);
  } catch (error) {
    done(error);
  }
});

export default passport;