#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PATCH_ID = '29.0 GHLUM CANONICAL RUNTIME LOCK';
const CANONICAL_KEY = 'eralashCombatSelectedFighter29_0';

function fail(message) {
  console.error(`\n[ERROR] ${message}`);
  process.exit(1);
}

function walk(dir, depth = 0) {
  if (depth > 4) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', '.next'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, depth + 1));
    else if (entry.isFile() && entry.name.toLowerCase() === 'index.html') out.push(full);
  }
  return out;
}

function pickIndex(root) {
  const direct = path.join(root, 'index.html');
  if (fs.existsSync(direct)) return direct;
  const candidates = walk(root)
    .map(file => ({ file, size: fs.statSync(file).size, text: fs.readFileSync(file, 'utf8') }))
    .filter(x => /ERALASH\s*(COMBAT|KOMBAT)/i.test(x.text) || /fighter-ghlum|CHARACTER_SELECT_META/i.test(x.text))
    .sort((a, b) => b.size - a.size);
  return candidates[0]?.file || null;
}

function findFunctionRange(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) return null;
  const open = source.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  let state = 'normal';
  let escaped = false;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (state === 'line') {
      if (ch === '\n') state = 'normal';
      continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') { state = 'normal'; i++; }
      continue;
    }
    if (state === 'single' || state === 'double' || state === 'template') {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if ((state === 'single' && ch === "'") || (state === 'double' && ch === '"') || (state === 'template' && ch === '`')) state = 'normal';
      continue;
    }
    if (ch === '/' && next === '/') { state = 'line'; i++; continue; }
    if (ch === '/' && next === '*') { state = 'block'; i++; continue; }
    if (ch === "'") { state = 'single'; continue; }
    if (ch === '"') { state = 'double'; continue; }
    if (ch === '`') { state = 'template'; continue; }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return { start, end: i + 1 };
    }
  }
  return null;
}

function replaceFunction(source, name, replacement, required = true) {
  const range = findFunctionRange(source, name);
  if (!range) {
    if (required) fail(`Не найдена функция ${name}(). Возможно, выбран не тот index.html.`);
    return source;
  }
  return source.slice(0, range.start) + replacement.trim() + source.slice(range.end);
}

function insertAfterOnce(source, marker, insertion, label) {
  if (source.includes(insertion.trim().slice(0, 80))) return source;
  const pos = source.indexOf(marker);
  if (pos < 0) fail(`Не найдена точка вставки: ${label}`);
  return source.slice(0, pos + marker.length) + insertion + source.slice(pos + marker.length);
}

function insertAfterRegexOnce(source, regex, insertion, label) {
  if (source.includes(insertion.trim().slice(0, 80))) return source;
  const match = regex.exec(source);
  if (!match) fail(`Не найдена точка вставки: ${label}`);
  const pos = match.index + match[0].length;
  return source.slice(0, pos) + insertion + source.slice(pos);
}

function insertAtFunctionStart(source, name, code) {
  if (source.includes(code.trim())) return source;
  const range = findFunctionRange(source, name);
  if (!range) fail(`Не найдена функция ${name}() для runtime-проверки.`);
  const open = source.indexOf('{', range.start);
  return source.slice(0, open + 1) + '\n' + code + source.slice(open + 1);
}

const rootArg = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
if (!fs.existsSync(rootArg)) fail(`Папка не существует: ${rootArg}`);
const indexPath = pickIndex(rootArg);
if (!indexPath) fail('Не удалось найти index.html проекта EraLash Combat.');

let source = fs.readFileSync(indexPath, 'utf8');
if (!/CHARACTER_SELECT_META|fighter-ghlum|new-fighter-ghlum-28/i.test(source)) {
  fail('Найденный index.html не похож на актуальную сборку с Ghlum.');
}

const backupPath = path.join(path.dirname(indexPath), 'index.before-ghlum-runtime-lock-29.0.html');
if (!fs.existsSync(backupPath)) fs.copyFileSync(indexPath, backupPath);

