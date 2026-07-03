import { parseBody, extractUserFromInitData } from '../_telegram.js';
import { requireAdmin } from '../_admin-tools.js';
import { analyticsSummary, logAnalyticsEvent } from '../_analytics.js';

function params(req) {
  return new URL(req.url, `https://${req.headers.host || 'localhost'}`).searchParams;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const tgUser = extractUserFromInitData(req.headers['x-telegram-init-data'] || '') || null;
      const user = tgUser || body.user || {};
      const eventName = body.event || body.eventName || body.name || 'event';

      const result = await logAnalyticsEvent(eventName, {
        user,
        payload: body.payload || body.data || {},
        sessionId: body.sessionId || body.session || '',
        source: body.source || 'miniapp',
        req
      });

      res.status(200).json(result);
      return;
    }

    await requireAdmin(req, {});
    const q = params(req);
    const data = await analyticsSummary({
      hours: q.get('hours') || 24,
      limit: q.get('limit') || 300
    });
    res.status(200).json(data);
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
}
