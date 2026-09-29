import { z } from "zod";
import { publicClient } from "@/lib/directory";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index } = await params;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  const db = publicClient();
  if (!db || !z.string().uuid().safeParse(id).success || !/^[0-5]$/.test(index))
    return new Response(null, { status: 404, headers });
  const { data: p } = await db
    .from("public_profiles")
    .select("portfolio_images")
    .eq("id", id)
    .maybeSingle();
  const path = p?.portfolio_images[Number(index)];
  if (!path) return new Response(null, { status: 404, headers });
  const { data, error } = await db.storage.from("profile-media").download(path);
  return error || !data
    ? new Response(null, { status: 404, headers })
    : new Response(data, {
        headers: { ...headers, "Content-Type": "image/webp" },
      });
}
