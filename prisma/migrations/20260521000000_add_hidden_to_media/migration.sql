-- Add hidden flag + timestamp to movies and series for user-controlled visibility
ALTER TABLE "movies" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "movies" ADD COLUMN "hiddenAt" DATETIME;

ALTER TABLE "series" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "series" ADD COLUMN "hiddenAt" DATETIME;
