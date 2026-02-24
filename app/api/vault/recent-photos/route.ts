import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getRecentCustomFolderPhotos } from "@/app/actions/vault";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const groups = await getRecentCustomFolderPhotos();
    return NextResponse.json(groups);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch folder photos" },
      { status: 500 }
    );
  }
}
