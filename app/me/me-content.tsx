"use client";

import { useState } from "react";
import Image from "next/image";
import { RunCard } from "@/app/components/run-card";
import { PhotoLightbox } from "@/app/components/photo-lightbox";
import type { RunCard as RunCardType, Photo, Run } from "@/app/lib/types";

type UploadedPhoto = Photo & { run: Run | null; url?: string };

interface MeContentProps {
  uploadedPhotos: UploadedPhoto[];
  taggedRuns: RunCardType[];
}

type Tab = "uploads" | "tagged";

function formatRunDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MeContent({ uploadedPhotos, taggedRuns }: MeContentProps) {
  const [activeTab, setActiveTab] = useState<Tab>("uploads");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxPhotos: Photo[] = uploadedPhotos.map((p) => ({
    id: p.id,
    run_id: p.run_id,
    storage_path: p.storage_path,
    file_name: p.file_name,
    file_size: p.file_size,
    mime_type: p.mime_type,
    display_order: p.display_order,
    uploaded_by: p.uploaded_by,
    created_at: p.created_at,
    url: p.url,
  }));

  const tabClass = (tab: Tab) =>
    tab === activeTab
      ? "border-b-2 border-accent text-accent pb-2 text-sm font-semibold transition-colors"
      : "border-b-2 border-transparent text-foreground-secondary pb-2 text-sm font-medium transition-colors hover:text-foreground";

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-border mb-4">
        <button
          type="button"
          className={tabClass("uploads")}
          onClick={() => setActiveTab("uploads")}
          aria-selected={activeTab === "uploads"}
          role="tab"
        >
          My Uploads
        </button>
        <button
          type="button"
          className={tabClass("tagged")}
          onClick={() => setActiveTab("tagged")}
          aria-selected={activeTab === "tagged"}
          role="tab"
        >
          Tagged In
        </button>
      </div>

      {/* My Uploads tab */}
      {activeTab === "uploads" && (
        <>
          {uploadedPhotos.length === 0 ? (
            <p className="text-foreground-secondary text-sm py-10 text-center">
              You have not uploaded any photos yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5">
              {uploadedPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className="group flex flex-col gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`View photo${photo.run ? ` from ${formatRunDate(photo.run.run_date)}` : ""}`}
                >
                  <div className="relative aspect-square w-full rounded-md overflow-hidden bg-border">
                    {photo.url ? (
                      <Image
                        src={photo.url}
                        alt={photo.file_name ?? `Photo ${index + 1}`}
                        fill
                        className="object-cover group-active:opacity-80 transition-opacity"
                        sizes="(max-width: 768px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-border animate-pulse" />
                    )}
                  </div>
                  {photo.run && (
                    <span className="text-[10px] text-foreground-secondary leading-tight px-0.5 truncate w-full">
                      {formatRunDate(photo.run.run_date)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {lightboxIndex !== null && lightboxPhotos.length > 0 && (
            <PhotoLightbox
              photos={lightboxPhotos}
              initialIndex={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
            />
          )}
        </>
      )}

      {/* Tagged In tab */}
      {activeTab === "tagged" && (
        <>
          {taggedRuns.length === 0 ? (
            <p className="text-foreground-secondary text-sm py-10 text-center">
              You have not been tagged in any runs yet.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {taggedRuns.map((run) => (
                <RunCard key={run.id} run={run} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
