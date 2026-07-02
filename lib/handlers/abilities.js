import { parseBody } from '../_telegram.js';
import { getContentBundle, requireContentAdmin, upsertAbility } from '../_content.js';

function q(req, name, fallback = '') {
  return new URL(req.url, `https://${req.headers.host || 'localhost'}`).searchParams.get(name) || fallback;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const bundle = await getContentBundle({ activeOnly: q(req, 'all') !== '1', sync: true });
      const fighterId = q(req, 'fighterId', '');
      const abilities = fighterId ? bundle.abilities.filter(a => a.fighterId === fighterId) : bundle.abilities;
      res.status(200).json({ ok: true, storage: bundle.storage, abilities });
      return;
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const body = await parseBody(req);
    await requireContentAdmin(req, body);
    const ability = await upsertAbility(body.ability || body);

    res.status(200).json({ ok: true, ability });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
}
