CREATE TYPE "NotificationType" AS ENUM ('ASSIGNMENT', 'BADGE', 'ACCOUNT', 'SECURITY', 'SYSTEM', 'WARNING');
ALTER TABLE "Notification" ADD COLUMN "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM';
UPDATE "Notification" SET "type" = CASE
  WHEN "title" = 'Yangi topshiriq' THEN 'ASSIGNMENT'::"NotificationType"
  WHEN "title" = 'Yangi nishon!' THEN 'BADGE'::"NotificationType"
  WHEN "title" = 'Hisobingiz roli yangilandi' THEN 'ACCOUNT'::"NotificationType"
  WHEN "title" IN ('Parolingiz o‘zgartirildi', 'Parolingiz tiklandi', 'Parolni tiklash so‘rovi') THEN 'SECURITY'::"NotificationType"
  ELSE 'SYSTEM'::"NotificationType" END;
