// Premium economy layer for EraLash Combat.
// Works with Supabase/Postgres through REST using the server-only service role key.

import { parseBody, validateInitData, extractUserFromInitData, telegram } from './_telegram.js';
import { hasDatabase, ensureUser, getProfileByTelegramId, toClientProfile, getLeaderboard } from './_db.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

export const SHOP_CATALOG = [
  {
    id: 'skin_obsidian_ronin',
    title: 'Obsidian Ronin Skin',
    description: 'Тёмная броня, красный impact glow и premium portrait frame.',
    type: 'skin',
    rarity: 'epic',
    priceCoins: 650,
    priceStars: 125,
    metadata: { color: 'obsidian-red', fighter: 'eralash' }
  },
  {
    id: 'arena_neon_rooftop',
    title: 'Neon Rooftop Arena',
    description: 'Кинематографичная крыша города: дождь, неон, глубокий фон.',
    type: 'arena',
    rarity: 'rare',
    priceCoins: 900,
    priceStars: 150,
    metadata: { arena: 'neon-rooftop' }
  },
  {
    id: 'effect_crimson_sparks',
    title: 'Crimson Hit Sparks',
    description: 'Красные hit sparks для heavy/special ударов.',
    type: 'effect',
    rarity: 'rare',
    priceCoins: 450,
    priceStars: 90,
    metadata: { effect: 'crimson-sparks' }
  },
  {
    id: 'frame_weekly_champion',
    title: 'Weekly Champion Frame',
    description: 'Премиальная рамка профиля для лидеров арены.',
    type: 'frame',
    rarity: 'legendary',
    priceCoins: 1200,
    priceStars: 250,
    metadata: { frame: 'champion-gold' }
  }
];

export function catalogItem(id) {
  return SHOP_CATALOG.find(item => item.id === id) || null;
}

export function storageMode() {
  return hasDatabase() ? 'supabase-postgres' : 'memory-preview';
}

function canUseDb() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function endpoint(path) {
  if (!canUseDb()) throw new Error('Supabase is not configured');
  return `${SUPABASE_URL}/rest/v1/${path}`;
}

async function supabase(path, options = {}) {
  const res = await fetch(endpoint(path), {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || data?.hint || data?.details || text || `HTTP ${res.status}`;
    throw new Error(`Supabase REST error: ${message}`);
  }

  return data;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

export async function getRequestUser(req, body = {}) {
  const initData = req.headers['x-telegram-init-data'] || '';
  const isTelegram = validateInitData(initData);
  const user = isTelegram ? extractUserFromInitData(initData) : body.user;

  return {
    isTelegram,
    initData,
    user: user || { id: 'guest', first_name: 'Guest' }
  };
}

export async function requireProfile(req, body = {}) {
  const ctx = await getRequestUser(req, body);
  if (!ctx.user?.id || String(ctx.user.id) === 'guest') {
    throw new Error('Telegram user is required for economy actions');
  }

  const row = await ensureUser(ctx.user);
  if (!row?.id) throw new Error('Unable to create or load user profile');

  return { ...ctx, row, profile: toClientProfile(row) };
}

export async function syncShopItems() {
  if (!canUseDb()) return SHOP_CATALOG;

  const payload = SHOP_CATALOG.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    type: item.type,
    rarity: item.rarity,
    price_coins: item.priceCoins,
    price_stars: item.priceStars,
    metadata: item.metadata,
    active: true,
    updated_at: new Date().toISOString()
  }));

  await supabase('shop_items?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(payload)
  });

  return SHOP_CATALOG;
}

export async function getInventory(userId) {
  if (!canUseDb() || !userId) return [];
  const rows = await supabase(
    `inventory?user_id=eq.${encodeURIComponent(userId)}&select=*,shop_items(*)&order=acquired_at.desc`,
    { method: 'GET' }
  );

  return (rows || []).map(row => ({
    id: row.item_id,
    source: row.source,
    acquiredAt: row.acquired_at,
    item: row.shop_items || catalogItem(row.item_id)
  }));
}

export async function addInventory(userId, itemId, source = 'coins') {
  if (!canUseDb() || !userId) return null;
  const rows = await supabase('inventory?on_conflict=user_id,item_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: userId,
      item_id: itemId,
      source,
      acquired_at: new Date().toISOString()
    })
  });
  return Array.isArray(rows) ? rows[0] : null;
}

export async function userOwnsItem(userId, itemId) {
  if (!canUseDb() || !userId) return false;
  const rows = await supabase(
    `inventory?user_id=eq.${encodeURIComponent(userId)}&item_id=eq.${encodeURIComponent(itemId)}&select=item_id&limit=1`,
    { method: 'GET' }
  );
  return Boolean(rows?.[0]);
}

