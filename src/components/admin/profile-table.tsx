import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
type Row = Pick<
  Profile,
  "id" | "full_name" | "username" | "city" | "status" | "role" | "updated_at"
>;
export function ProfileTable({
  profiles,
  page,
  total,
  path,
  query = "",
  status = "",
}: {
  profiles: Row[];
  page: number;
  total: number;
  path: string;
  query?: string;
  status?: string;
}) {
  const url = (value: number) =>
    `${path}?${new URLSearchParams({ q: query, status, page: String(value) })}`;
  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-secondary text-xs text-muted-foreground">
            <tr>
              {["Member", "City", "Status", "Last updated", ""].map(
                (label, index) => (
                  <th scope="col" key={index} className="px-5 py-4 font-medium">
                    {label || <span className="sr-only">Review</span>}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-b last:border-0">
                <td className="px-5 py-4">
                  <p className="font-medium">
                    {profile.full_name || "Unnamed member"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile.username
                      ? `@${profile.username}`
                      : "Username not set"}{" "}
                    · {profile.role}
                  </p>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {profile.city || "—"}
                </td>
                <td className="px-5 py-4">
                  <Badge
                    variant="secondary"
                    className="whitespace-nowrap capitalize"
                  >
                    {profile.status.replaceAll("_", " ")}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">
                  {new Date(profile.updated_at).toLocaleDateString("en-GB", {
                    timeZone: "UTC",
                  })}
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/admin/reviews/${profile.id}`}
                    className="inline-flex min-h-11 items-center font-medium underline underline-offset-4"
                  >
                    Open
                    <span className="sr-only">
                      {" "}
                      {profile.full_name || "member"} submission
                    </span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!profiles.length && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No members match this view.
          </p>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm">
        <p className="text-muted-foreground">
          {total} result{total === 1 ? "" : "s"} · Page {page} of{" "}
          {Math.max(1, Math.ceil(total / 20))}
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Button asChild variant="outline" className="h-11">
              <Link href={url(page - 1)}>Previous</Link>
            </Button>
          )}
          {page * 20 < total && (
            <Button asChild variant="outline" className="h-11">
              <Link href={url(page + 1)}>Next</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
