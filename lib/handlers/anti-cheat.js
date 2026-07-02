import { parseBody } from '../_telegram.js';
import { requireAdmin, dashboardStats, supabase } from '../_admin-tools.js';

export default async function handler(req, res) {
  try {
    const body = req.method === 'POST' ? await parseBody(req) : {};
    await requireAdmin(req, body);

    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const limit = Math.max(1, Math.min(100, Number(new URL(req.url, `https://${req.headers.host}`).searchParams.get('limit') || body.limit || 50)));
    const events = await supabase(
      `anti_cheat_events?select=*&order=created_at.desc&limit=${limit}`,
      { method: 'GET' }
    ).catch(() => []);

    const summary = await dashboardStats();

    res.status(200).json({
      ok: true,
      storage: summary.storage,
      events,
      summary: summary.live || {}
    });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
}
