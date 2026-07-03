// Release 1.0 / production launch helpers for EraLash Combat.
// Keeps diagnostics safe: no secret values are returned to the client.

import { BOT_TOKEN, PUBLIC_APP_URL, WEBHOOK_SECRET, telegram } from './_telegram.js';
import { storageMode } from './_store.js';
import { getShopCatalog } from './_economy.js';
import { seasonLeaderboard } from './_growth.js';
import { hasDb, supabase, adminIds } from './_admin-tools.js';

export const RELEASE_VERSION = '1.0.0-rc';

function redact(value) {
  return Boolean(String(value || '').trim());
}

function safeMessage(error) {
  return String(error?.message || error || 'unknown_error').slice(0, 500);
}

async function check(name, label, fn) {
  const started = Date.now();
  try {
    const details = await fn();
    return { key: name, label, ok: true, ms: Date.now() - started, details: details || 'ok' };
  } catch (error) {
    return { key: name, label, ok: false, ms: Date.now() - started, details: safeMessage(error) };
  }
}

async function dbPing() {
  if (!hasDb()) throw new Error('Supabase env vars are missing');
  const rows = await supabase('users?select=id&limit=1', { method: 'GET' });
  return `connected · users sample ${Array.isArray(rows) ? rows.length : 0}`;
}

async function shopPing() {
  const catalog = await getShopCatalog(true);
  if (!catalog?.length) throw new Error('shop catalog is empty');
  return `${catalog.length} active items`;
}

async function leaderboardPing() {
  if (!hasDb()) return 'memory preview';
  const rows = await supabase('users?select=telegram_id,wins,coins&order=wins.desc&limit=5', { method: 'GET' });
  return `${Array.isArray(rows) ? rows.length : 0} rows`;
}

async function seasonPing() {
  const data = await seasonLeaderboard(5);
  return `${data?.season?.title || 'season'} · ${data?.leaderboard?.length || 0} rows`;
}

async function webhookPing() {
  if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing');
  const info = await telegram('getWebhookInfo', {});
  const url = info?.result?.url || '';
  if (!url) throw new Error('Webhook URL is empty');
  return url.includes('/api/bot') ? 'webhook active' : `webhook set: ${url}`;
}

export async function releaseChecks(req) {
  const envChecks = [
    { key: 'bot_token', label: 'Bot token configured', ok: redact(BOT_TOKEN), details: redact(BOT_TOKEN) ? 'configured' : 'missing' },
    { key: 'public_app_url', label: 'PUBLIC_APP_URL configured', ok: redact(PUBLIC_APP_URL), details: PUBLIC_APP_URL ? 'configured' : 'missing' },
    { key: 'webhook_secret', label: 'Telegram webhook secret configured', ok: redact(WEBHOOK_SECRET), details: WEBHOOK_SECRET ? 'configured' : 'missing' },
    { key: 'supabase_env', label: 'Supabase service env configured', ok: hasDb(), details: hasDb() ? 'configured' : 'missing SUPABASE_URL or SERVICE_ROLE_KEY' },
    { key: 'admin_protection', label: 'Admin protection configured', ok: Boolean(process.env.ADMIN_API_SECRET && adminIds().length), details: `admins: ${adminIds().length}` }
  ];

  const liveChecks = await Promise.all([
    check('db', 'Supabase connected', dbPing),
    check('webhook', 'Telegram webhook active', webhookPing),
    check('shop', 'Shop catalog loaded', shopPing),
    check('leaderboard', 'Leaderboard available', leaderboardPing),
    check('season', 'Tournament season available', seasonPing),
    check('stars', 'Telegram Stars catalog ready', async () => {
      const catalog = await getShopCatalog(true);
      const stars = catalog.filter(item => Number(item.priceStars || 0) > 0);
      if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing');
      if (!stars.length) throw new Error('no Stars-priced items');
      return `${stars.length} Stars items`;
    })
  ]);

  const checks = [...envChecks, ...liveChecks];
  const ok = checks.every(item => Boolean(item.ok));

  return {
    ok,
    release: RELEASE_VERSION,
    storage: storageMode(),
    checkedAt: new Date().toISOString(),
    appUrl: PUBLIC_APP_URL || (req?.headers?.host ? `https://${req.headers.host}` : ''),
    checks
  };
}

function tableForType(type = 'api') {
  const t = String(type || '').toLowerCase();
  if (t.includes('payment')) return 'payment_errors';
  if (t.includes('telegram')) return 'telegram_errors';
  if (t.includes('client')) return 'client_errors';
  return 'api_errors';
}

export async function logReleaseError(type, payload = {}) {
  const table = tableForType(type);
  const record = {
    source: String(payload.source || type || 'unknown').slice(0, 120),
    message: String(payload.message || payload.error || 'unknown_error').slice(0, 1000),
    stack: String(payload.stack || '').slice(0, 4000),
    path: String(payload.path || '').slice(0, 500),
    user_agent: String(payload.userAgent || payload.user_agent || '').slice(0, 500),
    user_id: payload.userId || payload.user_id || null,
    payload: payload.payload || payload || {}
  };

  if (!hasDb()) {
    console.warn('[release-log:memory]', table, record.message);
    return { ok: true, storage: 'memory-preview', table };
  }

  await supabase(table, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(record)
  });

  return { ok: true, storage: 'supabase-postgres', table };
}

export function publicStatus(snapshot) {
  return {
    ok: snapshot.ok,
    release: snapshot.release,
    storage: snapshot.storage,
    checkedAt: snapshot.checkedAt,
    checks: snapshot.checks.map(item => ({
      key: item.key,
      label: item.label,
      ok: Boolean(item.ok),
      ms: item.ms,
      details: String(item.details || '').slice(0, 160)
    }))
  };
}
