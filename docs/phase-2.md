# Phase 2 — accounts and Hunar profiles

## Implemented

- Email/password signup, confirmation, login, logout, password reset, and Google OAuth using Supabase Auth.
- Next.js 16 `src/proxy.ts` (the current name for middleware) refreshes sessions and protects `/account/*`. Account layouts, pages, and every mutation independently verify the user with `auth.getUser()`.
- Six-step React Hook Form + Zod onboarding: basics/photo, skills/bio/experience, location/availability, contact preferences, links/portfolio, review/submit.
- Debounced username availability, reserved names, database uniqueness, draft saving, and optimistic concurrency checks to prevent an old tab overwriting a newer save.
- Owner dashboard with draft, pending, approved, rejected, and changes-requested states and reviewer notes.
- Client-side image compression to WebP, followed by server-side decoding, resizing, metadata removal, and private Storage upload. Original images may be JPG, PNG, or WebP up to 10 MB; stored images are at most 1600 pixels on the longest edge and 2 MB. Up to six portfolio references are enforced by the database.
- Database-enforced review transitions, ownership, and privilege restrictions. Editing an approved profile removes its verification and returns it to pending.

## Files created or changed

- `supabase/migrations/202609280002_profiles.sql`: profile schema, constraints, indexes, grants, RLS, public-safe view, signup trigger, username RPC, private Storage bucket and policies.
- `src/proxy.ts`, `src/lib/auth.ts`: session refresh, route protection, trusted origin handling, server authentication checks.
- `src/app/auth/actions.ts`, `auth/callback/route.ts`, `auth/confirm/route.ts`: authentication actions and email/OAuth callbacks.
- `src/app/(auth)/`: login, signup, forgot-password, reset-password, and no-index metadata.
- `src/components/auth-form.tsx`, `auth-page.tsx`, `form-field.tsx`: shared auth UI and accessible input/error presentation.
- `src/app/account/`: dashboard, layout, profile submission route, server actions, loading and error states.
- `src/components/profile-wizard.tsx`, `src/lib/profile.ts`, `src/lib/image.ts`, `src/lib/validation.ts`: six-step editor, profile mapping, private image previews, compression, and shared validation.
- `src/lib/supabase/database.types.ts`, `server.ts`: expanded types and session-refresh integration.
- `src/app/[page]/page.tsx`: removes old signup/login placeholders and updates privacy/terms descriptions.
- `next.config.ts`: 3 MB Server Action body limit; each stored/uploaded image remains limited to 2 MB.
- `.env.example`, `package.json`, `package-lock.json`, `playwright.config.ts`, tests, README, and this handoff.

## SQL migration

Apply Phase 1 first, then run `supabase/migrations/202609280002_profiles.sql` once through Supabase SQL Editor or your migration workflow. The migration also creates draft profiles for existing auth users. No administrator is created or inferred from user metadata.

`profiles` holds all requested fields, plus `updated_at` for concurrent-edit protection. `photo_url` and `portfolio_images` contain **private Storage object paths**, not signed URLs. Owner previews use one-hour signed URLs. Reload the editor to renew expired previews.

**Privacy design:** granting public SELECT on an approved profile row would also expose its phone and email via the REST API. Instead, the base table is owner-only and `public_profiles` is an explicit public column allowlist, filtered to approved, verified rows. This intentionally owner-executed, security-barrier view does not include contact fields, role, or review notes. Do not change it to `select *` or grant public access to the base table. Future listings should read this view; the future Contact action must have its own controlled access path.

The `profile-media` bucket is private. Members can read/upload only their own folder. Objects cannot be overwritten, and referenced images cannot be deleted. Future public media delivery must also check approval; do not make this bucket public. Abandoned uploads remain private and can be removed later with a scheduled orphan cleanup job; no automatic cleanup job is included in this phase.

## Environment and Supabase configuration

No new secret environment variables are required:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Set `NEXT_PUBLIC_SITE_URL` to the actual origin used for testing (for example `http://localhost:3100` if running on port 3100), and your HTTPS origin in production. Authentication redirects use this configured origin, never a submitted host or arbitrary `next` URL. Restart/rebuild after changing environment variables.

