import { validateInitData, extractUserFromInitData } from './_telegram.js';
import { getProfile, storageMode } from './_store.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const initData = req.headers['x-telegram-init-data'] || '';
    const isTelegram = validateInitData(initData);
    const user = isTelegram ? extractUserFromInitData(initData) : null;

    if (!user) {
      res.status(200).json({
        ok: true,
        verifiedTelegram: false,
        storage: storageMode(),
        profile: null,
        note: 'Open inside Telegram Mini App to load the verified profile.'
      });
      return;
    }

    const profile = await getProfile(user);
    res.status(200).json({
      ok: true,
      verifiedTelegram: true,
      storage: storageMode(),
      profile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
