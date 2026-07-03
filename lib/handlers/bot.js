import { appUrl, telegram, parseBody, WEBHOOK_SECRET } from '../_telegram.js';
import { leaderboard, getProfile, storageMode } from '../_store.js';
import { claimDailyReward, SHOP_CATALOG, weeklyLeaderboard, catalogItem, createStarsPayload, validateStarsCheckout, completeStarsPayment } from '../_economy.js';
import { ensureUser } from '../_db.js';
import { isAdminUser } from '../_admin-tools.js';
import { referralStats, registerReferral, seasonLeaderboard } from '../_growth.js';
import { releaseChecks, publicStatus } from '../_release.js';
import { botPublicCopy, launchCampaign, newsFeed, seasonRewardTable } from '../_marketing.js';
import { analyticsSummary, getLiveOpsConfig, submitFeedback, logAnalyticsEvent } from '../_analytics.js';
import { listMissions, listAchievements, listBosses } from '../_missions.js';

function mainMenu(url) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⚔️ Играть в EraLash Combat', web_app: { url } }],
        [
          { text: '🏆 Рейтинг', callback_data: 'leaderboard' },
          { text: '👤 Профиль', callback_data: 'profile' }
        ],
        [
          { text: '🎁 Daily', callback_data: 'daily_reward' },
          { text: '🛒 Магазин', callback_data: 'shop' }
        ],
        [
          { text: '🎟️ Promo', web_app: { url: `${url}?promo=1` } },
          { text: '🥇 Weekly Top', callback_data: 'weekly_leaderboard' }
        ],
        [
          { text: '🤝 Invite', callback_data: 'invite' },
          { text: '🏆 Season', callback_data: 'season' }
        ],
        [
          { text: '📣 Launch', callback_data: 'launch' },
          { text: '📰 News', callback_data: 'news' }
        ],
        [
          { text: '🚀 Launch QA', callback_data: 'status' },
          { text: '💬 Feedback', web_app: { url: `${url}?feedback=1` } }
        ],
        [
          { text: '📊 Analytics', callback_data: 'analytics' },
          { text: '🎛️ LiveOps', callback_data: 'liveops' }
        ],
        [
          { text: '🎯 Missions', callback_data: 'missions' },
          { text: '🏅 Achievements', callback_data: 'achievements' }
        ],
        [{ text: '👹 Boss Rush', callback_data: 'boss' }],
        [{ text: '⚙️ Admin', web_app: { url: `${url}?admin=1` } }]
      ]
    }
  };
}

function formatLeaderboard(rows = []) {
  if (!rows.length) return '🏆 <b>Weekly Arena Leaderboard</b>\n\nПока нет боёв. Открой Mini App и заверши первый матч.';

  const lines = rows.slice(0, 10).map((p, index) => {
    const name = p.name || p.username || `Fighter ${p.telegramId || ''}`;
    return `${index + 1}. <b>${escapeHtml(name)}</b> — ${p.wins}W/${p.losses}L · LVL ${p.level} · ${p.coins} coins`;
  });

  return ['🏆 <b>Weekly Arena Leaderboard</b>', '', ...lines, '', `Storage: ${storageMode()}`].join('\n');
}

function formatProfile(profile) {
  return [
    '👤 <b>Combat Profile</b>',
    '',
    `<b>${escapeHtml(profile.name || 'Fighter')}</b>`,
    `LVL: ${profile.level}`,
    `XP: ${profile.xp}/250`,
    `Coins: ${profile.coins}`,
    `Wins/Losses: ${profile.wins}/${profile.losses}`,
    `Current streak: ${profile.streak}`,
    `Best streak: ${profile.bestStreak}`,
    '',
    `Storage: ${storageMode()}`
  ].join('\n');
}


function shopKeyboard(url) {
  const rows = SHOP_CATALOG.map(item => ([
    { text: `⭐ ${item.priceStars} Stars · ${item.title}`, callback_data: `stars_buy:${item.id}` }
  ]));

  rows.push([{ text: '⚔️ Открыть Mini App', web_app: { url } }]);
  rows.push([{ text: '🏠 Главное меню', callback_data: 'home' }]);

  return { reply_markup: { inline_keyboard: rows } };
}

function formatShop() {
  const lines = SHOP_CATALOG.map(item =>
    `• <b>${escapeHtml(item.title)}</b> — ${item.priceCoins} coins / ${item.priceStars} Stars · ${escapeHtml(item.rarity)}`
  );
  return [
    '🛒 <b>Premium Shop</b>',
    '',
    ...lines,
    '',
    'Можно купить за coins внутри Mini App или напрямую за Telegram Stars через кнопки ниже.'
  ].join('\n');
}

