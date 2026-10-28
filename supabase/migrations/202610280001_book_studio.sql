-- Free-book phase. No payment or ownership tables are introduced here.
begin;
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;
create policy "Admins can read their own role" on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));
-- Roles can only be assigned by a privileged database operator, never by a browser.
create function public.is_platform_admin() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to anon, authenticated;

create table public.books (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  title text not null check (length(title) between 1 and 100),
  series text not null default '',
  status text not null check (status in ('draft','published','archived')),
  access text not null check (access in ('free','paid')),
  sort_order integer not null default 0,
  manifest jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_paid_publication_yet check (status <> 'published' or access = 'free'),
  constraint matching_manifest check (
    manifest ?& array['id','title','series','status','access','sortOrder','scenes','schemaVersion','contentVersion']
    and manifest->>'id' = id and manifest->>'title' = title and manifest->>'series' = series
    and manifest->>'status' = status and manifest->>'access' = access
    and (manifest->>'sortOrder')::integer = sort_order
    and (manifest->>'schemaVersion')::integer = 1
    and jsonb_typeof(manifest->'scenes') = 'array'
    and (status <> 'published' or jsonb_array_length(manifest->'scenes') > 0)
  )
);
create index books_public_order on public.books(sort_order, title) where status = 'published' and access = 'free';
alter table public.books enable row level security;
revoke all on public.books from anon, authenticated;
grant select on public.books to anon, authenticated;
grant insert, update on public.books to authenticated;
create policy "Public can read published free books" on public.books for select to anon, authenticated
  using (status = 'published' and access = 'free');
create policy "Admins can read drafts" on public.books for select to authenticated
  using ((select public.is_platform_admin()));
create policy "Admins can add books" on public.books for insert to authenticated
  with check ((select public.is_platform_admin()));
create policy "Admins can edit books" on public.books for update to authenticated
  using ((select public.is_platform_admin())) with check ((select public.is_platform_admin()));
-- Archive instead of deleting; no DELETE privilege or browser admin-role mutation.
create function public.stamp_book_update() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger book_updated before update on public.books for each row execute function public.stamp_book_update();
commit;
