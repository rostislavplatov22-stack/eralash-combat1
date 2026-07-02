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
