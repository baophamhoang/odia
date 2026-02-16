"use client";

import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-muted/60", className)}
    />
  );
}

export function FolderBrowserSkeleton() {
  return (
    <div>
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <Shimmer className="h-4 w-12 rounded-md" />
        <Shimmer className="h-4 w-4 rounded-md" />
        <Shimmer className="h-4 w-20 rounded-md" />
      </div>

      {/* Folder grid skeleton */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden border border-border/20 bg-card/30"
          >
            <Shimmer className="aspect-[4/3] rounded-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
