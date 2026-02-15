import { auth } from "@/app/lib/auth";
import { NextResponse } from "next/server";
import { getAllowedEmails } from "@/app/actions/admin";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emails = await getAllowedEmails();
  return NextResponse.json(emails);
}
