# GharKaam

An Urdu-first home-services marketplace foundation built with Expo, React Native, TypeScript, and Supabase. The first release focuses on electrician and plumbing bookings, with separate customer, provider, and admin journeys.

## Run locally

```bash
npm install
npx expo start
```

Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_SUPABASE_URL` plus `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` before starting Expo. The local environment file is ignored by Git. Never put a Supabase service-role key in this app or repository.

## Demo journeys

- Customer: explore services, describe a repair, optionally attach a photo, choose a Lahore address and time, compare sample professionals, select a demo payment method, apply `PEHLI15`, confirm, track, and rate.
- Provider: preview jobs and status changes; real accounts can submit an application for admin review.
- Admin: review provider applications and manage marketplace settings. There is no admin self-registration; a real admin must already exist in the protected `profiles` table.

Demo payment choices are labels only—no payment processing is implemented. Provider locations are illustrative estimates—no GPS tracking is implemented.

## Supabase

The SQL migration in `database/migrations/` defines the initial schema and row-level security. The app uses only the client-safe publishable key. Admin role assignment is deliberately excluded from public signup and must be granted through a trusted administrative channel. Apply the migration before using authenticated data flows.

## Project structure

- `src/screens/` — customer, provider, admin, role selection, and authentication journeys
- `src/components/` — shared UI, shell, and navigation
- `src/data/` — local demo fixtures and repository boundary
- `src/lib/` — Supabase client and authentication helpers
- `src/i18n/` — Urdu and English copy
- `database/migrations/` — versioned PostgreSQL schema and policies

## Current delivery status

The Expo application is implemented locally and connected to the approved $0/month Supabase project `gharkaam` (`xbolobjxptfnbjicfvao`) in `App org`, region `ap-south-1`. **Both foundation and RPC-permission migrations were applied successfully.** Eight application tables have RLS enabled, four categories/eight subtypes/one promo are seeded, and the private photo bucket is configured. No unrelated objects or user data were changed. Client-safe connection settings exist only in the ignored local environment file.

The GitHub connector authenticates as `contactbuildorahomes-commits`, but repository creation was rejected with `CreateRepository` permission denied. No repository URL or successful push is available. Create an empty **private** repository named `gharkaam` or grant the connector repository-creation permission, then push this source. No public application deployment was created.

Before real-user testing:

1. For a fresh project only, apply both SQL files in `database/migrations/` in order through a trusted Supabase migration channel. They are versioned one-time migrations, not scripts to rerun against an existing installation. The approved project above is already migrated.
2. Confirm email/password Auth settings and allowed verification redirect URLs.
3. Register the intended admin as a normal customer, then grant `profiles.role = 'admin'` through a trusted database administrator. There is no public admin signup or client-side role promotion.
4. Test separate buyer/provider signups, approve the provider from the real admin account, and test booking creation, optional photo upload, acceptance, status progression, and review insertion with separate accounts.

## Validation and limitations

Run `npx tsc --noEmit`, `npx expo install --check`, and `npx expo export --platform web`. A local web preview can be served from `dist/`; this is not a production deployment.

- TypeScript, dependency compatibility, web export, and iOS/Android JavaScript/Hermes bundle exports have passed. Native device execution, native photo picker/upload, authenticated multi-account workflows, and email confirmation still require integration testing.
- Browser smoke tests covered Urdu RTL rendering, the English switch, service/subtype/problem entry, appointment selection, sample professionals, the `PEHLI15` discount (Rs 700 to Rs 595), local confirmation/tracking, and initial provider status transitions. Database checks verified table RLS, seeds, private bucket limits, anonymous catalog access, role guards, and RPC ACLs. Anonymous execution of protected RPCs and all client execution of trigger-only functions are revoked.
- Customer/provider/admin demo journeys use local fixtures. Professionals shown during selection are samples; an authenticated booking records a preferred display name, not a real provider assignment. Approved eligible providers claim open requests.
- Admin controls cover provider application approval/suspension, category activation, the sample promotion, and limited booking status changes—not a complete production operations console. Authenticated customer catalogs are loaded from Supabase; invalid/paused services and offers are also rejected by the booking RPC.
- Status refresh is periodic (15 seconds), not GPS tracking. Payment methods are demo labels and no money is charged.
- Launch city is Lahore; appointment selection currently uses the device's local timezone. Explicit cross-timezone scheduling, multi-city routing, provider capacity, customer address management, first-use/global promo redemption enforcement, anti-abuse controls, production monitoring, and full privacy/security review are future work.
- Review records persist; aggregate provider ratings/job counts are not yet automatically recalculated. Photos use a private, size/MIME-limited bucket; retention/cleanup needs a production policy.
- `npm audit --omit=dev` currently reports three moderate findings in the Expo fingerprint/minimatch chain, with no high or critical finding. The suggested automatic fix changes the Expo major version, so it was not applied blindly.
