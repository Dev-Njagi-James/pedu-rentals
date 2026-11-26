-- subscription-expiry reminders
-- 1. table
create table subscription_reminders (
  id bigint generated always as identity primary key,
  subscription_id bigint not null references subscriptions_table(subscription_id) on delete cascade,
  kind text not null check (kind in ('3d','1d')),
  channel text not null check (channel in ('email','whatsapp')),
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts int not null default 0,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, kind, channel)
);
alter table subscription_reminders enable row level security;  -- no policies; service role only

-- 2. function get_reminder_candidates
create or replace function get_reminder_candidates(p_channel text default 'email')
returns table (
  subscription_id bigint,
  listing_id bigint,
  listing_name text,
  published_at timestamptz,
  expires_at timestamptz,
  plan_name text,
  lister_uuid uuid,
  lister_email text,
  clerk_user_id text,
  kind text
)
language sql
security definer
set search_path = public
as $$
  with latest as (
    select distinct on (s.listing_id)
      s.subscription_id,
      s.listing_id,
      s.expires_at
    from subscriptions_table s
    where s.status = 'active'
      and s.expires_at > now()
    order by s.listing_id, s.expires_at desc
  ),
  candidates as (
    select
      l.subscription_id,
      l.listing_id,
      l.listing_name,
      l.created_at as published_at,
      l.expires_at,
      l.plan_name,
      l.lister_uuid,
      u.lister_email,
      u.clerk_user_id,
      case
        when l.expires_at <= now() + interval '1 day' then '1d'
        else '3d'
      end as kind
    from latest l
    join listings_table lt on lt.listing_id = l.listing_id
    join users_table u on u.lister_uuid = lt.lister_uuid
    where lt.payment_status = 'paid'
      and lt.admin_unpublished_at is null
      and l.expires_at <= now() + interval '3 days'
  )
  select
    c.subscription_id,
    c.listing_id,
    c.listing_name,
    c.published_at,
    c.expires_at,
    c.plan_name,
    c.lister_uuid,
    c.lister_email,
    c.clerk_user_id,
    c.kind
  from candidates c
  where not exists (
    select 1 from subscription_reminders r
    where r.subscription_id = c.subscription_id
      and r.kind = c.kind
      and r.channel = p_channel
      and (
        r.status = 'sent'
        or r.attempts >= 3
        or (r.status = 'pending' and r.updated_at > now() - interval '1 hour')
      )
  );
$$;