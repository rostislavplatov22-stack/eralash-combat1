// Supabase/Postgres persistence layer for EraLash Combat.
// Uses Supabase REST API from Vercel serverless functions.
// SERVICE ROLE / SECRET key must stay only in Vercel Environment Variables.

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

export function hasDatabase() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function endpoint(path) {
  if (!hasDatabase()) throw new Error('Supabase is not configured');
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

function displayName(user = {}) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || `Fighter ${user.id || ''}`.trim() || 'Fighter';
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

function cleanUser(user = {}) {
  const telegramId = String(user.id || user.telegram_id || '').trim();
  return {
    telegram_id: telegramId,
    username: user.username || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    display_name: displayName(user)
  };
}

function levelFromXpTotal(xpTotal) {
  return Math.max(1, Math.floor(toInt(xpTotal) / 250) + 1);
}

function xpProgress(xpTotal) {
  return toInt(xpTotal) % 250;
}

export function toClientProfile(row) {
  const xpTotal = toInt(row?.xp_total);
  return {
    id: row?.id,
    telegramId: row?.telegram_id || '',
    username: row?.username || '',
    name: row?.display_name || row?.first_name || row?.username || 'Fighter',
    level: toInt(row?.level, levelFromXpTotal(xpTotal)),
    xp: xpProgress(xpTotal),
    xpTotal,
    coins: toInt(row?.coins),
    wins: toInt(row?.wins),
    losses: toInt(row?.losses),
    matches: toInt(row?.matches),
    streak: toInt(row?.current_streak),
    bestStreak: toInt(row?.best_streak),
    dailyStreak: toInt(row?.daily_streak),
    lastDailyClaimAt: row?.last_daily_claim_at || '',
    banned: Boolean(row?.banned),
    banReason: row?.ban_reason || '',
    updatedAt: row?.updated_at || ''
  };
}

export async function getProfileByTelegramId(telegramId) {
  if (!hasDatabase() || !telegramId || telegramId === 'guest') return null;

  const data = await supabase(
    `users?telegram_id=eq.${encodeURIComponent(String(telegramId))}&select=*&limit=1`,
    { method: 'GET' }
  );

  return Array.isArray(data) && data[0] ? data[0] : null;
}

export async function ensureUser(user = {}) {
  if (!hasDatabase()) return null;

  const clean = cleanUser(user);
  if (!clean.telegram_id || clean.telegram_id === 'guest') return null;

  const existing = await getProfileByTelegramId(clean.telegram_id);
  if (existing) {
    const updated = {
      ...existing,
      username: clean.username,
      first_name: clean.first_name,
      last_name: clean.last_name,
      display_name: clean.display_name,
      updated_at: new Date().toISOString()
    };

    const rows = await supabase(`users?on_conflict=telegram_id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(updated)
    });

    return Array.isArray(rows) ? rows[0] : updated;
  }

  const rows = await supabase(`users?on_conflict=telegram_id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      ...clean,
      level: 1,
      xp_total: 0,
      coins: 0,
      wins: 0,
      losses: 0,
      matches: 0,
      current_streak: 0,
      best_streak: 0
    })
  });

  return Array.isArray(rows) ? rows[0] : null;
}

export async function saveBattleResult(record = {}) {
  if (!hasDatabase()) return null;

  const user = record.user || { id: 'guest', first_name: 'Guest' };
  const prev = await ensureUser(user);
  if (!prev?.id) return null;

  const result = record.result === 'win' ? 'win' : 'loss';
  const xpAwarded = toInt(record.rewards?.xp, result === 'win' ? 100 : 25);
  const coinsAwarded = toInt(record.rewards?.coins, result === 'win' ? 50 : 10);

  const nextWins = toInt(prev.wins) + (result === 'win' ? 1 : 0);
  const nextLosses = toInt(prev.losses) + (result === 'loss' ? 1 : 0);
  const nextMatches = toInt(prev.matches) + 1;
  const nextStreak = result === 'win' ? toInt(prev.current_streak) + 1 : 0;
  const nextBestStreak = Math.max(toInt(prev.best_streak), nextStreak);
  const nextXpTotal = toInt(prev.xp_total) + xpAwarded;
  const nextCoins = toInt(prev.coins) + coinsAwarded;
  const nextLevel = levelFromXpTotal(nextXpTotal);

  const userPatch = {
    id: prev.id,
    telegram_id: prev.telegram_id,
    username: user.username || prev.username || '',
    first_name: user.first_name || prev.first_name || '',
    last_name: user.last_name || prev.last_name || '',
    display_name: displayName(user) || prev.display_name || 'Fighter',
    level: nextLevel,
    xp_total: nextXpTotal,
    coins: nextCoins,
    wins: nextWins,
    losses: nextLosses,
    matches: nextMatches,
    current_streak: nextStreak,
    best_streak: nextBestStreak,
    updated_at: new Date().toISOString()
  };

  const updatedRows = await supabase(`users?on_conflict=telegram_id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(userPatch)
  });

  const updated = Array.isArray(updatedRows) && updatedRows[0] ? updatedRows[0] : userPatch;

  await supabase(`battles`, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: updated.id,
      result,
      xp_awarded: xpAwarded,
      coins_awarded: coinsAwarded,
      player_rounds: toInt(record.score?.playerRounds),
      enemy_rounds: toInt(record.score?.enemyRounds),
      duration: toInt(record.score?.duration),
      score: record.score || {},
      raw_payload: record,
      verified_telegram: Boolean(record.verifiedTelegram)
    })
  });

  return toClientProfile(updated);
}

export async function getLeaderboard(limit = 20) {
  if (!hasDatabase()) return null;

  const safeLimit = Math.max(1, Math.min(100, toInt(limit, 20)));
  const rows = await supabase(
    `users?select=*&order=wins.desc,best_streak.desc,coins.desc&limit=${safeLimit}`,
    { method: 'GET' }
  );

  return Array.isArray(rows) ? rows.map(toClientProfile) : [];
}

export async function getStats() {
  if (!hasDatabase()) return null;

  const rows = await supabase(
    `users?select=wins,losses,matches,coins,xp_total`,
    { method: 'GET' }
  );

  const totals = {
    players: Array.isArray(rows) ? rows.length : 0,
    wins: 0,
    losses: 0,
    matches: 0,
    coins: 0,
    xpTotal: 0
  };

  for (const row of rows || []) {
    totals.wins += toInt(row.wins);
    totals.losses += toInt(row.losses);
    totals.matches += toInt(row.matches);
    totals.coins += toInt(row.coins);
    totals.xpTotal += toInt(row.xp_total);
  }

  return totals;
}
