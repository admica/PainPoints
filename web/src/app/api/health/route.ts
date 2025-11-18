import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  const cwd = process.cwd();
  const envUrl = process.env.DATABASE_URL || null;
  const prismaPath = path.join(cwd, "prisma", "dev.db");
  const exists = fs.existsSync(prismaPath);
  return NextResponse.json({
    cwd,
    DATABASE_URL: envUrl,
    prismaDbExists: exists,
    prismaDbPath: prismaPath,
  });
}


