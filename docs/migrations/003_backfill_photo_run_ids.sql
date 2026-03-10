-- Backfill run_id on photos that are linked to a run folder but missing run_id.
-- Run once via Turso console or: npx drizzle-kit execute drizzle/backfill-photo-run-ids.sql

UPDATE photos
SET run_id = (
  SELECT folders.run_id
  FROM folders
  WHERE folders.id = photos.folder_id
    AND folders.run_id IS NOT NULL
)
WHERE folder_id IS NOT NULL
  AND run_id IS NULL
  AND EXISTS (
    SELECT 1 FROM folders
    WHERE folders.id = photos.folder_id
      AND folders.run_id IS NOT NULL
  );
