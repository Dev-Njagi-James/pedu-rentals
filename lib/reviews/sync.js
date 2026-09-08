import { paymentsSupabase } from '@/lib/supabase/paymentsClient';

export async function recalculateListingRating(listing_id) {
  const { data, error } = await paymentsSupabase
    .from('reviews_table')
    .select('rating')
    .eq('listing_id', listing_id)
    .eq('status', 'visible');

  if (error) throw error;

  const count = data.length;
  const avg = count > 0
    ? Math.round((data.reduce((sum, r) => sum + r.rating, 0) / count) * 100) / 100
    : 0;

  const { error: updateError } = await paymentsSupabase
    .from('listings_table')
    .update({ avg_rating: avg, review_count: count })
    .eq('listing_id', listing_id);

  if (updateError) throw updateError;
}