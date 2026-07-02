import { appUrl, telegram, parseBody, WEBHOOK_SECRET } from './_telegram.js';
import { leaderboard, getProfile, storageMode } from './_store.js';
import { claimDailyReward, SHOP_CATALOG, weeklyLeaderboard, addInventory, catalogItem } from './_economy.js';
import { ensureUser } from './_db.js';

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
        [{ text: '🥇 Weekly Top', callback_data: 'weekly_leaderboard' }]
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


function formatShop() {
  const lines = SHOP_CATALOG.map(item =>
    `• <b>${escapeHtml(item.title)}</b> — ${item.priceCoins} coins / ${item.priceStars} Stars · ${escapeHtml(item.rarity)}`
  );
  return ['🛒 <b>Premium Shop</b>', '', ...lines, '', 'Покупки делаются внутри Mini App. Telegram Stars invoice endpoint уже готов.'].join('\n');
}

function formatWeekly(rows = []) {
  if (!rows.length) return '🥇 <b>Weekly Top</b>\n\nПока нет боёв на этой неделе.';
  const lines = rows.slice(0, 10).map((p, index) =>
    `${index + 1}. <b>${escapeHtml(p.name || p.username || 'Fighter')}</b> — ${p.wins}W · ${p.xpTotal || 0} XP · ${p.coins || 0} coins`
  );
  return ['🥇 <b>Weekly Top</b>', '', ...lines].join('\n');
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
      await telegram('answerPreCheckoutQuery', {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true
      });
      res.status(200).json({ ok: true, type: 'pre_checkout' });
      return;
    }

    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text || '';

      if (msg.successful_payment?.invoice_payload) {
        try {
          const payload = JSON.parse(msg.successful_payment.invoice_payload);
          const item = catalogItem(payload.itemId);
          const userRow = await ensureUser(msg.from || { id: chatId });
          if (item && userRow?.id) await addInventory(userRow.id, item.id, 'telegram-stars');
          await telegram('sendMessage', {
            chat_id: chatId,
            text: item ? `✅ Stars purchase complete: ${escapeHtml(item.title)} добавлен в inventory.` : '✅ Stars purchase complete.',
            parse_mode: 'HTML',
            ...mainMenu(url)
          });
        } catch (_) {
          await telegram('sendMessage', {
            chat_id: chatId,
            text: '✅ Stars payment received. Inventory sync will be checked in Mini App.',
            ...mainMenu(url)
          });
        }
      } else if (text.startsWith('/start') || text.startsWith('/play')) {
        await sendHome(chatId, url);
      } else if (text.startsWith('/help')) {
        await telegram('sendMessage', {
          chat_id: chatId,
          text: 'Команды: /start, /play, /profile, /leaderboard, /daily, /shop. Управление в игре: A/D, W, J/K/L, I.',
          ...mainMenu(url)
        });
      } else if (text.startsWith('/profile')) {
        await sendProfile(chatId, url, msg.from);
      } else if (text.startsWith('/leaderboard')) {
        await sendLeaderboard(chatId, url);
      } else if (text.startsWith('/shop')) {
        await telegram('sendMessage', {
          chat_id: chatId,
          text: formatShop(),
          parse_mode: 'HTML',
          ...mainMenu(url)
        });
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
          ...mainMenu(url)
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
    }

    res.status(200).json({ ok: true, storage: storageMode() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
