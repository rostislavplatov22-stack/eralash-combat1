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




-- Admin panel, promo codes and anti-cheat update.
-- Safe to run multiple times in Supabase SQL Editor.

alter table public.users
  add column if not exists banned boolean not null default false,
  add column if not exists ban_reason text not null default '',
  add column if not exists admin_note text not null default '';

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null default '',
  reward_xp integer not null default 0,
  reward_coins integer not null default 0,
  item_id text references public.shop_items(id) on delete set null,
  max_uses integer not null default 100,
  used_count integer not null default 0,
  active boolean not null default true,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reward_xp integer not null default 0,
  reward_coins integer not null default 0,
  item_id text references public.shop_items(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (promo_code_id, user_id)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_telegram_id text not null default '',
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.anti_cheat_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  telegram_id text not null default '',
  severity text not null default 'low',
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists users_banned_idx on public.users (banned, telegram_id);
create index if not exists promo_codes_active_idx on public.promo_codes (active, code);
create index if not exists promo_redemptions_user_idx on public.promo_redemptions (user_id, created_at desc);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index if not exists anti_cheat_events_created_idx on public.anti_cheat_events (created_at desc, severity);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.anti_cheat_events enable row level security;

insert into public.promo_codes (code, title, reward_xp, reward_coins, item_id, max_uses, active)
values
  ('WELCOME100', 'Welcome Fighter Pack', 100, 100, null, 1000, true),
  ('DARKARENA', 'Dark Arena Launch Bonus', 50, 250, 'effect_crimson_sparks', 250, true)
on conflict (code) do update set
  title = excluded.title,
  reward_xp = excluded.reward_xp,
  reward_coins = excluded.reward_coins,
  item_id = excluded.item_id,
  max_uses = excluded.max_uses,
  active = excluded.active,
  updated_at = now();

notify pgrst, 'reload schema';


-- Content system update: fighters, arenas, abilities and live balance.
-- Safe to run multiple times in Supabase SQL Editor.

create table if not exists public.fighters (
  id text primary key,
  name text not null,
  archetype text not null default '',
  description text not null default '',
  power integer not null default 75,
  speed integer not null default 75,
  defense integer not null default 70,
  hp integer not null default 100,
  energy integer not null default 35,
  jump integer not null default 900,
  width integer not null default 78,
  height integer not null default 172,
  color_a text not null default '#14171e',
  color_b text not null default '#c92832',
  accent text not null default '#d9b76a',
  special_name text not null default '',
  ultimate_name text not null default '',
  portrait_url text not null default '',
  sprite_url text not null default '',
  unlock_level integer not null default 1,
  price_coins integer not null default 0,
  price_stars integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arenas (
  id text primary key,
  title text not null,
  description text not null default '',
  palette text not null default '',
  background_type text not null default '',
  floor text not null default '',
  accent text not null default '#d9b76a',
  unlock_level integer not null default 1,
  price_coins integer not null default 0,
  price_stars integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.abilities (
  id text primary key,
  fighter_id text not null references public.fighters(id) on delete cascade,
  slot text not null check (slot in ('light', 'heavy', 'special', 'ultimate', 'passive')),
  title text not null default '',
  description text not null default '',
  damage integer not null default 0,
  block_damage integer not null default 0,
  startup_ms integer not null default 80,
  active_ms integer not null default 80,
  recovery_ms integer not null default 150,
  range integer not null default 80,
  knockback integer not null default 250,
  energy_cost integer not null default 0,
  cooldown_ms integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fighter_id, slot, title)
);

create table if not exists public.content_balance (
  id text primary key default 'live',
  active_fighter_id text references public.fighters(id) on delete set null,
  enemy_fighter_id text references public.fighters(id) on delete set null,
  active_arena_id text references public.arenas(id) on delete set null,
  damage_multiplier numeric not null default 1,
  ai_difficulty numeric not null default 0.62,
  updated_at timestamptz not null default now()
);

create index if not exists fighters_active_idx on public.fighters (active, unlock_level);
create index if not exists arenas_active_idx on public.arenas (active, unlock_level);
create index if not exists abilities_fighter_idx on public.abilities (fighter_id, slot, active);

alter table public.fighters enable row level security;
alter table public.arenas enable row level security;
alter table public.abilities enable row level security;
alter table public.content_balance enable row level security;

insert into public.fighters
  (id, name, archetype, description, power, speed, defense, hp, energy, jump, width, height, color_a, color_b, accent, special_name, ultimate_name, unlock_level, price_coins, price_stars, metadata, active)
values
  ('raven', 'Raven', 'Balanced Duelist', 'Быстрый премиальный боец с crimson impact, стабильным уроном и хорошим контролем дистанции.', 78, 86, 72, 100, 35, 960, 78, 172, '#14171e', '#c92832', '#d9b76a', 'Crimson Rift', 'Obsidian Verdict', 1, 0, 0, '{"role":"player-default","visual":"dark-red"}', true),
  ('iron_warden', 'Iron Warden', 'Heavy Punisher', 'Медленнее, тяжелее и опаснее в ближней дистанции. Хорош для AI boss-подачи.', 88, 62, 84, 110, 30, 850, 90, 188, '#17191c', '#3eb6ff', '#d9f2ff', 'Steel Breaker', 'Warden Execution', 1, 0, 0, '{"role":"enemy-default","visual":"steel-blue"}', true),
  ('velvet_viper', 'Velvet Viper', 'Fast Assassin', 'Очень быстрый персонаж с меньшей защитой, сильным темпом и evasive комбо.', 70, 96, 58, 92, 45, 1020, 72, 166, '#180d1f', '#9b5cff', '#ffcf7a', 'Violet Fang', 'Silent Guillotine', 3, 850, 160, '{"role":"speed","visual":"violet-gold"}', true),
  ('ember_khan', 'Ember Khan', 'Grappler Bruiser', 'Массивный боец с высоким HP и тяжёлыми ударами, но более медленным перемещением.', 94, 54, 90, 122, 25, 780, 96, 196, '#1a0c08', '#ff6a1a', '#f4d29a', 'Molten Clinch', 'Forge Collapse', 5, 1200, 220, '{"role":"heavy","visual":"ember-bronze"}', true)
on conflict (id) do update set
  name = excluded.name,
  archetype = excluded.archetype,
  description = excluded.description,
  power = excluded.power,
  speed = excluded.speed,
  defense = excluded.defense,
  hp = excluded.hp,
  energy = excluded.energy,
  jump = excluded.jump,
  width = excluded.width,
  height = excluded.height,
  color_a = excluded.color_a,
  color_b = excluded.color_b,
  accent = excluded.accent,
  special_name = excluded.special_name,
  ultimate_name = excluded.ultimate_name,
  unlock_level = excluded.unlock_level,
  price_coins = excluded.price_coins,
  price_stars = excluded.price_stars,
  metadata = excluded.metadata,
  active = excluded.active,
  updated_at = now();

insert into public.arenas
  (id, title, description, palette, background_type, floor, accent, unlock_level, price_coins, price_stars, metadata, active)
values
  ('obsidian_ring', 'Obsidian Ring', 'Тёмная арена с золотым полом, красным туманом и cinematic vignette.', 'dark-brutal-premium', 'obsidian-city', 'black-gold', '#d9b76a', 1, 0, 0, '{"fog":"crimson","skyline":true}', true),
  ('neon_rooftop', 'Neon Rooftop', 'Крыша ночного города: дождь, синий неон и высокая глубина фона.', 'cyber-arena', 'neon-rooftop', 'chrome-wet', '#3eb6ff', 2, 900, 150, '{"rain":true,"parallax":true}', true),
  ('hell_forge', 'Hell Forge', 'Адская кузница: жар, искры, бронза и мощный свет позади бойцов.', 'mythic-combat', 'forge', 'dark-bronze', '#ff6a1a', 4, 1300, 240, '{"embers":true,"heat":true}', true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  palette = excluded.palette,
  background_type = excluded.background_type,
  floor = excluded.floor,
  accent = excluded.accent,
  unlock_level = excluded.unlock_level,
  price_coins = excluded.price_coins,
  price_stars = excluded.price_stars,
  metadata = excluded.metadata,
  active = excluded.active,
  updated_at = now();

insert into public.abilities
  (id, fighter_id, slot, title, description, damage, block_damage, startup_ms, active_ms, recovery_ms, range, knockback, energy_cost, cooldown_ms, active)
values
  ('raven_light', 'raven', 'light', 'Raven Jab', 'Быстрый удар.', 7, 2, 75, 75, 145, 72, 235, 0, 0, true),
  ('raven_heavy', 'raven', 'heavy', 'Gold Hook', 'Тяжёлый боковой удар.', 15, 4, 165, 95, 245, 92, 430, 0, 0, true),
  ('raven_special', 'raven', 'special', 'Crimson Rift', 'Красный рывок-рассечение.', 22, 7, 200, 130, 340, 132, 650, 42, 1400, true),
  ('iron_light', 'iron_warden', 'light', 'Steel Check', 'Мощный короткий удар.', 8, 3, 90, 80, 165, 74, 260, 0, 0, true),
  ('iron_heavy', 'iron_warden', 'heavy', 'Warden Hammer', 'Медленный тяжёлый удар.', 18, 5, 205, 110, 295, 96, 470, 0, 0, true),
  ('iron_special', 'iron_warden', 'special', 'Steel Breaker', 'Пробивной спецприём.', 25, 9, 240, 140, 380, 126, 710, 48, 1600, true),
  ('viper_light', 'velvet_viper', 'light', 'Viper Tap', 'Очень быстрый jab.', 6, 2, 55, 65, 120, 68, 210, 0, 0, true),
  ('viper_heavy', 'velvet_viper', 'heavy', 'Velvet Arc', 'Быстрый тяжёлый удар.', 13, 4, 135, 85, 205, 90, 390, 0, 0, true),
  ('viper_special', 'velvet_viper', 'special', 'Violet Fang', 'Дальний быстрый спецприём.', 20, 6, 160, 115, 300, 148, 590, 38, 1200, true),
  ('khan_light', 'ember_khan', 'light', 'Forge Palm', 'Тяжёлый light.', 9, 3, 105, 80, 175, 76, 280, 0, 0, true),
  ('khan_heavy', 'ember_khan', 'heavy', 'Molten Breaker', 'Очень сильный heavy.', 21, 6, 240, 120, 340, 102, 540, 0, 0, true),
  ('khan_special', 'ember_khan', 'special', 'Molten Clinch', 'Силовой спецприём.', 28, 10, 270, 150, 420, 116, 780, 50, 1800, true)
on conflict (id) do update set
  fighter_id = excluded.fighter_id,
  slot = excluded.slot,
  title = excluded.title,
  description = excluded.description,
  damage = excluded.damage,
  block_damage = excluded.block_damage,
  startup_ms = excluded.startup_ms,
  active_ms = excluded.active_ms,
  recovery_ms = excluded.recovery_ms,
  range = excluded.range,
  knockback = excluded.knockback,
  energy_cost = excluded.energy_cost,
  cooldown_ms = excluded.cooldown_ms,
  active = excluded.active,
  updated_at = now();

insert into public.content_balance
  (id, active_fighter_id, enemy_fighter_id, active_arena_id, damage_multiplier, ai_difficulty)
values
  ('live', 'raven', 'iron_warden', 'obsidian_ring', 1, 0.62)
on conflict (id) do update set
  active_fighter_id = coalesce(public.content_balance.active_fighter_id, excluded.active_fighter_id),
  enemy_fighter_id = coalesce(public.content_balance.enemy_fighter_id, excluded.enemy_fighter_id),
  active_arena_id = coalesce(public.content_balance.active_arena_id, excluded.active_arena_id),
  updated_at = now();

notify pgrst, 'reload schema';


-- Referral + Share + Tournament Season update.
-- Safe to run multiple times in Supabase SQL Editor.

create table if not exists public.seasons (
  id text primary key,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  rewards jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.season_points (
  season_id text not null references public.seasons(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  points integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  matches integer not null default 0,
  xp_total integer not null default 0,
  coins_total integer not null default 0,
  last_result text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_id uuid not null references public.users(id) on delete cascade,
  source text not null default 'unknown',
  reward_xp integer not null default 0,
  reward_coins integer not null default 0,
  rewarded boolean not null default false,
  created_at timestamptz not null default now(),
  unique (referred_id)
);

create table if not exists public.share_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  share_type text not null default 'generic',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists seasons_active_idx on public.seasons (active, starts_at desc);
create index if not exists season_points_rank_idx on public.season_points (season_id, points desc, wins desc, updated_at desc);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id, created_at desc);
create index if not exists referrals_referred_idx on public.referrals (referred_id);
create index if not exists share_events_user_idx on public.share_events (user_id, created_at desc);
create index if not exists share_events_type_idx on public.share_events (share_type, created_at desc);

alter table public.seasons enable row level security;
alter table public.season_points enable row level security;
alter table public.referrals enable row level security;
alter table public.share_events enable row level security;

notify pgrst, 'reload schema';


-- Release 1.0 / QA / error logging update.
-- Safe to run multiple times in Supabase SQL Editor.

create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'miniapp-client',
  message text not null default '',
  stack text default '',
  path text default '',
  user_agent text default '',
  user_id text default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.api_errors (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'api',
  message text not null default '',
  stack text default '',
  path text default '',
  user_agent text default '',
  user_id text default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_errors (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'payment',
  message text not null default '',
  stack text default '',
  path text default '',
  user_agent text default '',
  user_id text default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.telegram_errors (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'telegram',
  message text not null default '',
  stack text default '',
  path text default '',
  user_agent text default '',
  user_id text default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_errors_created_idx on public.client_errors (created_at desc);
create index if not exists api_errors_created_idx on public.api_errors (created_at desc);
create index if not exists payment_errors_created_idx on public.payment_errors (created_at desc);
create index if not exists telegram_errors_created_idx on public.telegram_errors (created_at desc);

alter table public.client_errors enable row level security;
alter table public.api_errors enable row level security;
alter table public.payment_errors enable row level security;
alter table public.telegram_errors enable row level security;

notify pgrst, 'reload schema';


-- Public Launch / Marketing Pack
-- Safe to run multiple times.

create table if not exists public.launch_claims (
  id uuid primary key default gen_random_uuid(),
  campaign text not null,
  user_id uuid references public.users(id) on delete cascade,
  telegram_id text not null default '',
  reward jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (campaign, user_id)
);

create index if not exists launch_claims_campaign_idx
  on public.launch_claims (campaign, created_at desc);

alter table public.launch_claims enable row level security;

create table if not exists public.news_posts (
  id text primary key,
  title text not null,
  body text not null,
  tag text not null default 'news',
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.news_posts enable row level security;

insert into public.news_posts (id, title, body, tag, published)
values
  ('release_1_0', 'Release 1.0 открыт', 'Arena, Supabase-прогресс, магазин, Stars-покупки, promo, referral, season и QA-checklist работают в production.', 'release', true),
  ('founder_drop', 'Founder Arena Drop', 'Первые 100 игроков могут забрать +50 XP, +100 coins и Founder Frame.', 'reward', true),
  ('weekly_season', 'Weekly Arena Season', 'Играй бои, получай season points и поднимайся в топе недели.', 'season', true)
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  tag = excluded.tag,
  published = excluded.published;


-- Analytics + LiveOps + Feedback update
-- Safe to run multiple times.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  telegram_id text default '',
  event_name text not null,
  session_id text default '',
  source text default 'miniapp',
  payload jsonb not null default '{}'::jsonb,
  user_agent text default '',
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_telegram_idx
  on public.analytics_events (telegram_id, created_at desc);

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  telegram_id text default '',
  type text not null default 'feedback',
  message text not null,
  contact text default '',
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  user_agent text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_messages_status_idx
  on public.feedback_messages (status, created_at desc);

create index if not exists feedback_messages_telegram_idx
  on public.feedback_messages (telegram_id, created_at desc);

create table if not exists public.liveops_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text default '',
  public boolean not null default true,
  updated_by text default '',
  updated_at timestamptz not null default now()
);

insert into public.liveops_config (key, value, description, public)
values
  ('daily_reward', '{"minCoins":50,"maxCoins":250,"baseXp":30,"streakBonusCoins":25}'::jsonb, 'Daily reward tuning', true),
  ('battle_rewards', '{"winXp":100,"winCoins":50,"lossXp":25,"lossCoins":10,"perfectBonusXp":50}'::jsonb, 'Battle result reward tuning', true),
  ('season_points', '{"winBase":100,"lossBase":25,"cleanWinBonus":30,"speedBonusMax":60}'::jsonb, 'Season/tournament points tuning', true),
  ('founder_bonus', '{"active":true,"maxClaims":100,"xp":50,"coins":100,"itemId":"founder_frame"}'::jsonb, 'Founder launch campaign switch', true),
  ('maintenance', '{"enabled":false,"message":"Arena online. Good fight."}'::jsonb, 'Maintenance mode and public message', true),
  ('launch_message', '{"title":"EraLash Combat — Public Launch","body":"Enter the Dark Arena, win fights, earn rewards and climb the season ranking."}'::jsonb, 'Public launch copy shown in Mini App', true)
on conflict (key) do nothing;

alter table public.analytics_events enable row level security;
alter table public.feedback_messages enable row level security;
alter table public.liveops_config enable row level security;
