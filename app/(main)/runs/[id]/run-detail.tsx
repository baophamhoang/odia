"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { motion } from "motion/react";
import {
  ArrowLeft,
  MapPin,
  Download,
  Trash2,
  MoreHorizontal,
  Loader2,
  Plus,
  Camera,
  ChevronsDown,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { mutate as mutateCache } from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PhotoGrid } from "@/components/photo-grid";
import { UploadModal } from "@/components/upload-modal";
import { deletePhoto } from "@/app/actions/photos";
import { deleteRun } from "@/app/actions/runs";
import { useTeamMembers } from "@/app/lib/api";
import type { RunWithDetails } from "@/app/lib/types";
import type { KeyedMutator } from "swr";

interface RunDetailProps {
  run: RunWithDetails;
  isOwner: boolean;
  isAdmin: boolean;
  mutate?: KeyedMutator<RunWithDetails>;
  isRefreshing?: boolean;
  currentUserId?: string;
}

const hashtagColors = [
  "bg-primary/10 text-primary border-primary/20",
  "bg-ring/10 text-ring border-ring/20",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
];

export function RunDetail({
  run,
  isOwner,
  isAdmin,
  mutate,
  isRefreshing,
  currentUserId,
}: RunDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showEndNudge, setShowEndNudge] = useState(false);
  const { data: members } = useTeamMembers();

  const handleUploadClose = useCallback((open: boolean) => {
    setShowUpload(open);
    if (!open && mutate) {
      mutate();
    }
  }, [mutate]);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteRun(run.id);
      await Promise.all([
        mutateCache("/api/runs?page=1"),
        mutateCache("/api/users/me/photos"),
        mutateCache("/api/users/me/tagged"),
      ]);
      toast.success("Run deleted");
      router.push("/vault");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete run"
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  async function handleBulkDownload() {
    if (run.photos.length === 0) return;
    setIsDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      const zip = new JSZip();

      await Promise.all(
        run.photos.map(async (photo, index) => {
          if (!photo.url) return;
          const response = await fetch(photo.url);
          const blob = await response.blob();
          zip.file(photo.file_name ?? `photo-${index + 1}.jpg`, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const zipName = `${run.title ?? format(parseISO(run.run_date), "yyyy-MM-dd")}-photos.zip`;
      saveAs(content, zipName);
      toast.success("Download started!");
    } catch {
      toast.error("Failed to download photos");
    } finally {
      setIsDownloading(false);
    }
  }

  const canDeletePhoto = useCallback(
    (photo: { uploaded_by: string }) => {
      if (!currentUserId) return false;
      return isOwner || isAdmin || photo.uploaded_by === currentUserId;
    },
    [currentUserId, isAdmin, isOwner]
  );

  const handleDeletePhoto = useCallback(
    async (photo: { id: string; uploaded_by: string }) => {
      if (!canDeletePhoto(photo)) {
        toast.error("You can only delete your own photos");
        return;
      }

      const previous = run.photos;

      mutate?.(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            photos: current.photos.filter((p) => p.id !== photo.id),
          };
        },
        false
      );

      try {
        await deletePhoto(photo.id);
        await Promise.all([
          mutate?.(),
          mutateCache("/api/runs?page=1"),
          mutateCache("/api/users/me/photos"),
          mutateCache("/api/users/me/tagged"),
        ]);
        toast.success("Photo deleted");
      } catch (error) {
        mutate?.({ ...run, photos: previous }, false);
        toast.error(
          error instanceof Error ? error.message : "Failed to delete photo"
        );
      }
    },
    [canDeletePhoto, mutate, run]
  );

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let touchStartY: number | null = null;

    const triggerNudge = () => {
      setShowEndNudge(true);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setShowEndNudge(false), 500);
    };

    const atBottom = () =>
      window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0 && atBottom()) triggerNudge();
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY == null) return;
      const currentY = e.touches[0]?.clientY ?? touchStartY;
      // Swipe up at bottom means trying to go further down.
      if (touchStartY - currentY > 8 && atBottom()) triggerNudge();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const canManage = isOwner || isAdmin;
  const heroPhoto = run.photos[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Hero cover photo */}
      {heroPhoto && (
        <div className="relative -mx-4 sm:-mx-6 mb-8 rounded-2xl overflow-hidden">
          <div className="relative aspect-[16/9] sm:aspect-[21/9]">
            <Image
              src={heroPhoto.url ?? ""}
              alt={run.title ?? "Run cover"}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/40 to-transparent" />

            {/* Overlaid metadata */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <time className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">
                {format(parseISO(run.run_date), "EEEE, MMMM d, yyyy")}
              </time>
              {run.title && (
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mt-1 leading-tight drop-shadow-lg">
                  {run.title}
                </h1>
              )}
              {run.location && (
                <span className="inline-flex items-center gap-1.5 text-sm text-white/70 mt-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {run.location}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Back nav + action bar */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" className="text-muted-foreground/70 hover:text-foreground" asChild>
          <Link href="/vault">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {isRefreshing && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing…
            </span>
          )}

          {/* Add Photos button — any member can add */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(true)}
            className="border-primary/20 text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Photos
          </Button>

          {run.photos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
              disabled={isDownloading}
              className="border-border/50"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download All
            </Button>
          )}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete run
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Metadata section (only if no hero photo showed it) */}
      {!heroPhoto && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 max-w-2xl"
        >
          <time className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-widest">
            {format(parseISO(run.run_date), "EEEE, MMMM d, yyyy")}
          </time>
          {run.title && (
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 leading-tight">
              {run.title}
            </h1>
          )}
          {run.location && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground/70 mt-3">
              <MapPin className="h-3.5 w-3.5" />
              {run.location}
            </span>
          )}
        </motion.div>
      )}

      {run.description && (
        <p className="text-base text-muted-foreground/70 mb-5 leading-relaxed max-w-2xl">
          {run.description}
        </p>
      )}

      {/* Hashtags */}
      {run.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {run.hashtags.map((tag, i) => (
            <Badge
              key={tag}
              variant="outline"
              className={`text-xs border ${hashtagColors[i % hashtagColors.length]}`}
            >
              #{tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Participants */}
      {run.participants.length > 0 && (
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {run.participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 shrink-0 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 px-3 py-1.5"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[8px] bg-accent">
                    {p.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-foreground/80">
                  {p.name ?? p.email}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos header */}
      {run.photos.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground/60 uppercase tracking-widest">Photos</h2>
          <Badge variant="secondary" className="text-[10px] gap-1 bg-muted/50">
            <Camera className="h-3 w-3" />
            {run.photos.length}
          </Badge>
        </div>
      )}

      {/* Photo grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <PhotoGrid
          photos={run.photos}
          columns={3}
          grouped
          canDeletePhoto={canDeletePhoto}
          onDeletePhoto={handleDeletePhoto}
          folderLink={run.folder_id ? `/vault?tab=folders&folderId=${run.folder_id}` : null}
        />
      </motion.div>

      {/* End of list marker */}
      <motion.div
        className="mt-8 mb-2 flex flex-col items-center gap-1 text-muted-foreground/55"
        animate={showEndNudge ? { scale: 1.04, y: -3 } : { scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      >
        <span className="text-xs uppercase tracking-[0.2em]">No more photos</span>
        <motion.div
          animate={showEndNudge ? { y: [0, -4, 0] } : { y: [0, 2, 0] }}
          transition={{ duration: 0.6, repeat: showEndNudge ? 1 : Infinity, repeatDelay: 1.2 }}
        >
          <ChevronsDown className="h-4 w-4" />
        </motion.div>
      </motion.div>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete run?</DialogTitle>
            <DialogDescription>
              This will permanently delete this run and all {run.photos.length}{" "}
              photo{run.photos.length !== 1 ? "s" : ""}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload modal — add to existing run mode */}
      <UploadModal
        open={showUpload}
        onOpenChange={handleUploadClose}
        members={members ?? []}
        mode="add-to-existing"
        preSelectedRunId={run.id}
      />
    </motion.div>
  );
}
