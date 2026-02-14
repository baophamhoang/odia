import { PhotoGridSkeleton } from "@/app/components/skeleton";

export default function MeLoading() {
  return (
    <main className="max-w-xl mx-auto px-4 pt-4 md:pt-20 pb-20">
      {/* Page title placeholder */}
      <div className="h-8 w-32 bg-border rounded-full mb-4 animate-pulse" />

      {/* Tab bar skeleton */}
      <div className="flex gap-6 border-b border-border mb-4 pb-2">
        <div className="h-4 w-20 bg-border rounded-full animate-pulse" />
        <div className="h-4 w-16 bg-border rounded-full animate-pulse" />
      </div>

      {/* Photo grid skeleton */}
      <PhotoGridSkeleton />
    </main>
  );
}
