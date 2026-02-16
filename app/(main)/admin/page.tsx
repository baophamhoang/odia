"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useAdminAccessControl, useAdminEmails } from "@/app/lib/api";
import { AdminContent } from "./admin-content";
import { AdminSkeleton } from "@/components/skeleton";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { data: emails, isLoading, mutate } = useAdminEmails();
  const {
    data: accessControl,
    isLoading: isLoadingAccessControl,
    mutate: mutateAccessControl,
  } = useAdminAccessControl();

  if (status === "loading") return <AdminSkeleton />;
  if (!session?.user?.id) { redirect("/login"); }
  if (session.user.role !== "admin") { redirect("/vault"); }

  if (isLoading || !emails || isLoadingAccessControl || !accessControl) {
    return <AdminSkeleton />;
  }

  return (
    <AdminContent
      emails={emails}
      mutate={mutate}
      accessControl={accessControl}
      mutateAccessControl={mutateAccessControl}
    />
  );
}
