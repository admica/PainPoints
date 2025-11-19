import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await context.params;

  try {
    const item = await prisma.sourceItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.flowId !== id) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.sourceItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete item error:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

