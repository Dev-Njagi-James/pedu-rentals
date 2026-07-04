create extension if not exists pg_trgm;
create index if not exists idx_property_name_trgm 
on "Property_Listing" using gin(property_name gin_trgm_ops);