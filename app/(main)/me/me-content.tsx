"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence, useInView } from "motion/react";
import { useRef } from "react";
import { MapPin, Camera, ImageOff, Hash, FolderOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PhotoViewer } from "@/components/photo-viewer";
import { TimelineSkeleton } from "@/components/skeleton";
import { mutate as swrMutate } from "swr";
import { deletePhoto } from "@/app/actions/photos";
import type { Photo, Run, RunCard, Folder, FolderType } from "@/app/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MyPhotosContentProps {
  uploadedPhotos: (Photo & { run: Run | null; folder: Folder | null })[];
  taggedRuns: RunCard[];
  isLoading?: boolean;
}

interface TimelineNode {
  date: string; // ISO date string used as the group key (YYYY-MM-DD)
  label: string; // human-readable label, e.g. "January 3, 2025"
  photos: Photo[];
  run?: RunCard;
  runInfo?: { id: string; title: string | null; location: string | null; hashtags: string[] };
  folder?: { id: string; name: string; folder_type: FolderType };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateKey(isoString: string): string {
  // Normalise to YYYY-MM-DD regardless of whether the input is a full ISO
  // timestamp or already a date-only string.
  return isoString.slice(0, 10);
}

function buildUploadTimeline(
  uploadedPhotos: (Photo & { run: Run | null; folder: Folder | null })[]
): TimelineNode[] {
  // Group by folder first (run or custom), then by run_id, then by upload date
  const map = new Map<
    string,
    { photos: Photo[]; run?: Run; folder?: Folder; sortDate: string }
  >();

  for (const photo of uploadedPhotos) {
    let sourceKey: string;

    if (photo.folder_id && photo.folder) {
      // covers both folder_type="run" and folder_type="custom"
      sourceKey = `folder:${photo.folder_id}`;
    } else if (photo.run_id) {
      // fallback: run linked but folder not set
      sourceKey = `run:${photo.run_id}`;
    } else {
      sourceKey = `date:${toDateKey(photo.created_at)}`;
    }

    const existing = map.get(sourceKey);

    if (!existing) {
      // Determine representative sort date for this bucket
      let sortDate: string;
      if (photo.folder_id && photo.folder) {
        sortDate = photo.folder.created_at;
      } else if (photo.run_id && photo.run) {
        sortDate = photo.run.run_date;
      } else {
        sortDate = photo.created_at;
      }
      const bucket = { photos: [] as Photo[], sortDate };
      bucket.photos.push({ ...photo, run_id: photo.run_id ?? "" });
      if (photo.run) (bucket as typeof bucket & { run?: Run }).run = photo.run;
      if (photo.folder) (bucket as typeof bucket & { folder?: Folder }).folder = photo.folder;
      map.set(sourceKey, bucket as { photos: Photo[]; run?: Run; folder?: Folder; sortDate: string });
    } else {
      existing.photos.push({ ...photo, run_id: photo.run_id ?? "" });
      if (photo.run && !existing.run) existing.run = photo.run;
      if (photo.folder && !existing.folder) existing.folder = photo.folder;
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate))
    .map(({ photos, run, folder, sortDate }) => {
      const dateKey = toDateKey(sortDate);
      return {
        date: dateKey,
        label: format(parseISO(dateKey), "MMMM d, yyyy"),
        photos,
        runInfo: run
          ? { id: run.id, title: run.title, location: run.location, hashtags: run.hashtags ?? [] }
          : undefined,
        folder: folder
          ? { id: folder.id, name: folder.name, folder_type: folder.folder_type }
          : undefined,
      };
    });
}

function buildTaggedTimeline(taggedRuns: RunCard[]): TimelineNode[] {
  return [...taggedRuns]
    .sort((a, b) => b.run_date.localeCompare(a.run_date)) // newest first
    .map((run) => ({
      date: toDateKey(run.run_date),
      label: format(parseISO(run.run_date), "MMMM d, yyyy"),
      photos: run.photos,
      run,
    }));
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-28 gap-4"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm shadow-lg"
      >
        <ImageOff className="h-7 w-7 text-muted-foreground/60" />
        {/* subtle glow ring */}
        <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
      </motion.div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-muted-foreground/70">{message}</p>
        {sub && (
          <p className="text-xs text-muted-foreground/70">{sub}</p>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal photo strip inside each timeline node
// ---------------------------------------------------------------------------

interface PhotoStripProps {
  photos: Photo[];
  onPhotoClick: (photos: Photo[], index: number) => void;
}

function PhotoStrip({ photos, onPhotoClick }: PhotoStripProps) {
  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 rounded-xl border border-dashed border-border/50">
        <Camera className="h-5 w-5 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {photos.map((photo, index) => (
        <motion.button
          key={photo.id}
          onClick={() => onPhotoClick(photos, index)}
          className="relative shrink-0 h-24 w-24 sm:h-28 sm:w-28 rounded-xl overflow-hidden bg-muted/20 cursor-pointer group"
          whileHover={{ scale: 1.04, zIndex: 10 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        >
          <Image
            src={photo.url ?? ""}
            alt={photo.file_name ?? "Photo"}
            fill
            className="object-cover transition-all duration-300 group-hover:brightness-110"
            sizes="112px"
          />
          {/* subtle overlay on hover */}
          <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/0 group-hover:ring-white/20 transition-all duration-300" />
        </motion.button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single timeline node (one date group)
// ---------------------------------------------------------------------------

interface TimelineNodeCardProps {
  node: TimelineNode;
  index: number;
  isLast: boolean;
  onPhotoClick: (photos: Photo[], index: number, node: TimelineNode) => void;
}

function TimelineNodeCard({
  node,
  index,
  isLast,
  onPhotoClick,
}: TimelineNodeCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -18 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -18 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.07, 0.35),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative flex gap-4 sm:gap-6"
    >
      {/* Left: timeline line + dot */}
      <div className="flex flex-col items-center shrink-0 w-8 sm:w-10">
        {/* dot */}
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 25,
            delay: Math.min(index * 0.07, 0.35) + 0.1,
          }}
          className="relative z-10 mt-1 h-3 w-3 rounded-full bg-foreground/80 ring-2 ring-background ring-offset-0 shadow-sm"
        />
        {/* vertical connector line below dot */}
        {!isLast && (
          <div className="flex-1 w-px bg-gradient-to-b from-border/60 to-border/10 mt-2" />
        )}
      </div>

      {/* Right: content card */}
      <div className="flex-1 pb-10">
        {/* date label */}
        <time className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-3 mt-0.5">
          {node.label}
        </time>

        {/* glassmorphic card */}
        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm shadow-sm overflow-hidden transition-all duration-300 hover:border-border/80 hover:bg-card/80 hover:shadow-md">
          {/* folder header (custom folder uploads, no run) */}
          {node.folder && !node.run && !node.runInfo && (
            <div className="px-4 pt-3.5 pb-2.5 border-b border-border/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                  <Link
                    href={`/vault?tab=folders&folderId=${node.folder.id}`}
                    className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors truncate"
                  >
                    {node.folder.name}
                  </Link>
                </div>
                <Badge
                  variant="secondary"
                  className="gap-1 text-[10px] px-1.5 py-0.5 bg-muted/50 text-muted-foreground/70 border-0 shrink-0"
                >
                  <Camera className="h-3 w-3" />
                  {node.photos.length}
                </Badge>
              </div>
            </div>
          )}

          {/* run metadata header (tagged-in tab uses node.run, uploads tab uses node.runInfo) */}
          {(node.run || node.runInfo) && (() => {
            const runId = node.run?.id ?? node.runInfo!.id;
            const title = node.run?.title ?? node.runInfo!.title;
            const location = node.run?.location ?? node.runInfo!.location;
            const hashtags = node.run?.hashtags ?? node.runInfo!.hashtags;
            const photoCount = node.run?.photo_count ?? node.photos.length;
            return (
              <div className="px-4 pt-3.5 pb-2.5 border-b border-border/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {title && (
                      <Link
                        href={`/runs/${runId}`}
                        className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors truncate block"
                      >
                        {title}
                      </Link>
                    )}
                    {!title && (
                      <Link
                        href={`/runs/${runId}`}
                        className="text-sm font-medium text-muted-foreground/60 hover:text-muted-foreground/80 transition-colors"
                      >
                        View run
                      </Link>
                    )}
                    {location && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground/80 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {location}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[10px] px-1.5 py-0.5 bg-muted/50 text-muted-foreground/70 border-0"
                    >
                      <Camera className="h-3 w-3" />
                      {photoCount}
                    </Badge>
                  </div>
                </div>

                {/* hashtags */}
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {hashtags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70 font-medium"
                      >
                        <Hash className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* photo strip */}
          <div className="p-3">
            <PhotoStrip photos={node.photos} onPhotoClick={(photos, index) => onPhotoClick(photos, index, node)} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Vertical timeline list
// ---------------------------------------------------------------------------

interface VerticalTimelineProps {
  nodes: TimelineNode[];
  isUploadTab?: boolean;
}

function VerticalTimeline({ nodes, isUploadTab }: VerticalTimelineProps) {
  const [viewer, setViewer] = useState<{
    photos: Photo[];
    index: number;
    runLink?: string | null;
    folderLink?: string | null;
    canDelete?: boolean;
  } | null>(null);

  function handlePhotoClick(photos: Photo[], index: number, node: TimelineNode) {
    const runId = node.run?.id ?? node.runInfo?.id;
    setViewer({
      photos,
      index,
      runLink: runId ? `/runs/${runId}` : null,
      folderLink: node.folder ? `/vault?tab=folders&folderId=${node.folder.id}` : null,
      canDelete: !!isUploadTab,
    });
  }

  return (
    <>
      <div className="relative pl-0">
        {nodes.map((node, i) => (
          <TimelineNodeCard
            key={`${node.date}-${node.run?.id ?? node.runInfo?.id ?? node.folder?.id ?? "upload"}`}
            node={node}
            index={i}
            isLast={i === nodes.length - 1}
            onPhotoClick={handlePhotoClick}
          />
        ))}
      </div>

      <AnimatePresence>
        {viewer && (
          <PhotoViewer
            photos={viewer.photos}
            initialIndex={viewer.index}
            onClose={() => setViewer(null)}
            folderLink={viewer.folderLink}
            runLink={viewer.runLink}
            canDeletePhoto={viewer.canDelete ? () => true : undefined}
            onDeletePhoto={viewer.canDelete ? async (photo) => {
              setViewer(null);
              await deletePhoto(photo.id);
              await swrMutate("/api/users/me/photos");
            } : undefined}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab trigger with animated underline indicator
// ---------------------------------------------------------------------------

interface AnimatedTabTriggerProps {
  value: string;
  count: number;
  label: string;
}

function AnimatedTabTrigger({ value, count, label }: AnimatedTabTriggerProps) {
  return (
    <TabsTrigger
      value={value}
      className="relative text-xs px-4 py-2 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent transition-colors duration-200"
    >
      <span>{label}</span>
      <span className="ml-1.5 tabular-nums text-[10px] text-muted-foreground/70">
        {count}
      </span>
    </TabsTrigger>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function MyPhotosContent({
  uploadedPhotos,
  taggedRuns,
  isLoading,
}: MyPhotosContentProps) {
  const uploadNodes = buildUploadTimeline(uploadedPhotos);
  const taggedNodes = buildTaggedTimeline(taggedRuns);

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <div className="h-8 w-32 rounded-lg bg-muted/30 animate-pulse" />
          <div className="h-4 w-64 rounded-lg bg-muted/20 animate-pulse mt-2" />
        </div>
        <TimelineSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          My Photos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you&apos;ve uploaded or been tagged in
        </p>
      </motion.div>

      {/* Animated tabs */}
      <Tabs defaultValue="uploads">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <TabsList className="relative h-auto bg-transparent border-0 p-0 gap-0 border-b border-border/60 w-full justify-start rounded-none">
            <AnimatedTabTrigger
              value="uploads"
              label="Uploads"
              count={uploadedPhotos.length}
            />
            <AnimatedTabTrigger
              value="tagged"
              label="Tagged In"
              count={taggedRuns.length}
            />
          </TabsList>
        </motion.div>

        {/* Uploads tab */}
        <TabsContent value="uploads" className="mt-8 outline-none">
          <AnimatePresence mode="wait">
            {uploadNodes.length === 0 ? (
              <EmptyState
                message="No uploads yet"
                sub="Drag photos or tap + to upload"
              />
            ) : (
              <motion.div
                key="upload-timeline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <VerticalTimeline nodes={uploadNodes} isUploadTab />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Tagged In tab */}
        <TabsContent value="tagged" className="mt-8 outline-none">
          <AnimatePresence mode="wait">
            {taggedNodes.length === 0 ? (
              <EmptyState
                message="Not tagged in any runs yet"
                sub="Once a run organiser tags you, your photos appear here"
              />
            ) : (
              <motion.div
                key="tagged-timeline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <VerticalTimeline nodes={taggedNodes} />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}
