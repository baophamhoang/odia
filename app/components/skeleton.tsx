"use client";

export function RunCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border p-4 shadow-sm animate-pulse">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 space-y-2">
          {/* Date */}
          <div className="h-3 w-28 bg-border rounded-full" />
          {/* Title */}
          <div className="h-5 w-48 bg-border rounded-full" />
          {/* Location */}
          <div className="h-3 w-36 bg-border rounded-full" />
        </div>
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-border flex-shrink-0" />
      </div>

      {/* Description */}
      <div className="h-4 w-full bg-border rounded-full mb-3" />

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/3] rounded-md bg-border" />
        ))}
      </div>

      {/* Hashtags */}
      <div className="flex gap-2 mb-3">
        <div className="h-4 w-16 bg-border rounded-full" />
        <div className="h-4 w-20 bg-border rounded-full" />
        <div className="h-4 w-12 bg-border rounded-full" />
      </div>

      {/* Participants */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full bg-border border-2 border-background"
            />
          ))}
        </div>
        <div className="h-3 w-16 bg-border rounded-full" />
      </div>
    </div>
  );
}

export function PhotoGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[4/3] rounded-md bg-border" />
      ))}
    </div>
  );
}
