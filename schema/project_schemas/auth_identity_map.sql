-- schema/project_schemas/auth_identity_map.sql
--
-- REFERENCE for the NEW-project (PAYMENTS_SUPABASE_*) `auth_identity_map` table.
--
-- NOTE: This table ALREADY EXISTS in the NEW Supabase project with the exact
-- structure below. Do NOT re-run this file. It is kept here as the canonical
-- schema reference so the resolver (lib/auth/identity.js) and future claim
-- tooling stay aligned with the live database.
--
-- Purpose
--   Maps a Clerk user (clerk_user_id) to the stable legacy application owner id
--   (legacy_user_id == users_table.lister_uuid). listings_table.lister_uuid and
--   payments_table.lister_uuid are NOT re-keyed; they keep referencing the
--   legacy users_table.lister_uuid throughout the migration.

create table public.auth_identity_map (
  mapping_id      bigint primary key,          -- already populated by the live DB
  legacy_user_id  uuid not null unique,        -- == users_table.lister_uuid
  clerk_user_id   text not null unique,
  legacy_username text null,
  legacy_email    text null,
  status          text not null,               -- pending | active | revoked | needs_review
  created_at      timestamptz,
  verified_at     timestamptz null,
  claimed_at      timestamptz null,
  updated_at      timestamptz
);