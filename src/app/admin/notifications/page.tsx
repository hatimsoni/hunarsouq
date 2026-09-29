import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { emailConfigured } from "@/lib/email-worker";
import { parsePage } from "@/lib/admin-validation";
import { EmailRetry } from "@/components/admin/email-retry";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Status email delivery" };
export default async function Notifications({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const { supabase } = await requireAdmin();
  const { data, count, error } = await supabase
    .from("profile_status_emails")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error("Email queue could not be loaded.");
  return (
    <>
      <h1 className="text-3xl">Keep every member informed.</h1>
      <p className="mb-7 mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        Each profile status change creates a durable email record. A delivery
        failure leaves the decision intact. “Accepted” means Resend accepted the
        message, not that it reached the inbox.
      </p>
      {!emailConfigured() && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-[#e4ce98] bg-[#fbf2df] p-5 text-sm leading-7"
        >
          Email delivery is not configured. Set the server-side Resend key,
          verified sender, Supabase service-role key, and site URL. Queued
          messages remain stored.
        </p>
      )}
      <EmailRetry configured={emailConfigured()} />
      <div className="mt-7 overflow-x-auto rounded-xl border bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-secondary text-xs">
            <tr>
              {["Member", "Change", "Delivery", "Created"].map((title) => (
                <th className="px-5 py-4" scope="col" key={title}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.map((event) => (
              <tr key={event.id} className="border-b last:border-0">
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/reviews/${event.profile_id}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {event.full_name || "Member"}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.to_email || "No account email"}
                  </p>
                </td>
                <td className="px-5 py-4 capitalize">
                  {event.new_status.replaceAll("_", " ")}
                </td>
                <td className="max-w-sm px-5 py-4">
                  <p>
                    {event.sent_at
                      ? "Accepted by Resend"
                      : event.needs_attention
                        ? "Needs manual attention"
                        : event.locked_until &&
                            new Date(event.locked_until) > new Date()
                          ? "Sending"
                          : "Queued"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.attempts} attempt{event.attempts === 1 ? "" : "s"}
                  </p>
                  {event.last_error && (
                    <p className="mt-2 text-xs leading-5 text-destructive">
                      {event.last_error}
                    </p>
                  )}
                  {event.provider_id && (
                    <p className="mt-2 break-all text-xs text-muted-foreground">
                      Receipt: {event.provider_id}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">
                  {new Date(event.created_at).toISOString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No status emails yet.
          </p>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between text-sm">
        <p>
          {count ?? 0} messages · Page {page}
        </p>
        <div className="flex gap-3">
          {page > 1 && (
            <Button asChild variant="outline">
              <Link href={`/admin/notifications?page=${page - 1}`}>
                Previous
              </Link>
            </Button>
          )}
          {page * 20 < (count ?? 0) && (
            <Button asChild variant="outline">
              <Link href={`/admin/notifications?page=${page + 1}`}>Next</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
