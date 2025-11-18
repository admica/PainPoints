import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestAnalysisCancel } from "@/lib/analysisControl";

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const flow = await prisma.flow.findUnique({ where: { id } });
  if (!flow) {
    return NextResponse.json({ error: "flow_not_found" }, { status: 404 });
  }

  if (flow.analysisStatus !== "running") {
    return NextResponse.json(
      { error: "no_active_analysis", message: "No running analysis to cancel." },
      { status: 400 },
    );
  }

  const acknowledged = requestAnalysisCancel(flow.id);

  return NextResponse.json({
    ok: acknowledged,
    message: acknowledged
      ? "Cancellation requested. Analysis will stop after the current batch."
      : "Cancellation request noted. Waiting for analysis loop to acknowledge.",
  });
}

