import type { ImageLoaderProps } from 'next/image';

export default function thumbLoader({ src, width, quality }: ImageLoaderProps): string {
  return `/api/thumb?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
