export type UserRole = "admin" | "member";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface Run {
  id: string;
  run_date: string;
  title: string | null;
  description: string | null;
  location: string | null;
  hashtags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RunWithDetails extends Run {
  creator: User;
  participants: User[];
  photos: Photo[];
}

export interface RunCard extends Run {
  creator: User;
  participants: User[];
  photos: Photo[];
  photo_count: number;
}

export interface Photo {
  id: string;
  run_id: string;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  display_order: number;
  uploaded_by: string;
  created_at: string;
  url?: string; // signed URL, generated on demand
  uploader?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

// ---------------------------------------------------------------------------
// Folders (vault directory)
// ---------------------------------------------------------------------------

export type FolderType = "root" | "run" | "custom";

export interface FolderTreeNode {
  id: string;
  name: string;
  folder_type: FolderType;
  run_id: string | null;
  children?: FolderTreeNode[]; // undefined = not loaded, [] = leaf
}

export interface Folder {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  folder_type: FolderType;
  run_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FolderWithMeta extends Folder {
  item_count: number;
  preview_url?: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  slug: string;
  folder_type: FolderType;
}

export interface FolderContents {
  folder: Folder;
  subfolders: FolderWithMeta[];
  photos: Photo[];
}

export interface AllowedEmail {
  id: string;
  email: string;
  added_by: string | null;
  created_at: string;
}
