import { leaderboard } from './_store.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    leaderboard: leaderboard(20),
    note: 'Demo in-memory leaderboard. Use persistent DB for production.'
  });
}
