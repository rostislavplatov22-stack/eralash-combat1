const token = process.env.BOT_TOKEN;
const appUrl = (process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';

if (!token || !appUrl) {
  console.error('Set BOT_TOKEN and PUBLIC_APP_URL first.');
  process.exit(1);
}

const body = {
  url: `${appUrl}/api/bot`,
  allowed_updates: ['message', 'callback_query']
};
if (secret) body.secret_token = secret;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
