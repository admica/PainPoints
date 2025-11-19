import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; clusterId: string; memberId: string }> }
) {
  const { id, clusterId, memberId } = await context.params;

  try {
    // Verify cluster ownership and existence
    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster || cluster.flowId !== id) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // Verify member existence and link
    const member = await prisma.clusterMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.clusterId !== clusterId) {
      return NextResponse.json({ error: "Member not found in this cluster" }, { status: 404 });
    }

    await prisma.clusterMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}

