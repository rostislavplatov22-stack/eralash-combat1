import { RELEASE_VERSION } from '../_release.js';
import { storageMode } from '../_store.js';
import { hasDb } from '../_admin-tools.js';

export default async function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'eralash-combat',
    release: RELEASE_VERSION,
    storage: storageMode(),
    supabase: hasDb() ? 'configured' : 'missing',
    time: new Date().toISOString()
  });
}
