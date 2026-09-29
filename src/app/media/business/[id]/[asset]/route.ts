import { z } from "zod";
import { publicClient } from "@/lib/directory";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; asset: string }> },
) {
  const { id, asset } = await params;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  const db = publicClient();
  if (
    !db ||
    !z.string().uuid().safeParse(id).success ||
    !(asset === "logo" || /^[0-5]$/.test(asset))
  )
    return new Response(null, { status: 404, headers });
  const { data: b } = await db
    .from("public_businesses")
    .select("logo,photos")
    .eq("id", id)
    .maybeSingle();
  const path = asset === "logo" ? b?.logo : b?.photos[Number(asset)];
  if (!path) return new Response(null, { status: 404, headers });
  const { data, error } = await db.storage
    .from("business-media")
    .download(path);
  return error || !data
    ? new Response(null, { status: 404, headers })
    : new Response(data, {
        headers: { ...headers, "Content-Type": "image/webp" },
      });
}