In Supabase:

1. Enable Email authentication and email confirmation. Set minimum password length to 10 to match the app. Keep Supabase Auth rate limits enabled.
2. Set **Authentication → URL Configuration → Site URL** to the same origin. Allow `<origin>/auth/callback`, `<origin>/auth/callback?next=/account`, `<origin>/auth/callback?next=/account/submit`, and `<origin>/auth/callback?next=/reset-password` as redirect URLs. Include only origins you control.
3. For confirmation links that also work across browsers/devices, set the confirmation email link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup` and the recovery email link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. The default PKCE email flow is also supported by `/auth/callback`, but requires the same browser that initiated the request.
4. Enable Google under Auth Providers. Put the Google client ID/secret in Supabase. In Google Cloud, allow the callback URL shown by Supabase (`https://YOUR_PROJECT.supabase.co/auth/v1/callback`), not the app callback URL. Configure your OAuth consent screen/test users as appropriate.
5. Configure a working email sender/SMTP provider in Supabase for delivery beyond its development mail restrictions. Transactional Resend integration remains a later phase; password and confirmation emails are sent by Supabase Auth.

Do not add a service-role key to public environment variables. The application uses the member session and RLS for all profile operations.

## Automated verification

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run build
$env:PLAYWRIGHT_CHANNEL='msedge' # optional, uses existing Edge on Windows
npm run test:e2e
```

The unit suite runs the actual SQL migrations in a fresh PGlite PostgreSQL database, with emulated Supabase-owned `auth` and `storage` schemas. It checks RLS, private public-view columns, anonymous denial, cross-user isolation, metadata/role escalation, status escalation, approval invalidation, username collisions, missing/foreign image references, media ownership/immutability, and the six-image cap. Schema tests also check draft/submission validation, contact toggles, URL protocols, reserved usernames, passwords, redirect allowlists, and sensitive-field stripping.

The default browser suite expects **no Supabase credentials**, and tests the disconnected state, protected-route redirects, auth route layouts, malformed callback handling, and existing landing-page interactions. These checks do not prove external OAuth, email delivery, or Supabase Storage HTTP integration.

Verified for this handoff: production build on Node 22, TypeScript, ESLint, all five unit/database tests, and all seven browser tests passed. Signup layouts were also inspected at desktop and 375px mobile widths.

## Live acceptance checklist

After configuring a development Supabase project:

1. Sign up using email, confirm the email, and verify `/account` opens. Confirm the draft profile has role `member`.
2. Sign out. Verify `/account` and `/account/submit` redirect to login. Sign in again; test Google login separately.
3. Request a reset email, follow its link, change the password, and verify the old password no longer works. Verify expired/used links fail safely.
4. Walk through all six steps. Test invalid/reserved/taken usernames, empty required fields, Call/Email toggles without values, unsafe links, draft saving, and returning to the saved draft.
5. Upload an avatar and six portfolio images. Verify WebP storage in your UUID folder, rejection of a seventh image and unsupported files, and default-avatar behavior without a photo.
6. Submit and confirm dashboard status `Pending review`. No profile should appear in `public_profiles` yet.
7. In a development SQL Editor, simulate review for your own test user: `update public.profiles set status='approved', is_verified=true, approved_at=now() where id='YOUR_TEST_USER_UUID';`. Verify the approved dashboard and safe public view. Edit/save the profile; it must return to pending and disappear from the public view.
8. Simulate `changes_requested` with `is_verified=false`, `approved_at=null`, and a `rejection_note`. Verify the note appears and the member can edit/resubmit.
9. With a second account, verify the first account's base profile, private contacts, and private images cannot be read. Open the editor in two tabs; save in one, then verify stale-save protection in the other.

## Remaining dependencies and phase boundary

Supabase credentials were not supplied, so no remote migration, real email delivery, Google OAuth, or hosted Storage operation has been verified. Connect a development project and run the checklist before production use. Legal/support pages remain drafts.

Admin review UI, verification emails, real homepage aggregates, public listings and Contact reveal, and public media delivery remain Phases 3–4. Business and course features remain later phases. Stop after Phase 2 and wait for the user to authorize Phase 3.
