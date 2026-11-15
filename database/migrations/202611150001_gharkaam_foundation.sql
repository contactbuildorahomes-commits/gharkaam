-- GharKaam foundation schema — Supabase/Postgres.
-- Only customer/provider roles can be introduced by public signup; admin is granted through a trusted admin-only channel.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'provider', 'admin')),
  display_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;
revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_app_role() to anon;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    case when lower(coalesce(new.raw_user_meta_data ->> 'account_type', '')) = 'provider' then 'provider' else 'customer' end,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create table if not exists public.service_categories (
  id text primary key,
  name_en text not null,
  name_ur text not null,
  icon text not null default 'construct',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.service_subtypes (
  id text primary key,
  category_id text not null references public.service_categories(id) on delete cascade,
  name_en text not null,
  name_ur text not null,
  starting_price_pkr integer not null default 0 check (starting_price_pkr >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0
);

insert into public.service_categories (id, name_en, name_ur, icon, is_active, sort_order) values
  ('electrician', 'Electrician', 'الیکٹریشن', 'flash', true, 1),
  ('plumber', 'Plumber', 'پلمبر', 'water', true, 2),
  ('appliance', 'Appliance repair', 'اپلائنس مرمت', 'construct', false, 3),
  ('ac', 'AC service', 'اے سی سروس', 'snow', false, 4)
on conflict (id) do nothing;

insert into public.service_subtypes (id, category_id, name_en, name_ur, starting_price_pkr, sort_order) values
  ('switch-socket', 'electrician', 'Switch or socket', 'سوئچ اور ساکٹ', 700, 1),
  ('wiring', 'electrician', 'Wiring issue', 'وائرنگ کا مسئلہ', 1200, 2),
  ('light-fan', 'electrician', 'Light or fan', 'لائٹ یا پنکھا', 800, 3),
  ('breaker', 'electrician', 'Circuit breaker', 'سرکٹ بریکر', 1000, 4),
  ('leak', 'plumber', 'Leaking tap or pipe', 'نل یا پائپ لیک', 800, 1),
  ('drain', 'plumber', 'Blocked drain', 'ڈرین بند', 1000, 2),
  ('basin-toilet', 'plumber', 'Basin or toilet', 'واش بیسن / ٹوائلٹ', 1200, 3),
  ('water-motor', 'plumber', 'Water motor', 'واٹر موٹر', 1500, 4)
on conflict (id) do nothing;

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  service_area text not null default 'Lahore',
  service_category_ids text[] not null default '{}',
  years_experience integer not null default 0 check (years_experience >= 0),
  bio text not null default '',
  verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'suspended')),
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  completed_jobs integer not null default 0 check (completed_jobs >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists providers_status_area_idx on public.providers (verification_status, service_area);

create table if not exists public.promo_codes (
  code text primary key,
  title_en text not null,
  title_ur text not null,
  discount_percent integer not null check (discount_percent between 1 and 100),
  active boolean not null default true,
  expires_at timestamptz,
  usage_limit integer,
  created_at timestamptz not null default now()
);
insert into public.promo_codes (code, title_en, title_ur, discount_percent, active) values
  ('PEHLI15', 'First booking discount', 'پہلی بکنگ پر رعایت', 15, true)
on conflict (code) do nothing;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  service_category_id text not null references public.service_categories(id),
  subtype_id text not null references public.service_subtypes(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled')),
  description text not null default '',
  photo_path text,
  service_address text not null,
  scheduled_at timestamptz not null,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'wallet_demo', 'bank_demo')),
  promo_code text references public.promo_codes(code),
  estimated_price_pkr integer not null default 0 check (estimated_price_pkr >= 0),
  customer_name text not null default '',
  provider_name text not null default '',
  preferred_provider_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookings_customer_created_idx on public.bookings (customer_id, created_at desc);
create index if not exists bookings_provider_status_idx on public.bookings (provider_id, status, scheduled_at);

create table if not exists public.booking_events (
  id bigint generated by default as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  status text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists booking_events_booking_created_idx on public.booking_events (booking_id, created_at);

create function public.record_booking_status_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, actor_id, status, note)
    values (new.id, new.customer_id, new.status, 'Booking created');
  elsif new.status is distinct from old.status then
    insert into public.booking_events (booking_id, actor_id, status, note)
    values (new.id, auth.uid(), new.status, 'Status updated');
  end if;
  return new;
