import { parseBody } from './_telegram.js';
import { syncShopItems, getShopCatalog, getRequestUser, purchaseWithCoins, getInventory, requireProfile, storageMode } from './_economy.js';

export default async function handler(req, res) {
  try {
    await syncShopItems();

    if (req.method === 'GET') {
      let inventory = [];
      try {
        const ctx = await requireProfile(req, {});
        inventory = await getInventory(ctx.row.id);
      } catch (_) {}

      res.status(200).json({
        ok: true,
        storage: storageMode(),
        catalog: await getShopCatalog(true),
        inventory
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const { user } = await getRequestUser(req, body);
      const result = await purchaseWithCoins(user, body.itemId);
      res.status(result.ok === false ? 400 : 200).json(result);
      return;
    }

    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
