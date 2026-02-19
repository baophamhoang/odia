import useSWR from "swr";
import type {
  RunCard,
  RunWithDetails,
  User,
  Photo,
  Run,
  Folder,
  FolderContents,
  FolderWithMeta,
  BreadcrumbItem,
} from "@/app/lib/types";
import type {
  AllowedEmailWithUser,
  AccessControlSettings,
} from "@/app/actions/admin";

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
  return useSWR<(Photo & { run: Run | null; folder: Folder | null })[]>(
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

export function useFolderContents(folderId: string | null) {
  return useSWR<FolderContents>(
    folderId ? `/api/vault/folders/${folderId}` : "/api/vault/folders",
    fetcher
  );
}

export function useBreadcrumbs(folderId: string | null) {
  return useSWR<BreadcrumbItem[]>(
    folderId ? `/api/vault/folders/${folderId}/breadcrumbs` : null,
    fetcher
  );
}

export function useFolderChildren(folderId: string | null) {
  return useSWR<FolderWithMeta[]>(
    folderId ? `/api/vault/folders/${folderId}/children` : null,
    fetcher
  );
}

export function useAdminEmails() {
  return useSWR<AllowedEmailWithUser[]>(
    "/api/admin/emails",
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useAdminAccessControl() {
  return useSWR<AccessControlSettings>(
    "/api/admin/access-control",
    fetcher,
    { revalidateOnFocus: false }
  );
}
