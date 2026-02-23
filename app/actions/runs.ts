"use server";

import { db } from "@/app/lib/db";
import { runs as runsTable, users as usersTable, runParticipants, photos as photosTable, folders as foldersTable } from "@/app/lib/schema";
import { eq, inArray, desc, sql, and } from "drizzle-orm";
import { getDownloadUrl, deleteObject } from "@/app/lib/r2";
import {
  getRootFolder,
  createRunFolder,
  deleteRunFolder,
  linkPhotosToRunFolder,
} from "@/app/actions/vault";
import type { RunCard, RunWithDetails, Photo, User } from "@/app/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function attachSignedUrls(photos: Photo[]): Promise<Photo[]> {
  return Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      url: await getDownloadUrl(photo.storage_path),
    }))
  );
}

// ---------------------------------------------------------------------------
// getRuns
// ---------------------------------------------------------------------------

export async function getRuns(page: number = 1): Promise<RunCard[]> {
  const PAGE_SIZE = 20;
  const offset = (page - 1) * PAGE_SIZE;

  const runs = await db
    .select()
    .from(runsTable)
    .orderBy(desc(runsTable.runDate))
    .limit(PAGE_SIZE)
    .offset(offset);

  if (runs.length === 0) {
    return [];
  }

  const runIds = runs.map((r) => r.id);
  const creatorIds = [...new Set(runs.map((r) => r.createdBy))];

  // Fetch creators, participants, and photos in parallel
  const [
    creators,
    participants,
    photos,
    photoCounts,
  ] = await Promise.all([
    db.select().from(usersTable).where(inArray(usersTable.id, creatorIds)),
    db
      .select({
        run_id: runParticipants.runId,
        user: usersTable,
      })
      .from(runParticipants)
      .innerJoin(usersTable, eq(runParticipants.userId, usersTable.id))
      .where(inArray(runParticipants.runId, runIds)),
    db
      .select()
      .from(photosTable)
      .where(inArray(photosTable.runId, runIds))
      .orderBy(photosTable.displayOrder),
    db
      .select({
        run_id: photosTable.runId,
        count: sql<number>`count(*)`,
      })
      .from(photosTable)
      .where(inArray(photosTable.runId, runIds))
      .groupBy(photosTable.runId),
  ]);

  // Index creators by id
  const creatorMap = new Map<string, User>(
    creators.map((u) => [u.id, u as User])
  );

  // Index participants by run_id
  const participantsByRun = new Map<string, User[]>();
  for (const row of participants) {
    if (!row.run_id) continue;
    const existing = participantsByRun.get(row.run_id) ?? [];
    existing.push(row.user as User);
    participantsByRun.set(row.run_id, existing);
  }

  // Index photo counts by run_id
  const photoCountByRun = new Map<string, number>();
  for (const row of photoCounts) {
    if (row.run_id) {
      photoCountByRun.set(row.run_id, row.count);
    }
  }

  // Group photos by run_id, limit to first 4 per run for preview
  const previewPhotosByRun = new Map<string, Photo[]>();
  for (const photo of photos) {
    if (!photo.runId) continue;
    const existing = previewPhotosByRun.get(photo.runId) ?? [];
    if (existing.length < 4) {
      existing.push({
        id: photo.id,
        run_id: photo.runId,
        storage_path: photo.storagePath,
        file_name: photo.fileName,
        file_size: photo.fileSize,
        mime_type: photo.mimeType,
        display_order: photo.displayOrder,
        uploaded_by: photo.uploadedBy,
        created_at: photo.createdAt,
      } as Photo);
      previewPhotosByRun.set(photo.runId, existing);
    }
  }

  // Attach signed URLs to preview photos per run
  const signedPreviewsByRun = new Map<string, Photo[]>();
  await Promise.all(
    Array.from(previewPhotosByRun.entries()).map(async ([runId, runPhotos]) => {
      const signed = await attachSignedUrls(runPhotos);
      signedPreviewsByRun.set(runId, signed);
    })
  );

  // Assemble RunCard objects
  const runCards: RunCard[] = runs.map((run) => {
    const creator = creatorMap.get(run.createdBy);
    if (!creator) {
      throw new Error(`Creator not found for run ${run.id}`);
    }
    return {
      id: run.id,
      run_date: run.runDate,
      title: run.title,
      description: run.description,
      location: run.location,
      hashtags: JSON.parse(run.hashtags ?? "[]"),
      created_by: run.createdBy,
      created_at: run.createdAt,
      updated_at: run.updatedAt,
      creator,
      participants: participantsByRun.get(run.id) ?? [],
      photos: signedPreviewsByRun.get(run.id) ?? [],
      photo_count: photoCountByRun.get(run.id) ?? 0,
    };
  });

  return runCards;
}

// ---------------------------------------------------------------------------
// getRun
// ---------------------------------------------------------------------------

