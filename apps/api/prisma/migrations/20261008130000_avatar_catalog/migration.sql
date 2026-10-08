CREATE TABLE "Avatar" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Avatar_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Avatar_active_position_idx" ON "Avatar"("active", "position");
ALTER TABLE "User" ADD COLUMN "avatarId" UUID;
ALTER TABLE "User" ADD CONSTRAINT "User_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
INSERT INTO "Avatar" ("id", "name", "imageUrl", "position") VALUES
('a7010000-0000-4000-8000-000000000001', 'Tulki', '/avatars/fox.svg', 0),
('a7010000-0000-4000-8000-000000000002', 'Mushuk', '/avatars/cat.svg', 1),
('a7010000-0000-4000-8000-000000000003', 'Panda', '/avatars/panda.svg', 2),
('a7010000-0000-4000-8000-000000000004', 'Ayiq', '/avatars/bear.svg', 3),
('a7010000-0000-4000-8000-000000000005', 'Quyon', '/avatars/rabbit.svg', 4),
('a7010000-0000-4000-8000-000000000006', 'Kuchuk', '/avatars/dog.svg', 5),
('a7010000-0000-4000-8000-000000000007', 'Boyqush', '/avatars/owl.svg', 6),
('a7010000-0000-4000-8000-000000000008', 'Koala', '/avatars/koala.svg', 7),
('a7010000-0000-4000-8000-000000000009', 'Yo‘lbars', '/avatars/tiger.svg', 8),
('a7010000-0000-4000-8000-000000000010', 'Pingvin', '/avatars/penguin.svg', 9),
('a7010000-0000-4000-8000-000000000011', 'Robot', '/avatars/robot.svg', 10),
('a7010000-0000-4000-8000-000000000012', 'Fazogir', '/avatars/astronaut.svg', 11);
