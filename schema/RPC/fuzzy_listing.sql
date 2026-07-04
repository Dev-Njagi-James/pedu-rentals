CREATE OR REPLACE FUNCTION search_listings_fuzzy(p_query text)
RETURNS TABLE (
  listing_id        bigint,
  property_name     text,
  property_price    text,
  property_interior text,
  rent_duration     text,
  ward_name         text,
  ward_id           bigint,
  ward_location     text,
  property_location text,
  phone_number      bigint,
  media             json
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pl.listing_id,
    pl.property_name,
    pl.property_price,
    pl.property_interior,
    pl.rent_duration,
    pl.ward_name,
    pl.ward_id,
    pl.ward_location,
    pl.property_location,
    pl.phone_number,
    (
      SELECT json_agg(
        json_build_object(
          'image_url',            it.image_url,
          'cloudinary_url',       it.cloudinary_url,
          'cloudinary_public_id', it.cloudinary_public_id,
          'video_url',            it.video_url,
          'position',             it.position
        )
        ORDER BY it.position
      )
      FROM images_table it
      WHERE it.listing_id = pl.listing_id
    ) AS media
  FROM "Property_Listing" pl
  WHERE similarity(pl.property_name, p_query) > 0.1
  ORDER BY similarity(pl.property_name, p_query) DESC
  LIMIT 10;
$$;