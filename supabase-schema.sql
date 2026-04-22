-- 🌱 Schéma Supabase pour "Le jardin de Lolo"
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run

-- ═══════════════════════════════════════════════════════════════
-- 1. Table des plantes
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('legume','fruit','fleur','aromate','arbre','autre')),
  location text default '',
  planted date,
  interval_days int not null default 3 check (interval_days between 1 and 60),
  last_water date,
  last_prune date,
  last_cuttings date,
  last_divide date,
  last_treat date,
  photo_path text,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration : ajout des colonnes si la table existait déjà avant cette version
alter table public.plants add column if not exists last_prune    date;
alter table public.plants add column if not exists last_cuttings date;
alter table public.plants add column if not exists last_divide   date;
alter table public.plants add column if not exists last_treat    date;
alter table public.plants add column if not exists photo_path    text;

create index if not exists plants_user_id_idx on public.plants(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. Table du journal
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists journal_user_id_idx on public.journal(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. Row Level Security : chaque user ne voit QUE ses données
-- ═══════════════════════════════════════════════════════════════
alter table public.plants  enable row level security;
alter table public.journal enable row level security;

-- Plantes
drop policy if exists "plants_select_own" on public.plants;
create policy "plants_select_own" on public.plants
  for select using (auth.uid() = user_id);

drop policy if exists "plants_insert_own" on public.plants;
create policy "plants_insert_own" on public.plants
  for insert with check (auth.uid() = user_id);

drop policy if exists "plants_update_own" on public.plants;
create policy "plants_update_own" on public.plants
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plants_delete_own" on public.plants;
create policy "plants_delete_own" on public.plants
  for delete using (auth.uid() = user_id);

-- Journal
drop policy if exists "journal_select_own" on public.journal;
create policy "journal_select_own" on public.journal
  for select using (auth.uid() = user_id);

drop policy if exists "journal_insert_own" on public.journal;
create policy "journal_insert_own" on public.journal
  for insert with check (auth.uid() = user_id);

drop policy if exists "journal_delete_own" on public.journal;
create policy "journal_delete_own" on public.journal
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. Trigger : met à jour updated_at automatiquement
-- ═══════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists plants_set_updated_at on public.plants;
create trigger plants_set_updated_at
before update on public.plants
for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 5. Storage : photos des plantes (mobile + desktop)
-- ═══════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plant-photos',
  'plant-photos',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

drop policy if exists "photos_public_read" on storage.objects;
create policy "photos_public_read" on storage.objects
for select
using (bucket_id = 'plant-photos');

drop policy if exists "photos_insert_own" on storage.objects;
create policy "photos_insert_own" on storage.objects
for insert
with check (
  bucket_id = 'plant-photos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "photos_update_own" on storage.objects;
create policy "photos_update_own" on storage.objects
for update
using (
  bucket_id = 'plant-photos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'plant-photos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "photos_delete_own" on storage.objects;
create policy "photos_delete_own" on storage.objects
for delete
using (
  bucket_id = 'plant-photos'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);
