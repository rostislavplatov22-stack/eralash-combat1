import { parseBody } from '../_telegram.js';
import { getContentBundle, requireContentAdmin, upsertFighter, upsertArena, upsertAbility, setFighterActive, setArenaActive, setLiveBalance } from '../_content.js';

function param(req, name, fallback = '') {
  return new URL(req.url, `https://${req.headers.host || 'localhost'}`).searchParams.get(name) || fallback;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const activeOnly = param(req, 'all') !== '1';
      const bundle = await getContentBundle({ activeOnly, sync: true });
      res.status(200).json({ ok: true, ...bundle });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const body = await parseBody(req);
    const admin = await requireContentAdmin(req, body);
    const action = body.action || 'syncContent';
    let result;

    if (action === 'syncContent') {
      result = await getContentBundle({ activeOnly: false, sync: true });
    } else if (action === 'upsertFighter') {
      result = { fighter: await upsertFighter(body.fighter || body) };
    } else if (action === 'upsertArena') {
      result = { arena: await upsertArena(body.arena || body) };
    } else if (action === 'upsertAbility') {
      result = { ability: await upsertAbility(body.ability || body) };
    } else if (action === 'setFighterActive') {
      result = { fighter: await setFighterActive(body.id || body.fighterId, body.active) };
    } else if (action === 'setArenaActive') {
      result = { arena: await setArenaActive(body.id || body.arenaId, body.active) };
    } else if (action === 'setLiveBalance') {
      result = { balance: await setLiveBalance(body.balance || body) };
    } else {
      res.status(400).json({ ok: false, error: `Unknown content action: ${action}` });
      return;
    }

    res.status(200).json({ ok: true, admin: admin.method, action, ...result });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
}
