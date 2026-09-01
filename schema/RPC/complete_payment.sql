create or replace function complete_payment(
  p_payment_id bigint,
  p_mpesa_receipt text,
  p_raw_callback jsonb
) returns void as
$$
declare
  v_listing_id bigint;
  v_plan_name text;
begin
  update payments_table
  set status = 'completed',
      mpesa_receipt = p_mpesa_receipt,
      raw_callback = p_raw_callback,
      updated_at = now()
  where payment_id = p_payment_id
  returning listing_id, plan_name into v_listing_id, v_plan_name;

  if not found then
    raise exception 'payments_table row % not found', p_payment_id;
  end if;

  insert into subscriptions_table (listing_id, plan_name, payment_id, status, expires_at)
  values (v_listing_id, v_plan_name, p_payment_id, 'active', now() + interval '30 days');

  update listings_table
  set payment_status = 'paid',
      plan_name = v_plan_name
  where listing_id = v_listing_id;
end;
$$ language plpgsql;