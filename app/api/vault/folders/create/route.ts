import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { createCustomFolder } from "@/app/actions/vault";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { parentId, name } = body as { parentId: string; name: string };

    if (!parentId || !name?.trim()) {
      return NextResponse.json(
        { error: "parentId and name are required" },
        { status: 400 }
      );
    }

    const folder = await createCustomFolder(parentId, name.trim(), session.user.id);
    return NextResponse.json(folder, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create folder" },
      { status: 500 }
    );
  }
}
