# GharKaam V1

An Urdu-first, Lahore-focused home-services marketplace built with Expo, React Native, TypeScript, and Supabase. Customer, provider, and admin journeys stay separate; Urdu is the default with an English switch and RTL layout.

## Run locally

```bash
npm install
cp .env.example .env.local
# Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local
npx expo start
```

The local environment file is ignored by Git. The mobile app uses only the client-safe Supabase publishable key. Never put a service-role key in the app or repository.

## V1 workflows

- **Customer:** browse live service categories and subtypes, describe a job, optionally attach a photo, choose an address/time, request a booking, track status, and rate completed work.
- **Provider:** apply for approval, view eligible open requests, accept work, and progress assigned jobs through guarded statuses.
- **Admin:** search and page through the complete provider lifecycle directory (review applications and suspend/reactivate providers); search and page through a minimal customer directory; search booking queues, make guarded status changes, and assign pending bookings to approved, service-eligible providers; create/edit bilingual service categories, subtypes, and offers; and pause/reactivate catalog items or offers.

Catalog and offer records are deactivated rather than deleted, preserving booking history and foreign-key references. Promotion expiry and optional global usage caps are checked by the server; a use is consumed when a booking is created, including if it is later cancelled, and caps are serialized with a promo-row lock. A cap cannot be reduced below the number of bookings already created with that offer. Provider assignment validates approval and service-category eligibility on the server, then marks the booking accepted; service-area fit remains an admin judgment, not an automated location guarantee.

Demo changes are stored locally on the device and do not write to Supabase. Demo customers, providers, bookings, payment methods, and provider locations are illustrative. Real payment processing and live provider GPS are not implemented.

## Admin security and account setup

There is no public admin self-signup and no client-side role promotion. Create the owner account using the normal customer signup path and the owner's own email, complete email confirmation if enabled, then grant the `admin` role through a trusted Supabase database administrator/operator channel. Never expose a service-role credential to the app. The first admin should be provisioned only after the account exists; all admin reads and mutations still enforce the profile role server-side.

The `database/migrations/` SQL files are versioned, additive migrations. Apply them in order to a fresh project through a trusted Supabase migration channel; do not replay them against an already-migrated project. The approved project is `gharkaam` (`xbolobjxptfnbjicfvao`), region `ap-south-1`; foundation, RPC permission hardening, admin V1 controls, full provider paging, and legacy SECURITY DEFINER path hardening are applied there. The first owner role is assigned only after the submitted signup email is verified.

## Project structure

- `src/screens/` — customer, provider, admin, role selection, and authentication screens
- `src/screens/AdminManagementModals.tsx` — bilingual admin category, subtype, offer, and provider-assignment forms
- `src/data/` — local demo fixtures and Supabase repository boundary
- `src/lib/` — Supabase client, auth, and admin form validation
- `src/i18n/` — Urdu and English copy
- `database/migrations/` — versioned PostgreSQL schema, RLS, and server-guarded RPCs
- `tests/` — admin form validation and migration guard regression tests

## Validation

```bash
npm test
npx tsc --noEmit
npx expo install --check
npx expo export --platform web
npx expo export --platform ios
npx expo export --platform android
```

These exports verify platform bundles, not physical-device execution or a public deployment. Authenticated multi-account flows, native photo picking/upload, app-store signing, production monitoring, and a full privacy/security review still need release testing.

## Known limits

The launch city is Lahore. Appointment times currently use the device's local timezone. Provider and booking operational lists load up to the latest 1,000 rows; the customer directory uses server-side search with 100-row pages. Customer address management, provider capacity planning, multi-city routing, per-customer or first-use promo restrictions, aggregate rating recalculation, review moderation, photo-retention automation, and anti-abuse controls are not part of this V1. Demo payment choices are labels only; no money is charged.
