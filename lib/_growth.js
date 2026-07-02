// Referral, share and tournament season helpers for EraLash Combat.
// Uses Supabase/Postgres via server-only service role key.

import { ensureUser, getProfileByTelegramId, toClientProfile } from './_db.js';
import { hasDb, supabase, toInt } from './_admin-tools.js';

const BOT_USERNAME = String(process.env.BOT_USERNAME || '').replace(/^@/, '').trim();

export function growthStorageMode() {
  return hasDb() ? 'supabase-postgres' : 'memory-preview';
}

function isoWeekInfo(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  const year = d.getUTCFullYear();

  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - 3);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  return {
    id: `season_${year}_w${String(week).padStart(2, '0')}`,
    title: `Arena Season ${year}-W${String(week).padStart(2, '0')}`,
    week,
    year,
    startsAt: start.toISOString(),
    endsAt: end.toISOString()
  };
}

function cleanTelegramId(value) {
  const raw = String(value || '').trim();
  return raw.replace(/^ref[_-]?/i, '').replace(/[^\d]/g, '');
}

function safeLimit(value, fallback = 20) {
  return Math.max(1, Math.min(100, toInt(value, fallback)));
}

function levelFromXpTotal(xpTotal) {
  return Math.max(1, Math.floor(toInt(xpTotal) / 250) + 1);
}

export function referralCodeForUser(userOrRow = {}) {
  const id = userOrRow.telegram_id || userOrRow.telegramId || userOrRow.id || '';
  return id ? `ref_${String(id)}` : '';
}

export function inviteLinkForUser(userOrRow = {}, publicUrl = '') {
  const code = referralCodeForUser(userOrRow);
  if (!code) return publicUrl || '';
  if (BOT_USERNAME) return `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(code)}`;
  const base = String(publicUrl || '').replace(/\/$/, '');
  return base ? `${base}?ref=${encodeURIComponent(cleanTelegramId(code))}` : code;
}

export async function ensureCurrentSeason() {
  const info = isoWeekInfo();
  if (!hasDb()) return { ...info, storage: 'memory-preview' };

  const existing = await supabase(`seasons?id=eq.${encodeURIComponent(info.id)}&select=*&limit=1`, { method: 'GET' })
    .catch(() => []);

  if (existing?.[0]) return { ...existing[0], storage: 'supabase-postgres' };

  const rows = await supabase('seasons?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      id: info.id,
      title: info.title,
      starts_at: info.startsAt,
      ends_at: info.endsAt,
      active: true
    })
  });

  return { ...(Array.isArray(rows) ? rows[0] : info), storage: 'supabase-postgres' };
}

export function tournamentPoints(record = {}) {
  const win = record.result === 'win';
  const rounds = toInt(record.score?.playerRounds, win ? 2 : 0);
  const enemyRounds = toInt(record.score?.enemyRounds, win ? 0 : 2);
  const duration = Math.max(0, toInt(record.score?.duration, 0));
  const speedBonus = win && duration > 0 ? Math.max(0, 60 - duration) : 0;
  const cleanWinBonus = win && enemyRounds === 0 ? 30 : 0;
  const base = win ? 100 : 25;
  return Math.max(0, base + rounds * 15 + speedBonus + cleanWinBonus);
}

