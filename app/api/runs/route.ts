import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { getRuns } from "@/app/actions/runs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const runs = await getRuns(page);
  return NextResponse.json(runs);
}
