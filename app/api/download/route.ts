import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "@/app/lib/db";
import { photos as photosTable } from "@/app/lib/schema";
import { eq } from "drizzle-orm";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  const photoId = req.nextUrl.searchParams.get("id");
  if (!photoId) return new NextResponse("Missing id", { status: 400 });

  const photo = await db
    .select({ storagePath: photosTable.storagePath, fileName: photosTable.fileName })
    .from(photosTable)
    .where(eq(photosTable.id, photoId))
    .get();

  if (!photo) return new NextResponse("Not found", { status: 404 });

  const obj = await r2.send(
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: photo.storagePath })
  );

  const filename = photo.fileName ?? `photo-${photoId}`;

  return new NextResponse(obj.Body as ReadableStream, {
    headers: {
      "Content-Type": obj.ContentType ?? "image/jpeg",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
