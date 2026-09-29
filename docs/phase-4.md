# Phase 4 — public directory and profiles

Implemented locally. No remote migration, deployment, real contact request or outgoing message was performed. Stop here until Phase 5 is authorized.

## What works

- `/hunar`: approved, verified member cards; name/bio/sub-skill keyword search; category, searchable city, availability and verified-only filters; GET query strings preserve filters and support links/back navigation; 12 profiles per page with deterministic sorting. All published profiles are verified, so the verified-only control currently produces the same set.
- `/[username]`: approved profile with photo, location, skills, availability, bio, experience in years, safe external links, keyboard-accessible portfolio dialog and native share/clipboard fallback. The existing `[page]` route handles usernames alongside the static information pages to avoid conflicting dynamic routes.
- Contact sheet: its server action fetches contact fields only after opening. `show_call` and `show_email` gate call/email; a supplied WhatsApp number enables WhatsApp independently. No contact fields are included in public view records, page props, directory responses, metadata or sitemap.
- Reports: anonymous visitors submit a reason and 10–2000 characters; admins see open/resolved/dismissed queues at `/admin/reports`, inspect the member, and resolve or dismiss. Closing a report does not automatically change member approval. Database records retain reviewer and time.
- Profile and category metadata, canonical URLs, generated 1200×630 Open Graph images at `/og`, `/sitemap.xml`, and `/robots.txt`. Search/city/availability/pagination variations are noindex; categories have canonical filtered URLs. Unknown/unapproved profiles and profile OG images return 404. Database failures display a retry state rather than a false empty directory.
- Public profiles, directory reads, OG images and media routes use fresh reads. Anonymous public clients are used even if the browser belongs to an admin. Revocation is checked on each request; information a visitor already received cannot be recalled.

## SQL to apply

Apply migrations in this order to the same Supabase project:

1. `supabase/migrations/202609280001_categories.sql`
2. `supabase/migrations/202609280002_profiles.sql`
3. `supabase/migrations/202609280003_admin_verification.sql`
4. **`supabase/migrations/202609290004_public_directory.sql`** (new)

Migration 004 adds directory/city RPCs over the safe public view, approved-only portfolio Storage reads, the private rate-limit table, server-only contact/report RPCs, the reports table and the admin report-review RPC. It is transactional. No contact columns receive anonymous SELECT grants. Storage stays private: only referenced assets of approved, verified profiles receive public read access. An admin uses the existing member review page to suspend a reported profile.

## Environment

Retain the Phase 2/3 settings in `.env.example`. Phase 4 needs:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Same project as all four migrations |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anonymous safe directory/Storage reads |
| `NEXT_PUBLIC_SITE_URL` | Actual site origin for canonical metadata, shares and sitemap |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only execution of contact/report RPCs |
| `PUBLIC_ACTION_SECRET` | New server-only random HMAC secret, at least 32 characters |
| `PUBLIC_ACTION_IP_HEADER` | Optional trusted ingress header containing exactly one IP address |

Generate `PUBLIC_ACTION_SECRET` with a password manager or `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep it stable across instances. Do not prefix either secret with `NEXT_PUBLIC_`.

Only set the IP header when your ingress **overwrites it**, and block direct access to the application origin. The app deliberately does not infer trust from ordinary forwarded headers. With no valid configured header, all visitors use a shared quota. This is safe for initial setup but restricts the whole site's contact flow to 10 requests/hour and reports to 3/hour. With a trusted header, those limits apply per IP across all profiles and application instances. Only HMAC digests are stored; raw IPs are not recorded by this limiter. Expired rows are removed on subsequent actions after two days. Hosting request logs remain subject to the host's settings.

Missing keys/secret make contact and reporting return a friendly unavailable message. Directory browsing still works with the public Supabase settings. No Supabase configuration shows an honest setup state without sample members.

## Files created

- `supabase/migrations/202609290004_public_directory.sql`
- `src/lib/directory.ts`, `directory-filters.ts`, `public-actions.ts`
- `src/app/hunar/page.tsx`, `actions.ts`, `error.tsx`
- `src/app/[page]/error.tsx`
- `src/components/public-profile.tsx`, `profile-interactions.tsx`
- `src/app/media/member-portfolio/[id]/[index]/route.ts`
- `src/app/admin/reports/page.tsx`, `actions.ts`
- `src/components/admin/report-review.tsx`
- `src/app/og/route.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`
- `tests/unit/directory.test.ts`, `tests/directory.spec.ts`
- `tests/fixtures/public-service.ts`, `tests/public/profile.spec.ts`, `playwright.public.config.ts`
- `docs/phase-4.md`

## Files updated

- `src/app/[page]/page.tsx`: profile routing/metadata and current information copy.
- `src/app/admin/layout.tsx`: Reports navigation.
- `src/app/layout.tsx`: declare the existing smooth-scroll behavior for Next navigation.
- `src/components/recent-members.tsx`: profile links.
- `src/lib/supabase/database.types.ts`: new table/RPC contracts.
- `.env.example`, `README.md`, `package.json`: setup, handoff, unit-test command.
- `next.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `.gitignore`, `tsconfig.json`: isolated fixture-browser test build output, test selection and generated-file exclusions/types. `HUNAR_PUBLIC_TEST=1` is for the fixture harness only; production continues to use `.next`.

