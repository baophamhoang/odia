"use server";

import { randomUUID } from "crypto";
import path from "path";

import { auth } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { photos as photosTable, runs as runsTable } from "@/app/lib/schema";
import { eq, desc, isNull } from "drizzle-orm";
import { getUploadUrl, deleteObject, getDownloadUrl } from "@/app/lib/r2";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// requestUploadUrls
// ---------------------------------------------------------------------------

export async function requestUploadUrls(
  files: { name: string; type: string; size: number }[]
): Promise<{ photoId: string; uploadUrl: string; storagePath: string; thumbUploadUrl: string | null }[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Build all records in memory first
  const records = files.map((file) => {
    const photoId = randomUUID();
    const ext = path.extname(file.name).toLowerCase().replace(/^\./, "");
    const isImage = file.type.startsWith("image/");
    return {
      id: photoId,
      runId: null as null,
      storagePath: `runs/pending/${photoId}${ext ? `.${ext}` : ""}`,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      thumbPath: isImage ? `thumbs/${photoId}.jpeg` : null,
      displayOrder: 0,
      uploadedBy: userId,
    };
  });

  // Single bulk insert — one Turso round-trip regardless of file count
  await db.insert(photosTable).values(records);

  // Generate presigned URLs in batches of 10 to avoid overwhelming R2
  const results: { photoId: string; uploadUrl: string; storagePath: string; thumbUploadUrl: string | null }[] = [];
  for (const batch of chunk(records, 10)) {
    const batchResults = await Promise.all(
      batch.map(async (r) => {
        const [uploadUrl, thumbUploadUrl] = await Promise.all([
          getUploadUrl(r.storagePath, r.mimeType),
          r.thumbPath ? getUploadUrl(r.thumbPath, "image/jpeg", 3600) : Promise.resolve(null),
        ]);
        return { photoId: r.id, uploadUrl, storagePath: r.storagePath, thumbUploadUrl };
      })
    );
    results.push(...batchResults);
  }

  return results;
}

// ---------------------------------------------------------------------------
// addPhotosToRun — any authenticated member can add photos to any run
// ---------------------------------------------------------------------------

export async function addPhotosToRun(
  runId: string,
  photoIds: string[]
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (photoIds.length === 0) return;

  // Get current max display_order for the run
  const existing = await db
    .select({ displayOrder: photosTable.displayOrder })
    .from(photosTable)
    .where(eq(photosTable.runId, runId))
    .orderBy(desc(photosTable.displayOrder))
    .limit(1);

  const maxOrder = existing?.[0]?.displayOrder ?? 0;

  // Find the run's folder so we can set folder_id too
  const { getRunFolderId } = await import("@/app/actions/vault");
  const folderId = await getRunFolderId(runId);

  // Update photos in batches of 10 to avoid overwhelming Turso with concurrent queries
  const batches = chunk(photoIds, 10);
  let offset = 0;
  for (const batch of batches) {
    const batchOffset = offset;
    await Promise.all(
      batch.map((photoId, i) =>
        db
          .update(photosTable)
          .set({ runId, displayOrder: maxOrder + batchOffset + i + 1, folderId })
          .where(eq(photosTable.id, photoId))
      )
    );
    offset += batch.length;
  }
}

// ---------------------------------------------------------------------------
// deletePhoto
// ---------------------------------------------------------------------------

export async function deletePhoto(photoId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Fetch the photo with its run so we can check both ownership paths
  const photo = await db
    .select({
      id: photosTable.id,
      storagePath: photosTable.storagePath,
      thumbPath: photosTable.thumbPath,
      uploadedBy: photosTable.uploadedBy,
      runId: photosTable.runId,
      runCreator: runsTable.createdBy,
    })
    .from(photosTable)
    .leftJoin(runsTable, eq(photosTable.runId, runsTable.id))
    .where(eq(photosTable.id, photoId))
    .get();

  if (!photo) {
    throw new Error(`Photo not found: ${photoId}`);
  }

  const isUploader = photo.uploadedBy === userId;
  const isRunCreator = photo.runCreator === userId;

  if (!isUploader && !isRunCreator) {
    throw new Error("Forbidden: you do not have permission to delete this photo");
  }

  // Delete from R2 first (original + thumb if exists)
  await Promise.all([
    deleteObject(photo.storagePath),
    photo.thumbPath ? deleteObject(photo.thumbPath) : Promise.resolve(),
  ]);

  await db.delete(photosTable).where(eq(photosTable.id, photoId));
}

// ---------------------------------------------------------------------------
// backfillThumbs — admin only, called by /api/admin/backfill-thumbs
// ---------------------------------------------------------------------------

export async function backfillThumbs(): Promise<{ processed: number; errors: number }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const sharp = (await import("sharp")).default;

  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const BUCKET = process.env.R2_BUCKET_NAME!;
  const BATCH = 20;
  let processed = 0;
  let errors = 0;
  let offset = 0;

  while (true) {
    const batch = await db
      .select({ id: photosTable.id, storagePath: photosTable.storagePath })
      .from(photosTable)
      .where(isNull(photosTable.thumbPath))
      .limit(BATCH)
      .offset(offset);

    if (batch.length === 0) break;

    await Promise.all(
      batch.map(async (photo) => {
        try {
          const url = await getDownloadUrl(photo.storagePath);
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch photo: ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const thumbBuffer = await sharp(buffer)
            .rotate()
            .resize(400)
            .jpeg({ quality: 75 })
            .toBuffer();

          const thumbPath = `thumbs/${photo.id}.jpeg`;

          await r2.send(
            new PutObjectCommand({
              Bucket: BUCKET,
              Key: thumbPath,
              Body: thumbBuffer,
              ContentType: "image/jpeg",
            })
          );

          await db
            .update(photosTable)
            .set({ thumbPath })
            .where(eq(photosTable.id, photo.id));

          processed++;
        } catch (e) {
          console.error(`backfillThumbs: failed for photo ${photo.id}:`, e);
          errors++;
        }
      })
    );

    offset += BATCH;
  }

  return { processed, errors };
}
