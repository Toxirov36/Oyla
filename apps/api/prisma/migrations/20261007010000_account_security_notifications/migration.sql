ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

CREATE TABLE "PasswordResetToken" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdById" UUID,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_consumedAt_idx" ON "PasswordResetToken"("userId", "consumedAt");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
