"use server";

import { db } from "@/app/lib/db";
import { folders as foldersTable, photos as photosTable, users as usersTable, runs as runsTable } from "@/app/lib/schema";
import { eq, and, sql, desc, inArray, like } from "drizzle-orm";
import { getDownloadUrl, deleteObject } from "@/app/lib/r2";
import { auth } from "@/app/lib/auth";
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
  const root = await db.query.folders.findFirst({
    where: eq(foldersTable.folderType, "root"),
  });

  if (!root) {
    throw new Error(`Root folder not found`);
  }

  return {
    ...root,
    parent_id: root.parentId,
    folder_type: root.folderType,
    run_id: root.runId,
    created_by: root.createdBy,
    created_at: root.createdAt,
    updated_at: root.updatedAt,
  } as unknown as Folder;
}

// ---------------------------------------------------------------------------
// createRootFolder
// ---------------------------------------------------------------------------

export async function createRootFolder(createdBy: string): Promise<Folder> {
  const existing = await db.query.folders.findFirst({
    where: eq(foldersTable.folderType, "root"),
  });

  if (existing) {
    return {
      ...existing,
      parent_id: existing.parentId,
      folder_type: existing.folderType,
      run_id: existing.runId,
      created_by: existing.createdBy,
      created_at: existing.createdAt,
      updated_at: existing.updatedAt,
    } as unknown as Folder;
  }

  const [newRoot] = await db
    .insert(foldersTable)
    .values({
      id: crypto.randomUUID(),
      parentId: null,
      name: "Vault",
      slug: "vault",
      folderType: "root",
      createdBy,
    })
    .returning();

  if (!newRoot) throw new Error("Failed to create root folder");

  return {
    ...newRoot,
    parent_id: newRoot.parentId,
    folder_type: newRoot.folderType,
    run_id: newRoot.runId,
    created_by: newRoot.createdBy,
    created_at: newRoot.createdAt,
    updated_at: newRoot.updatedAt,
  } as unknown as Folder;
}

