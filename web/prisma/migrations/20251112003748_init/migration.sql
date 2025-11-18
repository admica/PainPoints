-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FlowSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "params" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlowSource_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "sourceId" TEXT,
    "redditId" TEXT,
    "authorHash" TEXT,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "score" INTEGER,
    "numComments" INTEGER,
    "itemCreatedAt" DATETIME,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceItem_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SourceItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FlowSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cluster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "summary" TEXT,
    "tags" JSONB,
    "severityScore" REAL,
    "frequencyScore" REAL,
    "spendIntentScore" REAL,
    "recencyScore" REAL,
    "totalScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cluster_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClusterMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clusterId" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "similarity" REAL,
    CONSTRAINT "ClusterMember_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClusterMember_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "SourceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clusterId" TEXT NOT NULL,
    "pain" TEXT NOT NULL,
    "workaround" TEXT,
    "solution" TEXT NOT NULL,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Idea_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Idea_clusterId_key" ON "Idea"("clusterId");
