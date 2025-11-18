import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const flow = await prisma.flow.findUnique({
    where: { id },
    select: {
      id: true,
      analysisStatus: true,
      analysisProgress: true,
      analysisError: true,
      analysisDurationMs: true,
      lastAnalyzedAt: true,
      ingestionStatus: true,
      ingestionProgress: true,
      ingestionError: true,
      ingestionDurationMs: true,
    },
  });

  if (!flow) {
    return NextResponse.json({ error: "flow_not_found" }, { status: 404 });
  }

  const [latestItem, itemsCount, history] = await Promise.all([
    prisma.sourceItem.findFirst({
      where: { flowId: id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.sourceItem.count({ where: { flowId: id } }),
    prisma.analysisRun.findMany({
      where: { flowId: id },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  const newDataAvailable = latestItem
    ? !flow.lastAnalyzedAt || latestItem.createdAt > flow.lastAnalyzedAt
    : false;

  return NextResponse.json({
    flowId: id,
    status: flow.analysisStatus,
    progress: flow.analysisProgress,
    error: flow.analysisError,
    lastAnalyzedAt: flow.lastAnalyzedAt,
    analysisDurationMs: flow.analysisDurationMs,
    ingestionStatus: flow.ingestionStatus,
    ingestionProgress: flow.ingestionProgress,
    ingestionError: flow.ingestionError,
    ingestionDurationMs: flow.ingestionDurationMs,
    newDataAvailable,
    itemsCount,
    history,
  });
}

