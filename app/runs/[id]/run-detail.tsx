"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { PhotoLightbox } from "@/app/components/photo-lightbox";
import { deleteRun } from "@/app/actions/runs";
import type { RunWithDetails, User } from "@/app/lib/types";

interface RunDetailProps {
  run: RunWithDetails;
  isOwner: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function Avatar({ user }: { user: User }) {
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "?";

  if (user.avatar_url) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-background flex-shrink-0">
        <Image
          src={user.avatar_url}
          alt={user.name ?? "User"}
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full border-2 border-background bg-accent text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
      {initial}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RunDetail client component
// ---------------------------------------------------------------------------

export function RunDetail({ run, isOwner }: RunDetailProps) {
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleBack() {
    router.back();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this run? This cannot be undone."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteRun(run.id);
      router.push("/feed");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      alert(`Failed to delete run: ${message}`);
      setIsDeleting(false);
    }
  }

  const title = run.title ?? "Run Details";

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background border-b border-border md:top-14">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center justify-center w-9 h-9 rounded-full text-foreground hover:bg-border transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <h1 className="text-base font-semibold text-foreground flex-1 text-center truncate">
            {title}
          </h1>

          {/* Owner actions placeholder — keeps layout balanced */}
          <div className="w-9 h-9 flex-shrink-0" aria-hidden={!isOwner}>
            {/* intentionally empty; delete is in the body */}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-xl mx-auto w-full px-4 py-5 pb-28 flex flex-col gap-6">

        {/* Date + location */}
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-foreground-secondary text-sm">
            <CalendarIcon />
            <span>{formatDate(run.run_date)}</span>
          </div>
          {run.location && (
            <div className="flex items-center gap-2 text-foreground-secondary text-sm">
              <LocationIcon />
              <span>{run.location}</span>
            </div>
          )}
        </section>

        {/* Photo grid */}
        {run.photos.length > 0 && (
          <section aria-label="Run photos">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {run.photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="relative aspect-[4/3] rounded-md overflow-hidden bg-border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={`View photo ${index + 1} of ${run.photos.length}`}
                >
                  {photo.url ? (
                    <Image
                      src={photo.url}
                      alt={photo.file_name ?? `Photo ${index + 1}`}
                      fill
                      className="object-cover transition-opacity hover:opacity-90"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 200px"
                    />
                  ) : (
                    <div className="w-full h-full bg-border animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Hashtags */}
        {run.hashtags.length > 0 && (
          <section aria-label="Hashtags">
            <div className="flex flex-wrap gap-2">
              {run.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="text-accent text-sm font-medium bg-accent/10 px-3 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Who was there */}
        {run.participants.length > 0 && (
          <section aria-label="Participants">
            <h2 className="text-sm font-semibold text-foreground mb-2">
              Who was there
            </h2>
            <div className="flex flex-wrap gap-2">
              {run.participants.map((participant) => {
                const initial = participant.name
                  ? participant.name.charAt(0).toUpperCase()
                  : "?";
                return (
                  <div
                    key={participant.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-sm font-medium text-foreground"
                  >
                    <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold overflow-hidden flex-shrink-0">
                      {participant.avatar_url ? (
                        <Image
                          src={participant.avatar_url}
                          alt={participant.name ?? "User"}
                          width={20}
                          height={20}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-accent">{initial}</span>
                      )}
                    </span>
                    <span className="max-w-[120px] truncate">
                      {participant.name ?? participant.email.split("@")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Notes / description */}
        {run.description && (
          <section aria-label="Notes">
            <h2 className="text-sm font-semibold text-foreground mb-1">
              Notes
            </h2>
            <p className="text-foreground-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {run.description}
            </p>
          </section>
        )}

        {/* Posted by */}
        <section
          className="flex items-center gap-2 pt-2 border-t border-border"
          aria-label="Posted by"
        >
          <Avatar user={run.creator} />
          <span className="text-foreground-secondary text-sm">
            Posted by{" "}
            <span className="text-foreground font-medium">
              {run.creator.name ?? run.creator.email.split("@")[0]}
            </span>
          </span>
        </section>

        {/* Delete run — owner only */}
        {isOwner && (
          <section>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="
                w-full flex items-center justify-center gap-2
                py-3 px-6 rounded-full text-sm font-semibold text-white
                bg-destructive
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:opacity-90 active:scale-[0.98]
                transition-all
              "
            >
              {isDeleting ? (
                <>
                  <SpinnerIcon />
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon />
                  Delete Run
                </>
              )}
            </button>
          </section>
        )}
      </main>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={run.photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
