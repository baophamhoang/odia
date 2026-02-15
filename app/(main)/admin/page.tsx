"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useAdminEmails } from "@/app/lib/api";
import { AdminContent } from "./admin-content";
import { AdminSkeleton } from "@/components/skeleton";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { data: emails, isLoading, mutate } = useAdminEmails();

  if (status === "loading") return <AdminSkeleton />;
  if (!session?.user?.id) { redirect("/login"); }
  if (session.user.role !== "admin") { redirect("/vault"); }

  if (isLoading || !emails) return <AdminSkeleton />;

  return <AdminContent emails={emails} mutate={mutate} />;
}
