// Dynamic content system for EraLash Combat.
// Fighters, arenas, abilities and balance are stored in Supabase/Postgres.
// The game still has premium defaults when Supabase is not configured.

import { requireAdmin, supabase as adminSupabase, hasDb, bool, toInt } from './_admin-tools.js';

export const DEFAULT_FIGHTERS = [
  {
    id: 'raven',
    name: 'Raven',
    archetype: 'Balanced Duelist',
    description: 'Быстрый премиальный боец с crimson impact, стабильным уроном и хорошим контролем дистанции.',
    power: 78,
    speed: 86,
    defense: 72,
    hp: 100,
    energy: 35,
    jump: 960,
    width: 78,
    height: 172,
    colorA: '#14171e',
    colorB: '#c92832',
    accent: '#d9b76a',
    specialName: 'Crimson Rift',
    ultimateName: 'Obsidian Verdict',
    unlockLevel: 1,
    priceCoins: 0,
    priceStars: 0,
    active: true,
    metadata: { role: 'player-default', visual: 'dark-red' }
  },
  {
    id: 'iron_warden',
    name: 'Iron Warden',
    archetype: 'Heavy Punisher',
    description: 'Медленнее, тяжелее и опаснее в ближней дистанции. Хорош для AI boss-подачи.',
    power: 88,
    speed: 62,
    defense: 84,
    hp: 110,
    energy: 30,
    jump: 850,
    width: 90,
    height: 188,
    colorA: '#17191c',
    colorB: '#3eb6ff',
    accent: '#d9f2ff',
    specialName: 'Steel Breaker',
    ultimateName: 'Warden Execution',
    unlockLevel: 1,
    priceCoins: 0,
    priceStars: 0,
    active: true,
    metadata: { role: 'enemy-default', visual: 'steel-blue' }
  },
  {
    id: 'velvet_viper',
    name: 'Velvet Viper',
    archetype: 'Fast Assassin',
    description: 'Очень быстрый персонаж с меньшей защитой, сильным темпом и evasive комбо.',
    power: 70,
    speed: 96,
    defense: 58,
    hp: 92,
    energy: 45,
    jump: 1020,
    width: 72,
    height: 166,
    colorA: '#180d1f',
    colorB: '#9b5cff',
    accent: '#ffcf7a',
    specialName: 'Violet Fang',
    ultimateName: 'Silent Guillotine',
    unlockLevel: 3,
    priceCoins: 850,
    priceStars: 160,
    active: true,
    metadata: { role: 'speed', visual: 'violet-gold' }
  },
  {
    id: 'ember_khan',
    name: 'Ember Khan',
    archetype: 'Grappler Bruiser',
    description: 'Массивный боец с высоким HP и тяжёлыми ударами, но более медленным перемещением.',
    power: 94,
    speed: 54,
    defense: 90,
    hp: 122,
    energy: 25,
    jump: 780,
    width: 96,
    height: 196,
    colorA: '#1a0c08',
    colorB: '#ff6a1a',
    accent: '#f4d29a',
    specialName: 'Molten Clinch',
    ultimateName: 'Forge Collapse',
    unlockLevel: 5,
    priceCoins: 1200,
    priceStars: 220,
    active: true,
    metadata: { role: 'heavy', visual: 'ember-bronze' }
  }
];

export const DEFAULT_ARENAS = [
  {
    id: 'obsidian_ring',
    title: 'Obsidian Ring',
    description: 'Тёмная арена с золотым полом, красным туманом и cinematic vignette.',
    palette: 'dark-brutal-premium',
    backgroundType: 'obsidian-city',
    floor: 'black-gold',
    accent: '#d9b76a',
    active: true,
    unlockLevel: 1,
    priceCoins: 0,
    priceStars: 0,
    metadata: { fog: 'crimson', skyline: true }
  },
  {
    id: 'neon_rooftop',
    title: 'Neon Rooftop',
    description: 'Крыша ночного города: дождь, синий неон и высокая глубина фона.',
    palette: 'cyber-arena',
    backgroundType: 'neon-rooftop',
    floor: 'chrome-wet',
    accent: '#3eb6ff',
    active: true,
    unlockLevel: 2,
    priceCoins: 900,
    priceStars: 150,
    metadata: { rain: true, parallax: true }
  },
  {
    id: 'hell_forge',
    title: 'Hell Forge',
    description: 'Адская кузница: жар, искры, бронза и мощный свет позади бойцов.',
    palette: 'mythic-combat',
    backgroundType: 'forge',
    floor: 'dark-bronze',
    accent: '#ff6a1a',
    active: true,
    unlockLevel: 4,
    priceCoins: 1300,
    priceStars: 240,
    metadata: { embers: true, heat: true }
  }
];

