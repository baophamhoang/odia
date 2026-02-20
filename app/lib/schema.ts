import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Users & Auth
// ---------------------------------------------------------------------------

export const allowedEmails = sqliteTable("allowed_emails", {
  id: text("id").primaryKey().default(sql`(uuid())`),
  email: text("email").notNull().unique(),
  addedBy: text("added_by").references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(uuid())`),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey().default(sql`(uuid())`),
  runDate: text("run_date").notNull(), // SQLite date as ISO string
  title: text("title"),
  description: text("description"),
  location: text("location"),
  hashtags: text("hashtags").default("[]"), // SQLite doesn't have arrays, storing as JSON string
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => [
  index("idx_runs_date").on(table.runDate),
  index("idx_runs_created_by").on(table.createdBy),
]);

export const runParticipants = sqliteTable("run_participants", {
  runId: text("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.runId, table.userId] }),
  index("idx_run_participants_user").on(table.userId),
]);

// ---------------------------------------------------------------------------
// Folders (Vault)
// ---------------------------------------------------------------------------

export const folders = sqliteTable("folders", {
  id: text("id").primaryKey().default(sql`(uuid())`),
  parentId: text("parent_id").references((): any => folders.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  folderType: text("folder_type", { enum: ["root", "run", "custom"] }).notNull().default("custom"),
  runId: text("run_id").references(() => runs.id, { onDelete: "set null" }),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => [
  uniqueIndex("idx_folders_parent_slug").on(table.parentId, table.slug),
  index("idx_folders_parent").on(table.parentId),
  index("idx_folders_run").on(table.runId),
]);

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey().default(sql`(uuid())`),
  runId: text("run_id").references(() => runs.id, { onDelete: "cascade" }),
  folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
  storagePath: text("storage_path").notNull().unique(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  displayOrder: integer("display_order").default(0),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
}, (table) => [
  index("idx_photos_run").on(table.runId, table.displayOrder),
  index("idx_photos_uploaded_by").on(table.uploadedBy),
  index("idx_photos_folder").on(table.folderId),
]);
