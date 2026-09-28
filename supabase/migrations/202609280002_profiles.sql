begin;

create function public.valid_username(value text) returns boolean
language sql immutable set search_path = '' as $$
  select value ~ '^[a-z][a-z0-9_]{2,29}$' and value <> all(array[
    'about','privacy','terms','guidelines','contact','signup','login','logout',
    'forgot-password','reset-password','hunar','business','courses','account',
    'admin','auth','api','learn','verify','settings','support','help','www',
    'sitemap','robots','favicon','constructor','prototype','__proto__'
  ]);
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  username text unique check (username is null or public.valid_username(username)),
  -- Store private Storage object paths, never expiring signed URLs.
  photo_url text,
  category_id uuid references public.categories(id),
  sub_skills text[] not null default '{}' check (cardinality(sub_skills) <= 12),
  bio text not null default '' check (char_length(bio) <= 2000),
  city text not null default '' check (char_length(city) <= 100),
  state text not null default '' check (char_length(state) <= 100),
  country text not null default '' check (char_length(country) <= 100),
  years_experience integer not null default 0 check (years_experience between 0 and 80),
  availability text not null default 'available' check (availability in ('available','busy','not_taking_work')),
  phone text not null default '' check (phone = '' or phone ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp text not null default '' check (whatsapp = '' or whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  email_public text not null default '' check (char_length(email_public) <= 254),
  show_call boolean not null default false,
  show_email boolean not null default false,
  links jsonb not null default '{}' check (jsonb_typeof(links) = 'object' and octet_length(links::text) <= 5000),
  portfolio_images text[] not null default '{}' check (cardinality(portfolio_images) <= 6),
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected','changes_requested')),
  rejection_note text,
  is_verified boolean not null default false,
  role text not null default 'member' check (role in ('member','admin','instructor')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  check (not is_verified or status = 'approved'),
  check (status not in ('pending','approved') or (
    char_length(trim(full_name)) >= 2 and username is not null and category_id is not null
    and char_length(trim(bio)) >= 30 and trim(city) <> '' and trim(country) <> ''
    and (not show_call or phone <> '') and (not show_email or email_public <> '')
  ))
);
create index profiles_category_idx on public.profiles(category_id);
create index profiles_status_idx on public.profiles(status);
create index profiles_city_idx on public.profiles(city);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id,full_name,username,photo_url,category_id,sub_skills,bio,city,state,country,years_experience,availability,phone,whatsapp,email_public,show_call,show_email,links,portfolio_images,status) on public.profiles to authenticated;
grant update (full_name,username,photo_url,category_id,sub_skills,bio,city,state,country,years_experience,availability,phone,whatsapp,email_public,show_call,show_email,links,portfolio_images,status) on public.profiles to authenticated;
create policy "Members read their own full profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Members create their own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Members edit their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Public reads are an explicit allowlist. RLS alone does not hide private columns.
-- This deliberately owner-executed, security-barrier view filters approved rows;
-- anon has NO grant to the base table and authenticated base-table reads are owner-only.
create view public.public_profiles with (security_barrier = true) as
select id, full_name, username, photo_url, category_id, sub_skills, bio, city, state, country,
  years_experience, availability, links, portfolio_images, is_verified, created_at, approved_at
from public.profiles where status = 'approved' and is_verified = true;
revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

create function public.guard_profile_write() returns trigger language plpgsql set search_path = '' as $$
declare path text;
begin
  if auth.role() = 'authenticated' then
    if new.status not in ('draft','pending') then
      -- Updates that retain the old reviewed status still require fresh review.
      if tg_op <> 'UPDATE' then raise exception 'Review status is managed by administrators' using errcode = '42501'; end if;
      if new.status <> old.status then raise exception 'Review status is managed by administrators' using errcode = '42501'; end if;
    end if;
    if tg_op = 'UPDATE' then
      if (new.role, new.is_verified, new.rejection_note, new.approved_at, new.created_at, new.id)
        is distinct from (old.role, old.is_verified, old.rejection_note, old.approved_at, old.created_at, old.id)
      then raise exception 'Review fields cannot be edited by members' using errcode = '42501'; end if;
      if old.status = 'approved' then new.status := 'pending'; end if;
    else
      if new.role <> 'member' or new.is_verified or new.rejection_note is not null or new.approved_at is not null
      then raise exception 'Review fields cannot be supplied by members' using errcode = '42501'; end if;
    end if;
    new.is_verified := false;
    new.approved_at := null;
    -- Every referenced asset must already exist in the caller's private folder.
    foreach path in array (new.portfolio_images || case when new.photo_url is null then '{}'::text[] else array[new.photo_url] end) loop
      if path not like (new.id::text || '/%') or not exists (
        select 1 from storage.objects o where o.bucket_id = 'profile-media' and o.name = path
      ) then raise exception 'Invalid image reference' using errcode = '23514'; end if;
    end loop;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_profile_write before insert or update on public.profiles for each row execute function public.guard_profile_write();

create function public.create_member_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''),100)) on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.create_member_profile() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_member_profile();
insert into public.profiles (id,full_name) select id,left(coalesce(raw_user_meta_data->>'full_name',''),100) from auth.users on conflict (id) do nothing;

create function public.username_available(candidate text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.valid_username(candidate) and not exists (
    select 1 from public.profiles where username = candidate and id <> auth.uid()
  );
$$;
revoke all on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-media','profile-media',false,2097152,array['image/webp']);
create policy "Members upload their own media" on storage.objects for insert to authenticated
with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text and storage.extension(name) = 'webp');
create policy "Members read their own media" on storage.objects for select to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Objects are immutable: no UPDATE policy. Replacing an image creates a new object.
create policy "Members remove unused media" on storage.objects for delete to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and (p.photo_url = name or name = any(p.portfolio_images))));
commit;
