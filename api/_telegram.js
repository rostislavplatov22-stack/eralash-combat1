import crypto from 'node:crypto';

export const BOT_TOKEN = process.env.BOT_TOKEN || '';
export const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '').replace(/\/$/, '');
export const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

export function appUrl(req) {
  if (PUBLIC_APP_URL && PUBLIC_APP_URL.startsWith('http')) return PUBLIC_APP_URL;
  const host = req?.headers?.host || '';
  return host ? `https://${host}` : '';
}

export async function telegram(method, payload = {}) {
  if (!BOT_TOKEN) throw new Error('BOT_TOKEN is not set');
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(`Telegram API ${method} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

export function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1_000_000) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export function validateInitData(initData) {
  if (!BOT_TOKEN || !initData) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculated = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
  } catch (_) {
    return false;
  }
}

export function extractUserFromInitData(initData) {
  try {
    const params = new URLSearchParams(initData || '');
    const rawUser = params.get('user');
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (_) {
    return null;
  }
}