// Remove an older copy of this patch before reapplying.
source = source.replace(/\n\s*\/\* =+\s*29\.0 GHLUM CANONICAL RUNTIME LOCK[\s\S]*?END 29\.0 GHLUM CANONICAL RUNTIME LOCK\s*=+ \*\/\s*\n/g, '\n');

const canonicalHelpers = `

  /* ==========================================================
     29.0 GHLUM CANONICAL RUNTIME LOCK
     One source of truth for Fighter Select -> Arena -> Combat.
     ========================================================== */
  const GHLUM_RUNTIME_PATCH_29_0 = '${PATCH_ID}';
  const GHLUM_SELECTED_KEY_29_0 = '${CANONICAL_KEY}';

  function normalizeFighterId29_0(id){
    const raw = String(id || '').trim().toLowerCase().replace(/[\\s-]+/g, '_');
    const aliases = {
      raven:'raven', shadow_raven:'raven',
      iron_warden:'iron_warden', warden:'iron_warden', ironwarden:'iron_warden',
      ghlum:'ghlum', gollum:'ghlum', cave_devourer:'ghlum'
    };
    const resolved = aliases[raw] || raw;
    const shipped = (DEFAULT_CONTENT.fighters || []).some(f => String(f?.id || '').toLowerCase() === resolved);
    return shipped || resolved === 'ghlum' ? resolved : 'raven';
  }

  function activeFighterCard29_0(){
    const active = document.querySelector('#characterSelect [data-cs-fighter].active');
    return active?.getAttribute('data-cs-fighter') || '';
  }

  function storedFighter29_0(){
    try { return localStorage.getItem(GHLUM_SELECTED_KEY_29_0) || ''; } catch (_) { return ''; }
  }

  function readSelectedFighter29_0(preferVisibleCard=false){
    const cardId = activeFighterCard29_0();
    const candidates = preferVisibleCard
      ? [cardId, storedFighter29_0(), contentState?.fighterId, contentBundle?.balance?.activeFighterId]
      : [storedFighter29_0(), contentState?.fighterId, contentBundle?.balance?.activeFighterId, cardId];
    for (const value of candidates) {
      if (!value) continue;
      const normalized = normalizeFighterId29_0(value);
      if (normalized) return normalized;
    }
    return 'raven';
  }

  function lockSelectedFighter29_0(id, source='runtime_29_0'){
    const fighterId = normalizeFighterId29_0(id || readSelectedFighter29_0(false));
    const enemyId = opponentForSelectedFighter(fighterId);
    contentBundle.balance = contentBundle.balance || {};
    contentState.fighterId = fighterId;
    contentState.enemyId = enemyId;
    contentBundle.balance.activeFighterId = fighterId;
    contentBundle.balance.enemyFighterId = enemyId;
    try {
      localStorage.setItem(GHLUM_SELECTED_KEY_29_0, fighterId);
      localStorage.setItem('eralashCombatSelectedFighter28', fighterId);
      localStorage.setItem('eralashCombatLastFighterLock29_0', JSON.stringify({ fighterId, enemyId, source, ts:Date.now() }));
    } catch (_) {}
    saveContentState();
    document.body?.setAttribute('data-runtime-fighter', fighterId);
    return fighterId;
  }

  /* ================ END 29.0 GHLUM CANONICAL RUNTIME LOCK ================ */
`;

source = insertAfterRegexOnce(source, /\blet\s+contentBundle\s*=\s*DEFAULT_CONTENT\s*;/, canonicalHelpers, 'после contentBundle');

source = replaceFunction(source, 'normalizeSelectedFighter28_5', `
  function normalizeSelectedFighter28_5(id){
    return normalizeFighterId29_0(id);
  }
`);

