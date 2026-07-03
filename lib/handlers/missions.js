import { parseBody, validateInitData, extractUserFromInitData } from '../_telegram.js';
import { listMissions, claimMission } from '../_missions.js';

function userFrom(req, body = {}) {
  const initData = req.headers['x-telegram-init-data'] || '';
  if (validateInitData(initData)) return extractUserFromInitData(initData);
  return body.user || { id: 'guest', first_name: 'Guest' };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const user = userFrom(req, body);
      const action = body.action || 'claim';
      if (action === 'claim') {
        res.status(200).json(await claimMission(user, body.missionId || body.mission_id));
        return;
      }
      res.status(400).json({ ok:false, error:'Unknown mission action' });
      return;
    }

    res.status(200).json(await listMissions(userFrom(req, {})));
  } catch (error) {
    res.status(error.status || 500).json({ ok:false, error:error.message });
  }
}
