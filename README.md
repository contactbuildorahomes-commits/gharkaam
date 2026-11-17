# GharKaam V1

An Urdu-first, Lahore-focused home-services marketplace built with Expo, React Native, TypeScript, and Supabase. Urdu is the default, with an English switch and right-to-left layouts.

## Run locally

```bash
npm install
cp .env.example .env.local
# Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local
npx expo start
```

The local environment file is ignored by Git. The app uses only the client-safe Supabase publishable key. Never place a service-role key in the app or repository.

## What is in V1

- **Customer:** browse active service categories, describe the job, optionally attach a photo, choose a Lahore address and time, send a booking request, track its status, and rate completed work.
- **Provider:** apply for approval, view eligible open requests after approval, accept a job, and advance its guarded status.
- **Admin:** review providers, manage a minimal customer directory, review bookings, assign a pending booking to an approved eligible provider, and manage bilingual service categories, subtypes, and offers. Authenticated admin operations are guarded by Supabase role checks.
- **Payment:** cash after the service only. The app has no online payment processor and does not collect money. Prices shown before a visit are estimates.
- **Provider assignment:** a customer booking starts as a request with no provider assignment. The authenticated booking flow does not show sample providers. The local demo may show illustrative provider preferences, but a preference is not an assignment. An assignment is created only through the admin assignment action or when the demo provider accepts a shared demo request.
- **Demo:** customer, provider, and admin roles share the same local demo bookings and catalog overrides on that device/browser. Demo changes are saved in local AsyncStorage and do not write to Supabase. Switching roles from the profile keeps the local demo state. Old demo bookings that were auto-assigned from sample choices are normalized back to pending requests.
- **Admin demo controls:** pausing a category, subtype, or offer changes only this device’s demo state; returning to the customer demo shows the same change. Demo values and profiles are illustrative, not real revenue, providers, or customers.

## Explicitly not in V1

- Online card, wallet, or bank payment processing.
- Live provider GPS tracking.
- inDrive-like customer/provider price bargaining.
- GharKaam coins or buying app currency through the admin.
- Direct messaging the admin.

Bargaining, coins/app currency, and direct admin messaging are future V2 ideas only; they are not available in this build.

## Security and data boundaries

The client uses the public Supabase publishable key and authenticated user sessions. Admin RPCs enforce the profile role on the server; no client-side role promotion is implemented. Authenticated operations fail explicitly when their user session or Supabase client is unavailable and cannot fall back to local demo writes. Demo data is stored under separate local AsyncStorage keys.

The database’s existing migration still accepts legacy `wallet_demo` and `bank_demo` payment labels, but the V1 app exposes and submits cash only. No processor or charge path exists. Before production, add and apply a server-side cash-only migration after checking existing booking rows; this release does not rewrite legacy booking records.

The versioned SQL files in `database/migrations/` are additive migrations. Apply them in order to a fresh project through a trusted Supabase migration channel; do not replay them against an already-migrated project. The current configured project is `gharkaam` (`xbolobjxptfnbjicfvao`), region `ap-south-1`; the foundation, RPC permission hardening, admin V1 controls, provider paging, and legacy SECURITY DEFINER path hardening migrations are applied there. This work did not verify, resend, promote, or otherwise change any admin account or auth setting.

## Client walkthrough

1. Open **Admin → Demo preview** and switch to English if helpful. Show the local-only demo banner and the active booking queue.
2. Open **Services & offers** and pause Electrician.
3. Use **Profile → Switch demo role → Customer → Try demo**. Confirm Electrician is visibly paused and disabled, and cannot be booked; this demonstrates the shared local override.
4. Return to Admin and reactivate Electrician. Switch to Customer and start an electrician booking. Select a service, issue, time, and address.
5. On **Demo profiles · preference only**, select an illustrative provider preference. On the summary, show the COD-only note and send the booking request. The request should be pending and unassigned.
6. Switch to **Provider → Demo**. The same request appears without the customer’s name or full address. Accept it; that action creates the demo assignment and updates the shared record.
7. Return to Customer to see the accepted status, then to Admin to see the same booking and assignment. Point out that there is no live GPS, payment collection, bargaining, coins, or admin messaging.

## Validation commands

```bash
npm test
npx tsc --noEmit
npx expo install --check
npx expo-doctor
npx expo export --platform web
npx expo export --platform ios
npx expo export --platform android
```

Web/iOS/Android exports verify bundles, not physical-device execution or store deployment.

The browser smoke also checks Urdu and English role selection at 1280×649 and 500×609, local admin category pause/reactivation, COD booking, provider privacy, and shared provider acceptance. ESLint is not configured; `npx expo lint` offers to install/configure it, and this pass leaves project lint dependencies and policy unchanged.

## Remaining production blockers

- Admin sign-in/account readiness remains as currently configured; this work deliberately did not touch email verification, role assignment, or auth settings.
- The deployed database still accepts legacy non-cash demo payment labels. Verify existing records and apply a cash-only server migration before production.
- Real provider coverage, capacity/area matching, customer contact-sharing policy, and operational service-level procedures need production validation.
- Test authenticated customer/provider/admin flows with separate accounts, including photo upload failures, server-side assignment and status transitions, and role/RLS enforcement.
- Complete a privacy, security, and abuse review; define photo-retention and review-moderation operations; add production monitoring and backups.
- No physical-device testing, app-store signing credentials/builds, store submission, or public deployment were performed. Device and store readiness are not claimed.

## Project structure

- `src/screens/` — customer, provider, admin, role selection, and authentication screens
- `src/data/` — local demo fixtures, local persistence, and the Supabase repository boundary
- `src/lib/demoState.ts` — pure shared demo projection and request/assignment rules
- `src/i18n/` — Urdu and English copy
- `database/migrations/` — PostgreSQL schema, RLS, and guarded RPCs
- `tests/` — admin validation, migration guards, and demo flow regressions
