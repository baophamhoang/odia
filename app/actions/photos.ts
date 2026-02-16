"use server";

import { randomUUID } from "crypto";
import path from "path";

import { auth } from "@/app/lib/auth";
import { supabase } from "@/app/lib/db";
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
      const { data: photo, error: insertError } = await supabase
        .from("photos")
        .insert({
          run_id: null,
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          display_order: 0,
          uploaded_by: userId,
        })
        .select("id")
        .single();

      if (insertError || !photo) {
        throw new Error(
          `Failed to create photo record for "${file.name}": ${insertError?.message}`
        );
      }

      const uploadUrl = await getUploadUrl(storagePath, file.type);

      return {
        photoId: photo.id as string,
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
  const { data: existing, error: existingError } = await supabase
    .from("photos")
    .select("display_order")
    .eq("run_id", runId)
    .order("display_order", { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(`Failed to query existing photos: ${existingError.message}`);
  }

  const maxOrder = existing?.[0]?.display_order ?? 0;

  // Find the run's folder so we can set folder_id too
  const { getRunFolderId } = await import("@/app/actions/vault");
  const folderId = await getRunFolderId(runId);

  // Update each photo to link to the run (and folder) with sequential display_order
  await Promise.all(
    photoIds.map(async (photoId, i) => {
      const update: Record<string, unknown> = {
        run_id: runId,
        display_order: maxOrder + i + 1,
      };
      if (folderId) {
        update.folder_id = folderId;
      }
      const { error } = await supabase
        .from("photos")
        .update(update)
        .eq("id", photoId);

      if (error) {
        throw new Error(`Failed to link photo ${photoId}: ${error.message}`);
      }
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
  const { data: photo, error: photoError } = await supabase
    .from("photos")
    .select("id, storage_path, uploaded_by, run_id, runs(created_by)")
    .eq("id", photoId)
    .single();

  if (photoError || !photo) {
    throw new Error(`Photo not found: ${photoError?.message ?? photoId}`);
  }

  const isUploader = photo.uploaded_by === userId;
  // runs may be null (pending photo) or an object; handle both shapes
  const runCreatedBy =
    photo.runs && typeof photo.runs === "object" && !Array.isArray(photo.runs)
      ? (photo.runs as { created_by: string }).created_by
      : null;
  const isRunCreator = runCreatedBy === userId;

  if (!isUploader && !isRunCreator) {
    throw new Error("Forbidden: you do not have permission to delete this photo");
  }

  // Delete from R2 first; if this fails we leave the DB row intact
  await deleteObject(photo.storage_path);

  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    throw new Error(`Failed to delete photo record: ${deleteError.message}`);
  }
}
