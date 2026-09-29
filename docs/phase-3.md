# Phase 3 — administration and verification

## Delivered

- `/admin`: live pending-profile and verified-member totals, with a link to the email queue.
- `/admin/reviews`: searchable, paginated pending profiles, oldest update first.
- `/admin/reviews/[id]`: all submitted details, private contacts, avatar, portfolio images, safe external links, human review controls, and the latest 50 audit entries. Open WhatsApp prepares a message for the reviewer to send; it does not send automatically.
- `/admin/members`: name/username/city search, status filters, pagination, suspension and restoration through the review screen.
- `/admin/categories`: add/edit categories and reorder with accessible up/down controls. Concurrent edits and stale orders are rejected.
- `/admin/notifications`: delivery history, failures, provider receipts, and a retry button.
- Database-checked admin access, atomic decisions/audit/email records, required reasons, stale-submission protection, and prevention of self-review.
- Resend status notifications backed by a durable outbox. Member-triggered status changes also enqueue notifications.
- Live homepage verified-member totals, per-category counts, recent approved members and approved avatars. Approval, suspension, member edits, and category changes invalidate the homepage cache.

## Files created or changed

- `supabase/migrations/202609280003_admin_verification.sql`: admin role checks, suspension support, review/category RPCs, immutable audit records, email outbox, safe public aggregates, and media access policies.
- `src/app/admin/`: protected layout, overview, queues, detail page, members, categories, notifications, server actions, loading/error states.
- `src/components/admin/`: member table, review form, category manager, and email retry control.
- `src/lib/admin.ts`, `admin-data.ts`, `admin-validation.ts`: role checks, filtered/paginated queries, review validation, and link safety.
- `src/lib/email-message.ts`, `email-worker.ts`: plain-text status messages and the Resend delivery worker.
- `src/app/api/internal/status-emails/route.ts`: secret-protected POST endpoint for scheduled retries.
- `src/lib/home.ts`, `home-schema.ts`, `src/components/recent-members.tsx`, `category-browser.tsx`, `src/app/page.tsx`: live counts and member strip with honest unavailable states.
- `src/app/media/member-avatar/[id]/route.ts`: approval-checked, uncached avatar delivery.
- `src/app/account/actions.ts`, `page.tsx`, `submit/page.tsx`: member-change notifications, cache invalidation, suspended-profile handling, and the admin entry link.
- `src/lib/supabase/database.types.ts`, `src/proxy.ts`, `src/lib/validation.ts`: expanded types, protected admin routes, and safe post-login destinations.
- `tests/unit/admin-database.test.ts`, `admin-validation.test.ts`, `tests/admin.spec.ts`, `package.json`, `.env.example`, and documentation. Existing source/test files were formatted.

## Apply the migration and appoint an administrator

Apply the Phase 1 and Phase 2 migrations first, then apply `supabase/migrations/202609280003_admin_verification.sql` once with your normal migration workflow or Supabase SQL Editor.

Register and confirm the email of the account that will administer the community. In the trusted SQL Editor, verify its user UUID and promote **that exact account**:

```sql
-- Substitute a confirmed, trusted user's UUID. Do not run with the placeholder.
update public.profiles
set role = 'admin'
where id = 'YOUR_CONFIRMED_USER_UUID';
```

No user is promoted automatically. Sign in and visit `/admin`, or use the administration button on the account dashboard. An administrator can be in draft status; administrative access does not require their own talent profile to be published. Self-review is disabled, so another admin must review their talent profile. Suspending administrators is intentionally not available through this UI; role management remains a trusted database operation.

The app verifies identity server-side and reads the current database role. It does not trust user metadata or a role claimed by a browser. Every admin Server Action repeats the check, and the database RPC checks it again. Normal members cannot call privileged RPCs successfully or modify review fields through the REST API.

## Environment variables