source = replaceFunction(source, 'setSelectedFighter14', `
  function setSelectedFighter14(id){
    const fighterId = lockSelectedFighter29_0(id, 'fighter_card_select_29_0');
    if (!CHARACTER_SELECT_META[fighterId]) return;
    updateCharacterSelectUI();
    try { audio.ui(); } catch (_) {}
  }
`);

source = replaceFunction(source, 'startSelectedCharacterMatch', `
  function startSelectedCharacterMatch(){
    contentBundle.balance = contentBundle.balance || {};
    const diff = currentDifficulty14();
    const fighterId = lockSelectedFighter29_0(activeFighterCard29_0() || readSelectedFighter29_0(true), 'character_start_29_0');
    contentBundle.balance.aiDifficulty = difficultyToValue(diff);
    contentState.enemyId = opponentForSelectedFighter(fighterId);
    contentBundle.balance.enemyFighterId = contentState.enemyId;
    saveContentState();
    trackEvent('fight_start', {
      source:'character_select_29_0', fighter:fighterId,
      enemy:contentState.enemyId, difficulty:diff
    });
    closeCharacterSelect(true);
    try { audio.ensure(); audio.ui(); } catch (_) {}
    window.setTimeout(()=>{
      lockSelectedFighter29_0(fighterId, 'character_to_arena_29_0');
      openArenaSelect('character_select_29_0');
    }, 90);
  }
`);

source = replaceFunction(source, 'startSelectedArenaMatch', `
  function startSelectedArenaMatch(){
    contentBundle.balance = contentBundle.balance || {};
    const fighterId = lockSelectedFighter29_0(readSelectedFighter29_0(false), 'arena_start_29_0');
    contentState.enemyId = opponentForSelectedFighter(fighterId);
    contentState.arenaId = currentArena15();
    contentBundle.balance.activeFighterId = fighterId;
    contentBundle.balance.enemyFighterId = contentState.enemyId;
    contentBundle.balance.activeArenaId = contentState.arenaId;
    saveContentState();
    trackEvent('fight_start', {
      source:'arena_select_29_0', fighter:fighterId,
      enemy:contentState.enemyId, arena:contentState.arenaId,
      difficulty:currentDifficulty14()
    });
    closeArenaSelect(true);
    try { audio.ensure(); audio.ui(); } catch (_) {}
    showArenaReveal16(() => {
      lockSelectedFighter29_0(fighterId, 'arena_reveal_to_match_29_0');
      newMatch();
    });
  }
`);

source = insertAtFunctionStart(source, 'newMatch', `    lockSelectedFighter29_0(readSelectedFighter29_0(false), 'new_match_preflight_29_0');\n`);
source = insertAtFunctionStart(source, 'resetRoundPositions', `    const expectedFighter29_0 = lockSelectedFighter29_0(readSelectedFighter29_0(false), 'round_reset_preflight_29_0');\n`);

// Verify the object created for combat matches the locked ID. Recreate immediately if any stale route changed it.
const makePair = `    player = makeFighter('player');\n    enemy = makeFighter('enemy');`;
const verifiedPair = `    player = makeFighter('player');
    enemy = makeFighter('enemy');
    if (typeof expectedFighter29_0 !== 'undefined' && String(player?.contentId || '').toLowerCase() !== expectedFighter29_0) {
      lockSelectedFighter29_0(expectedFighter29_0, 'combat_object_repair_29_0');
      player = makeFighter('player');
      enemy = makeFighter('enemy');
    }
    if (player) player.runtimeSelection29_0 = expectedFighter29_0 || readSelectedFighter29_0(false);`;
const resetRange = findFunctionRange(source, 'resetRoundPositions');
if (!resetRange) fail('Не найдена resetRoundPositions() после обработки.');
let resetBody = source.slice(resetRange.start, resetRange.end);
if (!resetBody.includes('runtimeSelection29_0')) {
  if (!resetBody.includes(makePair)) fail('Не найдена точка создания player/enemy в resetRoundPositions().');
  resetBody = resetBody.replace(makePair, verifiedPair);
  source = source.slice(0, resetRange.start) + resetBody + source.slice(resetRange.end);
}

