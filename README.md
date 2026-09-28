# Hunar Souq — Phase 1

A warm, mobile-first community talent marketplace foundation. Built with Next.js 16 App Router, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), and Supabase. Zod, React Hook Form, and their resolver are installed for Phase 2 forms.

## Run locally

Use **Node.js 22+** (see `.nvmrc`; current Supabase dependencies require it).

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without Supabase credentials, the homepage uses the same 17 launch categories bundled locally. No fake profiles or member counts are seeded.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/202609280001_categories.sql` in its SQL Editor, once. Alternatively, apply it with your normal Supabase migration workflow.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` from the project's API settings. Only a public publishable key is needed; never place a service-role key in a `NEXT_PUBLIC_` variable.
4. Set `NEXT_PUBLIC_SITE_URL` to the site's canonical origin (localhost during development).
5. Restart the application. Categories are read from Supabase with a 60-second cache. Failed reads fall back to the launch taxonomy with a visible reconnection message.
6. Run `supabase/tests/categories.sql` in SQL Editor after migration to verify the seed, RLS, anonymous reads, and rejected client writes. It rolls back all test changes.

The `categories` table contains `id`, `slug`, `name`, `description`, `icon`, and `sort_order`. RLS is enabled, and anonymous/authenticated roles have SELECT permission only. Category management is intentionally reserved for Phase 3.

## Phase 1 files

- `src/app/page.tsx`: landing page (hero, categories, process, trust, stats, community empty state, FAQs, final CTA).
- `src/app/globals.css`, `layout.tsx`, `icon.svg`, `not-found.tsx`: theme, typography, metadata, application shell, branding, 404.
- `src/app/[page]/page.tsx`: `/about`, `/privacy`, `/terms`, `/guidelines`, `/contact` and explicit coming-soon destinations for `/signup`, `/login`, `/hunar`, `/business`, `/courses`. The generic route can be replaced by specific routes in later phases.
- `src/components/`: responsive navigation/footer, Container/Section, searchable category grid, FAQ, Verified badge, shadcn Button/Card/Badge/Accordion.
- `src/lib/categories.ts`, `home.ts`: local taxonomy and cached public category reads.
- `src/lib/supabase/`: typed browser/server helpers, environment handling, database types. Auth session refresh/protection is Phase 2; these helpers alone do not secure routes.
- `public/craft-studio.jpg`: locally served, Next Image-optimized craft photography.
- `supabase/migrations/`, `supabase/tests/`: schema, seed, RLS and database verification.
- `.env.example`, `.nvmrc`, `components.json`, `package.json`, `package-lock.json`, `playwright.config.ts`, `tests/home.spec.ts`: setup and verification.
- Standard scaffold config: Next.js, TypeScript, ESLint, PostCSS and `.gitignore`.

## Verify

```powershell
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests run the production server on port 3100. They check category expansion/search/empty results, FAQ expansion, signup messaging, mobile menu navigation, mobile horizontal overflow, every linked destination, 404s, and absence of public telephone/WhatsApp links. On a machine with Edge already installed, use `$env:PLAYWRIGHT_CHANNEL='msedge'` to avoid downloading Chromium.

Manual checks: review the homepage at 375px, 768px, and desktop widths; navigate with Tab; expand all 17 categories; search for an unknown category; open the FAQs; inspect all five informational pages. With a configured Supabase project, change a category description in SQL Editor and confirm it appears after cache revalidation.

## Status and deliberate boundaries

- Phase 1 UI, design system, Supabase helpers, taxonomy migration, and static pages are implemented.
- Verified members, businesses, courses, and per-category member counts show **zero launch placeholders**, not live aggregates. The profile table does not exist until Phase 2; real aggregate wiring is scheduled in Phase 3 by the brief.
- The recently joined section displays an honest empty state. Its approved-profile horizontal strip will be connected once profiles and approvals exist. No invented people or endorsements appear.
- Registration, login, listings, contact reveal, admin review, storage uploads, courses, Resend, and Razorpay are not implemented in this phase. No email or payment keys are needed yet. Server Actions will be introduced with actual mutations in later phases.
- The contact, privacy, terms, and guidelines pages are launch drafts; the contact page does not pretend to send messages.
- No Supabase credentials were supplied, so the migration and SQL verification have not been run against a real project.
- No Vercel deployment has been made. The app is Vercel-compatible: import the repository, choose Node 22+, set the three environment variables, and use the standard Next.js build configuration when ready to deploy.

## Asset and implementation references

The pottery photograph is sourced from [Unsplash](https://images.unsplash.com/photo-1493106641515-6b5631de4bb9). It illustrates craft, not a verified member. All product copy and page composition were created for Hunar Souq. Fonts are Lora and DM Sans through `next/font`; the build needs network access to fetch them on a cold cache.

Framework setup follows the [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation) and [Supabase SSR client guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Stop after this phase. Start Phase 2 only after the user says **continue**.
