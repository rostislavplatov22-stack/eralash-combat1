import { parseBody, validateInitData, extractUserFromInitData } from '../_telegram.js';
import { listAchievements, unlockAchievement } from '../_missions.js';

function userFrom(req, body = {}) {
  const initData = req.headers['x-telegram-init-data'] || '';
  if (validateInitData(initData)) return extractUserFromInitData(initData);
  return body.user || { id: 'guest', first_name: 'Guest' };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const body = await parseBody(req);
      res.status(200).json(await unlockAchievement(userFrom(req, body), body.achievementId || body.achievement_id, body.source || 'manual'));
      return;
    }
    res.status(200).json(await listAchievements(userFrom(req, {})));
  } catch (error) {
    res.status(error.status || 500).json({ ok:false, error:error.message });
  }
}
