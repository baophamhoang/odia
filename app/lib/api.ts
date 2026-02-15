import useSWR from "swr";
import type { RunCard, RunWithDetails, User, Photo, Run } from "@/app/lib/types";
import type { AllowedEmailWithUser } from "@/app/actions/admin";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export function useRuns(page: number = 1) {
  return useSWR<RunCard[]>(
    `/api/runs?page=${page}`,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useRun(id: string) {
  return useSWR<RunWithDetails>(
    id ? `/api/runs/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useSimpleRuns() {
  return useSWR<{ id: string; title: string | null; run_date: string }[]>(
    "/api/runs/simple",
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useTeamMembers() {
  return useSWR<User[]>(
    "/api/users/members",
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useMyPhotos() {
  return useSWR<(Photo & { run: Run | null })[]>(
    "/api/users/me/photos",
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useMyTaggedRuns() {
  return useSWR<RunCard[]>(
    "/api/users/me/tagged",
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useAdminEmails() {
  return useSWR<AllowedEmailWithUser[]>(
    "/api/admin/emails",
    fetcher,
    { revalidateOnFocus: false }
  );
}