function formatWeekly(rows = []) {
  if (!rows.length) return '🥇 <b>Weekly Top</b>\n\nПока нет боёв на этой неделе.';
  const lines = rows.slice(0, 10).map((p, index) =>
    `${index + 1}. <b>${escapeHtml(p.name || p.username || 'Fighter')}</b> — ${p.wins}W · ${p.xpTotal || 0} XP · ${p.coins || 0} coins`
  );
  return ['🥇 <b>Weekly Top</b>', '', ...lines].join('\n');
}


function formatInvite(data = {}) {
  return [
    '🤝 <b>Invite & Earn</b>',
    '',
    'Пригласи друга в EraLash Combat:',
    '• ты получишь +50 XP и +100 coins;',
    '• друг получит стартовый бонус +25 XP и +50 coins;',
    '',
    `<b>Твоя ссылка:</b>`,
    escapeHtml(data.inviteLink || 'Открой из Telegram, чтобы получить ссылку.'),
    '',
    `Invited: ${data.stats?.total || 0} · Rewarded: ${data.stats?.rewarded || 0}`
  ].join('\n');
}

function formatSeasonBoard(data = {}) {
  const rows = data.leaderboard || [];
  const seasonTitle = data.season?.title || 'Current Season';
  if (!rows.length) return `🏆 <b>${escapeHtml(seasonTitle)}</b>\n\nПока нет очков сезона. Заверши бой, чтобы попасть в сезонный рейтинг.`;
  const lines = rows.slice(0, 10).map((p, index) =>
    `${index + 1}. <b>${escapeHtml(p.name || p.username || 'Fighter')}</b> — ${p.points || 0} pts · ${p.wins || 0}W/${p.losses || 0}L`
  );
  return [`🏆 <b>${escapeHtml(seasonTitle)}</b>`, '', ...lines, '', `Storage: ${data.storage || storageMode()}`].join('\n');
}


function formatStatus(snapshot = {}) {
  const checks = snapshot.checks || [];
  const lines = checks.slice(0, 12).map(c => `${c.ok ? '✅' : '❌'} ${escapeHtml(c.label || c.key)} — ${escapeHtml(c.details || '')}`);
  return [
    '🚀 <b>EraLash Combat Launch Status</b>',
    '',
    ...lines,
    '',
    `Release: ${escapeHtml(snapshot.release || '1.0')}`,
    `Storage: ${escapeHtml(snapshot.storage || storageMode())}`
  ].join('\n');
}

async function sendStatus(chatId, url) {
  const snapshot = publicStatus(await releaseChecks({ headers: { host: new URL(url).host } }));
  await telegram('sendMessage', {
    chat_id: chatId,
    text: formatStatus(snapshot),
    parse_mode: 'HTML',
    ...mainMenu(url)
  });
}

async function sendInvite(chatId, url, telegramUser) {
  const data = await referralStats(telegramUser || { id: chatId }, url);
  await telegram('sendMessage', {
    chat_id: chatId,
    text: formatInvite(data),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📤 Поделиться', url: `https://t.me/share/url?url=${encodeURIComponent(data.inviteLink || url)}&text=${encodeURIComponent('Заходи в EraLash Combat — premium fighting Mini App. Получим бонусы за приглашение!')}` }],
        [{ text: '⚔️ Открыть игру', web_app: { url: `${url}?ref=1` } }],
        [{ text: '🏠 Главное меню', callback_data: 'home' }]
      ]
    }
  });
}

async function sendSeason(chatId, url) {
  const data = await seasonLeaderboard(10);
  await telegram('sendMessage', {
    chat_id: chatId,
    text: formatSeasonBoard(data),
    parse_mode: 'HTML',
    ...mainMenu(url)
  });
}

async function sendLaunch(chatId, url) {
  const copy = botPublicCopy();
  const campaign = launchCampaign();
  const rewards = seasonRewardTable().map(r => `• <b>${escapeHtml(r.rank)}</b>: ${escapeHtml(r.reward)}`).join('\n');

  await telegram('sendMessage', {
    chat_id: chatId,
    text: [
      copy.launch,
      '',
      '<b>Season rewards:</b>',
      rewards
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⚔️ Играть и забрать Founder Gift', web_app: { url: `${url}?launch=1` } }],
        [{ text: '📤 Поделиться запуском', url: `https://t.me/share/url?url=${encodeURIComponent(campaign.botUrl || url)}&text=${encodeURIComponent(campaign.shareText)}` }],
        [{ text: '🏠 Главное меню', callback_data: 'home' }]
      ]
    }
  });
}

