-- Harden existing SECURITY DEFINER functions without changing their behavior or replacing applied migrations.
-- Explicitly pin built-ins ahead of public to prevent object shadowing.
alter function public.current_app_role() set search_path = pg_catalog, public;
alter function public.handle_new_auth_user() set search_path = pg_catalog, public;
alter function public.record_booking_status_event() set search_path = pg_catalog, public;
alter function public.provider_set_booking_status(uuid, text) set search_path = pg_catalog, public;
alter function public.customer_cancel_booking(uuid) set search_path = pg_catalog, public;
alter function public.customer_attach_booking_photo(uuid, text) set search_path = pg_catalog, public;
alter function public.admin_set_provider_status(uuid, text) set search_path = pg_catalog, public;
alter function public.admin_set_category_active(text, boolean) set search_path = pg_catalog, public;
alter function public.admin_set_promo_active(text, boolean) set search_path = pg_catalog, public;
alter function public.admin_set_booking_status(uuid, text) set search_path = pg_catalog, public;
alter function public.provider_list_open_jobs() set search_path = pg_catalog, public;

-- Client entry points are authenticated-only; their existing server-side role and transition checks remain intact.
revoke all on function public.provider_set_booking_status(uuid, text) from public, anon;
grant execute on function public.provider_set_booking_status(uuid, text) to authenticated;
revoke all on function public.customer_cancel_booking(uuid) from public, anon;
grant execute on function public.customer_cancel_booking(uuid) to authenticated;
revoke all on function public.customer_attach_booking_photo(uuid, text) from public, anon;
grant execute on function public.customer_attach_booking_photo(uuid, text) to authenticated;
revoke all on function public.admin_set_provider_status(uuid, text) from public, anon;
grant execute on function public.admin_set_provider_status(uuid, text) to authenticated;
revoke all on function public.admin_set_category_active(text, boolean) from public, anon;
grant execute on function public.admin_set_category_active(text, boolean) to authenticated;
revoke all on function public.admin_set_promo_active(text, boolean) from public, anon;
grant execute on function public.admin_set_promo_active(text, boolean) to authenticated;
revoke all on function public.admin_set_booking_status(uuid, text) from public, anon;
grant execute on function public.admin_set_booking_status(uuid, text) to authenticated;
revoke all on function public.provider_list_open_jobs() from public, anon;
grant execute on function public.provider_list_open_jobs() to authenticated;