async function patchUserByTelegramId(telegramId, patch) {
  const rows = await supabase(`users?telegram_id=eq.${encodeURIComponent(String(telegramId))}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });

  return Array.isArray(rows) ? rows[0] : null;
}

function levelFromXpTotal(xpTotal) {
  return Math.max(1, Math.floor(toInt(xpTotal) / 250) + 1);
}

export async function grantUserRewards(user, rewards = {}) {
  if (!canUseDb()) {
    return {
      ok: true,
      storage: 'memory-preview',
      profile: null,
      rewards
    };
  }

  const row = await ensureUser(user);
  if (!row?.telegram_id) throw new Error('User profile not found');

  const xp = toInt(rewards.xp);
  const coins = toInt(rewards.coins);
  const nextXpTotal = toInt(row.xp_total) + xp;
  const nextCoins = toInt(row.coins) + coins;

  const updated = await patchUserByTelegramId(row.telegram_id, {
    xp_total: nextXpTotal,
    coins: nextCoins,
    level: levelFromXpTotal(nextXpTotal)
  });

  return {
    ok: true,
    storage: storageMode(),
    profile: toClientProfile(updated || row),
    rewards: { xp, coins }
  };
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function getDailyStatus(userId, profileRow) {
  if (!canUseDb() || !userId) {
    return {
      canClaim: true,
      lastClaim: null,
      reward: { xp: 40, coins: 80 },
      streak: 0
    };
  }

  const rows = await supabase(
    `daily_claims?user_id=eq.${encodeURIComponent(userId)}&order=claim_date.desc&limit=1&select=*`,
    { method: 'GET' }
  );

  const last = rows?.[0] || null;
  const today = todayKey();
  const canClaim = !last || last.claim_date !== today;

  return {
    canClaim,
    lastClaim: last?.claim_date || null,
    reward: { xp: 40, coins: 80 },
    streak: toInt(profileRow?.daily_streak || 0)
  };
}

export async function claimDailyReward(user) {
  if (!canUseDb()) {
    return {
      ok: true,
      storage: 'memory-preview',
      claimed: true,
      reward: { xp: 40, coins: 80 },
      message: 'Preview reward claimed locally'
    };
  }

  const row = await ensureUser(user);
  if (!row?.id) throw new Error('User not found');

  const status = await getDailyStatus(row.id, row);
  if (!status.canClaim) {
    return {
      ok: true,
      storage: storageMode(),
      claimed: false,
      reason: 'already_claimed_today',
      status,
      profile: toClientProfile(row)
    };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const prevStreak = toInt(row.daily_streak || 0);
  const nextStreak = status.lastClaim === yesterday ? prevStreak + 1 : 1;
  const bonusCoins = nextStreak >= 7 ? 120 : nextStreak >= 3 ? 40 : 0;
  const reward = {
    xp: 40 + (nextStreak >= 7 ? 60 : 0),
    coins: 80 + bonusCoins
  };

  const nextXpTotal = toInt(row.xp_total) + reward.xp;
  const nextCoins = toInt(row.coins) + reward.coins;
  const today = todayKey();

  await supabase('daily_claims?on_conflict=user_id,claim_date', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: row.id,
      claim_date: today,
      xp_awarded: reward.xp,
      coins_awarded: reward.coins,
      streak_after: nextStreak
    })
  });

  const updated = await patchUserByTelegramId(row.telegram_id, {
    xp_total: nextXpTotal,
    coins: nextCoins,
    level: levelFromXpTotal(nextXpTotal),
    daily_streak: nextStreak,
    last_daily_claim_at: new Date().toISOString()
  });

  return {
    ok: true,
    storage: storageMode(),
    claimed: true,
    reward,
    streak: nextStreak,
    profile: toClientProfile(updated || row)
  };
}

export async function purchaseWithCoins(user, itemId) {
  const item = catalogItem(itemId);
  if (!item) throw new Error('Unknown shop item');

  if (!canUseDb()) {
    return {
      ok: true,
      storage: 'memory-preview',
      item,
      profile: null,
      message: 'Preview purchase accepted'
    };
  }

  const row = await ensureUser(user);
  if (!row?.id) throw new Error('User not found');

  if (await userOwnsItem(row.id, item.id)) {
    return { ok: true, storage: storageMode(), alreadyOwned: true, item, profile: toClientProfile(row) };
  }

  const coins = toInt(row.coins);
  if (coins < item.priceCoins) {
    return {
      ok: false,
      storage: storageMode(),
      error: 'not_enough_coins',
      required: item.priceCoins,
      coins,
      item,
      profile: toClientProfile(row)
    };
  }

  const updated = await patchUserByTelegramId(row.telegram_id, {
    coins: coins - item.priceCoins
  });

  await addInventory(row.id, item.id, 'coins');

  return {
    ok: true,
    storage: storageMode(),
    purchased: true,
    item,
    profile: toClientProfile(updated || row),
    inventory: await getInventory(row.id)
  };
}

export async function createStarsInvoice(user, itemId) {
  const item = catalogItem(itemId);
  if (!item) throw new Error('Unknown shop item');
  if (!item.priceStars) throw new Error('Item does not support Stars purchase');

  const payload = JSON.stringify({
    type: 'eralash_item',
    itemId: item.id,
    userId: String(user?.id || ''),
    ts: Date.now()
  });

  const invoice = await telegram('createInvoiceLink', {
    title: item.title,
    description: item.description,
    payload,
    currency: 'XTR',
    prices: [{ label: item.title, amount: item.priceStars }]
  });

  return { ok: true, item, invoiceLink: invoice.result || invoice };
}

export async function weeklyLeaderboard(limit = 20) {
  if (!canUseDb()) return getLeaderboard(limit);

  try {
    const safeLimit = Math.max(1, Math.min(100, toInt(limit, 20)));
    const rows = await supabase(
      `weekly_leaderboard?select=*&order=weekly_wins.desc,weekly_xp.desc,weekly_coins.desc&limit=${safeLimit}`,
      { method: 'GET' }
    );

    return (rows || []).map((row) => ({
      id: row.user_id,
      telegramId: row.telegram_id,
      username: row.username,
      name: row.display_name || row.username || 'Fighter',
      level: toInt(row.level, 1),
      wins: toInt(row.weekly_wins),
      losses: toInt(row.weekly_losses),
      xpTotal: toInt(row.weekly_xp),
      coins: toInt(row.weekly_coins),
      bestStreak: toInt(row.best_streak)
    }));
  } catch (_) {
    return getLeaderboard(limit);
  }
}
