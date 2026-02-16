"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useRuns } from "@/app/lib/api";
import { VaultView } from "./vault-view";

export default function VaultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") ?? "recent";
  const { data: runs, isLoading, isValidating } = useRuns();

  const onTabChange = (value: string) => {
    router.push(value === "recent" ? "/vault" : `/vault?tab=${value}`, {
      scroll: false,
    });
  };

  return (
    <VaultView
      runs={runs ?? []}
      isLoading={isLoading}
      isRefreshing={isValidating && !isLoading}
      activeTab={tab}
      onTabChange={onTabChange}
    />
  );
}
