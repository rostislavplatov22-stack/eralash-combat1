import {
  hasDatabase,
  saveBattleResult,
  getLeaderboard,
  getProfileByTelegramId,
  ensureUser,
  toClientProfile
} from './_db.js';

// Fallback in-memory store for local preview or when Supabase env vars are not set.
const globalStore = globalThis.__ERALASH_COMBAT_STORE__ || {
  results: [],
  users: new Map()
};
globalThis.__ERALASH_COMBAT_STORE__ = globalStore;

function memoryProfileFromRecord(record) {
  const user = record.user || { id: 'guest', first_name: 'Guest' };
  const id = String(user.id || 'guest');
  const prev = globalStore.users.get(id) || {
    id,
    telegramId: id,
    username: user.username || '',
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Fighter',
    level: 1,
    xp: 0,
    xpTotal: 0,
    coins: 0,
    wins: 0,
    losses: 0,
    matches: 0,
    streak: 0,
    bestStreak: 0,
    updatedAt: ''
  };

  const win = record.result === 'win';
  const xpAward = Number(record.rewards?.xp ?? (win ? 100 : 25));
  const coinsAward = Number(record.rewards?.coins ?? (win ? 50 : 10));

  prev.matches += 1;
  prev.xpTotal += xpAward;
  prev.xp = prev.xpTotal % 250;
  prev.level = Math.floor(prev.xpTotal / 250) + 1;
  prev.coins += coinsAward;

  if (win) {
    prev.wins += 1;
    prev.streak += 1;
    prev.bestStreak = Math.max(prev.bestStreak, prev.streak);
  } else {
    prev.losses += 1;
    prev.streak = 0;
  }

  prev.updatedAt = new Date().toISOString();
  globalStore.users.set(id, prev);
  return prev;
}

export async function saveResult(record) {
  if (hasDatabase()) {
    const profile = await saveBattleResult(record);
    if (profile) return profile;
  }

  globalStore.results.unshift(record);
  globalStore.results = globalStore.results.slice(0, 200);
  return memoryProfileFromRecord(record);
}

export async function leaderboard(limit = 20) {
  if (hasDatabase()) {
    const rows = await getLeaderboard(limit);
    if (rows) return rows;
  }

  return [...globalStore.users.values()]
    .sort((a, b) => (b.wins - a.wins) || (b.bestStreak - a.bestStreak) || (b.coins - a.coins))
    .slice(0, limit);
}

export async function getProfile(user) {
  const telegramId = String(user?.id || user?.telegram_id || '').trim();

  if (hasDatabase() && telegramId) {
    const existing = await getProfileByTelegramId(telegramId);
    if (existing) return toClientProfile(existing);

    const created = await ensureUser(user);
    if (created) return toClientProfile(created);
  }

  return globalStore.users.get(telegramId || 'guest') || {
    id: telegramId || 'guest',
    telegramId: telegramId || 'guest',
    username: user?.username || '',
    name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Fighter',
    level: 1,
    xp: 0,
    xpTotal: 0,
    coins: 0,
    wins: 0,
    losses: 0,
    matches: 0,
    streak: 0,
    bestStreak: 0,
    updatedAt: ''
  };
}

export function storageMode() {
  return hasDatabase() ? 'supabase-postgres' : 'memory-preview';
}
