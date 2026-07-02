import { parseBody } from './_telegram.js';
import { getRequestUser, createStarsInvoice } from './_economy.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const body = await parseBody(req);
    const { user, isTelegram } = await getRequestUser(req, body);

    if (!isTelegram) {
      res.status(401).json({ ok: false, error: 'Telegram Mini App initData is required for Stars invoice' });
      return;
    }

    const result = await createStarsInvoice(user, body.itemId);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
