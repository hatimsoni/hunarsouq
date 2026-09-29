import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Run the actual migrations in PostgreSQL (WASM). Only Supabase-owned schemas
// and auth helpers are emulated; application policies/triggers are unmodified.
test("profile migrations enforce privacy, ownership, review transitions and media access", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(value text) returns text[] language sql immutable as $$ select (string_to_array(value,'/'))[1:array_length(string_to_array(value,'/'),1)-1] $$;
      create function storage.extension(value text) returns text language sql immutable as $$ select reverse(split_part(reverse(value),'.',1)) $$;
      grant usage on schema public,auth,storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to authenticated;
    `);
    for (const path of [
      "202609280001_categories.sql",
      "202609280002_profiles.sql",
    ])
      await db.exec(await readFile(`supabase/migrations/${path}`, "utf8"));
    const alice = "11111111-1111-4111-8111-111111111111";
    const bob = "22222222-2222-4222-8222-222222222222";
    const as = async (
      role: "anon" | "authenticated",
      id: string,
      sql: string,
    ) =>
      db.transaction(async (tx) => {
        await tx.exec(`set local role ${role};`);
        await tx.query(
          `select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)`,
          [id, role],
        );
        return tx.query<Record<string, unknown>>(sql);
      });
    await db.exec(
      `insert into auth.users(id,raw_user_meta_data) values ('${alice}','{"full_name":"Alice","role":"admin"}'),('${bob}','{"full_name":"Bob"}');`,
    );
    const own = await as(
      "authenticated",
      alice,
      "select * from public.profiles",
    );
    assert.equal(own.rows.length, 1);
    assert.equal(
      own.rows[0].role,
      "member",
      "User metadata must not grant a privileged role",
    );
    assert.equal(
      (await as("anon", "", "select * from public.public_profiles")).rows
        .length,
      0,
    );
    await assert.rejects(
      as("anon", "", "select phone from public.profiles"),
      /permission denied/,
    );
    await assert.rejects(
      as(
        "authenticated",
        alice,
        `update public.profiles set role='admin' where id='${alice}'`,
      ),
      /permission denied/,
    );
    await assert.rejects(
      as(
        "authenticated",
        alice,
        `update public.profiles set is_verified=true where id='${alice}'`,
      ),
      /permission denied/,
    );
    await assert.rejects(
      as(
        "authenticated",
        alice,
        `update public.profiles set status='approved' where id='${alice}'`,
      ),
      /Review status/,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          alice,
          `update public.profiles set full_name='Intruder' where id='${bob}' returning id`,
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      as(
        "authenticated",
        alice,
        `update public.profiles set username='admin' where id='${alice}'`,
      ),
      /check constraint/,
    );
    await assert.rejects(
      as(
        "authenticated",
        alice,
        `update public.profiles set status='pending' where id='${alice}'`,
      ),
      /check constraint/,
    );
    await as(
      "authenticated",
      alice,
      `update public.profiles set full_name='Alice Craft',username='alice_craft',category_id=(select id from public.categories limit 1),bio='I make beautiful clothes for people in my local community.',city='Pune',country='India',phone='+919876543210',email_public='alice@example.com',status='pending' where id='${alice}'`,
    );
    assert.equal(
      (await as("anon", "", "select * from public.public_profiles")).rows
        .length,
      0,
      "Pending profiles stay private",
    );
    assert.equal(
      (
        await as(
          "authenticated",
          bob,
          `select public.username_available('alice_craft') as available`,
        )
      ).rows[0].available,
      false,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          alice,
          `select public.username_available('alice_craft') as available`,
        )
      ).rows[0].available,
      true,
    );
    await assert.rejects(
      as("anon", "", `select public.username_available('alice_craft')`),
      /permission denied/,
    );
    await assert.rejects(
      as(
        "authenticated",
        bob,
        `update public.profiles set username='alice_craft' where id='${bob}'`,
      ),
      /unique constraint/,
    );
    // Trusted administrative change, outside member grants. Admin UI is Phase 3.
    await db.exec(
      `update public.profiles set status='approved',is_verified=true,approved_at=now() where id='${alice}';`,
    );
    const publicRows = await as(
      "anon",
      "",
      "select * from public.public_profiles",
    );
    assert.equal(publicRows.rows.length, 1);
    for (const field of [
      "phone",
      "whatsapp",
      "email_public",
      "rejection_note",
      "role",
      "show_call",
      "show_email",
    ])
      assert.equal(field in publicRows.rows[0], false, field);
    await as(
      "authenticated",
      alice,
      `update public.profiles set bio='My updated work still needs fresh human review before publishing.' where id='${alice}'`,
    );
    const edited = (
      await as(
        "authenticated",
        alice,
        "select status,is_verified,approved_at from public.profiles",
      )
    ).rows[0];
    assert.equal(edited.status, "pending");
    assert.equal(edited.is_verified, false);
    assert.equal(edited.approved_at, null);
    assert.equal(
      (await as("anon", "", "select * from public.public_profiles")).rows
        .length,
      0,
    );
    const path = `${alice}/12345678-1234-4234-8234-123456789012.webp`;
    await as(
      "authenticated",
      alice,
      `insert into storage.objects(bucket_id,name) values ('profile-media','${path}')`,
    );
    assert.equal(
      (await as("authenticated", bob, "select * from storage.objects")).rows
        .length,
      0,
    );
    await assert.rejects(
      as(
        "authenticated",
        bob,
        `insert into storage.objects(bucket_id,name) values ('profile-media','${alice}/bad.webp')`,
      ),
      /row-level security/,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          alice,
          `update storage.objects set name='${alice}/overwrite.webp' returning name`,
        )
      ).rows.length,
      0,
      "Uploads cannot overwrite reviewed objects",
    );
    await as(
      "authenticated",
      alice,
      `update public.profiles set photo_url='${path}' where id='${alice}'`,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          alice,
          `delete from storage.objects where name='${path}' returning name`,
        )
      ).rows.length,
      0,
      "Referenced assets cannot be deleted",
    );
    await assert.rejects(
      as(
        "authenticated",
        bob,
        `update public.profiles set photo_url='${path}' where id='${bob}'`,
      ),
      /Invalid image reference/,
    );
    await assert.rejects(
      as(
        "authenticated",
        alice,
        `update public.profiles set photo_url='${alice}/missing.webp' where id='${alice}'`,
      ),
      /Invalid image reference/,
    );
    await assert.rejects(
      as(
        "authenticated",
        alice,
        `update public.profiles set portfolio_images=array_fill('${path}'::text,array[7]) where id='${alice}'`,
      ),
      /check constraint/,
    );
    await as(
      "authenticated",
      alice,
      `update public.profiles set photo_url=null where id='${alice}'`,
    );
    assert.equal(
      (
        await as(
          "authenticated",
          alice,
          `delete from storage.objects where name='${path}' returning name`,
        )
      ).rows.length,
      1,
    );
    // Existing category regression checks run against the same database.
    await db.exec(await readFile("supabase/tests/categories.sql", "utf8"));
  } finally {
    await db.close();
  }
});
