"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { Photo } from "@/app/lib/types";
import { PhotoViewer } from "@/components/photo-viewer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PhotoGridProps {
  photos: Photo[];
  columns?: 2 | 3 | 4;
  grouped?: boolean;
  canDeletePhoto?: (photo: Photo) => boolean;
  onDeletePhoto?: (photo: Photo) => Promise<void>;
}

/** Group photos by uploader, preserving order of first appearance. */
function groupByUploader(photos: Photo[]) {
  const groups: { uploaderId: string; name: string; avatar: string | null; photos: Photo[] }[] = [];
  const indexMap = new Map<string, number>();

  for (const photo of photos) {
    const uid = photo.uploader?.id ?? photo.uploaded_by;
    if (indexMap.has(uid)) {
      groups[indexMap.get(uid)!].photos.push(photo);
    } else {
      indexMap.set(uid, groups.length);
      groups.push({
        uploaderId: uid,
        name: photo.uploader?.name ?? "Unknown",
        avatar: photo.uploader?.avatar_url ?? null,
        photos: [photo],
      });
    }
  }

  return groups;
}

export function PhotoGrid({
  photos,
  columns = 3,
  grouped = false,
  canDeletePhoto,
  onDeletePhoto,
}: PhotoGridProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Photo | null>(null);
  const [isDeletingFromGrid, setIsDeletingFromGrid] = useState(false);

  // Build a flat list for the viewer (so arrow keys cycle through all photos)
  const allPhotos = photos;

  // Grouped sections (only computed when grouped=true)
  const groups = useMemo(
    () => (grouped ? groupByUploader(photos) : null),
    [grouped, photos],
  );

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/20 border border-border/30 flex items-center justify-center">
            <Camera className="h-7 w-7 text-muted-foreground/25" />
          </div>
          <motion.div className="absolute inset-0 rounded-2xl overflow-hidden">
            <motion.div
              className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent"
              animate={{ top: ["0%", "100%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-muted-foreground/40">No photos in this run</p>
          <p className="text-xs text-muted-foreground/25 mt-1">Photos will appear here after upload</p>
        </div>
      </div>
    );
  }

  // ---- Grouped mode ----
  if (grouped && groups) {
    // We need a way to map (group, photoIndexInGroup) → flat index for the viewer
    let flatOffset = 0;

    return (
      <>
        <div className="space-y-8">
          {groups.map((group) => {
            const startOffset = flatOffset;
            flatOffset += group.photos.length;

            return (
              <div key={group.uploaderId}>
                {/* Section header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={group.avatar ?? undefined} />
                    <AvatarFallback className="text-[9px] bg-accent">
                      {group.name[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground/80">{group.name}</span>
                  <span className="text-xs text-muted-foreground/50">
                    {group.photos.length} photo{group.photos.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Photos grid */}
                <SimpleGrid
                  photos={group.photos}
                  columns={columns}
                  flatOffset={startOffset}
                  onSelect={setViewerIndex}
                  canDeletePhoto={canDeletePhoto}
                  onRequestDelete={setPendingDelete}
                />
              </div>
            );
          })}
        </div>

        {viewerIndex !== null && (
          <PhotoViewer
            photos={allPhotos}
            initialIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
            canDeletePhoto={canDeletePhoto}
            onDeletePhoto={onDeletePhoto}
          />
        )}

        <Dialog
          open={!!pendingDelete}
          onOpenChange={(open) => {
            if (!open && !isDeletingFromGrid) setPendingDelete(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete photo?</DialogTitle>
              <DialogDescription>
                This photo will be removed permanently. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingDelete(null)}
                disabled={isDeletingFromGrid}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!pendingDelete || !onDeletePhoto) return;
                  setIsDeletingFromGrid(true);
                  try {
                    await onDeletePhoto(pendingDelete);
                    setPendingDelete(null);
                  } finally {
                    setIsDeletingFromGrid(false);
                  }
                }}
                disabled={isDeletingFromGrid}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ---- Default (ungrouped) mode ----
  // Magazine-style layout: first photo 2x2, rest in grid
  const hasFeatured = photos.length >= 5;

  return (
    <>
      {hasFeatured ? (
        <div className="space-y-1.5">
          {/* Bento hero: 1 large + 4 small */}
          <div className="grid grid-cols-3 grid-rows-2 gap-1.5 h-[360px] sm:h-[420px] rounded-2xl overflow-hidden">
            {/* Hero photo — spans 2 rows, 2 cols */}
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="col-span-2 row-span-2 relative overflow-hidden group cursor-pointer"
              onClick={() => setViewerIndex(0)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Image
                src={photos[0].url ?? ""}
                alt={photos[0].file_name ?? "Photo"}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 100vw, 66vw"
                priority
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </motion.button>

            {/* 4 smaller photos */}
            {photos.slice(1, 5).map((photo, i) => (
              <motion.button
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * (i + 1), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden group cursor-pointer"
                onClick={() => setViewerIndex(i + 1)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Image
                  src={photo.url ?? ""}
                  alt={photo.file_name ?? "Photo"}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  sizes="(max-width: 640px) 33vw, 20vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                {/* Last thumbnail: show "+N more" overlay */}
                {i === 3 && photos.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{photos.length - 5}</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Remaining photos in uniform grid */}
          {photos.length > 5 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
              {photos.slice(5).map((photo, index) => (
                <motion.button
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: index * 0.03,
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onClick={() => setViewerIndex(index + 5)}
                  className="relative aspect-square overflow-hidden bg-muted/10 cursor-pointer group rounded-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Image
                    src={photo.url ?? ""}
                    alt={photo.file_name ?? "Photo"}
                    fill
                    className="object-cover transition-all duration-500 group-hover:brightness-110 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Standard grid for fewer photos */
        <div className={`grid ${columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"} gap-1.5 rounded-2xl overflow-hidden`}>
          {photos.map((photo, index) => (
            <motion.button
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: index * 0.03,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              onClick={() => setViewerIndex(index)}
              className="relative aspect-square overflow-hidden bg-muted/10 cursor-pointer group rounded-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Image
                src={photo.url ?? ""}
                alt={photo.file_name ?? "Photo"}
                fill
                className="object-cover transition-all duration-500 group-hover:brightness-110 group-hover:scale-[1.03]"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </motion.button>
          ))}
        </div>
      )}

      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          canDeletePhoto={canDeletePhoto}
          onDeletePhoto={onDeletePhoto}
        />
      )}
    </>
  );
}

/** Simple uniform grid used by grouped mode. */
function SimpleGrid({
  photos,
  columns,
  flatOffset,
  onSelect,
  canDeletePhoto,
  onRequestDelete,
}: {
  photos: Photo[];
  columns: 2 | 3 | 4;
  flatOffset: number;
  onSelect: (index: number) => void;
  canDeletePhoto?: (photo: Photo) => boolean;
  onRequestDelete?: (photo: Photo) => void;
}) {
  return (
    <div className={`grid ${columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"} gap-1.5 rounded-2xl overflow-hidden`}>
      {photos.map((photo, index) => (
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: index * 0.03,
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative aspect-square overflow-hidden bg-muted/10 group rounded-lg"
          whileHover={{ scale: 1.02 }}
        >
          <button
            onClick={() => onSelect(flatOffset + index)}
            className="absolute inset-0 cursor-pointer"
          >
            <Image
              src={photo.url ?? ""}
              alt={photo.file_name ?? "Photo"}
              fill
              className="object-cover transition-all duration-500 group-hover:brightness-110 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          </button>

          {canDeletePhoto?.(photo) && onRequestDelete && (
            <button
              className="absolute top-1.5 right-1.5 z-10 h-7 w-7 rounded-full bg-black/65 text-white/90 flex items-center justify-center hover:bg-red-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(photo);
              }}
              aria-label="Delete photo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