// ---------------------------------------------------------------------------
// createRunFolder
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

  const datePart = format(runDate, "MMM d");
  const name = runTitle ? `${datePart} - ${runTitle}` : datePart;

  const existing = await db
    .select({ slug: foldersTable.slug })
    .from(foldersTable)
    .where(
      and(
        eq(foldersTable.parentId, rootId),
        like(foldersTable.slug, `${baseSlug}%`),
        eq(foldersTable.folderType, "run")
      )
    );

  const existingSlugs = new Set(existing.map((f) => f.slug));
  let slug = baseSlug;
  let suffix = 1;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}_${suffix}`;
    suffix++;
  }

  const [inserted] = await db
    .insert(foldersTable)
    .values({
      id: crypto.randomUUID(),
      parentId: rootId,
      name,
      slug,
      folderType: "run",
      runId: runId,
      createdBy: createdBy,
    })
    .returning({ id: foldersTable.id });

  if (!inserted) {
    throw new Error(`Failed to create run folder`);
  }

  return inserted.id;
}

// ---------------------------------------------------------------------------
// deleteRunFolder
// ---------------------------------------------------------------------------

export async function deleteRunFolder(runId: string): Promise<void> {
  await db
    .delete(foldersTable)
    .where(and(eq(foldersTable.runId, runId), eq(foldersTable.folderType, "run")));
}

// ---------------------------------------------------------------------------
// getRunFolderId
// ---------------------------------------------------------------------------

export async function getRunFolderId(runId: string): Promise<string | null> {
  const folder = await db.query.folders.findFirst({
    columns: { id: true },
    where: and(eq(foldersTable.runId, runId), eq(foldersTable.folderType, "run")),
  });

  return folder?.id ?? null;
}

// ---------------------------------------------------------------------------
// linkPhotosToRunFolder
// ---------------------------------------------------------------------------

export async function linkPhotosToRunFolder(
  runId: string,
  folderId: string
): Promise<void> {
  await db
    .update(photosTable)
    .set({ folderId: folderId })
    .where(eq(photosTable.runId, runId));
}

// ---------------------------------------------------------------------------
// linkPhotosToFolder
// ---------------------------------------------------------------------------

export async function linkPhotosToFolder(
  folderId: string,
  photoIds: string[]
): Promise<void> {
  if (photoIds.length === 0) return;

  await db
    .update(photosTable)
    .set({ folderId: folderId })
    .where(inArray(photosTable.id, photoIds));
}

// ---------------------------------------------------------------------------
// getFolderChildren
// ---------------------------------------------------------------------------

export async function getFolderChildren(
  folderId: string
): Promise<FolderWithMeta[]> {
  const subfolders = await db
    .select()
    .from(foldersTable)
    .where(eq(foldersTable.parentId, folderId))
    .orderBy(foldersTable.name);

  const folders = subfolders.map(f => ({
    ...f,
    parent_id: f.parentId,
    folder_type: f.folderType,
    run_id: f.runId,
    created_by: f.createdBy,
    created_at: f.createdAt,
    updated_at: f.updatedAt,
  })) as unknown as Folder[];

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

  const [inserted] = await db
    .insert(foldersTable)
    .values({
      id: crypto.randomUUID(),
      parentId: parentId,
      name,
      slug,
      folderType: "custom",
      createdBy: createdBy,
    })
    .returning();

  if (!inserted) {
    throw new Error(`Failed to create folder`);
  }

  return {
    ...inserted,
    parent_id: inserted.parentId,
    folder_type: inserted.folderType,
    run_id: inserted.runId,
    created_by: inserted.createdBy,
    created_at: inserted.createdAt,
    updated_at: inserted.updatedAt,
  } as unknown as Folder;
}

// ---------------------------------------------------------------------------
// getBreadcrumbs
// ---------------------------------------------------------------------------

export async function getBreadcrumbs(
  folderId: string
): Promise<BreadcrumbItem[]> {
  try {
    // Recursive CTE for breadcrumbs in SQLite
    const query = sql`
      WITH RECURSIVE breadcrumbs AS (
        SELECT id, parent_id, name, slug, folder_type, 0 as level
        FROM folders
        WHERE id = ${folderId}
        
        UNION ALL
        
        SELECT f.id, f.parent_id, f.name, f.slug, f.folder_type, b.level + 1
        FROM folders f
        JOIN breadcrumbs b ON f.id = b.parent_id
      )
      SELECT id, name, slug, folder_type
      FROM breadcrumbs
      ORDER BY level DESC
    `;

    const result = await db.run(query);
    return result.rows as unknown as BreadcrumbItem[];
  } catch (e) {
    console.error("Breadcrumbs CTE failed, using fallback:", e);
    return getBreadcrumbsFallback(folderId);
  }
}

async function getBreadcrumbsFallback(
  folderId: string
): Promise<BreadcrumbItem[]> {
  const crumbs: BreadcrumbItem[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const row = await db.query.folders.findFirst({
      columns: { id: true, parentId: true, name: true, slug: true, folderType: true },
      where: eq(foldersTable.id, currentId),
    });

    if (!row) break;

    crumbs.unshift({
      id: row.id,
      name: row.name,
      slug: row.slug,
      folder_type: row.folderType as BreadcrumbItem["folder_type"],
    });

    currentId = row.parentId;
  }

  return crumbs;
}

// ---------------------------------------------------------------------------
// getFolderContents
// ---------------------------------------------------------------------------

export async function getFolderContents(
  folderId: string
): Promise<FolderContents> {
  const [folder, rawSubfolders, photos] = await Promise.all([
    db.query.folders.findFirst({ where: eq(foldersTable.id, folderId) }),
    db
      .select()
      .from(foldersTable)
      .where(eq(foldersTable.parentId, folderId))
      .orderBy(foldersTable.slug),
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
      .where(eq(photosTable.folderId, folderId))
      .orderBy(photosTable.displayOrder),
  ]);

  if (!folder) {
    throw new Error(`Folder not found: ${folderId}`);
  }

  const folderData = {
    ...folder,
    parent_id: folder.parentId,
    folder_type: folder.folderType,
    run_id: folder.runId,
    created_by: folder.createdBy,
    created_at: folder.createdAt,
    updated_at: folder.updatedAt,
  } as unknown as Folder;

  const subfoldersData = rawSubfolders.map(f => ({
    ...f,
    parent_id: f.parentId,
    folder_type: f.folderType,
    run_id: f.runId,
    created_by: f.createdBy,
    created_at: f.createdAt,
    updated_at: f.updatedAt,
  })) as unknown as Folder[];

  const sortedSubfolders = sortSubfolders(subfoldersData, folderData.folder_type);
  const enrichedSubfolders = await enrichSubfolders(sortedSubfolders);

  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => ({
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
      uploader: photo.uploader,
      url: await getDownloadUrl(photo.storagePath),
    } as unknown as Photo))
  );

  return { folder: folderData, subfolders: enrichedSubfolders, photos: photosWithUrls };
}

// ---------------------------------------------------------------------------
// Subfolder sorting
// ---------------------------------------------------------------------------

function sortSubfolders(folders: Folder[], parentType: string): Folder[] {
  return [...folders].sort((a, b) => {
    if (parentType === "root") {
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
// Enrich subfolders
// ---------------------------------------------------------------------------

async function enrichSubfolders(
  folders: Folder[]
): Promise<FolderWithMeta[]> {
  return Promise.all(
    folders.map(async (folder) => {
      const [subfolderCount, photoCount, previewPhoto] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(foldersTable)
          .where(eq(foldersTable.parentId, folder.id)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(photosTable)
          .where(eq(photosTable.folderId, folder.id)),
        getPreviewPhoto(folder),
      ]);

      const itemCount = (subfolderCount[0]?.count ?? 0) + (photoCount[0]?.count ?? 0);

      return {
        ...folder,
        item_count: itemCount,
        preview_url: previewPhoto ?? undefined,
      };
    })
  );
}

// ---------------------------------------------------------------------------
// Get preview photo
// ---------------------------------------------------------------------------

async function getPreviewPhoto(folder: Folder): Promise<string | null> {
  const photo = await db.query.photos.findFirst({
    columns: { storagePath: true },
    where: eq(photosTable.folderId, folder.id),
    orderBy: [photosTable.displayOrder],
  });

  if (photo) {
    return getDownloadUrl(photo.storagePath);
  }

  if (folder.folder_type === "custom") {
    const childFolders = await db
      .select({ id: foldersTable.id })
      .from(foldersTable)
      .where(eq(foldersTable.parentId, folder.id))
      .limit(5);

    for (const child of childFolders) {
      const childPhoto = await db.query.photos.findFirst({
        columns: { storagePath: true },
        where: eq(photosTable.folderId, child.id),
        orderBy: [desc(photosTable.createdAt)],
      });

      if (childPhoto) {
        return getDownloadUrl(childPhoto.storagePath);
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// deleteFolder
// ---------------------------------------------------------------------------

async function getDescendantFolderIds(rootId: string): Promise<string[]> {
  const query = sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM folders WHERE id = ${rootId}
      UNION ALL
      SELECT f.id FROM folders f JOIN descendants d ON f.parent_id = d.id
    )
    SELECT id FROM descendants
  `;
  try {
    const result = await db.run(query);
    return (result.rows as unknown as { id: string }[]).map(r => r.id);
  } catch {
    const ids = [rootId];
    const queue = [rootId];
    while (queue.length) {
      const pid = queue.shift()!;
      const children = await db
        .select({ id: foldersTable.id })
        .from(foldersTable)
        .where(eq(foldersTable.parentId, pid));
      for (const c of children) { ids.push(c.id); queue.push(c.id); }
    }
    return ids;
  }
}

