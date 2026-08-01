create table public.ward_id_mapping (
  old_ward_id bigint not null,
  new_ward_id bigint not null,
  ward_name text not null,
  primary key (old_ward_id, new_ward_id)
);

insert into public.ward_id_mapping (old_ward_id, new_ward_id, ward_name)
values (106, 200, 'Ruiru');