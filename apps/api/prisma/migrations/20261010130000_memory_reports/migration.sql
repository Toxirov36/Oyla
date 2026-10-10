CREATE TABLE "MemoryReport" (
  "id" UUID NOT NULL,
  "roundId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "MemoryReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MemoryReport_roundId_userId_key" ON "MemoryReport"("roundId", "userId");
CREATE INDEX "MemoryReport_status_createdAt_idx" ON "MemoryReport"("status", "createdAt");
ALTER TABLE "MemoryReport" ADD CONSTRAINT "MemoryReport_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "MemoryRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemoryReport" ADD CONSTRAINT "MemoryReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
