import { parseBody, extractUserFromInitData, validateInitData, appUrl } from '../_telegram.js';
import { referralStats, registerReferral, logShareEvent } from '../_growth.js';

function fallbackUser(body = {}) {
  return body.user || { id: 'guest', first_name: 'Guest' };
}

function userFromReq(req, body = {}) {
  const initData = req.headers['x-telegram-init-data'] || '';
  const ok = validateInitData(initData);
  return ok ? extractUserFromInitData(initData) : fallbackUser(body);
}

export default async function handler(req, res) {
  try {
    const url = appUrl(req);
    if (req.method === 'GET') {
      const body = {};
      const user = userFromReq(req, body);
      const data = await referralStats(user, url);
      res.status(200).json(data);
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const body = await parseBody(req);
    const user = userFromReq(req, body);
    const action = body.action || 'claim';

    if (action === 'share') {
      const data = await logShareEvent(user, body.shareType || 'invite', body.payload || {});
      res.status(200).json(data);
      return;
    }

    const ref = body.ref || body.referrer || body.code || '';
    const data = await registerReferral(ref, user, body.source || 'miniapp');
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
