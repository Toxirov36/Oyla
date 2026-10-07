ALTER TYPE "NotificationType" ADD VALUE 'FRIEND';
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');
CREATE TABLE "FriendProfile" (
  "userId" UUID NOT NULL, "inviteCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FriendProfile_pkey" PRIMARY KEY ("userId")
);
CREATE UNIQUE INDEX "FriendProfile_inviteCode_key" ON "FriendProfile"("inviteCode");
ALTER TABLE "FriendProfile" ADD CONSTRAINT "FriendProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "Friendship" (
  "id" UUID NOT NULL, "userLowId" UUID NOT NULL, "userHighId" UUID NOT NULL, "requestedById" UUID NOT NULL,
  "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING', "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Friendship_order_check" CHECK ("userLowId" < "userHighId"),
  CONSTRAINT "Friendship_requester_check" CHECK ("requestedById" IN ("userLowId", "userHighId")),
  CONSTRAINT "Friendship_accepted_check" CHECK (("status"='PENDING' AND "acceptedAt" IS NULL) OR ("status"='ACCEPTED' AND "acceptedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "Friendship_userLowId_userHighId_key" ON "Friendship"("userLowId", "userHighId");
CREATE INDEX "Friendship_userHighId_status_idx" ON "Friendship"("userHighId", "status");
CREATE INDEX "Friendship_requestedById_status_idx" ON "Friendship"("requestedById", "status");
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userLowId_fkey" FOREIGN KEY ("userLowId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userHighId_fkey" FOREIGN KEY ("userHighId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
