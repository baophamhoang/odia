-- Migration 002: Flatten folder structure (year/month → flat run_YYYY-MM-DD at root)
-- Run this in your Supabase SQL Editor.

-- 1. Drop the old CHECK constraint first
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_folder_type_check;

-- 2. Delete old year/month/date_group folders (cascades children via ON DELETE CASCADE)
DELETE FROM folders WHERE folder_type IN ('year', 'month', 'date_group');

-- 3. Delete any orphaned run folders whose parent was just deleted
DELETE FROM folders WHERE folder_type = 'run'
  AND parent_id IS NOT NULL
  AND parent_id NOT IN (SELECT id FROM folders);

-- 4. Now add the new constraint (all remaining rows are root/run/custom)
ALTER TABLE folders ADD CONSTRAINT folders_folder_type_check
  CHECK (folder_type IN ('root', 'run', 'custom'));
