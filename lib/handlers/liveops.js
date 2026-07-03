import { parseBody } from '../_telegram.js';
import { requireAdmin } from '../_admin-tools.js';
import { getLiveOpsConfig, updateLiveOpsConfig, syncLiveOpsDefaults } from '../_analytics.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const admin = await requireAdmin(req, body);
      const result = await updateLiveOpsConfig(body.key, body.value, admin.user, {
        description: body.description,
        public: body.public
      });
      res.status(200).json(result);
      return;
    }

    const q = new URL(req.url, `https://${req.headers.host || 'localhost'}`).searchParams;
    const adminMode = q.get('admin') === '1';
    if (adminMode) await requireAdmin(req, {});
    await syncLiveOpsDefaults().catch(() => {});
    const data = await getLiveOpsConfig({ publicOnly: !adminMode });
    res.status(200).json(data);
  } catch (error) {
    res.status(error.status || 500).json({ ok: false, error: error.message });
  }
}
