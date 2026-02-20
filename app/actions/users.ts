'use server';

import { auth } from '@/app/lib/auth';
import { db } from '@/app/lib/db';
import { users as usersTable, photos as photosTable, runs as runsTable, runParticipants, folders as foldersTable } from '@/app/lib/schema';
import { eq, inArray, desc, sql, and } from 'drizzle-orm';
import { getDownloadUrl, objectExists } from '@/app/lib/r2';
import type { User, Photo, Run, RunCard, Folder } from '@/app/lib/types';

// ---------------------------------------------------------------------------
// getTeamMembers
// ---------------------------------------------------------------------------

export async function getTeamMembers(): Promise<User[]> {
  const members = await db.select().from(usersTable).orderBy(usersTable.name);
  return members as User[];
}

// ---------------------------------------------------------------------------
// getMyUploadedPhotos
// ---------------------------------------------------------------------------

export async function getMyUploadedPhotos(): Promise<
  (Photo & { run: Run | null; folder: Folder | null })[]
> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const userId = session.user.id;

  const photos = await db
    .select({
      photo: photosTable,
      run: runsTable,
      folder: foldersTable,
    })
    .from(photosTable)
    .leftJoin(runsTable, eq(photosTable.runId, runsTable.id))
    .leftJoin(foldersTable, eq(photosTable.folderId, foldersTable.id))
    .where(eq(photosTable.uploadedBy, userId))
    .orderBy(desc(photosTable.createdAt));

  const results = await Promise.all(
    photos.map(async (row) => {
      const { photo, run, folder } = row;

      // If this photo points to a deleted run (stale/orphaned row), hide it.
      if (photo.runId && !run) {
        return null;
      }

      // If object no longer exists in storage, hide it to avoid broken images.
      const exists = await objectExists(photo.storagePath);
      if (!exists) {
        return null;
      }

      const url = await getDownloadUrl(photo.storagePath);

      return {
        id: photo.id,
        run_id: photo.runId,
        folder_id: photo.folderId,
        storage_path: photo.storagePath,
        file_name: photo.fileName,
        file_size: photo.fileSize,
        mime_type: photo.mimeType,
        display_order: photo.displayOrder,
        uploaded_by: photo.uploadedBy,
        created_at: photo.createdAt,
        url,
        run: run ? {
          ...run,
          run_date: run.runDate,
          created_by: run.createdBy,
          created_at: run.createdAt,
          updated_at: run.updatedAt,
          hashtags: JSON.parse(run.hashtags ?? "[]")
        } as unknown as Run : null,
        folder: folder ? {
          ...folder,
          parent_id: folder.parentId,
          folder_type: folder.folderType,
          run_id: folder.runId,
          created_by: folder.createdBy,
          created_at: folder.createdAt,
          updated_at: folder.updatedAt
        } as unknown as Folder : null,
      };
    }),
  );

  return results.filter(Boolean) as (Photo & { run: Run | null; folder: Folder | null })[];
}

// ---------------------------------------------------------------------------
// getMyTaggedRuns
// ---------------------------------------------------------------------------

export async function getMyTaggedRuns(): Promise<RunCard[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const userId = session.user.id;

  // Find run ids where current user is a participant
  const participations = await db
    .select({ runId: runParticipants.runId })
    .from(runParticipants)
    .where(eq(runParticipants.userId, userId));

  const runIds = participations.map((p) => p.runId).filter(Boolean) as string[];

  if (runIds.length === 0) {
    return [];
  }

  const runs = await db
    .select()
    .from(runsTable)
    .where(inArray(runsTable.id, runIds))
    .orderBy(desc(runsTable.runDate));

  if (runs.length === 0) {
    return [];
  }

  const creatorIds = [...new Set(runs.map((r) => r.createdBy))];

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

  // Index creators
  const creatorMap = new Map<string, User>(
    creators.map((u) => [u.id, u as User]),
  );

  // Group participants by run
  const participantsByRun = new Map<string, User[]>();
  for (const row of participants) {
    if (!row.run_id) continue;
    const existing = participantsByRun.get(row.run_id) ?? [];
    existing.push(row.user as User);
    participantsByRun.set(row.run_id, existing);
  }

  // Index photo counts
  const photoCountByRun = new Map<string, number>();
  for (const row of photoCounts) {
    if (row.run_id) {
      photoCountByRun.set(row.run_id, row.count);
    }
  }

  // Collect preview (first 4)
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

  // Sign preview photo URLs per run
  const signedPreviewsByRun = new Map<string, Photo[]>();
  await Promise.all(
    Array.from(previewPhotosByRun.entries()).map(async ([runId, runPhotos]) => {
      const signed = await Promise.all(
        runPhotos.map(async (p) => ({
          ...p,
          url: await getDownloadUrl(p.storage_path),
        })),
      );
      signedPreviewsByRun.set(runId, signed);
    }),
  );

  return runs.map((run) => {
    const creator = creatorMap.get(run.createdBy);
    if (!creator) throw new Error(`Creator not found for run ${run.id}`);

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
}
