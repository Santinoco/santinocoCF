-- =====================================================================
--  SANTINOCOCF · schema de Supabase (MVP)
--  Pegá todo este archivo en Supabase → SQL Editor → Run.
--  Es idempotente en lo posible, pero pensado para correr en un proyecto limpio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PERFILES
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null check (username ~ '^[a-zA-Z0-9_.]{3,20}$'),
  instagram   text check (instagram is null or char_length(instagram) <= 40),
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- ¿El usuario actual es admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Crea el perfil automáticamente al registrarse (username viene en user_metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, instagram)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'fan_' || substr(replace(new.id::text, '-', ''), 1, 8)),
    nullif(new.raw_user_meta_data ->> 'instagram', '')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "perfiles visibles" on public.profiles;
create policy "perfiles visibles" on public.profiles for select using (true);
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Nadie se puede auto-promover a admin: solo se pueden editar estas columnas.
revoke update on public.profiles from anon, authenticated;
grant update (username, instagram) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- RATE LIMIT (barrera anti-bots / anti-spam de puntos)
-- Uso: trigger ... execute function enforce_rate_limit('<max>', '<intervalo>')
-- ---------------------------------------------------------------------
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  max_rows int := tg_argv[0]::int;
  win interval := tg_argv[1]::interval;
  n int;
begin
  if public.is_admin() then return new; end if;
  execute format(
    'select count(*) from %I.%I where user_id = $1 and created_at > now() - $2',
    tg_table_schema, tg_table_name
  ) into n using new.user_id, win;
  if n >= max_rows then
    raise exception 'RATE_LIMIT' using errcode = 'P0001',
      hint = format('Máximo %s cada %s', max_rows, win);
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- NOVEDADES (las carga solo el admin)
-- ---------------------------------------------------------------------
create table if not exists public.news (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]{3,90}$'),
  title            text not null check (char_length(title) between 3 and 160),
  summary          text check (char_length(summary) <= 300),
  body             text not null default '',
  category         text not null default 'Último momento',
  cover_url        text,
  images           text[] not null default '{}',
  published        boolean not null default true,
  source_gossip_id uuid,
  created_at       timestamptz not null default now()
);
create index if not exists news_created_idx on public.news (created_at desc);

alter table public.news enable row level security;
drop policy if exists "leer novedades" on public.news;
create policy "leer novedades" on public.news for select using (published or public.is_admin());
drop policy if exists "admin novedades" on public.news;
create policy "admin novedades" on public.news for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- ENVÍOS PRIVADOS (solo los ve el que lo mandó y el admin)
-- chismes · candidatas · ideas · pedidos de publicidad
-- ---------------------------------------------------------------------
create table if not exists public.gossip (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  protagonist text check (char_length(protagonist) <= 80),
  content     text not null check (char_length(content) between 10 and 2000),
  image_path  text,
  status      text not null default 'nuevo' check (status in ('nuevo', 'leido', 'publicado', 'descartado')),
  created_at  timestamptz not null default now()
);

alter table public.news drop constraint if exists news_source_gossip_fk;
alter table public.news add constraint news_source_gossip_fk
  foreign key (source_gossip_id) references public.gossip (id) on delete set null;

create table if not exists public.candidates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 80),
  instagram   text check (char_length(instagram) <= 40),
  photo_path  text,
  reason      text check (char_length(reason) <= 1000),
  status      text not null default 'en_evaluacion' check (status in ('en_evaluacion', 'segunda_ronda', 'descartada')),
  created_at  timestamptz not null default now(),
  constraint candidates_ig_or_photo check (instagram is not null or photo_path is not null)
);

create table if not exists public.video_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content     text not null check (char_length(content) between 5 and 1000),
  status      text not null default 'nueva' check (status in ('nueva', 'me_gusta', 'hecha', 'descartada')),
  created_at  timestamptz not null default now()
);

