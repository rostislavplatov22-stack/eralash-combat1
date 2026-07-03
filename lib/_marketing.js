// Public launch, marketing, news and founder reward helpers for EraLash Combat.
// Server-only helpers for Vercel single-function API.

import { PUBLIC_APP_URL } from './_telegram.js';
import { ensureUser, toClientProfile } from './_db.js';
import { hasDb, supabase, toInt } from './_admin-tools.js';

const BOT_USERNAME = String(process.env.BOT_USERNAME || '').replace(/^@/, '').trim();
const LAUNCH_CAMPAIGN_ID = 'founder_100';

function appLink() {
  return PUBLIC_APP_URL || 'https://eralash-combat1.vercel.app';
}

function botLink() {
  return BOT_USERNAME ? `https://t.me/${BOT_USERNAME}` : appLink();
}

export function launchCampaign() {
  return {
    id: LAUNCH_CAMPAIGN_ID,
    title: 'Founder Arena Drop',
    headline: 'Первые 100 бойцов получают стартовый бонус',
    description: 'Открой Mini App, сыграй первый бой, забери Founder reward и ворвись в сезонный рейтинг.',
    reward: {
      xp: 50,
      coins: 100,
      itemId: 'founder_frame',
      title: 'Founder Frame'
    },
    maxClaims: 100,
    appUrl: appLink(),
    botUrl: botLink(),
    shareText: 'Я залетаю в EraLash Combat ⚔️ Premium fighting Mini App внутри Telegram. Первые бойцы получают Founder-бонус.'
  };
}

export function launchNews() {
  return [
    {
      id: 'release_1_0',
      title: 'Release 1.0 открыт',
      body: 'Arena, Supabase-прогресс, магазин, Stars-покупки, promo, referral, season и QA-checklist работают в production.',
      tag: 'release',
      createdAt: new Date().toISOString()
    },
    {
      id: 'season_weekly',
      title: 'Weekly Arena Season',
      body: 'Играй бои, получай season points и поднимайся в топе недели. Награды можно менять через admin/economy.',
      tag: 'season',
      createdAt: new Date().toISOString()
    },
    {
      id: 'founder_drop',
      title: 'Founder Drop',
      body: 'Первые 100 игроков могут забрать +50 XP, +100 coins и Founder Frame.',
      tag: 'reward',
      createdAt: new Date().toISOString()
    }
  ];
}

export function botPublicCopy() {
  return {
    about: [
      '⚔️ <b>EraLash Combat</b>',
      '',
      'Dark premium fighting Mini App внутри Telegram.',
      'Быстрые бои против AI, HP, energy, special attacks, rewards, shop, Stars, referral и сезонный рейтинг.',
      '',
      `<b>Играть:</b> ${botLink()}`
    ].join('\n'),
    rules: [
      '📜 <b>Правила EraLash Combat</b>',
      '',
      '1. Открой Mini App.',
      '2. Выбери бойца и арену.',
      '3. Победи AI в best of 3.',
      '4. Получи XP, coins и season points.',
      '5. Возвращайся за daily reward и поднимайся в weekly top.',
      '',
      'Не накручивай результаты: backend пишет anti-cheat events.'
    ].join('\n'),
    launch: [
      '🚀 <b>Launch Event</b>',
      '',
      'Founder Arena Drop активен.',
      'Первые 100 бойцов получают +50 XP, +100 coins и Founder Frame.',
      '',
      'Нажми Play и забери бонус внутри Mini App.'
    ].join('\n')
  };
}

export function seasonRewardTable() {
  return [
    { rank: 'Top 1', reward: 'Legendary frame + 1000 coins + 500 XP' },
    { rank: 'Top 3', reward: 'Epic aura + 500 coins + 250 XP' },
    { rank: 'Top 10', reward: 'Rare title + 250 coins + 100 XP' },
    { rank: 'Participation', reward: '25 coins за участие в сезоне' }
  ];
}