export async function getRun(runId: string): Promise<RunWithDetails | null> {
  const run = await db.query.runs.findFirst({
    where: eq(runsTable.id, runId),
  });

  if (!run) return null;

  const [
    creator,
    participants,
    photos,
    runFolder,
  ] = await Promise.all([
    db.query.users.findFirst({
      where: eq(usersTable.id, run.createdBy),
    }),
    db
      .select({
        user: usersTable,
      })
      .from(runParticipants)
      .innerJoin(usersTable, eq(runParticipants.userId, usersTable.id))
      .where(eq(runParticipants.runId, runId)),
    db
      .select({
        id: photosTable.id,
        runId: photosTable.runId,
        folderId: photosTable.folderId,
        storagePath: photosTable.storagePath,
        fileName: photosTable.fileName,
        fileSize: photosTable.fileSize,
        mimeType: photosTable.mimeType,
        displayOrder: photosTable.displayOrder,
        uploadedBy: photosTable.uploadedBy,
        createdAt: photosTable.createdAt,
        uploader: {
          id: usersTable.id,
          name: usersTable.name,
          avatar_url: usersTable.avatarUrl,
        },
      })
      .from(photosTable)
      .leftJoin(usersTable, eq(photosTable.uploadedBy, usersTable.id))
      .where(eq(photosTable.runId, runId))
      .orderBy(photosTable.displayOrder),
    db.query.folders.findFirst({
      columns: { id: true },
      where: and(eq(foldersTable.runId, runId), eq(foldersTable.folderType, "run")),
    }),
  ]);

  if (!creator) throw new Error(`Creator not found for run ${runId}`);

  const photosWithUrls = await attachSignedUrls(photos.map(p => ({
    id: p.id,
    run_id: p.runId,
    folder_id: p.folderId,
    storage_path: p.storagePath,
    file_name: p.fileName,
    file_size: p.fileSize,
    mime_type: p.mimeType,
    display_order: p.displayOrder,
    uploaded_by: p.uploadedBy,
    created_at: p.createdAt,
    uploader: p.uploader,
  }) as unknown as Photo));

  return {
    id: run.id,
    run_date: run.runDate,
    title: run.title,
    description: run.description,
    location: run.location,
    hashtags: JSON.parse(run.hashtags ?? "[]"),
    created_by: run.createdBy,
    created_at: run.createdAt,
    updated_at: run.updatedAt,
    creator: creator as User,
    participants: participants.map((p) => p.user as User),
    photos: photosWithUrls,
    folder_id: runFolder?.id ?? null,
  };
}

// ---------------------------------------------------------------------------
// createRun
// ---------------------------------------------------------------------------

import { auth } from "@/app/lib/auth";

export async function createRun(data: {
  run_date: string;
  title?: string;
  description?: string;
  location?: string;
  hashtags?: string[];
  participant_ids: string[];
  photo_ids: string[];
}): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const [insertedRun] = await db
    .insert(runsTable)
    .values({
      id: crypto.randomUUID(),
      runDate: data.run_date,
      title: data.title ?? null,
      description: data.description ?? null,
      location: data.location ?? null,
      hashtags: JSON.stringify(data.hashtags ?? []),
      createdBy: userId,
    })
    .returning({ id: runsTable.id });

  if (!insertedRun) {
    throw new Error(`Failed to create run`);
  }

  const runId = insertedRun.id;

  // Insert participants and link photos in parallel
  const operations: Promise<unknown>[] = [];

  if (data.participant_ids.length > 0) {
    operations.push(
      db.insert(runParticipants).values(
        data.participant_ids.map((uid) => ({ runId: runId, userId: uid }))
      )
    );
  }

  if (data.photo_ids.length > 0) {
    operations.push(
      db
        .update(photosTable)
        .set({ runId: runId })
        .where(inArray(photosTable.id, data.photo_ids))
    );
  }

  await Promise.all(operations);

  // Auto-create folder for this run (flat at root: run_YYYY-MM-DD)
  try {
    const root = await getRootFolder();
    const runDate = new Date(data.run_date);
    const folderId = await createRunFolder(
      root.id,
      runId,
      data.title ?? null,
      runDate,
      userId
    );
    if (data.photo_ids.length > 0) {
      await linkPhotosToRunFolder(runId, folderId);
    }
  } catch (e) {
    // Folder creation is non-blocking — run still created successfully
    console.error("Failed to create run folder:", e);
  }

  return { id: runId };
}

// ---------------------------------------------------------------------------
// updateRun
// ---------------------------------------------------------------------------

export async function updateRun(
  runId: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    hashtags?: string[];
    participant_ids?: string[];
  }
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Verify ownership
  const run = await db.query.runs.findFirst({
    columns: { createdBy: true },
    where: eq(runsTable.id, runId),
  });

  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  if (run.createdBy !== userId) {
    throw new Error("Forbidden: you are not the creator of this run");
  }

  // Build update payload — only include explicitly provided fields
  const updatePayload: any = {
    updatedAt: new Date().toISOString(),
  };

  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.location !== undefined) updatePayload.location = data.location;
  if (data.hashtags !== undefined) updatePayload.hashtags = JSON.stringify(data.hashtags);

  await db
    .update(runsTable)
    .set(updatePayload)
    .where(eq(runsTable.id, runId));

  // Replace participants if provided
  if (data.participant_ids !== undefined) {
    await db.delete(runParticipants).where(eq(runParticipants.runId, runId));

    if (data.participant_ids.length > 0) {
      await db.insert(runParticipants).values(
        data.participant_ids.map((uid) => ({ runId: runId, userId: uid }))
      );
    }
  }
}

// ---------------------------------------------------------------------------
// deleteRun
// ---------------------------------------------------------------------------

export async function deleteRun(runId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Verify ownership
  const run = await db.query.runs.findFirst({
    columns: { createdBy: true },
    where: eq(runsTable.id, runId),
  });

  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  if (run.createdBy !== userId) {
    throw new Error("Forbidden: you are not the creator of this run");
  }

  // Fetch all photos for R2 cleanup
  const photos = await db
    .select({ storagePath: photosTable.storagePath })
    .from(photosTable)
    .where(eq(photosTable.runId, runId));

  // Delete R2 objects in parallel
  if (photos.length > 0) {
    await Promise.all(
      photos.map((photo) => deleteObject(photo.storagePath))
    );
  }

  // Delete the run folder first (before run row cascade)
  try {
    await deleteRunFolder(runId);
  } catch (e) {
    console.error("Failed to delete run folder:", e);
  }

  // Delete the run — photos and participants should cascade via DB constraints
  await db.delete(runsTable).where(eq(runsTable.id, runId));
}
