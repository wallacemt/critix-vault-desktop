-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mediaCount" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "movies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "overview" TEXT,
    "poster" TEXT,
    "backdrop" TEXT,
    "rating" REAL,
    "year" INTEGER,
    "releaseDate" TEXT,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MOVIE',
    "filePath" TEXT NOT NULL,
    "duration" INTEGER,
    "trailer" TEXT,
    "folderId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "movies_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "overview" TEXT,
    "poster" TEXT,
    "backdrop" TEXT,
    "rating" REAL,
    "year" INTEGER,
    "firstAirDate" TEXT,
    "lastAirDate" TEXT,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SERIES',
    "filePath" TEXT NOT NULL,
    "folderPath" TEXT,
    "numberOfSeasons" INTEGER NOT NULL DEFAULT 0,
    "numberOfEpisodes" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "trailer" TEXT,
    "folderId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "series_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "overview" TEXT,
    "poster" TEXT,
    "episodeCount" INTEGER NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "downloadedEpisodes" INTEGER NOT NULL DEFAULT 0,
    "seriesId" TEXT NOT NULL,
    CONSTRAINT "seasons_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeNumber" INTEGER NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "overview" TEXT,
    "stillPath" TEXT,
    "airDate" TEXT,
    "duration" INTEGER,
    "filePath" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "seasonId" TEXT NOT NULL,
    CONSTRAINT "episodes_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "watch_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "episodeId" TEXT,
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "watchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" REAL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "watch_history_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "movies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "watch_history_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "folders_path_key" ON "folders"("path");

-- CreateIndex
CREATE INDEX "movies_folderId_idx" ON "movies"("folderId");

-- CreateIndex
CREATE INDEX "movies_status_idx" ON "movies"("status");

-- CreateIndex
CREATE INDEX "series_folderId_idx" ON "series"("folderId");

-- CreateIndex
CREATE INDEX "series_status_idx" ON "series"("status");

-- CreateIndex
CREATE INDEX "seasons_seriesId_idx" ON "seasons"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_seriesId_seasonNumber_key" ON "seasons"("seriesId", "seasonNumber");

-- CreateIndex
CREATE INDEX "episodes_seasonId_idx" ON "episodes"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_seasonId_episodeNumber_key" ON "episodes"("seasonId", "episodeNumber");

-- CreateIndex
CREATE INDEX "watch_history_mediaId_idx" ON "watch_history"("mediaId");

-- CreateIndex
CREATE INDEX "watch_history_watchedAt_idx" ON "watch_history"("watchedAt");
