// Analytics, LiveOps and Feedback helpers for EraLash Combat.
// Server-only helpers: use Supabase service role from Vercel env, never expose secret keys in browser.

import { ensureUser, toClientProfile } from './_db.js';
import { hasDb, supabase, toInt } from './_admin-tools.js';

const memory = globalThis.__ERALASH_ANALYTICS_STORE__ || {
  events: [],
  feedback: [],
  liveops: new Map()
};
globalThis.__ERALASH_ANALYTICS_STORE__ = memory;

const DEFAULT_CONFIGS = {
  daily_reward: {
    public: true,
    description: 'Daily reward tuning',
    value: { minCoins: 50, maxCoins: 250, baseXp: 30, streakBonusCoins: 25 }
  },
  battle_rewards: {
    public: true,
    description: 'Battle result reward tuning',
    value: { winXp: 100, winCoins: 50, lossXp: 25, lossCoins: 10, perfectBonusXp: 50 }
  },
  season_points: {
    public: true,
    description: 'Season/tournament points tuning',
    value: { winBase: 100, lossBase: 25, cleanWinBonus: 30, speedBonusMax: 60 }
  },
  founder_bonus: {
    public: true,
    description: 'Founder launch campaign switch',
    value: { active: true, maxClaims: 100, xp: 50, coins: 100, itemId: 'founder_frame' }
  },
  maintenance: {
    public: true,
    description: 'Maintenance mode and public message',
    value: { enabled: false, message: 'Arena online. Good fight.' }
  },
  launch_message: {
    public: true,
    description: 'Public launch copy shown in Mini App',
    value: { title: 'EraLash Combat — Public Launch', body: 'Enter the Dark Arena, win fights, earn rewards and climb the season ranking.' }
  }
};

function nowIso() {
  return new Date().toISOString();
}

function clampLimit(value, fallback = 50) {
  return Math.max(1, Math.min(500, toInt(value, fallback)));
}

function safeEventName(value) {
  return String(value || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .slice(0, 80);
}

function cleanUserPayload(user = {}) {
  return {
    id: String(user.id || user.telegram_id || user.telegramId || '').trim(),
    username: String(user.username || '').trim(),
    first_name: String(user.first_name || user.firstName || '').trim(),
    last_name: String(user.last_name || user.lastName || '').trim()
  };
}

function cleanText(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function dateIsoHoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function analyticsStorageMode() {
  return hasDb() ? 'supabase-postgres' : 'memory-preview';
}

export function defaultLiveOpsConfigs() {
  return DEFAULT_CONFIGS;
}

export async function syncLiveOpsDefaults() {
  if (!hasDb()) {
    for (const [key, cfg] of Object.entries(DEFAULT_CONFIGS)) {
      if (!memory.liveops.has(key)) memory.liveops.set(key, { key, ...cfg, updated_at: nowIso() });
    }
    return [...memory.liveops.values()];
  }

  const payload = Object.entries(DEFAULT_CONFIGS).map(([key, cfg]) => ({
    key,
    value: cfg.value,
    description: cfg.description,
    public: Boolean(cfg.public),
    updated_at: nowIso()
  }));

  const rows = await supabase('liveops_config?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(payload)
  }).catch(() => []);

  return rows || [];
}

export async function getLiveOpsConfig({ publicOnly = true } = {}) {
  await syncLiveOpsDefaults().catch(() => {});

  if (!hasDb()) {
    const configs = [...memory.liveops.values()];
    return {
      ok: true,
      storage: 'memory-preview',
      configs: publicOnly ? configs.filter(c => c.public) : configs
    };
  }

  const path = publicOnly
    ? 'liveops_config?public=eq.true&select=*&order=key.asc'
    : 'liveops_config?select=*&order=key.asc';

  const rows = await supabase(path, { method: 'GET' }).catch(() => []);
  return { ok: true, storage: 'supabase-postgres', configs: rows || [] };
}

export async function updateLiveOpsConfig(key, value, admin = {}, meta = {}) {
  const cleanKey = String(key || '').trim();
  if (!cleanKey) throw new Error('LiveOps config key is required');

  const payload = {
    key: cleanKey,
    value: value && typeof value === 'object' ? value : { value },
    description: cleanText(meta.description || DEFAULT_CONFIGS[cleanKey]?.description || ''),
    public: meta.public !== undefined ? Boolean(meta.public) : Boolean(DEFAULT_CONFIGS[cleanKey]?.public ?? true),
    updated_by: String(admin?.id || admin?.telegram_id || 'admin'),
    updated_at: nowIso()
  };

  if (!hasDb()) {
    memory.liveops.set(cleanKey, payload);
    return { ok: true, storage: 'memory-preview', config: payload };
  }

  const rows = await supabase('liveops_config?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });

  return { ok: true, storage: 'supabase-postgres', config: Array.isArray(rows) ? rows[0] : payload };
}

export async function logAnalyticsEvent(eventName, { user = {}, payload = {}, sessionId = '', source = '', req = null } = {}) {
  const cleanUser = cleanUserPayload(user);
  const name = safeEventName(eventName);
  const record = {
    event_name: name,
    telegram_id: cleanUser.id || '',
    session_id: cleanText(sessionId, 120),
    source: cleanText(source || payload?.source || 'miniapp', 80),
    payload: payload && typeof payload === 'object' ? payload : { value: payload },
    user_agent: req?.headers?.['user-agent'] || '',
    created_at: nowIso()
  };

  if (!hasDb()) {
    memory.events.unshift({ id: `mem_${Date.now()}_${Math.random().toString(16).slice(2)}`, ...record });
    memory.events = memory.events.slice(0, 2000);
    return { ok: true, storage: 'memory-preview', event: record };
  }

  let userRow = null;
  if (cleanUser.id && cleanUser.id !== 'guest') {
    userRow = await ensureUser({
      id: cleanUser.id,
      username: cleanUser.username,
      first_name: cleanUser.first_name,
      last_name: cleanUser.last_name
    }).catch(() => null);
  }

  const rows = await supabase('analytics_events', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      ...record,
      user_id: userRow?.id || null
    })
  });

  return { ok: true, storage: 'supabase-postgres', event: Array.isArray(rows) ? rows[0] : record };
}

