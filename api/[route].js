import bot from '../lib/handlers/bot.js';
import result from '../lib/handlers/result.js';
import leaderboard from '../lib/handlers/leaderboard.js';
import setWebhook from '../lib/handlers/set-webhook.js';
import profile from '../lib/handlers/profile.js';
import shop from '../lib/handlers/shop.js';
import inventory from '../lib/handlers/inventory.js';
import dailyReward from '../lib/handlers/daily-reward.js';
import weeklyLeaderboard from '../lib/handlers/weekly-leaderboard.js';
import starsInvoice from '../lib/handlers/stars-invoice.js';
import admin from '../lib/handlers/admin.js';
import promo from '../lib/handlers/promo.js';
import antiCheat from '../lib/handlers/anti-cheat.js';
import content from '../lib/handlers/content.js';
import fighters from '../lib/handlers/fighters.js';
import arenas from '../lib/handlers/arenas.js';
import abilities from '../lib/handlers/abilities.js';
import referral from '../lib/handlers/referral.js';
import season from '../lib/handlers/season.js';
import health from '../lib/handlers/health.js';
import status from '../lib/handlers/status.js';
import qa from '../lib/handlers/qa.js';
import clientError from '../lib/handlers/client-error.js';
import { logReleaseError } from '../lib/_release.js';

// Single Vercel Serverless Function dispatcher.
// This keeps the project inside the Hobby plan limit while preserving public URLs:
// /api/bot, /api/shop, /api/admin, /api/promo, etc.

const routes = {
  bot,
  result,
  leaderboard,
  'set-webhook': setWebhook,
  profile,
  shop,
  inventory,
  'daily-reward': dailyReward,
  'weekly-leaderboard': weeklyLeaderboard,
  'stars-invoice': starsInvoice,
  admin,
  promo,
  'anti-cheat': antiCheat,
  content,
  fighters,
  arenas,
  abilities,
  referral,
  season,
  health,
  status,
  qa,
  'client-error': clientError
};

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const match = url.pathname.match(/^\/api\/([^/?#]+)/);
  const route = match ? decodeURIComponent(match[1]) : '';
  const routeHandler = routes[route];

  if (!routeHandler) {
    res.status(404).json({
      ok: false,
      error: 'API route not found',
      route,
      available: Object.keys(routes)
    });
    return;
  }

  try {
    return await routeHandler(req, res);
  } catch (error) {
    console.error(error);
    await logReleaseError('api', {
      source: `api/${route}`,
      message: error.message,
      stack: error.stack,
      path: url.pathname,
      userAgent: req.headers['user-agent'] || ''
    }).catch(() => {});
    res.status(error.status || 500).json({ ok: false, error: error.message || 'Internal Server Error' });
  }
}