## Tests

Use Node 22 or later. Commands:

```powershell
npm run test:unit
npm run lint
npm run build
npm run typecheck
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:e2e
npx playwright test --config playwright.public.config.ts
```

The default browser suite expects public Supabase settings to be absent; the separate profile suite uses a disposable HTTP fixture on `127.0.0.1:3301` and a dev server on `localhost:3201`, with separate `.next-public-test` output. It does not touch a real Supabase project or the existing dev server on port 3000. Run the browser suites sequentially because they share Playwright's result directory. If Edge is unavailable, select an installed Chromium browser or install Playwright Chromium and adjust the channel.

Validation completed: production build, TypeScript, ESLint, 11 unit/database tests, 12 default browser tests, and 1 fixture browser test. The PGlite tests execute all four migrations with emulated auth/Storage roles and verify search, pagination, hidden contact fields, preference gates, denied direct RPC calls, quota reset/exhaustion, report RLS/admin decisions and suspension removing portfolio/contact access. The fixture browser test checks raw initial HTML for private contact values, zero contact fetches before tap, Call/WhatsApp/Email links after tap, gallery navigation/Escape, report submission and mobile overflow.

## Live acceptance checklist

1. Apply all migrations and configure the environment. Create member/admin accounts using the Phase 2/3 setup.
2. Submit two members with different skills/cities/availability and photos/portfolio images. Approve one. Confirm only the approved member appears on home, directory, profile and sitemap.
3. Search by name, bio and sub-skill; combine city/category/availability filters, reload and navigate back. Use more than 12 approved profiles to exercise Next/Previous.
4. Inspect page HTML and RSC responses before opening Contact: private phone, WhatsApp and email values must be absent. Open Contact, toggle member preferences through a reviewed edit, and check again after reapproval. The eleventh contact request in the same quota window must be rejected.
5. Submit a report; sign in as admin and resolve/dismiss it. Member/anonymous database roles must not read reports. Review/suspend the member separately if appropriate.
6. Suspend the approved profile, then request its URL, OG image and media URLs again. The profile must disappear and contact requests must fail. Restore and reapprove through the existing moderation flow.
7. Check share previews, keyboard navigation/focus return and portfolio images on real mobile devices. Verify trusted proxy overwrite behavior before relying on per-IP quotas.

## Incomplete / later phases

- No connected Supabase project or production ingress is available here, so real hosted RLS/Storage behavior, trusted IP handling and authenticated admin browser review still need the live checklist. The database tests use PGlite; the profile browser test uses an HTTP fixture.
- Work-experience entries and businesses depend on Phase 5 tables. Profiles currently show years of experience and explain that business listings/courses are coming. No fake records or premature Phase 5 tables were added.
- Courses taught depend on Phase 6 and will be wired into profiles/category pages then.
- City suggestions are capped at 1,000 distinct published cities (free text still searches other cities); directory pages are capped at 10,000. The initial sitemap includes up to 49,000 profiles plus category/static URLs; shard it before growing beyond that scale. Search uses literal case-insensitive substrings; full-text ranking is a later scale optimization.
- Final legal/support copy, production deployment, monitoring and broader performance work remain outside this phase.

Phase 5 starts only after the next **continue**.
