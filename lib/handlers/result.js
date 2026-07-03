import { parseBody, validateInitData, extractUserFromInitData } from '../_telegram.js';
import { saveResult, storageMode } from '../_store.js';
import { validateBattleSubmission } from '../_security.js';
import { recordSeasonBattle } from '../_growth.js';
import { recordMissionFromBattle, unlockAchievement } from '../_missions.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const initData = req.headers['x-telegram-init-data'] || '';
    const isTelegram = validateInitData(initData);
    const body = await parseBody(req);

    const userFromTelegram = isTelegram ? extractUserFromInitData(initData) : null;
    const record = {
      ...body,
      user: userFromTelegram || body.user || { id: 'guest', first_name: 'Guest' },
      verifiedTelegram: Boolean(isTelegram),
      serverReceivedAt: new Date().toISOString()
    };

    const security = await validateBattleSubmission(record);
    if (!security.ok) {
      res.status(security.status || 400).json({
        ok: false,
        verifiedTelegram: Boolean(isTelegram),
        storage: storageMode(),
        error: security.error,
        flags: security.flags || [],
        profile: security.profile || null
      });
      return;
    }

    const finalRecord = security.record || record;
    const profile = await saveResult(finalRecord);
    const season = await recordSeasonBattle(finalRecord.user, finalRecord).catch(error => ({ ok:false, error:error.message }));
    const missions = await recordMissionFromBattle(finalRecord.user, finalRecord).catch(error => ({ ok:false, error:error.message }));
    const achievements = [];
    if (profile?.matches >= 1) {
      const first = await unlockAchievement(finalRecord.user, 'rookie_fighter', 'battle_result').catch(() => null);
      if (first?.ok && !first.already) achievements.push(first.achievement);
    }
    if (profile?.bestStreak >= 3) {
      const streak = await unlockAchievement(finalRecord.user, 'win_streak_3', 'battle_result').catch(() => null);
      if (streak?.ok && !streak.already) achievements.push(streak.achievement);
    }
    if (season?.pointsAdded) {
      const seasonAchievement = await unlockAchievement(finalRecord.user, 'season_entry', 'battle_result').catch(() => null);
      if (seasonAchievement?.ok && !seasonAchievement.already) achievements.push(seasonAchievement.achievement);
    }

    res.status(200).json({
      ok: true,
      verifiedTelegram: Boolean(isTelegram),
      storage: storageMode(),
      antiCheatFlags: security.flags || [],
      season,
      missions,
      achievements,
      profile
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.message });
  }
}
