# Odia — Setup Guide

## Prerequisites

- Node.js 20+
- npm
- Google Cloud Console account (for OAuth)
- Supabase account (free tier)
- Cloudflare account (for R2, free tier)
- Vercel account (for deployment)

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Auth - NextAuth
NEXTAUTH_SECRET=<generate with `openssl rand -base64 32`>
NEXTAUTH_URL=http://localhost:3000

# Auth - Google OAuth
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# Database - Supabase
DATABASE_URL=<Supabase connection string>
NEXT_PUBLIC_SUPABASE_URL=<Supabase project URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key, server-side only>

# Storage - Cloudflare R2
R2_ACCOUNT_ID=<Cloudflare account ID>
R2_ACCESS_KEY_ID=<R2 API token access key>
R2_SECRET_ACCESS_KEY=<R2 API token secret key>
R2_BUCKET_NAME=odia-photos
R2_PUBLIC_URL=<R2 bucket public URL or custom domain>
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Navigate to **APIs & Services > Credentials**
4. Create an **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
6. Copy the Client ID and Client Secret to `.env.local`

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings > Database** and copy the connection string
3. Go to **Settings > API** and copy the project URL and service role key
4. Run the database migrations (see `docs/ARCHITECTURE.md` for schema)

## Cloudflare R2 Setup

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Create a bucket named `odia-photos`
4. Go to **R2 > Manage R2 API Tokens**
5. Create an API token with **Object Read & Write** permission for the bucket
6. Copy the Account ID, Access Key ID, and Secret Access Key to `.env.local`
7. (Optional) Set up a custom domain or public URL for the bucket

## Dependencies to Install

```bash
# Auth
npm install next-auth@beta @auth/core

# Database
npm install @supabase/supabase-js

# R2 (S3-compatible)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Development

```bash
npm run dev
```

App runs at `http://localhost:3000`.

## Seeding the Whitelist

After setting up the database, insert allowed emails directly:

```sql
INSERT INTO allowed_emails (email) VALUES
  ('teammate1@gmail.com'),
  ('teammate2@gmail.com'),
  ('teammate3@gmail.com');
```

## Deployment (Vercel)

1. Push repo to GitHub
2. Import project in Vercel
3. Add all environment variables from `.env.local` to Vercel project settings
4. Update `NEXTAUTH_URL` to your production URL
5. Update Google OAuth redirect URI to production URL
6. Deploy
