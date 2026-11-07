ALTER TABLE "users"
  ALTER COLUMN "oauthProviderId" DROP NOT NULL,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "passwordVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "resetTokenHash" TEXT,
  ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_resetTokenHash_key" ON "users"("resetTokenHash");
