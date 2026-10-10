CREATE TYPE "MemoryDeckStatus" AS ENUM ('READY', 'ARCHIVED');
CREATE TYPE "MemoryRoundStatus" AS ENUM ('ACTIVE', 'COMPLETED');

CREATE TABLE "MemoryDeck" (
  "id" UUID NOT NULL,
  "grade" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "stage" INTEGER NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'uz',
  "status" "MemoryDeckStatus" NOT NULL DEFAULT 'READY',
  "signature" TEXT NOT NULL,
  "pairs" JSONB NOT NULL,
  "source" TEXT NOT NULL,
  "modelId" TEXT,
  "promptVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemoryDeck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MemoryDeck_signature_key" ON "MemoryDeck"("signature");
CREATE INDEX "MemoryDeck_grade_subject_stage_locale_status_idx" ON "MemoryDeck"("grade", "subject", "stage", "locale", "status");

CREATE TABLE "MemoryGenerationJob" (
  "key" TEXT NOT NULL,
  "grade" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "stage" INTEGER NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'uz',
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "startedAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemoryGenerationJob_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "MemoryGenerationJob_status_updatedAt_idx" ON "MemoryGenerationJob"("status", "updatedAt");

CREATE TABLE "MemoryRound" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "deckId" UUID NOT NULL,
  "grade" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "stage" INTEGER NOT NULL,
  "cards" JSONB NOT NULL,
  "matchedKeys" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "moves" INTEGER NOT NULL DEFAULT 0,
  "status" "MemoryRoundStatus" NOT NULL DEFAULT 'ACTIVE',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemoryRound_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MemoryRound_userId_subject_status_createdAt_idx" ON "MemoryRound"("userId", "subject", "status", "createdAt");
ALTER TABLE "MemoryRound" ADD CONSTRAINT "MemoryRound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemoryRound" ADD CONSTRAINT "MemoryRound_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "MemoryDeck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MemoryGuess" (
  "roundId" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "firstId" UUID NOT NULL,
  "secondId" UUID NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemoryGuess_pkey" PRIMARY KEY ("roundId", "requestId")
);
ALTER TABLE "MemoryGuess" ADD CONSTRAINT "MemoryGuess_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "MemoryRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MemoryProgress" (
  "userId" UUID NOT NULL,
  "subject" TEXT NOT NULL,
  "stage" INTEGER NOT NULL DEFAULT 1,
  "completedRounds" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemoryProgress_pkey" PRIMARY KEY ("userId", "subject")
);
ALTER TABLE "MemoryProgress" ADD CONSTRAINT "MemoryProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
