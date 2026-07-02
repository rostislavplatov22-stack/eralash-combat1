import { seasonLeaderboard, ensureCurrentSeason } from '../_growth.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const limit = Number(url.searchParams.get('limit') || 20);
    const data = await seasonLeaderboard(limit);
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
