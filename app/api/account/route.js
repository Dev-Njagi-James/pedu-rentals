import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';

export async function GET() {
  const { user, error, status } = await requireAuth();
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const supabase = await createServerSupabaseClient();

  const { data, error: dbError } = await supabase
    .from('Listers_Info')
    .select('username, lister_email, lister_contact, lister_org, lister_ward')
    .eq('lister_UUID', user.id)
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({
    username:         data.username,
    email:            data.lister_email,
    contact:          data.lister_contact,
    organisationName: data.lister_org,
    ward:             data.lister_ward,
  });
}