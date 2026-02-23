"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type PanInfo } from "motion/react";
import { X, Download, ChevronLeft, ChevronRight, Trash2, Loader2, FolderOpen, Footprints, Link2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Photo } from "@/app/lib/types";

interface PhotoViewerProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  canDeletePhoto?: (photo: Photo) => boolean;
  onDeletePhoto?: (photo: Photo) => Promise<void>;
  folderLink?: string | null;
  runLink?: string | null;
}

export function PhotoViewer({
  photos,
  initialIndex,
  onClose,
  canDeletePhoto,
  onDeletePhoto,
  folderLink,
  runLink,
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();
  const photo = photos[currentIndex];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((i) => Math.min(i + 1, photos.length - 1));
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x < -50 && info.velocity.x < -200) goNext();
      else if (info.offset.x > 50 && info.velocity.x > 200) goPrev();
    },
    [goNext, goPrev]
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    if (photos.length === 0) {
      onClose();
      return;
    }

    setCurrentIndex((prev) => Math.min(prev, photos.length - 1));
  }, [photos.length, onClose]);

  function handleCopyLink() {
    if (!photo?.url) return;
    navigator.clipboard.writeText(photo.url);
    toast.success("Link copied!");
  }

  async function handleDownload() {
    if (!photo?.url) return;
    const response = await fetch(photo.url);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = photo.file_name ?? `photo-${photo.id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!photo || !onDeletePhoto || !canDeletePhoto?.(photo)) return;
    setIsDeleting(true);
    try {
      await onDeletePhoto(photo);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 60, scale: 0.96 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => ({ opacity: 0, x: d * -60, scale: 0.96 }),
  };

  const viewer = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-999 flex items-center justify-center overflow-hidden"
        onClick={onClose}
      >
        {/* Ambient glow background */}
        <div className="absolute inset-0 scale-110 blur-[80px] opacity-25 saturate-150">
          <Image
            src={photo?.url ?? ""}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-black/80" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 px-5 py-4 bg-linear-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
                {currentIndex + 1} of {photos.length}
              </p>
              {photo?.file_name && (
                <p className="text-sm font-medium text-white/60 mt-0.5 truncate max-w-50">
                  {photo.file_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {folderLink && (
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    router.push(folderLink);
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Folders</span>
                </button>
              )}
              {runLink && (
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    router.push(runLink);
                  }}
                >
                  <Footprints className="h-4 w-4" />
                  <span className="hidden sm:inline">Run</span>
                </button>
              )}
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </button>
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
                onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
              >
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">Copy Link</span>
              </button>
              {photo && canDeletePhoto?.(photo) && onDeletePhoto && (
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white/80 hover:text-white hover:bg-red-500/25 transition-colors text-sm disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Nav arrows */}
        {currentIndex > 0 && (
          <motion.button
            className="absolute left-4 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/15 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            whileHover={{ scale: 1.1 }}
          >
            <ChevronLeft className="h-6 w-6" />
          </motion.button>
        )}
        {currentIndex < photos.length - 1 && (
          <motion.button
            className="absolute right-4 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/15 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            whileHover={{ scale: 1.1 }}
          >
            <ChevronRight className="h-6 w-6" />
          </motion.button>
        )}

        {/* Photo */}
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            className="relative h-[82vh] w-[88vw] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photo?.url ?? ""}
              alt={photo?.file_name ?? "Photo"}
              fill
              className="object-contain"
              sizes="88vw"
              priority
            />
          </motion.div>
        </AnimatePresence>

        {/* Counter dots / thumbnail strip */}
        {photos.length > 1 && photos.length <= 20 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setDirection(i > currentIndex ? 1 : -1);
                  setCurrentIndex(i);
                }}
                className={cn(
                  "rounded-full transition-all duration-200",
                  i === currentIndex
                    ? "w-2 h-2 bg-white"
                    : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
        )}

        {/* Thumbnail filmstrip for larger sets (desktop only) */}
        {photos.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/8 max-w-[80vw] overflow-x-auto scrollbar-hide z-10"
          >
            {photos.map((p, i) => (
              <motion.button
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setDirection(i > currentIndex ? 1 : -1);
                  setCurrentIndex(i);
                }}
                animate={{
                  scale: i === currentIndex ? 1 : 0.85,
                  opacity: i === currentIndex ? 1 : 0.5,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "relative h-10 w-10 shrink-0 rounded-lg overflow-hidden",
                  i === currentIndex && "ring-2 ring-white/60"
                )}
              >
                <Image src={p.url ?? ""} alt="" fill className="object-cover" sizes="40px" />
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Delete confirm modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDeleting) setShowDeleteConfirm(false);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className="w-[92vw] max-w-sm rounded-2xl border border-white/15 bg-zinc-950/95 p-5 text-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-base font-semibold">Delete photo?</h3>
                <p className="mt-1.5 text-sm text-white/70">
                  This photo will be removed permanently. This action cannot be undone.
                </p>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                    onClick={() => {
                      void handleDelete();
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );

  if (!isMounted) return null;

  return createPortal(viewer, document.body);
}
