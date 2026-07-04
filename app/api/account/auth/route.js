import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, password } = await request.json();
  const errors = [];

  if (email && email.trim() !== user.email) {
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) errors.push(`Email: ${error.message}`);
  }

  if (password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) errors.push(`Password: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(' | ') }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}