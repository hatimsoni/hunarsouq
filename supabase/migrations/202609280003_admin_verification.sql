begin;

alter table public.profiles drop constraint profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('draft','pending','approved','rejected','changes_requested','suspended'));
alter table public.categories add column updated_at timestamptz not null default now();

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and status <> 'suspended');
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;
create policy "Admins read review submissions" on public.profiles for select to authenticated using ((select public.is_admin()));
create policy "Admins inspect private profile images" on storage.objects for select to authenticated using (bucket_id = 'profile-media' and (select public.is_admin()));

-- Restrict direct member writes, including direct REST calls. Only narrow,
-- role-checked SECURITY DEFINER RPCs may bypass these member rules.
create or replace function public.guard_profile_write() returns trigger language plpgsql set search_path = '' as $$
declare path text;
begin
  if current_user in ('anon','authenticated') then
    if tg_op = 'UPDATE' and old.status = 'suspended' then
      raise exception 'Suspended profiles cannot be edited' using errcode = '42501';
    end if;
    if new.status not in ('draft','pending') then
      if tg_op <> 'UPDATE' then raise exception 'Review status is managed by administrators' using errcode = '42501'; end if;
      if new.status <> old.status then raise exception 'Review status is managed by administrators' using errcode = '42501'; end if;
    end if;
    if tg_op = 'UPDATE' then
      if (new.role,new.is_verified,new.rejection_note,new.approved_at,new.created_at,new.id)
        is distinct from (old.role,old.is_verified,old.rejection_note,old.approved_at,old.created_at,old.id)
      then raise exception 'Review fields cannot be edited by members' using errcode = '42501'; end if;
      if old.status = 'approved' then new.status := 'pending'; end if;
    elsif new.role <> 'member' or new.is_verified or new.rejection_note is not null or new.approved_at is not null then
      raise exception 'Review fields cannot be supplied by members' using errcode = '42501';
    end if;
    new.is_verified := false; new.approved_at := null;
    foreach path in array (new.portfolio_images || case when new.photo_url is null then '{}'::text[] else array[new.photo_url] end) loop
      if path not like (new.id::text || '/%') or not exists(select 1 from storage.objects o where o.bucket_id = 'profile-media' and o.name = path)
      then raise exception 'Invalid image reference' using errcode = '23514'; end if;
    end loop;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;

drop policy "Members upload their own media" on storage.objects;
create policy "Active members upload their own media" on storage.objects for insert to authenticated with check (
  bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.extension(name) = 'webp'
  and exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.status <> 'suspended')
);
-- Only the currently approved avatar is publicly readable. The bucket stays private.
create policy "Public approved avatars" on storage.objects for select to anon,authenticated using (
  bucket_id = 'profile-media' and exists(select 1 from public.public_profiles p where p.photo_url = name)
);

create table public.verification_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  reviewer_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('approve','reject','request_changes','suspend','restore')),
  from_status text not null, to_status text not null,
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index verification_logs_profile_idx on public.verification_logs(profile_id,created_at desc);
alter table public.verification_logs enable row level security;
revoke all on public.verification_logs from anon,authenticated;
grant select on public.verification_logs to authenticated;
create policy "Admins read verification history" on public.verification_logs for select to authenticated using ((select public.is_admin()));

create table public.profile_status_emails (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  to_email text not null, full_name text not null,
  new_status text not null, note text not null default '',
  created_at timestamptz not null default clock_timestamp(),
  sent_at timestamptz, provider_id text,
  attempts integer not null default 0,
  first_attempt_at timestamptz, locked_until timestamptz, lease_token uuid,
  payload jsonb,
  last_error text,
  needs_attention boolean not null default false
);
create index profile_status_emails_pending_idx on public.profile_status_emails(created_at) where sent_at is null;
alter table public.profile_status_emails enable row level security;
revoke all on public.profile_status_emails from anon,authenticated;
grant select on public.profile_status_emails to authenticated;
grant select,update on public.profile_status_emails to service_role;
create policy "Admins inspect notification delivery" on public.profile_status_emails for select to authenticated using ((select public.is_admin()));

create function public.queue_profile_status_email() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then if new.status = 'draft' then return new; end if;
  elsif old.status = new.status then return new;
  end if;
  insert into public.profile_status_emails(profile_id,to_email,full_name,new_status,note)
  select new.id,coalesce(u.email,''),new.full_name,new.status,
    case when new.status in ('rejected','changes_requested','suspended') then coalesce(new.rejection_note,'') else '' end
  from auth.users u where u.id = new.id;
  return new;
end $$;
revoke all on function public.queue_profile_status_email() from public;
create trigger queue_profile_status_email after insert or update on public.profiles for each row execute function public.queue_profile_status_email();

