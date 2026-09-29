import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { parsePage, searchTerm } from "@/lib/admin-validation";
import { businessTypes } from "@/lib/business-validation";
import { inputClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Business reviews" };
export default async function Businesses({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const statuses = [
    "draft",
    "pending",
    "approved",
    "rejected",
    "changes_requested",
    "suspended",
  ] as const;
  const status =
    statuses.find((candidate) => candidate === params.status) ?? "pending";
  const page = parsePage(params.page);
  const q = searchTerm(params.q);
  let query = supabase
    .from("businesses")
    .select("id,name,slug,type,city,status,updated_at,created_at,owner_id", {
      count: "exact",
    })
    .eq("status", status)
    .order("created_at", { ascending: status === "pending" })
    .order("id");
  if (q)
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,slug.ilike.%${q}%`);
  const { data, error, count } = await query.range(
    (page - 1) * 20,
    page * 20 - 1,
  );
  if (error)
    throw new Error(
      "Business listings could not be loaded. Apply the Phase 5 migration.",
    );
  return (
    <>
      <h1 className="text-4xl">Business reviews</h1>
      <p className="mt-3 text-muted-foreground">
        A listing appears publicly only when the business and its owner’s
        profile are both approved.
      </p>
      <nav aria-label="Business statuses" className="my-6 flex flex-wrap gap-4">
        {[
          "pending",
          "draft",
          "approved",
          "rejected",
          "changes_requested",
          "suspended",
        ].map((s) => (
          <Link
            key={s}
            className="capitalize underline"
            aria-current={status === s ? "page" : undefined}
            href={`/admin/businesses?status=${s}`}
          >
            {s.replaceAll("_", " ")}
          </Link>
        ))}
      </nav>
      <form className="mb-6 flex max-w-lg gap-3">
        <input
          name="q"
          defaultValue={q}
          maxLength={80}
          placeholder="Search business or city"
          aria-label="Search businesses"
          className={inputClass}
        />
        <input type="hidden" name="status" value={status} />
        <Button>Search</Button>
      </form>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary">
            <tr>
              {["Business", "Type", "City", "Updated", "Review"].map((x) => (
                <th scope="col" className="p-3" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.map((b) => (
              <tr className="border-t" key={b.id}>
                <td className="p-3 font-medium">{b.name}</td>
                <td className="p-3">{businessTypes[b.type]}</td>
                <td className="p-3">{b.city}</td>
                <td className="p-3">
                  {new Date(b.updated_at).toLocaleDateString("en-GB", {
                    timeZone: "UTC",
                  })}
                </td>
                <td className="p-3">
                  <Link
                    className="underline"
                    href={`/admin/businesses/${b.id}`}
                  >
                    Inspect listing
                  </Link>
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={5} className="p-6">
                  No {status.replaceAll("_", " ")} businesses.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <nav aria-label="Business review pages" className="mt-6 flex gap-6">
        {page > 1 && (
          <Link
            href={`/admin/businesses?status=${status}&q=${encodeURIComponent(q)}&page=${page - 1}`}
          >
            Previous
          </Link>
        )}
        {(count ?? 0) > page * 20 && (
          <Link
            href={`/admin/businesses?status=${status}&q=${encodeURIComponent(q)}&page=${page + 1}`}
          >
            Next
          </Link>
        )}
      </nav>
    </>
  );
}
