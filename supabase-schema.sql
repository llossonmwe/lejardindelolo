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
-- 5. Table des projets de plantes
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.plant_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_name text not null,
  plant_type text not null,
  target_action text not null default 'plant',
  target_month int check (target_month between 1 and 12),
  notes text default '',
  status text not null default 'planned'
    check (status in ('planned','started','done','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plant_projects_user_id_idx on public.plant_projects(user_id);
alter table public.plant_projects enable row level security;

drop policy if exists "plant_projects_select_own" on public.plant_projects;
create policy "plant_projects_select_own" on public.plant_projects
  for select using (auth.uid() = user_id);

drop policy if exists "plant_projects_insert_own" on public.plant_projects;
create policy "plant_projects_insert_own" on public.plant_projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "plant_projects_update_own" on public.plant_projects;
create policy "plant_projects_update_own" on public.plant_projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plant_projects_delete_own" on public.plant_projects;
create policy "plant_projects_delete_own" on public.plant_projects
  for delete using (auth.uid() = user_id);

drop trigger if exists plant_projects_set_updated_at on public.plant_projects;
create trigger plant_projects_set_updated_at
before update on public.plant_projects
for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 6. Table des plans de potager
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.garden_plots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Mon potager',
  grid_cols int not null default 8 check (grid_cols between 2 and 20),
  grid_rows int not null default 6 check (grid_rows between 2 and 20),
  cells jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists garden_plots_user_id_idx on public.garden_plots(user_id);
alter table public.garden_plots enable row level security;

drop policy if exists "garden_plots_select_own" on public.garden_plots;
create policy "garden_plots_select_own" on public.garden_plots
  for select using (auth.uid() = user_id);

drop policy if exists "garden_plots_insert_own" on public.garden_plots;
create policy "garden_plots_insert_own" on public.garden_plots
  for insert with check (auth.uid() = user_id);

drop policy if exists "garden_plots_update_own" on public.garden_plots;
create policy "garden_plots_update_own" on public.garden_plots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "garden_plots_delete_own" on public.garden_plots;
create policy "garden_plots_delete_own" on public.garden_plots
  for delete using (auth.uid() = user_id);

drop trigger if exists garden_plots_set_updated_at on public.garden_plots;
create trigger garden_plots_set_updated_at
before update on public.garden_plots
for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 7. Réseau social — Profils
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  bio text default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 8. Réseau social — Amitiés
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(requester_id, addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships(requester_id);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id);
alter table public.friendships enable row level security;

drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships
  for insert with check (auth.uid() = requester_id);

drop policy if exists "friendships_update" on public.friendships;
create policy "friendships_update" on public.friendships
  for update using (auth.uid() = addressee_id);

drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ═══════════════════════════════════════════════════════════════
-- 9. Réseau social — Posts (fil + forum)
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  photo_path text,
  post_type text not null default 'garden' check (post_type in ('garden','tip','question')),
  created_at timestamptz not null default now()
);

create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_type_idx on public.posts(post_type);
alter table public.posts enable row level security;

-- Tous les utilisateurs authentifiés peuvent lire les posts
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts
  for select using (auth.uid() is not null);

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 10. Réseau social — Likes
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "post_likes_select" on public.post_likes;
create policy "post_likes_select" on public.post_likes
  for select using (auth.uid() is not null);

drop policy if exists "post_likes_insert" on public.post_likes;
create policy "post_likes_insert" on public.post_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "post_likes_delete" on public.post_likes;
create policy "post_likes_delete" on public.post_likes
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 11. Réseau social — Commentaires
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments(post_id);
alter table public.post_comments enable row level security;

drop policy if exists "post_comments_select" on public.post_comments;
create policy "post_comments_select" on public.post_comments
  for select using (auth.uid() is not null);

drop policy if exists "post_comments_insert" on public.post_comments;
create policy "post_comments_insert" on public.post_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "post_comments_delete" on public.post_comments;
create policy "post_comments_delete" on public.post_comments
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 12. Réseau social — Messagerie privée
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists messages_receiver_idx on public.messages(receiver_id);
alter table public.messages enable row level security;

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (auth.uid() = sender_id);

drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages
  for update using (auth.uid() = receiver_id);

-- ═══════════════════════════════════════════════════════════════
-- 13. Storage : photos des plantes (mobile + desktop)
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
