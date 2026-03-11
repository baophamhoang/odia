import type { ImageLoaderProps } from 'next/image';

const CDN_HOST = process.env.NEXT_PUBLIC_CDN_HOST ?? '';

export default function thumbLoader({ src, width, quality }: ImageLoaderProps): string {
  if (CDN_HOST) {
    try {
      const url = new URL(src);
      if (url.hostname === CDN_HOST) {
        // Cloudflare edge transform — zero server cost, globally cached
        return `${url.protocol}//${url.hostname}/cdn-cgi/image/width=${width},format=webp,quality=${quality ?? 75}${url.pathname}`;
      }
    } catch { /* fall through */ }
  }
  return `/api/thumb?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
