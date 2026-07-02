import { weeklyLeaderboard, storageMode } from '../_economy.js';

export default async function handler(req, res) {
  try {
    const limit = Number(req.query?.limit || 20);
    const leaderboard = await weeklyLeaderboard(limit);

    res.status(200).json({
      ok: true,
      storage: storageMode(),
      season: 'weekly',
      leaderboard
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
