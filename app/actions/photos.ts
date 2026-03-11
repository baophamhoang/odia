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
// requestUploadUrls
// ---------------------------------------------------------------------------

export async function requestUploadUrls(
  files: { name: string; type: string; size: number }[]
): Promise<{ photoId: string; uploadUrl: string; storagePath: string; thumbUploadUrl: string }[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const results = await Promise.all(
    files.map(async (file) => {
      const photoId = randomUUID();
      const ext = path.extname(file.name).toLowerCase().replace(/^\./, "");
      const storagePath = `runs/pending/${photoId}${ext ? `.${ext}` : ""}`;
      const thumbPath = `thumbs/${photoId}.jpeg`;

      // Insert pending photo row
      const [photo] = await db
        .insert(photosTable)
        .values({
          id: photoId,
          runId: null,
          storagePath: storagePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          thumbPath: thumbPath,
          displayOrder: 0,
          uploadedBy: userId,
        })
        .returning({ id: photosTable.id });

      if (!photo) {
        throw new Error(`Failed to create photo record for "${file.name}"`);
      }

      const [uploadUrl, thumbUploadUrl] = await Promise.all([
        getUploadUrl(storagePath, file.type),
        getUploadUrl(thumbPath, "image/jpeg"),
      ]);

      return {
        photoId: photo.id,
        uploadUrl,
        storagePath,
        thumbUploadUrl,
      };
    })
  );

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

  // Update each photo to link to the run (and folder) with sequential display_order
  await Promise.all(
    photoIds.map(async (photoId, i) => {
      await db
        .update(photosTable)
        .set({
          runId: runId,
          displayOrder: maxOrder + i + 1,
          folderId: folderId,
        })
        .where(eq(photosTable.id, photoId));
    })
  );
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
