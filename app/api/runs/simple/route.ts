import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { runs as runsTable } from "@/app/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runs = await db
    .select({
      id: runsTable.id,
      title: runsTable.title,
      run_date: runsTable.runDate,
    })
    .from(runsTable)
    .orderBy(desc(runsTable.runDate))
    .limit(100);

  return NextResponse.json(runs);
}
