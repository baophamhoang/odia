import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { getFolderContents } from "@/app/actions/vault";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const contents = await getFolderContents(id);
    return NextResponse.json(contents);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Folder not found" },
      { status: 404 }
    );
  }
}
