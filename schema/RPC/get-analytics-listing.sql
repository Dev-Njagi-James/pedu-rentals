DROP FUNCTION IF EXISTS get_analytics_listings(uuid);

CREATE FUNCTION get_analytics_listings(p_user_id uuid)
RETURNS TABLE (
  listing_id    bigint,
  property_name text,
  views         bigint,
  call_logs     bigint,
  avg_rating    numeric,
  review_count  bigint,
  image_url     text,
  ward_name     text,
  ward_location text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pl.listing_id,
    pl.property_name,
    pl.views,
    pl.call_logs,
    COALESCE(ROUND(AVG(lr.rating)::numeric, 1), 0) AS avg_rating,
    COUNT(lr.review_id)::bigint                     AS review_count,
    MIN(it.image_url)                               AS image_url,
    w.ward_name,
    pl.ward_location
  FROM "Property_Listing" pl
  LEFT JOIN wards_table w      ON pl.ward_id    = w.ward_id
  LEFT JOIN images_table it    ON pl.listing_id = it.listing_id
  LEFT JOIN listing_reviews lr ON pl.listing_id = lr.listing_id
  WHERE pl.user_id = p_user_id
  GROUP BY
    pl.listing_id,
    pl.property_name,
    pl.views,
    pl.call_logs,
    w.ward_name,
    pl.ward_location
  ORDER BY pl.listing_id DESC;
$$;

NOTIFY pgrst, 'reload schema';