create table if not exists public.ad_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 80),
  instagram     text check (char_length(instagram) <= 40),
  contact       text check (char_length(contact) <= 120),
  description   text not null check (char_length(description) between 5 and 1000),
  image_path    text,
  status        text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada')),
  created_at    timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['gossip', 'candidates', 'video_ideas', 'ad_requests'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "insertar propio" on public.%I', t);
    execute format('create policy "insertar propio" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('drop policy if exists "ver propio o admin" on public.%I', t);
    execute format('create policy "ver propio o admin" on public.%I for select using (user_id = auth.uid() or public.is_admin())', t);
    execute format('drop policy if exists "admin edita" on public.%I', t);
    execute format('create policy "admin edita" on public.%I for update using (public.is_admin()) with check (public.is_admin())', t);
    execute format('drop policy if exists "admin borra" on public.%I', t);
    execute format('create policy "admin borra" on public.%I for delete using (public.is_admin())', t);
    execute format('create index if not exists %I on public.%I (user_id, created_at desc)', t || '_user_idx', t);
  end loop;
end $$;

-- Límites por usuario (ajustalos a gusto)
drop trigger if exists rl_gossip on public.gossip;
create trigger rl_gossip before insert on public.gossip
  for each row execute function public.enforce_rate_limit('8', '1 day');
drop trigger if exists rl_candidates on public.candidates;
create trigger rl_candidates before insert on public.candidates
  for each row execute function public.enforce_rate_limit('5', '1 day');
drop trigger if exists rl_ideas on public.video_ideas;
create trigger rl_ideas before insert on public.video_ideas
  for each row execute function public.enforce_rate_limit('5', '1 day');
drop trigger if exists rl_ads on public.ad_requests;
create trigger rl_ads before insert on public.ad_requests
  for each row execute function public.enforce_rate_limit('3', '1 day');

-- ---------------------------------------------------------------------
-- MURO DE COMENTARIOS (público)
-- ---------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content     text not null check (char_length(btrim(content)) between 2 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists comments_created_idx on public.comments (created_at desc);

alter table public.comments enable row level security;
drop policy if exists "leer comentarios" on public.comments;
create policy "leer comentarios" on public.comments for select using (true);
drop policy if exists "comentar logueado" on public.comments;
create policy "comentar logueado" on public.comments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "borrar propio o admin" on public.comments;
create policy "borrar propio o admin" on public.comments for delete using (user_id = auth.uid() or public.is_admin());

drop trigger if exists rl_comments on public.comments;
create trigger rl_comments before insert on public.comments
  for each row execute function public.enforce_rate_limit('5', '10 minutes');

-- ---------------------------------------------------------------------
-- PUNTOS Y RANKING
-- Los puntos se calculan en vivo a partir de lo cargado: si borrás spam,
-- los puntos de ese usuario bajan solos. Cambiá los valores acá:
-- ---------------------------------------------------------------------
create table if not exists public.point_rules (
  action  text primary key,
  points  int not null,
  label   text not null
);
insert into public.point_rules (action, points, label) values
  ('chisme',    10, 'Cargar un chisme'),
  ('candidata', 25, 'Postular una candidata')
on conflict (action) do nothing;

alter table public.point_rules enable row level security;
drop policy if exists "leer reglas" on public.point_rules;
create policy "leer reglas" on public.point_rules for select using (true);
drop policy if exists "admin reglas" on public.point_rules;
create policy "admin reglas" on public.point_rules for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.get_leaderboard(lim int default 50)
returns table (user_id uuid, username text, points bigint, chismes bigint, candidatas bigint)
language sql stable security definer set search_path = public as $$
  with r as (
    select
      coalesce((select points from point_rules where action = 'chisme'), 0)    as p_chisme,
      coalesce((select points from point_rules where action = 'candidata'), 0) as p_cand
  ),
  g as (select user_id, count(*) n from gossip group by user_id),
  c as (select user_id, count(*) n from candidates group by user_id)
  select
    p.id, p.username,
    coalesce(g.n, 0) * r.p_chisme + coalesce(c.n, 0) * r.p_cand as points,
    coalesce(g.n, 0), coalesce(c.n, 0)
  from profiles p
  cross join r
  left join g on g.user_id = p.id
  left join c on c.user_id = p.id
  where not p.is_admin and coalesce(g.n, 0) + coalesce(c.n, 0) > 0
  order by points desc, p.created_at asc
  limit lim;
$$;

-- Mis puntos y mi posición
create or replace function public.get_my_stats()
returns table (points bigint, rank_pos bigint, chismes bigint, candidatas bigint)
language sql stable security definer set search_path = public as $$
  with board as (
    select l.*, row_number() over (order by l.points desc) as pos from public.get_leaderboard(100000) l
  )
  select coalesce(b.points, 0), b.pos, coalesce(b.chismes, 0), coalesce(b.candidatas, 0)
  from (select auth.uid() as uid) me
  left join board b on b.user_id = me.uid;
$$;

grant execute on function public.get_leaderboard(int) to anon, authenticated;
grant execute on function public.get_my_stats() to authenticated;

-- ---------------------------------------------------------------------
-- STORAGE
--  news    → público (imágenes de las noticias, sube solo el admin)
--  uploads → privado (fotos de chismes, candidatas y publicidades)
--            cada usuario sube en la carpeta <su uid>/..., solo el admin ve todo
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('news', 'news', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('uploads', 'uploads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "news lectura" on storage.objects;
create policy "news lectura" on storage.objects for select using (bucket_id = 'news');
drop policy if exists "news admin" on storage.objects;
create policy "news admin" on storage.objects for all
  using (bucket_id = 'news' and public.is_admin())
  with check (bucket_id = 'news' and public.is_admin());

drop policy if exists "uploads subir propio" on storage.objects;
create policy "uploads subir propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "uploads ver propio o admin" on storage.objects;
create policy "uploads ver propio o admin" on storage.objects for select
  using (bucket_id = 'uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "uploads admin borra" on storage.objects;
create policy "uploads admin borra" on storage.objects for delete
  using (bucket_id = 'uploads' and public.is_admin());

-- ---------------------------------------------------------------------
-- HACERTE ADMIN: registrate en la página y después corré esto con tu usuario
-- update public.profiles set is_admin = true where lower(username) = 'santinococf';
-- ---------------------------------------------------------------------
