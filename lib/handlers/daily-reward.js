import { parseBody } from '../_telegram.js';
import { requireProfile, claimDailyReward, getDailyStatus, storageMode } from '../_economy.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const ctx = await requireProfile(req, {});
      const status = await getDailyStatus(ctx.row.id, ctx.row);
      res.status(200).json({
        ok: true,
        storage: storageMode(),
        profile: ctx.profile,
        status
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const ctx = await requireProfile(req, body);
      const result = await claimDailyReward(ctx.user);
      res.status(200).json(result);
      return;
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
