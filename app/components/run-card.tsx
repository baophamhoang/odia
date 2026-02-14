"use client";

import Link from "next/link";
import Image from "next/image";
import { RunCard as RunCardType } from "@/app/lib/types";

interface RunCardProps {
  run: RunCardType;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Avatar({
  user,
  size = "sm",
}: {
  user: { name: string | null; avatar_url: string | null };
  size?: "sm" | "md";
}) {
  const sizeClasses = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const initial = user.name ? user.name.charAt(0).toUpperCase() : "?";

  if (user.avatar_url) {
    return (
      <div
        className={`${sizeClasses} rounded-full overflow-hidden border-2 border-background flex-shrink-0`}
      >
        <Image
          src={user.avatar_url}
          alt={user.name ?? "User"}
          width={size === "sm" ? 28 : 36}
          height={size === "sm" ? 28 : 36}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full border-2 border-background bg-accent text-white flex items-center justify-center font-semibold flex-shrink-0`}
    >
      {initial}
    </div>
  );
}

export function RunCard({ run }: RunCardProps) {
  const displayPhotos = run.photos.slice(0, 3);
  const extraCount = run.photo_count - 3;
  const hasPhotos = run.photos.length > 0;

  return (
    <Link href={`/runs/${run.id}`} className="block">
      <article className="bg-surface rounded-xl border border-border p-4 shadow-sm active:opacity-80 transition-opacity">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-foreground-secondary font-medium uppercase tracking-wide">
              {formatDate(run.run_date)}
            </p>
            {run.title && (
              <h2 className="text-foreground font-semibold text-base mt-0.5 truncate">
                {run.title}
              </h2>
            )}
            {run.location && (
              <p className="flex items-center gap-1 text-foreground-secondary text-sm mt-0.5">
                <svg
                  width="12"
                  height="12"
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
                <span className="truncate">{run.location}</span>
              </p>
            )}
          </div>
          {/* Creator avatar */}
          <Avatar user={run.creator} size="md" />
        </div>

        {/* Description */}
        {run.description && (
          <p className="text-foreground-secondary text-sm mb-3 truncate">
            {run.description}
          </p>
        )}

        {/* Photo grid */}
        {hasPhotos && (
          <div className="grid grid-cols-3 gap-1.5 mb-3 rounded-lg overflow-hidden">
            {displayPhotos.map((photo, index) => {
              const isLast = index === 2 && extraCount > 0;
              return (
                <div
                  key={photo.id}
                  className="relative aspect-[4/3] rounded-md overflow-hidden bg-border"
                >
                  {photo.url ? (
                    <Image
                      src={photo.url}
                      alt={photo.file_name ?? `Photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 30vw, 150px"
                    />
                  ) : (
                    <div className="w-full h-full bg-border animate-pulse" />
                  )}
                  {isLast && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-md">
                      <span className="text-white font-bold text-lg">
                        +{extraCount}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Hashtags */}
        {run.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {run.hashtags.map((tag) => (
              <span key={tag} className="text-accent text-sm font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer: participants */}
        {run.participants.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {run.participants.slice(0, 5).map((participant) => (
                <Avatar key={participant.id} user={participant} size="sm" />
              ))}
            </div>
            {run.participants.length > 5 && (
              <span className="text-foreground-secondary text-xs">
                +{run.participants.length - 5} more
              </span>
            )}
            {run.participants.length === 1 && (
              <span className="text-foreground-secondary text-xs">
                {run.participants[0].name ?? "1 runner"}
              </span>
            )}
            {run.participants.length > 1 && run.participants.length <= 5 && (
              <span className="text-foreground-secondary text-xs">
                {run.participants.length} runners
              </span>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}