export async function submitFeedback({ user = {}, type = 'feedback', message = '', contact = '', metadata = {}, req = null } = {}) {
  const cleanUser = cleanUserPayload(user);
  const cleanMessage = cleanText(message, 3000);
  if (!cleanMessage) throw new Error('Feedback message is required');

  const payload = {
    telegram_id: cleanUser.id || '',
    type: cleanText(type || 'feedback', 40),
    message: cleanMessage,
    contact: cleanText(contact || cleanUser.username || '', 160),
    status: 'new',
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    user_agent: req?.headers?.['user-agent'] || '',
    created_at: nowIso()
  };

  if (!hasDb()) {
    memory.feedback.unshift({ id: `mem_${Date.now()}`, ...payload });
    memory.feedback = memory.feedback.slice(0, 500);
    return { ok: true, storage: 'memory-preview', feedback: payload };
  }

  let userRow = null;
  if (cleanUser.id && cleanUser.id !== 'guest') {
    userRow = await ensureUser({
      id: cleanUser.id,
      username: cleanUser.username,
      first_name: cleanUser.first_name,
      last_name: cleanUser.last_name
    }).catch(() => null);
  }

  const rows = await supabase('feedback_messages', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      ...payload,
      user_id: userRow?.id || null
    })
  });

  await logAnalyticsEvent('feedback_submit', {
    user,
    payload: { type: payload.type },
    source: 'feedback',
    req
  }).catch(() => {});

  return { ok: true, storage: 'supabase-postgres', feedback: Array.isArray(rows) ? rows[0] : payload };
}

export async function listFeedback({ limit = 50, status = '' } = {}) {
  const safeLimit = clampLimit(limit, 50);

  if (!hasDb()) {
    const rows = status ? memory.feedback.filter(f => f.status === status) : memory.feedback;
    return { ok: true, storage: 'memory-preview', feedback: rows.slice(0, safeLimit) };
  }

  const statusPart = status ? `status=eq.${encodeURIComponent(status)}&` : '';
  const rows = await supabase(
    `feedback_messages?${statusPart}select=*,users(telegram_id,username,display_name)&order=created_at.desc&limit=${safeLimit}`,
    { method: 'GET' }
  ).catch(() => []);

  return { ok: true, storage: 'supabase-postgres', feedback: rows || [] };
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows || []) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function uniqueCount(rows, keyFn) {
  return new Set((rows || []).map(keyFn).filter(Boolean)).size;
}

