import { requireProfile, getInventory, SHOP_CATALOG, syncShopItems, storageMode } from './_economy.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    await syncShopItems();
    const ctx = await requireProfile(req, {});
    const inventory = await getInventory(ctx.row.id);

    res.status(200).json({
      ok: true,
      storage: storageMode(),
      profile: ctx.profile,
      inventory,
      catalog: SHOP_CATALOG
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
