-- Supabase default function privileges may grant named roles directly, independently of PUBLIC.
-- Protected application RPCs require a signed-in account and retain their internal role checks.
revoke all on function public.provider_set_booking_status(uuid, text) from anon;
revoke all on function public.customer_cancel_booking(uuid) from anon;
revoke all on function public.customer_create_booking(text, text, text, text, timestamptz, text, text, text) from anon;
revoke all on function public.customer_attach_booking_photo(uuid, text) from anon;
revoke all on function public.admin_set_provider_status(uuid, text) from anon;
revoke all on function public.admin_set_category_active(text, boolean) from anon;
revoke all on function public.admin_set_promo_active(text, boolean) from anon;
revoke all on function public.admin_set_booking_status(uuid, text) from anon;
revoke all on function public.provider_list_open_jobs() from anon;
-- Trigger invocation does not require exposing these functions as client API entry points.
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.record_booking_status_event() from public, anon, authenticated;
-- current_app_role remains available to anonymous catalog RLS; it returns only the caller's own role or NULL.
