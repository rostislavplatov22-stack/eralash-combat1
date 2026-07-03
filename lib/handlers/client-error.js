import { parseBody } from '../_telegram.js';
import { logReleaseError } from '../_release.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(200).json({ ok: true, endpoint: 'client-error' });
      return;
    }
    const body = await parseBody(req);
    const result = await logReleaseError(body.type || 'client', {
      ...body,
      source: body.source || 'miniapp-client',
      userAgent: req.headers['user-agent'] || body.userAgent || ''
    });
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
