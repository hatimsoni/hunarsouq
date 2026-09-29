// Local HTTP fixture only. No real Supabase account or outbound messages.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const id = "11111111-1111-4111-8111-111111111111";
const category = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Tailoring & Stitching",
  slug: "tailoring-stitching",
  description: "A perfect fit, made with care.",
  icon: "Scissors",
  sort_order: 1,
  member_count: 1,
};
const profile = {
  id,
  full_name: "Amina Test Artisan",
  username: "amina_test",
  photo_url: `${id}/photo.webp`,
  category_id: category.id,
  sub_skills: ["Embroidery"],
  bio: "I make thoughtful embroidered pieces for everyday life.",
  city: "Pune",
  state: "Maharashtra",
  country: "India",
  years_experience: 5,
  availability: "available",
  links: { website: "https://example.com" },
  portfolio_images: [`${id}/one.webp`, `${id}/two.webp`],
  is_verified: true,
  created_at: "2026-09-01T00:00:00Z",
  approved_at: "2026-09-02T00:00:00Z",
};
let contacts = 0,
  reports = 0;
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost:3301");
  res.setHeader("Content-Type", "application/json");
  const send = (data: unknown, status = 200) => {
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };
  if (url.pathname === "/__stats") return send({ contacts, reports });
  if (url.pathname === "/rest/v1/rpc/public_home_snapshot")
    return send({
      verified_members: 1,
      verified_businesses: 0,
      categories: [category],
      recent_members: [],
    });
  if (url.pathname === "/rest/v1/rpc/hunar_cities")
    return send([{ city: "Pune" }]);
  if (url.pathname === "/rest/v1/rpc/search_hunar")
    return send({
      total: 1,
      members: [{ ...profile, category_name: category.name }],
    });
  if (url.pathname === "/rest/v1/public_profiles") {
    const username = url.searchParams.get("username");
    const matches = !username || username === "eq.amina_test";
    return send(
      req.headers.accept?.includes("object")
        ? matches
          ? profile
          : null
        : matches
          ? [profile]
          : [],
    );
  }
  if (url.pathname.startsWith("/storage/v1/object/")) {
    res.setHeader("Content-Type", "image/jpeg");
    return res.end(await readFile("public/craft-studio.jpg"));
  }
  if (
    url.pathname === "/rest/v1/rpc/reveal_profile_contact" ||
    url.pathname === "/rest/v1/rpc/report_public_profile"
  ) {
    if (req.headers.apikey !== "fixture-service-secret")
      return send({ message: "Forbidden" }, 403);
    let body = "";
    for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    if (input.target_id !== id || !/^[a-f0-9]{64}$/.test(input.visitor_key))
      return send({ message: "Invalid request" }, 400);
    if (url.pathname.endsWith("reveal_profile_contact")) {
      contacts++;
      return send({
        phone: "+919876543210",
        whatsapp: "+919876543211",
        email: "contact-fixture@example.test",
      });
    }
    reports++;
    return send({ success: true });
  }
  send({ message: "Fixture route not found" }, 404);
});
server.listen(3301, "127.0.0.1");