async function sendNews(chatId, url) {
  const feed = await newsFeed(5);
  const lines = (feed.news || []).map(item =>
    `• <b>${escapeHtml(item.title)}</b>\n${escapeHtml(item.body)}`
  ).join('\n\n');

  await telegram('sendMessage', {
    chat_id: chatId,
    text: ['📰 <b>EraLash Combat News</b>', '', lines || 'Новостей пока нет.'].join('\n'),
    parse_mode: 'HTML',
    ...mainMenu(url)
  });
}

async function sendRules(chatId, url) {
  await telegram('sendMessage', {
    chat_id: chatId,
    text: botPublicCopy().rules,
    parse_mode: 'HTML',
    ...mainMenu(url)
  });
}

async function sendAbout(chatId, url) {
  await telegram('sendMessage', {
    chat_id: chatId,
    text: botPublicCopy().about,
    parse_mode: 'HTML',
    ...mainMenu(url)
  });
}



async function sendMissions(chatId, url, telegramUser) {
  const data = await listMissions(telegramUser).catch(error => ({ ok:false, error:error.message, missions:[] }));
  const lines = (data.missions || []).slice(0, 6).map(m =>
    `• <b>${escapeHtml(m.title)}</b> — ${m.progress || 0}/${m.goal_value || 1} · ${m.claimed ? 'claimed' : m.completed ? 'ready' : 'progress'}`
  );
  await telegram('sendMessage', {
    chat_id: chatId,
    text: ['🎯 <b>Combat Missions</b>', '', ...(lines.length ? lines : ['Пока миссии не загружены.']), '', 'Открой Mini App, чтобы забрать награды.'].join('\n'),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '🎯 Открыть Missions', web_app: { url: `${url}?missions=1` } }], [{ text:'🏠 Главное меню', callback_data:'home' }]] }
  });
}

async function sendAchievements(chatId, url, telegramUser) {
  const data = await listAchievements(telegramUser).catch(error => ({ ok:false, error:error.message, achievements:[] }));
  const lines = (data.achievements || []).slice(0, 6).map(a =>
    `• ${a.unlocked ? '✅' : '🔒'} <b>${escapeHtml(a.title)}</b> · ${escapeHtml(a.rarity || 'common')}`
  );
  await telegram('sendMessage', {
    chat_id: chatId,
    text: ['🏅 <b>Achievements</b>', '', ...(lines.length ? lines : ['Пока достижения не загружены.'])].join('\n'),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '🏅 Открыть Achievements', web_app: { url: `${url}?achievements=1` } }], [{ text:'🏠 Главное меню', callback_data:'home' }]] }
  });
}

async function sendBoss(chatId, url, telegramUser) {
  const data = await listBosses(telegramUser).catch(error => ({ ok:false, error:error.message, bosses:[] }));
  const lines = (data.bosses || []).map(b =>
    `• <b>${escapeHtml(b.title)}</b> — HP x${b.hp_multiplier || 1} / DMG x${b.damage_multiplier || 1} · +${b.reward_xp || 0} XP`
  );
  await telegram('sendMessage', {
    chat_id: chatId,
    text: ['👹 <b>Boss Rush</b>', '', ...(lines.length ? lines : ['Boss Rush пока не загружен.']), '', 'Открой Mini App, чтобы протестировать награды и следующий PvE-режим.'].join('\n'),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '👹 Открыть Boss Rush', web_app: { url: `${url}?boss=1` } }], [{ text:'🏠 Главное меню', callback_data:'home' }]] }
  });
}


function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

async function answerCallback(callbackQuery, text = 'Готово') {
  await telegram('answerCallbackQuery', {
    callback_query_id: callbackQuery.id,
    text,
    show_alert: false
  });
}


async function sendFeedback(chatId, url) {
  await telegram('sendMessage', {
    chat_id: chatId,
    text: [
      '💬 <b>Feedback</b>',
      '',
      'Нашёл баг, есть идея или хочешь отправить отзыв?',
      'Открой форму внутри Mini App — сообщение сохранится в Supabase и попадёт в админку.'
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💬 Отправить feedback', web_app: { url: `${url}?feedback=1` } }],
        [{ text: '🏠 Главное меню', callback_data: 'home' }]
      ]
    }
  });
}