export const DEFAULT_ABILITIES = [
  { id: 'raven_light', fighterId: 'raven', slot: 'light', title: 'Raven Jab', description: 'Быстрый удар.', damage: 7, blockDamage: 2, startupMs: 75, activeMs: 75, recoveryMs: 145, range: 72, knockback: 235, energyCost: 0, cooldownMs: 0, active: true },
  { id: 'raven_heavy', fighterId: 'raven', slot: 'heavy', title: 'Gold Hook', description: 'Тяжёлый боковой удар.', damage: 15, blockDamage: 4, startupMs: 165, activeMs: 95, recoveryMs: 245, range: 92, knockback: 430, energyCost: 0, cooldownMs: 0, active: true },
  { id: 'raven_special', fighterId: 'raven', slot: 'special', title: 'Crimson Rift', description: 'Красный рывок-рассечение.', damage: 22, blockDamage: 7, startupMs: 200, activeMs: 130, recoveryMs: 340, range: 132, knockback: 650, energyCost: 42, cooldownMs: 1400, active: true },
  { id: 'iron_light', fighterId: 'iron_warden', slot: 'light', title: 'Steel Check', description: 'Мощный короткий удар.', damage: 8, blockDamage: 3, startupMs: 90, activeMs: 80, recoveryMs: 165, range: 74, knockback: 260, energyCost: 0, cooldownMs: 0, active: true },
  { id: 'iron_heavy', fighterId: 'iron_warden', slot: 'heavy', title: 'Warden Hammer', description: 'Медленный тяжёлый удар.', damage: 18, blockDamage: 5, startupMs: 205, activeMs: 110, recoveryMs: 295, range: 96, knockback: 470, energyCost: 0, cooldownMs: 0, active: true },
  { id: 'iron_special', fighterId: 'iron_warden', slot: 'special', title: 'Steel Breaker', description: 'Пробивной спецприём.', damage: 25, blockDamage: 9, startupMs: 240, activeMs: 140, recoveryMs: 380, range: 126, knockback: 710, energyCost: 48, cooldownMs: 1600, active: true },
  { id: 'viper_light', fighterId: 'velvet_viper', slot: 'light', title: 'Viper Tap', description: 'Очень быстрый jab.', damage: 6, blockDamage: 2, startupMs: 55, activeMs: 65, recoveryMs: 120, range: 68, knockback: 210, energyCost: 0, cooldownMs: 0, active: true },
  { id: 'viper_heavy', fighterId: 'velvet_viper', slot: 'heavy', title: 'Velvet Arc', description: 'Быстрый тяжёлый удар.', damage: 13, blockDamage: 4, startupMs: 135, activeMs: 85, recoveryMs: 205, range: 90, knockback: 390, energyCost: 0, cooldownMs: 0, active: true },
  { id: 'viper_special', fighterId: 'velvet_viper', slot: 'special', title: 'Violet Fang', description: 'Дальний быстрый спецприём.', damage: 20, blockDamage: 6, startupMs: 160, activeMs: 115, recoveryMs: 300, range: 148, knockback: 590, energyCost: 38, cooldownMs: 1200, active: true },
  { id: 'khan_light', fighterId: 'ember_khan', slot: 'light', title: 'Forge Palm', description: 'Тяжёлый light.', damage: 9, blockDamage: 3, startupMs: 105, activeMs: 80, recoveryMs: 175, range: 76, knockback: 280, energyCost: 0, cooldownMs: 0, active: true },
  { id: 'khan_heavy', fighterId: 'ember_khan', slot: 'heavy', title: 'Molten Breaker', description: 'Очень сильный heavy.', damage: 21, blockDamage: 6, startupMs: 240, activeMs: 120, recoveryMs: 340, range: 102, knockback: 540, energyCost: 0, cooldownMs: 0, active: true },
  { id: 'khan_special', fighterId: 'ember_khan', slot: 'special', title: 'Molten Clinch', description: 'Силовой спецприём.', damage: 28, blockDamage: 10, startupMs: 270, activeMs: 150, recoveryMs: 420, range: 116, knockback: 780, energyCost: 50, cooldownMs: 1800, active: true }
];

