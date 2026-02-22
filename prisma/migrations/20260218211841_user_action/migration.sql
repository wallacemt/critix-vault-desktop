-- CreateTable
CREATE TABLE "user_action_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actionType" TEXT NOT NULL,
    "folderId" TEXT,
    "mediaId" TEXT,
    "mediaType" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "user_action_history_actionType_idx" ON "user_action_history"("actionType");

-- CreateIndex
CREATE INDEX "user_action_history_timestamp_idx" ON "user_action_history"("timestamp");
