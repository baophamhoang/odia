"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import { useRun } from "@/app/lib/api";
import { RunDetail } from "./run-detail";
import { RunDetailSkeleton } from "@/components/skeleton";

export default function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: run, isLoading, isValidating, mutate } = useRun(id);
  const { data: session } = useSession();

  if (isLoading || !run) {
    return <RunDetailSkeleton />;
  }

  const isOwner = session?.user?.id === run.created_by;
  const isAdmin = session?.user?.role === "admin";

  return (
    <RunDetail
      run={run}
      isOwner={isOwner}
      isAdmin={isAdmin}
      mutate={mutate}
      isRefreshing={isValidating && !isLoading}
      currentUserId={session?.user?.id}
    />
  );
}
