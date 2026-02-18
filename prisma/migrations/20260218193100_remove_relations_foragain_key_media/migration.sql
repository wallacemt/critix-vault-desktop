-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_watch_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaId" TEXT,
    "mediaType" TEXT NOT NULL,
    "episodeId" TEXT,
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "watchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" REAL,
    "completed" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_watch_history" ("completed", "episodeId", "episodeNumber", "id", "mediaId", "mediaType", "progress", "seasonNumber", "watchedAt") SELECT "completed", "episodeId", "episodeNumber", "id", "mediaId", "mediaType", "progress", "seasonNumber", "watchedAt" FROM "watch_history";
DROP TABLE "watch_history";
ALTER TABLE "new_watch_history" RENAME TO "watch_history";
CREATE INDEX "watch_history_mediaId_idx" ON "watch_history"("mediaId");
CREATE INDEX "watch_history_watchedAt_idx" ON "watch_history"("watchedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
