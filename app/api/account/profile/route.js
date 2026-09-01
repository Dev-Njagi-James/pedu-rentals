import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';

export async function PATCH(request) {
  const { user, error, status } = await requireAuth();
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const supabase = await createServerSupabaseClient();

  const { username, contact, organisationName, ward } = await request.json();

  const { data: current, error: fetchError } = await supabase
    .from('Listers_Info')
    .select('username, lister_contact, lister_org, lister_ward')
    .eq('lister_UUID', user.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const update = {};

  if (username && username.trim() !== current.username)
    update.username = username.trim();

  if (contact && contact.trim() !== current.lister_contact)
    update.lister_contact = contact.trim();

  if (organisationName && organisationName.trim() !== current.lister_org)
    update.lister_org = organisationName.trim();

  if (ward && ward.trim() !== current.lister_ward)
    update.lister_ward = ward.trim();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: true, changed: false });
  }

  const { error: updateError } = await supabase
    .from('Listers_Info')
    .update(update)
    .eq('lister_UUID', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, changed: true });
}