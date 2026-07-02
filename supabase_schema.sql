-- EraLash Combat — Supabase/Postgres schema
-- Run this in Supabase Dashboard → SQL Editor → New query → Run.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id text unique not null,
  username text default '',
  first_name text default '',
  last_name text default '',
  display_name text default 'Fighter',
  level integer not null default 1,
  xp_total integer not null default 0,
  coins integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  matches integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  result text not null check (result in ('win', 'loss')),
  xp_awarded integer not null default 0,
  coins_awarded integer not null default 0,
  player_rounds integer not null default 0,
  enemy_rounds integer not null default 0,
  duration integer not null default 0,
  score jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  verified_telegram boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists users_leaderboard_idx
  on public.users (wins desc, best_streak desc, coins desc);

create index if not exists battles_user_created_idx
  on public.battles (user_id, created_at desc);

-- Serverless backend uses service role key from Vercel env.
-- Never expose service role / secret key in browser code.
alter table public.users enable row level security;
alter table public.battles enable row level security;


-- Premium economy / retention update
-- Safe to run multiple times in Supabase SQL Editor.

alter table public.users
  add column if not exists daily_streak integer not null default 0,
  add column if not exists last_daily_claim_at timestamptz;

create table if not exists public.shop_items (
  id text primary key,
  title text not null,
  description text default '',
  type text not null default 'skin',
  rarity text not null default 'common',
  price_coins integer not null default 0,
  price_stars integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  user_id uuid not null references public.users(id) on delete cascade,
  item_id text not null references public.shop_items(id) on delete cascade,
  source text not null default 'coins',
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.daily_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  claim_date date not null,
  xp_awarded integer not null default 0,
  coins_awarded integer not null default 0,
  streak_after integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, claim_date)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  item_id text references public.shop_items(id) on delete set null,
  currency text not null default 'coins',
  amount integer not null default 0,
  telegram_charge_id text default '',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists inventory_user_idx on public.inventory (user_id, acquired_at desc);
create index if not exists daily_claims_user_idx on public.daily_claims (user_id, claim_date desc);
create index if not exists purchases_user_idx on public.purchases (user_id, created_at desc);

alter table public.shop_items enable row level security;
alter table public.inventory enable row level security;
alter table public.daily_claims enable row level security;
alter table public.purchases enable row level security;

insert into public.shop_items (id, title, description, type, rarity, price_coins, price_stars, metadata, active)
values
  ('skin_obsidian_ronin', 'Obsidian Ronin Skin', 'Тёмная броня, красный impact glow и premium portrait frame.', 'skin', 'epic', 650, 125, '{"color":"obsidian-red","fighter":"eralash"}', true),
  ('arena_neon_rooftop', 'Neon Rooftop Arena', 'Кинематографичная крыша города: дождь, неон, глубокий фон.', 'arena', 'rare', 900, 150, '{"arena":"neon-rooftop"}', true),
  ('effect_crimson_sparks', 'Crimson Hit Sparks', 'Красные hit sparks для heavy/special ударов.', 'effect', 'rare', 450, 90, '{"effect":"crimson-sparks"}', true),
  ('frame_weekly_champion', 'Weekly Champion Frame', 'Премиальная рамка профиля для лидеров арены.', 'frame', 'legendary', 1200, 250, '{"frame":"champion-gold"}', true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  type = excluded.type,
  rarity = excluded.rarity,
  price_coins = excluded.price_coins,
  price_stars = excluded.price_stars,
  metadata = excluded.metadata,
  active = excluded.active,
  updated_at = now();

create or replace view public.weekly_leaderboard as
select
  u.id as user_id,
  u.telegram_id,
  u.username,
  u.display_name,
  u.level,
  u.best_streak,
  count(b.id) filter (where b.result = 'win')::integer as weekly_wins,
  count(b.id) filter (where b.result = 'loss')::integer as weekly_losses,
  coalesce(sum(b.xp_awarded), 0)::integer as weekly_xp,
  coalesce(sum(b.coins_awarded), 0)::integer as weekly_coins,
  max(b.created_at) as last_battle_at
from public.users u
left join public.battles b
  on b.user_id = u.id
  and b.created_at >= date_trunc('week', now())
group by u.id, u.telegram_id, u.username, u.display_name, u.level, u.best_streak;

-- Telegram Stars payment hardening.
-- Prevents duplicate delivery if Telegram retries successful_payment webhook.
create unique index if not exists purchases_telegram_charge_unique_idx
  on public.purchases (telegram_charge_id)
  where telegram_charge_id is not null and telegram_charge_id <> '';

notify pgrst, 'reload schema';
