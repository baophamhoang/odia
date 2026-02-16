"use server";

import { auth } from "@/app/lib/auth";
import { supabase } from "@/app/lib/db";
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
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: runs, error: runsError } = await supabase
    .from("runs")
    .select("*")
    .order("run_date", { ascending: false })
    .range(from, to);

  if (runsError) {
    throw new Error(`Failed to fetch runs: ${runsError.message}`);
  }

  if (!runs || runs.length === 0) {
    return [];
  }

  const runIds = runs.map((r) => r.id);
  const creatorIds = [...new Set(runs.map((r) => r.created_by as string))];

  // Fetch creators, participants, and photos in parallel
  const [
    { data: creators, error: creatorsError },
    { data: participants, error: participantsError },
    { data: photos, error: photosError },
    { data: photoCounts, error: photoCountsError },
  ] = await Promise.all([
    supabase.from("users").select("*").in("id", creatorIds),
    supabase
      .from("run_participants")
      .select("run_id, users(*)")
      .in("run_id", runIds),
    supabase
      .from("photos")
      .select("*")
      .in("run_id", runIds)
      .order("display_order", { ascending: true }),
    supabase
      .from("photos")
      .select("run_id")
      .in("run_id", runIds),
  ]);

  if (creatorsError) throw new Error(`Failed to fetch creators: ${creatorsError.message}`);
  if (participantsError) throw new Error(`Failed to fetch participants: ${participantsError.message}`);
  if (photosError) throw new Error(`Failed to fetch photos: ${photosError.message}`);
  if (photoCountsError) throw new Error(`Failed to fetch photo counts: ${photoCountsError.message}`);

  // Index creators by id
  const creatorMap = new Map<string, User>(
    (creators ?? []).map((u) => [u.id, u as User])
  );

  // Index participants by run_id
  const participantsByRun = new Map<string, User[]>();
  for (const row of participants ?? []) {
    const existing = participantsByRun.get(row.run_id) ?? [];
    existing.push(row.users as unknown as User);
    participantsByRun.set(row.run_id, existing);
  }

  // Count and group photos by run_id, limit to first 4 per run for preview
  const photoCountByRun = new Map<string, number>();
  const previewPhotosByRun = new Map<string, Photo[]>();

  for (const photo of photoCounts ?? []) {
    photoCountByRun.set(photo.run_id, (photoCountByRun.get(photo.run_id) ?? 0) + 1);
  }

  for (const photo of photos ?? []) {
    const existing = previewPhotosByRun.get(photo.run_id) ?? [];
    if (existing.length < 4) {
      existing.push(photo as Photo);
      previewPhotosByRun.set(photo.run_id, existing);
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
    const creator = creatorMap.get(run.created_by);
    if (!creator) {
      throw new Error(`Creator not found for run ${run.id}`);
    }
    return {
      ...(run as typeof run & { hashtags: string[] }),
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
  const { data: run, error: runError } = await supabase
    .from("runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (runError) {
    if (runError.code === "PGRST116") return null; // row not found
    throw new Error(`Failed to fetch run: ${runError.message}`);
  }

  if (!run) return null;

  const [
    { data: creator, error: creatorError },
    { data: participants, error: participantsError },
    { data: photos, error: photosError },
  ] = await Promise.all([
    supabase.from("users").select("*").eq("id", run.created_by).single(),
    supabase
      .from("run_participants")
      .select("users(*)")
      .eq("run_id", runId),
    supabase
      .from("photos")
      .select("*, uploader:uploaded_by(id, name, avatar_url)")
      .eq("run_id", runId)
      .order("display_order", { ascending: true }),
  ]);

  if (creatorError) throw new Error(`Failed to fetch creator: ${creatorError.message}`);
  if (participantsError) throw new Error(`Failed to fetch participants: ${participantsError.message}`);
  if (photosError) throw new Error(`Failed to fetch photos: ${photosError.message}`);

  const photosWithUrls = await attachSignedUrls((photos ?? []) as Photo[]);

  return {
    ...(run as typeof run & { hashtags: string[] }),
    creator: creator as User,
    participants: (participants ?? []).map((p) => p.users as unknown as User),
    photos: photosWithUrls,
  };
}

// ---------------------------------------------------------------------------
// createRun
// ---------------------------------------------------------------------------

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

  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      run_date: data.run_date,
      title: data.title ?? null,
      description: data.description ?? null,
      location: data.location ?? null,
      hashtags: data.hashtags ?? [],
      created_by: userId,
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create run: ${runError?.message}`);
  }

  const runId = run.id as string;

  // Insert participants and link photos in parallel
  const operations: Promise<unknown>[] = [];

  if (data.participant_ids.length > 0) {
    operations.push(
      Promise.resolve(
        supabase.from("run_participants").insert(
          data.participant_ids.map((uid) => ({ run_id: runId, user_id: uid }))
        )
      ).then(({ error }) => {
        if (error) throw new Error(`Failed to add participants: ${error.message}`);
      })
    );
  }

  if (data.photo_ids.length > 0) {
    operations.push(
      Promise.resolve(
        supabase
          .from("photos")
          .update({ run_id: runId })
          .in("id", data.photo_ids)
      ).then(({ error }) => {
        if (error) throw new Error(`Failed to link photos: ${error.message}`);
      })
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
  const { data: run, error: runError } = await supabase
    .from("runs")
    .select("created_by")
    .eq("id", runId)
    .single();

  if (runError || !run) {
    throw new Error(`Run not found: ${runError?.message ?? runId}`);
  }

  if (run.created_by !== userId) {
    throw new Error("Forbidden: you are not the creator of this run");
  }

  // Build update payload — only include explicitly provided fields
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.location !== undefined) updatePayload.location = data.location;
  if (data.hashtags !== undefined) updatePayload.hashtags = data.hashtags;

  const { error: updateError } = await supabase
    .from("runs")
    .update(updatePayload)
    .eq("id", runId);

  if (updateError) {
    throw new Error(`Failed to update run: ${updateError.message}`);
  }

  // Replace participants if provided
  if (data.participant_ids !== undefined) {
    const { error: deleteError } = await supabase
      .from("run_participants")
      .delete()
      .eq("run_id", runId);

    if (deleteError) {
      throw new Error(`Failed to remove participants: ${deleteError.message}`);
    }

    if (data.participant_ids.length > 0) {
      const { error: insertError } = await supabase
        .from("run_participants")
        .insert(
          data.participant_ids.map((uid) => ({ run_id: runId, user_id: uid }))
        );

      if (insertError) {
        throw new Error(`Failed to add participants: ${insertError.message}`);
      }
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
  const { data: run, error: runError } = await supabase
    .from("runs")
    .select("created_by")
    .eq("id", runId)
    .single();

  if (runError || !run) {
    throw new Error(`Run not found: ${runError?.message ?? runId}`);
  }

  if (run.created_by !== userId) {
    throw new Error("Forbidden: you are not the creator of this run");
  }

  // Fetch all photos for R2 cleanup
  const { data: photos, error: photosError } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("run_id", runId);

  if (photosError) {
    throw new Error(`Failed to fetch photos for run: ${photosError.message}`);
  }

  // Delete R2 objects in parallel
  if (photos && photos.length > 0) {
    await Promise.all(
      photos.map((photo) => deleteObject(photo.storage_path))
    );
  }

  // Delete the run folder first (before run row cascade)
  try {
    await deleteRunFolder(runId);
  } catch (e) {
    console.error("Failed to delete run folder:", e);
  }

  // Delete the run — photos and participants should cascade via DB constraints
  const { error: deleteError } = await supabase
    .from("runs")
    .delete()
    .eq("id", runId);

  if (deleteError) {
    throw new Error(`Failed to delete run: ${deleteError.message}`);
  }
}
