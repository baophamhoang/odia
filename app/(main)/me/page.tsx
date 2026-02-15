"use client";

import { useMyPhotos, useMyTaggedRuns } from "@/app/lib/api";
import { MyPhotosContent } from "./me-content";

export default function MyPhotosPage() {
  const { data: uploadedPhotos, isLoading: loadingPhotos } = useMyPhotos();
  const { data: taggedRuns, isLoading: loadingRuns } = useMyTaggedRuns();

  return (
    <MyPhotosContent
      uploadedPhotos={uploadedPhotos ?? []}
      taggedRuns={taggedRuns ?? []}
      isLoading={loadingPhotos || loadingRuns}
    />
  );
}
