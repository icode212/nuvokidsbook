-- Permanent one-time ownership. Payment collection remains disabled: no checkout,
-- webhook, or browser-callable ownership mutation is installed by this migration.
begin;

alter table public.books drop constraint no_paid_publication_yet;

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id),
  provider text not null check (length(provider) between 1 and 100),
  external_id text not null check (length(external_id) between 1 and 255),
  status text not null check (status in ('completed', 'refunded')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  unique(provider, external_id),
  unique(id, user_id, book_id)
);
create index purchases_owner on public.purchases(user_id);
alter table public.purchases enable row level security;
revoke all on public.purchases from public, anon, authenticated;
grant select on public.purchases to authenticated;
grant all on public.purchases to service_role;
create policy "Parents read their own purchases" on public.purchases
  for select to authenticated using (user_id = (select auth.uid()));

create table public.book_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id),
  status text not null default 'active' check (status in ('active', 'revoked', 'refunded')),
  purchase_id uuid,
  granted_at timestamptz not null default now(),
  primary key(user_id, book_id),
  foreign key(purchase_id, user_id, book_id) references public.purchases(id, user_id, book_id)
);
alter table public.book_entitlements enable row level security;
revoke all on public.book_entitlements from public, anon, authenticated;
grant select on public.book_entitlements to authenticated;
grant all on public.book_entitlements to service_role;
create policy "Parents read their own entitlements" on public.book_entitlements
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Owners read published paid books" on public.books
  for select to authenticated using (
    status = 'published' and access = 'paid' and exists (
      select 1 from public.book_entitlements e
      where e.book_id = books.id and e.user_id = (select auth.uid()) and e.status = 'active'
    )
  );

-- Intentionally owner-executed: visitors may see published paid metadata while
-- underlying manifest RLS stays restrictive. Explicit projection only; never b.*.
create view public.book_catalogue with (security_barrier = true) as
select b.id, jsonb_build_object(
  'schemaVersion', b.manifest->'schemaVersion',
  'id', b.id,
  'contentVersion', b.manifest->'contentVersion',
  'title', b.title,
  'series', b.series,
  'creator', b.manifest->'creator',
  'summary', b.manifest->'summary',
  'locale', b.manifest->'locale',
  'ageRange', b.manifest->'ageRange',
  'kind', b.manifest->'kind',
  'access', b.access,
  'status', b.status,
  'sortOrder', b.sort_order,
  'cover', b.manifest->'cover',
  'assetStatus', b.manifest->'assetStatus',
  'sceneCount', jsonb_array_length(b.manifest->'scenes')
) as summary
from public.books b where b.status = 'published';
revoke all on public.book_catalogue from public, anon, authenticated;
grant select on public.book_catalogue to anon, authenticated;
commit;
