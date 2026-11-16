-- GharKaam admin V1 controls. Additive only: no tables or user data are removed.
-- All admin mutations are SECURITY DEFINER RPCs with server-side role checks.

create index if not exists profiles_role_created_idx on public.profiles (role, created_at desc);

create or replace function public.admin_list_customers(
  p_search text default '',
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  display_name text,
  phone text,
  created_at timestamptz,
  bookings_count bigint,
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
  return query
    with matched as (
      select pr.id, pr.display_name, pr.phone, pr.created_at, count(b.id)::bigint as bookings_count
      from public.profiles pr
      left join public.bookings b on b.customer_id = pr.id
      where pr.role = 'customer'
        and (
          nullif(trim(coalesce(p_search, '')), '') is null
          or pr.display_name ilike '%' || trim(p_search) || '%'
          or coalesce(pr.phone, '') ilike '%' || trim(p_search) || '%'
          or pr.id::text ilike '%' || trim(p_search) || '%'
        )
      group by pr.id, pr.display_name, pr.phone, pr.created_at
    )
    select m.id, m.display_name, m.phone, m.created_at, m.bookings_count, count(*) over()::bigint
    from matched m
    order by m.created_at desc, m.id
    limit least(greatest(coalesce(p_limit, 100), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
revoke all on function public.admin_list_customers(text, integer, integer) from public, anon;
grant execute on function public.admin_list_customers(text, integer, integer) to authenticated;

create or replace function public.admin_assign_booking_provider(p_booking_id uuid, p_provider_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_booking public.bookings;
  v_provider public.providers;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Admin account required'; end if;
  select * into v_provider from public.providers where id = p_provider_id for update;
  if v_provider.id is null then raise exception 'Provider not found'; end if;
  if v_provider.verification_status <> 'approved' then raise exception 'Provider must be approved'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'Booking not found'; end if;
  if v_booking.status <> 'pending' or v_booking.provider_id is not null then
    raise exception 'Only unassigned pending bookings can be assigned';
  end if;
  if not (v_booking.service_category_id = any(v_provider.service_category_ids)) then
    raise exception 'Provider does not offer this service';
  end if;
  update public.bookings
    set provider_id = v_provider.id,
        provider_name = v_provider.full_name,
        status = 'accepted',
        updated_at = now()
    where id = p_booking_id
    returning * into v_booking;
  return v_booking;
end;
$$;
revoke all on function public.admin_assign_booking_provider(uuid, uuid) from public, anon;
grant execute on function public.admin_assign_booking_provider(uuid, uuid) to authenticated;

create or replace function public.admin_save_service_category(
  p_id text,
  p_name_en text,
  p_name_ur text,
  p_icon text,
  p_is_active boolean default true,
  p_sort_order integer default 0,
  p_is_update boolean default false
)
returns public.service_categories
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_category public.service_categories;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Admin account required'; end if;
  if p_id is null or p_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_id) > 48 then raise exception 'Use a lowercase service ID with letters, numbers, and hyphens'; end if;
  if nullif(trim(coalesce(p_name_en, '')), '') is null or nullif(trim(coalesce(p_name_ur, '')), '') is null then raise exception 'Both English and Urdu names are required'; end if;
  if nullif(trim(coalesce(p_icon, '')), '') is null or length(p_icon) > 40 then raise exception 'A valid icon name is required'; end if;
  if coalesce(p_is_update, false) then
    update public.service_categories set name_en = trim(p_name_en), name_ur = trim(p_name_ur), icon = trim(p_icon),
      is_active = coalesce(p_is_active, true), sort_order = coalesce(p_sort_order, 0)
      where id = p_id returning * into v_category;
    if v_category.id is null then raise exception 'Service category not found'; end if;
  else
    insert into public.service_categories (id, name_en, name_ur, icon, is_active, sort_order)
    values (p_id, trim(p_name_en), trim(p_name_ur), trim(p_icon), coalesce(p_is_active, true), coalesce(p_sort_order, 0))
    returning * into v_category;
  end if;
  return v_category;
end;
$$;
revoke all on function public.admin_save_service_category(text, text, text, text, boolean, integer, boolean) from public, anon;
grant execute on function public.admin_save_service_category(text, text, text, text, boolean, integer, boolean) to authenticated;

create or replace function public.admin_save_service_subtype(
  p_id text,
  p_category_id text,
  p_name_en text,
  p_name_ur text,
  p_starting_price_pkr integer,
  p_is_active boolean default true,
  p_sort_order integer default 0,
  p_is_update boolean default false
)
returns public.service_subtypes
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_subtype public.service_subtypes;
  v_existing_category text;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Admin account required'; end if;
  if p_id is null or p_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_id) > 64 then raise exception 'Use a lowercase service-type ID with letters, numbers, and hyphens'; end if;
  if nullif(trim(coalesce(p_name_en, '')), '') is null or nullif(trim(coalesce(p_name_ur, '')), '') is null then raise exception 'Both English and Urdu names are required'; end if;
  if p_starting_price_pkr is null or p_starting_price_pkr < 0 then raise exception 'Starting price must be zero or higher'; end if;
  if not exists (select 1 from public.service_categories where id = p_category_id) then raise exception 'Service category not found'; end if;
  select category_id into v_existing_category from public.service_subtypes where id = p_id;
  if coalesce(p_is_update, false) then
    if v_existing_category is null then raise exception 'Service type not found'; end if;
    if v_existing_category <> p_category_id then raise exception 'An existing service type cannot be moved to another category'; end if;
    update public.service_subtypes set name_en = trim(p_name_en), name_ur = trim(p_name_ur),
      starting_price_pkr = p_starting_price_pkr, is_active = coalesce(p_is_active, true), sort_order = coalesce(p_sort_order, 0)
      where id = p_id returning * into v_subtype;
  else
    if v_existing_category is not null then raise exception 'Service type ID already exists'; end if;
    insert into public.service_subtypes (id, category_id, name_en, name_ur, starting_price_pkr, is_active, sort_order)
    values (p_id, p_category_id, trim(p_name_en), trim(p_name_ur), p_starting_price_pkr, coalesce(p_is_active, true), coalesce(p_sort_order, 0))
    returning * into v_subtype;
  end if;
  return v_subtype;
end;
$$;
revoke all on function public.admin_save_service_subtype(text, text, text, text, integer, boolean, integer, boolean) from public, anon;
grant execute on function public.admin_save_service_subtype(text, text, text, text, integer, boolean, integer, boolean) to authenticated;

create or replace function public.admin_set_subtype_active(p_subtype_id text, p_is_active boolean)
returns public.service_subtypes
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_subtype public.service_subtypes;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Admin account required'; end if;
  update public.service_subtypes set is_active = p_is_active where id = p_subtype_id returning * into v_subtype;
  if v_subtype.id is null then raise exception 'Service type not found'; end if;
  return v_subtype;
end;
$$;
revoke all on function public.admin_set_subtype_active(text, boolean) from public, anon;
grant execute on function public.admin_set_subtype_active(text, boolean) to authenticated;

create or replace function public.admin_save_promo(
  p_code text,
  p_title_en text,
  p_title_ur text,
  p_discount_percent integer,
  p_active boolean default true,
  p_expires_at timestamptz default null,
  p_usage_limit integer default null,
  p_is_update boolean default false
)
returns public.promo_codes
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_promo public.promo_codes;
  v_usage_count bigint;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Admin account required'; end if;
  if v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' then raise exception 'Promo codes must be 3–32 letters, numbers, hyphens, or underscores'; end if;
  if nullif(trim(coalesce(p_title_en, '')), '') is null or nullif(trim(coalesce(p_title_ur, '')), '') is null then raise exception 'Both English and Urdu offer titles are required'; end if;
  if p_discount_percent is null or p_discount_percent < 1 or p_discount_percent > 100 then raise exception 'Discount must be between 1 and 100 percent'; end if;
  if p_usage_limit is not null and p_usage_limit < 1 then raise exception 'Use a positive usage limit or leave it empty'; end if;
  if coalesce(p_active, true) and p_expires_at is not null and p_expires_at <= now() then raise exception 'An active offer must expire in the future'; end if;
  if coalesce(p_is_update, false) then
    select * into v_promo from public.promo_codes where code = v_code for update;
    if v_promo.code is null then raise exception 'Offer not found'; end if;
    select count(*) into v_usage_count from public.bookings where promo_code = v_code;
    if p_usage_limit is not null and p_usage_limit < v_usage_count then
      raise exception 'Usage limit cannot be lower than the number of bookings already created with this offer';
    end if;
    update public.promo_codes set
      title_en = trim(p_title_en),
      title_ur = trim(p_title_ur),
      discount_percent = p_discount_percent,
      active = coalesce(p_active, true),
      expires_at = p_expires_at,
      usage_limit = p_usage_limit
    where code = v_code returning * into v_promo;
  else
    insert into public.promo_codes (code, title_en, title_ur, discount_percent, active, expires_at, usage_limit)
    values (v_code, trim(p_title_en), trim(p_title_ur), p_discount_percent, coalesce(p_active, true), p_expires_at, p_usage_limit)
    returning * into v_promo;
  end if;
  return v_promo;
end;
$$;
revoke all on function public.admin_save_promo(text, text, text, integer, boolean, timestamptz, integer, boolean) from public, anon;
grant execute on function public.admin_save_promo(text, text, text, integer, boolean, timestamptz, integer, boolean) to authenticated;

-- These changes are only available through the guarded RPCs above, not direct client table writes.
revoke insert, update, delete on public.service_categories, public.service_subtypes, public.promo_codes from public, anon, authenticated;
grant select on public.service_categories, public.service_subtypes, public.promo_codes to authenticated;

-- Policy: every booking created with an offer consumes one use, including bookings later cancelled.
-- Enforce global limits under a promo-row lock so concurrent bookings cannot exceed the cap.
create or replace function public.customer_create_booking(
  p_service_category_id text,
  p_subtype_id text,
  p_description text,
  p_service_address text,
  p_scheduled_at timestamptz,
  p_payment_method text,
  p_promo_code text default null,
  p_preferred_provider_name text default ''
)
returns public.bookings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_booking public.bookings;
  v_price integer;
  v_discount integer := 0;
  v_promo text;
  v_customer_name text;
  v_usage_limit integer;
  v_usage_count bigint;
begin
  if auth.uid() is null or public.current_app_role() is distinct from 'customer' then raise exception 'Customer account required'; end if;
  if p_payment_method not in ('cash', 'wallet_demo', 'bank_demo') then raise exception 'Unsupported demo payment method'; end if;
  if p_scheduled_at <= now() then raise exception 'Choose a future service time'; end if;
  if nullif(trim(coalesce(p_service_address, '')), '') is null then raise exception 'Service address is required'; end if;
  select s.starting_price_pkr into v_price
    from public.service_subtypes s join public.service_categories c on c.id = s.category_id
    where s.id = p_subtype_id and s.category_id = p_service_category_id and s.is_active and c.is_active;
  if v_price is null then raise exception 'Service type is unavailable'; end if;
  if nullif(trim(coalesce(p_promo_code, '')), '') is not null then
    select code, discount_percent, usage_limit into v_promo, v_discount, v_usage_limit
      from public.promo_codes
      where upper(code) = upper(trim(p_promo_code)) and active and (expires_at is null or expires_at > now())
      for update;
    if v_promo is null then raise exception 'Promo code is invalid or expired'; end if;
    if v_usage_limit is not null then
      select count(*) into v_usage_count from public.bookings where promo_code = v_promo;
      if v_usage_count >= v_usage_limit then raise exception 'Promo code usage limit reached'; end if;
    end if;
    v_price := floor(v_price * (100 - v_discount) / 100.0);
  end if;
  select display_name into v_customer_name from public.profiles where id = auth.uid();
  insert into public.bookings (
    customer_id, service_category_id, subtype_id, status, description, service_address, scheduled_at,
    payment_method, promo_code, estimated_price_pkr, customer_name, provider_name, preferred_provider_name
  ) values (
    auth.uid(), p_service_category_id, p_subtype_id, 'pending', coalesce(trim(p_description), ''), trim(p_service_address), p_scheduled_at,
    p_payment_method, v_promo, v_price, coalesce(v_customer_name, ''), '', coalesce(trim(p_preferred_provider_name), '')
  ) returning * into v_booking;
  return v_booking;
end;
$$;
revoke all on function public.customer_create_booking(text, text, text, text, timestamptz, text, text, text) from public, anon;
grant execute on function public.customer_create_booking(text, text, text, text, timestamptz, text, text, text) to authenticated;
