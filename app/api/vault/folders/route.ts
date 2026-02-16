import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { getRootFolder, getFolderContents } from "@/app/actions/vault";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const root = await getRootFolder();
    const contents = await getFolderContents(root.id);
    return NextResponse.json(contents);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch root folder" },
      { status: 500 }
    );
  }
}
