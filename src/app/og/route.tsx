import { ImageResponse } from "next/og";
import { getPublicProfile } from "@/lib/directory";
import { getHomeData } from "@/lib/home";
import { getPublicBusiness } from "@/lib/businesses";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const username = params.get("username");
  const skill = params.get("skill");
  const business = params.get("business");
  const businesses = params.get("businesses");
  let title = "Good people. Beautiful skills.";
  let detail = "Discover your community on Hunar Souq";
  if (username) {
    const p = await getPublicProfile(username);
    if (!p) return new Response(null, { status: 404 });
    title = p.full_name;
    detail = `${p.city} · Verified community member`;
  } else if (businesses) {
    title = "Local businesses";
    detail = "Community businesses reviewed by Hunar Souq";
  } else if (business) {
    const item = await getPublicBusiness(business);
    if (!item) return new Response(null, { status: 404 });
    title = item.name;
    detail = `${item.city} · Verified community business`;
  } else if (skill) {
    const { categories } = await getHomeData();
    const c = categories.find((c) => c.slug === skill);
    if (!c) return new Response(null, { status: 404 });
    title = c.name;
    detail = c.description;
  }
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#faf9f5",
        color: "#175b4d",
        width: "100%",
        height: "100%",
        padding: "75px",
        borderBottom: "20px solid #dca54b",
      }}
    >
      <div style={{ display: "flex", fontSize: 32 }}>HUNAR SOUQ</div>
      <div style={{ display: "flex", fontSize: 70, lineHeight: 1.15 }}>
        {title}
      </div>
      <div style={{ display: "flex", fontSize: 28 }}>{detail}</div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "no-store" } },
  );
}
