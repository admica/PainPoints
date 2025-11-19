import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; clusterId: string }> }
) {
  const { id, clusterId } = await context.params;

  try {
    // Verify flow ownership
    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster || cluster.flowId !== id) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    await prisma.cluster.delete({
      where: { id: clusterId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete cluster error:", error);
    return NextResponse.json(
      { error: "Failed to delete cluster" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; clusterId: string }> }
) {
  const { id, clusterId } = await context.params;

  try {
    const body = await req.json();
    const { label, summary } = body;

    // Verify flow ownership
    const cluster = await prisma.cluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster || cluster.flowId !== id) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    const updated = await prisma.cluster.update({
      where: { id: clusterId },
      data: {
        label: label ?? undefined,
        summary: summary ?? undefined,
      },
    });

    return NextResponse.json({ cluster: updated });
  } catch (error) {
    console.error("Update cluster error:", error);
    return NextResponse.json(
      { error: "Failed to update cluster" },
      { status: 500 }
    );
  }
}

