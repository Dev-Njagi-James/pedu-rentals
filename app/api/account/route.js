import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('Listers_Info')
    .select('username, lister_email, lister_contact, lister_org, lister_ward')
    .eq('lister_UUID', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    username:         data.username,
    email:            data.lister_email,
    contact:          data.lister_contact,
    organisationName: data.lister_org,
    ward:             data.lister_ward,
  });
}