end;
$$;
create trigger booking_status_event_trigger after insert or update of status on public.bookings
for each row execute procedure public.record_booking_status_event();

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.service_subtypes enable row level security;
alter table public.providers enable row level security;
alter table public.promo_codes enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.reviews enable row level security;


create policy "Profiles visible to owner or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_app_role() = 'admin');
create policy "Owner updates own basic profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, phone) on public.profiles to authenticated;

create policy "Active service categories readable" on public.service_categories for select to anon, authenticated
  using (is_active or public.current_app_role() = 'admin');
create policy "Admin manages service categories" on public.service_categories for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "Active service subtypes readable" on public.service_subtypes for select to anon, authenticated
  using (is_active or public.current_app_role() = 'admin');
create policy "Admin manages service subtypes" on public.service_subtypes for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "Approved providers are discoverable" on public.providers for select to authenticated
  using (verification_status = 'approved' or user_id = auth.uid() or public.current_app_role() = 'admin');
create policy "Provider submits own application" on public.providers for insert to authenticated
  with check (user_id = auth.uid() and public.current_app_role() = 'provider' and verification_status = 'pending' and rating = 0 and review_count = 0 and completed_jobs = 0);
create policy "Provider edits own non-review fields" on public.providers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.providers from authenticated;
grant update (full_name, phone, service_area, service_category_ids, years_experience, bio) on public.providers to authenticated;
create policy "Admin manages provider reviews" on public.providers for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "Active promo codes readable" on public.promo_codes for select to authenticated
  using (active or public.current_app_role() = 'admin');
create policy "Admin manages promo codes" on public.promo_codes for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "Booking visible to participants or admin" on public.bookings for select to authenticated
  using (
    customer_id = auth.uid()
    or exists (select 1 from public.providers p where p.id = provider_id and p.user_id = auth.uid())
    or public.current_app_role() = 'admin'
  );
create policy "Customer creates own pending booking" on public.bookings for insert to authenticated
  with check (customer_id = auth.uid() and provider_id is null and photo_path is null and status = 'pending' and public.current_app_role() = 'customer');
create policy "Admin manages bookings" on public.bookings for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
revoke insert, update, delete on public.bookings from authenticated;
grant select on public.bookings to authenticated;

create policy "Booking timeline visible to participants" on public.booking_events for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      left join public.providers p on p.id = b.provider_id
      where b.id = booking_id and (b.customer_id = auth.uid() or p.user_id = auth.uid())
    ) or public.current_app_role() = 'admin'
  );
create policy "Reviews readable" on public.reviews for select to authenticated using (
  customer_id = auth.uid() or public.current_app_role() = 'admin'
  or exists (select 1 from public.providers p where p.id = reviews.provider_id and p.user_id = auth.uid())
);
create policy "Customer reviews completed booking" on public.reviews for insert to authenticated
  with check (
    customer_id = auth.uid() and provider_id is not null
    and exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid() and b.status = 'completed' and reviews.provider_id is not distinct from b.provider_id)
  );

-- Providers may accept an unassigned job and then advance only their own job through the allowed state machine.
create function public.provider_set_booking_status(p_booking_id uuid, p_next_status text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_id uuid;
  v_provider_categories text[];
  v_booking public.bookings;
begin
  if public.current_app_role() is distinct from 'provider' then raise exception 'Provider account required'; end if;
  select id, service_category_ids into v_provider_id, v_provider_categories from public.providers
    where user_id = auth.uid() and verification_status = 'approved';
  if v_provider_id is null then raise exception 'Provider approval required'; end if;
  if p_next_status not in ('accepted', 'on_the_way', 'in_progress', 'completed') then raise exception 'Unsupported transition'; end if;
  update public.bookings
    set provider_id = case when provider_id is null and p_next_status = 'accepted' then v_provider_id else provider_id end,
        provider_name = coalesce(nullif(provider_name, ''), (select full_name from public.providers where id = v_provider_id)),
        status = p_next_status,
        updated_at = now()
    where id = p_booking_id
      and (provider_id = v_provider_id or (provider_id is null and p_next_status = 'accepted'))
      and service_category_id = any(v_provider_categories)
      and (
        (status = 'pending' and p_next_status = 'accepted') or
        (status = 'accepted' and p_next_status = 'on_the_way') or
        (status = 'on_the_way' and p_next_status = 'in_progress') or
        (status = 'in_progress' and p_next_status = 'completed')
      )
    returning * into v_booking;
  if v_booking.id is null then raise exception 'Booking unavailable or invalid status transition'; end if;
  return v_booking;
end;
$$;
revoke all on function public.provider_set_booking_status(uuid, text) from public;
grant execute on function public.provider_set_booking_status(uuid, text) to authenticated;

-- Customer cancellation is restricted to their own bookings before work starts.
create function public.customer_cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings;
begin
  if public.current_app_role() is distinct from 'customer' then raise exception 'Customer account required'; end if;
  update public.bookings set status = 'cancelled', updated_at = now()
  where id = p_booking_id and customer_id = auth.uid() and status in ('pending', 'accepted')
  returning * into v_booking;
  if v_booking.id is null then raise exception 'Booking cannot be cancelled'; end if;
  return v_booking;
end;
$$;
revoke all on function public.customer_cancel_booking(uuid) from public;
grant execute on function public.customer_cancel_booking(uuid) to authenticated;

-- Private photo bucket. Customer uploads only into their own folder; the booking owner, assigned provider, or admin can view it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booking-photos', 'booking-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "Customer uploads own booking photo" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'booking-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and case
      when coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then exists (
        select 1 from public.bookings b
        where b.id = ((storage.foldername(name))[2])::uuid
          and b.customer_id = auth.uid() and b.status in ('pending', 'accepted')
      )
      else false
    end
  );
