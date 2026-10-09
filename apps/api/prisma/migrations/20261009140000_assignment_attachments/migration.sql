CREATE TABLE "AssignmentAttachment" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssignmentAttachment_storageKey_key" ON "AssignmentAttachment"("storageKey");
CREATE INDEX "AssignmentAttachment_assignmentId_idx" ON "AssignmentAttachment"("assignmentId");

ALTER TABLE "AssignmentAttachment"
ADD CONSTRAINT "AssignmentAttachment_assignmentId_fkey"
FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
