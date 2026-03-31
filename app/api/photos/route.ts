import { NextRequest, NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db } from "@/app/lib/db";
import { photos } from "@/app/lib/schema";
import { getDownloadUrl } from "@/app/lib/r2";
import { validateApiKey } from "@/app/lib/api-key";

export async function GET(request: NextRequest) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const [rows, countResult] = await Promise.all([
    db.select().from(photos).orderBy(desc(photos.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(photos),
  ]);

  const total = Number(countResult[0].count);

  const data = await Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      fileName: p.fileName,
      mimeType: p.mimeType,
      fileSize: p.fileSize,
      createdAt: p.createdAt,
      runId: p.runId,
      folderId: p.folderId,
      uploadedBy: p.uploadedBy,
      url: await getDownloadUrl(p.storagePath),
      thumbUrl: p.thumbPath ? await getDownloadUrl(p.thumbPath) : null,
    })),
  );

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
