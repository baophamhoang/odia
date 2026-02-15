# Odia — Environment Variables Setup Guide

This guide walks through creating every credential needed for `.env.local` (development) and Vercel (production).

---

## 1. AUTH_SECRET

A random string used by NextAuth v5 to sign cookies and JWTs.

### Local
```bash
openssl rand -base64 32
```
Copy the output into `.env.local`:
```
AUTH_SECRET=<paste here>
```

### Production
Generate a **different** secret for production:
```bash
openssl rand -base64 32
```
Add it to your Vercel project: **Settings → Environment Variables → `AUTH_SECRET`**

---

## 2. NEXTAUTH_URL

The base URL of your app.

### Local
```
NEXTAUTH_URL=http://localhost:3000
```

### Production
```
NEXTAUTH_URL=https://your-domain.com
```
On Vercel, this is automatically set to your deployment URL. You only need to set it manually if you're using a custom domain.

---

## 3. Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

### Step-by-step

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
   - Click the project dropdown at the top → **New Project** → name it "Odia" → **Create**
3. Enable the Google+ API (optional but recommended):
   - **APIs & Services → Library** → search "Google+ API" → **Enable**
4. Configure the OAuth consent screen:
   - **APIs & Services → OAuth consent screen**
   - Choose **External** (unless you have a Google Workspace org)
   - Fill in:
     - App name: `Odia`
     - User support email: your email
     - Developer contact email: your email
   - Click **Save and Continue** through Scopes (defaults are fine)
   - Add your team's emails as **Test users** (required while in "Testing" publishing status)
   - Click **Save and Continue** → **Back to Dashboard**
5. Create OAuth credentials:
   - **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - Name: `Odia Web`
   - Authorized JavaScript origins:
     - `http://localhost:3000` (local)
     - `https://your-domain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (local)
     - `https://your-domain.com/api/auth/callback/google` (production)
   - Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Local
```
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
```

### Production
Add both to Vercel: **Settings → Environment Variables**

> **Note:** While your OAuth app is in "Testing" status, only emails listed as Test Users can sign in. To allow anyone (still gated by your `allowed_emails` table), publish the app: **OAuth consent screen → Publishing status → Publish App**.

---

## 4. Supabase (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

### Step-by-step

1. Go to [supabase.com](https://supabase.com) and sign in (GitHub login works)
2. Click **New Project**
   - Organization: your org (create one if needed)
   - Project name: `odia`
   - Database password: generate a strong one and save it
   - Region: pick the closest to your team
   - Click **Create new project** (takes ~2 minutes)
3. Once ready, go to **Settings → API**:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **Service role key** (under "Project API keys") → this is `SUPABASE_SERVICE_ROLE_KEY`
     - ⚠️ This key bypasses Row Level Security. Never expose it client-side.
4. Run the database schema:
   - Go to **SQL Editor** (left sidebar)
   - Click **New query**
   - Paste the contents of `docs/schema.sql`
   - Click **Run**
5. Seed your team's emails:
   ```sql
   INSERT INTO allowed_emails (email) VALUES
     ('you@gmail.com'),
     ('teammate1@gmail.com'),
     ('teammate2@gmail.com');
   ```

### Local
```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### Production
Use the **same** Supabase project for both local and production (free tier is fine for a small team). Add both env vars to Vercel.

If you want separate dev/prod databases, create two Supabase projects and use different env vars per Vercel environment (Preview vs Production).

---

## 5. Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL)

### Step-by-step

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) and sign in
2. Find your **Account ID**:
   - It's in the URL: `https://dash.cloudflare.com/<ACCOUNT_ID>`
   - Or go to any domain → **Overview** → right sidebar → **Account ID**
3. Create an R2 bucket:
   - Left sidebar → **R2 Object Storage**
   - Click **Create bucket**
   - Name: `odia-photos`
   - Location: **Automatic** (or pick a region)
   - Click **Create bucket**
4. (Optional) Set up public access for the bucket:
   - Click into `odia-photos` bucket → **Settings**
   - Under **Public access**, enable it if you want a public URL
   - Or connect a **Custom Domain** (e.g., `photos.yourdomain.com`)
   - The public URL will be something like `https://pub-xxxx.r2.dev`
   - If you skip this, the app will use presigned URLs for reads (works fine, just slower)
5. Create an API token:
   - Go to **R2 Object Storage** → **Manage R2 API Tokens** (top right)
   - Click **Create API token**
   - Token name: `odia-app`
   - Permissions: **Object Read & Write**
   - Specify bucket: select `odia-photos`
   - TTL: leave as no expiration (or set one if you prefer)
   - Click **Create API Token**
   - **Copy immediately** — you won't see the secret again:
     - **Access Key ID** → `R2_ACCESS_KEY_ID`
     - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

### CORS Configuration

For direct browser uploads via presigned URLs, you need to set CORS on the bucket:

1. Click into `odia-photos` bucket → **Settings** → **CORS Policy**
2. Add this rule:
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. Click **Save**

### Local
```
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0
R2_ACCESS_KEY_ID=abc123def456
R2_SECRET_ACCESS_KEY=secret-key-here
R2_BUCKET_NAME=odia-photos
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

### Production
Same bucket and credentials work for both local and production. Add all 5 env vars to Vercel.

---

## Complete `.env.local` Template

```bash
# Auth
AUTH_SECRET=              # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=         # from step 3
GOOGLE_CLIENT_SECRET=     # from step 3

# Supabase
NEXT_PUBLIC_SUPABASE_URL= # from step 4
SUPABASE_SERVICE_ROLE_KEY=# from step 4

# Cloudflare R2
R2_ACCOUNT_ID=            # from step 5
R2_ACCESS_KEY_ID=         # from step 5
R2_SECRET_ACCESS_KEY=     # from step 5
R2_BUCKET_NAME=odia-photos
R2_PUBLIC_URL=            # from step 5 (optional)
```

---

## Production Deployment (Vercel)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Import Project** → select your repo
3. Add all environment variables from above in **Settings → Environment Variables**
   - Use a **different** `AUTH_SECRET` for production
   - Update `NEXTAUTH_URL` to your production URL
4. Update Google OAuth redirect URIs to include your production URL
5. Update R2 CORS to include your production URL
6. Deploy

---

## Checklist

| Step | Service | Done? |
|------|---------|-------|
| 1 | Generate `AUTH_SECRET` | |
| 2 | Create Google OAuth credentials | |
| 3 | Add localhost + prod redirect URIs in Google Console | |
| 4 | Create Supabase project | |
| 5 | Run `docs/schema.sql` in Supabase SQL Editor | |
| 6 | Seed `allowed_emails` with team emails | |
| 7 | Create Cloudflare R2 bucket `odia-photos` | |
| 8 | Create R2 API token | |
| 9 | Set CORS on R2 bucket | |
| 10 | Fill in `.env.local` | |
| 11 | Run `npm run dev` and test login | |
| 12 | Deploy to Vercel with production env vars | |
