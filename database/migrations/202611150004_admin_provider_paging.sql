-- GharKaam admin V1 follow-up: page and search the complete provider directory.
-- The overview remains a small recent snapshot; lifecycle actions use this guarded RPC.

create index if not exists providers_created_id_idx on public.providers (created_at desc, id);

create or replace function public.admin_list_providers(
  p_search text default '',
  p_status text default 'all',
  p_category_id text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  full_name text,
  phone text,
  service_area text,
  category_ids text[],
  years_experience integer,
  verification_status text,
  rating numeric,
  review_count integer,
  completed_jobs integer,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'Admin account required';
  end if;
  if coalesce(p_status, 'all') not in ('all', 'pending', 'approved', 'suspended') then
    raise exception 'Unsupported provider status filter';
  end if;
  return query
    with matched as (
      select p.id, p.full_name, p.phone, p.service_area, p.service_category_ids, p.years_experience,
        p.verification_status, p.rating, p.review_count, p.completed_jobs, p.created_at
      from public.providers p
      where (coalesce(p_status, 'all') = 'all' or p.verification_status = p_status)
        and (p_category_id is null or p_category_id = any(p.service_category_ids))
        and (
          nullif(trim(coalesce(p_search, '')), '') is null
          or p.full_name ilike '%' || trim(p_search) || '%'
          or coalesce(p.phone, '') ilike '%' || trim(p_search) || '%'
          or p.service_area ilike '%' || trim(p_search) || '%'
          or exists (
            select 1
            from unnest(p.service_category_ids) as provider_category(category_id)
            join public.service_categories sc on sc.id = provider_category.category_id
            where sc.name_en ilike '%' || trim(p_search) || '%'
               or sc.name_ur ilike '%' || trim(p_search) || '%'
          )
        )
    )
    select m.id, m.full_name, m.phone, m.service_area, m.service_category_ids, m.years_experience,
      m.verification_status, m.rating, m.review_count, m.completed_jobs, m.created_at, count(*) over()::bigint
    from matched m
    order by m.created_at desc, m.id
    limit least(greatest(coalesce(p_limit, 100), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
revoke all on function public.admin_list_providers(text, text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_providers(text, text, text, integer, integer) to authenticated;
