"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useRuns } from "@/app/lib/api";
import { VaultView } from "./vault-view";

function VaultPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") ?? "recent";
  const folderId = searchParams.get("folderId") ?? null;
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
      initialFolderId={folderId}
    />
  );
}

export default function VaultPage() {
  return (
    <Suspense
      fallback={
        <VaultView
          runs={[]}
          isLoading
          isRefreshing={false}
          activeTab="recent"
          onTabChange={() => {}}
        />
      }
    >
      <VaultPageContent />
    </Suspense>
  );
}