function topEvents(rows, limit = 20) {
  return Object.entries(countBy(rows, r => r.event_name))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([event, count]) => ({ event, count }));
}

export async function analyticsSummary({ hours = 24, limit = 300 } = {}) {
  const since = dateIsoHoursAgo(Math.max(1, Math.min(24 * 30, toInt(hours, 24))));
  const safeLimit = clampLimit(limit, 300);

  if (!hasDb()) {
    const events = memory.events.filter(e => Date.parse(e.created_at || 0) >= Date.parse(since)).slice(0, safeLimit);
    const feedback = memory.feedback.filter(f => Date.parse(f.created_at || 0) >= Date.parse(since));
    return {
      ok: true,
      storage: 'memory-preview',
      windowHours: hours,
      summary: {
        events: events.length,
        uniquePlayers: uniqueCount(events, e => e.telegram_id),
        feedback: feedback.length,
        fightsStarted: events.filter(e => e.event_name === 'fight_start').length,
        fightsFinished: events.filter(e => e.event_name === 'fight_finish').length,
        shopOpens: events.filter(e => e.event_name === 'shop_open').length,
        starsClicks: events.filter(e => e.event_name === 'stars_click').length,
        inviteClicks: events.filter(e => e.event_name === 'invite_click').length
      },
      topEvents: topEvents(events),
      recentEvents: events.slice(0, 50),
      feedback: feedback.slice(0, 25)
    };
  }

  const [events, feedback, purchases, battles, users] = await Promise.all([
    supabase(`analytics_events?created_at=gte.${encodeURIComponent(since)}&select=*&order=created_at.desc&limit=${safeLimit}`, { method: 'GET' }).catch(() => []),
    supabase(`feedback_messages?created_at=gte.${encodeURIComponent(since)}&select=*&order=created_at.desc&limit=100`, { method: 'GET' }).catch(() => []),
    supabase(`purchases?created_at=gte.${encodeURIComponent(since)}&select=*&order=created_at.desc&limit=500`, { method: 'GET' }).catch(() => []),
    supabase(`battles?created_at=gte.${encodeURIComponent(since)}&select=*&order=created_at.desc&limit=500`, { method: 'GET' }).catch(() => []),
    supabase(`users?created_at=gte.${encodeURIComponent(since)}&select=id,telegram_id,created_at&order=created_at.desc&limit=500`, { method: 'GET' }).catch(() => [])
  ]);

  const fightStart = (events || []).filter(e => e.event_name === 'fight_start').length;
  const fightFinish = (events || []).filter(e => e.event_name === 'fight_finish').length;
  const shopOpen = (events || []).filter(e => e.event_name === 'shop_open').length;
  const starsClick = (events || []).filter(e => e.event_name === 'stars_click').length;
  const starsSuccess = (events || []).filter(e => e.event_name === 'stars_success').length + (purchases || []).filter(p => p.currency === 'stars' || p.currency === 'XTR').length;

  return {
    ok: true,
    storage: 'supabase-postgres',
    windowHours: hours,
    summary: {
      events: events?.length || 0,
      uniquePlayers: uniqueCount(events, e => e.telegram_id || e.user_id),
      newPlayers: users?.length || 0,
      feedback: feedback?.length || 0,
      battles: battles?.length || 0,
      purchases: purchases?.length || 0,
      fightsStarted: fightStart,
      fightsFinished: fightFinish,
      fightCompletionRate: fightStart ? Math.round((fightFinish / fightStart) * 100) : 0,
      shopOpens: shopOpen,
      starsClicks: starsClick,
      starsSuccess,
      starsConversionRate: shopOpen ? Math.round((starsSuccess / shopOpen) * 100) : 0,
      inviteClicks: (events || []).filter(e => e.event_name === 'invite_click').length,
      dailyClaims: (events || []).filter(e => e.event_name === 'daily_claim').length,
      promoUsed: (events || []).filter(e => e.event_name === 'promo_used').length,
      errors: (events || []).filter(e => e.event_name === 'error' || String(e.event_name).includes('error')).length
    },
    topEvents: topEvents(events),
    bySource: countBy(events, e => e.source),
    recentEvents: (events || []).slice(0, 50),
    feedback: (feedback || []).slice(0, 25)
  };
}