const DEFAULT_BALANCE = {
  id: 'live',
  activeFighterId: 'raven',
  enemyFighterId: 'iron_warden',
  activeArenaId: 'obsidian_ring',
  damageMultiplier: 1,
  aiDifficulty: 0.62,
  updatedAt: ''
};

function dbFighterToClient(row = {}) {
  return {
    id: row.id,
    name: row.name,
    archetype: row.archetype || '',
    description: row.description || '',
    power: toInt(row.power, 75),
    speed: toInt(row.speed, 75),
    defense: toInt(row.defense, 70),
    hp: toInt(row.hp, 100),
    energy: toInt(row.energy, 35),
    jump: toInt(row.jump, 900),
    width: toInt(row.width, 78),
    height: toInt(row.height, 172),
    colorA: row.color_a || '#14171e',
    colorB: row.color_b || '#c92832',
    accent: row.accent || '#d9b76a',
    specialName: row.special_name || '',
    ultimateName: row.ultimate_name || '',
    portraitUrl: row.portrait_url || '',
    spriteUrl: row.sprite_url || '',
    unlockLevel: toInt(row.unlock_level, 1),
    priceCoins: toInt(row.price_coins, 0),
    priceStars: toInt(row.price_stars, 0),
    active: row.active !== false,
    metadata: row.metadata || {}
  };
}

function dbArenaToClient(row = {}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    palette: row.palette || '',
    backgroundType: row.background_type || '',
    floor: row.floor || '',
    accent: row.accent || '#d9b76a',
    unlockLevel: toInt(row.unlock_level, 1),
    priceCoins: toInt(row.price_coins, 0),
    priceStars: toInt(row.price_stars, 0),
    active: row.active !== false,
    metadata: row.metadata || {}
  };
}

function dbAbilityToClient(row = {}) {
  return {
    id: row.id,
    fighterId: row.fighter_id,
    slot: row.slot,
    title: row.title || '',
    description: row.description || '',
    damage: toInt(row.damage, 0),
    blockDamage: toInt(row.block_damage, 0),
    startupMs: toInt(row.startup_ms, 80),
    activeMs: toInt(row.active_ms, 80),
    recoveryMs: toInt(row.recovery_ms, 150),
    range: toInt(row.range, 80),
    knockback: toInt(row.knockback, 250),
    energyCost: toInt(row.energy_cost, 0),
    cooldownMs: toInt(row.cooldown_ms, 0),
    active: row.active !== false,
    metadata: row.metadata || {}
  };
}

function clientFighterToDb(item = {}) {
  return {
    id: String(item.id || '').trim(),
    name: item.name || 'New Fighter',
    archetype: item.archetype || '',
    description: item.description || '',
    power: toInt(item.power, 75),
    speed: toInt(item.speed, 75),
    defense: toInt(item.defense, 70),
    hp: toInt(item.hp, 100),
    energy: toInt(item.energy, 35),
    jump: toInt(item.jump, 900),
    width: toInt(item.width, 78),
    height: toInt(item.height, 172),
    color_a: item.colorA || item.color_a || '#14171e',
    color_b: item.colorB || item.color_b || '#c92832',
    accent: item.accent || '#d9b76a',
    special_name: item.specialName || item.special_name || '',
    ultimate_name: item.ultimateName || item.ultimate_name || '',
    portrait_url: item.portraitUrl || item.portrait_url || '',
    sprite_url: item.spriteUrl || item.sprite_url || '',
    unlock_level: toInt(item.unlockLevel ?? item.unlock_level, 1),
    price_coins: toInt(item.priceCoins ?? item.price_coins, 0),
    price_stars: toInt(item.priceStars ?? item.price_stars, 0),
    metadata: item.metadata || {},
    active: item.active !== false,
    updated_at: new Date().toISOString()
  };
}

