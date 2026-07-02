import { parseBody } from '../_telegram.js';
import { syncShopItems, storageMode } from '../_economy.js';
import {
  requireAdmin,
  dashboardStats,
  findPlayers,
  adminGrant,
  setPlayerBan,
  resetPlayerProgress,
  upsertShopItem,
  toggleShopItem,
  createPromoCode,
  togglePromoCode,
  auditLog,
  supabase
} from '../_admin-tools.js';

function query(req, name, fallback = '') {
  return new URL(req.url, `https://${req.headers.host}`).searchParams.get(name) || fallback;
}

async function listPromos(limit = 50) {
  const rows = await supabase(
    `promo_codes?select=*&order=created_at.desc&limit=${Math.max(1, Math.min(100, Number(limit) || 50))}`,
    { method: 'GET' }
  );
  return rows || [];
}

async function listShopItems(limit = 80) {
  const rows = await supabase(
    `shop_items?select=*&order=created_at.desc&limit=${Math.max(1, Math.min(100, Number(limit) || 80))}`,
    { method: 'GET' }
  );
  return rows || [];
}

export default async function handler(req, res) {
  try {
    const body = req.method === 'POST' ? await parseBody(req) : {};
    const admin = await requireAdmin(req, body);

    if (req.method === 'GET') {
      const action = query(req, 'action', 'dashboard');

      if (action === 'players') {
        res.status(200).json({ ok: true, storage: storageMode(), players: await findPlayers(query(req, 'q', ''), query(req, 'limit', 25)) });
        return;
      }

      if (action === 'promos') {
        res.status(200).json({ ok: true, storage: storageMode(), promos: await listPromos(query(req, 'limit', 50)) });
        return;
      }

      if (action === 'shop') {
        await syncShopItems();
        res.status(200).json({ ok: true, storage: storageMode(), shopItems: await listShopItems(query(req, 'limit', 80)) });
        return;
      }

      const dashboard = await dashboardStats();
      res.status(200).json({
        ok: true,
        admin: true,
        auth: admin.method,
        ...dashboard
      });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const action = body.action || 'syncCatalog';
    let result;

    if (action === 'syncCatalog') {
      await syncShopItems();
      result = { message: 'Catalog synced' };
    } else if (action === 'findPlayers') {
      result = { players: await findPlayers(body.query || body.q || '', body.limit || 25) };
    } else if (action === 'grant') {
      result = { profile: await adminGrant(body.user || { id: body.telegramId, first_name: body.name || 'Fighter' }, body.grant || body) };
    } else if (action === 'ban') {
      result = { profile: await setPlayerBan(body.telegramId, true, body.reason || '') };
    } else if (action === 'unban') {
      result = { profile: await setPlayerBan(body.telegramId, false, '') };
    } else if (action === 'resetProgress') {
      result = { profile: await resetPlayerProgress(body.telegramId) };
    } else if (action === 'upsertShopItem') {
      result = { item: await upsertShopItem(body.item || body) };
    } else if (action === 'toggleShopItem') {
      result = { item: await toggleShopItem(body.itemId || body.id, body.active) };
    } else if (action === 'createPromo') {
      result = { promo: await createPromoCode(body.promo || body) };
    } else if (action === 'togglePromo') {
      result = { promo: await togglePromoCode(body.code, body.active) };
    } else {
      res.status(400).json({ ok: false, error: `Unknown admin action: ${action}` });
      return;
    }

    await auditLog(admin.user, action, body.targetType || '', body.telegramId || body.itemId || body.code || '', body);
    res.status(200).json({ ok: true, storage: storageMode(), action, ...result });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
}
