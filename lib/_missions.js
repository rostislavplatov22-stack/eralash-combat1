// Missions, Achievements and Boss Rush helpers for EraLash Combat.
// Keeps gameplay goals server-side and persists progress in Supabase/Postgres.
// Falls back to memory-preview if Supabase variables are not configured.

import { ensureUser, toClientProfile, getProfileByTelegramId } from './_db.js';
import { hasDb, supabase, toInt } from './_admin-tools.js';

const memory = globalThis.__ERALASH_MISSIONS_STORE__ || {
  missionProgress: new Map(),
  achievements: new Map(),
  bossRuns: []
};
globalThis.__ERALASH_MISSIONS_STORE__ = memory;

const DEFAULT_MISSIONS = [
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Заверши первый бой на арене.',
    goal_type: 'matches',
    goal_value: 1,
    reward_xp: 50,
    reward_coins: 75,
    sort_order: 10,
    active: true
  },
  {
    id: 'three_wins',
    title: 'Arena Discipline',
    description: 'Победи 3 раза против AI.',
    goal_type: 'wins',
    goal_value: 3,
    reward_xp: 120,
    reward_coins: 150,
    sort_order: 20,
    active: true
  },
  {
    id: 'combo_hunter',
    title: 'Combo Hunter',
    description: 'Сделай комбо 3+ в бою.',
    goal_type: 'combo',
    goal_value: 3,
    reward_xp: 80,
    reward_coins: 100,
    sort_order: 30,
    active: true
  },
  {
    id: 'daily_grinder',
    title: 'Daily Grinder',
    description: 'Забери daily reward.',
    goal_type: 'daily_claims',
    goal_value: 1,
    reward_xp: 40,
    reward_coins: 80,
    sort_order: 40,
    active: true
  }
];

const DEFAULT_ACHIEVEMENTS = [
  {
    id: 'rookie_fighter',
    title: 'Rookie Fighter',
    description: 'Сыграй первый матч.',
    trigger_type: 'matches',
    threshold: 1,
    reward_xp: 25,
    reward_coins: 25,
    rarity: 'common',
    active: true
  },
  {
    id: 'win_streak_3',
    title: 'Blood Momentum',
    description: 'Достигни серии из 3 побед.',
    trigger_type: 'streak',
    threshold: 3,
    reward_xp: 100,
    reward_coins: 125,
    rarity: 'rare',
    active: true
  },
  {
    id: 'boss_slayer',
    title: 'Boss Slayer',
    description: 'Победи босса Obsidian Tyrant.',
    trigger_type: 'boss_win',
    threshold: 1,
    reward_xp: 200,
    reward_coins: 250,
    rarity: 'epic',
    active: true
  },
  {
    id: 'season_entry',
    title: 'Season Challenger',
    description: 'Получите первые сезонные очки.',
    trigger_type: 'season_points',
    threshold: 1,
    reward_xp: 60,
    reward_coins: 70,
    rarity: 'common',
    active: true
  }
];

const DEFAULT_BOSSES = [
  {
    id: 'obsidian_tyrant',
    title: 'Obsidian Tyrant',
    description: 'Тяжёлый босс с бронёй, усиленным HP и мощным ultimate.',
    hp_multiplier: 1.55,
    damage_multiplier: 1.25,
    reward_xp: 250,
    reward_coins: 300,
    unlock_level: 1,
    active: true
  },
  {
    id: 'neon_executioner',
    title: 'Neon Executioner',
    description: 'Быстрый босс с dodge-реакциями и агрессивными спецприёмами.',
    hp_multiplier: 1.25,
    damage_multiplier: 1.45,
    reward_xp: 320,
    reward_coins: 420,
    unlock_level: 3,
    active: true
  }
];

function keyFor(userId, id) {
  return `${userId || 'guest'}:${id}`;
}

function cleanUser(user = {}) {
  return {
    id: String(user.id || user.telegram_id || user.telegramId || 'guest'),
    username: user.username || '',
    first_name: user.first_name || user.firstName || '',
    last_name: user.last_name || user.lastName || ''
  };
}

function progressFromProfile(profile, mission) {
  const goal = mission.goal_type || mission.goalType;
  if (goal === 'wins') return toInt(profile?.wins);
  if (goal === 'matches') return toInt(profile?.matches);
  if (goal === 'streak') return toInt(profile?.streak || profile?.current_streak);
  return 0;
}

function memoryProfile(telegramId = 'guest') {
  return {
    id: telegramId,
    telegram_id: telegramId,
    display_name: telegramId === 'guest' ? 'Guest Fighter' : `Fighter ${telegramId}`,
    xp_total: 0,
    coins: 0,
    wins: 0,
    losses: 0,
    matches: 0,
    current_streak: 0,
    best_streak: 0,
    level: 1
  };
}

async function loadProfile(user = {}) {
  const clean = cleanUser(user);
  if (!hasDb()) return memoryProfile(clean.id);
  const row = await ensureUser(clean);
  return row || memoryProfile(clean.id);
}

