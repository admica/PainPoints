import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const flows = await prisma.flow.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ flows });
  } catch (e: any) {
    return NextResponse.json(
      { error: "db_error", message: String(e?.message || e) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = (body?.name ?? "").toString().trim();
    const description = (body?.description ?? "").toString().trim() || null;
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const flow = await prisma.flow.create({
      data: { name, description },
    });
    return NextResponse.json({ flow }, { status: 201 });
  } catch (e: any) {
    console.error("Error creating flow:", e);
    return NextResponse.json(
      { error: "db_error", message: String(e?.message || e) },
      { status: 500 },
    );
  }
}


