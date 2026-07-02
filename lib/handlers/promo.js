import { parseBody } from '../_telegram.js';
import { requireProfile, addInventory, storageMode } from '../_economy.js';
import { supabase, toInt } from '../_admin-tools.js';
import { toClientProfile } from '../_db.js';

function cleanCode(value = '') {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function levelFromXpTotal(xpTotal) {
  return Math.max(1, Math.floor(toInt(xpTotal) / 250) + 1);
}

async function patchUserById(userId, patch = {}) {
  const rows = await supabase(`users?id=eq.${encodeURIComponent(String(userId))}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });
  return Array.isArray(rows) ? rows[0] : null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const body = await parseBody(req);
    const code = cleanCode(body.code);
    if (!code) {
      res.status(400).json({ ok: false, error: 'Promo code is required' });
      return;
    }

    const ctx = await requireProfile(req, body);

    if (ctx.row.banned) {
      res.status(403).json({ ok: false, error: 'player_banned', profile: ctx.profile });
      return;
    }

    const rows = await supabase(
      `promo_codes?code=eq.${encodeURIComponent(code)}&active=eq.true&select=*&limit=1`,
      { method: 'GET' }
    );
    const promo = rows?.[0];

    if (!promo) {
      res.status(404).json({ ok: false, storage: storageMode(), error: 'promo_not_found' });
      return;
    }

    if (promo.valid_until && Date.parse(promo.valid_until) < Date.now()) {
      res.status(400).json({ ok: false, storage: storageMode(), error: 'promo_expired', promo });
      return;
    }

    if (toInt(promo.used_count) >= toInt(promo.max_uses, 1)) {
      res.status(400).json({ ok: false, storage: storageMode(), error: 'promo_limit_reached', promo });
      return;
    }

    const redeemed = await supabase(
      `promo_redemptions?promo_code_id=eq.${encodeURIComponent(promo.id)}&user_id=eq.${encodeURIComponent(ctx.row.id)}&select=id&limit=1`,
      { method: 'GET' }
    );

    if (redeemed?.[0]) {
      res.status(200).json({ ok: true, storage: storageMode(), redeemed: false, reason: 'already_redeemed', profile: ctx.profile });
      return;
    }

    const rewardXp = toInt(promo.reward_xp);
    const rewardCoins = toInt(promo.reward_coins);
    const nextXpTotal = toInt(ctx.row.xp_total) + rewardXp;
    const nextCoins = toInt(ctx.row.coins) + rewardCoins;

    const updated = await patchUserById(ctx.row.id, {
      xp_total: nextXpTotal,
      level: levelFromXpTotal(nextXpTotal),
      coins: nextCoins
    });

    if (promo.item_id) {
      await addInventory(ctx.row.id, promo.item_id, 'promo');
    }

    await supabase('promo_redemptions?on_conflict=promo_code_id,user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({
        promo_code_id: promo.id,
        user_id: ctx.row.id,
        reward_xp: rewardXp,
        reward_coins: rewardCoins,
        item_id: promo.item_id || null
      })
    });

    await supabase(`promo_codes?id=eq.${encodeURIComponent(promo.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        used_count: toInt(promo.used_count) + 1,
        updated_at: new Date().toISOString()
      })
    });

    const profile = toClientProfile(updated || ctx.row);

    res.status(200).json({
      ok: true,
      storage: storageMode(),
      redeemed: true,
      promo: {
        code: promo.code,
        title: promo.title,
        rewardXp,
        rewardCoins,
        itemId: promo.item_id
      },
      profile
    });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
}
