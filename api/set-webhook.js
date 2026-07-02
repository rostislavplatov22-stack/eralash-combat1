import { appUrl, telegram, WEBHOOK_SECRET } from './_telegram.js';

export default async function handler(req, res) {
  try {
    const setupSecret = process.env.SETUP_SECRET || '';
    const url = new URL(req.url, `https://${req.headers.host}`);

    if (setupSecret && url.searchParams.get('secret') !== setupSecret) {
      res.status(401).json({ ok: false, error: 'Bad setup secret' });
      return;
    }

    const base = appUrl(req);
    if (!base) {
      res.status(400).json({ ok: false, error: 'PUBLIC_APP_URL is not configured' });
      return;
    }

    const webhookUrl = `${base}/api/bot`;
    const payload = {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query', 'pre_checkout_query']
    };
    if (WEBHOOK_SECRET) payload.secret_token = WEBHOOK_SECRET;

    const result = await telegram('setWebhook', payload);
    res.status(200).json({ ok: true, webhookUrl, telegram: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
