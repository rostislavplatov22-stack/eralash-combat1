import { parseBody } from '../_telegram.js';
import { requireAdmin } from '../_admin-tools.js';
import { releaseChecks } from '../_release.js';

export default async function handler(req, res) {
  try {
    const body = req.method === 'POST' ? await parseBody(req) : {};
    await requireAdmin(req, body);
    const snapshot = await releaseChecks(req);
    res.status(snapshot.ok ? 200 : 503).json(snapshot);
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
}
