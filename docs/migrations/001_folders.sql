-- Migration 001: Vault folder directory
-- Run this in your Supabase SQL Editor against an existing database.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards.

-- 1. Folders table
CREATE TABLE IF NOT EXISTS folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES folders(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  folder_type TEXT NOT NULL DEFAULT 'custom'
              CHECK (folder_type IN ('root', 'year', 'month', 'run', 'custom')),
  run_id      UUID REFERENCES runs(id) ON DELETE SET NULL,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_run    ON folders(run_id) WHERE run_id IS NOT NULL;

-- 2. Add folder_id to photos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_photos_folder ON photos(folder_id);

-- 3. Seed root folder (skip if already exists)
INSERT INTO folders (parent_id, name, slug, folder_type, created_by)
SELECT
  NULL,
  'Vault',
  'vault',
  'root',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM folders WHERE folder_type = 'root'
);
