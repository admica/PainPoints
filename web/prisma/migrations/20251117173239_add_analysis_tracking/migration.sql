-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "itemsAnalyzed" INTEGER,
    "batchesProcessed" INTEGER,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    CONSTRAINT "AnalysisRun_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Flow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastAnalyzedAt" DATETIME,
    "analysisStatus" TEXT NOT NULL DEFAULT 'idle',
    "analysisProgress" JSONB,
    "analysisError" TEXT,
    "analysisDurationMs" INTEGER
);
INSERT INTO "new_Flow" ("createdAt", "description", "id", "name", "updatedAt", "userId") SELECT "createdAt", "description", "id", "name", "updatedAt", "userId" FROM "Flow";
DROP TABLE "Flow";
ALTER TABLE "new_Flow" RENAME TO "Flow";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AnalysisRun_flowId_startedAt_idx" ON "AnalysisRun"("flowId", "startedAt" DESC);
