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
    "analysisDurationMs" INTEGER,
    "ingestionStatus" TEXT NOT NULL DEFAULT 'idle',
    "ingestionProgress" JSONB,
    "ingestionError" TEXT,
    "ingestionDurationMs" INTEGER
);
INSERT INTO "new_Flow" ("analysisDurationMs", "analysisError", "analysisProgress", "analysisStatus", "createdAt", "description", "id", "lastAnalyzedAt", "name", "updatedAt", "userId") SELECT "analysisDurationMs", "analysisError", "analysisProgress", "analysisStatus", "createdAt", "description", "id", "lastAnalyzedAt", "name", "updatedAt", "userId" FROM "Flow";
DROP TABLE "Flow";
ALTER TABLE "new_Flow" RENAME TO "Flow";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
