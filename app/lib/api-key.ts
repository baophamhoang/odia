import { NextRequest, NextResponse } from "next/server";

export function validateApiKey(request: NextRequest): NextResponse | null {
  const key = request.headers.get("X-ODIA-API-KEY");

  if (!key || key !== process.env.ODIA_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log('testst');
  return null;
}
