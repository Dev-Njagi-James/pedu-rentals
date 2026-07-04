CREATE OR REPLACE FUNCTION get_listings_paginated(
    p_limit integer,
    p_offset integer,
    p_ward_id bigint DEFAULT NULL,
    p_category_id bigint DEFAULT NULL,
    p_type_ids bigint [] DEFAULT NULL,
    p_price_range text DEFAULT NULL,
    p_rent_duration text DEFAULT NULL,
    p_property_interior text DEFAULT NULL,
    p_listing_id bigint DEFAULT NULL
  ) RETURNS TABLE (
    listing_id bigint,
    property_name text,
    property_price text,
    rent_duration text,
    property_interior text,
    description text,
    phone_number bigint,
    category_name text,
    type_name text,
    ward_name text,
    ward_id bigint,
    ward_location text,
    property_location text,
    created_at timestamptz,
    views bigint,
    avg_rating numeric,
    review_count bigint,
    media json
  ) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$ WITH approx_count AS (
    SELECT reltuples::bigint AS total
    FROM pg_class
    WHERE relname = 'Property_Listing'
  ),
  decay_config AS (
    SELECT CASE
        WHEN total < 50 THEN 0.3
        WHEN total < 200 THEN 0.5
        WHEN total < 500 THEN 0.7
        ELSE 1.0
      END AS decay_factor
    FROM approx_count
  ),
  filtered_ids AS (
    SELECT pl.listing_id
    FROM "Property_Listing" pl
    WHERE (
        p_listing_id IS NULL
        OR pl.listing_id = p_listing_id
      )
      AND (
        p_ward_id IS NULL
        OR pl.ward_id = p_ward_id
      )
      AND (
        p_category_id IS NULL
        OR pl.category_id = p_category_id
      )
      AND (
        p_type_ids IS NULL
        OR pl.property_type_id = ANY(p_type_ids)
      )
      AND (
        p_rent_duration IS NULL
        OR pl.rent_duration = p_rent_duration
      )
      AND (
        p_property_interior IS NULL
        OR LOWER(pl.property_interior) = LOWER(p_property_interior)
      )
      AND (
        p_price_range IS NULL
        OR CASE
          p_price_range
          WHEN 'below_2000' THEN pl.property_price::numeric <= 2000
          WHEN '2000_4000' THEN pl.property_price::numeric > 2000
          AND pl.property_price::numeric <= 4000
          WHEN '5000_8000' THEN pl.property_price::numeric > 5000
          AND pl.property_price::numeric <= 8000
          WHEN '9000_12000' THEN pl.property_price::numeric > 9000
          AND pl.property_price::numeric <= 12000
          WHEN '13000_20000' THEN pl.property_price::numeric > 13000
          AND pl.property_price::numeric <= 20000
          WHEN 'above_20000' THEN pl.property_price::numeric > 20000
          ELSE TRUE
        END
      )
  ),
  review_stats AS (
    SELECT lr.listing_id,
      ROUND(AVG(lr.rating)::numeric, 2) AS avg_rating,
      COUNT(*)::bigint AS review_count
    FROM listing_reviews lr
    WHERE lr.listing_id IN (
        SELECT listing_id
        FROM filtered_ids
      )
    GROUP BY lr.listing_id
  ),
  scored AS (
    SELECT pl.listing_id,
      pl.property_name,
      pl.property_price,
      pl.rent_duration,
      pl.property_interior,
      pl.description,
      pl.phone_number,
      pc.category_name,
      pt.type_name,
      w.ward_name,
      w.ward_id,
      pl.ward_location,
      pl.property_location,
      pl.created_at,
      pl.views,
      COALESCE(rs.avg_rating, 0) AS avg_rating,
      COALESCE(rs.review_count, 0) AS review_count,
      json_agg(
        json_build_object(
          'image_url',
          it.image_url,
          'cloudinary_url',
          it.cloudinary_url,
          'cloudinary_public_id',
          it.cloudinary_public_id,
          'video_url',
          it.video_url,
          'position',
          it.position
        )
        ORDER BY it.position
      ) FILTER (
        WHERE it.image_id IS NOT NULL
      ) AS media,
      (
        0.7 * pl.views + 0.3 * COALESCE(rs.avg_rating, 0) * COALESCE(rs.review_count, 0)
      ) / POWER(
        1 + EXTRACT(
          EPOCH
          FROM (NOW() - pl.created_at)
        ) / 3600.0,
        (
          SELECT decay_factor
          FROM decay_config
        )
      ) AS score
    FROM "Property_Listing" pl
      INNER JOIN filtered_ids fi ON pl.listing_id = fi.listing_id
      LEFT JOIN property_categories pc ON pl.category_id = pc.category_id
      LEFT JOIN property_types pt ON pl.property_type_id = pt.type_id
      LEFT JOIN wards_table w ON pl.ward_id = w.ward_id
      LEFT JOIN images_table it ON pl.listing_id = it.listing_id
      LEFT JOIN review_stats rs ON pl.listing_id = rs.listing_id
    GROUP BY pl.listing_id,
      pc.category_name,
      pt.type_name,
      w.ward_name,
      w.ward_id,
      pl.ward_location,
      rs.avg_rating,
      rs.review_count
  ),
  tiered AS (
    SELECT *,
      NTILE(10) OVER (
        ORDER BY score DESC
      ) AS decile
    FROM scored
  )
SELECT listing_id,
  property_name,
  property_price,
  rent_duration,
  property_interior,
  description,
  phone_number,
  category_name,
  type_name,
  ward_name,
  ward_id,
  ward_location,
  property_location,
  created_at,
  views,
  avg_rating,
  review_count,
  media
FROM tiered
ORDER BY CASE
    WHEN decile <= 2 THEN 1
    WHEN decile <= 5 THEN 2
    ELSE 3
  END,
  random()
LIMIT p_limit OFFSET p_offset;
$$;