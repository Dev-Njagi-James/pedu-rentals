create or replace function notify_new_listing()
returns trigger language plpgsql as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'Property_Listing',
    'record', row_to_json(NEW)::jsonb
  );
  perform net.http_post(
    url := 'https://www.pedurentals.com/api/webhooks/notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '@Testing!125Notificationsadmin34569'
    )::jsonb,
    body := payload
  );
  return NEW;
end;
$$;

create or replace function notify_listing_deleted()
returns trigger language plpgsql as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', 'DELETE',
    'table', 'Property_Listing',
    'old_record', row_to_json(OLD)::jsonb
  );
  perform net.http_post(
    url := 'https://www.pedurentals.com/api/webhooks/notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '@Testing!125Notificationsadmin34569'
    )::jsonb,
    body := payload
  );
  return OLD;
end;
$$;

create or replace function notify_new_account()
returns trigger language plpgsql as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'Listers_Info',
    'record', row_to_json(NEW)::jsonb
  );
  perform net.http_post(
    url := 'https://www.pedurentals.com/api/webhooks/notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '@Testing!125Notificationsadmin34569'
    )::jsonb,
    body := payload
  );
  return NEW;
end;
$$;

create or replace function notify_account_deleted()
returns trigger language plpgsql as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', 'DELETE',
    'table', 'Listers_Info',
    'old_record', row_to_json(OLD)::jsonb
  );
  perform net.http_post(
    url := 'https://www.pedurentals.com/api/webhooks/notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '@Testing!125Notificationsadmin34569'
    )::jsonb,
    body := payload
  );
  return OLD;
end;
$$;