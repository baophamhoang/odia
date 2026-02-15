"use client";

import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-muted/60",
        className
      )}
    />
  );
}

export function RunCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border/20 bg-card/30">
      <Shimmer className="aspect-[4/3] rounded-none" />
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex -space-x-1.5">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-6 w-6 rounded-full" />
          ))}
        </div>
        <Shimmer className="h-3 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function RunCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <RunCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PhotoGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center w-8">
            <Shimmer className="h-3 w-3 rounded-full" />
            <Shimmer className="flex-1 w-px mt-2" />
          </div>
          <div className="flex-1 pb-8">
            <Shimmer className="h-3 w-24 rounded-md mb-3" />
            <div className="rounded-2xl border border-border/20 p-3">
              <div className="flex gap-2">
                {[0, 1, 2].map((j) => (
                  <Shimmer key={j} className="h-24 w-24 rounded-xl shrink-0" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RunDetailSkeleton() {
  return (
    <div>
      {/* Hero */}
      <Shimmer className="w-full aspect-[16/9] rounded-2xl mb-6" />
      {/* Title */}
      <Shimmer className="h-8 w-64 rounded-lg mb-3" />
      <Shimmer className="h-4 w-40 rounded-md mb-6" />
      {/* Photo grid */}
      <PhotoGridSkeleton count={6} />
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="space-y-4">
      <Shimmer className="h-20 w-full rounded-2xl" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Shimmer key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
