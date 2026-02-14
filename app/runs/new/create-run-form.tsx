"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CalendarPicker } from "@/app/components/calendar-picker";
import { PhotoUpload } from "@/app/components/photo-upload";
import { MemberTags } from "@/app/components/member-tags";
import { HashtagInput } from "@/app/components/hashtag-input";
import { requestUploadUrls } from "@/app/actions/photos";
import { createRun } from "@/app/actions/runs";
import type { User } from "@/app/lib/types";

interface PhotoEntry {
  photoId: string;
  file: File;
  previewUrl: string;
}

interface CreateRunFormProps {
  members: User[];
  currentUserId: string;
}

function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground-secondary flex-shrink-0"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function CreateRunForm({ members, currentUserId }: CreateRunFormProps) {
  const router = useRouter();

  const [date, setDate] = useState<string>(todayString());
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([
    currentUserId,
  ]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [location, setLocation] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canPost = Boolean(date) && photos.length > 0;

  async function handleSubmit() {
    if (!canPost || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 1. Request presigned upload URLs for each photo
      const fileMetadata = photos.map((p) => ({
        name: p.file.name,
        type: p.file.type,
        size: p.file.size,
      }));

      const uploadTargets = await requestUploadUrls(fileMetadata);

      // 2. Upload each file to its presigned URL
      await Promise.all(
        uploadTargets.map(({ uploadUrl }, index) => {
          const file = photos[index]!.file;
          return fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
        })
      );

      // 3. Create the run record
      const photoIds = uploadTargets.map((t) => t.photoId);
      await createRun({
        run_date: date,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        participant_ids: selectedMemberIds,
        photo_ids: photoIds,
      });

      // 4. Navigate to feed
      router.push("/feed");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      alert(`Failed to post run: ${message}`);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link
            href="/feed"
            className="flex items-center justify-center w-9 h-9 rounded-full text-foreground hover:bg-border transition-colors"
            aria-label="Back to feed"
          >
            <BackIcon />
          </Link>

          <h1 className="text-base font-semibold text-foreground flex-1 text-center">
            New Run
          </h1>

          {/* Disabled quick-post button in top bar */}
          <button
            type="button"
            disabled
            aria-hidden="true"
            className="px-4 py-1.5 rounded-full text-sm font-medium bg-accent/30 text-white cursor-not-allowed select-none"
          >
            Post
          </button>
        </div>
      </header>

      {/* Form body */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 flex flex-col gap-6 pb-36">
        {/* Date picker */}
        <section aria-label="Run date">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Date
          </label>
          <CalendarPicker value={date} onChange={setDate} />
        </section>

        {/* Photo upload */}
        <section aria-label="Photos">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Photos
          </label>
          <PhotoUpload
            onPhotosReady={setPhotos}
            uploading={isSubmitting}
          />
        </section>

        {/* Who was there */}
        <section aria-label="Participants">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Who was there?
          </label>
          <MemberTags
            members={members}
            selected={selectedMemberIds}
            onChange={setSelectedMemberIds}
          />
        </section>

        {/* Location */}
        <section aria-label="Location">
          <label
            htmlFor="run-location"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            Location
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 pointer-events-none">
              <LocationIcon />
            </span>
            <input
              id="run-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Central Park"
              className="
                w-full pl-9 pr-3 py-2.5 rounded-lg border border-border
                bg-surface text-foreground text-sm
                placeholder:text-foreground-secondary
                focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                transition-colors
              "
            />
          </div>
        </section>

        {/* Hashtags */}
        <section aria-label="Hashtags">
          <label className="block text-sm font-semibold text-foreground mb-2">
            Hashtags
          </label>
          <HashtagInput value={hashtags} onChange={setHashtags} />
        </section>

        {/* Notes / description */}
        <section aria-label="Notes">
          <label
            htmlFor="run-description"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            Notes
          </label>
          <textarea
            id="run-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any thoughts on the run?"
            rows={4}
            className="
              w-full px-3 py-2.5 rounded-lg border border-border
              bg-surface text-foreground text-sm
              placeholder:text-foreground-secondary
              focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
              transition-colors resize-none
            "
          />
        </section>
      </main>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-xl mx-auto px-4 py-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPost || isSubmitting}
            className="
              w-full flex items-center justify-center gap-2
              py-3 px-6 rounded-full text-sm font-semibold text-white
              bg-accent
              disabled:bg-accent/40 disabled:cursor-not-allowed
              hover:bg-accent-hover active:scale-[0.98]
              transition-all
            "
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon />
                Posting...
              </>
            ) : (
              "Post Run"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
