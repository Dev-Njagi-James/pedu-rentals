-- =====================================================================
-- auth_legacy_verify_log — attempt accounting for the TEMPORARY legacy
-- credential recovery check (/api/v1/auth/legacy/verify).
--
-- PRIVACY: no passwords, no tokens, no plaintext usernames. The attempt_code
-- column stores either the resolved legacy UUID (already non-reversible to
-- username for outsiders) or a NULL for pre-resolution failures.
-- Run against the NEW Supabase project (PAYMENTS_SUPABASE_URL).
-- GENERATED ONLY in this task — not applied by any tooling here.
-- =====================================================================

create table if not exists public.auth_legacy_verify_log (
    log_id          bigint generated always as identity primary key,
    attempt_outcome text not null,
    -- unknown_user | bad_password | unconfirmed_email | rate_limited |
    -- verified_issued
    attempt_code    uuid,
    attempt_ip      text,
    created_at      timestamptz not null default now()
);

create index if not exists auth_legacy_verify_log_code_idx
    on public.auth_legacy_verify_log (attempt_code, created_at desc);
