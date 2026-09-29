-- Phase 6: instructor-led courses, learner access, completion and payments.
-- Apply once, after migrations 001–005.
begin;

create table public.courses (
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(trim(title)) between 3 and 140),
 slug text not null unique check(slug ~ '^[a-z][a-z0-9-]{2,100}$'),
 category_id uuid not null references public.categories(id),
 instructor_id uuid not null references public.profiles(id) on delete cascade,
 thumbnail text,
 short_description text not null check(char_length(trim(short_description)) between 20 and 240),
 description text not null check(char_length(trim(description)) between 40 and 20000),
 level text not null check(level in ('beginner','intermediate','advanced')),
 language text not null default 'English' check(char_length(trim(language)) between 2 and 60),
 duration_text text not null check(char_length(trim(duration_text)) between 2 and 80),
 price integer not null default 0 check(price between 0 and 10000000),
 status text not null default 'draft' check(status in ('draft','pending','published','rejected','changes_requested')),
 review_note text,
 is_featured boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index courses_category_idx on public.courses(category_id,status);
create index courses_instructor_idx on public.courses(instructor_id,created_at desc);
create index courses_status_idx on public.courses(status,created_at desc);
create function public.touch_course_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at:=clock_timestamp(); return new; end $$;
create trigger touch_course_updated_at before update on public.courses for each row execute function public.touch_course_updated_at();

create table public.course_modules (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
 title text not null check(char_length(trim(title)) between 2 and 140), sort_order integer not null default 0 check(sort_order>=0),
 unique(course_id,sort_order)
);
create index course_modules_course_idx on public.course_modules(course_id,sort_order);

create table public.lessons (
 id uuid primary key default gen_random_uuid(), module_id uuid not null references public.course_modules(id) on delete cascade,
 title text not null check(char_length(trim(title)) between 2 and 140),
 type text not null check(type in ('video','text','pdf')),
 video_url text, content text not null default '' check(char_length(content)<=30000), attachment_url text,
 duration_minutes integer not null default 0 check(duration_minutes between 0 and 600),
 is_preview boolean not null default false, sort_order integer not null default 0 check(sort_order>=0),
 unique(module_id,sort_order),
 check((type='video' and video_url is not null) or (type<>'video'))
);
create index lessons_module_idx on public.lessons(module_id,sort_order);

create table public.enrollments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 enrolled_at timestamptz not null default now(), completed_at timestamptz,
 unique(user_id,course_id)
);
create index enrollments_course_idx on public.enrollments(course_id,enrolled_at desc);
create index enrollments_user_idx on public.enrollments(user_id,enrolled_at desc);

create table public.lesson_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 completed_at timestamptz not null default now(), primary key(user_id,lesson_id)
);

create table public.certificates (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 certificate_code text not null unique,
 issued_at timestamptz not null default now(), unique(user_id,course_id)
);
create index certificates_code_idx on public.certificates(certificate_code);

create table public.course_reviews (
 user_id uuid not null references auth.users(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 rating integer not null check(rating between 1 and 5),
 comment text not null default '' check(char_length(comment)<=1200),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(user_id,course_id)
);

create table public.payments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 razorpay_order_id text not null unique, razorpay_payment_id text unique,
 amount integer not null check(amount>0), status text not null default 'created' check(status in ('created','paid','failed','refunded')),
 created_at timestamptz not null default now(), paid_at timestamptz,
 unique(user_id,course_id,razorpay_order_id)
);
create index payments_course_idx on public.payments(course_id,status,created_at desc);

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.certificates enable row level security;
alter table public.course_reviews enable row level security;
alter table public.payments enable row level security;
revoke all on public.courses,public.course_modules,public.lessons,public.enrollments,public.lesson_progress,public.certificates,public.course_reviews,public.payments from public,anon,authenticated;

grant select,delete on public.courses to authenticated;
grant insert(title,slug,category_id,instructor_id,thumbnail,short_description,description,level,language,duration_text,price,status) on public.courses to authenticated;
grant update(title,slug,category_id,thumbnail,short_description,description,level,language,duration_text,price,status) on public.courses to authenticated;
grant select on public.course_modules,public.lessons to anon,authenticated;
grant insert,update,delete on public.course_modules,public.lessons to authenticated;
grant select on public.enrollments,public.lesson_progress,public.certificates to authenticated;
grant select,insert,update on public.course_reviews to authenticated;
grant all on public.payments to service_role;

-- Definer helpers let the anonymous curriculum read published content while
-- the private courses and enrollment tables remain unavailable to visitors.
create function public.course_content_visible(target_course uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.courses c where c.id=target_course and
  (c.status='published' or c.instructor_id=auth.uid() or public.is_admin() or
   exists(select 1 from public.enrollments e where e.course_id=c.id and e.user_id=auth.uid())))
$$;
revoke all on function public.course_content_visible(uuid) from public;
grant execute on function public.course_content_visible(uuid) to anon,authenticated;

