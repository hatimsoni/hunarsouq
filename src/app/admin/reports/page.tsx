import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { parsePage } from "@/lib/admin-validation";
import { ReportReview } from "@/components/admin/report-review";
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const page = parsePage(params.page);
  const status = ["resolved", "dismissed"].includes(params.status ?? "")
    ? params.status!
    : "open";
  const { data, error, count } = await supabase
    .from("reports")
    .select("*", { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (error)
    throw new Error(
      "Reports could not be loaded. Check that the directory migration has been applied.",
    );
  return (
    <>
      <h1 className="text-4xl">Profile reports</h1>
      <p className="mt-3 text-muted-foreground">
        Review the details and inspect the member before taking moderation
        action. Resolving a report does not change profile approval.
      </p>
      <nav aria-label="Report status" className="my-6 flex gap-5">
        {["open", "resolved", "dismissed"].map((s) => (
          <Link
            key={s}
            href={`/admin/reports?status=${s}`}
            aria-current={status === s ? "page" : undefined}
            className="capitalize underline"
          >
            {s}
          </Link>
        ))}
      </nav>
      <div className="space-y-5">
        {!data?.length && <p>No {status} reports.</p>}
        {data?.map((r) => (
          <article key={r.id} className="rounded-xl border bg-white p-6">
            <p className="text-sm text-muted-foreground">
              {new Date(r.created_at).toLocaleString("en-GB", {
                timeZone: "UTC",
              })}{" "}
              UTC · {r.reason}
            </p>
            <p className="my-4 whitespace-pre-wrap">{r.details}</p>
            {r.profile_id ? (
              <Link
                href={`/admin/reviews/${r.profile_id}`}
                className="underline"
              >
                Inspect member and moderation history
              </Link>
            ) : (
              <p>Profile deleted</p>
            )}
            {status === "open" && <ReportReview id={r.id} />}
          </article>
        ))}
      </div>
      <nav aria-label="Report pages" className="mt-6 flex gap-5">
        {page > 1 && (
          <Link href={`/admin/reports?status=${status}&page=${page - 1}`}>
            Previous
          </Link>
        )}
        {(count ?? 0) > page * 20 && (
          <Link href={`/admin/reports?status=${status}&page=${page + 1}`}>
            Next
          </Link>
        )}
      </nav>
    </>
  );
}