create function public.review_profile(target_id uuid, decision text, review_note text, expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare p public.profiles; next_status text; log_id uuid;
begin
  -- Lock the reviewer's role while making the decision; never trust JWT metadata.
  perform 1 from public.profiles where id = auth.uid() and role = 'admin' and status <> 'suspended' for share;
  if not found then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if target_id = auth.uid() then raise exception 'You cannot review your own profile' using errcode = '42501'; end if;
  select * into p from public.profiles where id = target_id for update;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
  if expected_updated_at is null or p.updated_at <> expected_updated_at then raise exception 'Submission changed; reload before reviewing' using errcode = '40001'; end if;
  if decision is null or decision not in ('approve','reject','request_changes','suspend','restore') then raise exception 'Invalid review decision' using errcode = '22023'; end if;
  if review_note is null or char_length(review_note) > 2000 then raise exception 'Invalid review note' using errcode = '22023'; end if;
  if decision in ('reject','request_changes','suspend') and char_length(trim(review_note)) < 5 then raise exception 'Explain this decision in at least 5 characters' using errcode = '22023'; end if;
  if decision in ('approve','reject','request_changes') and p.status <> 'pending' then raise exception 'Only pending submissions can be reviewed' using errcode = '22023'; end if;
  if decision = 'suspend' and (p.status = 'suspended' or p.role = 'admin') then raise exception 'This profile cannot be suspended here' using errcode = '22023'; end if;
  if decision = 'restore' and p.status <> 'suspended' then raise exception 'Only suspended profiles can be restored' using errcode = '22023'; end if;
  next_status := case decision when 'approve' then 'approved' when 'reject' then 'rejected' when 'request_changes' then 'changes_requested' when 'suspend' then 'suspended' else 'draft' end;
  update public.profiles set status=next_status,is_verified=(decision='approve'),
    approved_at=case when decision='approve' then now() else null end,
    rejection_note=case when decision in ('reject','request_changes','suspend') then trim(review_note) else null end
  where id=target_id;
  insert into public.verification_logs(profile_id,reviewer_id,action,from_status,to_status,note)
  values(target_id,auth.uid(),decision,p.status,next_status,trim(review_note)) returning id into log_id;
  return log_id;
end $$;
revoke all on function public.review_profile(uuid,text,text,timestamptz) from public,anon;
grant execute on function public.review_profile(uuid,text,text,timestamptz) to authenticated;

create function public.save_category(category_id uuid,category_slug text,category_name text,category_description text,category_icon text,expected_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(31003);
  if category_slug is null or category_name is null or category_description is null or category_icon is null or char_length(trim(category_name)) not between 1 and 100 or char_length(category_description)>250 or char_length(category_slug)>80
    or category_icon not in ('Scissors','CookingPot','Ruler','Scale','CodeXml','Cog','BookOpen','Store','HeartPulse','Calculator','Megaphone','House','Wrench','Plane','Palette','Camera','Gem')
  then raise exception 'Invalid category details' using errcode='22023'; end if;
  if category_id is null then
    insert into public.categories(slug,name,description,icon,sort_order) values(category_slug,trim(category_name),trim(category_description),category_icon,(select coalesce(max(sort_order),-1)+1 from public.categories)) returning id into result;
  else
    update public.categories set slug=category_slug,name=trim(category_name),description=trim(category_description),icon=category_icon,updated_at=clock_timestamp() where id=category_id and updated_at=expected_updated_at returning id into result;
    if result is null then raise exception 'Category changed; reload before saving' using errcode='40001'; end if;
  end if;
  return result;
end $$;
revoke all on function public.save_category(uuid,text,text,text,text,timestamptz) from public,anon;
grant execute on function public.save_category(uuid,text,text,text,text,timestamptz) to authenticated;

create function public.reorder_categories(ordered_ids uuid[],expected_order uuid[]) returns void language plpgsql security definer set search_path = '' as $$
declare current_order uuid[];
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(31003);
  select array_agg(id order by sort_order,id) into current_order from public.categories;
  if expected_order is distinct from current_order then raise exception 'Category order changed; reload first' using errcode='40001'; end if;
  if ordered_ids is null or cardinality(ordered_ids) <> cardinality(current_order) or cardinality(ordered_ids) <> (select count(distinct id) from unnest(ordered_ids) id) or not (ordered_ids @> current_order and ordered_ids <@ current_order)
  then raise exception 'Supply each category exactly once' using errcode='22023'; end if;
  update public.categories c set sort_order=u.position-1,updated_at=clock_timestamp() from unnest(ordered_ids) with ordinality u(id,position) where c.id=u.id;
end $$;
revoke all on function public.reorder_categories(uuid[],uuid[]) from public,anon;
grant execute on function public.reorder_categories(uuid[],uuid[]) to authenticated;

-- Only the server's email worker can claim deliveries, never an end user.
create function public.claim_status_email(event_id uuid,email_payload jsonb) returns setof public.profile_status_emails language plpgsql security definer set search_path = '' as $$
begin
  update public.profile_status_emails set needs_attention=true,last_error='Retry window expired; reconcile with Resend before sending again.'
  where id=event_id and sent_at is null and first_attempt_at < now()-interval '23 hours';
  return query update public.profile_status_emails set lease_token=gen_random_uuid(),locked_until=now()+interval '2 minutes',
    attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),payload=coalesce(payload,email_payload)
  where id=event_id and sent_at is null and not needs_attention and (locked_until is null or locked_until < now()) returning *;
end $$;
revoke all on function public.claim_status_email(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.claim_status_email(uuid,jsonb) to service_role;

create function public.public_home_snapshot() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'verified_members',(select count(*) from public.public_profiles),
    'categories',(select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object('member_count',(select count(*) from public.public_profiles p where p.category_id=c.id)) order by c.sort_order,c.id),'[]'::jsonb) from public.categories c),
    'recent_members',(select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from (select p.id,p.full_name,p.username,p.city,p.category_id,(p.photo_url is not null) as has_photo,p.approved_at from public.public_profiles p order by p.approved_at desc,p.id limit 8) p)
  );
$$;
revoke all on function public.public_home_snapshot() from public;
grant execute on function public.public_home_snapshot() to anon,authenticated;
commit;
