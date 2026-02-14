# Odia — UX Spec

Mobile-first web app. No native app. Designed for a small running team (5-15 people).

## Design Principles

- Mobile-first, responsive to desktop
- Max content width: 640px centered
- Clean, fast, minimal chrome
- Post a run in under 30 seconds

## Color Palette

| Element           | Light Mode    | Dark Mode     |
| ----------------- | ------------- | ------------- |
| Background        | `white`       | `slate-950`   |
| Card / Surface    | `gray-50`     | `slate-900`   |
| Primary text      | `slate-900`   | `slate-50`    |
| Secondary text    | `slate-600`   | `slate-400`   |
| Accent / CTA      | `orange-500`  | `orange-400`  |
| Accent hover      | `orange-600`  | `orange-500`  |
| Borders           | `gray-200`    | `slate-700`   |
| Tag (selected)    | `orange-500` bg, `white` text | same |
| Tag (unselected)  | `gray-200` bg, `slate-900` text | `slate-700` bg |
| Destructive       | `red-600`     | `red-500`     |

Typography: Geist Sans (already configured in layout).

## Pages

### 1. Login (`/login`)

- Centered card on a white/gray background
- "Odia" logo/wordmark at top
- "Sign in with Google" button (orange accent)
- If denied: "Your email is not on the team list" message

### 2. Feed (`/feed`)

Home screen. Reverse-chronological list of run posts.

**Run card layout:**

```
┌─────────────────────────────────────┐
│ 📅 Feb 14, 2026  ·  📍 Central Park │
│                                     │
│ ┌─────────┬─────────┬─────────┐     │
│ │  photo  │  photo  │  photo  │     │  ← 3-col grid, switchable
│ │   1     │   2     │  +N     │     │
│ └─────────┴─────────┴─────────┘     │
│                                     │
│ #morningrun #5k #sunny              │
│                                     │
│ 👤 Bao, Sarah, +2 more             │
│ "Great weather for a long run..."   │
└─────────────────────────────────────┘
```

- Photos display as a 3-column grid with `aspect-[4/3]` and `object-cover`
- If >3 photos, last slot shows overlay with "+N more"
- Tapping a card navigates to `/runs/[id]`
- Skeleton loading: 3 placeholder cards with `animate-pulse`

**Empty state:**
- "No runs yet. Be the first to post one."
- CTA button → `/runs/new`

**FAB (floating action button):**
- Bottom-right, orange circle with "+" icon
- Navigates to `/runs/new`

### 3. Create Run (`/runs/new`)

Single-page form with clear visual sections. Calendar-based date selection.

**Form layout (top to bottom):**

```
┌─────────────────────────────────────┐
│ ← Back                  Post Run    │
├─────────────────────────────────────┤
│                                     │
│ Date                                │
│ ┌─────────────────────────────────┐ │
│ │       Calendar Picker           │ │
│ │   (defaults to today)           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Photos                              │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│   Tap to add photos                 │
│ │ or drag and drop here          │  │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│ [thumb] [thumb] [thumb]  ← after    │
│ [thumb] [thumb]            upload   │
│                                     │
│ Who was there?                      │
│ [Bao ✓] [Sarah] [Mike] [Jenny]     │
│ ← chip row, tap to toggle          │
│                                     │
│ Location                            │
│ [📍 e.g. Central Park         ]     │
│                                     │
│ Hashtags                            │
│ [# e.g. morningrun, 5k        ]     │
│                                     │
│ Notes (optional)                    │
│ [Any thoughts on the run?     ]     │
│                                     │
│ [        Post Run (orange)        ] │
└─────────────────────────────────────┘
```

**Behavior:**
- Calendar defaults to today, tap any date to change
- Photos upload immediately on selection (presigned URL to R2)
- Thumbnails show progress ring during upload
- Each thumbnail has an "X" to remove
- Upload zone stays visible to add more photos
- Creator is pre-selected in the tag chips
- Hashtags: comma or space separated, stored as array
- Location: free text input
- "Post Run" disabled until date + at least 1 photo are provided
- On submit: optimistic redirect to `/feed`, card appears with "Posting..." state

### 4. Run Detail (`/runs/[id]`)

Full view of a single run.

**Layout:**

```
┌─────────────────────────────────────┐
│ ← Back                    ⋯ (menu) │
├─────────────────────────────────────┤
│                                     │
│ Saturday Long Run                   │
│ Feb 14, 2026 · 📍 Central Park     │
│                                     │
│ ┌─────────┬─────────┐              │
│ │ photo 1 │ photo 2 │              │
│ ├─────────┼─────────┤              │
│ │ photo 3 │ photo 4 │  ← grid     │
│ ├─────────┼─────────┤              │
│ │ photo 5 │ photo 6 │              │
│ └─────────┴─────────┘              │
│                                     │
│ #morningrun #5k #sunny              │
│                                     │
│ Who was there                       │
│ [👤 Bao] [👤 Sarah] [👤 Mike]      │
│                                     │
│ Notes                               │
│ "Great weather for a long run..."   │
│                                     │
│ Posted by Bao                       │
└─────────────────────────────────────┘
```

- Tapping any photo opens **lightbox** (full-screen, left/right arrows, Escape to close)
- "⋯" menu (only visible to creator): Edit, Delete
- 2-column photo grid on mobile, 3-column on desktop

### 5. My Photos (`/me`)

Two tabs: **My Uploads** and **Tagged In**.

**My Uploads:**
- Grid of all photos the current user uploaded
- Tapping a photo navigates to the parent run detail

**Tagged In:**
- List of run cards where the current user is a participant
- Same card layout as the feed

### 6. Navigation

**Mobile bottom nav bar:**

```
┌─────────┬─────────┬─────────┐
│  Feed   │   +     │   Me    │
│  (home) │ (new)   │ (mine)  │
└─────────┴─────────┴─────────┘
```

- 3 items: Feed, New Run (accent color), Me
- Active state: orange icon + label
- Inactive: gray icon + label

**Desktop:** Same nav as a top bar, max-width 640px centered.

## Interaction Details

### Photo Upload
- `<input type="file" multiple accept="image/*">` — triggers native picker on mobile
- Drag and drop support on desktop
- No file size limit enforced in Phase 1 (R2 handles large files)
- Upload-on-select: files start uploading immediately, not on form submit
- Thumbnails: 3-column grid below the upload zone
- Progress: ring overlay on each thumbnail during upload
- Remove: "X" button on each thumbnail (cancels upload if in progress, deletes from R2 if done)

### Member Tagging
- All team members shown as chips in a wrapping flex row
- Tap to toggle selection
- Selected: orange bg, white text, avatar initial
- Unselected: gray bg, dark text, avatar initial
- Creator pre-selected

### Photo Lightbox
- React portal overlay, dark background
- Current photo centered, max dimensions
- Left/right arrow buttons (keyboard: ArrowLeft, ArrowRight)
- Close button top-right (keyboard: Escape)
- Swipe support on mobile (stretch goal)
- Photo counter: "3 / 12"

### Toast Notifications
- Bottom-center
- "Run posted!" (success), "Something went wrong" (error)
- Auto-dismiss 4 seconds
- Tailwind animation, no library

### Skeleton Loading
- Feed: 3 skeleton cards with `animate-pulse`
- Run detail: skeleton header + photo grid placeholders
- My photos: skeleton grid

### Optimistic UI
- On "Post Run": immediately redirect to feed, show card with local photo previews
- On success: swap local URLs for R2 signed URLs
- On failure: show inline error with "Retry" button on the card
