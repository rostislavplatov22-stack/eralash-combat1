// Lightweight in-memory store for demo/serverless warm runtime.
// For production leaderboard use Vercel Postgres, Neon, Supabase or another persistent DB.
const globalStore = globalThis.__ERALASH_COMBAT_STORE__ || {
  results: [],
  users: new Map()
};
globalThis.__ERALASH_COMBAT_STORE__ = globalStore;

export function saveResult(record) {
  globalStore.results.unshift(record);
  globalStore.results = globalStore.results.slice(0, 200);

  const user = record.user || { id: 'guest', first_name: 'Guest' };
  const id = String(user.id || 'guest');
  const prev = globalStore.users.get(id) || {
    id,
    username: user.username || '',
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Fighter',
    wins: 0,
    losses: 0,
    coins: 0,
    xp: 0,
    bestStreak: 0,
    updatedAt: ''
  };

  if (record.result === 'win') prev.wins += 1;
  else prev.losses += 1;

  prev.coins = Math.max(prev.coins, Number(record.score?.coins || 0));
  prev.xp = Math.max(prev.xp, Number(record.score?.xp || 0));
  prev.bestStreak = Math.max(prev.bestStreak, Number(record.score?.bestStreak || 0));
  prev.updatedAt = new Date().toISOString();
  globalStore.users.set(id, prev);
  return prev;
}

export function leaderboard(limit = 20) {
  return [...globalStore.users.values()]
    .sort((a, b) => (b.wins - a.wins) || (b.bestStreak - a.bestStreak) || (b.coins - a.coins))
    .slice(0, limit);
}
