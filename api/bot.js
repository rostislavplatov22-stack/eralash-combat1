import { appUrl, telegram, parseBody, WEBHOOK_SECRET } from './_telegram.js';
import { leaderboard, getProfile, storageMode } from './_store.js';

function mainMenu(url) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⚔️ Играть в EraLash Combat', web_app: { url } }],
        [
          { text: '🏆 Рейтинг', callback_data: 'leaderboard' },
          { text: '👤 Профиль', callback_data: 'profile' }
        ],
        [{ text: '🎁 Награды', callback_data: 'rewards' }]
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

    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text || '';

      if (text.startsWith('/start') || text.startsWith('/play')) {
        await sendHome(chatId, url);
      } else if (text.startsWith('/help')) {
        await telegram('sendMessage', {
          chat_id: chatId,
          text: 'Команды: /start, /play, /profile, /leaderboard. Управление в игре: A/D, W, J/K/L, I.',
          ...mainMenu(url)
        });
      } else if (text.startsWith('/profile')) {
        await sendProfile(chatId, url, msg.from);
      } else if (text.startsWith('/leaderboard')) {
        await sendLeaderboard(chatId, url);
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
    }

    res.status(200).json({ ok: true, storage: storageMode() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
