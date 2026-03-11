#!/usr/bin/env npx tsx
/**
 * One-off script to backfill thumbnails for existing photos.
 * Run: npx tsx scripts/backfill-thumbs.ts
 */

import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { isNull, eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import * as schema from "../app/lib/schema";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema });

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME!;

async function getDownloadUrl(storagePath: string): Promise<string> {
  if (process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL}/${storagePath}`;
  }
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: storagePath }), { expiresIn: 3600 });
}

async function main() {
  const photos = await db
    .select({ id: schema.photos.id, storagePath: schema.photos.storagePath })
    .from(schema.photos)
    .where(isNull(schema.photos.thumbPath));

  console.log(`Found ${photos.length} photos without thumbnails`);

  let processed = 0;
  let errors = 0;

  for (const photo of photos) {
    try {
      const url = await getDownloadUrl(photo.storagePath);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const thumbBuffer = await sharp(buffer)
        .rotate()
        .resize(400)
        .jpeg({ quality: 75 })
        .toBuffer();

      const thumbPath = `thumbs/${photo.id}.jpeg`;

      await r2.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: thumbPath,
        Body: thumbBuffer,
        ContentType: "image/jpeg",
      }));

      await db.update(schema.photos)
        .set({ thumbPath })
        .where(eq(schema.photos.id, photo.id));

      processed++;
      process.stdout.write(`\r${processed}/${photos.length} processed, ${errors} errors`);
    } catch (e) {
      errors++;
      console.error(`\nFailed ${photo.id}:`, e);
    }
  }

  console.log(`\nDone. processed=${processed}, errors=${errors}`);
}

main().catch(console.error).finally(() => client.close());