export async function newsFeed(limit = 10) {
  if (!hasDb()) return { storage: 'memory-preview', news: launchNews().slice(0, limit) };
  const rows = await supabase(`news_posts?select=*&published=eq.true&order=created_at.desc&limit=${Math.max(1, Math.min(50, toInt(limit, 10)))}`, { method: 'GET' })
    .catch(() => []);
  const fallback = launchNews();
  return {
    storage: 'supabase-postgres',
    news: (rows?.length ? rows.map(row => ({
      id: row.id,
      title: row.title,
      body: row.body,
      tag: row.tag,
      createdAt: row.created_at
    })) : fallback).slice(0, limit)
  };
}

export async function founderStatus(user = {}) {
  const campaign = launchCampaign();

  if (!hasDb()) {
    return {
      ok: true,
      storage: 'memory-preview',
      campaign,
      totalClaims: 0,
      remaining: campaign.maxClaims,
      claimed: false
    };
  }

  const totalRows = await supabase(`launch_claims?campaign=eq.${encodeURIComponent(campaign.id)}&select=id`, { method: 'GET' }).catch(() => []);
  const totalClaims = Array.isArray(totalRows) ? totalRows.length : 0;

  let claimed = false;
  const row = await ensureUser(user).catch(() => null);
  if (row?.id) {
    const existing = await supabase(`launch_claims?campaign=eq.${encodeURIComponent(campaign.id)}&user_id=eq.${encodeURIComponent(row.id)}&select=id&limit=1`, { method: 'GET' }).catch(() => []);
    claimed = Boolean(existing?.[0]);
  }

  return {
    ok: true,
    storage: 'supabase-postgres',
    campaign,
    totalClaims,
    remaining: Math.max(0, campaign.maxClaims - totalClaims),
    claimed
  };
}

export async function claimFounderReward(user = {}) {
  const campaign = launchCampaign();

  if (!hasDb()) {
    return {
      ok: true,
      claimed: true,
      storage: 'memory-preview',
      campaign,
      profile: null,
      note: 'Supabase is not configured; reward simulated.'
    };
  }

  const row = await ensureUser(user);
  if (!row?.id) {
    const error = new Error('Telegram user is required');
    error.status = 400;
    throw error;
  }

  const existing = await supabase(`launch_claims?campaign=eq.${encodeURIComponent(campaign.id)}&user_id=eq.${encodeURIComponent(row.id)}&select=*&limit=1`, { method: 'GET' }).catch(() => []);
  if (existing?.[0]) {
    return {
      ok: true,
      claimed: false,
      alreadyClaimed: true,
      storage: 'supabase-postgres',
      campaign,
      profile: toClientProfile(row)
    };
  }

  const totalRows = await supabase(`launch_claims?campaign=eq.${encodeURIComponent(campaign.id)}&select=id`, { method: 'GET' }).catch(() => []);
  const totalClaims = Array.isArray(totalRows) ? totalRows.length : 0;
  if (totalClaims >= campaign.maxClaims) {
    return {
      ok: true,
      claimed: false,
      soldOut: true,
      storage: 'supabase-postgres',
      campaign,
      profile: toClientProfile(row)
    };
  }

  const xpTotal = toInt(row.xp_total) + campaign.reward.xp;
  const coins = toInt(row.coins) + campaign.reward.coins;
  const level = Math.max(1, Math.floor(xpTotal / 250) + 1);

  const updatedRows = await supabase(`users?id=eq.${encodeURIComponent(row.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      xp_total: xpTotal,
      coins,
      level,
      updated_at: new Date().toISOString()
    })
  });

  const updated = Array.isArray(updatedRows) ? updatedRows[0] : { ...row, xp_total: xpTotal, coins, level };

  await supabase('launch_claims', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      campaign: campaign.id,
      user_id: row.id,
      telegram_id: String(row.telegram_id || user.id || ''),
      reward: campaign.reward
    })
  });

  // Add Founder Frame as a cosmetic item if inventory table exists.
  await supabase('inventory', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: row.id,
      item_id: campaign.reward.itemId,
      source: 'launch-founder-drop',
      metadata: { campaign: campaign.id }
    })
  }).catch(() => {});

  return {
    ok: true,
    claimed: true,
    storage: 'supabase-postgres',
    campaign,
    profile: toClientProfile(updated),
    remaining: Math.max(0, campaign.maxClaims - totalClaims - 1)
  };
}