async function sendAnalytics(chatId, url, telegramUser) {
  if (!isAdminUser(telegramUser)) {
    await telegram('sendMessage', { chat_id: chatId, text: '⛔ Analytics доступен только администратору.', ...mainMenu(url) });
    return;
  }

  const data = await analyticsSummary({ hours: 24, limit: 200 }).catch(error => ({ ok:false, error:error.message, summary:{} }));
  const s = data.summary || {};
  await telegram('sendMessage', {
    chat_id: chatId,
    text: [
      '📊 <b>Live Analytics 24h</b>',
      '',
      `Events: ${s.events || 0}`,
      `Unique players: ${s.uniquePlayers || 0}`,
      `Fights: ${s.fightsStarted || 0} start / ${s.fightsFinished || 0} finish`,
      `Completion: ${s.fightCompletionRate || 0}%`,
      `Shop opens: ${s.shopOpens || 0}`,
      `Stars conversion: ${s.starsConversionRate || 0}%`,
      `Feedback: ${s.feedback || 0}`,
      '',
      `Storage: ${data.storage || 'unknown'}`
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Открыть Analytics', web_app: { url: `${url}?analytics=1` } }],
        [{ text: '🏠 Главное меню', callback_data: 'home' }]
      ]
    }
  });
}

async function sendLiveOps(chatId, url, telegramUser) {
  if (!isAdminUser(telegramUser)) {
    await telegram('sendMessage', { chat_id: chatId, text: '⛔ LiveOps доступен только администратору.', ...mainMenu(url) });
    return;
  }

  const data = await getLiveOpsConfig({ publicOnly: false }).catch(error => ({ ok:false, error:error.message, configs:[] }));
  const lines = (data.configs || []).slice(0, 8).map(c => `• <b>${escapeHtml(c.key)}</b>: ${escapeHtml(JSON.stringify(c.value || {})).slice(0, 120)}`).join('\n');
  await telegram('sendMessage', {
    chat_id: chatId,
    text: ['🎛️ <b>LiveOps Config</b>', '', lines || 'Конфиг пока не загружен.', '', `Storage: ${data.storage || 'unknown'}`].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎛️ Открыть LiveOps', web_app: { url: `${url}?liveops=1` } }],
        [{ text: '🏠 Главное меню', callback_data: 'home' }]
      ]
    }
  });
}

async function sendHome(chatId, url) {
  await telegram('sendMessage', {
    chat_id: chatId,
    text: [
      '⚔️ <b>EraLash Combat</b>',
      '',
      'Dark premium файтинг внутри Telegram Mini App.',
      'Нажми кнопку ниже, чтобы открыть арену, сыграть бой и сохранить результат.'
    ].join('\n'),
    parse_mode: 'HTML',
    ...mainMenu(url)
  });
}

async function sendLeaderboard(chatId, url) {
  const rows = await leaderboard(10);
  await telegram('sendMessage', {
    chat_id: chatId,
    text: formatLeaderboard(rows),
    parse_mode: 'HTML',
    ...mainMenu(url)
  });
}

