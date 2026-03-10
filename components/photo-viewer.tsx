"use client";

import { useState, useRef, useMemo } from "react";
import Lightbox from "yet-another-react-lightbox";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";
import { FolderOpen, Footprints, Link2, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Photo } from "@/app/lib/types";

interface PhotoViewerProps {
  open: boolean;
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  canDeletePhoto?: (photo: Photo) => boolean;
  onDeletePhoto?: (photo: Photo) => Promise<void>;
  folderLink?: string | null;
  runLink?: string | null;
}

export function PhotoViewer({
  open,
  photos,
  initialIndex,
  onClose,
  canDeletePhoto,
  onDeletePhoto,
  folderLink,
  runLink,
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // When the viewer transitions from closed → open, jump to the requested index
  const prevOpenRef = useRef(open);
  if (open && !prevOpenRef.current) setCurrentIndex(initialIndex);
  prevOpenRef.current = open;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const photo = photos[currentIndex];

  const slides = useMemo(
    () => photos.map((p) => ({
      src: p.url ?? "",
      download: { url: p.url ?? "", filename: p.file_name ?? p.id },
    })),
    [photos],
  );

  function handleCopyLink() {
    if (!photo?.url) return;
    navigator.clipboard.writeText(photo.url);
    toast.success("Link copied!");
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

  const toolbarButtons: React.ReactNode[] = [
    <button
      key="copy-link"
      type="button"
      className="yarl__button"
      onClick={handleCopyLink}
      title="Copy link"
    >
      <Link2 className="h-5 w-5" />
    </button>,
  ];

  if (folderLink) {
    toolbarButtons.push(
      <button
        key="folder"
        type="button"
        className="yarl__button"
        onClick={() => { onClose(); router.push(folderLink); }}
        title="Folders"
      >
        <FolderOpen className="h-5 w-5" />
      </button>,
    );
  }

  if (runLink) {
    toolbarButtons.push(
      <button
        key="run"
        type="button"
        className="yarl__button"
        onClick={() => { onClose(); router.push(runLink); }}
        title="Run"
      >
        <Footprints className="h-5 w-5" />
      </button>,
    );
  }

  if (photo && canDeletePhoto?.(photo) && onDeletePhoto) {
    toolbarButtons.push(
      <button
        key="delete"
        type="button"
        className="yarl__button"
        onClick={() => setShowDeleteConfirm(true)}
        disabled={isDeleting}
        title="Delete"
      >
        {isDeleting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Trash2 className="h-5 w-5" />
        )}
      </button>,
    );
  }

  toolbarButtons.push("close" as unknown as React.ReactNode);

  return (
    <>
      <Lightbox
        open={open}
        close={onClose}
        slides={slides}
        index={currentIndex}
        on={{ view: ({ index }) => setCurrentIndex(index) }}
        animation={{ fade: 150, swipe: 250 }}
        plugins={[Download]}
        toolbar={{ buttons: toolbarButtons }}
        styles={{ container: { backgroundColor: "rgba(0,0,0,0.85)" } }}
      />

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/55"
          onClick={() => { if (!isDeleting) setShowDeleteConfirm(false); }}
        >
          <div
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
                onClick={() => { void handleDelete(); }}
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