async function updateUserRewards(row, xp = 0, coins = 0) {
  if (!row) return null;
  if (!hasDb()) return row;
  const xpTotal = toInt(row.xp_total) + toInt(xp);
  const next = {
    xp_total: xpTotal,
    level: Math.floor(xpTotal / 250) + 1,
    coins: toInt(row.coins) + toInt(coins),
    updated_at: new Date().toISOString()
  };
  const rows = await supabase(`users?telegram_id=eq.${encodeURIComponent(row.telegram_id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(next)
  });
  return Array.isArray(rows) ? rows[0] : { ...row, ...next };
}

export function missionStorageMode() {
  return hasDb() ? 'supabase-postgres' : 'memory-preview';
}

export async function syncProgressDefaults() {
  if (!hasDb()) return { ok: true, storage: 'memory-preview' };
  await supabase('missions?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(DEFAULT_MISSIONS)
  }).catch(() => {});
  await supabase('achievements?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(DEFAULT_ACHIEVEMENTS)
  }).catch(() => {});
  await supabase('bosses?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(DEFAULT_BOSSES)
  }).catch(() => {});
  return { ok: true, storage: 'supabase-postgres' };
}

export async function listMissions(user = {}) {
  const profileRow = await loadProfile(user);
  const profile = toClientProfile(profileRow);
  if (!hasDb()) {
    const missions = DEFAULT_MISSIONS.map(m => {
      const saved = memory.missionProgress.get(keyFor(profile.telegramId, m.id)) || {};
      const progress = Math.max(toInt(saved.progress), progressFromProfile(profile, m));
      const completed = Boolean(saved.completed) || progress >= toInt(m.goal_value);
      return { ...m, progress, completed, claimed: Boolean(saved.claimed) };
    });
    return { ok: true, storage: 'memory-preview', profile, missions };
  }

  await syncProgressDefaults().catch(() => {});
  const rows = await supabase('missions?active=eq.true&select=*&order=sort_order.asc', { method: 'GET' }).catch(() => DEFAULT_MISSIONS);
  const progressRows = await supabase(`mission_progress?user_id=eq.${profileRow.id}&select=*`, { method: 'GET' }).catch(() => []);
  const byMission = new Map((progressRows || []).map(p => [p.mission_id, p]));

  const missions = (rows || []).map(m => {
    const p = byMission.get(m.id) || {};
    const calculated = progressFromProfile(profile, m);
    const progress = Math.max(toInt(p.progress), calculated);
    const completed = Boolean(p.completed) || progress >= toInt(m.goal_value);
    return {
      ...m,
      progress,
      completed,
      claimed: Boolean(p.claimed),
      percent: Math.min(100, Math.round((progress / Math.max(1, toInt(m.goal_value))) * 100))
    };
  });

  return { ok: true, storage: 'supabase-postgres', profile, missions };
}

export async function claimMission(user = {}, missionId = '') {
  const profileRow = await loadProfile(user);
  const profile = toClientProfile(profileRow);
  const all = await listMissions(user);
  const mission = (all.missions || []).find(m => m.id === missionId);
  if (!mission) return { ok: false, error: 'Mission not found', storage: missionStorageMode() };
  if (!mission.completed) return { ok: false, error: 'Mission is not completed', mission, storage: missionStorageMode() };
  if (mission.claimed) return { ok: false, error: 'Mission already claimed', mission, storage: missionStorageMode() };

  const xp = toInt(mission.reward_xp);
  const coins = toInt(mission.reward_coins);
  const updated = await updateUserRewards(profileRow, xp, coins);

  if (!hasDb()) {
    memory.missionProgress.set(keyFor(profile.telegramId, mission.id), { progress: mission.progress, completed: true, claimed: true });
    return { ok: true, storage: 'memory-preview', mission: { ...mission, claimed: true }, reward: { xp, coins }, profile: updated };
  }

  await supabase('mission_progress?on_conflict=user_id,mission_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: profileRow.id,
      mission_id: mission.id,
      progress: mission.progress,
      completed: true,
      claimed: true,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });

  return { ok: true, storage: 'supabase-postgres', mission: { ...mission, claimed: true }, reward: { xp, coins }, profile: toClientProfile(updated || profileRow) };
}

export async function recordMissionFromBattle(user = {}, battle = {}) {
  const profileRow = await loadProfile(user);
  if (!hasDb()) return { ok: true, storage: 'memory-preview', updated: [] };

  const profile = toClientProfile(profileRow);
  const missions = await listMissions(user).catch(() => ({ missions: [] }));
  const updated = [];

  for (const mission of missions.missions || []) {
    if (mission.claimed) continue;
    let progress = mission.progress || 0;
    if (mission.goal_type === 'matches') progress = Math.max(progress, toInt(profile.matches));
    if (mission.goal_type === 'wins') progress = Math.max(progress, toInt(profile.wins));
    if (mission.goal_type === 'combo') progress = Math.max(progress, toInt(battle.score?.combo || battle.maxCombo || battle.combo || 0));
    const completed = progress >= toInt(mission.goal_value);

    if (completed || progress > 0) {
      updated.push({ mission_id: mission.id, progress, completed });
      await supabase('mission_progress?on_conflict=user_id,mission_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          user_id: profileRow.id,
          mission_id: mission.id,
          progress,
          completed,
          claimed: false,
          updated_at: new Date().toISOString()
        })
      }).catch(() => {});
    }
  }

  return { ok: true, storage: 'supabase-postgres', updated };
}

export async function listAchievements(user = {}) {
  const profileRow = await loadProfile(user);
  const profile = toClientProfile(profileRow);
  if (!hasDb()) {
    return {
      ok: true,
      storage: 'memory-preview',
      profile,
      achievements: DEFAULT_ACHIEVEMENTS.map(a => ({ ...a, unlocked: Boolean(memory.achievements.get(keyFor(profile.telegramId, a.id))) }))
    };
  }

  await syncProgressDefaults().catch(() => {});
  const rows = await supabase('achievements?active=eq.true&select=*&order=rarity.asc,title.asc', { method: 'GET' }).catch(() => DEFAULT_ACHIEVEMENTS);
  const unlocked = await supabase(`user_achievements?user_id=eq.${profileRow.id}&select=*`, { method: 'GET' }).catch(() => []);
  const unlockedSet = new Set((unlocked || []).map(x => x.achievement_id));
  const achievements = (rows || []).map(a => ({ ...a, unlocked: unlockedSet.has(a.id) }));
  return { ok: true, storage: 'supabase-postgres', profile, achievements };
}

export async function unlockAchievement(user = {}, achievementId = '', source = 'manual') {
  const profileRow = await loadProfile(user);
  const all = await listAchievements(user);
  const achievement = (all.achievements || []).find(a => a.id === achievementId);
  if (!achievement) return { ok: false, error: 'Achievement not found', storage: missionStorageMode() };
  if (achievement.unlocked) return { ok: true, already: true, achievement, storage: missionStorageMode() };

  const xp = toInt(achievement.reward_xp);
  const coins = toInt(achievement.reward_coins);
  const updated = await updateUserRewards(profileRow, xp, coins);

  if (!hasDb()) {
    memory.achievements.set(keyFor(toClientProfile(profileRow).telegramId, achievement.id), true);
    return { ok: true, storage: 'memory-preview', achievement, reward: { xp, coins }, profile: updated };
  }

  await supabase('user_achievements?on_conflict=user_id,achievement_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: profileRow.id,
      achievement_id: achievement.id,
      source,
      unlocked_at: new Date().toISOString()
    })
  });

  return { ok: true, storage: 'supabase-postgres', achievement, reward: { xp, coins }, profile: toClientProfile(updated || profileRow) };
}

export async function listBosses(user = {}) {
  const profileRow = await loadProfile(user);
  const profile = toClientProfile(profileRow);
  if (!hasDb()) return { ok: true, storage: 'memory-preview', profile, bosses: DEFAULT_BOSSES };

  await syncProgressDefaults().catch(() => {});
  const bosses = await supabase('bosses?active=eq.true&select=*&order=unlock_level.asc,title.asc', { method: 'GET' }).catch(() => DEFAULT_BOSSES);
  const recent = await supabase(`boss_runs?user_id=eq.${profileRow.id}&select=*&order=created_at.desc&limit=20`, { method: 'GET' }).catch(() => []);
  return { ok: true, storage: 'supabase-postgres', profile, bosses, recent };
}

export async function recordBossRun(user = {}, body = {}) {
  const profileRow = await loadProfile(user);
  const bossId = String(body.bossId || body.boss_id || 'obsidian_tyrant');
  const result = body.result === 'win' ? 'win' : 'loss';
  const bosses = await listBosses(user);
  const boss = (bosses.bosses || []).find(b => b.id === bossId) || DEFAULT_BOSSES[0];
  const xp = result === 'win' ? toInt(boss.reward_xp) : 35;
  const coins = result === 'win' ? toInt(boss.reward_coins) : 15;

  const updated = await updateUserRewards(profileRow, xp, coins);

  if (!hasDb()) {
    memory.bossRuns.unshift({ boss_id: bossId, result, xp_awarded: xp, coins_awarded: coins, created_at: new Date().toISOString() });
  } else {
    await supabase('boss_runs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: profileRow.id,
        boss_id: bossId,
        result,
        score: body.score || {},
        xp_awarded: xp,
        coins_awarded: coins
      })
    }).catch(() => {});
  }

  const achievement = result === 'win'
    ? await unlockAchievement(user, 'boss_slayer', 'boss_rush').catch(() => null)
    : null;

  return { ok: true, storage: missionStorageMode(), boss, result, reward: { xp, coins }, achievement, profile: toClientProfile(updated || profileRow) };
}
