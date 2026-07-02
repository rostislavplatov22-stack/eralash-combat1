import { appUrl, telegram, parseBody, WEBHOOK_SECRET } from './_telegram.js';

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

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(200).json({ ok: true, endpoint: 'eralash-combat-bot' });
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
        await telegram('sendMessage', {
          chat_id: chatId,
          text: '👤 Профиль обновляется после боя в Mini App. Открой игру и заверши матч.',
          ...mainMenu(url)
        });
      } else if (text.startsWith('/leaderboard')) {
        await telegram('sendMessage', {
          chat_id: chatId,
          text: '🏆 Рейтинг будет отображаться после первых боёв. Для production подключи постоянную БД.',
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
        await telegram('sendMessage', {
          chat_id: chatId,
          text: '🏆 Weekly Arena Leaderboard появится после подключения постоянной БД. Сейчас результаты принимает /api/result.',
          ...mainMenu(url)
        });
      }

      if (cb.data === 'profile') {
        await answerCallback(cb, 'Профиль');
        await telegram('sendMessage', {
          chat_id: chatId,
          text: '👤 Combat Profile: сыграй бой в Mini App, чтобы обновить XP, coins, wins и streak.',
          ...mainMenu(url)
        });
      }

      if (cb.data === 'rewards') {
        await answerCallback(cb, 'Награды');
        await telegram('sendMessage', {
          chat_id: chatId,
          text: '🎁 Награды: победа +100 XP / +50 coins, поражение +25 XP / +10 coins.',
          ...mainMenu(url)
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
