"use server";

import { randomUUID } from "crypto";
import path from "path";

import { auth } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { photos as photosTable, runs as runsTable } from "@/app/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getUploadUrl, deleteObject } from "@/app/lib/r2";

// ---------------------------------------------------------------------------
// requestUploadUrls
// ---------------------------------------------------------------------------

export async function requestUploadUrls(
  files: { name: string; type: string; size: number }[]
): Promise<{ photoId: string; uploadUrl: string; storagePath: string }[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const results = await Promise.all(
    files.map(async (file) => {
      const ext = path.extname(file.name).toLowerCase().replace(/^\./, "");
      const storagePath = `runs/pending/${randomUUID()}${ext ? `.${ext}` : ""}`;

      // Insert pending photo row
      const [photo] = await db
        .insert(photosTable)
        .values({
          id: randomUUID(),
          runId: null,
          storagePath: storagePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          displayOrder: 0,
          uploadedBy: userId,
        })
        .returning({ id: photosTable.id });

      if (!photo) {
        throw new Error(`Failed to create photo record for "${file.name}"`);
      }

      const uploadUrl = await getUploadUrl(storagePath, file.type);

      return {
        photoId: photo.id,
        uploadUrl,
        storagePath,
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

  // Delete from R2 first
  await deleteObject(photo.storagePath);

  await db.delete(photosTable).where(eq(photosTable.id, photoId));
}
