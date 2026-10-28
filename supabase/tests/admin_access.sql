-- Run against an isolated Supabase test database AFTER applying the migration.
-- This transaction rolls back its fixtures. Requires a privileged SQL session.
begin;
insert into auth.users (id, email) values
('00000000-0000-0000-0000-000000000101', 'admin-test@example.invalid'),
('00000000-0000-0000-0000-000000000102', 'parent-test@example.invalid');
insert into public.platform_admins(user_id) values ('00000000-0000-0000-0000-000000000101');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
do $$ begin
  if public.is_platform_admin() then raise exception 'Non-admin became admin'; end if;
  if exists(select 1 from public.platform_admins) then raise exception 'Another user role exposed'; end if;
  begin
    insert into public.platform_admins(user_id) values ('00000000-0000-0000-0000-000000000102');
    raise exception 'Role escalation allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.books(id,title,series,status,access,manifest) values ('forbidden','Forbidden','','draft','free','{}');
    raise exception 'Unauthorized write allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
do $$ begin if not public.is_platform_admin() then raise exception 'Admin not recognized'; end if; end $$;
insert into public.books(id,title,series,status,access,manifest) values ('private-draft','Private draft','','draft','free',
'{"id":"private-draft","title":"Private draft","series":"","status":"draft","access":"free","sortOrder":0,"schemaVersion":1,"contentVersion":"0.1.0","scenes":[]}');
reset role;
set local role anon;
do $$ begin if exists(select 1 from public.books where id = 'private-draft') then raise exception 'Draft leaked'; end if; end $$;
rollback;
