import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

export async function POST(request) {
   try {
      const secret = request.headers.get('x-webhook-secret');
      if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const payload = await request.json();
      const { type, table, record, old_record } = payload;

      if (![ 'INSERT', 'DELETE' ].includes(type)) {
         return NextResponse.json({ ok: true });
      }

      const supabase = createAdminClient();

      let notificationType = null;
      let title = null;
      let body = null;

      if (table === 'Listers_Info' && type === 'INSERT') {
         notificationType = 'new_account';
         title = 'New Account Created';
         body = {
            username: record.username ?? '—',
            organization: record.lister_org ?? '—',
            phone: record.lister_contact ?? '—',
            date: record.created_at,
         };
      }

      if (table === 'Listers_Info' && type === 'DELETE') {
         notificationType = 'account_deleted';
         title = 'Account Deleted';
         body = {
            username: old_record.username ?? '—',
            organization: old_record.lister_org ?? '—',
            phone: old_record.lister_contact ?? '—',
            date: new Date().toISOString(),
         };
      }

      if (table === 'Property_Listing' && type === 'INSERT') {
         notificationType = 'new_listing';
         title = 'New Listing Created';
         body = {
            property_name: record.property_name ?? '—',
            property_type: record.property_type_id ?? '—',
            category: record.category_id ?? '—',
            price: record.property_price ?? '—',
            date: record.created_at,
         };
      }

      if (table === 'Property_Listing' && type === 'DELETE') {
         notificationType = 'listing_deleted';
         title = 'Listing Deleted';
         body = {
            property_name: old_record.property_name ?? '—',
            property_type: old_record.property_type_id ?? '—',
            category: old_record.category_id ?? '—',
            price: old_record.property_price ?? '—',
            date: new Date().toISOString(),
         };
      }

      if (!notificationType) {
         return NextResponse.json({ ok: true });
      }

      const { error } = await supabase
         .from('notifications')
         .insert({ type: notificationType, title, body, read: false });

      if (error) {
         console.error('Notification insert error:', error.message);
         return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });

   } catch (err) {
      console.error('Webhook error:', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
   }
}