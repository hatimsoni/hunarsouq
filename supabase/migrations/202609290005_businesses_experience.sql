begin;

create table public.businesses (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 2 and 100),
 slug text not null unique check(slug ~ '^[a-z][a-z0-9-]{2,79}$'),
 type text not null check(type in ('home_business','shop','service','studio','online','other')),
 description text not null default '' check(char_length(description)<=3000),
 logo text, photos text[] not null default '{}' check(cardinality(photos)<=6),
 city text not null default '' check(char_length(city)<=100), address text not null default '' check(char_length(address)<=300),
 phone text not null default '' check(phone='' or phone ~ '^\+[1-9][0-9]{7,14}$'),
 whatsapp text not null default '' check(whatsapp='' or whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
 email text not null default '' check(char_length(email)<=254),
 website text not null default '' check(char_length(website)<=700), instagram text not null default '' check(char_length(instagram)<=700),
 show_call boolean not null default false, show_email boolean not null default false,
 status text not null default 'draft' check(status in ('draft','pending','approved','rejected','changes_requested','suspended')),
 is_verified boolean not null default false, rejection_note text,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(), approved_at timestamptz,
 check(not is_verified or status='approved'),
 check(status not in ('pending','approved') or (char_length(trim(description))>=30 and trim(city)<>'')),
 check(not show_call or phone<>''), check(not show_email or email<>'')
);
create index businesses_owner on public.businesses(owner_id);
create index businesses_queue on public.businesses(status,created_at desc);
create index businesses_filters on public.businesses(type,city);
create table public.work_experiences (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(trim(title)) between 2 and 120),
 organisation text not null check(char_length(trim(organisation)) between 2 and 120),
 start_date date not null check(start_date>='1900-01-01'), end_date date,
 description text not null default '' check(char_length(description)<=2000),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 check(end_date is null or end_date>=start_date)
);
create index work_experiences_owner on public.work_experiences(profile_id,start_date desc);

alter table public.businesses enable row level security;
alter table public.work_experiences enable row level security;
revoke all on public.businesses,public.work_experiences from public,anon,authenticated;
grant select,delete on public.businesses,public.work_experiences to authenticated;
grant insert(owner_id,name,slug,type,description,logo,photos,city,address,phone,whatsapp,email,website,instagram,show_call,show_email,status) on public.businesses to authenticated;
grant update(name,slug,type,description,logo,photos,city,address,phone,whatsapp,email,website,instagram,show_call,show_email,status) on public.businesses to authenticated;
grant insert(profile_id,title,organisation,start_date,end_date,description) on public.work_experiences to authenticated;
grant update(title,organisation,start_date,end_date,description) on public.work_experiences to authenticated;
create policy "Owners and admins read businesses" on public.businesses for select to authenticated using(owner_id=auth.uid() or public.is_admin());
create policy "Owners insert businesses" on public.businesses for insert to authenticated with check(owner_id=auth.uid());
create policy "Owners update businesses" on public.businesses for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "Owners delete businesses" on public.businesses for delete to authenticated using(owner_id=auth.uid());
create policy "Owners and admins read work" on public.work_experiences for select to authenticated using(profile_id=auth.uid() or public.is_admin());
create policy "Owners insert work" on public.work_experiences for insert to authenticated with check(profile_id=auth.uid());
create policy "Owners update work" on public.work_experiences for update to authenticated using(profile_id=auth.uid()) with check(profile_id=auth.uid());
create policy "Owners delete work" on public.work_experiences for delete to authenticated using(profile_id=auth.uid());

-- Private counters serialize inserts across both tables, including concurrent transactions.
create table public.member_item_counts(profile_id uuid primary key references public.profiles(id) on delete cascade, item_count integer not null default 0 check(item_count between 0 and 5));
alter table public.member_item_counts enable row level security;
revoke all on public.member_item_counts from public,anon,authenticated;
create function public.count_member_item() returns trigger language plpgsql security definer set search_path='' as $$
declare member_id uuid;
begin
 if tg_table_name='businesses' then member_id:=case when tg_op='DELETE' then old.owner_id else new.owner_id end;
 else member_id:=case when tg_op='DELETE' then old.profile_id else new.profile_id end; end if;
 if tg_op='INSERT' then
  insert into public.member_item_counts(profile_id,item_count) values(member_id,1)
  on conflict(profile_id) do update set item_count=public.member_item_counts.item_count+1 where public.member_item_counts.item_count<5;
  if not found then raise exception 'You can add at most five businesses and work experiences combined' using errcode='23514'; end if;
  return new;
 else
  update public.member_item_counts set item_count=greatest(0,item_count-1) where profile_id=member_id;
  return old;
 end if;
end $$;
revoke all on function public.count_member_item() from public;
create trigger count_business_item after insert or delete on public.businesses for each row execute function public.count_member_item();
create trigger count_work_item after insert or delete on public.work_experiences for each row execute function public.count_member_item();

