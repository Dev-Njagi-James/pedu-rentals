import { createClient } from '@supabase/supabase-js';

export const paymentsSupabase = createClient(
  process.env.PAYMENTS_SUPABASE_URL,
  process.env.PAYMENTS_SUPABASE_SERVICE_ROLE_KEY
);