export async function deleteFolder(folderId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const folder = await db.query.folders.findFirst({
    where: eq(foldersTable.id, folderId),
  });
  if (!folder) throw new Error("Folder not found");
  if (folder.folderType !== "custom") throw new Error("Only custom folders can be deleted");
  if (folder.createdBy !== session.user.id && session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  const folderIds = await getDescendantFolderIds(folderId);

  const photos = await db
    .select({ storagePath: photosTable.storagePath })
    .from(photosTable)
    .where(inArray(photosTable.folderId, folderIds));

  if (photos.length > 0) {
    await Promise.all(photos.map(p => deleteObject(p.storagePath)));
    await db.delete(photosTable).where(inArray(photosTable.folderId, folderIds));
  }

  await db.delete(foldersTable).where(eq(foldersTable.id, folderId));
}

// ---------------------------------------------------------------------------
// migrateExistingRuns
// ---------------------------------------------------------------------------

export async function migrateExistingRuns(): Promise<{
  migrated: number;
  skipped: number;
}> {
  let root = await db.query.folders.findFirst({
    where: eq(foldersTable.folderType, "root"),
  });

  if (!root) {
    const admin = await db.query.users.findFirst({
      where: eq(usersTable.role, "admin"),
    });

    if (!admin) {
      throw new Error("No admin user found to create root folder");
    }

    const [newRoot] = await db
      .insert(foldersTable)
      .values({
        id: crypto.randomUUID(),
        parentId: null,
        name: "Vault",
        slug: "vault",
        folderType: "root",
        createdBy: admin.id,
      })
      .returning();
    
    root = newRoot;
  }

  const runs = await db
    .select()
    .from(runsTable)
    .orderBy(runsTable.runDate);

  let migrated = 0;
  let skipped = 0;

  for (const run of runs) {
    const existingFolder = await db.query.folders.findFirst({
      where: and(eq(foldersTable.runId, run.id), eq(foldersTable.folderType, "run")),
    });

    if (existingFolder) {
      skipped++;
      continue;
    }

    const runDate = new Date(run.runDate);
    const folderId = await createRunFolder(
      root!.id,
      run.id,
      run.title,
      runDate,
      run.createdBy
    );

    await linkPhotosToRunFolder(run.id, folderId);
    migrated++;
  }

  return { migrated, skipped };
}
