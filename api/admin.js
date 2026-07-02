import { parseBody } from './_telegram.js';
import { getRequestUser, SHOP_CATALOG, syncShopItems, weeklyLeaderboard, storageMode } from './_economy.js';

function adminIds() {
  return String(process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function isAdmin(user) {
  return adminIds().includes(String(user?.id || user?.telegram_id || ''));
}

export default async function handler(req, res) {
  try {
    const body = req.method === 'POST' ? await parseBody(req) : {};
    const { user } = await getRequestUser(req, body);

    if (!isAdmin(user)) {
      res.status(403).json({ ok: false, error: 'Admin Telegram ID is not allowed' });
      return;
    }

    if (req.method === 'GET') {
      await syncShopItems();
      res.status(200).json({
        ok: true,
        storage: storageMode(),
        admin: true,
        catalog: SHOP_CATALOG,
        weeklyLeaderboard: await weeklyLeaderboard(20)
      });
      return;
    }

    if (req.method === 'POST') {
      // Safe admin endpoint placeholder: sync default catalog into DB.
      await syncShopItems();
      res.status(200).json({ ok: true, storage: storageMode(), message: 'Catalog synced' });
      return;
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