async function sendProfile(chatId, url, telegramUser) {
  const profile = await getProfile(telegramUser || { id: chatId });
  await telegram('sendMessage', {
    chat_id: chatId,
    text: formatProfile(profile),
    parse_mode: 'HTML',
    ...mainMenu(url)
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(200).json({ ok: true, endpoint: 'eralash-combat-bot', storage: storageMode() });
      return;
    }

    if (WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== WEBHOOK_SECRET) {
      res.status(401).json({ ok: false, error: 'bad secret token' });
      return;
    }

    const update = await parseBody(req);
    const url = appUrl(req);

    if (update.pre_checkout_query) {
      const check = validateStarsCheckout(update.pre_checkout_query);
      await telegram('answerPreCheckoutQuery', {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: Boolean(check.ok),
        ...(check.ok ? {} : { error_message: 'Платёж не прошёл проверку. Обнови магазин и попробуй ещё раз.' })
      });
      res.status(200).json({ ok: true, type: 'pre_checkout', accepted: Boolean(check.ok), reason: check.error || null });
      return;
    }

    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text || '';

      if (msg.successful_payment?.invoice_payload) {
        try {
          const result = await completeStarsPayment(msg.from || { id: chatId }, msg.successful_payment);
          const item = result.item || catalogItem(JSON.parse(msg.successful_payment.invoice_payload || '{}').itemId);
          await telegram('sendMessage', {
            chat_id: chatId,
            text: result.ok
              ? `✅ <b>Stars purchase complete</b>\n\n${escapeHtml(item?.title || 'Item')} добавлен в inventory. Открой Mini App и проверь магазин.`
              : `⚠️ Платёж получен, но inventory не обновился: ${escapeHtml(result.error || 'unknown_error')}`,
            parse_mode: 'HTML',
            ...mainMenu(url)
          });
        } catch (error) {
          await telegram('sendMessage', {
            chat_id: chatId,
            text: `✅ Stars payment received. Inventory sync needs review: ${escapeHtml(error.message || 'unknown error')}`,
            ...mainMenu(url)
          });
        }
      } else if (text.startsWith('/start') || text.startsWith('/play')) {
        const payload = text.split(/\s+/)[1] || '';
        if (payload && payload.startsWith('ref_')) {
          const result = await registerReferral(payload, msg.from || { id: chatId }, 'bot-start');
          if (result.registered) {
            await telegram('sendMessage', {
              chat_id: chatId,
              text: '🎁 Referral bonus activated: +25 XP / +50 coins. Твой друг тоже получил награду.',
              ...mainMenu(url)
            });
          }
        }
        await sendHome(chatId, url);
      } else if (text.startsWith('/help')) {
        await telegram('sendMessage', {
          chat_id: chatId,
          text: '⚔️ Команды EraLash Combat:\n/start — главное меню\n/play — открыть арену\n/about — описание игры\n/rules — правила\n/news — новости запуска\n/launch — launch event\n/profile — профиль\n/leaderboard — рейтинг\n/daily — daily reward\n/shop — магазин Stars\n/invite — реферальная ссылка\n/season — сезонный турнир\n/status — launch QA\n/feedback — отзыв или баг\n/analytics — аналитика для админа\n/liveops — LiveOps для админа\n/missions — миссии\n/achievements — достижения\n/boss — Boss Rush\n/admin — админ-панель.\n\nУправление: A/D, W, J/K/L, I.',
          ...mainMenu(url)
        });
      } else if (text.startsWith('/about')) {
        await sendAbout(chatId, url);
      } else if (text.startsWith('/rules')) {
        await sendRules(chatId, url);
      } else if (text.startsWith('/news')) {
        await sendNews(chatId, url);
      } else if (text.startsWith('/launch')) {
        await sendLaunch(chatId, url);
      } else if (text.startsWith('/status')) {
        await sendStatus(chatId, url);
      } else if (text.startsWith('/feedback') || text.startsWith('/report')) {
        await sendFeedback(chatId, url);
      } else if (text.startsWith('/analytics')) {
        await sendAnalytics(chatId, url, msg.from);
      } else if (text.startsWith('/liveops')) {
        await sendLiveOps(chatId, url, msg.from);
      } else if (text.startsWith('/profile')) {
        await sendProfile(chatId, url, msg.from);
      } else if (text.startsWith('/leaderboard')) {
        await sendLeaderboard(chatId, url);
      } else if (text.startsWith('/shop')) {
        await telegram('sendMessage', {
          chat_id: chatId,
          text: formatShop(),
          parse_mode: 'HTML',
          ...shopKeyboard(url)
        });
      } else if (text.startsWith('/invite')) {
        await sendInvite(chatId, url, msg.from);
      } else if (text.startsWith('/season')) {
        await sendSeason(chatId, url);
      } else if (text.startsWith('/missions')) {
        await sendMissions(chatId, url, msg.from);
      } else if (text.startsWith('/achievements')) {
        await sendAchievements(chatId, url, msg.from);
      } else if (text.startsWith('/boss')) {
        await sendBoss(chatId, url, msg.from);
      } else if (text.startsWith('/admin')) {
        if (isAdminUser(msg.from)) {
          await telegram('sendMessage', {
            chat_id: chatId,
            text: '⚙️ <b>Admin Panel</b>\n\nОткрой Mini App кнопкой ниже. Доступ проверяется через ADMIN_TELEGRAM_IDS. API: /api/admin, /api/anti-cheat.',
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '⚙️ Открыть Admin Panel', web_app: { url: `${url}?admin=1` } }], [{ text: '🏠 Главное меню', callback_data: 'home' }]] }
          });
        } else {
          await telegram('sendMessage', { chat_id: chatId, text: '⛔ Admin access denied. Добавь свой Telegram ID в ADMIN_TELEGRAM_IDS.', ...mainMenu(url) });
        }
      } else if (text.startsWith('/daily')) {
        const result = await claimDailyReward(msg.from || { id: chatId });
        await telegram('sendMessage', {
          chat_id: chatId,
          text: result.claimed
            ? `🎁 Daily reward claimed: +${result.reward.xp} XP / +${result.reward.coins} coins. Streak: ${result.streak || 1}`
            : '🎁 Daily reward уже получен сегодня. Возвращайся завтра.',
          ...mainMenu(url)
        });
      } else if (msg.web_app_data?.data) {
        await telegram('sendMessage', {
          chat_id: chatId,
          text: '✅ Результат боя получен. Профиль обновлён.',
          ...mainMenu(url)
        });
      } else {
        await sendHome(chatId, url);
      }
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;

      if (cb.data === 'home') {
        await answerCallback(cb, 'Меню');
        await sendHome(chatId, url);
      }

      if (cb.data?.startsWith('stars_buy:')) {
        const itemId = cb.data.split(':')[1];
        const item = catalogItem(itemId);
        if (!item) {
          await answerCallback(cb, 'Товар не найден');
        } else {
          await answerCallback(cb, 'Открываю Stars invoice');
          await telegram('sendInvoice', {
            chat_id: chatId,
            title: item.title,
            description: item.description,
            payload: createStarsPayload(cb.from, item.id),
            currency: 'XTR',
            prices: [{ label: item.title, amount: item.priceStars }]
          });
        }
      }

      if (cb.data === 'launch') {
        await answerCallback(cb, 'Launch');
        await sendLaunch(chatId, url);
      }

      if (cb.data === 'news') {
        await answerCallback(cb, 'News');
        await sendNews(chatId, url);
      }

      if (cb.data === 'status') {
        await answerCallback(cb, 'Launch QA');
        await sendStatus(chatId, url);
      }

      if (cb.data === 'analytics') {
        await answerCallback(cb, 'Analytics');
        await sendAnalytics(chatId, url, cb.from);
      }

      if (cb.data === 'liveops') {
        await answerCallback(cb, 'LiveOps');
        await sendLiveOps(chatId, url, cb.from);
      }

      if (cb.data === 'leaderboard') {
        await answerCallback(cb, 'Рейтинг');
        await sendLeaderboard(chatId, url);
      }

      if (cb.data === 'profile') {
        await answerCallback(cb, 'Профиль');
        await sendProfile(chatId, url, cb.from);
      }

      if (cb.data === 'rewards') {
        await answerCallback(cb, 'Награды');
        await telegram('sendMessage', {
          chat_id: chatId,
          text: '🎁 Награды: победа +100 XP / +50 coins, поражение +25 XP / +10 coins. База данных сохраняет прогресс по Telegram ID.',
          ...mainMenu(url)
        });
      }

      if (cb.data === 'daily_reward') {
        await answerCallback(cb, 'Daily');
        const result = await claimDailyReward(cb.from);
        await telegram('sendMessage', {
          chat_id: chatId,
          text: result.claimed
            ? `🎁 Daily reward claimed: +${result.reward.xp} XP / +${result.reward.coins} coins. Streak: ${result.streak || 1}`
            : '🎁 Daily reward уже получен сегодня. Возвращайся завтра.',
          ...mainMenu(url)
        });
      }

      if (cb.data === 'shop') {
        await answerCallback(cb, 'Магазин');
        await telegram('sendMessage', {
          chat_id: chatId,
          text: formatShop(),
          parse_mode: 'HTML',
          ...shopKeyboard(url)
        });
      }

      if (cb.data === 'weekly_leaderboard') {
        await answerCallback(cb, 'Weekly Top');
        const rows = await weeklyLeaderboard(10);
        await telegram('sendMessage', {
          chat_id: chatId,
          text: formatWeekly(rows),
          parse_mode: 'HTML',
          ...mainMenu(url)
        });
      }

      if (cb.data === 'invite') {
        await answerCallback(cb, 'Invite');
        await sendInvite(chatId, url, cb.from);
      }

      if (cb.data === 'season') {
        await answerCallback(cb, 'Season');
        await sendSeason(chatId, url);
      }

      if (cb.data === 'missions') {
        await answerCallback(cb, 'Missions');
        await sendMissions(chatId, url, cb.from);
      }

      if (cb.data === 'achievements') {
        await answerCallback(cb, 'Achievements');
        await sendAchievements(chatId, url, cb.from);
      }

      if (cb.data === 'boss') {
        await answerCallback(cb, 'Boss Rush');
        await sendBoss(chatId, url, cb.from);
      }
    }

    res.status(200).json({ ok: true, storage: storageMode() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
