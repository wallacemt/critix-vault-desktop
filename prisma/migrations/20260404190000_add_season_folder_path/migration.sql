-- Add optional folderPath to seasons for per-season local path overrides
ALTER TABLE "seasons" ADD COLUMN "folderPath" TEXT;
