import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = await req.json();
    const { sourceClusterId, targetClusterId } = body;

    if (!sourceClusterId || !targetClusterId) {
      return NextResponse.json(
        { error: "Source and target cluster IDs are required" },
        { status: 400 }
      );
    }

    if (sourceClusterId === targetClusterId) {
      return NextResponse.json(
        { error: "Cannot merge a cluster into itself" },
        { status: 400 }
      );
    }

    // Verify ownership and existence
    const [sourceCluster, targetCluster] = await Promise.all([
      prisma.cluster.findUnique({ where: { id: sourceClusterId } }),
      prisma.cluster.findUnique({ where: { id: targetClusterId } }),
    ]);

    if (!sourceCluster || sourceCluster.flowId !== id) {
      return NextResponse.json({ error: "Source cluster not found" }, { status: 404 });
    }
    if (!targetCluster || targetCluster.flowId !== id) {
      return NextResponse.json({ error: "Target cluster not found" }, { status: 404 });
    }

    // Perform merge in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Move members
      // We need to handle potential duplicates if an item is already in both (unlikely but possible)
      const sourceMembers = await tx.clusterMember.findMany({
        where: { clusterId: sourceClusterId },
      });

      for (const member of sourceMembers) {
        const existingInTarget = await tx.clusterMember.findFirst({
          where: {
            clusterId: targetClusterId,
            sourceItemId: member.sourceItemId,
          },
        });

        if (!existingInTarget) {
          await tx.clusterMember.update({
            where: { id: member.id },
            data: { clusterId: targetClusterId },
          });
        } else {
          // Duplicate, just delete the source member
          await tx.clusterMember.delete({ where: { id: member.id } });
        }
      }

      // 2. Merge Tags
      const sourceTags = (sourceCluster.tags as string[]) || [];
      const targetTags = (targetCluster.tags as string[]) || [];
      const mergedTags = Array.from(new Set([...targetTags, ...sourceTags])).slice(0, 10);

      // 3. Update Scores (Take max of both to represent strongest signal)
      const newScores = {
        severityScore: Math.max(sourceCluster.severityScore || 0, targetCluster.severityScore || 0),
        frequencyScore: Math.max(sourceCluster.frequencyScore || 0, targetCluster.frequencyScore || 0),
        spendIntentScore: Math.max(sourceCluster.spendIntentScore || 0, targetCluster.spendIntentScore || 0),
        recencyScore: Math.max(sourceCluster.recencyScore || 0, targetCluster.recencyScore || 0),
        totalScore: Math.max(sourceCluster.totalScore || 0, targetCluster.totalScore || 0),
      };

      // 4. Update Target Cluster
      await tx.cluster.update({
        where: { id: targetClusterId },
        data: {
          tags: mergedTags,
          ...newScores,
        },
      });

      // 5. Delete Source Cluster (Cascade will handle Idea and any remaining members)
      await tx.cluster.delete({ where: { id: sourceClusterId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Merge error:", error);
    return NextResponse.json(
      { error: "Failed to merge clusters" },
      { status: 500 }
    );
  }
}
