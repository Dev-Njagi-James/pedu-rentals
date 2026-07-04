CREATE OR REPLACE FUNCTION get_lister_analytics(p_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'totalViews',   COALESCE(SUM(pl.views), 0),
    'totalCalls',   COALESCE(SUM(pl.call_logs), 0),
    'totalReviews', COALESCE(SUM(sub.review_count), 0)
  )
  FROM "Property_Listing" pl
  LEFT JOIN (
    SELECT listing_id, COUNT(*) AS review_count
    FROM listing_reviews
    GROUP BY listing_id
  ) sub ON pl.listing_id = sub.listing_id
  WHERE pl.user_id = p_user_id;
$$;

NOTIFY pgrst, 'reload schema';