// Legacy category_id -> v1 categories_table.category_name
// Confirmed complete, 6/6 categories mapped.
export const CATEGORY_ID_TO_V1_NAME = {
  1: 'Rentals',
  2: 'Airbnbs',
  3: 'Commercial Apartments',
  4: 'Lodgings',
  5: 'Private Houses and Homes',
  7: 'Penthouses',
};

// Legacy property_type_id -> v1 category_types_table.category_type_name
// null = not yet seeded in v1 category_types_table. Update this file when seeded —
// no route code change needed once the real string is known.
export const TYPE_ID_TO_V1_NAME = {
  // Airbnbs
  26: '4 - Bedroom',
  8: null,
  9: null,
  10: null,
  11: null,

  // Commercial Spaces -> Commercial Apartments
  16: 'Co-Working Space',
  15: 'Industrial Unit',
  12: 'Office Spaces',
  13: 'Rental Shop',
  14: 'Warehouse',

  // Lodgings
  19: null,
  18: null,
  17: null,
  20: null,

  // Private Houses and Homes
  21: 'Burgulow',
  25: 'Cottage',
  24: 'Duplex',
  22: 'Townwhouse',
  23: 'Villa Mansion',

  // Rental Apartments -> Rentals
  2: '1 -Bedroom',
  3: '2 - Bedroom',
  4: '3 -Bedroom',
  1: 'Bedsitter',
  30: 'Single ',
};

// Legacy rent_duration/property_interior values -> v1 listings_table strings.
// Confirmed from live data: v1 stores Title Case with spaces, frontend sends
// lowercase-hyphenated. 'Short Term'/'Furnished' inferred by pattern from a
// single confirmed sample ('Long Term'/'Unfurnished') — verify against full
// distinct-value query if filters still don't match after this ships.
export const RENT_DURATION_TO_V1 = {
  'short-term': 'Short Term',
  'long-term': 'Long Term',
};

export const FURNISHING_TO_V1 = {
  furnished: 'Furnished',
  unfurnished: 'Unfurnished',
};

// Legacy price_range bucket strings -> numeric bounds. Two buckets have no
// numeric prefix (below_2000, above_20000) — generic string-split parsing
// silently failed on these; explicit map required.
export const PRICE_BUCKET_RANGES = {
  below_2000:    { min: null, max: 2000 },
  '2000_4000':   { min: 2000, max: 4000 },
  '5000_8000':   { min: 5000, max: 8000 },
  '9000_12000':  { min: 9000, max: 12000 },
  '13000_20000': { min: 13000, max: 20000 },
  above_20000:   { min: 20000, max: null },
};