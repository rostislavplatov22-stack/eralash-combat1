// Anti-cheat and result integrity for EraLash Combat.

import { hasDatabase, ensureUser, toClientProfile } from './_db.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

function canUseDb() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && hasDatabase());
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

async function logAntiCheat(row, severity, reason, payload = {}) {
  if (!canUseDb()) return null;
  try {
    await supabase('anti_cheat_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: row?.id || null,
        telegram_id: row?.telegram_id || '',
        severity,
        reason,
        payload
      })
    });
  } catch (_) {}
  return null;
}

export function normalizeRewards(record = {}) {
  const result = record.result === 'win' ? 'win' : 'loss';
  const maxXp = result === 'win' ? 200 : 80;
  const maxCoins = result === 'win' ? 120 : 35;
  const defaultXp = result === 'win' ? 100 : 25;
  const defaultCoins = result === 'win' ? 50 : 10;

  return {
    xp: Math.min(maxXp, toInt(record.rewards?.xp, defaultXp)),
    coins: Math.min(maxCoins, toInt(record.rewards?.coins, defaultCoins))
  };
}

export async function validateBattleSubmission(record = {}) {
  if (!canUseDb()) {
    return { ok: true, record: { ...record, rewards: normalizeRewards(record) }, flags: [], storage: 'memory-preview' };
  }

  const user = record.user || { id: 'guest', first_name: 'Guest' };
  const row = await ensureUser(user);
  const flags = [];

  if (!row?.id) {
    flags.push('no_verified_user');
    return { ok: true, record: { ...record, rewards: normalizeRewards(record) }, flags };
  }

  if (row.banned) {
    await logAntiCheat(row, 'high', 'blocked_banned_user_result', { record });
    return {
      ok: false,
      status: 403,
      error: 'player_banned',
      profile: toClientProfile(row),
      flags: ['player_banned']
    };
  }

  const result = record.result === 'win' ? 'win' : 'loss';
  const duration = toInt(record.score?.duration, 0);
  const playerRounds = toInt(record.score?.playerRounds, 0);
  const enemyRounds = toInt(record.score?.enemyRounds, 0);
  const rewards = normalizeRewards(record);

  if (result === 'win' && duration > 0 && duration < 8) flags.push('win_too_fast');
  if (playerRounds > 2 || enemyRounds > 2) flags.push('invalid_round_score');
  if (record.rewards?.xp > rewards.xp || record.rewards?.coins > rewards.coins) flags.push('reward_clamped');
  if (!record.verifiedTelegram) flags.push('unverified_frontend_result');

  const latest = await supabase(
    `battles?user_id=eq.${encodeURIComponent(row.id)}&select=created_at,result&order=created_at.desc&limit=1`,
    { method: 'GET' }
  ).catch(() => []);

  const last = latest?.[0];
  if (last) {
    const seconds = (Date.now() - Date.parse(last.created_at || 0)) / 1000;
    if (seconds >= 0 && seconds < 7) flags.push('battle_submit_too_frequent');
  }

  const highSeverity = flags.includes('battle_submit_too_frequent') || flags.includes('invalid_round_score');
  if (flags.length) {
    await logAntiCheat(row, highSeverity ? 'medium' : 'low', flags.join(','), { record, normalizedRewards: rewards });
  }

  if (highSeverity) {
    return {
      ok: false,
      status: 429,
      error: 'anti_cheat_rate_limit',
      flags,
      profile: toClientProfile(row)
    };
  }

  return {
    ok: true,
    row,
    flags,
    record: {
      ...record,
      rewards,
      antiCheatFlags: flags
    }
  };
}