function clientArenaToDb(item = {}) {
  return {
    id: String(item.id || '').trim(),
    title: item.title || 'New Arena',
    description: item.description || '',
    palette: item.palette || '',
    background_type: item.backgroundType || item.background_type || '',
    floor: item.floor || '',
    accent: item.accent || '#d9b76a',
    unlock_level: toInt(item.unlockLevel ?? item.unlock_level, 1),
    price_coins: toInt(item.priceCoins ?? item.price_coins, 0),
    price_stars: toInt(item.priceStars ?? item.price_stars, 0),
    metadata: item.metadata || {},
    active: item.active !== false,
    updated_at: new Date().toISOString()
  };
}

function clientAbilityToDb(item = {}) {
  return {
    id: String(item.id || '').trim(),
    fighter_id: String(item.fighterId || item.fighter_id || '').trim(),
    slot: item.slot || 'special',
    title: item.title || '',
    description: item.description || '',
    damage: toInt(item.damage, 0),
    block_damage: toInt(item.blockDamage ?? item.block_damage, 0),
    startup_ms: toInt(item.startupMs ?? item.startup_ms, 80),
    active_ms: toInt(item.activeMs ?? item.active_ms, 80),
    recovery_ms: toInt(item.recoveryMs ?? item.recovery_ms, 150),
    range: toInt(item.range, 80),
    knockback: toInt(item.knockback, 250),
    energy_cost: toInt(item.energyCost ?? item.energy_cost, 0),
    cooldown_ms: toInt(item.cooldownMs ?? item.cooldown_ms, 0),
    metadata: item.metadata || {},
    active: item.active !== false,
    updated_at: new Date().toISOString()
  };
}

function canDb() {
  return hasDb();
}

async function syncDefaults() {
  if (!canDb()) return false;

  await adminSupabase('fighters?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(DEFAULT_FIGHTERS.map(clientFighterToDb))
  });

  await adminSupabase('arenas?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(DEFAULT_ARENAS.map(clientArenaToDb))
  });

  await adminSupabase('abilities?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(DEFAULT_ABILITIES.map(clientAbilityToDb))
  });

  await adminSupabase('content_balance?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: 'live',
      active_fighter_id: DEFAULT_BALANCE.activeFighterId,
      enemy_fighter_id: DEFAULT_BALANCE.enemyFighterId,
      active_arena_id: DEFAULT_BALANCE.activeArenaId,
      damage_multiplier: DEFAULT_BALANCE.damageMultiplier,
      ai_difficulty: DEFAULT_BALANCE.aiDifficulty,
      updated_at: new Date().toISOString()
    })
  });

  return true;
}

export async function getContentBundle({ activeOnly = true, sync = true } = {}) {
  if (!canDb()) {
    return {
      storage: 'memory-preview',
      fighters: DEFAULT_FIGHTERS,
      arenas: DEFAULT_ARENAS,
      abilities: DEFAULT_ABILITIES,
      balance: DEFAULT_BALANCE
    };
  }

  if (sync) await syncDefaults().catch(() => {});

  const activeFilter = activeOnly ? 'active=eq.true&' : '';
  const [fighters, arenas, abilities, balanceRows] = await Promise.all([
    adminSupabase(`fighters?${activeFilter}select=*&order=created_at.asc`, { method: 'GET' }),
    adminSupabase(`arenas?${activeFilter}select=*&order=created_at.asc`, { method: 'GET' }),
    adminSupabase(`abilities?${activeFilter}select=*&order=fighter_id.asc,slot.asc`, { method: 'GET' }),
    adminSupabase('content_balance?id=eq.live&select=*&limit=1', { method: 'GET' }).catch(() => [])
  ]);

  const balanceRow = balanceRows?.[0] || {};
  return {
    storage: 'supabase-postgres',
    fighters: (fighters || []).map(dbFighterToClient),
    arenas: (arenas || []).map(dbArenaToClient),
    abilities: (abilities || []).map(dbAbilityToClient),
    balance: {
      id: 'live',
      activeFighterId: balanceRow.active_fighter_id || DEFAULT_BALANCE.activeFighterId,
      enemyFighterId: balanceRow.enemy_fighter_id || DEFAULT_BALANCE.enemyFighterId,
      activeArenaId: balanceRow.active_arena_id || DEFAULT_BALANCE.activeArenaId,
      damageMultiplier: Number(balanceRow.damage_multiplier || 1),
      aiDifficulty: Number(balanceRow.ai_difficulty || 0.62),
      updatedAt: balanceRow.updated_at || ''
    }
  };
}