export async function recordSeasonBattle(user, record = {}) {
  if (!hasDb()) {
    return {
      storage: 'memory-preview',
      season: isoWeekInfo(),
      pointsAdded: tournamentPoints(record)
    };
  }

  const row = await ensureUser(user);
  if (!row?.id) return null;

  const season = await ensureCurrentSeason();
  const pointsAdded = tournamentPoints(record);
  const win = record.result === 'win';
  const xp = toInt(record.rewards?.xp, win ? 100 : 25);
  const coins = toInt(record.rewards?.coins, win ? 50 : 10);

  const existing = await supabase(
    `season_points?season_id=eq.${encodeURIComponent(season.id)}&user_id=eq.${encodeURIComponent(row.id)}&select=*&limit=1`,
    { method: 'GET' }
  ).catch(() => []);

  const prev = existing?.[0] || {};
  const payload = {
    season_id: season.id,
    user_id: row.id,
    points: toInt(prev.points) + pointsAdded,
    wins: toInt(prev.wins) + (win ? 1 : 0),
    losses: toInt(prev.losses) + (win ? 0 : 1),
    matches: toInt(prev.matches) + 1,
    xp_total: toInt(prev.xp_total) + xp,
    coins_total: toInt(prev.coins_total) + coins,
    last_result: win ? 'win' : 'loss',
    updated_at: new Date().toISOString()
  };

  const rows = await supabase('season_points?on_conflict=season_id,user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });

  return {
    storage: 'supabase-postgres',
    season,
    pointsAdded,
    seasonProfile: Array.isArray(rows) ? rows[0] : payload
  };
}

export async function seasonLeaderboard(limit = 20) {
  const season = await ensureCurrentSeason();
  if (!hasDb()) {
    return {
      ok: true,
      storage: 'memory-preview',
      season,
      leaderboard: []
    };
  }

  const rows = await supabase(
    `season_points?season_id=eq.${encodeURIComponent(season.id)}&select=*,users(telegram_id,username,display_name,level)&order=points.desc,wins.desc,updated_at.desc&limit=${safeLimit(limit)}`,
    { method: 'GET' }
  );

  return {
    ok: true,
    storage: 'supabase-postgres',
    season,
    leaderboard: (rows || []).map((r, index) => ({
      rank: index + 1,
      userId: r.user_id,
      telegramId: r.users?.telegram_id || '',
      username: r.users?.username || '',
      name: r.users?.display_name || r.users?.username || 'Fighter',
      level: toInt(r.users?.level, 1),
      points: toInt(r.points),
      wins: toInt(r.wins),
      losses: toInt(r.losses),
      matches: toInt(r.matches),
      xpTotal: toInt(r.xp_total),
      coinsTotal: toInt(r.coins_total),
      updatedAt: r.updated_at || ''
    }))
  };
}

export async function referralStats(user, publicUrl = '') {
  const row = await ensureUser(user);
  const telegramId = row?.telegram_id || String(user?.id || user?.telegram_id || '');
  const code = referralCodeForUser({ telegram_id: telegramId });
  const link = inviteLinkForUser({ telegram_id: telegramId }, publicUrl);

  if (!hasDb() || !row?.id) {
    return {
      ok: true,
      storage: 'memory-preview',
      code,
      inviteLink: link,
      referrals: [],
      stats: { total: 0, rewarded: 0, coinsEarned: 0, xpEarned: 0 }
    };
  }

  const refs = await supabase(
    `referrals?referrer_id=eq.${encodeURIComponent(row.id)}&select=*,referred:referred_id(telegram_id,username,display_name,level)&order=created_at.desc&limit=50`,
    { method: 'GET' }
  ).catch(() => []);

  return {
    ok: true,
    storage: 'supabase-postgres',
    code,
    inviteLink: link,
    stats: {
      total: refs.length,
      rewarded: refs.filter(x => x.rewarded).length,
      coinsEarned: refs.reduce((sum, x) => sum + toInt(x.reward_coins), 0),
      xpEarned: refs.reduce((sum, x) => sum + toInt(x.reward_xp), 0)
    },
    referrals: refs.map(x => ({
      id: x.id,
      name: x.referred?.display_name || x.referred?.username || 'Fighter',
      telegramId: x.referred?.telegram_id || '',
      level: toInt(x.referred?.level, 1),
      rewardXp: toInt(x.reward_xp),
      rewardCoins: toInt(x.reward_coins),
      rewarded: Boolean(x.rewarded),
      createdAt: x.created_at
    }))
  };
}

async function patchUser(row, patch = {}) {
  const rows = await supabase(`users?id=eq.${encodeURIComponent(row.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });
  return Array.isArray(rows) ? rows[0] : row;
}

export async function registerReferral(referrerTelegramId, referredUser, source = 'unknown') {
  const refId = cleanTelegramId(referrerTelegramId);
  if (!refId) return { ok: false, reason: 'empty_referral_code', storage: growthStorageMode() };

  const referred = await ensureUser(referredUser);
  if (!referred?.id) return { ok: false, reason: 'no_referred_user', storage: growthStorageMode() };

  if (String(referred.telegram_id) === String(refId)) {
    return { ok: false, reason: 'self_referral_blocked', storage: growthStorageMode() };
  }

  if (!hasDb()) {
    return { ok: true, registered: false, reason: 'memory-preview', storage: 'memory-preview' };
  }

  const referrer = await getProfileByTelegramId(refId);
  if (!referrer?.id) return { ok: false, reason: 'referrer_not_found', storage: 'supabase-postgres' };

  const existing = await supabase(
    `referrals?referred_id=eq.${encodeURIComponent(referred.id)}&select=*&limit=1`,
    { method: 'GET' }
  ).catch(() => []);

  if (existing?.[0]) {
    return {
      ok: true,
      registered: false,
      reason: 'already_referred',
      storage: 'supabase-postgres',
      referral: existing[0]
    };
  }

  const rewardXp = 50;
  const rewardCoins = 100;
  const referredBonusXp = 25;
  const referredBonusCoins = 50;

  const rows = await supabase('referrals', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      referrer_id: referrer.id,
      referred_id: referred.id,
      source,
      reward_xp: rewardXp,
      reward_coins: rewardCoins,
      rewarded: true
    })
  });

  await patchUser(referrer, {
    xp_total: toInt(referrer.xp_total) + rewardXp,
    level: levelFromXpTotal(toInt(referrer.xp_total) + rewardXp),
    coins: toInt(referrer.coins) + rewardCoins
  });

  const updatedReferred = await patchUser(referred, {
    xp_total: toInt(referred.xp_total) + referredBonusXp,
    level: levelFromXpTotal(toInt(referred.xp_total) + referredBonusXp),
    coins: toInt(referred.coins) + referredBonusCoins
  });

  return {
    ok: true,
    registered: true,
    storage: 'supabase-postgres',
    referral: Array.isArray(rows) ? rows[0] : null,
    rewards: {
      referrer: { xp: rewardXp, coins: rewardCoins },
      referred: { xp: referredBonusXp, coins: referredBonusCoins }
    },
    profile: toClientProfile(updatedReferred)
  };
}

export async function logShareEvent(user, type = 'generic', payload = {}) {
  const row = await ensureUser(user);
  if (!hasDb() || !row?.id) {
    return { ok: true, storage: 'memory-preview', logged: false };
  }

  await supabase('share_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: row.id,
      share_type: String(type || 'generic').slice(0, 60),
      payload
    })
  });

  return { ok: true, storage: 'supabase-postgres', logged: true };
}
