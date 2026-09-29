-- Public reads always use the approved, verified allowlist view.
begin;
create or replace function public.search_hunar(keyword text default '', skill text default '', city_filter text default '', availability_filter text default '', page_number integer default 1)
returns jsonb language sql stable security definer set search_path = '' as $$
  with matches as (
    select p.*, c.name as category_name from public.public_profiles p
    left join public.categories c on c.id=p.category_id
    where (skill='' or c.slug=skill)
      and (city_filter='' or lower(p.city)=lower(left(city_filter,100)))
      and (availability_filter='' or p.availability=availability_filter)
      and (keyword='' or strpos(lower(p.full_name || ' ' || p.bio || ' ' || array_to_string(p.sub_skills,' ')),lower(left(keyword,100)))>0)
  ), paged as (
    select * from matches order by approved_at desc nulls last,id
    limit 12 offset ((greatest(1,least(page_number,10000))-1)*12)
  ) select jsonb_build_object('total',(select count(*) from matches),'members',coalesce((select jsonb_agg(to_jsonb(paged)) from paged),'[]'::jsonb));
$$;
revoke all on function public.search_hunar(text,text,text,text,integer) from public;
grant execute on function public.search_hunar(text,text,text,text,integer) to anon,authenticated;

create or replace function public.hunar_cities() returns table(city text)
language sql stable security definer set search_path='' as $$
 select distinct city from public.public_profiles where city<>'' order by city limit 1000;
$$;
revoke all on function public.hunar_cities() from public;
grant execute on function public.hunar_cities() to anon,authenticated;

create policy "Approved portfolio images are public" on storage.objects for select to anon,authenticated
using(bucket_id='profile-media' and exists(select 1 from public.public_profiles p where storage.objects.name=any(p.portfolio_images)));

-- Store HMAC digests, never raw IP addresses. Only server credentials can use this limiter.
create table public.public_action_limits (
  key text primary key, window_start timestamptz not null, hits integer not null
);
create index public_action_limits_expiry on public.public_action_limits(window_start);
alter table public.public_action_limits enable row level security;
revoke all on public.public_action_limits from anon,authenticated;
create function public.consume_public_limit(visitor_key text, action_name text) returns boolean
language plpgsql security definer set search_path='' as $$
declare used integer; max_hits integer;
begin
 if visitor_key !~ '^[a-f0-9]{64}$' or action_name not in ('contact','report') then return false; end if;
 max_hits := case when action_name='contact' then 10 else 3 end;
 insert into public.public_action_limits as l(key,window_start,hits)
 values(action_name||':'||visitor_key,clock_timestamp(),1)
 on conflict(key) do update set
 hits=case when l.window_start<clock_timestamp()-interval '1 hour' then 1 else l.hits+1 end,
 window_start=case when l.window_start<clock_timestamp()-interval '1 hour' then clock_timestamp() else l.window_start end
 returning hits into used;
 delete from public.public_action_limits where window_start<clock_timestamp()-interval '2 days';
 return used<=max_hits;
end $$;
revoke all on function public.consume_public_limit(text,text) from public,anon,authenticated;

create function public.reveal_profile_contact(target_id uuid,visitor_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.consume_public_limit(visitor_key,'contact') then return jsonb_build_object('error','Too many requests. Try again in an hour.'); end if;
 select jsonb_build_object('phone',case when show_call then phone else '' end,
 'whatsapp',whatsapp,'email',case when show_email then email_public else '' end)
 into result from public.profiles where id=target_id and status='approved' and is_verified;
 return coalesce(result,jsonb_build_object('error','This profile is no longer available.'));
end $$;
revoke all on function public.reveal_profile_contact(uuid,text) from public,anon,authenticated;
grant execute on function public.reveal_profile_contact(uuid,text) to service_role;

create table public.reports (
 id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id) on delete set null,
 reason text not null check(reason in ('spam','misleading','inappropriate','other')),
 details text not null check(char_length(details) between 10 and 2000),
 status text not null default 'open' check(status in ('open','resolved','dismissed')),
 created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null
);
create index reports_queue on public.reports(status,created_at desc);
alter table public.reports enable row level security;
revoke all on public.reports from anon,authenticated;
grant select on public.reports to authenticated;
create policy "Admins read reports" on public.reports for select to authenticated using(public.is_admin());
create function public.report_public_profile(target_id uuid, visitor_key text, report_reason text, report_details text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if report_reason not in ('spam','misleading','inappropriate','other') or char_length(trim(report_details)) not between 10 and 2000 then return jsonb_build_object('error','Choose a reason and add 10–2000 characters.'); end if;
 if not public.consume_public_limit(visitor_key,'report') then return jsonb_build_object('error','Too many reports. Try again in an hour.'); end if;
 if not exists(select 1 from public.public_profiles where id=target_id) then return jsonb_build_object('error','This profile is no longer available.'); end if;
 insert into public.reports(profile_id,reason,details) values(target_id,report_reason,trim(report_details));
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.report_public_profile(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.report_public_profile(uuid,text,text,text) to service_role;
create function public.review_public_report(report_id uuid, decision text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=auth.uid() and role='admin' and status<>'suspended' for share;
 if not found then raise exception 'Administrator access required'; end if;
 if decision not in ('resolved','dismissed') then raise exception 'Invalid decision'; end if;
 update public.reports set status=decision,reviewed_at=now(),reviewed_by=auth.uid() where id=report_id and status='open';
 if not found then raise exception 'Report already reviewed or unavailable'; end if;
end $$;
revoke all on function public.review_public_report(uuid,text) from public,anon;
grant execute on function public.review_public_report(uuid,text) to authenticated;
commit;
