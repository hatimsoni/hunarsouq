# Phase 6 — community courses

Phase 6 adds a course marketplace, instructor authoring, human review, enrollment, progress tracking, learner reviews and verifiable completion certificates. Paid enrollment is wired to Razorpay Orders and a signed webhook; it stays unavailable until server secrets are configured.

## Database setup

Apply `supabase/migrations/202609300006_courses.sql` once, after migrations `001` through `005` have all completed successfully. The migration adds course, module, lesson, enrollment, progress, certificate, review and payment tables with RLS; public allowlist views; instructor/admin RPCs; and the published-course homepage count. Do not rerun a migration that has already committed.

In `/admin/reviews/[member-id]`, an admin can grant instructor access to a member only after their profile is approved and verified. Instructors can build draft courses under `/account/teach`; submitted courses remain private until an admin publishes them from `/admin/courses`.

## Payment setup

For Razorpay test mode, configure:

- `NEXT_PUBLIC_RAZORPAY_KEY_ID`: public Checkout key ID.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: server-side Orders API credentials.
- `RAZORPAY_WEBHOOK_SECRET`: webhook secret configured in Razorpay Dashboard.
- `SUPABASE_SERVICE_ROLE_KEY`: required by the server to store orders and fulfill signed webhook events.

Set the Razorpay webhook URL to `https://<your-domain>/api/webhooks/razorpay` and enable `payment.captured`. The endpoint verifies the HMAC over the raw request body, matches the captured amount to the server-created order and course price, then creates the enrollment. A checkout success callback alone does not enroll a learner. Enable automatic capture in Razorpay before testing paid courses. Keep all API secrets server-side.

The database stores course prices as whole INR rupees; the server converts them to paise when creating the Razorpay order. Free courses use an authenticated database RPC and do not require payment credentials.

## Course and learner flow

- Public discovery and filters: `/courses`; detail pages: `/courses/[slug]`.
- Verified instructors can create a course, ordered modules and ordered lessons at `/account/teach`.
- Admin course review queue: `/admin/courses`.
- Enrolled learners continue at `/learn/[slug]`; lesson completion is recorded in the database and resumes at the first incomplete lesson.
- At full completion, a unique certificate code is issued and checked at `/verify/[code]`. The certificate page can be printed or saved as PDF by the browser.
- Enrolled learners can post one editable rating/review per course. Their reviews are shown only where both the course and learner profile are public.
- Course discovery URLs are included in the sitemap; course counts appear on the home page; selected Hunar categories show their courses.

## Current authoring boundaries

Course descriptions and lesson notes are plain text with preserved line breaks. Instructors provide HTTPS links for course thumbnails, videos and PDF/readings; direct uploads and rich-text editing are not part of this implementation. Module and lesson order is controlled with numeric order values. Certificate output uses browser print-to-PDF rather than a server-generated PDF file.

## Local checks

`npm run typecheck` and `npm run lint` pass. The production build completed, although Turbopack reported that it could not persist a cache file because the Windows drive was nearly full. No hosted migrations, Razorpay transaction, webhook delivery or signed-in learner flow has been verified from this workspace.
