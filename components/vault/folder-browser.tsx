"use client";

import { useState } from "react";
import Image from "next/image";
import { Footprints, Folder, LayoutGrid } from "lucide-react";
import { useFolderContents } from "@/app/lib/api";
import { FolderCard } from "@/components/vault/folder-card";
import { FolderBrowserSkeleton } from "@/components/vault/folder-skeleton";
import { motion } from "motion/react";
import type { Photo, FolderWithMeta } from "@/app/lib/types";

type FilterType = "all" | "runs" | "folders";

interface FolderBrowserProps {
  folderId: string | null;
  onNavigate?: (folderId: string) => void;
}

export function FolderBrowser({ folderId, onNavigate }: FolderBrowserProps) {
  const { data: contents, isLoading } = useFolderContents(folderId);
  const [filter, setFilter] = useState<FilterType>("all");

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
  const hasMultipleTypes = runFolders.length > 0 && customFolders.length > 0;
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
          {subfolders.length > 0 && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-4">
              Photos
            </h3>
          )}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo, index) => (
              <PhotoThumb key={photo.id} photo={photo} index={index} />
            ))}
          </div>
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

function PhotoThumb({ photo, index }: { photo: Photo; index: number }) {
  if (!photo.url) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="relative aspect-square rounded-xl overflow-hidden bg-muted/30 group"
    >
      <Image
        src={photo.url}
        alt={photo.file_name ?? "Photo"}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
    </motion.div>
  );
}
