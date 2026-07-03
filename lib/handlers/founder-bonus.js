import { founderStatus, claimFounderReward } from '../_marketing.js';
import { parseBody, extractUserFromInitData } from '../_telegram.js';

export default async function handler(req, res) {
  const tgUser = extractUserFromInitData(req.headers['x-telegram-init-data'] || '') || null;

  if (req.method === 'POST') {
    const body = await parseBody(req);
    const user = tgUser || body.user || {};
    const result = await claimFounderReward(user);
    res.status(200).json(result);
    return;
  }

  const data = await founderStatus(tgUser || {});
  res.status(200).json(data);
}