const lateBinding = `

  /* ==========================================================
     29.0 capture bridge: card selection is saved before any old
     overlay/click handler can route the game with a stale Raven ID.
     ========================================================== */
  function bindGhlumRuntimeLock29_0(){
    const capture = (event) => {
      const target = event.target?.closest?.('[data-cs-fighter], #csStartFightBtn, #asStartFightBtn');
      if (!target) return;
      if (target.matches('[data-cs-fighter]')) {
        const id = target.getAttribute('data-cs-fighter');
        if (id) lockSelectedFighter29_0(id, 'capture_card_' + event.type + '_29_0');
        return;
      }
      if (target.matches('#csStartFightBtn')) {
        lockSelectedFighter29_0(activeFighterCard29_0() || readSelectedFighter29_0(true), 'capture_character_start_' + event.type + '_29_0');
        return;
      }
      lockSelectedFighter29_0(readSelectedFighter29_0(false), 'capture_arena_start_' + event.type + '_29_0');
    };
    ['pointerdown','touchstart','click'].forEach(type => {
      document.addEventListener(type, capture, { capture:true, passive:true });
    });

    // Migrate the current valid selection once. Old Raven values cannot overwrite
    // a newly clicked Ghlum after this canonical key has been written.
    lockSelectedFighter29_0(readSelectedFighter29_0(true), 'boot_migration_29_0');
    window.eralashSelectedFighter = () => readSelectedFighter29_0(false);
  }
`;

const resizeCall = source.lastIndexOf('\n  resize();');
if (resizeCall < 0) fail('Не найден финальный блок инициализации resize().');
if (!source.includes('function bindGhlumRuntimeLock29_0')) {
  source = source.slice(0, resizeCall) + lateBinding + source.slice(resizeCall);
}
if (!source.includes('  bindGhlumRuntimeLock29_0();')) {
  const callPos = source.lastIndexOf('\n  resize();');
  source = source.slice(0, callPos) + '\n  bindGhlumRuntimeLock29_0();' + source.slice(callPos);
}

source = source.replace(/<title>[^<]*<\/title>/i, '<title>EraLash Combat — Ghlum Runtime Lock 29.0</title>');
source = source.replace(/<body class="([^"]*)"/i, (all, classes) => classes.includes('ghlum-runtime-lock-29-0') ? all : `<body class="${classes} ghlum-runtime-lock-29-0"`);

const requiredChecks = [
  '29.0 GHLUM CANONICAL RUNTIME LOCK',
  'GHLUM_SELECTED_KEY_29_0',
  "lockSelectedFighter29_0(id, 'fighter_card_select_29_0')",
  "'new_match_preflight_29_0'",
  'runtimeSelection29_0',
  'bindGhlumRuntimeLock29_0();'
];
for (const check of requiredChecks) {
  if (!source.includes(check)) fail(`Внутренняя проверка патча не пройдена: ${check}`);
}

fs.writeFileSync(indexPath, source, 'utf8');
const report = {
  patch: PATCH_ID,
  index: path.relative(rootArg, indexPath) || 'index.html',
  backup: path.relative(rootArg, backupPath),
  bytes: Buffer.byteLength(source),
  appliedAt: new Date().toISOString(),
  checks: requiredChecks.length
};
fs.writeFileSync(path.join(path.dirname(indexPath), 'GHLUM_RUNTIME_LOCK_29_0_APPLIED.json'), JSON.stringify(report, null, 2));
console.log('\n============================================================');
console.log('  GHLUM RUNTIME LOCK 29.0 УСПЕШНО ПРИМЕНЁН');
console.log('============================================================');
console.log(`Файл:     ${indexPath}`);
console.log(`Резерв:   ${backupPath}`);
console.log(`Проверок: ${requiredChecks.length}/${requiredChecks.length}`);
console.log('\nТеперь загружай папку проекта на Netlify/Vercel как обычно.');
