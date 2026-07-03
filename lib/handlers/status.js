import { releaseChecks, publicStatus } from '../_release.js';

export default async function handler(req, res) {
  try {
    const snapshot = await releaseChecks(req);
    res.status(snapshot.ok ? 200 : 503).json(publicStatus(snapshot));
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
