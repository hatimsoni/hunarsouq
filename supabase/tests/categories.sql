-- Run after the migration in Supabase SQL Editor. Rolled back; safe to repeat.
begin;
do $$ begin
  assert (select count(*) from public.categories) = 17, 'Expected 17 launch categories';
  assert (select relrowsecurity from pg_class where oid = 'public.categories'::regclass), 'RLS must be enabled';
end $$;
set local role anon;
do $$ begin
  assert (select count(*) from public.categories) = 17, 'Anonymous reads should work';
  begin
    insert into public.categories (slug, name) values ('unauthorized', 'Unauthorized');
    raise exception 'Anonymous writes must be denied';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin
    update public.categories set name = 'Unauthorized';
    raise exception 'Member writes must be denied';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
