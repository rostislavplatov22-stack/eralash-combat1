import { newsFeed } from '../_marketing.js';

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const limit = Number(url.searchParams.get('limit') || 10);
  const data = await newsFeed(limit);
  res.status(200).json({ ok: true, ...data });
}
