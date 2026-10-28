-- Run in a privileged, isolated database after both migrations. Fixtures roll back.
begin;
insert into auth.users(id, email) values
('00000000-0000-0000-0000-000000000201','library-owner@example.invalid'),
('00000000-0000-0000-0000-000000000202','library-other@example.invalid');
insert into public.books(id,title,series,status,access,manifest)
select id, id, '', status, access, jsonb_build_object(
  'id',id,'title',id,'series','','status',status,'access',access,'sortOrder',0,
  'schemaVersion',1,'contentVersion','1.0.0','creator','Nuvo','summary','Book preview',
  'locale','en-US','ageRange','2-5','kind','story','cover','/covers/public.webp',
  'assetStatus','reviewed','scenes',jsonb_build_array(jsonb_build_object('secret','paid story')),
  'inventory','/private/inventory.json','narrationAssets',jsonb_build_object('secret','/private/audio.m4a'))
from (values ('library-test-free','published','free'),
             ('library-test-paid','published','paid'),
             ('library-test-draft','draft','paid')) as fixture(id,status,access);
insert into public.purchases(id,user_id,book_id,provider,external_id,status,amount_minor,currency)
values ('00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000201',
 'library-test-paid','fixture','library-test-order','completed',999,'CAD');
insert into public.book_entitlements(user_id,book_id,purchase_id)
values ('00000000-0000-0000-0000-000000000201','library-test-paid','00000000-0000-0000-0000-000000000203');

set local role anon;
do $$ begin
  if exists(select 1 from public.books where id in ('library-test-paid','library-test-draft')) then raise exception 'Anonymous paid/draft manifest leak'; end if;
  if not exists(select 1 from public.books where id = 'library-test-free') then raise exception 'Free manifest unavailable'; end if;
  if not exists(select 1 from public.book_catalogue where id = 'library-test-paid') then raise exception 'Paid metadata unavailable'; end if;
  if exists(select 1 from public.book_catalogue where id = 'library-test-draft') then raise exception 'Draft metadata leak'; end if;
  if exists(select 1 from public.book_catalogue where summary ?| array['scenes','inventory','narrationAssets']) then raise exception 'Private catalogue fields exposed'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000202',true);
do $$ begin
  if exists(select 1 from public.books where id = 'library-test-paid') then raise exception 'Unowned paid manifest exposed'; end if;
  if exists(select 1 from public.purchases) or exists(select 1 from public.book_entitlements) then raise exception 'Other parent ownership exposed'; end if;
  begin
    insert into public.book_entitlements(user_id,book_id) values (auth.uid(),'library-test-paid');
    raise exception 'Parent granted ownership';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.purchases(user_id,book_id,provider,external_id,status,amount_minor,currency)
    values (auth.uid(),'library-test-paid','fixture','forbidden','completed',0,'CAD');
    raise exception 'Parent fabricated purchase';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.platform_admins(user_id) values (auth.uid());
    raise exception 'Parent granted admin';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000201',true);
do $$ begin
  if not exists(select 1 from public.books where id = 'library-test-paid') then raise exception 'Owner cannot read paid manifest'; end if;
  if not exists(select 1 from public.book_entitlements where book_id = 'library-test-paid') then raise exception 'Owner entitlement unavailable'; end if;
  if not exists(select 1 from public.purchases where book_id = 'library-test-paid') then raise exception 'Owner purchase unavailable'; end if;
  begin
    update public.book_entitlements set status = 'active';
    raise exception 'Parent updated ownership';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.purchases;
    raise exception 'Parent deleted purchase';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.book_entitlements set status = 'revoked' where book_id = 'library-test-paid';
set local role authenticated;
do $$ begin
  if exists(select 1 from public.books where id = 'library-test-paid') then raise exception 'Revoked owner retains server access'; end if;
end $$;
rollback;
