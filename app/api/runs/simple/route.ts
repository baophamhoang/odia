import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: runs, error } = await supabase
    .from("runs")
    .select("id, title, run_date")
    .order("run_date", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: `Failed to fetch runs: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(runs ?? []);
}
