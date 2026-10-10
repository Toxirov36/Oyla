CREATE TABLE "MemorySetting" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemorySetting_pkey" PRIMARY KEY ("id")
);
