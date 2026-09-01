import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';

export async function PATCH(request) {
  const { user, error, status } = await requireAuth();
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const supabase = await createServerSupabaseClient();

  const { email, password } = await request.json();
  const errors = [];

  if (email && email.trim() !== user.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
    if (emailError) errors.push(`Email: ${emailError.message}`);
  }

  if (password) {
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) errors.push(`Password: ${passwordError.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(' | ') }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}