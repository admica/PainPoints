import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  extractClustersWithLlm,
  checkLmStudioHealth,
  type ExtractClustersOutput,
} from "@/lib/llm";
import {
  clearAnalysisController,
  isAnalysisCancelRequested,
  markAnalysisRunning,
} from "@/lib/analysisControl";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const flow = await prisma.flow.findUnique({ where: { id } });
    if (!flow) {
      return NextResponse.json({ error: "flow not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = (body?.mode ?? "full") as "full" | "refine";

     if (flow.analysisStatus === "running") {
      return NextResponse.json(
        { error: "analysis_running", message: "Analysis already running for this flow." },
        { status: 409 },
      );
    }

    // Get ALL items (no limit)
    const items = await prisma.sourceItem.findMany({
      where: { flowId: flow.id },
      orderBy: { createdAt: "asc" },
    });
    if (!items.length) {
      return NextResponse.json({ error: "no items to analyze" }, { status: 400 });
    }

    // Check if LM Studio is available before attempting analysis
    const isLmStudioAvailable = await checkLmStudioHealth();
    if (!isLmStudioAvailable) {
      return NextResponse.json(
        {
          error: "llm_unavailable",
          message: "LM Studio is not available. Please ensure LM Studio is running on http://localhost:1234",
        },
        { status: 503 },
      );
    }

    // Prepare input
    const input = items.map((it) => ({
      id: it.id,
      text: it.text,
      title: it.title,
    }));

    // If refining, get existing clusters for context
    let existingContext: string[] = [];
    if (mode === "refine") {
      const clusters = await prisma.cluster.findMany({
        where: { flowId: flow.id },
        select: { label: true, summary: true },
      });
      existingContext = clusters.map(
        (c) => `${c.label}${c.summary ? `: ${c.summary}` : ""}`
      );
    }

    // Batch items if dataset is large (to avoid context limits and improve processing)
    // Reduced batch size to help model process better - ~50 items per batch
    const BATCH_SIZE = 50;
    const batches: typeof input[] = [];

    for (let i = 0; i < input.length; i += BATCH_SIZE) {
      batches.push(input.slice(i, i + BATCH_SIZE));
    }

    if (!batches.length) {
      return NextResponse.json(
        { error: "analysis_failed", message: "Unable to batch items for analysis" },
        { status: 500 },
      );
    }

    const analysisRun = await prisma.analysisRun.create({
      data: {
        flowId: flow.id,
        status: "running",
      },
    });

    const analysisStart = Date.now();
    markAnalysisRunning(flow.id);

    const baseProgress = {
      batch: 0,
      totalBatches: batches.length,
      itemsProcessed: 0,
      totalItems: items.length,
    };

    await prisma.flow.update({
      where: { id: flow.id },
      data: {
        analysisStatus: "running",
        analysisProgress: baseProgress as Prisma.JsonObject,
        analysisError: null,
      },
    });

    const finalizeRun = async ({
      status,
      errorMessage,
      itemsAnalyzed,
      batchesProcessed,
      setLastAnalyzedAt,
    }: {
      status: "succeeded" | "failed" | "canceled";
      errorMessage?: string | null;
      itemsAnalyzed?: number;
      batchesProcessed?: number;
      setLastAnalyzedAt?: boolean;
    }) => {
      const duration = Date.now() - analysisStart;
      await prisma.flow.update({
        where: { id: flow.id },
        data: {
          analysisStatus: status,
          analysisProgress: Prisma.JsonNull,
          analysisError: errorMessage ?? null,
          analysisDurationMs: duration,
          lastAnalyzedAt: setLastAnalyzedAt ? new Date() : flow.lastAnalyzedAt,
        },
      });

      await prisma.analysisRun.update({
        where: { id: analysisRun.id },
        data: {
          status,
          completedAt: new Date(),
          durationMs: duration,
          errorMessage: errorMessage ?? null,
          itemsAnalyzed: itemsAnalyzed ?? null,
          batchesProcessed: batchesProcessed ?? null,
        },
      });

      clearAnalysisController(flow.id);
    };

    const updateProgress = async (progress: typeof baseProgress) => {
      await prisma.flow.update({
        where: { id: flow.id },
        data: {
          analysisProgress: progress as Prisma.JsonObject,
        },
      });
      await prisma.analysisRun.update({
        where: { id: analysisRun.id },
        data: {
          itemsAnalyzed: progress.itemsProcessed,
          batchesProcessed: progress.batch,
        },
      });
    };

    // Process batches and merge results
    const allClusters: ExtractClustersOutput["clusters"] = [];
    let itemsProcessed = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (isAnalysisCancelRequested(flow.id)) {
        await finalizeRun({
          status: "canceled",
          itemsAnalyzed: itemsProcessed,
          batchesProcessed: batchIndex,
        });
        return NextResponse.json(
          {
            ok: false,
            canceled: true,
            message: "Analysis canceled",
          },
          { status: 200 },
        );
      }

      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`);

      try {
        const batchResult = await extractClustersWithLlm(batch, existingContext);

        // Merge clusters intelligently - avoid exact duplicates
        for (const newCluster of batchResult.clusters) {
          const existingCluster = allClusters.find(
            (c) => c.label.toLowerCase() === newCluster.label.toLowerCase(),
          );

          if (existingCluster) {
            existingCluster.quotes = [...existingCluster.quotes, ...newCluster.quotes].slice(0, 10);

            existingCluster.tags = [
              ...(existingCluster.tags || []),
              ...(newCluster.tags || []),
            ]
              .filter((tag, index, arr) => arr.indexOf(tag) === index)
              .slice(0, 10);

            if (
              newCluster.scores?.total &&
              (!existingCluster.scores?.total || newCluster.scores.total > existingCluster.scores.total)
            ) {
              existingCluster.scores = { ...existingCluster.scores, ...newCluster.scores };
            }
          } else {
            allClusters.push(newCluster);
          }
        }
      } catch (batchError: unknown) {
        const errorMessage =
          batchError instanceof Error ? batchError.message : "Unknown LLM error";
        console.error(`Error processing batch ${batchIndex + 1}:`, batchError);

        if (
          errorMessage.includes("fetch failed") ||
          errorMessage.includes("ECONNREFUSED") ||
          errorMessage.includes("aborted") ||
          errorMessage.includes("timeout")
        ) {
          await finalizeRun({ status: "failed", errorMessage });
          return NextResponse.json(
            {
              error: "llm_unavailable",
              message: "LM Studio is not available. Please ensure LM Studio is running on http://localhost:1234",
              details: errorMessage,
            },
            { status: 503 },
          );
        }

        if (batchIndex === 0 && allClusters.length === 0) {
          await finalizeRun({ status: "failed", errorMessage });
          return NextResponse.json(
            {
              error: "llm_error",
              message: "Analysis failed due to LLM error",
              details: errorMessage,
            },
            { status: 500 },
          );
        }
      }

      itemsProcessed += batch.length;
      await updateProgress({
        batch: batchIndex + 1,
        totalBatches: batches.length,
        itemsProcessed,
        totalItems: items.length,
      });
    }

    if (allClusters.length === 0) {
      await finalizeRun({
        status: "failed",
        errorMessage: "Analysis completed but no clusters were generated",
        itemsAnalyzed: itemsProcessed,
        batchesProcessed: batches.length,
      });
      return NextResponse.json(
        {
          error: "analysis_failed",
          message: "Analysis completed but no clusters were generated",
        },
        { status: 500 },
      );
    }

    const result: ExtractClustersOutput = { clusters: allClusters };

    if (!result || !Array.isArray(result.clusters)) {
      await finalizeRun({
        status: "failed",
        errorMessage: "LLM returned invalid response format",
      });
      return NextResponse.json(
        {
          error: "invalid_response",
          message: "LLM returned invalid response format",
          },
        { status: 500 },
      );
    }

    const createdClusters = await prisma.$transaction(async (tx) => {
      // In "full" mode, delete everything first.
      // In "refine" mode, we KEEP existing clusters and merge into them.
      if (mode === "full") {
        await tx.clusterMember.deleteMany({ where: { cluster: { flowId: flow.id } } });
        await tx.idea.deleteMany({ where: { cluster: { flowId: flow.id } } });
        await tx.cluster.deleteMany({ where: { flowId: flow.id } });
      }

      // For "refine" mode, we need to fetch existing clusters to merge with
      const existingDbClusters = mode === "refine" 
        ? await tx.cluster.findMany({ where: { flowId: flow.id }, include: { idea: true } })
        : [];

      const newClusters = [];
      
      for (const c of result.clusters ?? []) {
        // Try to find a matching existing cluster (fuzzy match on label)
        let targetClusterId: string | null = null;
        
        if (mode === "refine") {
          const match = existingDbClusters.find(
            existing => existing.label.toLowerCase().includes(c.label.toLowerCase()) || 
                       c.label.toLowerCase().includes(existing.label.toLowerCase())
          );
          if (match) {
            targetClusterId = match.id;
            // Update existing cluster scores/tags if needed
            await tx.cluster.update({
              where: { id: match.id },
              data: {
                severityScore: c.scores?.severity ?? match.severityScore,
                frequencyScore: c.scores?.frequency ?? match.frequencyScore,
                spendIntentScore: c.scores?.spendIntent ?? match.spendIntentScore,
                recencyScore: c.scores?.recency ?? match.recencyScore,
                totalScore: c.scores?.total ?? match.totalScore,
                // Ideally merge tags, but replacing is safer for now to avoid dupes
              }
            });
          }
        }

        // Create new cluster if no match found or in full mode
        if (!targetClusterId) {
          const cluster = await tx.cluster.create({
            data: {
              flowId: flow.id,
              label: c.label?.slice(0, 180) || "Untitled",
              summary: c.pain?.slice(0, 2000) ?? null,
              tags: c.tags ?? [],
              severityScore: c.scores?.severity ?? null,
              frequencyScore: c.scores?.frequency ?? null,
              spendIntentScore: c.scores?.spendIntent ?? null,
              recencyScore: c.scores?.recency ?? null,
              totalScore: c.scores?.total ?? null,
            },
          });
          targetClusterId = cluster.id;
          
          const solution = c.solution || "";
          const workaround = c.workaround || null;
          await tx.idea.create({
            data: {
              clusterId: cluster.id,
              pain: c.pain || cluster.label,
              workaround,
              solution: solution || "TBD",
              confidence: c.scores?.total ?? null,
            },
          });
        }

        // Add members (source items) to the target cluster
        // We need to avoid duplicate members if refining
        if (c.quotes?.length) {
          for (const q of c.quotes.slice(0, 20)) {
            // Check if member already exists (only relevant for refine mode)
            if (mode === "refine") {
              const exists = await tx.clusterMember.findFirst({
                where: {
                  clusterId: targetClusterId,
                  sourceItemId: q.sourceId
                }
              });
              if (exists) continue;
            }
            
            await tx.clusterMember.create({
              data: { 
                clusterId: targetClusterId, 
                sourceItemId: q.sourceId, 
                similarity: null 
              }
            });
          }
        }
        
        newClusters.push(targetClusterId);
      }

      return newClusters;
    });

    await finalizeRun({
      status: "succeeded",
      itemsAnalyzed: items.length,
      batchesProcessed: batches.length,
      setLastAnalyzedAt: true,
    });

    return NextResponse.json({
      ok: true,
      clustersCreated: createdClusters.length,
      itemsAnalyzed: items.length,
      batchesProcessed: batches.length,
    });
  } catch (error: unknown) {
    console.error("Analysis error:", error);
    clearAnalysisController(id);
    return NextResponse.json(
      {
        error: "internal_error",
        message: "An unexpected error occurred during analysis",
        details:
          process.env.NODE_ENV === "development"
            ? String(error instanceof Error ? error.message : error)
            : undefined,
      },
      { status: 500 },
    );
  }
}
