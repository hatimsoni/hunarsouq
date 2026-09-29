# Phase 5 — businesses and work experience

Implemented locally. No remote migration was applied and no real contact information was sent. Stop here until Phase 6 is authorized.

Phase 5 adds `/business` search and filters, public detail routes at `/business/[slug]`, a business editor under `/account`, work experience on member profiles, contact reveal through the existing server-only rate-limited service action, and a dedicated admin review queue. Home counts and sitemap include public businesses.

## Data and approval

Apply migrations 001 through 005 in order. The new migration is `supabase/migrations/202609290005_businesses_experience.sql`. It creates `businesses`, `work_experiences`, private `business-media` storage, admin review logs, public allowlist views, search/contact RPCs and `member_item_counts`.

The database serializes the total item count for each member across both tables, capping it at five even for overlapping submissions. Members can only write rows they own. The business owner reference, trust fields and experience ownership cannot be reassigned. Editing an approved business returns it to pending; its contact details never enter the public view. A public listing requires both its own approved and verified status and an approved and verified owner profile. Suspending either one hides it.

Work entries have no separate review queue; they are shown only inside the owner’s approved member profile. Business types are home business, shop, service, studio, online or other. `website` and `instagram` accept empty values or safe HTTPS links; phone numbers use E.164 format. Business logo/photos are private WebP objects. Only paths referenced by a public listing are publicly readable; files remain in the private bucket otherwise.

Contact requests for businesses and member profiles share the Phase 4 visitor quota. The action fetches business phone, WhatsApp and email only when Contact is opened. `show_call` gates Call, `show_email` gates Email and a present WhatsApp number enables WhatsApp. Retain `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_ACTION_SECRET` and Phase 4’s trusted-proxy setting; Phase 5 adds no environment variables.

## Files added

- `supabase/migrations/202609290005_businesses_experience.sql`
- `src/lib/business-validation.ts`, `businesses.ts`, `member-media.ts`
- `src/app/account/work/actions.ts`, `src/app/account/business/[id]/page.tsx`
- `src/components/business-editor.tsx`, `work-manager.tsx`, `public-business-detail.tsx`, `business-gallery.tsx`
- `src/app/business/page.tsx`, `[slug]/page.tsx`, `actions.ts`
- `src/app/media/business/[id]/[asset]/route.ts`
- `src/app/admin/businesses/page.tsx`, `[id]/page.tsx`, `src/components/admin/business-review.tsx`

## Files updated

- `src/app/account/actions.ts`: reuse the validated, server side image processor with the dedicated business bucket.
- `src/app/account/page.tsx`: business and work manager with the shared item count.
- `src/app/[page]/page.tsx`: serve business public detail pages alongside member and static information pages.
- `src/components/public-profile.tsx`: show approved work entries and approved businesses.
- `src/components/profile-interactions.tsx`: use the same contact sheet for member and business actions.
- `src/app/admin/actions.ts`, `src/app/admin/layout.tsx`, `src/app/admin/reviews/page.tsx`: protected business review actions and navigation.
- `src/lib/supabase/database.types.ts`: business, work, view and RPC types.
- `src/lib/home-schema.ts`, `src/lib/home.ts`, `src/app/page.tsx`, `supabase/migrations/202609290005_businesses_experience.sql`: approved-business homepage count.
- `src/app/og/route.tsx`, `src/app/sitemap.ts`, `README.md`, `docs/phase-5.md`.

## Live setup and checks

1. Apply all five SQL migrations in order to one Supabase project and configure the Phase 2–4 variables using `.env.example`. The business-media bucket is created by migration 005; do not make it public.
2. Sign in as a member with an approved profile. Add a business draft and work entries, then confirm the sixth combined item fails. Delete a work entry and confirm one space is available again.
3. Submit the business. As an admin, review it through `/admin/businesses`. Approve the listing before the owner profile: the business must remain hidden until both are approved. Check owner/contact policy choices and the review history.
4. Edit an approved business and confirm it returns to pending and immediately disappears from search, detail, OG and sitemap responses. Suspend or edit the owner profile and confirm the listing is also hidden.
5. Inspect page HTML and RSC payloads before opening Contact. Business phone/email/WhatsApp must be absent. Open Contact and confirm its action observes the same hourly quota as profile requests.
6. Verify `/business` filters/pagination, `/business/[slug]`, `/sitemap.xml`, `/og?business=...`, private media response headers and admin routes on the deployed ingress.

No live Supabase project or ingress is available in this workspace. Production RLS, browser authenticated review, trusted-IP proxy behavior and storage delivery remain to be checked after migration. ESLint, TypeScript and the production build passed; the build emitted a nonfatal Turbopack cache-write warning because disk space was low. No tests were run during Phase 5.

Workshops/courses remain Phase 6. Multi-sitemap sharding and further search performance work remain for later scaling. Continue to Phase 6 only when requested.
