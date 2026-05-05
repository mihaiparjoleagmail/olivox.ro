-- Run in Supabase SQL Editor (Project: olivox)
-- Creates the abandoned_carts table + indexes used by:
--   /api/orders/log-abandoned (public beacon)
--   /api/admin/abandoned-carts (admin GET/PATCH/DELETE)

CREATE TABLE IF NOT EXISTS abandoned_carts (
  id serial PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  customer_name text,
  customer_phone text,
  normalized_phone text,
  customer_email text,
  address text,
  product_id integer,
  product_name text,
  product_slug text,
  brand_name text,
  model_name text,
  snapshot jsonb,
  user_agent text,
  url text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_phone ON abandoned_carts (normalized_phone);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_last_seen ON abandoned_carts (last_seen_at DESC);
