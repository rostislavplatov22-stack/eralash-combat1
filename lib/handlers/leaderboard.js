import { leaderboard, storageMode } from '../_store.js';

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const rows = await leaderboard(20);
    res.status(200).json({
      ok: true,
      storage: storageMode(),
      leaderboard: rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