create policy "Booking participants read photos" on storage.objects for select to authenticated
  using (
    bucket_id = 'booking-photos' and (
      ((storage.foldername(name))[1] = auth.uid()::text and exists (
        select 1 from public.bookings own_booking where own_booking.customer_id = auth.uid()
        and own_booking.id::text = (storage.foldername(name))[2]
      ))
      or exists (
        select 1 from public.bookings b
        left join public.providers p on p.id = b.provider_id
        where b.photo_path = name and (p.user_id = auth.uid() or b.customer_id = auth.uid())
      )
      or public.current_app_role() = 'admin'
    )
  );

-- Booking inserts are validated and priced on the database, never by client-supplied provider IDs or prices.
create function public.customer_create_booking(
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
language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
  v_price integer;
  v_discount integer := 0;
  v_promo text;
  v_customer_name text;
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
    select code, discount_percent into v_promo, v_discount from public.promo_codes
      where upper(code) = upper(trim(p_promo_code)) and active and (expires_at is null or expires_at > now());
    if v_promo is null then raise exception 'Promo code is invalid or expired'; end if;
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
revoke all on function public.customer_create_booking(text, text, text, text, timestamptz, text, text, text) from public;
grant execute on function public.customer_create_booking(text, text, text, text, timestamptz, text, text, text) to authenticated;

create function public.customer_attach_booking_photo(p_booking_id uuid, p_photo_path text)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare v_booking public.bookings;
begin
  if auth.uid() is null or public.current_app_role() is distinct from 'customer' then raise exception 'Customer account required'; end if;
  if split_part(coalesce(p_photo_path, ''), '/', 1) <> auth.uid()::text
     or split_part(coalesce(p_photo_path, ''), '/', 2) <> p_booking_id::text
     or split_part(coalesce(p_photo_path, ''), '/', 3) = ''
     or array_length(string_to_array(p_photo_path, '/'), 1) <> 3 then raise exception 'Photo path is not scoped to this booking'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'booking-photos' and name = p_photo_path) then raise exception 'Photo upload not found'; end if;
  update public.bookings set photo_path = p_photo_path, updated_at = now()
    where id = p_booking_id and customer_id = auth.uid() and status = 'pending'
    returning * into v_booking;
  if v_booking.id is null then raise exception 'Booking is unavailable for photo attachment'; end if;
  return v_booking;
end;
$$;
revoke all on function public.customer_attach_booking_photo(uuid, text) from public;
grant execute on function public.customer_attach_booking_photo(uuid, text) to authenticated;

-- Explicit API grants; row-level security remains the authorization boundary.
grant select on public.service_categories, public.service_subtypes to anon, authenticated;
grant insert, update, delete on public.service_categories, public.service_subtypes to authenticated;
grant select on public.providers to authenticated;
grant insert on public.providers to authenticated;
grant update (full_name, phone, service_area, service_category_ids, years_experience, bio) on public.providers to authenticated;
grant select on public.promo_codes to authenticated;
grant insert, update, delete on public.promo_codes to authenticated;
grant select on public.bookings to authenticated;
grant select on public.booking_events to authenticated;
grant select, insert on public.reviews to authenticated;
grant usage, select on sequence public.booking_events_id_seq to authenticated;

