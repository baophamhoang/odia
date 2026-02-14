import { PhotoGridSkeleton } from "@/app/components/skeleton";

export default function RunDetailLoading() {
  return (
    <div className="md:pt-14">
      {/* Top bar skeleton */}
      <div className="sticky top-0 z-30 bg-background border-b border-border md:top-14">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Back button placeholder */}
          <div className="w-9 h-9 rounded-full bg-border animate-pulse" />
          {/* Title placeholder */}
          <div className="h-4 w-28 bg-border rounded-full animate-pulse" />
          {/* Spacer */}
          <div className="w-9 h-9" />
        </div>
      </div>

      {/* Content skeleton */}
      <main className="max-w-xl mx-auto w-full px-4 py-5 pb-28 flex flex-col gap-6">

        {/* Date + location */}
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-4 w-48 bg-border rounded-full" />
          <div className="h-4 w-32 bg-border rounded-full" />
        </div>

        {/* Photo grid */}
        <PhotoGridSkeleton />

        {/* Hashtags */}
        <div className="flex gap-2 animate-pulse">
          <div className="h-7 w-20 bg-border rounded-full" />
          <div className="h-7 w-16 bg-border rounded-full" />
          <div className="h-7 w-24 bg-border rounded-full" />
        </div>

        {/* Who was there */}
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-4 w-28 bg-border rounded-full" />
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-9 w-28 bg-border rounded-full" />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-4 w-16 bg-border rounded-full" />
          <div className="h-4 w-full bg-border rounded-full" />
          <div className="h-4 w-3/4 bg-border rounded-full" />
        </div>

        {/* Posted by */}
        <div className="flex items-center gap-3 pt-2 border-t border-border animate-pulse">
          <div className="w-8 h-8 rounded-full bg-border flex-shrink-0" />
          <div className="h-4 w-40 bg-border rounded-full" />
        </div>
      </main>
    </div>
  );
}
