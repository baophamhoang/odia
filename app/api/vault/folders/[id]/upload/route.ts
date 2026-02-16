import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { linkPhotosToFolder } from "@/app/actions/vault";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { photoIds } = body as { photoIds: string[] };

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: "photoIds array is required" },
        { status: 400 }
      );
    }

    await linkPhotosToFolder(id, photoIds);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to link photos" },
      { status: 500 }
    );
  }
}
