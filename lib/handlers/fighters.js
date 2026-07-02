import { parseBody } from '../_telegram.js';
import { getContentBundle, requireContentAdmin, upsertFighter, setFighterActive } from '../_content.js';

function q(req, name, fallback = '') {
  return new URL(req.url, `https://${req.headers.host || 'localhost'}`).searchParams.get(name) || fallback;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const bundle = await getContentBundle({ activeOnly: q(req, 'all') !== '1', sync: true });
      res.status(200).json({ ok: true, storage: bundle.storage, fighters: bundle.fighters });
      return;
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const body = await parseBody(req);
    await requireContentAdmin(req, body);
    const action = body.action || 'upsert';
    const fighter = action === 'toggle'
      ? await setFighterActive(body.id || body.fighterId, body.active)
      : await upsertFighter(body.fighter || body);

    res.status(200).json({ ok: true, action, fighter });
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
}
