"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Footprints, Folder, LayoutGrid, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFolderContents } from "@/app/lib/api";
import { FolderCard } from "@/components/vault/folder-card";
import { FolderBrowserSkeleton } from "@/components/vault/folder-skeleton";
import { PhotoGrid } from "@/components/photo-grid";
import { deletePhoto } from "@/app/actions/photos";
import { motion } from "motion/react";
import type { FolderWithMeta } from "@/app/lib/types";

type FilterType = "all" | "runs" | "folders";

interface FolderBrowserProps {
  folderId: string | null;
  onNavigate?: (folderId: string) => void;
  onPhotosChanged?: () => void;
}

export function FolderBrowser({ folderId, onNavigate, onPhotosChanged }: FolderBrowserProps) {
  const { data: session } = useSession();
  const { data: contents, isLoading } = useFolderContents(folderId);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleBulkDownload() {
    if (!contents || contents.photos.length === 0) return;
    setIsDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      const zip = new JSZip();
      await Promise.all(
        contents.photos.map(async (photo, i) => {
          const res = await fetch(photo.url!);
          const blob = await res.blob();
          zip.file(photo.file_name ?? `photo-${i + 1}.jpg`, blob);
        })
      );
      saveAs(await zip.generateAsync({ type: "blob" }), `${contents.folder.name}-photos.zip`);
      toast.success("Download started!");
    } catch {
      toast.error("Failed to download photos");
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return <FolderBrowserSkeleton />;
  }

  if (!contents) {
    return (
      <div className="text-center py-24 px-6">
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
          <Folder className="h-8 w-8 text-primary/30" />
        </div>
        <h3 className="text-lg font-bold text-foreground/60">
          No folders yet
        </h3>
        <p className="text-sm text-muted-foreground/70 mt-2 max-w-xs mx-auto">
          Folders are created automatically when you add runs. Upload some
          photos to get started.
        </p>
      </div>
    );
  }

  const { subfolders, photos } = contents;
  const runFolders = subfolders.filter((f) => f.folder_type === "run");
  const customFolders = subfolders.filter((f) => f.folder_type !== "run");
  const isEmpty = subfolders.length === 0 && photos.length === 0;

  const filteredRuns = filter === "folders" ? [] : runFolders;
  const filteredCustom = filter === "runs" ? [] : customFolders;
  const showPhotos = filter !== "runs";

  return (
    <div>
      {/* Filter bar */}
      {subfolders.length > 0 && (
        <div className="flex items-center gap-1 mb-5">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
            label="All"
          />
          <FilterButton
            active={filter === "runs"}
            onClick={() => setFilter("runs")}
            icon={<Footprints className="h-3.5 w-3.5" />}
            label={`Runs (${runFolders.length})`}
          />
          <FilterButton
            active={filter === "folders"}
            onClick={() => setFilter("folders")}
            icon={<Folder className="h-3.5 w-3.5" />}
            label={`Folders (${customFolders.length})`}
          />
        </div>
      )}

      {/* Run folders section */}
      {filteredRuns.length > 0 && (
        <FolderSection
          label={customFolders.length > 0 && filter === "all" ? "Runs" : undefined}
          folders={filteredRuns}
          onNavigate={onNavigate}
        />
      )}

      {/* Custom folders section */}
      {filteredCustom.length > 0 && (
        <FolderSection
          label={runFolders.length > 0 && filter === "all" ? "Folders" : undefined}
          folders={filteredCustom}
          onNavigate={onNavigate}
        />
      )}

      {/* Photo grid */}
      {showPhotos && photos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            {subfolders.length > 0 ? (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
                Photos
              </h3>
            ) : (
              <span />
            )}
            <button
              onClick={handleBulkDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download All
            </button>
          </div>
          <PhotoGrid
            photos={photos}
            columns={3}
            canDeletePhoto={(photo) => photo.uploaded_by === session?.user?.id}
            onDeletePhoto={async (photo) => {
              await deletePhoto(photo.id);
              onPhotosChanged?.();
            }}
            folderLink={contents?.folder ? `/vault?tab=folders&folderId=${contents.folder.id}` : null}
            runLink={contents?.folder?.folder_type === "run" && contents.folder.run_id ? `/runs/${contents.folder.run_id}` : null}
          />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 px-6"
        >
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
            <Folder className="h-6 w-6 text-primary/30" />
          </div>
          <p className="text-sm text-muted-foreground/70">
            This folder is empty
          </p>
        </motion.div>
      )}
    </div>
  );
}

function FolderSection({
  label,
  folders,
  onNavigate,
}: {
  label?: string;
  folders: FolderWithMeta[];
  onNavigate?: (folderId: string) => void;
}) {
  return (
    <div className="mb-8">
      {label && (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-4">
          {label}
        </h3>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder, index) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            index={index}
            onClick={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors duration-150 ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground/60 hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