create function public.guard_business_write() returns trigger language plpgsql set search_path='' as $$
declare path text; member_id uuid;
begin
 member_id:=case when tg_op='DELETE' then old.owner_id else new.owner_id end;
 if tg_op='UPDATE' and (new.id,new.owner_id,new.created_at) is distinct from (old.id,old.owner_id,old.created_at) then raise exception 'Business ownership is immutable' using errcode='42501'; end if;
 if current_user in ('anon','authenticated') then
  perform 1 from public.profiles where id=member_id and id=auth.uid() and status<>'suspended' for share;
  if not found then raise exception 'An active owner account is required' using errcode='42501'; end if;
  if tg_op='DELETE' then
   if old.status='suspended' then raise exception 'Suspended businesses cannot be deleted' using errcode='42501'; end if;
   return old;
  end if;
  if tg_op='UPDATE' then
   if old.status='suspended' then raise exception 'Suspended businesses cannot be edited' using errcode='42501'; end if;
   if (new.is_verified,new.rejection_note,new.approved_at) is distinct from (old.is_verified,old.rejection_note,old.approved_at) then raise exception 'Review fields cannot be edited' using errcode='42501'; end if;
   if new.status not in ('draft','pending') and new.status<>old.status then raise exception 'Review status is managed by administrators' using errcode='42501'; end if;
   if old.status='approved' then new.status:='pending'; end if;
  elsif new.status not in ('draft','pending') or new.is_verified or new.rejection_note is not null or new.approved_at is not null then raise exception 'Review fields cannot be supplied' using errcode='42501';
  end if;
  new.is_verified:=false;new.approved_at:=null;
  foreach path in array (new.photos || case when new.logo is null then '{}'::text[] else array[new.logo] end) loop
   if split_part(path,'/',1)<>new.owner_id::text or array_length(string_to_array(path,'/'),1)<>2 or right(path,5)<>'.webp' or not exists(select 1 from storage.objects where bucket_id='business-media' and name=path) then raise exception 'Invalid business image reference' using errcode='23514'; end if;
  end loop;
 end if;
 if tg_op='DELETE' then return old; end if;
 new.updated_at:=clock_timestamp();return new;
end $$;
create trigger guard_business_write before insert or update or delete on public.businesses for each row execute function public.guard_business_write();
create function public.guard_work_write() returns trigger language plpgsql set search_path='' as $$
declare member_id uuid;
begin
 member_id:=case when tg_op='DELETE' then old.profile_id else new.profile_id end;
 if tg_op='UPDATE' and (new.id,new.profile_id,new.created_at) is distinct from (old.id,old.profile_id,old.created_at) then raise exception 'Work ownership is immutable' using errcode='42501'; end if;
 if current_user in ('anon','authenticated') then
  perform 1 from public.profiles where id=member_id and id=auth.uid() and status<>'suspended' for share;
  if not found then raise exception 'An active owner account is required' using errcode='42501'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 if new.start_date>current_date or new.end_date>current_date then raise exception 'Work dates cannot be in the future' using errcode='23514'; end if;
 new.updated_at:=clock_timestamp();return new;
end $$;
create trigger guard_work_write before insert or update or delete on public.work_experiences for each row execute function public.guard_work_write();

create view public.public_businesses with(security_barrier=true) as
 select b.id,b.owner_id,b.name,b.slug,b.type,b.description,b.logo,b.photos,b.city,b.address,b.website,b.instagram,b.is_verified,b.created_at,b.approved_at,p.full_name as owner_name,p.username as owner_username
 from public.businesses b join public.public_profiles p on p.id=b.owner_id where b.status='approved' and b.is_verified;
grant select on public.public_businesses to anon,authenticated;
create view public.public_work_experiences with(security_barrier=true) as
 select w.id,w.profile_id,w.title,w.organisation,w.start_date,w.end_date,w.description
 from public.work_experiences w join public.public_profiles p on p.id=w.profile_id;
grant select on public.public_work_experiences to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('business-media','business-media',false,2097152,array['image/webp']);
create policy "Owners upload business media" on storage.objects for insert to authenticated with check(bucket_id='business-media' and (storage.foldername(name))[1]=auth.uid()::text and storage.extension(name)='webp' and exists(select 1 from public.profiles where id=auth.uid() and status<>'suspended'));
create policy "Owners and admins read business media" on storage.objects for select to authenticated using(bucket_id='business-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy "Approved business media is public" on storage.objects for select to anon,authenticated using(bucket_id='business-media' and exists(select 1 from public.public_businesses b where storage.objects.name=b.logo or storage.objects.name=any(b.photos)));
create policy "Owners delete unused business media" on storage.objects for delete to authenticated using(bucket_id='business-media' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.profiles where id=auth.uid() and status<>'suspended') and not exists(select 1 from public.businesses b where b.owner_id=auth.uid() and (storage.objects.name=b.logo or storage.objects.name=any(b.photos))));

