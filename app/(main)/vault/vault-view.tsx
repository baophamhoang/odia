"use client";

import { useRef, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { format, parseISO } from "date-fns";
import { Upload, MapPin, Camera, ArrowRight, Loader2, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RunCardGridSkeleton } from "@/components/skeleton";
import { FolderExplorer } from "@/components/vault/folder-explorer";
import type { RunCard } from "@/app/lib/types";
import type { FolderPhotoGroup } from "@/app/lib/api";

const FOLDER_PHOTO_LIMIT = 6;

interface VaultViewProps {
  runs: RunCard[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  initialFolderId?: string | null;
  folderGroups?: FolderPhotoGroup[];
}

export function VaultView({
  runs,
  isLoading,
  isRefreshing,
  activeTab = "recent",
  onTabChange,
  initialFolderId,
  folderGroups = [],
}: VaultViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleLocalDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) {
        const dt = new DataTransfer();
        files.forEach((f) => dt.items.add(f));
        const newEvent = new DragEvent("drop", {
          dataTransfer: dt,
          bubbles: true,
        });
        document.dispatchEvent(newEvent);
      }
    },
    []
  );

  return (
    <div>
      {isRefreshing && !isLoading && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Refreshing…
        </div>
      )}

      {/* Hero drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-12"
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleLocalDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative overflow-hidden rounded-3xl cursor-pointer gradient-border
            transition-all duration-500 ease-out
            ${
              isDragOver
                ? "scale-[1.01] shadow-2xl shadow-primary/15"
                : "hover:shadow-xl hover:shadow-primary/5"
            }
          `}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-ring/5 dark:from-primary/[0.08] dark:via-transparent dark:to-ring/[0.05]" />

          {/* Floating accent orbs */}
          <motion.div
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-primary/15 to-ring/10 blur-2xl"
          />
          <motion.div
            animate={{
              x: [0, -20, 0],
              y: [0, 15, 0],
              scale: [1, 1.15, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-10 left-20 w-40 h-40 rounded-full bg-gradient-to-br from-ring/15 to-primary/10 blur-2xl"
          />

          <div className="relative flex flex-col items-center justify-center py-20 sm:py-28 px-6 text-center">
            <motion.div
              animate={isDragOver ? { scale: 1.15, y: -8 } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="mb-6"
            >
              <div className="relative">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20 shadow-lg shadow-primary/10">
                  <Upload className="h-7 w-7 text-primary/70" />
                </div>
                {/* Pulsing rings */}
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -inset-3 rounded-3xl border border-primary/20"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute -inset-1.5 rounded-2xl border border-primary/15"
                />
              </div>
            </motion.div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground/90">
              Drop photos here
            </h2>
            <p className="mt-3 text-sm text-muted-foreground/70 max-w-sm leading-relaxed">
              Drag your run photos anywhere on this page, or click to browse.
            </p>
            <div className="mt-3 flex items-center gap-2">
              {["JPG", "PNG", "WebP", "HEIC"].map((fmt) => (
                <span
                  key={fmt}
                  className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) {
              const dt = new DataTransfer();
              files.forEach((f) => dt.items.add(f));
              const newEvent = new DragEvent("drop", {
                dataTransfer: dt,
                bubbles: true,
              });
              document.dispatchEvent(newEvent);
            }
            e.target.value = "";
          }}
        />
      </motion.div>

      {/* Tab switcher */}
      <Tabs value={activeTab} onValueChange={onTabChange} className="mb-0">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="folders">Folders</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          {/* Loading state */}
          {isLoading && <RunCardGridSkeleton />}

          {/* Recent runs */}
          {!isLoading && runs.length > 0 && (
            <div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between mb-8"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground font-medium">
                    {runs.length} run{runs.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <Link
                  href="/timeline"
                  className="group flex items-center gap-1.5 text-sm text-muted-foreground/70 hover:text-foreground transition-colors duration-200"
                >
                  View timeline
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {runs.map((run, runIndex) => (
                  <motion.div
                    key={run.id}
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.1 + runIndex * 0.06,
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    whileHover={{ y: -4 }}
                  >
                    <Link
                      href={`/runs/${run.id}`}
                      className="group block rounded-2xl overflow-hidden bg-card/50 dark:bg-card/30 shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 card-shine"
                    >
                      {/* Cover photo */}
                      {run.photos[0] ? (
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <Image
                            src={run.photos[0].url ?? ""}
                            alt={run.title ?? "Run photos"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          {/* Gradient fade at bottom */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                          {/* Photo count badge — frosted pill */}
                          <div className="absolute top-3 right-3">
                            <Badge
                              variant="secondary"
                              className="gap-1.5 text-[11px] bg-white/20 text-white border-0 backdrop-blur-md shadow-sm"
                            >
                              <Camera className="h-3 w-3" />
                              {run.photo_count}
                            </Badge>
                          </div>

                          {/* Bottom overlay info */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <time className="text-xs font-semibold text-white/60 uppercase tracking-widest">
                              {format(parseISO(run.run_date), "MMM d, yyyy")}
                            </time>
                            {run.title && (
                              <h3 className="text-xl font-bold text-white mt-0.5 truncate">
                                {run.title}
                              </h3>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-ring/5 to-primary/5 flex flex-col items-center justify-center gap-2">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Camera className="h-6 w-6 text-primary/30" />
                          </div>
                          <span className="text-xs text-muted-foreground/70">No photos</span>
                        </div>
                      )}

                      {/* Meta row */}
                      <div className="px-4 py-3 flex items-center gap-3">
                        {run.participants.length > 0 && (
                          <div className="flex -space-x-1.5 group/avatars">
                            {run.participants.slice(0, 4).map((p) => (
                              <Avatar
                                key={p.id}
                                className="h-6 w-6 border-2 border-card ring-0 transition-all duration-300 group-hover/avatars:ml-0.5 first:ml-0"
                              >
                                <AvatarImage src={p.avatar_url ?? undefined} />
                                <AvatarFallback className="text-[8px] bg-accent">
                                  {p.name?.[0]?.toUpperCase() ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {run.participants.length > 4 && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px] font-medium">
                                +{run.participants.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {run.location && (
                            <span className="flex items-center gap-1 text-sm text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {run.location}
                            </span>
                          )}
                        </div>

                        {run.hashtags.length > 0 && (
                          <div className="hidden sm:flex items-center gap-1">
                            {run.hashtags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs px-1.5 py-0 text-muted-foreground/80 border-border/60"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Custom folder photos */}
          {!isLoading && folderGroups.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm text-muted-foreground font-medium">
                  From other folders
                </span>
                <Link
                  href="/vault?tab=folders"
                  className="group flex items-center gap-1.5 text-sm text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  View folders <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <div className="flex flex-col gap-6">
                {folderGroups.map((group) => (
                  <div key={group.folder.id}>
                    <div className="flex items-center justify-between mb-3">
                      <Link
                        href={`/vault?tab=folders&folderId=${group.folder.id}`}
                        className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80"
                      >
                        <FolderOpen className="h-4 w-4 text-muted-foreground/60" />
                        {group.folder.name}
                      </Link>
                      {group.total_count > FOLDER_PHOTO_LIMIT && (
                        <Link
                          href={`/vault?tab=folders&folderId=${group.folder.id}`}
                          className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                          View all {group.total_count} →
                        </Link>
                      )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {group.photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative shrink-0 h-24 w-24 rounded-xl overflow-hidden bg-muted/20"
                        >
                          <Image
                            src={photo.url ?? ""}
                            alt={photo.file_name ?? ""}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && runs.length === 0 && folderGroups.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-center py-24 px-6"
            >
              <div className="relative mx-auto mb-8 h-24 w-24">
                <motion.div
                  className="absolute inset-0 rounded-full border border-primary/20"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-primary/40" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground/60 tracking-tight">
                Your vault is waiting
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-2 max-w-xs mx-auto leading-relaxed">
                Every run has a story. Drop your photos above to start building your collection.
              </p>
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mt-6 text-primary/30"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6 mx-auto stroke-current fill-none stroke-2">
                  <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="folders">
          <FolderExplorer initialFolderId={initialFolderId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
