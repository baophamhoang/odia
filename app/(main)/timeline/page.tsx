"use client";

import { useRuns } from "@/app/lib/api";
import { TimelineView } from "./timeline-view";

export default function TimelinePage() {
  const { data: runs, isLoading } = useRuns();
  return <TimelineView runs={runs ?? []} isLoading={isLoading} />;
}
