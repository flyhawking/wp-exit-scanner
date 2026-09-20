-- wpexit.dev — Cloudflare D1 schema
-- Apply locally:  npx wrangler d1 execute wpexit --local  --file=schema.sql
-- Apply to prod:  npx wrangler d1 execute wpexit --remote --file=schema.sql

-- One row per scan. Powers the public aggregate numbers ("N sites scanned,
-- X% can migrate today, top blocker: Elementor").
CREATE TABLE IF NOT EXISTS scans (
  id          TEXT PRIMARY KEY,
  host        TEXT NOT NULL,
  score       INTEGER NOT NULL,
  light       TEXT NOT NULL,
  path        TEXT NOT NULL,
  builders    TEXT,
  cpt_count   INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scans_created ON scans (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_path ON scans (path);

-- Waitlist signups. Report link is kept so we can send the migration report
-- and know which report converted.
CREATE TABLE IF NOT EXISTS waitlist (
  email       TEXT PRIMARY KEY,
  report_id   TEXT,
  score       INTEGER,
  path        TEXT,
  created_at  INTEGER NOT NULL
);