create function public.lesson_content_visible(target_lesson uuid,preview boolean) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.lessons l join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id
  where l.id=target_lesson and ((c.status='published' and (preview or public.course_content_visible(c.id))) or c.instructor_id=auth.uid() or public.is_admin() or exists(select 1 from public.enrollments e where e.course_id=c.id and e.user_id=auth.uid())))
$$;
revoke all on function public.lesson_content_visible(uuid,boolean) from public;
grant execute on function public.lesson_content_visible(uuid,boolean) to anon,authenticated;

create policy "Course owners and admins read courses" on public.courses for select to authenticated
 using(instructor_id=auth.uid() or public.is_admin() or exists(select 1 from public.enrollments e where e.course_id=courses.id and e.user_id=auth.uid()));
create policy "Verified instructors create courses" on public.courses for insert to authenticated
 with check(instructor_id=auth.uid() and status in ('draft','pending') and exists(
  select 1 from public.profiles p where p.id=auth.uid() and p.role='instructor' and p.status='approved' and p.is_verified));
create policy "Course owners edit unreviewed courses" on public.courses for update to authenticated
 using(instructor_id=auth.uid() and status in ('draft','pending','rejected','changes_requested','published'))
 with check(instructor_id=auth.uid() and status in ('draft','pending') and exists(
  select 1 from public.profiles p where p.id=auth.uid() and p.role='instructor' and p.status='approved' and p.is_verified));
create policy "Course owners delete drafts" on public.courses for delete to authenticated using(instructor_id=auth.uid() and status='draft');
create policy "Admins review courses" on public.courses for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Read course modules when visible" on public.course_modules for select to anon,authenticated using(
 public.course_content_visible(course_id)
);
create policy "Course owners manage modules" on public.course_modules for all to authenticated using(
 exists(select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid() and c.status in ('draft','pending','rejected','changes_requested') and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='instructor' and p.status='approved' and p.is_verified))
) with check(
 exists(select 1 from public.courses c where c.id=course_id and c.instructor_id=auth.uid() and c.status in ('draft','pending','rejected','changes_requested') and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='instructor' and p.status='approved' and p.is_verified))
);
create policy "Admins manage course modules" on public.course_modules for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Read lessons by preview or enrollment" on public.lessons for select to anon,authenticated using(
 public.lesson_content_visible(id,is_preview)
);
create policy "Course owners manage lessons" on public.lessons for all to authenticated using(
 exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and c.instructor_id=auth.uid() and c.status in ('draft','pending','rejected','changes_requested') and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='instructor' and p.status='approved' and p.is_verified))
) with check(
 exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and c.instructor_id=auth.uid() and c.status in ('draft','pending','rejected','changes_requested') and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='instructor' and p.status='approved' and p.is_verified))
);
create policy "Admins manage lessons" on public.lessons for all to authenticated using(public.is_admin()) with check(public.is_admin());

create policy "Learners read own enrollments" on public.enrollments for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy "Learners read own progress" on public.lesson_progress for select to authenticated using(user_id=auth.uid());
create policy "Learners read own certificates" on public.certificates for select to authenticated using(user_id=auth.uid());
create policy "Reviews visible on published courses" on public.course_reviews for select to anon,authenticated using(public.course_content_visible(course_id));
create policy "Enrolled learners write own review" on public.course_reviews for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.enrollments e where e.user_id=auth.uid() and e.course_id=course_reviews.course_id));
create policy "Enrolled learners edit own review" on public.course_reviews for update to authenticated using(user_id=auth.uid() and exists(select 1 from public.enrollments e where e.user_id=auth.uid() and e.course_id=course_reviews.course_id)) with check(user_id=auth.uid() and exists(select 1 from public.enrollments e where e.user_id=auth.uid() and e.course_id=course_reviews.course_id));
create policy "Admins read payments" on public.payments for select to authenticated using(public.is_admin());

create view public.public_courses with(security_barrier=true) as
 select c.id,c.title,c.slug,c.category_id,c.instructor_id,c.thumbnail,c.short_description,c.description,c.level,c.language,c.duration_text,c.price,c.created_at,c.updated_at,
 p.full_name as instructor_name,p.username as instructor_username,p.photo_url as instructor_photo,p.is_verified as instructor_verified,
 (select count(*) from public.enrollments e where e.course_id=c.id) as learner_count,
 (select count(*) from public.course_modules m where m.course_id=c.id) as module_count,
 (select coalesce(sum(l.duration_minutes),0) from public.course_modules m join public.lessons l on l.module_id=m.id where m.course_id=c.id) as total_minutes,
 (select round(avg(r.rating)::numeric,1) from public.course_reviews r where r.course_id=c.id) as average_rating,
 (select count(*) from public.course_reviews r where r.course_id=c.id) as review_count
 from public.courses c join public.public_profiles p on p.id=c.instructor_id where c.status='published';
revoke all on public.public_courses from public;
grant select on public.public_courses to anon,authenticated;

create view public.public_course_reviews with(security_barrier=true) as
 select r.course_id,r.rating,r.comment,r.created_at,p.full_name as learner_name,p.username as learner_username
 from public.course_reviews r join public.courses c on c.id=r.course_id
 join public.public_profiles p on p.id=r.user_id where c.status='published';