create table public.business_verification_logs (
 id uuid primary key default gen_random_uuid(),business_id uuid references public.businesses(id) on delete set null,
 reviewer_id uuid references auth.users(id) on delete set null, action text not null,
 from_status text not null,to_status text not null,note text not null default '',created_at timestamptz not null default clock_timestamp()
);
create index business_log_history on public.business_verification_logs(business_id,created_at desc);
alter table public.business_verification_logs enable row level security;
revoke all on public.business_verification_logs from public,anon,authenticated;
grant select on public.business_verification_logs to authenticated;
create policy "Admins read business history" on public.business_verification_logs for select to authenticated using(public.is_admin());
create function public.review_business(target_id uuid,decision text,review_note text,expected_updated_at timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.businesses; next_status text; log_id uuid;
begin
 perform 1 from public.profiles where id=auth.uid() and role='admin' and status<>'suspended' for share;
 if not found then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into b from public.businesses where id=target_id for update;
 if not found then raise exception 'Business not found'; end if;
 if b.owner_id=auth.uid() then raise exception 'You cannot review your own business' using errcode='42501'; end if;
 if expected_updated_at is null or b.updated_at<>expected_updated_at then raise exception 'Submission changed; reload before reviewing' using errcode='40001'; end if;
 if decision is null or decision not in ('approve','reject','request_changes','suspend','restore') then raise exception 'Invalid decision'; end if;
 if review_note is null or char_length(review_note)>2000 or (decision in ('reject','request_changes','suspend') and char_length(trim(review_note))<5) then raise exception 'Explain this decision in 5â€“2000 characters'; end if;
 if decision in ('approve','reject','request_changes') and b.status<>'pending' then raise exception 'Only pending submissions can be reviewed'; end if;
 if decision='restore' and b.status<>'suspended' then raise exception 'Only suspended businesses can be restored'; end if;
 if decision='suspend' and b.status='suspended' then raise exception 'Business is already suspended'; end if;
 next_status:=case decision when 'approve' then 'approved' when 'reject' then 'rejected' when 'request_changes' then 'changes_requested' when 'suspend' then 'suspended' else 'draft' end;
 update public.businesses set status=next_status,is_verified=(decision='approve'),approved_at=case when decision='approve' then now() else null end,rejection_note=case when decision in ('reject','request_changes','suspend') then trim(review_note) else null end where id=target_id;
 insert into public.business_verification_logs(business_id,reviewer_id,action,from_status,to_status,note) values(target_id,auth.uid(),decision,b.status,next_status,trim(review_note)) returning id into log_id;
 return log_id;
end $$;
revoke all on function public.review_business(uuid,text,text,timestamptz) from public,anon;
grant execute on function public.review_business(uuid,text,text,timestamptz) to authenticated;

create function public.search_businesses(keyword text default '',type_filter text default '',city_filter text default '',page_number integer default 1) returns jsonb language sql stable security definer set search_path='' as $$
 with matches as(select * from public.public_businesses where (type_filter='' or type=type_filter) and (city_filter='' or lower(city)=lower(left(city_filter,100))) and (keyword='' or strpos(lower(name||' '||description),lower(left(keyword,100)))>0)),
 paged as(select * from matches order by approved_at desc nulls last,id limit 12 offset ((greatest(1,least(page_number,10000))-1)*12))
 select jsonb_build_object('total',(select count(*) from matches),'businesses',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb),'cities',(select coalesce(jsonb_agg(city),'[]'::jsonb) from (select distinct city from public.public_businesses order by city limit 1000) cities));
$$;
revoke all on function public.search_businesses(text,text,text,integer) from public;
grant execute on function public.search_businesses(text,text,text,integer) to anon,authenticated;
create function public.reveal_business_contact(target_id uuid,visitor_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 -- Shared with profile contact requests: switching resource type cannot reset the quota.
 if not public.consume_public_limit(visitor_key,'contact') then return jsonb_build_object('error','Too many requests. Try again in an hour.'); end if;
 select jsonb_build_object('phone',case when b.show_call then b.phone else '' end,'whatsapp',b.whatsapp,'email',case when b.show_email then b.email else '' end) into result
 from public.businesses b join public.public_businesses published on published.id=b.id where b.id=target_id;
 return coalesce(result,jsonb_build_object('error','This business is no longer available.'));
end $$;
revoke all on function public.reveal_business_contact(uuid,text) from public,anon,authenticated;
grant execute on function public.reveal_business_contact(uuid,text) to service_role;

create or replace function public.public_home_snapshot() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'verified_members',(select count(*) from public.public_profiles),
 'verified_businesses',(select count(*) from public.public_businesses),
 'categories',(select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('member_count',(select count(*) from public.public_profiles p where p.category_id=c.id)) order by c.sort_order,c.id),'[]'::jsonb) from public.categories c),
 'recent_members',(select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from (select p.id,p.full_name,p.username,p.city,p.category_id,(p.photo_url is not null) as has_photo,p.approved_at from public.public_profiles p order by p.approved_at desc,p.id limit 8) p)
 );
$$;
revoke all on function public.public_home_snapshot() from public;
grant execute on function public.public_home_snapshot() to anon,authenticated;
commit;