export async function upsertFighter(item) {
  if (!canDb()) throw new Error('Supabase is not configured');
  const payload = clientFighterToDb(item);
  if (!payload.id) throw new Error('fighter.id is required');
  const rows = await adminSupabase('fighters?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });
  return dbFighterToClient(rows?.[0] || payload);
}

export async function upsertArena(item) {
  if (!canDb()) throw new Error('Supabase is not configured');
  const payload = clientArenaToDb(item);
  if (!payload.id) throw new Error('arena.id is required');
  const rows = await adminSupabase('arenas?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });
  return dbArenaToClient(rows?.[0] || payload);
}

export async function upsertAbility(item) {
  if (!canDb()) throw new Error('Supabase is not configured');
  const payload = clientAbilityToDb(item);
  if (!payload.id || !payload.fighter_id) throw new Error('ability.id and ability.fighterId are required');
  const rows = await adminSupabase('abilities?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });
  return dbAbilityToClient(rows?.[0] || payload);
}

export async function setFighterActive(id, active) {
  if (!canDb()) throw new Error('Supabase is not configured');
  const rows = await adminSupabase(`fighters?id=eq.${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ active: bool(active), updated_at: new Date().toISOString() })
  });
  return dbFighterToClient(rows?.[0] || {});
}

export async function setArenaActive(id, active) {
  if (!canDb()) throw new Error('Supabase is not configured');
  const rows = await adminSupabase(`arenas?id=eq.${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ active: bool(active), updated_at: new Date().toISOString() })
  });
  return dbArenaToClient(rows?.[0] || {});
}

export async function setLiveBalance(patch = {}) {
  if (!canDb()) throw new Error('Supabase is not configured');
  const payload = {
    id: 'live',
    ...(patch.activeFighterId || patch.active_fighter_id ? { active_fighter_id: patch.activeFighterId || patch.active_fighter_id } : {}),
    ...(patch.enemyFighterId || patch.enemy_fighter_id ? { enemy_fighter_id: patch.enemyFighterId || patch.enemy_fighter_id } : {}),
    ...(patch.activeArenaId || patch.active_arena_id ? { active_arena_id: patch.activeArenaId || patch.active_arena_id } : {}),
    ...(patch.damageMultiplier || patch.damage_multiplier ? { damage_multiplier: Number(patch.damageMultiplier || patch.damage_multiplier) } : {}),
    ...(patch.aiDifficulty || patch.ai_difficulty ? { ai_difficulty: Number(patch.aiDifficulty || patch.ai_difficulty) } : {}),
    updated_at: new Date().toISOString()
  };

  const rows = await adminSupabase('content_balance?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(payload)
  });
  const row = rows?.[0] || {};
  return {
    id: 'live',
    activeFighterId: row.active_fighter_id,
    enemyFighterId: row.enemy_fighter_id,
    activeArenaId: row.active_arena_id,
    damageMultiplier: Number(row.damage_multiplier || 1),
    aiDifficulty: Number(row.ai_difficulty || 0.62),
    updatedAt: row.updated_at || ''
  };
}

export async function requireContentAdmin(req, body = {}) {
  return requireAdmin(req, body);
}
