import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const ALLOWED_HOSTS = ['cdn.1ohana.club', 'lh3.googleusercontent.com'];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const url = searchParams.get('url');
  const w = Math.min(parseInt(searchParams.get('w') ?? '800', 10), 1920);
  const q = Math.min(parseInt(searchParams.get('q') ?? '75', 10), 100);

  if (!url) return new NextResponse('Missing url', { status: 400 });

  // SSRF guard: only allow known CDN hosts
  let parsed: URL;
  try { parsed = new URL(url); } catch { return new NextResponse('Invalid url', { status: 400 }); }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new NextResponse('Disallowed host', { status: 403 });
  }

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return new NextResponse('Upstream error', { status: 502 });

  const buffer = Buffer.from(await res.arrayBuffer());
  const resized = await sharp(buffer).rotate().resize(w).webp({ quality: q }).toBuffer() as unknown as BodyInit;

  return new NextResponse(resized, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
