-- Phase 1: BUG-2 cleanup + schema additions for watch history

-- 1. Add new columns to watch_history
ALTER TABLE "watch_history" ADD COLUMN "positionSeconds" INTEGER;
ALTER TABLE "watch_history" ADD COLUMN "durationSeconds" INTEGER;

-- 2. Create meta table (used by Phase 2 db_generation logic)
CREATE TABLE IF NOT EXISTS "meta" (
    "key"   TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- 3. Delete blanket series rows — these are the BUG-2 corruption source:
--    rows where a whole series was marked watched with no episode coordinates.
DELETE FROM "watch_history"
WHERE "mediaType" = 'SERIES'
  AND "episodeId" IS NULL
  AND "completed" = 1;

-- 4. Deduplicate watch_history rows: keep only the most recent per (mediaId, episodeId).
--    Only rows with non-NULL mediaId are deduplicated (NULL mediaId rows are legacy
--    orphans with no valid key — guard prevents NULL=NULL join failure in SQLite).
DELETE FROM "watch_history"
WHERE "mediaId" IS NOT NULL
  AND "id" NOT IN (
    SELECT "id" FROM "watch_history" wh1
    WHERE "watchedAt" = (
        SELECT MAX("watchedAt")
        FROM "watch_history" wh2
        WHERE wh2."mediaId" = wh1."mediaId"
          AND (
               (wh2."episodeId" = wh1."episodeId")
               OR (wh2."episodeId" IS NULL AND wh1."episodeId" IS NULL)
          )
    )
    AND "id" = (
        SELECT MIN("id")
        FROM "watch_history" wh3
        WHERE wh3."mediaId" = wh1."mediaId"
          AND (
               (wh3."episodeId" = wh1."episodeId")
               OR (wh3."episodeId" IS NULL AND wh1."episodeId" IS NULL)
          )
          AND wh3."watchedAt" = (
              SELECT MAX("watchedAt")
              FROM "watch_history" wh4
              WHERE wh4."mediaId" = wh1."mediaId"
                AND (
                     (wh4."episodeId" = wh1."episodeId")
                     OR (wh4."episodeId" IS NULL AND wh1."episodeId" IS NULL)
                )
          )
    )
);
