// Admin / economy control helpers for EraLash Combat.
// Works only on Vercel serverless functions. Keep ADMIN_API_SECRET and service role keys server-side.

import { validateInitData, extractUserFromInitData } from './_telegram.js';
import { ensureUser, toClientProfile, getStats, getLeaderboard } from './_db.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

export function hasDb() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

export function adminIds() {
  return String(process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function isAdminUser(user) {
  return adminIds().includes(String(user?.id || user?.telegram_id || ''));
}

function providedAdminSecret(req, body = {}) {
  return (
    req.headers['x-admin-secret'] ||
    body.adminSecret ||
    new URL(req.url, `https://${req.headers.host}`).searchParams.get('secret') ||
    ''
  );
}

export async function requireAdmin(req, body = {}) {
  const initData = req.headers['x-telegram-init-data'] || '';
  const isTelegram = validateInitData(initData);
  const user = isTelegram ? extractUserFromInitData(initData) : body.user;

  const secret = process.env.ADMIN_API_SECRET || process.env.SETUP_SECRET || '';
  const secretOk = Boolean(secret && providedAdminSecret(req, body) === secret);

  if (isTelegram && isAdminUser(user)) return { ok: true, user, method: 'telegram-init-data' };
  if (secretOk) return { ok: true, user: user || { id: 'admin-secret', first_name: 'Admin' }, method: 'admin-secret' };

  const allowed = adminIds();
  const reason = allowed.length
    ? 'Admin Telegram ID is not allowed or admin secret is missing'
    : 'ADMIN_TELEGRAM_IDS is not configured';
  const error = new Error(reason);
  error.status = 403;
  throw error;
}

function endpoint(path) {
  if (!hasDb()) throw new Error('Supabase is not configured');
  return `${SUPABASE_URL}/rest/v1/${path}`;
}

export async function supabase(path, options = {}) {
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

export function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export function bool(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export async function auditLog(admin, action, targetType = '', targetId = '', payload = {}) {
  if (!hasDb()) return null;
  try {
    await supabase('admin_audit_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        admin_telegram_id: String(admin?.id || admin?.telegram_id || ''),
        action,
        target_type: targetType,
        target_id: String(targetId || ''),
        payload
      })
    });
  } catch (_) {}
  return null;
}

export async function dashboardStats() {
  if (!hasDb()) {
    return {
      storage: 'memory-preview',
      stats: await getStats(),
      leaderboard: await getLeaderboard(10),
      shopItems: [],
      purchases: [],
      promos: [],
      antiCheat: []
    };
  }

  const [stats, leaderboard, shopItems, purchases, promos, antiCheat, battles, users] = await Promise.all([
    getStats(),
    getLeaderboard(10),
    supabase('shop_items?select=*&order=created_at.desc&limit=50', { method: 'GET' }).catch(() => []),
    supabase('purchases?select=*,shop_items(title)&order=created_at.desc&limit=25', { method: 'GET' }).catch(() => []),
    supabase('promo_codes?select=*&order=created_at.desc&limit=25', { method: 'GET' }).catch(() => []),
    supabase('anti_cheat_events?select=*&order=created_at.desc&limit=25', { method: 'GET' }).catch(() => []),
    supabase('battles?select=created_at,result,xp_awarded,coins_awarded&order=created_at.desc&limit=200', { method: 'GET' }).catch(() => []),
    supabase('users?select=created_at,coins,xp_total,wins,losses,matches,banned&order=created_at.desc&limit=500', { method: 'GET' }).catch(() => [])
  ]);

  const sinceDay = Date.now() - 24 * 60 * 60 * 1000;
  const recentBattles = (battles || []).filter(b => Date.parse(b.created_at || 0) >= sinceDay);
  const recentUsers = (users || []).filter(u => Date.parse(u.created_at || 0) >= sinceDay);

  return {
    storage: 'supabase-postgres',
    stats,
    live: {
      players24h: recentUsers.length,
      battles24h: recentBattles.length,
      purchasesTotal: purchases?.length || 0,
      activeShopItems: (shopItems || []).filter(x => x.active).length,
      bannedPlayers: (users || []).filter(x => x.banned).length,
      antiCheatFlags: antiCheat?.length || 0
    },
    leaderboard,
    shopItems,
    purchases,
    promos,
    antiCheat
  };
}

export async function findPlayers(query = '', limit = 25) {
  if (!hasDb()) return [];
  const q = String(query || '').trim();
  const safeLimit = Math.max(1, Math.min(100, toInt(limit, 25)));

  const path = q
    ? `users?or=(telegram_id.eq.${encodeURIComponent(q)},username.ilike.*${encodeURIComponent(q)}*,display_name.ilike.*${encodeURIComponent(q)}*)&select=*&limit=${safeLimit}&order=updated_at.desc`
    : `users?select=*&limit=${safeLimit}&order=updated_at.desc`;

  const rows = await supabase(path, { method: 'GET' });
  return (rows || []).map(toClientProfile);
}

export async function patchUserByTelegramId(telegramId, patch = {}) {
  if (!hasDb()) throw new Error('Supabase is not configured');
  const rows = await supabase(`users?telegram_id=eq.${encodeURIComponent(String(telegramId))}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });
  return Array.isArray(rows) ? rows[0] : null;
}

export async function adminGrant(userPayload, grant = {}) {
  const row = await ensureUser(userPayload);
  if (!row?.telegram_id) throw new Error('User not found');

  const xp = Math.max(0, toInt(grant.xp));
  const coins = Math.max(0, toInt(grant.coins));
  const nextXp = Math.max(0, toInt(row.xp_total) + xp);
  const updated = await patchUserByTelegramId(row.telegram_id, {
    xp_total: nextXp,
    level: Math.max(1, Math.floor(nextXp / 250) + 1),
    coins: Math.max(0, toInt(row.coins) + coins)
  });

  return toClientProfile(updated || row);
}

export async function setPlayerBan(telegramId, banned, reason = '') {
  const updated = await patchUserByTelegramId(telegramId, {
    banned: Boolean(banned),
    ban_reason: Boolean(banned) ? String(reason || 'Admin moderation') : ''
  });
  return toClientProfile(updated);
}

export async function resetPlayerProgress(telegramId) {
  const updated = await patchUserByTelegramId(telegramId, {
    level: 1,
    xp_total: 0,
    coins: 0,
    wins: 0,
    losses: 0,
    matches: 0,
    current_streak: 0,
    best_streak: 0,
    daily_streak: 0,
    last_daily_claim_at: null,
    banned: false,
    ban_reason: ''
  });
  return toClientProfile(updated);
}

export async function upsertShopItem(item = {}) {
  if (!hasDb()) throw new Error('Supabase is not configured');
  const id = String(item.id || '').trim();
  if (!id) throw new Error('Shop item id is required');

  const payload = {
    id,
    title: String(item.title || id),
    description: String(item.description || ''),
    type: String(item.type || 'skin'),
    rarity: String(item.rarity || 'common'),
    price_coins: Math.max(0, toInt(item.priceCoins ?? item.price_coins)),
    price_stars: Math.max(0, toInt(item.priceStars ?? item.price_stars)),
    metadata: item.metadata || {},
    active: item.active !== false,
    updated_at: new Date().toISOString()
  };

  const rows = await supabase('shop_items?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });

  return Array.isArray(rows) ? rows[0] : payload;
}

export async function toggleShopItem(id, active) {
  if (!hasDb()) throw new Error('Supabase is not configured');
  const rows = await supabase(`shop_items?id=eq.${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ active: Boolean(active), updated_at: new Date().toISOString() })
  });
  return Array.isArray(rows) ? rows[0] : null;
}

export async function createPromoCode(data = {}) {
  if (!hasDb()) throw new Error('Supabase is not configured');
  const code = String(data.code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!code || code.length < 3) throw new Error('Promo code is too short');

  const payload = {
    code,
    title: String(data.title || code),
    reward_xp: Math.max(0, toInt(data.rewardXp ?? data.reward_xp)),
    reward_coins: Math.max(0, toInt(data.rewardCoins ?? data.reward_coins)),
    item_id: data.itemId || data.item_id || null,
    max_uses: Math.max(1, toInt(data.maxUses ?? data.max_uses, 100)),
    used_count: Math.max(0, toInt(data.usedCount ?? data.used_count)),
    active: data.active !== false,
    valid_until: data.validUntil || data.valid_until || null,
    updated_at: new Date().toISOString()
  };

  const rows = await supabase('promo_codes?on_conflict=code', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });

  return Array.isArray(rows) ? rows[0] : payload;
}

export async function togglePromoCode(code, active) {
  const rows = await supabase(`promo_codes?code=eq.${encodeURIComponent(String(code).toUpperCase())}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ active: Boolean(active), updated_at: new Date().toISOString() })
  });
  return Array.isArray(rows) ? rows[0] : null;
}
