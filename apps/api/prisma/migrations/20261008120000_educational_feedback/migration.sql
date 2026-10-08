ALTER TABLE "Question" ADD COLUMN "feedback" JSONB;
ALTER TABLE "AttemptAnswer" ADD COLUMN "feedback" JSONB;
ALTER TABLE "AttemptAnswer" ADD COLUMN "feedbackSeen" BOOLEAN NOT NULL DEFAULT false;

-- Historical answers already advanced through the old player. Preserve its resume behavior.
UPDATE "AttemptAnswer" SET "feedbackSeen" = true;
