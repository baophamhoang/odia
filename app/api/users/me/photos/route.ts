import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { getMyUploadedPhotos } from "@/app/actions/users";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photos = await getMyUploadedPhotos();
  return NextResponse.json(photos);
}
