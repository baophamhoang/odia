"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoViewer } from "@/components/photo-viewer";
import type { Photo } from "@/app/lib/types";

export function SharePhotoGrid({ photos }: { photos: Photo[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setViewerIndex(i)}
            className="relative aspect-square rounded-xl overflow-hidden bg-muted/40 group"
          >
            <Image
              src={photo.url ?? ""}
              alt={photo.file_name ?? ""}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading={i < 8 ? "eager" : "lazy"}
            />
          </button>
        ))}
      </div>
      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          runLink={null}
        />
      )}
    </>
  );
}
