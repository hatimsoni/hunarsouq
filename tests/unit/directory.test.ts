import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  directoryFilters,
  directoryHref,
} from "../../src/lib/directory-filters";

test("directory filters normalize untrusted URLs and preserve filters during pagination", () => {
  const filters = directoryFilters({
    q: " embroidery ",
    city: "Pune",
    skill: "artist",
    availability: "available",
    verified: "1",
    page: "2",
  });
  assert.equal(filters.q, "embroidery");
  assert.equal(
    directoryHref(filters, 3),
    "/hunar?q=embroidery&skill=artist&city=Pune&availability=available&verified=1&page=3",
  );
  assert.equal(
    directoryFilters({ page: "-1", q: ["one", "two"], availability: "invalid" })
      .page,
    1,
  );
  assert.equal(directoryFilters({ q: ["one", "two"] }).q, "");
  assert.equal(directoryFilters({ q: "x".repeat(200) }).q.length, 100);
});

test("public directory, contact, portfolio and reports enforce approval, privacy, quotas and admin review", async () => {
  const db = new PGlite();
  const member = "11111111-1111-4111-8111-111111111111",
    admin = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(`
 create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(value text) returns text[] language sql immutable as $$select (string_to_array(value,'/'))[1:array_length(string_to_array(value,'/'),1)-1]$$;
 create function storage.extension(value text) returns text language sql immutable as $$select reverse(split_part(reverse(value),'.',1))$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant select,insert,update,delete on storage.objects to authenticated;
 grant select on storage.objects to anon;
 `);
    for (const file of [
      "202609280001_categories.sql",
      "202609280002_profiles.sql",
      "202609280003_admin_verification.sql",
      "202609290004_public_directory.sql",
    ])
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const as = async (
      role: "anon" | "authenticated" | "service_role",
      id: string,
      sql: string,
      params: unknown[] = [],
    ) =>
      db.transaction(async (tx) => {
        await tx.exec(`set local role ${role}`);
        await tx.query(
          `select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)`,
          [id, role],
        );
        return tx.query<Record<string, unknown>>(sql, params);
      });
    await db.query(
      `insert into auth.users(id,email,raw_user_meta_data) values($1,'member@example.test','{"full_name":"Craft Member"}'),($2,'admin@example.test','{"full_name":"Reviewer"}')`,
      [member, admin],
    );
    await db.query(`update public.profiles set role='admin' where id=$1`, [
      admin,
    ]);
    const image = `${member}/12345678-1234-4234-8234-123456789012.webp`;
    await db.query(
      `insert into storage.objects(bucket_id,name) values('profile-media',$1)`,
      [image],
    );
    await db.query(
      `update public.profiles set username='craft_member',bio='Handmade clothing with care for every customer.',sub_skills=array['Embroidery'],city='Pune',country='India',category_id=(select id from public.categories order by sort_order limit 1),phone='+919876543210',whatsapp='+919876543211',email_public='public@example.test',show_call=false,show_email=false,portfolio_images=array[$2] where id=$1`,
      [member, image],
    );
    const search = async (
      q = "",
      skill = "",
      city = "",
      availability = "",
      page = 1,
    ) =>
      (
        await as(
          "anon",
          "",
          `select public.search_hunar($1,$2,$3,$4,$5) as result`,
          [q, skill, city, availability, page],
        )
      ).rows[0].result as { total: number; members: Record<string, unknown>[] };
    const contact = async (key = "a".repeat(64)) =>
      (
        await as(
          "service_role",
          "",
          `select public.reveal_profile_contact($1,$2) as result`,
          [member, key],
        )
      ).rows[0].result as Record<string, unknown>;
    assert.equal((await search()).total, 0);
    assert.match(String((await contact()).error), /no longer available/);
    await db.query(
      `update public.profiles set status='approved',is_verified=true,approved_at=now() where id=$1`,
      [member],
    );
    const found = await search("embroidery", "", "pune");
    assert.equal(found.total, 1);
    assert.equal(found.members.length, 1);
    for (const privateKey of [
      "phone",
      "whatsapp",
      "email_public",
      "show_call",
      "show_email",
      "role",
      "status",
      "rejection_note",
    ])
      assert.equal(privateKey in found.members[0], false, privateKey);
    assert.equal((await search("clothing")).total, 1);
    assert.equal((await search("Craft")).total, 1);
    assert.equal(
      (await search("%")).total,
      0,
      "Wildcards are literal search text",
    );
    assert.equal((await search("'; drop table public.profiles;--")).total, 0);
    assert.equal((await search("", "unknown")).total, 0);
    assert.equal((await search("", "", "Mumbai")).total, 0);
    assert.equal((await search("", "", "", "busy")).total, 0);
    assert.equal((await search("", "", "", "", 2)).members.length, 0);
    assert.equal(
      (await as("anon", "", "select * from public.hunar_cities()")).rows[0]
        .city,
      "Pune",
    );
    assert.equal(
      (await as("anon", "", "select * from storage.objects")).rows.length,
      1,
    );
    await assert.rejects(
      as("anon", "", "select phone from public.profiles"),
      /permission denied/,
    );
    await assert.rejects(
      as("anon", "", "select public.reveal_profile_contact($1,$2)", [
        member,
        "b".repeat(64),
      ]),
      /permission denied/,
    );
    await assert.rejects(
      as("authenticated", member, "select public.consume_public_limit($1,$2)", [
        "a".repeat(64),
        "contact",
      ]),
      /permission denied/,
    );
    assert.deepEqual(await contact("b".repeat(64)), {
      phone: "",
      whatsapp: "+919876543211",
      email: "",
    });
    await db.query(
      `update public.profiles set show_call=true,show_email=true where id=$1`,
      [member],
    );
    const revealed = await contact("c".repeat(64));
    assert.equal(revealed.phone, "+919876543210");
    assert.equal(revealed.email, "public@example.test");
    for (let i = 1; i < 10; i++)
      assert.equal((await contact("c".repeat(64))).error, undefined);
    assert.match(
      String((await contact("c".repeat(64))).error),
      /Too many requests/,
    );
    await db.exec(
      `update public.public_action_limits set window_start=now()-interval '2 hours'`,
    );
    assert.equal((await contact("c".repeat(64))).phone, "+919876543210");
    assert.ok((await contact("not-a-digest")).error);
    const report = async (key = "d".repeat(64)) =>
      (
        await as(
          "service_role",
          "",
          `select public.report_public_profile($1,$2,'misleading','The listed experience appears to be inaccurate.') as result`,
          [member, key],
        )
      ).rows[0].result as Record<string, unknown>;
    assert.equal((await report()).success, true);
    assert.equal(
      (await as("authenticated", member, "select * from public.reports")).rows
        .length,
      0,
    );
    await assert.rejects(
      as("anon", "", "select * from public.reports"),
      /permission denied/,
    );
    await assert.rejects(
      as(
        "authenticated",
        member,
        `insert into public.reports(profile_id,reason,details) values($1,'spam','Spam report details')`,
        [member],
      ),
      /permission denied/,
    );
    await assert.rejects(
      as(
        "anon",
        "",
        `select public.report_public_profile($1,$2,'spam','Spam report details')`,
        [member, "d".repeat(64)],
      ),
      /permission denied/,
    );
    const reports = await as(
      "authenticated",
      admin,
      "select * from public.reports",
    );
    assert.equal(reports.rows.length, 1);
    const reportId = reports.rows[0].id;
    await assert.rejects(
      as(
        "authenticated",
        member,
        `select public.review_public_report($1,'resolved')`,
        [reportId],
      ),
      /Administrator access/,
    );
    await as(
      "authenticated",
      admin,
      `select public.review_public_report($1,'resolved')`,
      [reportId],
    );
    const reviewed = (
      await as("authenticated", admin, "select * from public.reports")
    ).rows[0];
    assert.equal(reviewed.status, "resolved");
    assert.equal(reviewed.reviewed_by, admin);
    await assert.rejects(
      as(
        "authenticated",
        admin,
        `select public.review_public_report($1,'dismissed')`,
        [reportId],
      ),
      /already reviewed/,
    );
    await report();
    await report();
    assert.match(String((await report()).error), /Too many reports/);
    await db.query(
      `update public.profiles set status='suspended',is_verified=false where id=$1`,
      [member],
    );
    assert.equal((await search()).total, 0);
    assert.equal(
      (await as("anon", "", "select * from storage.objects")).rows.length,
      0,
    );
    assert.ok((await contact("e".repeat(64))).error);
    assert.ok((await report("f".repeat(64))).error);
  } finally {
    await db.close();
  }
});
