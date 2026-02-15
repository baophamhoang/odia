import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { getTeamMembers } from "@/app/actions/users";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await getTeamMembers();
  return NextResponse.json(members);
}
