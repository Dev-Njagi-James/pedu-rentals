import { createServerSupabaseClient, createAdminClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminPanel from './components/AdminPanel';

export default async function AdminLand() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/Auth');

  const admin = createAdminClient();
  const { data } = await admin
    .from('Admin Table')
    .select('admin_id')
    .eq('lister_uuid', user.id)
    .single();

  if (!data) redirect('/User/Lister');

  return <AdminPanel />;
}