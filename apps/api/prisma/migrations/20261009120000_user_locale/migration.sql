ALTER TABLE "User" ADD COLUMN "preferredLocale" TEXT NOT NULL DEFAULT 'uz';
ALTER TABLE "User" ADD CONSTRAINT "User_preferredLocale_check"
  CHECK ("preferredLocale" IN ('uz', 'ru', 'en'));
