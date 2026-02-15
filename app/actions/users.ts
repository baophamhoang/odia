'use server';

import { auth } from '@/app/lib/auth';
import { supabase } from '@/app/lib/db';
import { getDownloadUrl, objectExists } from '@/app/lib/r2';
import type { User, Photo, Run, RunCard } from '@/app/lib/types';

// ---------------------------------------------------------------------------
// getTeamMembers
// ---------------------------------------------------------------------------

export async function getTeamMembers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch team members: ${error.message}`);
  }

  return (data ?? []) as User[];
}

// ---------------------------------------------------------------------------
// getMyUploadedPhotos
// ---------------------------------------------------------------------------

export async function getMyUploadedPhotos(): Promise<
  (Photo & { run: Run | null })[]
> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const userId = session.user.id;

  const { data: photos, error } = await supabase
    .from('photos')
    .select('*, runs(*)')
    .eq('uploaded_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch uploaded photos: ${error.message}`);
  }

  const results = await Promise.all(
    (photos ?? []).map(async (row) => {
      const { runs, ...photoFields } = row as typeof row & {
        runs: Run | null;
      };

      // If this photo points to a deleted run (stale/orphaned row), hide it.
      if (photoFields.run_id && !runs) {
        return null;
      }

      // If object no longer exists in storage, hide it to avoid broken images.
      const exists = await objectExists(photoFields.storage_path);
      if (!exists) {
        return null;
      }

      const url = await getDownloadUrl(photoFields.storage_path);

      return {
        ...(photoFields as Photo),
        url,
        run: runs ?? null,
      };
    }),
  );

  return results.filter(Boolean) as (Photo & { run: Run | null })[];
}

// ---------------------------------------------------------------------------
// getMyTaggedRuns
// ---------------------------------------------------------------------------

export async function getMyTaggedRuns(): Promise<RunCard[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const userId = session.user.id;

  // Find run ids where current user is a participant
  const { data: participations, error: participationsError } = await supabase
    .from('run_participants')
    .select('run_id')
    .eq('user_id', userId);

  if (participationsError) {
    throw new Error(
      `Failed to fetch participations: ${participationsError.message}`,
    );
  }

  const runIds = (participations ?? []).map((p) => p.run_id as string);

  if (runIds.length === 0) {
    return [];
  }

  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('*')
    .in('id', runIds)
    .order('run_date', { ascending: false });

  if (runsError) {
    throw new Error(`Failed to fetch tagged runs: ${runsError.message}`);
  }

  if (!runs || runs.length === 0) {
    return [];
  }

  const creatorIds = [...new Set(runs.map((r) => r.created_by as string))];

  const [
    { data: creators, error: creatorsError },
    { data: participants, error: participantsError },
    { data: photos, error: photosError },
    { data: photoCounts, error: photoCountsError },
  ] = await Promise.all([
    supabase.from('users').select('*').in('id', creatorIds),
    supabase
      .from('run_participants')
      .select('run_id, users(*)')
      .in('run_id', runIds),
    supabase
      .from('photos')
      .select('*')
      .in('run_id', runIds)
      .order('display_order', { ascending: true }),
    supabase.from('photos').select('run_id').in('run_id', runIds),
  ]);

  if (creatorsError)
    throw new Error(`Failed to fetch creators: ${creatorsError.message}`);
  if (participantsError)
    throw new Error(
      `Failed to fetch participants: ${participantsError.message}`,
    );
  if (photosError)
    throw new Error(`Failed to fetch photos: ${photosError.message}`);
  if (photoCountsError)
    throw new Error(
      `Failed to fetch photo counts: ${photoCountsError.message}`,
    );

  // Index creators
  const creatorMap = new Map<string, User>(
    (creators ?? []).map((u) => [u.id, u as User]),
  );

  // Group participants by run
  const participantsByRun = new Map<string, User[]>();
  for (const row of participants ?? []) {
    const existing = participantsByRun.get(row.run_id) ?? [];
    existing.push(row.users as unknown as User);
    participantsByRun.set(row.run_id, existing);
  }

  // Count photos per run and collect preview (first 4)
  const photoCountByRun = new Map<string, number>();
  const previewPhotosByRun = new Map<string, Photo[]>();

  for (const photo of photoCounts ?? []) {
    photoCountByRun.set(
      photo.run_id,
      (photoCountByRun.get(photo.run_id) ?? 0) + 1,
    );
  }

  for (const photo of photos ?? []) {
    const existing = previewPhotosByRun.get(photo.run_id) ?? [];
    if (existing.length < 4) {
      existing.push(photo as Photo);
      previewPhotosByRun.set(photo.run_id, existing);
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
    const creator = creatorMap.get(run.created_by);
    if (!creator) throw new Error(`Creator not found for run ${run.id}`);

    return {
      ...(run as typeof run & { hashtags: string[] }),
      creator,
      participants: participantsByRun.get(run.id) ?? [],
      photos: signedPreviewsByRun.get(run.id) ?? [],
      photo_count: photoCountByRun.get(run.id) ?? 0,
    };
  });
}
