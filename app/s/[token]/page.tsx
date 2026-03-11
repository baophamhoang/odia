import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFolderByShareToken } from "@/app/actions/vault";
import { SharePhotoGrid } from "./share-photo-grid";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await getFolderByShareToken(token);

  if (!data) {
    return { title: "Not found" };
  }

  const { folder } = data;
  const title = `${folder.name} — Odia`;
  const description = `${data.photos.length} photo${data.photos.length !== 1 ? "s" : ""} from ${folder.name}`;
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "https://odia.1ohana.club";
  const ogImageUrl = `${baseUrl}/s/${token}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, type: "image/png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const data = await getFolderByShareToken(token);

  if (!data) notFound();

  const { folder, photos } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">{folder.name}</h1>
            <p className="text-xs text-muted-foreground">
              {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground/50 tracking-widest uppercase">
            Odia
          </span>
        </div>
      </div>

      {/* Photo grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {photos.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            No photos in this folder yet.
          </div>
        ) : (
          <SharePhotoGrid photos={photos} />
        )}
      </main>
    </div>
  );
}
