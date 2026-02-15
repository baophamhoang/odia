import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { getMyTaggedRuns } from "@/app/actions/users";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runs = await getMyTaggedRuns();
  return NextResponse.json(runs);
}
