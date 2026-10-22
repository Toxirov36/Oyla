-- Sliding-window AI quotas are persisted in PostgreSQL instead of expiring Redis counters.
CREATE TABLE "AiUsage" (
  "id" UUID NOT NULL,
  "scope" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiUsage_scope_createdAt_idx" ON "AiUsage"("scope", "createdAt");

-- Profile photos may live in object storage; existing rows keep their inline bytes.
ALTER TABLE "ProfilePhoto" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "ProfilePhoto" ALTER COLUMN "data" DROP NOT NULL;
