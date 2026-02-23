import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { getRootFolder, createRootFolder, getFolderContents } from "@/app/actions/vault";
import { db } from "@/app/lib/db";
import { users } from "@/app/lib/schema";
import type { Folder } from "@/app/lib/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure the session user exists in Turso — handles stale sessions after a
  // DB migration where the user row may not have been synced yet.
  await db
    .insert(users)
    .values({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      avatarUrl: session.user.image ?? null,
    })
    .onConflictDoNothing();

  try {
    let root: Folder;
    try {
      root = await getRootFolder();
    } catch {
      // First-time setup: bootstrap the root folder using the current user
      root = await createRootFolder(session.user.id);
    }

    const contents = await getFolderContents(root.id);
    return NextResponse.json(contents);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch vault" },
      { status: 500 }
    );
  }
}
