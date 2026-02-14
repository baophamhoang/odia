# Odia — Architecture

Private running photo storage app for a small team.

## Tech Stack

| Layer        | Choice                          |
| ------------ | ------------------------------- |
| Framework    | Next.js 16, React 19, TypeScript |
| Styling      | Tailwind CSS 4                  |
| Auth         | NextAuth v5 (Auth.js) + Google SSO |
| Database     | Supabase (PostgreSQL)           |
| Photo Storage| Cloudflare R2 (S3-compatible)   |
| Deployment   | Vercel                          |

## System Diagram

```
┌──────────────────────────────────────────────────────┐
│                   Browser (Mobile-first)              │
└──────────┬──────────────────────┬────────────────────┘
           │ Server Actions /      │ Direct Upload
           │ Route Handlers        │ (presigned URL)
           ▼                       ▼
┌──────────────────────┐   ┌──────────────────────────┐
│   Next.js on Vercel  │   │     Cloudflare R2        │
│                      │   │   (photo bucket)          │
│  - Server Actions    │   └──────────────────────────┘
│  - Auth middleware   │             ▲
│  - Route Handlers    │─────────────┘
└──────────┬───────────┘   presigned URL generation
           │
           ▼
┌──────────────────────┐
│  Supabase PostgreSQL │
│  - users             │
│  - allowed_emails    │
│  - runs              │
│  - run_participants  │
│  - photos            │
└──────────────────────┘
```

## Data Model

### `allowed_emails`

Whitelist lookup table. Only emails in this table can sign in.

```sql
CREATE TABLE allowed_emails (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  added_by   UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `users`

Created on first successful Google SSO login.

```sql
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `runs`

A run post tied to a specific date.

```sql
CREATE TABLE runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date    DATE NOT NULL,
  title       TEXT,
  description TEXT,
  location    TEXT,
  hashtags    TEXT[],
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_runs_date ON runs(run_date DESC);
CREATE INDEX idx_runs_created_by ON runs(created_by);
```

### `run_participants`

Many-to-many: which team members were on a run.

```sql
CREATE TABLE run_participants (
  run_id  UUID REFERENCES runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (run_id, user_id)
);

CREATE INDEX idx_run_participants_user ON run_participants(user_id);
```

### `photos`

Each photo belongs to one run. `storage_path` is the R2 object key. Signed URLs are generated on demand, never stored.

```sql
CREATE TABLE photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL UNIQUE,
  file_name     TEXT,
  file_size     INT,
  mime_type     TEXT,
  display_order INT DEFAULT 0,
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_photos_run ON photos(run_id, display_order);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
```

### Relationships

```
users ──< run_participants >── runs
users ──< photos
runs  ──< photos
allowed_emails (standalone lookup)
```

## Auth Flow

1. **Middleware** (`middleware.ts`) — protects all routes except `/login` and `/api/auth/*`. Unauthenticated users redirect to `/login`.
2. **Google SSO** — NextAuth v5 with Google provider.
3. **Whitelist check** — `signIn` callback queries `allowed_emails` table. Rejects login if email not found.
4. **User sync** — on successful login, upsert user into `users` table from Google profile (email, name, avatar).

## Photo Upload Flow

1. User selects photos in browser (multi-file input).
2. Photos start uploading immediately (upload-on-select, not on form submit).
3. Client calls Server Action `requestUploadUrls(files[])`.
4. Server generates R2 presigned PUT URLs (TTL: 60s), one per file.
5. Client uploads each file directly to R2 via PUT.
6. On form submit, client sends photo metadata + run data to `createRun` Server Action.
7. Server creates `runs` + `run_participants` + `photos` rows in a single transaction.

## API Surface

All mutations via Next.js Server Actions. Single Route Handler for NextAuth.

### Auth
```
GET/POST  /api/auth/[...nextauth]   — NextAuth handler
```

### Server Actions

```
# Runs
getRuns(page?)                      — feed query, runs with cover photo + participant count
getRun(runId)                       — single run with all photos and participants
createRun(data)                     — create run + link participants + photos
updateRun(runId, data)              — owner only
deleteRun(runId)                    — owner only, also deletes R2 objects

# Photos
requestUploadUrls(files[])          — issue presigned PUT URLs for R2
deletePhoto(photoId)                — owner only, removes DB row + R2 object

# Users
getTeamMembers()                    — all users (for tagging)
getMyPhotos()                       — photos uploaded by or tagged for current user
```

## File Structure

```
app/
├── layout.tsx                      — root layout, auth provider, nav shell
├── page.tsx                        — redirect to /feed or /login
├── globals.css                     — Tailwind + CSS variables
├── login/
│   └── page.tsx                    — Google SSO login page
├── feed/
│   └── page.tsx                    — run feed (reverse chronological)
├── runs/
│   ├── new/
│   │   └── page.tsx                — create run (calendar + form)
│   └── [id]/
│       └── page.tsx                — run detail + photo gallery + lightbox
├── me/
│   └── page.tsx                    — my photos (uploads + tagged)
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts            — NextAuth route handler
├── actions/
│   ├── runs.ts                     — run CRUD server actions
│   ├── photos.ts                   — photo upload/delete server actions
│   └── users.ts                    — team member queries
├── components/
│   ├── run-card.tsx                — feed card with photo strip
│   ├── photo-upload.tsx            — drag/drop + file input upload zone
│   ├── photo-lightbox.tsx          — full-screen photo viewer
│   ├── member-tags.tsx             — chip multi-select for tagging
│   ├── hashtag-input.tsx           — hashtag input field
│   ├── calendar-picker.tsx         — date picker for run date
│   ├── nav-bar.tsx                 — bottom nav (mobile)
│   └── skeleton.tsx                — skeleton loading components
└── lib/
    ├── auth.ts                     — NextAuth config
    ├── db.ts                       — Supabase client
    ├── r2.ts                       — R2 client + presigned URL helpers
    └── types.ts                    — shared TypeScript types
```
