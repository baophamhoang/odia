"use client";

import { useRuns } from "@/app/lib/api";
import { VaultView } from "./vault-view";

export default function VaultPage() {
  const { data: runs, isLoading, isValidating } = useRuns();
  return (
    <VaultView
      runs={runs ?? []}
      isLoading={isLoading}
      isRefreshing={isValidating && !isLoading}
    />
  );
}
