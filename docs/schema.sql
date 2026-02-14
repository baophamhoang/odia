-- Odia Database Schema
-- Run this in your Supabase SQL Editor to set up all tables

-- Whitelist of allowed emails
CREATE TABLE allowed_emails (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  added_by   UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (created on first Google SSO login)
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK after users table exists
ALTER TABLE allowed_emails
  ADD CONSTRAINT fk_allowed_emails_added_by
  FOREIGN KEY (added_by) REFERENCES users(id);

-- Run posts
CREATE TABLE runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date    DATE NOT NULL,
  title       TEXT,
  description TEXT,
  location    TEXT,
  hashtags    TEXT[] DEFAULT '{}',
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_runs_date ON runs(run_date DESC);
CREATE INDEX idx_runs_created_by ON runs(created_by);

-- Run participants (many-to-many)
CREATE TABLE run_participants (
  run_id  UUID REFERENCES runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (run_id, user_id)
);

CREATE INDEX idx_run_participants_user ON run_participants(user_id);

-- Photos
CREATE TABLE photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID REFERENCES runs(id) ON DELETE CASCADE,
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

-- Seed your team's emails (update these!)
-- INSERT INTO allowed_emails (email) VALUES
--   ('teammate1@gmail.com'),
--   ('teammate2@gmail.com'),
--   ('teammate3@gmail.com');
