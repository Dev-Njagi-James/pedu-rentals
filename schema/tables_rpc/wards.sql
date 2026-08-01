create table public.wards_table (
  ward_id bigint generated always as identity primary key,
  ward_name text not null unique
);