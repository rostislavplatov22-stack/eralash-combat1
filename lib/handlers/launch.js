import { launchCampaign, botPublicCopy, seasonRewardTable, founderStatus } from '../_marketing.js';
import { storageMode } from '../_store.js';
import { extractUserFromInitData } from '../_telegram.js';

export default async function handler(req, res) {
  const user = extractUserFromInitData(req.headers['x-telegram-init-data'] || '') || {};
  const founder = await founderStatus(user).catch(() => null);
  const campaign = launchCampaign();

  res.status(200).json({
    ok: true,
    storage: storageMode(),
    release: '1.0-public-launch',
    campaign,
    founder,
    copy: botPublicCopy(),
    seasonRewards: seasonRewardTable(),
    checklist: [
      'Open Telegram bot',
      'Play first fight',
      'Claim Founder reward',
      'Share invite link',
      'Enter Weekly Season Top'
    ]
  });
}
