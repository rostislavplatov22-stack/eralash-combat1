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

function dbShopItemToClient(row = {}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    type: row.type || 'skin',
    rarity: row.rarity || 'common',
    priceCoins: toInt(row.price_coins),
    priceStars: toInt(row.price_stars),
    metadata: row.metadata || {},
    active: row.active !== false
  };
}

export async function getShopCatalog(activeOnly = true) {
  if (!canUseDb()) return SHOP_CATALOG;
  const filter = activeOnly ? 'active=eq.true&' : '';
  const rows = await supabase(`shop_items?${filter}select=*&order=created_at.desc`, { method: 'GET' });
  return (rows || []).map(dbShopItemToClient);
}

export async function catalogItemLive(id) {
  const fallback = catalogItem(id);
  if (!canUseDb()) return fallback;
  const rows = await supabase(
    `shop_items?id=eq.${encodeURIComponent(String(id))}&select=*&limit=1`,
    { method: 'GET' }
  );
  const item = rows?.[0] ? dbShopItemToClient(rows[0]) : fallback;
  return item && item.active !== false ? item : null;
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
  const item = await catalogItemLive(itemId);
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

export function createStarsPayload(user, itemId) {
  const item = catalogItem(itemId);
  if (!item) throw new Error('Unknown shop item');
  if (!item.priceStars) throw new Error('Item does not support Stars purchase');

  return JSON.stringify({
    type: 'eralash_item',
    itemId: item.id,
    userId: String(user?.id || ''),
    ts: Date.now()
  });
}

export function parseStarsPayload(payload = '') {
  try {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    if (!data || data.type !== 'eralash_item' || !data.itemId) {
      return { ok: false, error: 'invalid_payload' };
    }

    const item = catalogItem(data.itemId);
    if (!item) return { ok: false, error: 'unknown_item' };

    return { ok: true, data, item };
  } catch (_) {
    return { ok: false, error: 'payload_parse_failed' };
  }
}

export function validateStarsCheckout(query) {
  const parsed = parseStarsPayload(query?.invoice_payload || '');
  if (!parsed.ok) return parsed;

  if (query.currency !== 'XTR') {
    return { ok: false, error: 'invalid_currency', item: parsed.item };
  }

  if (toInt(query.total_amount) !== toInt(parsed.item.priceStars)) {
    return {
      ok: false,
      error: 'invalid_amount',
      item: parsed.item,
      expected: toInt(parsed.item.priceStars),
      received: toInt(query.total_amount)
    };
  }

  const expectedUserId = String(parsed.data.userId || '');
  const actualUserId = String(query.from?.id || '');
  if (expectedUserId && actualUserId && expectedUserId !== actualUserId) {
    return { ok: false, error: 'user_mismatch', item: parsed.item };
  }

  return { ok: true, item: parsed.item, payload: parsed.data };
}

export async function createStarsInvoice(user, itemId) {
  const item = catalogItem(itemId);
  if (!item) throw new Error('Unknown shop item');
  if (!item.priceStars) throw new Error('Item does not support Stars purchase');

  const invoice = await telegram('createInvoiceLink', {
    title: item.title,
    description: item.description,
    payload: createStarsPayload(user, item.id),
    currency: 'XTR',
    prices: [{ label: item.title, amount: item.priceStars }]
  });

  return { ok: true, item, invoiceLink: invoice.result || invoice };
}

export async function recordPurchase(row, item, payment, rawPayload = {}) {
  if (!canUseDb() || !row?.id || !item?.id) {
    return { ok: true, storage: 'memory-preview', item };
  }

  const chargeId = String(payment?.telegram_payment_charge_id || '');
  if (chargeId) {
    const existing = await supabase(
      `purchases?telegram_charge_id=eq.${encodeURIComponent(chargeId)}&select=*&limit=1`,
      { method: 'GET' }
    );

    if (existing?.[0]) {
      await addInventory(row.id, item.id, 'telegram-stars');
      return {
        ok: true,
        storage: storageMode(),
        alreadyProcessed: true,
        purchase: existing[0],
        item,
        inventory: await getInventory(row.id)
      };
    }
  }

  const rows = await supabase('purchases', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: row.id,
      item_id: item.id,
      currency: 'XTR',
      amount: toInt(payment?.total_amount, item.priceStars),
      telegram_charge_id: chargeId,
      raw_payload: rawPayload || {}
    })
  });

  await addInventory(row.id, item.id, 'telegram-stars');

  return {
    ok: true,
    storage: storageMode(),
    purchased: true,
    purchase: Array.isArray(rows) ? rows[0] : null,
    item,
    inventory: await getInventory(row.id)
  };
}

export async function completeStarsPayment(user, payment) {
  const parsed = parseStarsPayload(payment?.invoice_payload || '');
  if (!parsed.ok) {
    return { ok: false, storage: storageMode(), error: parsed.error };
  }

  if (payment?.currency !== 'XTR') {
    return { ok: false, storage: storageMode(), error: 'invalid_currency', item: parsed.item };
  }

  if (toInt(payment?.total_amount) !== toInt(parsed.item.priceStars)) {
    return {
      ok: false,
      storage: storageMode(),
      error: 'invalid_amount',
      expected: toInt(parsed.item.priceStars),
      received: toInt(payment?.total_amount),
      item: parsed.item
    };
  }

  const row = await ensureUser(user);
  if (!row?.id) throw new Error('Unable to create user for Stars payment');

  const expectedUserId = String(parsed.data.userId || '');
  const actualUserId = String(user?.id || row.telegram_id || '');
  if (expectedUserId && actualUserId && expectedUserId !== actualUserId) {
    return { ok: false, storage: storageMode(), error: 'user_mismatch', item: parsed.item };
  }

  return recordPurchase(row, parsed.item, payment, {
    telegramUser: user,
    successfulPayment: payment,
    invoicePayload: parsed.data
  });
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