Keep the existing public configuration:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Add these **server-only** variables for status email delivery:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
RESEND_API_KEY=YOUR_RESEND_API_KEY
RESEND_FROM_EMAIL=Hunar Souq <reviews@YOUR_VERIFIED_DOMAIN>
STATUS_EMAIL_WORKER_SECRET=YOUR_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
```

Verify the sender domain in Resend. Use the actual application origin in `NEXT_PUBLIC_SITE_URL`; use HTTPS in production. Restart/rebuild after environment changes. Never prefix the service-role key, Resend key, or worker secret with `NEXT_PUBLIC_`.

The service-role client is confined to the email worker. Admin reviews, category edits, private media inspection, and member changes continue to use authenticated sessions and checked database functions. Without the email settings, review decisions still work and status emails remain queued with a visible configuration notice.

## Email delivery and recovery

The database trigger records each actual profile status transition, including member resubmission and removal from public view after an edit. Creating an empty draft account does not generate a status-change email; welcome messages remain a later phase. Emails go to the account email from `auth.users`, not the optional public contact email. Reasons for rejection, requested changes, and suspension are included. Approval/restoration notes remain in the admin review history.

The decision, audit row, and queued email are committed atomically. The application then attempts delivery. Workers claim up to three messages per invocation using exclusive two-minute leases. They process each member's status changes in order and reuse a stable payload and idempotency key. “Accepted by Resend” is an API receipt, not an inbox-delivery guarantee.

Retry from `/admin/notifications`, or configure your scheduler to POST to `/api/internal/status-emails` with `Authorization: Bearer <STATUS_EMAIL_WORKER_SECRET>`. GET is not supported. Schedule calls frequently enough to handle your volume and stay within provider rate limits. No scheduler or production deployment is created by this phase.

Unconfirmed sends older than 23 hours from the first attempt are held for manual attention, rather than risking duplication outside [Resend's 24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys). Inspect Resend's delivery logs and reconcile the outbox through trusted operations before retrying these records. Never clear a receipt or reset a retry window without first checking whether the message was accepted. Messages that have never been attempted can remain queued until configuration is ready.

Expired leases are safe to retry within the window. Missing account email addresses are flagged for attention. Queued records for deleted accounts are removed by foreign-key cascade; review audit rows survive with nullable deleted-user references.

## Privacy and suspension

- Admins can read submitted details and private images, but ordinary members remain restricted to their own full profile.
- The public profile view and homepage aggregate exclude phone, WhatsApp, email, role, and review notes.
- The Storage bucket remains private. Anonymous reads are allowed only for an avatar currently referenced by an approved, verified profile. Portfolio images remain owner/admin-only until public galleries are introduced.
- Public avatar responses use `no-store` and re-check approval through anonymous Storage access. Existing signed owner/admin preview links remain usable until their short expiry; suspension cannot revoke a URL already signed by Storage.
- Suspension removes verification, hides the profile, and blocks member edits/uploads at the database layer. Members can still sign in and read the review note. Restore returns the profile to a draft, requiring fresh submission and approval.

## Verification

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run build
$env:PLAYWRIGHT_CHANNEL='msedge' # optional on Windows with Edge installed
npm run test:e2e
```

The production build, TypeScript, and ESLint pass. All **nine unit/database tests** and **ten browser tests** pass. The database tests execute the actual migrations in PGlite PostgreSQL, with emulated Supabase-owned Auth/Storage schemas. They cover role denial/revocation, self-review, stale reviews, every decision, audit protection, outbox privacy/claims/retries, safe public aggregates, avatar revocation, suspension enforcement, and category edits/reordering. Resend calls are mocked; no messages were sent during testing.

The default browser suite runs without Supabase credentials. It verifies admin route protection, forged-cookie denial, worker/avatar failure states, homepage data honesty, and the existing mobile/auth/navigation flows. Authenticated admin UI, hosted Storage, and real email delivery still need the configured-project checks below.

## Configured-project acceptance checklist

1. Use a test admin and two test members. Verify members receive a 404 for `/admin` after authentication and cannot read others' private profiles or review logs. Signed-out requests should redirect to login.
2. Submit one member profile. Find it in the review queue and inspect all details, photos, links, and contact preferences. Test the WhatsApp button without sending unless you intend to contact the member.
3. Request changes with a reason; verify the member sees the note and the account email receives the status message. Resubmit, reject with a reason, then resubmit and approve.
4. Verify the badge, approval timestamp, audit reviewer/timestamp, homepage count, category count, recent-member card, and avatar.
5. Open a review in two tabs. Change the member profile or make a decision in one tab; the stale tab must fail rather than overwrite the new state.
6. Edit an approved profile as its owner. It must return to pending and disappear from public counts and avatar delivery. Suspend and verify both the editor and direct API updates/uploads are blocked. Restore and confirm it remains unpublished as a draft.
7. Add/edit a category and reorder it; verify homepage ordering after saving. Repeat with a stale second tab and a duplicate slug.
8. Temporarily use an invalid Resend key in a test environment. Confirm decisions still commit and the email queue displays a failure. Restore the key and retry. Confirm the provider receipt is recorded and the message is not sent again on repeated retries.
9. If scheduling retries, confirm a wrong worker secret returns 401 when the worker is configured. Inspect authenticated pages on a small mobile viewport and with keyboard navigation.

## Remaining boundaries

No Supabase credentials, Resend sender, or admin account were provided. The migration has not been applied to a remote project, no hosted email or authenticated admin session has been exercised, and no deployment or scheduler has been created.

Business and course submission tables are introduced in Phases 5 and 6. Their admin dashboard slots deliberately show that they are not available yet; their queues and counts cannot be live before those tables exist. Public directories, full profile pages, contact reveal, and reporting remain Phase 4. The recent-member strip does not link to unimplemented personal pages.

Stop after Phase 3 and wait for authorization to start Phase 4.
