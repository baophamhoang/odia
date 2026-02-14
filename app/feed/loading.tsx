import { RunCardSkeleton } from "@/app/components/skeleton";

export default function FeedLoading() {
  return (
    <main className="max-w-xl mx-auto px-4 pt-4 md:pt-20 pb-20">
      {/* Page title placeholder */}
      <div className="h-8 w-20 bg-border rounded-full mb-4 animate-pulse" />

      <div className="flex flex-col gap-4">
        <RunCardSkeleton />
        <RunCardSkeleton />
        <RunCardSkeleton />
      </div>
    </main>
  );
}
