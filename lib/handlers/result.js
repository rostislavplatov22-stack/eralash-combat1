import { parseBody, validateInitData, extractUserFromInitData } from '../_telegram.js';
import { saveResult, storageMode } from '../_store.js';
import { validateBattleSubmission } from '../_security.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const initData = req.headers['x-telegram-init-data'] || '';
    const isTelegram = validateInitData(initData);
    const body = await parseBody(req);

    const userFromTelegram = isTelegram ? extractUserFromInitData(initData) : null;
    const record = {
      ...body,
      user: userFromTelegram || body.user || { id: 'guest', first_name: 'Guest' },
      verifiedTelegram: Boolean(isTelegram),
      serverReceivedAt: new Date().toISOString()
    };

    const security = await validateBattleSubmission(record);
    if (!security.ok) {
      res.status(security.status || 400).json({
        ok: false,
        verifiedTelegram: Boolean(isTelegram),
        storage: storageMode(),
        error: security.error,
        flags: security.flags || [],
        profile: security.profile || null
      });
      return;
    }

    const profile = await saveResult(security.record || record);

    res.status(200).json({
      ok: true,
      verifiedTelegram: Boolean(isTelegram),
      storage: storageMode(),
      antiCheatFlags: security.flags || [],
      profile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