revoke all on public.public_course_reviews from public;
grant select on public.public_course_reviews to anon,authenticated;

create function public.enroll_free_course(target_course uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to enroll' using errcode='42501'; end if;
 perform 1 from public.courses where id=target_course and status='published' and price=0 for share;
 if not found then raise exception 'This free course is unavailable' using errcode='22023'; end if;
 insert into public.enrollments(user_id,course_id) values(auth.uid(),target_course)
 on conflict(user_id,course_id) do update set course_id=excluded.course_id returning id into result;
 return result;
end $$;
revoke all on function public.enroll_free_course(uuid) from public,anon;
grant execute on function public.enroll_free_course(uuid) to authenticated;

create function public.mark_lesson_complete(target_lesson uuid) returns text language plpgsql security definer set search_path='' as $$
declare target_course uuid; result text; total_lessons integer; complete_lessons integer;
begin
 if auth.uid() is null then raise exception 'Sign in to continue' using errcode='42501'; end if;
 select m.course_id into target_course from public.lessons l join public.course_modules m on m.id=l.module_id where l.id=target_lesson;
 if target_course is null or not exists(select 1 from public.enrollments e where e.course_id=target_course and e.user_id=auth.uid()) then raise exception 'Enroll in this course to record progress' using errcode='42501'; end if;
 insert into public.lesson_progress(user_id,lesson_id) values(auth.uid(),target_lesson) on conflict do nothing;
 select count(*) into total_lessons from public.lessons l join public.course_modules m on m.id=l.module_id where m.course_id=target_course;
 select count(*) into complete_lessons from public.lesson_progress lp join public.lessons l on l.id=lp.lesson_id join public.course_modules m on m.id=l.module_id where m.course_id=target_course and lp.user_id=auth.uid();
 if total_lessons>0 and complete_lessons=total_lessons then
  update public.enrollments set completed_at=coalesce(completed_at,now()) where course_id=target_course and user_id=auth.uid();
  insert into public.certificates(user_id,course_id,certificate_code) values(auth.uid(),target_course,'HS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,24))) on conflict(user_id,course_id) do update set course_id=excluded.course_id returning certificate_code into result;
 end if;
 return result;
end $$;
revoke all on function public.mark_lesson_complete(uuid) from public,anon;
grant execute on function public.mark_lesson_complete(uuid) to authenticated;

create function public.verify_certificate(target_code text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('certificate_code',c.certificate_code,'issued_at',c.issued_at,'course_title',co.title,'learner_name',p.full_name,'learner_username',p.username)
  from public.certificates c join public.courses co on co.id=c.course_id join public.profiles p on p.id=c.user_id
  where c.certificate_code=target_code),'{}'::jsonb)
$$;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon,authenticated;

create function public.review_course(target_course uuid,decision text,review_note text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if decision not in ('approve','reject','request_changes') then raise exception 'Invalid decision' using errcode='22023'; end if;
 if char_length(coalesce(review_note,''))>2000 or (decision<>'approve' and char_length(trim(coalesce(review_note,'')))<5) then raise exception 'Add a review note of at least five characters' using errcode='22023'; end if;
 update public.courses set status=case decision when 'approve' then 'published' when 'reject' then 'rejected' else 'changes_requested' end,
  review_note=case when decision='approve' then null else left(trim(coalesce(review_note,'')),2000) end,updated_at=clock_timestamp()
 where id=target_course and status in ('pending','rejected','changes_requested');
 if not found then raise exception 'Course is no longer awaiting review'; end if;
end $$;
revoke all on function public.review_course(uuid,text,text) from public,anon;
grant execute on function public.review_course(uuid,text,text) to authenticated;

create function public.set_course_instructor(target_user uuid,enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if target_user=auth.uid() then raise exception 'Another administrator must assign instructor access' using errcode='42501'; end if;
 if enabled then
  update public.profiles set role='instructor',updated_at=clock_timestamp()
  where id=target_user and role='member' and status='approved' and is_verified;
 else
  update public.profiles set role='member',updated_at=clock_timestamp()
  where id=target_user and role='instructor';
 end if;
 if not found then raise exception 'Instructor access requires an approved, verified member' using errcode='22023'; end if;
end $$;
revoke all on function public.set_course_instructor(uuid,boolean) from public,anon;
grant execute on function public.set_course_instructor(uuid,boolean) to authenticated;

create function public.public_home_snapshot() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'verified_members',(select count(*) from public.public_profiles),
 'verified_businesses',(select count(*) from public.public_businesses),
 'verified_courses',(select count(*) from public.public_courses),
 'categories',(select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('member_count',(select count(*) from public.public_profiles p where p.category_id=c.id)) order by c.sort_order,c.id),'[]'::jsonb) from public.categories c),
 'recent_members',(select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from (select p.id,p.full_name,p.username,p.city,p.category_id,(p.photo_url is not null) as has_photo,p.approved_at from public.public_profiles p order by p.approved_at desc,p.id limit 8) p)
 );
$$;
revoke all on function public.public_home_snapshot() from public;
grant execute on function public.public_home_snapshot() to anon,authenticated;

commit;
