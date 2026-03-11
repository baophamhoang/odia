import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { backfillThumbs } from "@/app/actions/photos";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await backfillThumbs();
  return NextResponse.json(result);
}