-- Admin controls intentionally use SECURITY DEFINER RPCs; browser clients cannot elevate their profile role.
create function public.admin_set_provider_status(p_provider_id uuid, p_status text)
returns public.providers
language plpgsql security definer set search_path = public as $$
declare v_provider public.providers;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Admin account required'; end if;
  if p_status not in ('pending', 'approved', 'suspended') then raise exception 'Unsupported provider status'; end if;
  update public.providers set verification_status = p_status, updated_at = now()
    where id = p_provider_id returning * into v_provider;
  if v_provider.id is null then raise exception 'Provider not found'; end if;
  return v_provider;
end;
$$;
revoke all on function public.admin_set_provider_status(uuid, text) from public;
grant execute on function public.admin_set_provider_status(uuid, text) to authenticated;

create function public.admin_set_category_active(p_category_id text, p_is_active boolean)
returns public.service_categories
language plpgsql security definer set search_path = public as $$
declare v_category public.service_categories;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Admin account required'; end if;
  update public.service_categories set is_active = p_is_active where id = p_category_id returning * into v_category;
  if v_category.id is null then raise exception 'Category not found'; end if;
  return v_category;
end;
$$;
revoke all on function public.admin_set_category_active(text, boolean) from public;
grant execute on function public.admin_set_category_active(text, boolean) to authenticated;

create function public.admin_set_promo_active(p_code text, p_active boolean)
returns public.promo_codes
language plpgsql security definer set search_path = public as $$
declare v_promo public.promo_codes;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Admin account required'; end if;
  update public.promo_codes set active = p_active where code = upper(p_code) returning * into v_promo;
  if v_promo.code is null then raise exception 'Promo code not found'; end if;
  return v_promo;
end;
$$;
revoke all on function public.admin_set_promo_active(text, boolean) from public;
grant execute on function public.admin_set_promo_active(text, boolean) to authenticated;

create function public.admin_set_booking_status(p_booking_id uuid, p_next_status text)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings;
  v_current_status text;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Admin account required'; end if;
  if p_next_status not in ('pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled') then
    raise exception 'Unsupported booking status';
  end if;
  select status into v_current_status from public.bookings where id = p_booking_id for update;
  if v_current_status is null then raise exception 'Booking not found'; end if;
  if p_next_status not in ('pending', 'cancelled') and exists (
    select 1 from public.bookings where id = p_booking_id and provider_id is null
  ) then raise exception 'A provider must accept this request before it can advance'; end if;
  if p_next_status <> v_current_status and not (
    (v_current_status = 'pending' and p_next_status in ('accepted', 'cancelled')) or
    (v_current_status = 'accepted' and p_next_status in ('on_the_way', 'cancelled')) or
    (v_current_status = 'on_the_way' and p_next_status in ('in_progress', 'cancelled')) or
    (v_current_status = 'in_progress' and p_next_status in ('completed', 'cancelled'))
  ) then raise exception 'Invalid booking status transition'; end if;
  update public.bookings set status = p_next_status, updated_at = now()
    where id = p_booking_id returning * into v_booking;
  if v_booking.id is null then raise exception 'Booking not found'; end if;
  return v_booking;
end;
$$;
revoke all on function public.admin_set_booking_status(uuid, text) from public;
grant execute on function public.admin_set_booking_status(uuid, text) to authenticated;


-- Return only non-identifying preview fields for eligible providers; the address is visible after acceptance.
create function public.provider_list_open_jobs()
returns table (
  id uuid,
  service_category_id text,
  subtype_id text,
  description text,
  scheduled_at timestamptz,
  estimated_price_pkr integer,
  created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  v_provider_id uuid;
  v_provider_categories text[];
begin
  if public.current_app_role() is distinct from 'provider' then raise exception 'Provider account required'; end if;
  select p.id, p.service_category_ids into v_provider_id, v_provider_categories
    from public.providers p where p.user_id = auth.uid() and p.verification_status = 'approved';
  if v_provider_id is null then raise exception 'Provider approval required'; end if;
  return query
    select b.id, b.service_category_id, b.subtype_id, b.description, b.scheduled_at, b.estimated_price_pkr, b.created_at
    from public.bookings b
    where b.provider_id is null and b.status = 'pending' and b.service_category_id = any(v_provider_categories)
    order by b.created_at desc;
end;
$$;
revoke all on function public.provider_list_open_jobs() from public;
grant execute on function public.provider_list_open_jobs() to authenticated;
