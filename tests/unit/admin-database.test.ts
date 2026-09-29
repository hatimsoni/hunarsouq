import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { homeSnapshotSchema } from "../../src/lib/home-schema";

test("admin migration enforces review, audit, suspension, taxonomy and notification boundaries", async () => {
  const db = new PGlite();
  const admin = "33333333-3333-4333-8333-333333333333";
  const alice = "11111111-1111-4111-8111-111111111111";
  const bob = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(value text) returns text[] language sql immutable as $$ select (string_to_array(value,'/'))[1:array_length(string_to_array(value,'/'),1)-1] $$;
      create function storage.extension(value text) returns text language sql immutable as $$ select reverse(split_part(reverse(value),'.',1)) $$;
      grant usage on schema public,auth,storage to anon,authenticated,service_role;
      grant select,insert,update,delete on storage.objects to authenticated;
      grant select on storage.objects to anon;
    `);
    for (const file of [
      "202609280001_categories.sql",
      "202609280002_profiles.sql",
      "202609280003_admin_verification.sql",
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
      `insert into auth.users(id,email,raw_user_meta_data) values ($1,'admin@example.test','{"full_name":"Reviewer"}'),($2,'alice@example.test','{"full_name":"Alice Craft"}'),($3,'bob@example.test','{"full_name":"Bob Smith"}')`,
      [admin, alice, bob],
    );
    await db.query(`update public.profiles set role='admin' where id=$1`, [
      admin,
    ]);
    assert.equal(
      (await as("authenticated", alice, `select public.is_admin() as allowed`))
        .rows[0].allowed,
      false,
    );
    assert.equal(
      (await as("authenticated", admin, `select public.is_admin() as allowed`))
        .rows[0].allowed,
      true,
    );
    assert.equal(
      (await as("authenticated", admin, "select * from public.profiles")).rows
        .length,
      3,
    );
    assert.equal(
      (await as("authenticated", alice, "select * from public.profiles")).rows
        .length,
      1,
    );
    assert.equal(
      (await as("anon", "", "select * from public.public_profiles")).rows
        .length,
      0,
    );
    await assert.rejects(
      as("anon", "", "select public.is_admin()"),
      /permission denied/,
    );
    const revision = async (id: string) =>
      String(
        (
          await db.query<{ value: string }>(
            `select updated_at::text as value from public.profiles where id=$1`,
            [id],
          )
        ).rows[0].value,
      );
    const review = async (
      actor: string,
      id: string,
      decision: string,
      note = "",
      rev?: string,
    ) =>
      as(
        "authenticated",
        actor,
        `select public.review_profile($1,$2,$3,$4) as id`,
        [id, decision, note, rev ?? (await revision(id))],
      );
    await assert.rejects(review(alice, bob, "approve"), /Administrator access/);
    await assert.rejects(review(admin, admin, "approve"), /own profile/);
    await assert.rejects(review(admin, alice, "approve"), /Only pending/);
    const avatar = `${alice}/12345678-1234-4234-8234-123456789012.webp`;
    const portfolio = `${alice}/99999999-1234-4234-8234-123456789012.webp`;
    await as(
      "authenticated",
      alice,
      `insert into storage.objects(bucket_id,name) values ('profile-media',$1),('profile-media',$2)`,
      [avatar, portfolio],
    );
    await as(
      "authenticated",
      alice,
      `update public.profiles set username='alice_craft',category_id=(select id from public.categories order by sort_order limit 1),bio='I make carefully stitched clothes for people in my community.',city='Pune',country='India',phone='+919876543210',photo_url=$2,portfolio_images=array[$3],status='pending' where id=$1`,
      [alice, avatar, portfolio],
    );
    assert.equal(
      (await as("authenticated", admin, "select * from storage.objects")).rows
        .length,
      2,
    );
    assert.equal(
      (await as("anon", "", "select * from storage.objects")).rows.length,
      0,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          alice,
          "select * from public.profile_status_emails",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          admin,
          "select * from public.profile_status_emails",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      as(
        "authenticated",
        alice,
        "select public.claim_status_email(gen_random_uuid(),$1)",
        [{}],
      ),
      /permission denied/,
    );
    await assert.rejects(review(admin, alice, "reject", ""), /at least 5/);
    const stale = await revision(alice);
    await as(
      "authenticated",
      alice,
      `update public.profiles set city='Mumbai' where id=$1`,
      [alice],
    );
    await assert.rejects(
      review(admin, alice, "approve", "", stale),
      /Submission changed/,
    );
    await review(admin, alice, "approve");
    let profile = (
      await db.query<{
        status: string;
        is_verified: boolean;
        approved_at: string | null;
      }>(
        `select status,is_verified,approved_at from public.profiles where id=$1`,
        [alice],
      )
    ).rows[0];
    assert.equal(profile.status, "approved");
    assert.equal(profile.is_verified, true);
    assert.ok(profile.approved_at);
    let snapshot = homeSnapshotSchema.parse(
      (await as("anon", "", "select public.public_home_snapshot() as data"))
        .rows[0].data,
    );
    assert.equal(snapshot.verified_members, 1);
    assert.equal(snapshot.recent_members[0].username, "alice_craft");
    assert.equal(
      snapshot.categories.reduce((sum, c) => sum + c.member_count, 0),
      1,
    );
    assert.equal(
      (await as("anon", "", "select * from storage.objects")).rows.length,
      1,
      "Only the approved avatar is readable, not portfolio uploads",
    );
    assert.equal(
      (await as("authenticated", bob, "select * from public.profiles")).rows
        .length,
      1,
    );
    const log = (
      await as("authenticated", admin, "select * from public.verification_logs")
    ).rows[0];
    assert.equal(log.reviewer_id, admin);
    assert.equal(log.action, "approve");
    assert.equal(log.to_status, "approved");
    assert.ok(log.created_at);
    assert.equal(
      (
        await as(
          "authenticated",
          alice,
          "select * from public.verification_logs",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      as(
        "authenticated",
        admin,
        `update public.verification_logs set note='tampered'`,
      ),
      /permission denied/,
    );
    await assert.rejects(
      as(
        "authenticated",
        admin,
        `update public.profiles set is_verified=true where id=$1`,
        [bob],
      ),
      /permission denied/,
    );
    await as(
      "authenticated",
      alice,
      `update public.profiles set city='Pune' where id=$1`,
      [alice],
    );
    assert.equal(
      (await as("anon", "", "select * from storage.objects")).rows.length,
      0,
      "Editing revokes anonymous avatar access",
    );
    snapshot = homeSnapshotSchema.parse(
      (await as("anon", "", "select public.public_home_snapshot() as data"))
        .rows[0].data,
    );
    assert.equal(snapshot.verified_members, 0);
    assert.equal(snapshot.recent_members.length, 0);
    await review(
      admin,
      alice,
      "request_changes",
      "Please add clear photos of your work.",
    );
    await as(
      "authenticated",
      alice,
      `update public.profiles set status='pending' where id=$1`,
      [alice],
    );
    await review(
      admin,
      alice,
      "reject",
      "The work samples do not match this profile.",
    );
    await as(
      "authenticated",
      alice,
      `update public.profiles set status='pending' where id=$1`,
      [alice],
    );
    await review(admin, alice, "approve");
    await review(admin, alice, "suspend", "We need to investigate a report.");
    profile = (
      await db.query(
        `select status,is_verified,approved_at from public.profiles where id=$1`,
        [alice],
      )
    ).rows[0] as typeof profile;
    assert.equal(profile.status, "suspended");
    assert.equal(profile.is_verified, false);
    assert.equal(profile.approved_at, null);
    await assert.rejects(
      as(
        "authenticated",
        alice,
        `update public.profiles set status='pending' where id=$1`,
        [alice],
      ),
      /Suspended profiles/,
    );
    await assert.rejects(
      as(
        "authenticated",
        alice,
        `insert into storage.objects(bucket_id,name) values ('profile-media',$1)`,
        [`${alice}/suspended.webp`],
      ),
      /row-level security/,
    );
    await review(admin, alice, "restore");
    assert.equal(
      (await as("authenticated", alice, "select status from public.profiles"))
        .rows[0].status,
      "draft",
    );
    assert.equal(
      (await as("anon", "", "select * from public.public_profiles")).rows
        .length,
      0,
      "Restoring never republishes without review",
    );
    // Categories: only checked RPCs can write, and stale edits/order changes fail.
    await assert.rejects(
      as(
        "authenticated",
        alice,
        `select public.save_category(null,'new-skill','New skill','','Palette',null)`,
      ),
      /Administrator access/,
    );
    await assert.rejects(
      as(
        "authenticated",
        admin,
        `update public.categories set name='Direct write'`,
      ),
      /permission denied/,
    );
    const newId = String(
      (
        await as(
          "authenticated",
          admin,
          `select public.save_category(null,'woodwork','Woodwork','Made by hand.','Wrench',null) as id`,
        )
      ).rows[0].id,
    );
    await assert.rejects(
      as(
        "authenticated",
        admin,
        `select public.save_category(null,'woodwork','Duplicate','','Wrench',null)`,
      ),
      /unique constraint/,
    );
    const categoryRevision = String(
      (
        await db.query<{ revision: string }>(
          `select updated_at::text as revision from public.categories where id=$1`,
          [newId],
        )
      ).rows[0].revision,
    );
    await as(
      "authenticated",
      admin,
      `select public.save_category($1,'woodwork','Woodwork & joinery','Made with care.','Wrench',$2)`,
      [newId, categoryRevision],
    );
    await assert.rejects(
      as(
        "authenticated",
        admin,
        `select public.save_category($1,'woodwork','Stale','','Wrench',$2)`,
        [newId, categoryRevision],
      ),
      /Category changed/,
    );
    const order = (
      await db.query<{ id: string }>(
        `select id from public.categories order by sort_order,id`,
      )
    ).rows.map((c) => c.id);
    await assert.rejects(
      as("authenticated", admin, `select public.reorder_categories($1,$2)`, [
        [order[0], ...order.slice(0, -1)],
        order,
      ]),
      /exactly once/,
    );
    await as(
      "authenticated",
      admin,
      `select public.reorder_categories($1,$2)`,
      [[...order].reverse(), order],
    );
    await assert.rejects(
      as("authenticated", admin, `select public.reorder_categories($1,$2)`, [
        order,
        order,
      ]),
      /order changed/,
    );
    assert.equal(
      (await as("anon", "", "select public.public_home_snapshot() as data"))
        .rows.length,
      1,
    );
    // Outbox: ordered, exclusive claims; immutable retry payload; acknowledgement;
    // expired idempotency windows go to manual reconciliation instead of re-sending.
    const events = (
      await db.query<{ id: string; to_email: string }>(
        `select id,to_email from public.profile_status_emails order by created_at,id`,
      )
    ).rows;
    assert.ok(events.length >= 8);
    assert.equal(events[0].to_email, "alice@example.test");
    const payload = {
      from: "review@example.test",
      to: ["alice@example.test"],
      subject: "Profile status",
      text: "Example",
    };
    assert.equal(
      (
        await as(
          "service_role",
          "",
          `select * from public.claim_status_email($1,$2)`,
          [events[1].id, payload],
        )
      ).rows.length,
      0,
      "Later email waits for earlier status",
    );
    const claim = (
      await as(
        "service_role",
        "",
        `select * from public.claim_status_email($1,$2)`,
        [events[0].id, payload],
      )
    ).rows[0];
    assert.ok(claim.lease_token);
    assert.equal(claim.attempts, 1);
    assert.equal(
      (
        await as(
          "service_role",
          "",
          `select * from public.claim_status_email($1,$2)`,
          [events[0].id, payload],
        )
      ).rows.length,
      0,
      "Live lease prevents duplicate worker",
    );
    await db.query(
      `update public.profile_status_emails set locked_until=now()-interval '1 second' where id=$1`,
      [events[0].id],
    );
    const retry = (
      await as(
        "service_role",
        "",
        `select * from public.claim_status_email($1,$2)`,
        [events[0].id, { ...payload, subject: "Changed" }],
      )
    ).rows[0];
    assert.deepEqual(
      retry.payload,
      payload,
      "Retries must use the exact original payload",
    );
    await as(
      "service_role",
      "",
      `update public.profile_status_emails set sent_at=now(),provider_id='mock-receipt',locked_until=null where id=$1 and lease_token=$2`,
      [events[0].id, retry.lease_token],
    );
    assert.equal(
      (
        await as(
          "service_role",
          "",
          `select * from public.claim_status_email($1,$2)`,
          [events[0].id, payload],
        )
      ).rows.length,
      0,
    );
    await as(
      "service_role",
      "",
      `select * from public.claim_status_email($1,$2)`,
      [events[1].id, payload],
    );
    await db.query(
      `update public.profile_status_emails set first_attempt_at=now()-interval '24 hours',locked_until=null where id=$1`,
      [events[1].id],
    );
    assert.equal(
      (
        await as(
          "service_role",
          "",
          `select * from public.claim_status_email($1,$2)`,
          [events[1].id, payload],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query<{ needs_attention: boolean }>(
          `select needs_attention from public.profile_status_emails where id=$1`,
          [events[1].id],
        )
      ).rows[0].needs_attention,
      true,
    );
    await db.query(`update public.profiles set role='member' where id=$1`, [
      admin,
    ]);
    await assert.rejects(
      review(admin, alice, "suspend", "No longer authorized."),
      /Administrator access/,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          admin,
          "select * from public.verification_logs",
        )
      ).rows.length,
      0,
      "Revocation takes effect without replacing JWTs",
    );
  } finally {
    await db.close();
  }
});
