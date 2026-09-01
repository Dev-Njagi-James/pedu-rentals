// app/api/adminRo/settings/route.js

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';

// GET /api/adminRo/settings
// Returns all system settings as { mpesa_enabled: bool, edit_window_days: number }
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('system_settings')
      .select('action, value');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const settings = Object.fromEntries(data.map(row => [row.action, row.value]));

    return NextResponse.json({
      mpesa_enabled:    settings.mpesa_enabled    === 'true',
      edit_window_days: parseInt(settings.edit_window_days ?? '5', 10),
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/adminRo/settings
// Body: { action: 'mpesa_enabled' | 'edit_window_days', value: string }
export async function PATCH(req) {
  try {
    const { user, error, status } = await requireAuth();
    if (error) return NextResponse.json({ error }, { status });

    const supabase = await createServerSupabaseClient();

    const { action, value } = await req.json();

    const allowed = ['mpesa_enabled', 'edit_window_days'];
    if (!allowed.includes(action)) {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('system_settings')
      .update({ value: String(value) })
      .eq('action', action);

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    return NextResponse.json({ ok: true });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
