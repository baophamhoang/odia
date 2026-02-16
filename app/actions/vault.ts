"use server";

import { supabase } from "@/app/lib/db";
import { getDownloadUrl } from "@/app/lib/r2";
import type {
  Folder,
  FolderWithMeta,
  BreadcrumbItem,
  FolderContents,
  Photo,
} from "@/app/lib/types";

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function normalizeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDateSlug(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `run_${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// getRootFolder
// ---------------------------------------------------------------------------

export async function getRootFolder(): Promise<Folder> {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("folder_type", "root")
    .single();

  if (error || !data) {
    throw new Error(`Root folder not found: ${error?.message}`);
  }

  return data as Folder;
}

// ---------------------------------------------------------------------------
// createRunFolder — flat at root: run_YYYY-MM-DD, run_YYYY-MM-DD_1, etc.
// ---------------------------------------------------------------------------

export async function createRunFolder(
  rootId: string,
  runId: string,
  runTitle: string | null,
  runDate: Date,
  createdBy: string
): Promise<string> {
  const { format } = await import("date-fns");
  const baseSlug = formatDateSlug(runDate);

  // Display name: "Feb 15 - Morning Run" or just "Feb 15" if no title
  const datePart = format(runDate, "MMM d");
  const name = runTitle ? `${datePart} - ${runTitle}` : datePart;

  // Find a unique slug: run_2025-02-15, run_2025-02-15_1, run_2025-02-15_2, ...
  const { data: existing } = await supabase
    .from("folders")
    .select("slug")
    .eq("parent_id", rootId)
    .like("slug", `${baseSlug}%`)
    .eq("folder_type", "run");

  const existingSlugs = new Set((existing ?? []).map((f) => f.slug));
  let slug = baseSlug;
  let suffix = 1;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}_${suffix}`;
    suffix++;
  }

  const { data, error } = await supabase
    .from("folders")
    .insert({
      parent_id: rootId,
      name,
      slug,
      folder_type: "run",
      run_id: runId,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create run folder: ${error?.message}`);
  }

  return data.id;
}

// ---------------------------------------------------------------------------
// deleteRunFolder
// ---------------------------------------------------------------------------

export async function deleteRunFolder(runId: string): Promise<void> {
  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("run_id", runId)
    .eq("folder_type", "run");

  if (error) {
    throw new Error(`Failed to delete run folder: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// getRunFolderId — find the folder for a given run
// ---------------------------------------------------------------------------

export async function getRunFolderId(runId: string): Promise<string | null> {
  const { data } = await supabase
    .from("folders")
    .select("id")
    .eq("run_id", runId)
    .eq("folder_type", "run")
    .single();

  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// linkPhotosToRunFolder — links all photos of a run to a folder
// ---------------------------------------------------------------------------

export async function linkPhotosToRunFolder(
  runId: string,
  folderId: string
): Promise<void> {
  const { error } = await supabase
    .from("photos")
    .update({ folder_id: folderId })
    .eq("run_id", runId);

  if (error) {
    throw new Error(`Failed to link photos to folder: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// linkPhotosToFolder — links specific photo IDs to a folder (for uploads)
// ---------------------------------------------------------------------------

export async function linkPhotosToFolder(
  folderId: string,
  photoIds: string[]
): Promise<void> {
  if (photoIds.length === 0) return;

  const { error } = await supabase
    .from("photos")
    .update({ folder_id: folderId })
    .in("id", photoIds);

  if (error) {
    throw new Error(`Failed to link photos to folder: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// getFolderChildren — lightweight: returns just subfolders (no photos)
// ---------------------------------------------------------------------------

export async function getFolderChildren(
  folderId: string
): Promise<FolderWithMeta[]> {
  const { data: subfolders, error } = await supabase
    .from("folders")
    .select("*")
    .eq("parent_id", folderId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch children: ${error.message}`);
  }

  const folders = (subfolders ?? []) as Folder[];

  // Sort: run folders descending by slug (newest first), others alphabetical
  const sorted = [...folders].sort((a, b) => {
    if (a.folder_type === "run" && b.folder_type === "run") {
      return b.slug.localeCompare(a.slug);
    }
    if (a.folder_type === "run") return -1;
    if (b.folder_type === "run") return 1;
    return a.name.localeCompare(b.name);
  });

  return enrichSubfolders(sorted);
}

// ---------------------------------------------------------------------------
// createCustomFolder
// ---------------------------------------------------------------------------

export async function createCustomFolder(
  parentId: string,
  name: string,
  createdBy: string
): Promise<Folder> {
  const slug = normalizeSlug(name);

  const { data, error } = await supabase
    .from("folders")
    .insert({
      parent_id: parentId,
      name,
      slug,
      folder_type: "custom",
      created_by: createdBy,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create folder: ${error?.message}`);
  }

  return data as Folder;
}

// ---------------------------------------------------------------------------
// getBreadcrumbs
// ---------------------------------------------------------------------------

export async function getBreadcrumbs(
  folderId: string
): Promise<BreadcrumbItem[]> {
  const { data, error } = await supabase.rpc("get_folder_breadcrumbs", {
    folder_id: folderId,
  });

  if (error) {
    return getBreadcrumbsFallback(folderId);
  }

  return (data as BreadcrumbItem[]) ?? [];
}

async function getBreadcrumbsFallback(
  folderId: string
): Promise<BreadcrumbItem[]> {
  const crumbs: BreadcrumbItem[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const result = await supabase
      .from("folders")
      .select("id, parent_id, name, slug, folder_type")
      .eq("id", currentId)
      .single();

    if (result.error || !result.data) break;

    const row = result.data as {
      id: string;
      parent_id: string | null;
      name: string;
      slug: string;
      folder_type: string;
    };

    crumbs.unshift({
      id: row.id,
      name: row.name,
      slug: row.slug,
      folder_type: row.folder_type as BreadcrumbItem["folder_type"],
    });

    currentId = row.parent_id;
  }

  return crumbs;
}

// ---------------------------------------------------------------------------
// getFolderContents
// ---------------------------------------------------------------------------

export async function getFolderContents(
  folderId: string
): Promise<FolderContents> {
  const [folderResult, subfoldersResult, photosResult] = await Promise.all([
    supabase.from("folders").select("*").eq("id", folderId).single(),
    supabase
      .from("folders")
      .select("*")
      .eq("parent_id", folderId)
      .order("slug", { ascending: true }),
    supabase
      .from("photos")
      .select("*, uploader:uploaded_by(id, name, avatar_url)")
      .eq("folder_id", folderId)
      .order("display_order", { ascending: true }),
  ]);

  if (folderResult.error || !folderResult.data) {
    throw new Error(
      `Folder not found: ${folderResult.error?.message ?? folderId}`
    );
  }

  if (subfoldersResult.error) {
    throw new Error(
      `Failed to fetch subfolders: ${subfoldersResult.error.message}`
    );
  }

  if (photosResult.error) {
    throw new Error(
      `Failed to fetch photos: ${photosResult.error.message}`
    );
  }

  const folder = folderResult.data as Folder;
  const rawSubfolders = (subfoldersResult.data ?? []) as Folder[];
  const photos = (photosResult.data ?? []) as Photo[];

  const sortedSubfolders = sortSubfolders(rawSubfolders, folder.folder_type);
  const subfolders = await enrichSubfolders(sortedSubfolders);

  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      url: await getDownloadUrl(photo.storage_path),
    }))
  );

  return { folder, subfolders, photos: photosWithUrls };
}

// ---------------------------------------------------------------------------
// Subfolder sorting
// ---------------------------------------------------------------------------

function sortSubfolders(folders: Folder[], parentType: string): Folder[] {
  return [...folders].sort((a, b) => {
    if (parentType === "root") {
      // Run folders descending by slug (newest first), then custom alphabetical
      if (a.folder_type === "run" && b.folder_type === "run") {
        return b.slug.localeCompare(a.slug);
      }
      if (a.folder_type === "run") return -1;
      if (b.folder_type === "run") return 1;
      return a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });
}

// ---------------------------------------------------------------------------
// Enrich subfolders with item_count and preview_url
// ---------------------------------------------------------------------------

async function enrichSubfolders(
  folders: Folder[]
): Promise<FolderWithMeta[]> {
  return Promise.all(
    folders.map(async (folder) => {
      const [subfolderCount, photoCount, previewPhoto] = await Promise.all([
        supabase
          .from("folders")
          .select("id", { count: "exact", head: true })
          .eq("parent_id", folder.id),
        supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("folder_id", folder.id),
        getPreviewPhoto(folder),
      ]);

      const itemCount =
        (subfolderCount.count ?? 0) + (photoCount.count ?? 0);

      return {
        ...folder,
        item_count: itemCount,
        preview_url: previewPhoto ?? undefined,
      };
    })
  );
}

// ---------------------------------------------------------------------------
// Get a preview photo URL for a folder
// ---------------------------------------------------------------------------

async function getPreviewPhoto(folder: Folder): Promise<string | null> {
  // Direct photos in this folder
  const { data } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("folder_id", folder.id)
    .order("display_order", { ascending: true })
    .limit(1);

  if (data?.[0]) {
    return getDownloadUrl(data[0].storage_path);
  }

  // For custom folders, check child folders
  if (folder.folder_type === "custom") {
    const { data: childFolders } = await supabase
      .from("folders")
      .select("id")
      .eq("parent_id", folder.id)
      .limit(5);

    if (childFolders) {
      for (const child of childFolders) {
        const { data: childPhoto } = await supabase
          .from("photos")
          .select("storage_path")
          .eq("folder_id", child.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (childPhoto?.[0]) {
          return getDownloadUrl(childPhoto[0].storage_path);
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// migrateExistingRuns — rebuilds folder structure with flat hierarchy
// ---------------------------------------------------------------------------

export async function migrateExistingRuns(): Promise<{
  migrated: number;
  skipped: number;
}> {
  let root: Folder;
  const { data: existingRoot } = await supabase
    .from("folders")
    .select("*")
    .eq("folder_type", "root")
    .single();

  if (existingRoot) {
    root = existingRoot as Folder;
  } else {
    const { data: admin } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!admin) {
      throw new Error("No admin user found to create root folder");
    }

    const { data: newRoot, error: rootError } = await supabase
      .from("folders")
      .insert({
        parent_id: null,
        name: "Vault",
        slug: "vault",
        folder_type: "root",
        created_by: admin.id,
      })
      .select("*")
      .single();

    if (rootError || !newRoot) {
      throw new Error(`Failed to create root folder: ${rootError?.message}`);
    }

    root = newRoot as Folder;
  }

  const { data: runs, error: runsError } = await supabase
    .from("runs")
    .select("id, run_date, title, created_by")
    .order("run_date", { ascending: true });

  if (runsError) {
    throw new Error(`Failed to fetch runs: ${runsError.message}`);
  }

  let migrated = 0;
  let skipped = 0;

  for (const run of runs ?? []) {
    const { data: existingFolder } = await supabase
      .from("folders")
      .select("id")
      .eq("run_id", run.id)
      .eq("folder_type", "run")
      .single();

    if (existingFolder) {
      skipped++;
      continue;
    }

    const runDate = new Date(run.run_date);
    const folderId = await createRunFolder(
      root.id,
      run.id,
      run.title,
      runDate,
      run.created_by
    );

    await linkPhotosToRunFolder(run.id, folderId);

    migrated++;
  }

  return { migrated, skipped };
}
