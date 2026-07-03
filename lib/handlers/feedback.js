import { parseBody, extractUserFromInitData } from '../_telegram.js';
import { requireAdmin } from '../_admin-tools.js';
import { submitFeedback, listFeedback } from '../_analytics.js';

function params(req) {
  return new URL(req.url, `https://${req.headers.host || 'localhost'}`).searchParams;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const tgUser = extractUserFromInitData(req.headers['x-telegram-init-data'] || '') || null;
      const result = await submitFeedback({
        user: tgUser || body.user || {},
        type: body.type || 'feedback',
        message: body.message || body.text || '',
        contact: body.contact || '',
        metadata: body.metadata || body.payload || {},
        req
      });
      res.status(200).json(result);
      return;
    }

    await requireAdmin(req, {});
    const q = params(req);
    const data = await listFeedback({ limit: q.get('limit') || 50, status: q.get('status') || '' });
    res.status(200).json(data);
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
}
