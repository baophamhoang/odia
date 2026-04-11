"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Route, ImageUp } from "lucide-react";
import { toast } from "sonner";
import { Nav } from "@/components/nav";
import { DropZone } from "@/components/drop-zone";
import { UploadModal } from "@/components/upload-modal";
import { useTeamMembers } from "@/app/lib/api";
import { requestUploadUrls } from "@/app/actions/photos";
import { UploadProgressContext } from "@/app/lib/upload-progress-context";

// ---------------------------------------------------------------------------
// Folder upload helpers
// ---------------------------------------------------------------------------

async function generateThumbnail(file: File, maxWidth = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.75,
      );
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

async function uploadToFolderDirectly(
  files: File[],
  folderId: string,
  onProgress: (uploaded: number, total: number) => void,
): Promise<void> {
  const fileInfos = files.map((f) => ({ name: f.name, type: f.type, size: f.size }));
  const slots = await requestUploadUrls(fileInfos);

  let uploaded = 0;
  const CONCURRENCY = 5;
  let i = 0;
  await Promise.all(
    Array(Math.min(CONCURRENCY, slots.length))
      .fill(null)
      .map(async () => {
        while (i < slots.length) {
          const idx = i++;
          await fetch(slots[idx].uploadUrl, {
            method: "PUT",
            body: files[idx],
            headers: { "Content-Type": files[idx].type },
          });
          uploaded++;
          onProgress(uploaded, files.length);
          if (slots[idx].thumbUploadUrl && files[idx].type.startsWith("image/")) {
            generateThumbnail(files[idx])
              .then((blob) =>
                fetch(slots[idx].thumbUploadUrl!, {
                  method: "PUT",
                  headers: { "Content-Type": "image/jpeg" },
                  body: blob,
                })
              )
              .catch(() => {});
          }
        }
      })
  );

  const photoIds = slots.map((s) => s.photoId);
  await fetch(`/api/vault/folders/${folderId}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoIds }),
  });
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"create" | "add-to-existing">("create");
  const [preSelectedRunId, setPreSelectedRunId] = useState<string | undefined>(undefined);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ uploaded: number; total: number } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { data: members } = useTeamMembers();
  const pathname = usePathname();

  const currentRunId = pathname.match(/^\/runs\/([^/]+)/)?.[1];

  // Context value — lets FolderToolbar and UploadModal report into the same pill
  const progressCtx = useMemo(() => ({
    setProgress: (uploaded: number, total: number) => setUploadProgress({ uploaded, total }),
    clearProgress: () => setUploadProgress(null),
  }), []);

  // Clear pill 1.5s after upload finishes
  useEffect(() => {
    if (uploadProgress !== null && uploadProgress.uploaded === uploadProgress.total) {
      const t = setTimeout(() => setUploadProgress(null), 1500);
      return () => clearTimeout(t);
    }
  }, [uploadProgress]);

  const handleDrop = useCallback((files: File[]) => {
    setDroppedFiles(files);
    setUploadMode("create");
    setPreSelectedRunId(undefined);
    setUploadOpen(true);
  }, []);

  const handleNewRun = useCallback(() => {
    setFabOpen(false);
    setDroppedFiles([]);
    setUploadMode("create");
    setPreSelectedRunId(undefined);
    setUploadOpen(true);
  }, []);

  const handleUploadPhotos = useCallback(() => {
    setFabOpen(false);
    photoInputRef.current?.click();
  }, []);

  const handlePhotoInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    e.target.value = "";
    if (selected.length === 0) return;

    const currentFolderId = new URLSearchParams(window.location.search).get("folderId");

    if (currentFolderId) {
      setUploadProgress({ uploaded: 0, total: selected.length });
      try {
        await uploadToFolderDirectly(selected, currentFolderId, (uploaded, total) =>
          setUploadProgress({ uploaded, total })
        );
        toast.success(`${selected.length} photo${selected.length !== 1 ? "s" : ""} uploaded`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
        setUploadProgress(null);
      }
    } else if (currentRunId) {
      setDroppedFiles(selected);
      setUploadMode("add-to-existing");
      setPreSelectedRunId(currentRunId);
      setUploadOpen(true);
    } else {
      setDroppedFiles(selected);
      setUploadMode("create");
      setPreSelectedRunId(undefined);
      setUploadOpen(true);
    }
  }, [currentRunId]);

  const isUploading = uploadProgress !== null && uploadProgress.uploaded < uploadProgress.total;
  const uploadDone = uploadProgress !== null && uploadProgress.uploaded === uploadProgress.total;

  return (
    <UploadProgressContext.Provider value={progressCtx}>
      <DropZone onDrop={handleDrop}>
        <div className="min-h-screen">
          <Nav />
          <main className="md:pt-14 pb-20 md:pb-0">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
              {children}
            </div>
          </main>

          {/* Hidden file input for direct OS picker */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handlePhotoInputChange}
          />

          {/* Backdrop */}
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                key="fab-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-20"
                onClick={() => setFabOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Speed dial */}
          <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-3">
            <AnimatePresence>
              {fabOpen && (
                <>
                  <motion.button
                    key="upload-photos"
                    onClick={handleUploadPhotos}
                    initial={{ opacity: 0, y: 16, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0 }}
                    className="flex h-14 items-center gap-3 rounded-full bg-foreground pl-5 pr-4 text-background shadow-xl shadow-foreground/10 dark:shadow-white/5"
                  >
                    <span className="text-sm font-medium">Upload photos</span>
                    <ImageUp className="h-5 w-5 shrink-0" strokeWidth={2} />
                  </motion.button>
                  <motion.button
                    key="new-run"
                    onClick={handleNewRun}
                    initial={{ opacity: 0, y: 16, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.05 }}
                    className="flex h-14 items-center gap-3 rounded-full bg-foreground pl-5 pr-4 text-background shadow-xl shadow-foreground/10 dark:shadow-white/5"
                  >
                    <span className="text-sm font-medium">New run</span>
                    <Route className="h-5 w-5 shrink-0" strokeWidth={2} />
                  </motion.button>
                </>
              )}
            </AnimatePresence>

            {/* FAB row — status pill + main button */}
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {uploadProgress !== null && (
                  <motion.div
                    key="upload-status"
                    initial={{ opacity: 0, x: 16, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 16, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="relative flex h-14 items-center overflow-hidden rounded-full bg-foreground pl-4 pr-5 text-background shadow-xl shadow-foreground/10 dark:shadow-white/5"
                  >
                    <motion.div
                      className="absolute inset-0 origin-left bg-white/10"
                      animate={{
                        scaleX: uploadProgress.total > 0 ? uploadProgress.uploaded / uploadProgress.total : 0,
                      }}
                      transition={{ ease: "linear", duration: 0.2 }}
                    />
                    <span className="relative z-10 flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                      {uploadDone ? (
                        <>
                          <svg viewBox="0 0 12 12" className="h-4 w-4 fill-none stroke-current stroke-2 shrink-0">
                            <polyline points="2,6 5,9 10,3" />
                          </svg>
                          Done
                        </>
                      ) : (
                        <>
                          <ImageUp className="h-4 w-4 shrink-0" strokeWidth={2} />
                          {uploadProgress.uploaded} / {uploadProgress.total}
                        </>
                      )}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={() => !isUploading && setFabOpen((o) => !o)}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: fabOpen ? 0.4 : 1 }}
                transition={{ delay: fabOpen ? 0 : 0.5, type: "spring", stiffness: 400, damping: 25 }}
                whileHover={{ scale: isUploading ? 1 : 1.08 }}
                whileTap={{ scale: isUploading ? 1 : 0.95 }}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-xl shadow-foreground/10 dark:shadow-white/5 hover:shadow-2xl hover:shadow-foreground/20 dark:hover:shadow-white/10 transition-shadow duration-300"
                aria-label="Actions"
              >
                <motion.span
                  animate={{ rotate: fabOpen ? 45 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="flex"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                </motion.span>
              </motion.button>
            </div>
          </div>
        </div>

        <UploadModal
          open={uploadOpen}
          onOpenChange={(o) => {
            setUploadOpen(o);
            if (!o) setUploadProgress(null);
          }}
          initialFiles={droppedFiles}
          members={members ?? []}
          mode={uploadMode}
          preSelectedRunId={preSelectedRunId}
        />
      </DropZone>
    </UploadProgressContext.Provider>
  );
}
