import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const flow = await prisma.flow.findUnique({
      where: { id },
      include: {
        sources: true,
        items: { take: 50, orderBy: { createdAt: "desc" } },
        clusters: {
          orderBy: { createdAt: "desc" },
          include: { members: true, idea: true },
        },
      },
    });
    if (!flow) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ flow });
  } catch (e: any) {
    console.error("Error fetching flow:", e);
    return NextResponse.json(
      { error: "db_error", message: String(e?.message || e) },
      { status: 500 },
    );
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const flow = await prisma.flow.findUnique({ where: { id } });
    if (!flow) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    await prisma.flow.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Error deleting flow:", e);
    return NextResponse.json(
      { error: "db_error", message: String(e?.message || e) },
      { status: 500 },
    );
  }
}


