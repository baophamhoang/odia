import { ImageResponse } from "next/og";
import { db } from "@/app/lib/db";
import { folders as foldersTable, photos as photosTable } from "@/app/lib/schema";
import { eq } from "drizzle-orm";
import { getDownloadUrl } from "@/app/lib/r2";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

interface Props {
  params: Promise<{ token: string }>;
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: Props) {
  const { token } = await params;

  const folder = await db.query.folders.findFirst({
    where: eq(foldersTable.shareToken, token),
  });

  if (!folder) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#09090b",
            color: "#71717a",
            fontSize: 32,
            fontFamily: "sans-serif",
          }}
        >
          Not found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const rawPhotos = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.folderId, folder.id))
    .orderBy(photosTable.displayOrder)
    .limit(4);

  const validUrls = (
    await Promise.all(
      rawPhotos.map(async (p) => {
        const url = await getDownloadUrl(p.thumbPath ?? p.storagePath);
        return fetchImageAsDataUrl(url);
      })
    )
  ).filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: folder name */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 800,
              color: "#fafafa",
              letterSpacing: "-1px",
              lineHeight: 1.1,
            }}
          >
            {folder.name}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#71717a", marginTop: 10 }}>
            {`${rawPhotos.length} photo${rawPhotos.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        {/* Photo grid */}
        {validUrls.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "12px",
              flex: 1,
            }}
          >
            {validUrls.slice(0, 4).map((url, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flex: 1,
                  borderRadius: "16px",
                  overflow: "hidden",
                  background: "#27272a",
                  position: "relative",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Bottom brand */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginTop: "32px",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#3f3f46",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Odia
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
