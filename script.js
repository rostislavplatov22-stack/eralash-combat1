(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const blackCitadelArenaArt = new Image();
  blackCitadelArenaArt.decoding = 'async';
  blackCitadelArenaArt.loading = 'eager';
  blackCitadelArenaArt.src = 'assets/arena-black-citadel-courtyard.png';

  const premiumFighterArt = {
    player: new Image(),
    enemy: new Image()
  };
  premiumFighterArt.player.decoding = 'async';
  premiumFighterArt.player.loading = 'eager';
  premiumFighterArt.player.src = 'assets/fighter-shadow-raven.png';
  premiumFighterArt.enemy.decoding = 'async';
  premiumFighterArt.enemy.loading = 'eager';
  premiumFighterArt.enemy.src = 'assets/fighter-iron-warden.png';

  // Premium Fighters 6.0:
  // the old procedural stick/robot bodies are only a fallback now.
  // Primary combat visuals use the two uploaded full-body armored fighters.
  const USE_PREMIUM_FIGHTER_ART = true;
  const USE_SPRITE_FIGHTERS = true;
  const SPRITE_COMBAT_PATCH = '18.0 COMBAT IMPACT SYSTEM';

  function loadSpriteSheet(src){
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    // 9.1: cache-bust sprite sheets so Vercel/browser cannot show an older invisible asset.
    img.src = src + '?v=combat-impact-18';
    return img;
  }

  const spriteFighterSheets = {
    player: {
      idle:  { img: loadSpriteSheet('assets/sprites/raven_idle.png'),  frames: 6, fps: 7,  loop: true,  scale: .96 },
      walk:  { img: loadSpriteSheet('assets/sprites/raven_walk.png'),  frames: 8, fps: 12, loop: true,  scale: .96 },
      light: { img: loadSpriteSheet('assets/sprites/raven_light.png'), frames: 6, fps: 18, loop: false, scale: 1.03 },
      heavy: { img: loadSpriteSheet('assets/sprites/raven_heavy.png'), frames: 6, fps: 13, loop: false, scale: 1.00 },
      block: { img: loadSpriteSheet('assets/sprites/raven_block.png'), frames: 6, fps: 8,  loop: true,  scale: .97 },
      hit:   { img: loadSpriteSheet('assets/sprites/raven_idle.png'),  frames: 6, fps: 10, loop: false, scale: .96 }
    },
    enemy: {
      idle:  { img: loadSpriteSheet('assets/sprites/warden_idle.png'),  frames: 6, fps: 6,  loop: true,  scale: 1.04 },
      walk:  { img: loadSpriteSheet('assets/sprites/warden_walk.png'),  frames: 5, fps: 9,  loop: true,  scale: 1.08 },
      light: { img: loadSpriteSheet('assets/sprites/warden_light.png'), frames: 4, fps: 12, loop: false, scale: 1.08 },
      heavy: { img: loadSpriteSheet('assets/sprites/warden_light.png'), frames: 4, fps: 10, loop: false, scale: 1.10 },
      block: { img: loadSpriteSheet('assets/sprites/warden_block.png'), frames: 6, fps: 7,  loop: true,  scale: 1.06 },
      hit:   { img: loadSpriteSheet('assets/sprites/warden_idle.png'),  frames: 6, fps: 9,  loop: false, scale: 1.04 }
    }
  };


  // Exact user-provided arena mode:
  // the fight background must be the uploaded Black Citadel image itself,
  // without extra painted fallback geometry, debug grid, artificial light panels or fake overlays.
  const EXACT_BLACK_CITADEL_ARENA = true;

  // Exact Arena Stage Fit 5.2:
  // The user-provided 16:9 Black Citadel image is treated as a locked stage plate,
  // not as a scrolling background. On ultra-wide desktop screens the stage is
  // centered in a 16:9 safe frame so the left/right edge art does not turn into
  // ugly stretched panels.
  const EXACT_ARENA_ASPECT = 16 / 9;
  const EXACT_ARENA_COMBAT_LEFT = 0.29;
  const EXACT_ARENA_COMBAT_RIGHT = 0.71;

  function getExactArenaStageRect(){
    const viewportAspect = w / Math.max(1, h);
    let sw = w;
    let sh = h;
    if (viewportAspect > EXACT_ARENA_ASPECT) {
      sh = h;
      sw = sh * EXACT_ARENA_ASPECT;
    } else {
      sw = w;
      sh = sw / EXACT_ARENA_ASPECT;
    }
    return {
      x: Math.floor((w - sw) * 0.5),
      y: Math.floor((h - sh) * 0.5),
      w: Math.ceil(sw),
      h: Math.ceil(sh)
    };
  }

  function getExactArenaCombatBounds(){
    const r = getExactArenaStageRect();
    return {
      left: r.x + r.w * EXACT_ARENA_COMBAT_LEFT,
      right: r.x + r.w * EXACT_ARENA_COMBAT_RIGHT,
      center: r.x + r.w * 0.5,
      stageW: r.w,
      stageH: r.h
    };
  }

  // Premium Fighters 6.1 — physics layer for large painted character art.
  // The previous update replaced stick figures with full-body art, but the old
  // small stickman hitboxes were still used. That made the fighters visually
  // overlap and feel frozen. These helpers give big sprites proper body space,
  // spacing, hitboxes and AI distance.
  function premiumFighterScaleFactor(){
    return clamp(w / 1600, .72, 1.18);
  }

  function fighterVisualHeight(f){
    if (!USE_PREMIUM_FIGHTER_ART) return f.h;
    const base = fighterIsWarden(f) ? 420 : 390;
    return base * premiumFighterScaleFactor() * (window.matchMedia && window.matchMedia('(pointer:coarse)').matches ? .92 : 1);
  }

  function fighterVisualWidth(f){
    if (!USE_PREMIUM_FIGHTER_ART) return f.w;
    return fighterVisualHeight(f) * (fighterIsWarden(f) ? .50 : .44);
  }

  function fighterBodyRadius(f){
    if (!USE_PREMIUM_FIGHTER_ART) return f.w * .45;
    return fighterVisualWidth(f) * (fighterIsWarden(f) ? .44 : .40);
  }

  function fighterPreferredDistance(a,b){
    if (!USE_PREMIUM_FIGHTER_ART) return (a.w + b.w) * .45;
    return fighterBodyRadius(a) + fighterBodyRadius(b) + Math.max(92, w * .065);
  }


  function physicsDebugLine(){
    if (!ui.debug || gameState === 'menu') return;
    if (physicsDebugT <= 0) {
      ui.debug.style.display = 'none';
      return;
    }
    ui.debug.style.display = 'block';
    ui.debug.style.border = '1px solid rgba(217,183,106,.35)';
    ui.debug.style.background = 'linear-gradient(180deg,rgba(8,9,12,.72),rgba(0,0,0,.50))';
    ui.debug.style.boxShadow = '0 14px 40px rgba(0,0,0,.35)';
    ui.debug.innerHTML = `CHARACTER SELECT 14.0 · ${player?.name || 'Fighter'} vs ${enemy?.name || 'Enemy'}<br>` +
      `Raven: ${player.state} · combo ${(player.comboSeq||[]).join('>') || '—'} · stamina ${Math.round(player.stamina)}<br>` +
      `Warden: ${enemy.state} · AI ${enemy.ai?.difficulty || aiDifficultyName()} / ${enemy.ai?.intent || 'neutral'} / ${enemy.ai?.band || 'far'} · stamina ${Math.round(enemy.stamina)}`;
  }



  const ui = {
    menu: document.getElementById('menu'),
    result: document.getElementById('result'),
    startBtn: document.getElementById('startBtn'),
    restartBtn: document.getElementById('restartBtn'),
    menuBtn: document.getElementById('menuBtn'),
    muteBtn: document.getElementById('muteBtn'),
    pHp: document.getElementById('pHp'),
    pDelay: document.getElementById('pDelay'),
    eHp: document.getElementById('eHp'),
    eDelay: document.getElementById('eDelay'),
    pEnergy: document.getElementById('pEnergy'),
    eEnergy: document.getElementById('eEnergy'),
    timer: document.getElementById('timer'),
    rounds: document.getElementById('rounds'),
    callout: document.getElementById('callout'),
    calloutBig: document.getElementById('calloutBig'),
    calloutSmall: document.getElementById('calloutSmall'),
    comboTag: document.getElementById('comboTag'),
    comboCount: document.getElementById('comboCount'),
    impactBeat18: document.getElementById('impactBeat18'),
    impactWord18: document.getElementById('impactWord18'),
    impactMeta18: document.getElementById('impactMeta18'),
    debug: document.getElementById('debug'),
    resultTitle: document.getElementById('resultTitle'),
    resultText: document.getElementById('resultText'),
    resultKicker: document.getElementById('resultKicker'),
    tgProfileBadge: document.getElementById('tgProfileBadge'),
    resultRewards: document.getElementById('resultRewards'),
    shareVictoryBtn: document.getElementById('shareVictoryBtn'),
    fight5Vs: document.getElementById('fight5Vs'),
    fight5PlayerName: document.getElementById('fight5PlayerName'),
    fight5PlayerStyle: document.getElementById('fight5PlayerStyle'),
    fight5EnemyName: document.getElementById('fight5EnemyName'),
    fight5EnemyStyle: document.getElementById('fight5EnemyStyle'),
    fight5ArenaName: document.getElementById('fight5ArenaName'),
    arenaMoodBadge17: document.getElementById('arenaMoodBadge17'),
    arenaMoodName17: document.getElementById('arenaMoodName17'),
    arenaMoodText17: document.getElementById('arenaMoodText17'),
    arenaIntro17: document.getElementById('arenaIntro17'),
    arenaIntroName17: document.getElementById('arenaIntroName17'),
    arenaIntroQuote17: document.getElementById('arenaIntroQuote17'),
    asStageFx17: document.getElementById('asStageFx17'),
    pauseBtn: document.getElementById('pauseBtn'),
    pauseOverlay: document.getElementById('pauseOverlay'),
    resumeBtn: document.getElementById('resumeBtn'),
    pauseRestartBtn: document.getElementById('pauseRestartBtn'),
    pauseMenuBtn: document.getElementById('pauseMenuBtn')
  };

  const DPR_MAX = 2;
  const GRAVITY = 2350;
  const GROUND_MARGIN = 0.19;
  const FRICTION = 0.84;
  const ROUND_TIME = 60;
  const ROUND_WINS = 2;

  let w = 1280, h = 720, dpr = 1, groundY = 570;
  let last = 0;
  let raf = 0;
  let gameState = 'menu';
  let pausedFromState = 'fight';
  let roundResolving = false;
  let matchFinalized = false;
  let roundEndTimer = 0;
  let roundTime = ROUND_TIME;
  let roundFreeze = 0;
  let hitStop = 0;
  let shake = 0;
  let slowMo = 1;
  let muted = false;
  let playerRounds = 0;
  let enemyRounds = 0;
  let roundIndex = 1;
  let flash = 0;
  let cinematic = 0;
  let cameraZoom = 1;
  let comboCount = 0;
  let comboTimer = 0;
  let comboDamage = 0;
  let matchMaxCombo = 0;
  let lastHitAt = 0;
  let roundIntroTimer = 0;
  let combatFeel10T = 0;
  let combatImpact18T = 0;
  let impactBeat18Timer = 0;
  // Combat AI & Combo 19.0 — tactical AI brain, guard-break pressure and readable combo mastery.
  let combatAi19T = 0;
  let combatAi19Word = '';
  let combatAi19Meta = '';
  let comboTrainer19T = 0;
  let comboTrainer19Word = '';
  let comboTrainer19Meta = '';
  let ultimateCineT = 0;
  let ultimateCineMax = 0;
  let ultimateCineKind = '';
  let ultimateCineAttacker = null;
  let ultimateCineDefender = null;
  let ultimateCineFinisher = false;
  let telegramContext = { insideTelegram:false, user:null, initData:'' };
  let pendingStarsItemId = '';
  let appProfile = loadProfile();

  const DEFAULT_CONTENT = {
    fighters: [
      { id:'raven', name:'Raven', archetype:'Balanced Duelist', role:'Fast Combo Assassin', power:78, speed:86, defense:72, hp:100, energy:35, jump:960, width:78, height:172, colorA:'#14171e', colorB:'#c92832', accent:'#d9b76a', specialName:'Crimson Rift', ultimateName:'RIFT EXECUTION', bio:'Fast pressure fighter with clean chains and high mobility.' },
      { id:'iron_warden', name:'Iron Warden', archetype:'Heavy Punisher', role:'Armored Heavy Tank', power:88, speed:62, defense:84, hp:112, energy:30, jump:850, width:90, height:188, colorA:'#17191c', colorB:'#3eb6ff', accent:'#d9f2ff', specialName:'Steel Breaker', ultimateName:'TITAN JUDGEMENT', bio:'Heavy armor fighter with bigger punishment windows and stronger defense.' }
    ],
    arenas: [
      { id:'black_citadel', title:'Black Citadel', description:'Gothic courtyard, moon gate, wet obsidian stone and ember braziers.', accent:'#d9b76a', backgroundType:'black-citadel', difficulty:'Balanced', bonus:'Neutral footwork' },
      { id:'infernal_bridge', title:'Infernal Bridge', description:'Hot red pressure arena with aggressive fire grading and heavier impact tone.', accent:'#ff5a35', backgroundType:'infernal-bridge', difficulty:'Aggressive', bonus:'More visual pressure' },
      { id:'moon_ritual', title:'Moon Ritual', description:'Cold blue ritual court with mist, lunar bloom and cleaner silhouettes.', accent:'#86d8ff', backgroundType:'moon-ritual', difficulty:'Technical', bonus:'Clean reads' },
      { id:'frozen_throne', title:'Frozen Throne', description:'Frozen gothic hall with pale haze, snow dust and icy blue edge light.', accent:'#b9f3ff', backgroundType:'frozen-throne', difficulty:'Defensive', bonus:'High contrast' }
    ],
    abilities: [],
    balance: { activeFighterId:'raven', enemyFighterId:'iron_warden', activeArenaId:'black_citadel', damageMultiplier:1, aiDifficulty:.62 }
  };

  let contentState = loadContentState();
  let contentBundle = DEFAULT_CONTENT;

  const input = {
    left:false,right:false,jump:false,block:false,dodge:false,
    light:false,heavy:false,special:false,ultimate:false,
    pressed: Object.create(null),
    buffer: []
  };

  const particles = [];
  const texts = [];
  const projectiles = [];
  let physicsDebugT = 0;
  const REAL_PHYSICS_PATCH = '18.0 COMBAT IMPACT SYSTEM';
  const AI_COMBOS_PATCH = '18.0 COMBAT IMPACT SYSTEM';
  const ULTIMATE_FINISHER_PATCH = '18.0 COMBAT IMPACT SYSTEM';
  const CHARACTER_SELECT_PATCH = '18.0 COMBAT IMPACT SYSTEM';
  const ARENA_SELECT_PATCH = '18.0 COMBAT IMPACT SYSTEM';

  const AI_PROFILES = {
    // Combat AI & Combo 19.0 — each difficulty now drives reaction, defense, combo planning and punish discipline.
    easy:   { name:'EASY',   reaction:.36, block:.30, aggression:.40, punish:.24, combo:.26, special:.10, mistake:.34, footsie:.20, plan:.24, bait:.12, reset:.26, burst:.14, guardPatience:.50 },
    normal: { name:'NORMAL', reaction:.23, block:.50, aggression:.62, punish:.48, combo:.56, special:.20, mistake:.18, footsie:.38, plan:.50, bait:.24, reset:.34, burst:.24, guardPatience:.64 },
    hard:   { name:'HARD',   reaction:.15, block:.66, aggression:.78, punish:.70, combo:.74, special:.32, mistake:.08, footsie:.56, plan:.72, bait:.38, reset:.44, burst:.36, guardPatience:.78 }
  };

  function aiDifficultyName(){
    const v = clamp(Number(contentBundle?.balance?.aiDifficulty ?? .62), .1, .95);
    if (v < .45) return 'easy';
    if (v > .76) return 'hard';
    return 'normal';
  }

  function aiProfile(){
    return AI_PROFILES[aiDifficultyName()] || AI_PROFILES.normal;
  }

  function distanceBand(dist, preferred){
    if (dist < preferred * .72) return 'close';
    if (dist < preferred * 1.22) return 'mid';
    return 'far';
  }


  function combatMobileFx19(){
    return !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
  }

  function aiPlanName19(plan){
    const s = (plan || []).join('>');
    if (s === 'light>light>heavy') return 'TACTICAL BASIC CHAIN';
    if (s === 'light>heavy>special') return 'RIFT PUNISH ROUTE';
    if (s === 'heavy>special') return 'ARMOR BREAK ROUTE';
    if (s === 'light>light>special') return 'DASH RIFT ROUTE';
    return 'PRESSURE STRING';
  }

  function setAiMind19(f, word, meta='', ttl=.72){
    if (!f || f.id !== 'enemy') return;
    combatAi19T = Math.max(combatAi19T, ttl);
    combatAi19Word = String(word || 'AI READ').toUpperCase();
    combatAi19Meta = String(meta || (f.ai?.intent || 'tactical')).toUpperCase();
    if (f.ai) {
      f.ai.mind = combatAi19Word;
      f.ai.mindT = ttl;
    }
  }

  function triggerComboTrainer19(f, name, meta=''){
    if (!f || !name) return;
    comboTrainer19T = .95;
    comboTrainer19Word = String(name).toUpperCase();
    comboTrainer19Meta = String(meta || 'CHAIN CONFIRMED').toUpperCase();
  }

  function chooseAIComboPlan19(f, opponent, profile, dist){
    const canSpecial = f.energy >= attacks.special.cost;
    const lightReach = attackReachValue('light', f, opponent);
    const heavyReach = attackReachValue('heavy', f, opponent);
    const specialReach = attackReachValue('special', f, opponent);
    const opponentWhiff = isOpponentWhiffPunishable(opponent);
    if (canSpecial && opponentWhiff && dist < specialReach + 80) return ['light','heavy','special'];
    if (canSpecial && opponent.stamina < 38 && dist < specialReach + 70) return ['heavy','special'];
    if (canSpecial && Math.random() < profile.special * 1.15 && dist < specialReach) return ['light','light','special'];
    if (dist < heavyReach && Math.random() < profile.combo) return ['light','light','heavy'];
    if (dist < lightReach) return ['light','light','heavy'];
    return ['light'];
  }

  function startAIComboPlan19(f, opponent, plan, label=''){
    if (!f || f.id !== 'enemy' || !plan || !plan.length) return false;
    const first = plan[0];
    if (!attacks[first]) return false;
    f.ai.comboPlan = plan.slice(0, 4);
    f.ai.comboPlanIndex = 1;
    f.ai.comboPlanLabel = label || aiPlanName19(plan);
    f.ai.comboCd = Math.max(f.ai.comboCd || 0, .30);
    setAiMind19(f, 'AI COMBO PLAN', f.ai.comboPlanLabel, .88);
    startAttack(f, first);
    return true;
  }

  function nextAIComboStep19(attacker, defender, atk, profile){
    if (!attacker || attacker.id !== 'enemy' || !attacker.ai) return '';
    const ai = attacker.ai;
    const plan = ai.comboPlan || [];
    const idx = ai.comboPlanIndex || 0;
    const dist = Math.abs((defender?.x || 0) - (attacker?.x || 0));
    if (idx < plan.length && Math.random() > profile.mistake * .75) {
      const next = plan[idx];
      if (next && attacks[next] && (next !== 'special' || attacker.energy >= attacks.special.cost) && dist < attackReachValue(next, attacker, defender) + 110) {
        ai.comboPlanIndex = idx + 1;
        ai.intent = 'combo';
        setAiMind19(attacker, 'CHAIN STEP', `${ai.comboPlanLabel || aiPlanName19(plan)} · ${next.toUpperCase()}`, .55);
        return next;
      }
    }
    ai.comboPlan = null;
    ai.comboPlanIndex = 0;
    ai.comboPlanLabel = '';
    return '';
  }

  function triggerGuardBreak19(f, attacker=null){
    if (!f || f.guardBreakCd > 0) return;
    f.guardBreakCd = 1.65;
    f.guardBrokenT = .72;
    f.stamina = 0;
    f.blockHoldT = 0;
    f.hitstunTime = Math.max(f.hitstunTime || 0, .50);
    f.vx += (attacker ? Math.sign(f.x - attacker.x) || attacker.dir || 1 : -f.dir) * 330;
    f.vy = -110;
    setState(f, 'hitstun');
    floatingText('GUARD BREAK 19.0', f.x, f.y - (f.collisionH || f.h || 180) * .92, '#ffd27a');
    showCombatWord('GUARD BREAK', f.x, f.y - (f.collisionH || f.h || 180) * .70, '#ffd27a');
    spawnAura(f, '#ffd27a');
    particles.push({kind:'shockwave', x:f.x, y:f.y-(f.collisionH || f.h || 180)*.55, vx:0, vy:0, life:.55, max:.55, size:110, color:'#ffd27a'});
    hitStop = Math.max(hitStop, .14);
    shake = Math.max(shake, 18);
    flash = Math.max(flash, .20);
    tryHaptic('heavy');
    if (attacker && attacker.id === 'enemy') setAiMind19(attacker, 'GUARD BROKEN', 'PUNISH WINDOW', .9);
  }

  function registerCombatResult19(attacker, defender, atk, blocked, dmg, counterHit){
    if (!attacker || !defender || !atk) return;
    if (blocked) {
      defender.blockStress19 = clamp((defender.blockStress19 || 0) + (atk.guardDamage || 12), 0, 100);
      if (defender.blockStress19 > 72 && defender.guardBreakCd <= 0) {
        floatingText('BLOCK PRESSURE', defender.x, defender.y - (defender.collisionH || defender.h || 180) * .82, '#8edcff');
      }
      return;
    }

    defender.blockStress19 = Math.max(0, (defender.blockStress19 || 0) - 18);
    attacker.combo19Score = (attacker.combo19Score || 0) + Math.max(1, Math.round(dmg || 0));
    if (attacker.currentComboName) {
      attacker.combo19Name = attacker.currentComboName;
      triggerComboTrainer19(attacker, attacker.currentComboName, `${Math.round(attacker.combo19Score || 0)} DAMAGE ROUTE`);
    }
    if (counterHit && attacker.id === 'enemy') setAiMind19(attacker, 'COUNTER READ', 'STARTUP PUNISH', .85);
  }


  function isOpponentWhiffPunishable(f){
    if (!f) return false;
    if ((f.punishableT || 0) > 0) return true;
    if (f.state !== 'attack' || !f.attack) return false;
    const activeEnd = f.attack.startup + f.attack.active;
    return f.stateT > activeEnd && !f.attackHasHit;
  }

  function attackReachValue(type, f, opponent){
    const atk = attacks[type] || attacks.light;
    const scale = premiumFighterScaleFactor ? premiumFighterScaleFactor() : 1;
    return atk.range * scale + fighterBodyRadius(f) + fighterBodyRadius(opponent) * .28;
  }

  function lastComboName(seq){
    const s = (seq || []).slice(-4).join('>');
    if (s.endsWith('light>light>heavy>special')) return 'EXECUTION STRING';
    if (s.endsWith('light>heavy>special')) return 'RIFT BREAKER';
    if (s.endsWith('heavy>special')) return 'PUNISH LINK';
    if (s.endsWith('light>light>special')) return 'DASH RIFT';
    if (s.endsWith('light>light>heavy')) return 'RAVEN BASIC CHAIN';
    if (s.endsWith('heavy>light>heavy')) return 'WARDEN CRUSH LOOP';
    if (s.endsWith('light>heavy>heavy')) return 'PRESSURE BREAKER';
    return '';
  }

  function comboBonusFor(name, atkName){
    if (!name) return 1;
    if (name === 'EXECUTION STRING') return atkName === 'special' ? 1.34 : 1.20;
    if (name === 'RIFT BREAKER') return atkName === 'special' ? 1.27 : 1.13;
    if (name === 'PUNISH LINK') return atkName === 'special' ? 1.23 : 1.11;
    if (name === 'DASH RIFT') return 1.18;
    if (name === 'RAVEN BASIC CHAIN') return atkName === 'heavy' ? 1.22 : 1.09;
    if (name === 'WARDEN CRUSH LOOP') return atkName === 'heavy' ? 1.24 : 1.10;
    if (name === 'PRESSURE BREAKER') return atkName === 'heavy' ? 1.20 : 1.08;
    return 1;
  }

  function registerAttackSequence(f, type){
    if (!f) return '';
    if (!f.comboSeq || (f.comboSeqT || 0) <= 0) f.comboSeq = [];
    f.comboSeq.push(type);
    if (f.comboSeq.length > 4) f.comboSeq.shift();
    f.comboSeqT = 1.12;

    const name = lastComboName(f.comboSeq);
    if (name) {
      f.currentComboName = name;
      f.comboNameT = .95;
      f.combo19Name = name;
      const y = f.y - (f.collisionH || f.h || 180) * .92;
      const color = f.id === 'player' ? '#ffd27a' : '#8edcff';
      floatingText(name, f.x, y, color);
      showCombatWord(name, f.x + f.dir * 36, f.y - (f.collisionH || f.h || 180) * .72, f.colorB || color);
      triggerComboTrainer19(f, name, f.id === 'player' ? 'PLAYER CHAIN' : 'AI ROUTE');
      if (name === 'EXECUTION STRING' || name === 'RIFT BREAKER') {
        hitStop = Math.max(hitStop, .055);
        cameraZoom = Math.max(cameraZoom, 1.035);
      }
    } else if (f.comboSeq.length === 2 && f.comboSeq.join('>') === 'light>light') {
      triggerComboTrainer19(f, 'CHAIN WINDOW', 'PRESS HEAVY OR SPECIAL');
    }
    return name;
  }

  function queueComboFollowup(f, type, time=.46){
    if (!f || !type) return;
    f.bufferedAttack = type;
    f.bufferedAttackT = Math.max(f.bufferedAttackT || 0, time);
    f.aiComboQueued = type;
    if (f.id === 'enemy' && f.ai) setAiMind19(f, 'BUFFERED ' + type.toUpperCase(), f.ai.comboPlanLabel || 'COMBO ROUTE', .42);
  }

  function aiQueueFollowup(attacker, defender, atk){
    if (!attacker || attacker.id !== 'enemy' || !attacker.ai || !atk) return;
    if (defender.hp <= 0 || attacker.hp <= 0) return;
    const profile = AI_PROFILES[attacker.ai.difficulty || aiDifficultyName()] || AI_PROFILES.normal;
    if (Math.random() < profile.mistake * .72) return;

    const dist = Math.abs(defender.x - attacker.x);
    const canSpecial = attacker.energy >= attacks.special.cost;
    let next = nextAIComboStep19(attacker, defender, atk, profile);

    if (!next) {
      if (atk.name === 'light') {
        if ((attacker.comboSeq || []).slice(-1)[0] === 'light' && Math.random() < profile.combo) next = Math.random() < .68 ? 'heavy' : 'light';
        else if (Math.random() < profile.combo) next = 'light';
      } else if (atk.name === 'heavy' && canSpecial && dist < attackReachValue('special', attacker, defender) && Math.random() < profile.special) {
        next = 'special';
      }
    }

    if (next) {
      queueComboFollowup(attacker, next, next === 'special' ? .58 : .48);
      attacker.ai.intent = 'combo';
    }
  }
  let hudDelayTimer = 0;
  let lastHudSnapshot = { pHp:null, eHp:null, pEnergy:null, eEnergy:null, timer:null, rounds:null };
  let loopCrashCount = 0;

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp = (a,b,t)=>a+(b-a)*t;
  const now = ()=>performance.now();

  class AudioLite {
    constructor(){
      this.ctx = null;
      this.enabled = true;
    }
    ensure(){
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) this.ctx = new Ctx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }
    tone(freq=220, dur=0.08, type='sine', gain=0.08, slide=1){
      if (muted || !this.enabled) return;
      this.ensure();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq*slide), t+dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+dur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t+dur);
    }
    hit(type='light'){
      if(type==='block') { this.tone(380,.05,'square',.045,.62); this.tone(150,.07,'triangle',.04,.8); return; }
      if(type==='heavy') { this.tone(88,.13,'sawtooth',.1,.45); this.tone(560,.055,'square',.035,1.4); return; }
      if(type==='ultimate') { this.tone(62,.26,'sawtooth',.16,.25); this.tone(920,.14,'triangle',.08,.55); this.tone(1400,.06,'square',.035,1.2); return; }
      if(type==='special') { this.tone(120,.18,'sawtooth',.12,.32); this.tone(880,.09,'triangle',.06,.8); return; }
      this.tone(180,.07,'square',.055,.55);
    }
    ui(){ this.tone(620,.045,'triangle',.04,1.25); }
    ko(){
      this.tone(55,.32,'sawtooth',.18,.22);
      this.tone(440,.18,'triangle',.08,.62);
      this.tone(1180,.06,'square',.035,.8);
    }
    round(){
      this.tone(180,.08,'triangle',.045,1.45);
      this.tone(520,.08,'triangle',.035,1.2);
    }
  }
  const audio = new AudioLite();

  function rectsOverlap(a,b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function rectCenter(box){ return { x: box.x + box.w * .5, y: box.y + box.h * .5 }; }

  function fighterFacingSign(f, opponent){
    if (!f || !opponent) return f?.dir || 1;
    return opponent.x >= f.x ? 1 : -1;
  }

  function attackDirection(f){
    return (f && f.attack && Number.isFinite(f.attack.dir)) ? f.attack.dir : (f?.dir || 1);
  }

  function updateFacingLock(f, opponent){
    // Physics 11.0: attack direction is locked during startup/active/recovery.
    // Without this, large sprite fighters could flip mid-attack and their hitbox would
    // jump behind them, making hits feel random or broken.
    if (!f || !opponent) return;
    if (f.state === 'attack' || f.state === 'hitstun' || f.state === 'knockdown' || f.state === 'dodge') return;
    f.dir = fighterFacingSign(f, opponent);
  }

  function fighterSpacing(f, opponent){
    const own = Math.max(54, (f.collisionW || f.w || 90) * .56);
    const other = Math.max(54, (opponent.collisionW || opponent.w || 90) * .56);
    return own + other + (USE_PREMIUM_FIGHTER_ART ? 82 : 20);
  }

  function isAttackActive(f){
    if (!f || f.state !== 'attack' || !f.attack) return false;
    const t = f.stateT;
    return t >= f.attack.startup && t <= f.attack.startup + f.attack.active;
  }

  function isAttackStartup(f){
    return !!(f && f.state === 'attack' && f.attack && f.stateT < f.attack.startup);
  }


  function loadContentState(){
    try {
      return JSON.parse(localStorage.getItem('eralashCombatContentState') || 'null') || {
        fighterId: 'raven',
        enemyId: 'iron_warden',
        arenaId: 'black_citadel'
      };
    } catch (_) {
      return { fighterId: 'raven', enemyId: 'iron_warden', arenaId: 'black_citadel' };
    }
  }

  function saveContentState(){
    try { localStorage.setItem('eralashCombatContentState', JSON.stringify(contentState)); } catch (_) {}
  }

  function contentFighter(kind){
    const list = contentBundle.fighters?.length ? contentBundle.fighters : DEFAULT_CONTENT.fighters;
    const id = kind === 'player'
      ? (contentState.fighterId || contentBundle.balance?.activeFighterId || 'raven')
      : (contentState.enemyId || contentBundle.balance?.enemyFighterId || 'iron_warden');
    return list.find(f => f.id === id) || list.find(f => f.id === (kind === 'player' ? 'raven' : 'iron_warden')) || list[0] || DEFAULT_CONTENT.fighters[kind === 'player' ? 0 : 1];
  }

  function contentArena(){
    const list = contentBundle.arenas?.length ? contentBundle.arenas : DEFAULT_CONTENT.arenas;
    const id = contentState.arenaId || contentBundle.balance?.activeArenaId || 'black_citadel';
    return list.find(a => a.id === id) || list[0] || DEFAULT_CONTENT.arenas[0];
  }

  function abilityFor(fighterId, slot){
    return (contentBundle.abilities || []).find(a => a.fighterId === fighterId && a.slot === slot && a.active !== false);
  }

  function applyAbilityConfig(){
    const fighter = contentFighter('player');
    const mult = Number(contentBundle.balance?.damageMultiplier || 1);
    ['light','heavy','special'].forEach(slot => {
      const a = abilityFor(fighter.id, slot);
      if (!a || !attacks[slot]) return;
      attacks[slot].damage = Math.max(1, Math.round(Number(a.damage || attacks[slot].damage) * mult));
      attacks[slot].blockDamage = Math.max(0, Math.round(Number(a.blockDamage || attacks[slot].blockDamage) * mult));
      attacks[slot].startup = Math.max(.03, Number(a.startupMs || 80) / 1000);
      attacks[slot].active = Math.max(.03, Number(a.activeMs || 80) / 1000);
      attacks[slot].recovery = Math.max(.05, Number(a.recoveryMs || 150) / 1000);
      attacks[slot].range = Math.max(48, Number(a.range || attacks[slot].range));
      attacks[slot].kb = Math.max(120, Number(a.knockback || attacks[slot].kb));
      if (slot === 'special') attacks[slot].cost = Math.max(0, Number(a.energyCost || attacks[slot].cost || 0));
      attacks[slot].total = attacks[slot].startup + attacks[slot].active + attacks[slot].recovery;
    });
  }

  function makeFighter(kind){
    const isPlayer = kind === 'player';
    const cfg = contentFighter(kind);
    const hp = Number(cfg.hp || 100);
    const fighterId = String(cfg.id || '').toLowerCase();
    const isWarden = fighterId.includes('warden');
    const heavy = isWarden;
    const baseSpeed = Number(cfg.speed || (isWarden ? 62 : 86));
    const baseDefense = Number(cfg.defense || (isWarden ? 84 : 72));
    const basePower = Number(cfg.power || (isWarden ? 88 : 78));

    return {
      id: kind,
      contentId: cfg.id || kind,
      name: cfg.name || (isPlayer ? 'Raven' : 'Iron Warden'),
      archetype: cfg.archetype || '',
      x: isPlayer ? 410 : 870,
      y: groundY,
      vx: 0,
      vy: 0,

      // Combat Physics 7.2:
      // visual art can be huge, but collision is a stable combat capsule.
      w: USE_PREMIUM_FIGHTER_ART ? (isWarden ? 142 : 108) : Number(cfg.width || (isWarden ? 90 : 78)),
      h: USE_PREMIUM_FIGHTER_ART ? (isWarden ? 330 : 300) : Number(cfg.height || (isWarden ? 188 : 172)),
      collisionW: USE_PREMIUM_FIGHTER_ART ? (isWarden ? 120 : 88) : Number(cfg.width || (isWarden ? 90 : 78)),
      collisionH: USE_PREMIUM_FIGHTER_ART ? (isWarden ? 275 : 245) : Number(cfg.height || (isWarden ? 188 : 172)),
      mass: USE_PREMIUM_FIGHTER_ART ? (isWarden ? 1.34 : 1.08) : 1,
      dir: isPlayer ? 1 : -1,

      hp,
      hpDelay: hp,
      maxHp: hp,
      energy: Number(cfg.energy || (isWarden ? 30 : 35)),
      ultimateName: cfg.ultimateName || (isWarden ? 'TITAN JUDGEMENT' : 'RIFT EXECUTION'),
      finisherName: isWarden ? 'TITAN JUDGEMENT' : 'RIFT EXECUTION',
      ultimateCd: 0,
      stamina: 100,

      state: 'idle',
      stateT: 0,
      hitstunTime: 0,
      knockdownTime: 0,
      groundLock: 0,
      invuln: 0,
      canHit: true,

      attack: null,
      attackHasHit: false,
      lastAttackType: '',
      bufferedAttack: '',
      bufferedAttackT: 0,
      comboStep: 0,
      comboT: 0,
      dodgeCd: 0,
      afterImage: 0,
      armor: heavy ? .12 : 0,
      contactPressure: 0,
      walkIntent: 0,
      landingFx: false,

      // Physics 11.0 state.
      coyoteT: 0,
      jumpBufferT: 0,
      landingLag: 0,
      whiffRecoverT: 0,
      clashCd: 0,
      lastGrounded: true,
      stepPhase: 0,
      rootMotionX: 0,
      counterVulnerable: 0,

      // AI + Combos 12.0 state.
      comboSeq: [],
      comboSeqT: 0,
      currentComboName: '',
      comboNameT: 0,
      aiComboQueued: '',
      punishableT: 0,
      pressureT: 0,
      lastDamageTakenAt: 0,

      // Combat AI & Combo 19.0 state.
      blockHoldT: 0,
      blockStress19: 0,
      guardBreakCd: 0,
      guardBrokenT: 0,
      combo19Score: 0,
      combo19Name: '',

      colorA: cfg.colorA || (isPlayer ? '#14171e' : '#17191c'),
      colorB: cfg.colorB || (isPlayer ? '#c92832' : '#3eb6ff'),
      accent: cfg.accent || (isPlayer ? '#d9b76a' : '#d9f2ff'),
      specialName: cfg.specialName || 'Special',
      ultimateName: cfg.ultimateName || 'Ultimate',

      stats: {
        // Physics 11.0: footwork is tuned around acceleration, traction and real stop distance.
        // Raven is faster and more responsive; Warden is heavier and more stable.
        speed: Math.round((isWarden ? 420 : 500) + baseSpeed * (USE_PREMIUM_FIGHTER_ART ? 2.15 : 1.9)),
        accel: Math.round((isWarden ? 2850 : 3650) + baseSpeed * 10.5),
        airAccel: Math.round((isWarden ? 760 : 1020) + baseSpeed * 3.1),
        brake: isWarden ? .68 : .74,
        turnBrake: isWarden ? .48 : .54,
        jump: Number(cfg.jump || (isWarden ? 760 : 900)),
        gravityScale: isWarden ? 1.12 : 1.00,
        hp,
        power: basePower,
        defense: baseDefense
      },
      ai: {
        think: 0,
        next: 0,
        intent: 'neutral',
        band: 'far',
        actionCd: 0,
        guardCd: 0,
        retreatT: 0,
        punishT: 0,
        comboCd: 0,
        lastDecision: 0,
        difficulty: aiDifficultyName(),
        aggression: clamp(Number(contentBundle.balance?.aiDifficulty || .62), .2, .95),
        blockChance: isPlayer ? .32 : clamp((aiProfile().block || .46) + baseDefense / 420, .28, .72),
        mistake: isPlayer ? .22 : clamp((aiProfile().mistake || .2) + (80 - baseSpeed) / 900, .06, .38),
        patience: .25 + Math.random() * .35,
        comboPlan: null,
        comboPlanIndex: 0,
        comboPlanLabel: '',
        mind: 'neutral',
        mindT: 0,
        baitT: 0,
        burstT: 0,
        pressureReadT: 0
      }
    };
  }

  let player = makeFighter('player');
  let enemy = makeFighter('enemy');

  const attacks = {
    // Physics 11.0 — attack data now drives timing, root motion, counter hits and whiff recovery.
    light: {
      name:'light', startup:.070, active:.080, recovery:.155,
      damage:7, blockDamage:2, guardDamage:9,
      range:205, height:150, y:-248,
      kb:390, lift:-56, pushback:78, attackerBrake:.66,
      hitStop:.060, hitstun:.24, energyGain:9, cost:0,
      lunge:170, whiffBrake:.60, priority:1, counterBonus:1.18,
      cancelWindow:[.12,.29], chain:['light','heavy','special']
    },
    heavy: {
      name:'heavy', startup:.155, active:.105, recovery:.305,
      damage:16, blockDamage:5, guardDamage:20,
      range:280, height:178, y:-268,
      kb:650, lift:-140, pushback:122, attackerBrake:.50,
      hitStop:.115, hitstun:.39, energyGain:14, cost:0,
      lunge:245, whiffBrake:.48, priority:2, counterBonus:1.28,
      cancelWindow:[.20,.43], chain:['special']
    },
    special: {
      name:'special', startup:.210, active:.145, recovery:.380,
      damage:24, blockDamage:8, guardDamage:31,
      range:318, height:194, y:-292,
      kb:760, lift:-190, pushback:130, attackerBrake:.45,
      hitStop:.170, hitstun:.55, energyGain:0, cost:42,
      lunge:250, whiffBrake:.42, priority:3, counterBonus:1.34,
      cancelWindow:[.30,.52], chain:[]
    },
    ultimate: {
      name:'ultimate', startup:.360, active:.220, recovery:.560,
      damage:40, blockDamage:13, guardDamage:45,
      range:410, height:235, y:-330,
      kb:1040, lift:-265, pushback:170, attackerBrake:.34,
      hitStop:.305, hitstun:.78, energyGain:0, cost:100,
      lunge:320, whiffBrake:.38, priority:4, counterBonus:1.45,
      cancelWindow:[.42,.70], chain:[]
    }
  };

  function resetRoundPositions(){
    roundResolving = false;
    if (roundEndTimer) { clearTimeout(roundEndTimer); roundEndTimer = 0; }
    applyAbilityConfig();
    player = makeFighter('player');
    enemy = makeFighter('enemy');
    syncHudFighterNames();
    const mobileArena = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    if (EXACT_BLACK_CITADEL_ARENA) {
      const bounds = getExactArenaCombatBounds();
      // Combat Physics 7.2: fighters spawn on the actual central combat plane,
      // not on the decorative left/right edges of the background.
      const spread = mobileArena ? .31 : .34;
      const halfStage = (bounds.right - bounds.left);
      player.x = bounds.center - halfStage * spread;
      enemy.x = bounds.center + halfStage * spread;
    } else {
      player.x = w * (mobileArena ? .36 : .38);
      enemy.x = w * (mobileArena ? .64 : .62);
    }
    player.y = enemy.y = groundY;
    player.dir = 1;
    enemy.dir = -1;
    particles.length = 0;
    texts.length = 0;
    projectiles.length = 0;
    roundTime = ROUND_TIME;
    roundFreeze = 1.25;
    hitStop = 0;
    shake = 0;
    slowMo = 1;
    flash = 0;
    cinematic = 0;
    cameraZoom = 1;
    combatImpact18T = 0;
    combatAi19T = 0;
    combatAi19Word = '';
    combatAi19Meta = '';
    comboTrainer19T = 0;
    comboTrainer19Word = '';
    comboTrainer19Meta = '';
    comboCount = 0;
    comboTimer = 0;
    comboDamage = 0;
    ultimateCineT = 0;
    ultimateCineMax = 0;
    ultimateCineKind = '';
    ultimateCineAttacker = null;
    ultimateCineDefender = null;
    ultimateCineFinisher = false;
    updateComboTag();
    syncUltimateButton();
    physicsDebugT = 5.5;
    showCallout('ROUND ' + roundIndex, (contentArena()?.title || 'Arena') + ' · ' + (player?.name || 'Fighter') + ' VS ' + (enemy?.name || 'Enemy'));
    if (roundIntroTimer) clearTimeout(roundIntroTimer);
    roundIntroTimer = window.setTimeout(()=>{
      if (gameState === 'fight' && !roundResolving) { showCallout('FIGHT', 'Make every hit count'); audio.round(); }
    }, 760);
    updateHUD(true);
  }

  function hideTelegramMainButton(){
    try { window.Telegram?.WebApp?.MainButton?.hide(); } catch(_) {}
  }


  function fight5Name(fallback, kind){
    try {
      const f = contentFighter(kind);
      return f?.name || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function fight5Style(kind){
    try {
      const f = contentFighter(kind);
      return [f?.archetype, f?.style, f?.specialName].filter(Boolean).slice(0,2).join(' · ') || (kind === 'player' ? 'Dark cinematic fighter' : 'Arena AI');
    } catch (_) {
      return kind === 'player' ? 'Dark cinematic fighter' : 'Arena AI';
    }
  }

  function showFight5VsIntro(){
    if (!ui.fight5Vs) return;
    const arena = contentArena();
    ui.fight5PlayerName.textContent = fight5Name('Raven', 'player');
    ui.fight5PlayerStyle.textContent = fight5Style('player');
    ui.fight5EnemyName.textContent = fight5Name('Iron Warden', 'enemy');
    ui.fight5EnemyStyle.textContent = fight5Style('enemy');
    ui.fight5ArenaName.textContent = (arena?.title || 'Black Citadel').toUpperCase();
    ui.fight5Vs.setAttribute('aria-hidden', 'false');
    ui.fight5Vs.classList.remove('show');
    // restart CSS animation
    void ui.fight5Vs.offsetWidth;
    ui.fight5Vs.classList.add('show');
    window.setTimeout(() => {
      if (!ui.fight5Vs) return;
      ui.fight5Vs.classList.remove('show');
      ui.fight5Vs.setAttribute('aria-hidden', 'true');
    }, 1480);
  }



  const CHARACTER_SELECT_META = {
    raven: {
      id:'raven',
      name:'Raven',
      role:'Balanced Duelist',
      style:'Fast Combo Assassin',
      image:'assets/fighter-shadow-raven.png',
      skill:'RIFT EXECUTION',
      text:'Быстрый персонаж с высоким темпом, удобными комбо и сильным давлением на средней дистанции.',
      stats:{ power:78, speed:86, defense:72 }
    },
    iron_warden: {
      id:'iron_warden',
      name:'Iron Warden',
      role:'Heavy Punisher',
      style:'Armored Heavy Tank',
      image:'assets/fighter-iron-warden.png',
      skill:'TITAN JUDGEMENT',
      text:'Тяжёлый персонаж с большим уроном, бронёй, сильным блоком и мощным knockback.',
      stats:{ power:88, speed:62, defense:84 }
    }
  };

  function difficultyToValue(name){
    if (name === 'easy') return .34;
    if (name === 'hard') return .84;
    return .62;
  }

  function difficultyFromValue(value){
    const v = Number(value || contentBundle?.balance?.aiDifficulty || .62);
    if (v < .45) return 'easy';
    if (v > .76) return 'hard';
    return 'normal';
  }

  function currentDifficulty14(){
    try {
      return localStorage.getItem('eralashCombatDifficulty14') || difficultyFromValue(contentBundle?.balance?.aiDifficulty);
    } catch (_) {
      return difficultyFromValue(contentBundle?.balance?.aiDifficulty);
    }
  }

  function opponentForSelectedFighter(id){
    return id === 'iron_warden' ? 'raven' : 'iron_warden';
  }

  function fighterSelectMeta(id){
    return CHARACTER_SELECT_META[id] || CHARACTER_SELECT_META.raven;
  }

  const ARENA_SELECT_META = {
    black_citadel: {
      id:'black_citadel',
      title:'Black Citadel',
      description:'Gothic courtyard, moon gate, wet obsidian stone and ember braziers.',
      accent:'#d9b76a',
      tone:'gold',
      lighting:'Gold / Ember',
      atmosphere:'Smoke + sparks',
      readability:'Balanced',
      previewClass:'',
      backgroundType:'black-citadel',
      quote:'Darkness answers only strength.',
      stageFx:'Low smoke, ember sparks, gold moon backlight',
      moodKey:'citadel'
    },
    infernal_bridge: {
      id:'infernal_bridge',
      title:'Infernal Bridge',
      description:'Hot red pressure arena with aggressive fire grading and heavier impact tone.',
      accent:'#ff5a35',
      tone:'infernal',
      lighting:'Red / Furnace',
      atmosphere:'Heat haze + embers',
      readability:'Aggressive',
      previewClass:'infernal',
      backgroundType:'infernal-bridge',
      quote:'The bridge burns for the fighter who keeps pressure.',
      stageFx:'Heat haze, furnace pulses, aggressive ember rain',
      moodKey:'infernal'
    },
    moon_ritual: {
      id:'moon_ritual',
      title:'Moon Ritual',
      description:'Cold blue ritual court with mist, lunar bloom and cleaner silhouettes.',
      accent:'#86d8ff',
      tone:'moon',
      lighting:'Blue / Moon',
      atmosphere:'Mist + lunar glow',
      readability:'Technical',
      previewClass:'moon',
      backgroundType:'moon-ritual',
      quote:'Under the moon, every mistake becomes visible.',
      stageFx:'Blue ritual fog, lunar bloom, clean silhouette light',
      moodKey:'moon'
    },
    frozen_throne: {
      id:'frozen_throne',
      title:'Frozen Throne',
      description:'Frozen gothic hall with pale haze, snow dust and icy blue edge light.',
      accent:'#b9f3ff',
      tone:'frozen',
      lighting:'Ice / Pale blue',
      atmosphere:'Snow dust + haze',
      readability:'Defensive',
      previewClass:'frozen',
      backgroundType:'frozen-throne',
      quote:'Cold stone rewards patience and punishes panic.',
      stageFx:'Snow dust, pale haze, icy edge light',
      moodKey:'frozen'
    }
  };

  function arenaSelectMeta(id){
    return ARENA_SELECT_META[id] || ARENA_SELECT_META.black_citadel;
  }

  function currentArena15(){
    return contentState.arenaId || contentBundle?.balance?.activeArenaId || 'black_citadel';
  }

  function setSelectedArena15(id){
    if (!ARENA_SELECT_META[id]) return;
    contentBundle.balance = contentBundle.balance || {};
    contentState.arenaId = id;
    contentBundle.balance.activeArenaId = id;
    saveContentState();
    updateArenaSelectUI();
    audio.ui();
  }


  function arenaMood17(){
    const meta = arenaSelectMeta(currentArena15());
    const type = meta.backgroundType || 'black-citadel';
    const mobile = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    const lowPower = mobile || w < 760 || ((navigator.deviceMemory || 8) <= 4);
    const mood = {
      id: meta.id || 'black_citadel',
      key: meta.moodKey || 'citadel',
      title: meta.title || 'Black Citadel',
      accent: meta.accent || '#d9b76a',
      glow: (meta.accent || '#d9b76a') + '55',
      lighting: meta.lighting || 'Gold / Ember',
      atmosphere: meta.atmosphere || 'Smoke + sparks',
      stageFx: meta.stageFx || 'Cinematic fog, ambient particles, color grade',
      quote: meta.quote || 'Darkness answers only strength.',
      type,
      lowPower,
      particleCount: lowPower ? 26 : 76,
      fogCount: lowPower ? 3 : 7
    };

    if (type === 'infernal-bridge') {
      mood.gradeA = 'rgba(255,54,23,.24)';
      mood.gradeB = 'rgba(255,138,36,.12)';
      mood.floor = 'rgba(255,84,34,.070)';
      mood.particle = 'rgba(255,112,46,.88)';
      mood.edge = 'rgba(255,42,20,.16)';
    } else if (type === 'moon-ritual') {
      mood.gradeA = 'rgba(80,174,255,.22)';
      mood.gradeB = 'rgba(126,84,255,.12)';
      mood.floor = 'rgba(124,194,255,.055)';
      mood.particle = 'rgba(134,216,255,.82)';
      mood.edge = 'rgba(68,150,255,.14)';
    } else if (type === 'frozen-throne') {
      mood.gradeA = 'rgba(190,246,255,.22)';
      mood.gradeB = 'rgba(180,206,255,.12)';
      mood.floor = 'rgba(200,242,255,.070)';
      mood.particle = 'rgba(230,252,255,.86)';
      mood.edge = 'rgba(196,245,255,.16)';
    } else {
      mood.gradeA = 'rgba(217,183,106,.16)';
      mood.gradeB = 'rgba(255,80,40,.09)';
      mood.floor = 'rgba(210,190,150,.045)';
      mood.particle = 'rgba(255,218,142,.82)';
      mood.edge = 'rgba(217,183,106,.11)';
    }
    return mood;
  }

  function syncArenaMood17(){
    const mood = arenaMood17();
    const root = document.documentElement;
    root.style.setProperty('--arena17-accent', mood.accent);
    root.style.setProperty('--arena17-glow', mood.glow);
    document.body.setAttribute('data-arena-mood', mood.key);

    if (ui.arenaMoodName17) ui.arenaMoodName17.textContent = mood.title;
    if (ui.arenaMoodText17) ui.arenaMoodText17.textContent = `${mood.atmosphere} · ${mood.lighting}`;
    if (ui.arenaMoodBadge17) ui.arenaMoodBadge17.style.borderColor = mood.accent + '55';
    if (ui.arenaIntroName17) ui.arenaIntroName17.textContent = mood.title;
    if (ui.arenaIntroQuote17) ui.arenaIntroQuote17.textContent = mood.quote;
    if (ui.asStageFx17) ui.asStageFx17.innerHTML = `<b>17.0 Stage FX:</b> ${mood.stageFx}`;
  }

  function showArenaIntro17(){
    syncArenaMood17();
    const overlay = ui.arenaIntro17 || document.getElementById('arenaIntro17');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden','false');
    overlay.classList.remove('show');
    void overlay.offsetWidth;
    requestAnimationFrame(()=>overlay.classList.add('show'));
    window.setTimeout(()=>{
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden','true');
      overlay.style.display = 'none';
    }, 980);
  }

  function drawArenaMood17Layer(layer='back'){
    if (gameState !== 'fight' && gameState !== 'roundEnd') return;
    const mood = arenaMood17();
    const t = performance.now() / 1000;
    const r = EXACT_BLACK_CITADEL_ARENA ? getExactArenaStageRect() : { x:0, y:0, w, h };

    ctx.save();
    if (layer === 'back') {
      ctx.globalCompositeOperation = 'screen';

      const moon = ctx.createRadialGradient(r.x + r.w*.50, r.y + r.h*.22, 0, r.x + r.w*.50, r.y + r.h*.25, r.w*.48);
      moon.addColorStop(0, mood.gradeA);
      moon.addColorStop(.42, mood.gradeB);
      moon.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = moon;
      ctx.fillRect(0,0,w,h);

      const edge = ctx.createLinearGradient(0,0,w,0);
      edge.addColorStop(0, mood.edge);
      edge.addColorStop(.28, 'rgba(0,0,0,0)');
      edge.addColorStop(.72, 'rgba(0,0,0,0)');
      edge.addColorStop(1, mood.type === 'infernal-bridge' ? 'rgba(255,128,48,.12)' : mood.edge);
      ctx.fillStyle = edge;
      ctx.fillRect(0,0,w,h);

      const floor = ctx.createLinearGradient(0,groundY - h*.18,0,h);
      floor.addColorStop(0,'rgba(0,0,0,0)');
      floor.addColorStop(.45,mood.floor);
      floor.addColorStop(1,'rgba(0,0,0,.26)');
      ctx.fillStyle = floor;
      ctx.fillRect(0,Math.max(0,groundY-h*.22),w,h);

      // Slow cinematic light pulse, unique per selected stage.
      const pulse = Math.sin(t * (mood.type === 'infernal-bridge' ? 2.4 : .85)) * .5 + .5;
      ctx.globalAlpha = (mood.lowPower ? .055 : .095) + pulse * (mood.type === 'infernal-bridge' ? .055 : .025);
      ctx.fillStyle = mood.gradeA;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
      return;
    }

    // Foreground atmosphere: particles/fog drawn after fighters for premium depth.
    ctx.globalCompositeOperation = 'screen';
    const fogN = mood.fogCount;
    for (let i=0;i<fogN;i++){
      const drift = mood.type === 'frozen-throne' ? 10 : mood.type === 'infernal-bridge' ? 28 : 18;
      const x = r.x - r.w*.10 + ((i*.31*r.w + t*drift*(1+i*.18)) % (r.w*1.20));
      const y = groundY - h*(.12 + (i%3)*.045) + Math.sin(t*.7+i)*9;
      const rad = r.w * (.16 + (i%3)*.025);
      const fog = ctx.createRadialGradient(x,y,0,x,y,rad);
      fog.addColorStop(0, mood.type === 'infernal-bridge' ? 'rgba(255,90,38,.060)' : mood.type === 'frozen-throne' ? 'rgba(210,250,255,.068)' : mood.type === 'moon-ritual' ? 'rgba(120,196,255,.060)' : 'rgba(214,190,150,.052)');
      fog.addColorStop(.42, 'rgba(255,255,255,.018)');
      fog.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = fog;
      ctx.beginPath();
      ctx.arc(x,y,rad,0,Math.PI*2);
      ctx.fill();
    }

    const n = mood.particleCount;
    for (let i=0;i<n;i++){
      const seed = i * 131;
      const speed = mood.type === 'infernal-bridge' ? 52 : mood.type === 'frozen-throne' ? 18 : 30;
      const x = r.x - 80 + ((seed + t*speed + Math.sin(i*2.1)*55) % (r.w + 160));
      const upward = mood.type === 'infernal-bridge' || mood.type === 'black-citadel';
      const yRaw = (seed*1.71 + t*(upward ? 36 : 17)) % Math.max(1,r.h);
      const y = upward ? (r.y + r.h - yRaw) : (r.y + yRaw);
      const s = mood.type === 'frozen-throne' ? (1.0 + (i%4)*.55) : (.65 + (i%5)*.42);
      ctx.globalAlpha = mood.lowPower ? .10 : (mood.type === 'moon-ritual' ? .11 : .17);
      ctx.fillStyle = i % 5 === 0 ? '#fff4bf' : mood.particle;
      if (mood.type === 'frozen-throne') {
        ctx.fillRect(x, y, s*.95, s*.95);
      } else {
        ctx.beginPath();
        ctx.arc(x,y,s,0,Math.PI*2);
        ctx.fill();
      }
    }
    ctx.restore();
  }


  function updateArenaSelectUI(){
    const id = currentArena15();
    const meta = arenaSelectMeta(id);
    document.querySelectorAll('[data-as-arena]').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-as-arena') === id);
    });
    const title = document.getElementById('asSelectedTitle');
    const desc = document.getElementById('asSelectedDescription');
    const lighting = document.getElementById('asLighting');
    const atmosphere = document.getElementById('asAtmosphere');
    const readability = document.getElementById('asReadability');
    const preview = document.getElementById('asPreview');
    if (title) title.textContent = meta.title;
    if (desc) desc.textContent = meta.description;
    if (lighting) lighting.textContent = meta.lighting;
    if (atmosphere) atmosphere.textContent = meta.atmosphere;
    if (readability) readability.textContent = meta.readability;
    if (preview) {
      preview.className = 'as-preview ' + (meta.previewClass || '');
      preview.style.setProperty('--as-glow', meta.accent + '55');
    }
    if (ui?.fight5ArenaName) ui.fight5ArenaName.textContent = meta.title.toUpperCase();
    syncArenaMood17();
    updateArenaFlowSummary16();
  }

  function updateArenaFlowSummary16(){
    const selectedFighterId = contentState.fighterId || 'raven';
    const enemyId = contentState.enemyId || opponentForSelectedFighter(selectedFighterId);
    const p = fighterSelectMeta(selectedFighterId);
    const e = fighterSelectMeta(enemyId);
    const arena = arenaSelectMeta(currentArena15());
    const diff = currentDifficulty14().toUpperCase() + ' AI';

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    set('asPlayerName', p.name || 'Raven');
    set('asEnemyName', e.name || 'Iron Warden');
    set('asDifficulty', diff);
    set('ar16Arena', arena.title || 'Black Citadel');
    set('ar16Player', p.name || 'Raven');
    set('ar16Enemy', e.name || 'Iron Warden');
    set('ar16Mood', `${arena.lighting || 'Gold / Ember'} · ${arena.atmosphere || 'Smoke + sparks'} · ${diff}`);
    syncArenaMood17();
  }

  function showArenaReveal16(done){
    updateArenaFlowSummary16();
    const overlay = document.getElementById('arenaReveal16');
    const run = () => { if (typeof done === 'function') done(); };
    if (!overlay) { window.setTimeout(run, 0); return; }

    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.remove('show');
    void overlay.offsetWidth;
    requestAnimationFrame(() => overlay.classList.add('show'));

    window.setTimeout(run, 760);
    window.setTimeout(() => {
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.display = 'none';
    }, 940);
  }

  function openArenaSelect(source='character_select'){
    if (gameState !== 'menu' && gameState !== 'result') return;
    contentBundle.balance = contentBundle.balance || {};
    contentState.arenaId = currentArena15();
    contentBundle.balance.activeArenaId = contentState.arenaId;
    saveContentState();
    trackEvent('arena_select_open', { source, patch: ARENA_SELECT_PATCH });
    const overlay = document.getElementById('arenaSelect');
    if (!overlay) { newMatch(); return; }
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>overlay.classList.add('show'));
    document.body.classList.add('arena-select-open');
    updateArenaSelectUI();
  }

  function closeArenaSelect(startingFight=false){
    const overlay = document.getElementById('arenaSelect');
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('arena-select-open');
    window.setTimeout(()=>{ if (!overlay.classList.contains('show')) overlay.style.display = 'none'; }, startingFight ? 90 : 180);
  }

  function startSelectedArenaMatch(){
    contentBundle.balance = contentBundle.balance || {};
    contentState.arenaId = currentArena15();
    contentBundle.balance.activeArenaId = contentState.arenaId;
    saveContentState();
    trackEvent('fight_start', {
      source:'arena_select_15',
      fighter: contentState.fighterId,
      enemy: contentState.enemyId,
      arena: contentState.arenaId,
      difficulty: currentDifficulty14()
    });
    closeArenaSelect(true);
    audio.ensure();
    audio.ui();
    showArenaReveal16(() => newMatch());
  }

  function bindArenaSelect(){
    document.querySelectorAll('[data-as-arena]').forEach(card => {
      card.addEventListener('click', () => setSelectedArena15(card.getAttribute('data-as-arena')));
      card.addEventListener('pointermove', (event) => {
        const shell = card.closest('.as-shell');
        if (!shell) return;
        const r = shell.getBoundingClientRect();
        shell.style.setProperty('--mx', ((event.clientX - r.left) / Math.max(1,r.width) * 100).toFixed(1) + '%');
        shell.style.setProperty('--my', ((event.clientY - r.top) / Math.max(1,r.height) * 100).toFixed(1) + '%');
      });
    });
    document.getElementById('asStartFightBtn')?.addEventListener('click', startSelectedArenaMatch);
    document.getElementById('asCloseBtn')?.addEventListener('click', () => { audio.ui(); closeArenaSelect(false); openCharacterSelect('arena_back'); });
    document.getElementById('asBackBtn')?.addEventListener('click', () => { audio.ui(); closeArenaSelect(false); openCharacterSelect('arena_back'); });

    window.addEventListener('keydown', (event) => {
      const overlay = document.getElementById('arenaSelect');
      if (!overlay || !overlay.classList.contains('show')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        audio.ui();
        closeArenaSelect(false);
        openCharacterSelect('arena_escape_back');
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        startSelectedArenaMatch();
      }
    });

    updateArenaSelectUI();
  }

  function syncHudFighterNames(){
    const p = contentFighter('player');
    const e = contentFighter('enemy');
    const pName = document.getElementById('pNameHud');
    const eName = document.getElementById('eNameHud');
    if (pName) pName.textContent = (p?.name || 'Raven').toUpperCase();
    if (eName) eName.textContent = (e?.name || 'Iron Warden').toUpperCase();
  }

  function updateCharacterSelectUI(){
    const selectedId = contentState.fighterId || 'raven';
    const enemyId = contentState.enemyId || opponentForSelectedFighter(selectedId);
    const p = fighterSelectMeta(selectedId);
    const e = fighterSelectMeta(enemyId);

    document.querySelectorAll('[data-cs-fighter]').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-cs-fighter') === selectedId);
    });

    const playerImg = document.getElementById('csPlayerImg');
    const enemyImg = document.getElementById('csEnemyImg');
    const playerName = document.getElementById('csPlayerName');
    const enemyName = document.getElementById('csEnemyName');
    const playerRole = document.getElementById('csPlayerRole');
    const enemyRole = document.getElementById('csEnemyRole');
    const selectedSkill = document.getElementById('csSelectedSkill');
    const selectedText = document.getElementById('csSelectedText');

    if (playerImg) playerImg.src = p.image;
    if (enemyImg) enemyImg.src = e.image;
    if (playerName) playerName.textContent = p.name;
    if (enemyName) enemyName.textContent = e.name;
    if (playerRole) playerRole.textContent = `${p.role} · ${p.skill}`;
    if (enemyRole) enemyRole.textContent = `${e.role} · ${e.skill}`;
    if (selectedSkill) selectedSkill.textContent = p.skill;
    if (selectedText) selectedText.textContent = p.text;

    const diff = currentDifficulty14();
    document.querySelectorAll('[data-cs-diff]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-cs-diff') === diff);
    });

    syncHudFighterNames();
  }

  function setSelectedFighter14(id){
    if (!CHARACTER_SELECT_META[id]) return;
    contentBundle.balance = contentBundle.balance || {};
    contentState.fighterId = id;
    contentState.enemyId = opponentForSelectedFighter(id);
    contentBundle.balance.activeFighterId = contentState.fighterId;
    contentBundle.balance.enemyFighterId = contentState.enemyId;
    saveContentState();
    updateCharacterSelectUI();
    audio.ui();
  }

  function setDifficulty14(name){
    const value = difficultyToValue(name);
    contentBundle.balance = contentBundle.balance || {};
    contentBundle.balance.aiDifficulty = value;
    try { localStorage.setItem('eralashCombatDifficulty14', name); } catch (_) {}
    updateCharacterSelectUI();
    audio.ui();
  }

  function openCharacterSelect(source='menu'){
    if (gameState !== 'menu' && gameState !== 'result') return;
    contentBundle.balance = contentBundle.balance || {};
    const savedDiff = currentDifficulty14();
    contentBundle.balance.aiDifficulty = difficultyToValue(savedDiff);
    contentState.fighterId = contentState.fighterId || 'raven';
    contentState.enemyId = opponentForSelectedFighter(contentState.fighterId);
    contentBundle.balance.activeFighterId = contentState.fighterId;
    contentBundle.balance.enemyFighterId = contentState.enemyId;
    saveContentState();
    trackEvent('character_select_open', { source, patch: CHARACTER_SELECT_PATCH });
    const overlay = document.getElementById('characterSelect');
    if (!overlay) { newMatch(); return; }
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>overlay.classList.add('show'));
    document.body.classList.add('character-select-open');
    updateCharacterSelectUI();
  }

  function closeCharacterSelect(startingFight=false){
    const overlay = document.getElementById('characterSelect');
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('character-select-open');
    window.setTimeout(()=>{ if (!overlay.classList.contains('show')) overlay.style.display = 'none'; }, startingFight ? 90 : 180);
  }

  function startSelectedCharacterMatch(){
    contentBundle.balance = contentBundle.balance || {};
    const diff = currentDifficulty14();
    contentBundle.balance.aiDifficulty = difficultyToValue(diff);
    contentState.enemyId = opponentForSelectedFighter(contentState.fighterId || 'raven');
    contentBundle.balance.activeFighterId = contentState.fighterId;
    contentBundle.balance.enemyFighterId = contentState.enemyId;
    saveContentState();
    trackEvent('fight_start', {
      source:'character_select_14',
      fighter: contentState.fighterId,
      enemy: contentState.enemyId,
      difficulty: diff
    });
    closeCharacterSelect(true);
    audio.ensure();
    audio.ui();
    window.setTimeout(()=>openArenaSelect('character_select_14'), 90);
  }

  function bindCharacterSelect(){
    const interceptStart = (id, source) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', (event) => {
        if (gameState !== 'menu') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        audio.ensure();
        audio.ui();
        openCharacterSelect(source);
      }, true);
    };

    interceptStart('startBtn', 'main_start_button');
    interceptStart('realStartZone', 'real_art_start_zone');

    document.querySelectorAll('[data-cs-fighter]').forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('locked')) return;
        setSelectedFighter14(card.getAttribute('data-cs-fighter'));
      });
    });

    document.querySelectorAll('[data-cs-diff]').forEach(btn => {
      btn.addEventListener('click', () => setDifficulty14(btn.getAttribute('data-cs-diff') || 'normal'));
    });

    document.getElementById('csStartFightBtn')?.addEventListener('click', startSelectedCharacterMatch);
    document.getElementById('csCloseBtn')?.addEventListener('click', () => { audio.ui(); closeCharacterSelect(false); });
    document.getElementById('csBackBtn')?.addEventListener('click', () => { audio.ui(); closeCharacterSelect(false); });

    window.addEventListener('keydown', (event) => {
      const overlay = document.getElementById('characterSelect');
      if (!overlay || !overlay.classList.contains('show')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        audio.ui();
        closeCharacterSelect(false);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        startSelectedCharacterMatch();
      }
    });

    updateCharacterSelectUI();
  }


  function newMatch(){
    syncArenaMood17();
    matchFinalized = false;
    roundResolving = false;
    if (roundEndTimer) { clearTimeout(roundEndTimer); roundEndTimer = 0; }
    setPaused(false, true);
    playerRounds = 0;
    enemyRounds = 0;
    roundIndex = 1;
    matchMaxCombo = 0;
    gameState = 'fight';
    ui.result.style.display = 'none';
    ui.result.classList.add('fight5-result');
    hideTelegramMainButton();
    resetRoundPositions();

    // Fight Screen 5.0: premium menu -> VS -> fight transition.
    roundFreeze = 2.15;
    document.body.classList.remove('menu-returning');
    document.body.classList.add('menu-leaving','fight-entering');
    ui.menu.setAttribute('aria-hidden', 'true');

    window.setTimeout(() => {
      document.body.classList.add('is-fighting');
      ui.menu.style.setProperty('display', 'none', 'important');
      document.body.classList.remove('menu-leaving');
      showFight5VsIntro();
      showArenaIntro17();
      const arena = contentArena();
      showCallout('ROUND ' + roundIndex, (arena?.title || 'Dark fortress arena'));
    }, document.body.classList.contains('real-art-v4') ? 260 : 0);

    window.setTimeout(() => {
      document.body.classList.remove('fight-entering');
      showCallout('FIGHT', 'Round ' + roundIndex);
    }, document.body.classList.contains('real-art-v4') ? 1500 : 900);
  }

  function resize(){
    dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w*dpr);
    canvas.height = Math.floor(h*dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    groundY = Math.floor(h * (window.matchMedia && window.matchMedia('(pointer:coarse)').matches ? 0.78 : (1 - GROUND_MARGIN)));
    if (player && enemy) {
      player.y = Math.min(player.y, groundY);
      enemy.y = Math.min(enemy.y, groundY);
    }
  }

  function showCallout(big, small=''){
    ui.calloutBig.textContent = big;
    ui.calloutSmall.textContent = small;
    ui.callout.style.display = 'block';
    clearTimeout(showCallout._t);
    showCallout._t = setTimeout(()=>{ ui.callout.style.display='none'; }, 1050);
  }

  function loadProfile(){
    try {
      return JSON.parse(localStorage.getItem('eralashCombatProfile') || 'null') || {
        level: 1, xp: 0, coins: 0, wins: 0, losses: 0, matches: 0, bestStreak: 0, streak: 0, dailyStreak: 0
      };
    } catch(_) {
      return { level: 1, xp: 0, coins: 0, wins: 0, losses: 0, matches: 0, bestStreak: 0, streak: 0, dailyStreak: 0 };
    }
  }

  function saveProfile(){
    try { localStorage.setItem('eralashCombatProfile', JSON.stringify(appProfile)); } catch(_) {}
  }

  function normalizeServerProfile(profile){
    if (!profile) return null;
    return {
      level: Number(profile.level || 1),
      xp: Number(profile.xp || 0),
      xpTotal: Number(profile.xpTotal || 0),
      coins: Number(profile.coins || 0),
      wins: Number(profile.wins || 0),
      losses: Number(profile.losses || 0),
      matches: Number(profile.matches || 0),
      bestStreak: Number(profile.bestStreak || 0),
      streak: Number(profile.streak || 0),
      dailyStreak: Number(profile.dailyStreak || 0),
      lastDailyClaimAt: profile.lastDailyClaimAt || ''
    };
  }

  async function syncProfileFromBackend(){
    if (!telegramContext.insideTelegram || !telegramContext.initData) return;
    try {
      const res = await fetch('/api/profile', {
        headers: { 'X-Telegram-Init-Data': telegramContext.initData || '' }
      });
      const data = await res.json();
      const profile = normalizeServerProfile(data.profile);
      if (data.ok && profile) {
        appProfile = { ...appProfile, ...profile };
        saveProfile();
        updateTelegramBadge();
      }
    } catch(_) {
      // Browser/local preview remains playable without backend.
    }
  }

  function profileName(){
    const u = telegramContext.user;
    if (!u) return 'Guest Fighter';
    return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || ('Player ' + u.id);
  }

  function updateTelegramBadge(){
    if (!ui.tgProfileBadge) return;
    const name = profileName();
    const mode = telegramContext.insideTelegram ? 'Telegram Fighter' : 'Offline Arena Preview';
    ui.tgProfileBadge.textContent = `${mode} · ${name} · LVL ${appProfile.level} · ${appProfile.coins} coins · ${appProfile.wins}W/${appProfile.losses}L`;
  }

  function grantRewards(victory){
    const rewards = victory
      ? { xp: 100, coins: 50, label: '+100 XP · +50 coins' }
      : { xp: 25, coins: 10, label: '+25 XP · +10 coins' };

    appProfile.matches += 1;
    appProfile.xp += rewards.xp;
    appProfile.coins += rewards.coins;
    if (victory) {
      appProfile.wins += 1;
      appProfile.streak += 1;
      appProfile.bestStreak = Math.max(appProfile.bestStreak, appProfile.streak);
    } else {
      appProfile.losses += 1;
      appProfile.streak = 0;
    }

    while (appProfile.xp >= appProfile.level * 250) {
      appProfile.xp -= appProfile.level * 250;
      appProfile.level += 1;
      appProfile.coins += 25;
    }

    saveProfile();
    updateTelegramBadge();
    return rewards;
  }

  async function sendBattleResult(victory, rewards){
    const payload = {
      game: 'eralash-combat',
      result: victory ? 'win' : 'loss',
      rewards,
      score: {
        playerRounds,
        enemyRounds,
        duration: Math.max(0, Math.round(ROUND_TIME - roundTime)),
        combo: matchMaxCombo,
        level: appProfile.level,
        xp: appProfile.xp,
        coins: appProfile.coins,
        wins: appProfile.wins,
        losses: appProfile.losses,
        bestStreak: appProfile.bestStreak
      },
      user: telegramContext.user ? {
        id: telegramContext.user.id,
        username: telegramContext.user.username,
        first_name: telegramContext.user.first_name,
        last_name: telegramContext.user.last_name
      } : null,
      createdAt: new Date().toISOString()
    };

    try {
      if (window.Telegram?.WebApp?.sendData && telegramContext.insideTelegram) {
        window.Telegram.WebApp.sendData(JSON.stringify(payload));
      }
    } catch(_) {}

    try {
      const res = await fetch('/api/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': telegramContext.initData || ''
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>null);
      const profile = normalizeServerProfile(data?.profile);
      if (data?.ok && profile) {
        appProfile = { ...appProfile, ...profile };
        saveProfile();
        updateTelegramBadge();
      }
      if (data?.season?.pointsAdded && ui.resultRewards) {
        ui.resultRewards.insertAdjacentHTML('beforeend', `<span style="padding:8px 10px;border:1px solid rgba(217,183,106,.28);border-radius:999px;background:rgba(255,255,255,.055)">+${data.season.pointsAdded} season pts</span>`);
      }
      if (data?.missions?.updated?.length && ui.resultRewards) {
        ui.resultRewards.insertAdjacentHTML('beforeend', `<span style="padding:8px 10px;border:1px solid rgba(217,183,106,.28);border-radius:999px;background:rgba(255,255,255,.055)">🎯 ${data.missions.updated.length} mission progress</span>`);
      }
      if (data?.achievements?.length && ui.resultRewards) {
        ui.resultRewards.insertAdjacentHTML('beforeend', `<span style="padding:8px 10px;border:1px solid rgba(217,183,106,.28);border-radius:999px;background:rgba(255,255,255,.055)">🏅 ${data.achievements.length} achievement</span>`);
      }
    } catch(_) {
      // Offline/browser preview must keep working even without backend.
    }
  }


  function isActionLocked(f){
    return f.state === 'hitstun' || f.state === 'knockdown' || f.state === 'dodge' || (f.landingLag || 0) > .045 || (f.whiffRecoverT || 0) > .045;
  }

  function canAttackCancel(f, type){
    if (f.state !== 'attack' || !f.attack) return false;
    if (f.attackHasHit !== true) return false;
    if (!f.attack.chain || !f.attack.chain.includes(type)) return false;
    const t = f.stateT;
    const win = f.attack.cancelWindow || [999, 999];
    return t >= win[0] && t <= win[1];
  }

  function bufferAttack(f, type){
    f.bufferedAttack = type;
    // 12.0: longer input buffer makes LIGHT -> LIGHT -> HEAVY reliable on mobile.
    f.bufferedAttackT = .34;
  }

  function consumeBufferedAttack(f){
    if (!f.bufferedAttack || f.bufferedAttackT <= 0) return false;
    const type = f.bufferedAttack;
    f.bufferedAttack = '';
    f.bufferedAttackT = 0;
    startAttack(f, type, true);
    return true;
  }

  function performDodge(f){
    if (gameState !== 'fight' || roundFreeze > 0) return;
    if (!isGrounded(f) || f.dodgeCd > 0) return;
    if (f.state === 'attack' || f.state === 'hitstun' || f.state === 'knockdown') return;
    f.dodgeCd = USE_PREMIUM_FIGHTER_ART ? .58 : .72;
    f.invuln = .28;
    f.afterImage = .32;
    f.groundLock = .12;
    f.state = 'dodge';
    f.stateT = 0;
    const away = f.id === 'player' ? (input.left ? -1 : input.right ? 1 : -f.dir) : -f.dir;
    f.vx = away * Math.max(USE_PREMIUM_FIGHTER_ART ? 640 : 520, f.stats.speed * 1.38);
    f.vy = 0;
    spawnAfterImage(f);
    spawnFootDust(f, 8, f.colorB);
    floatingText('DODGE', f.x, f.y - f.h*.78, '#bde8ff');
    audio.tone(520,.045,'triangle',.035,.82);
    tryHaptic('light');
  }

  function spawnAfterImage(f){
    for(let i=0;i<8;i++){
      particles.push({
        x:f.x - f.dir * (i*12 + 12),
        y:f.y - f.collisionH*.52,
        vx:-f.dir*(90+i*22),
        vy:-24 + Math.random()*42,
        life:.20 + i*.026,
        max:.20 + i*.026,
        size:24 - i*1.35,
        color:f.colorB + '88',
        kind:'after'
      });
    }
  }

  function spawnFootDust(f, count=5, color='rgba(210,170,120,.34)'){
    for(let i=0;i<count;i++){
      particles.push({
        kind:'dust',
        x:f.x + (Math.random()-.5)*50,
        y:f.y + 4,
        vx:(Math.random()-.5)*120 - f.vx*.10,
        vy:-26-Math.random()*48,
        life:.32 + Math.random()*.18,
        max:.46,
        color: typeof color === 'string' && color[0] === '#' ? color + '55' : color,
        size:10+Math.random()*18
      });
    }
  }

  function ultimateDisplayName(f){
    if (!f) return 'ULTIMATE';
    return f.id === 'player' ? 'RIFT EXECUTION' : 'TITAN JUDGEMENT';
  }

  function finisherDisplayName(f){
    if (!f) return 'FINISHER';
    return f.id === 'player' ? 'RIFT EXECUTION' : 'TITAN JUDGEMENT';
  }

  function syncUltimateButton(){
    const btn = document.querySelector('[data-input="ultimate"]');
    if (!btn || !player) return;
    const ready = gameState === 'fight' && !roundResolving && player.energy >= attacks.ultimate.cost;
    btn.classList.toggle('ready', !!ready);
    btn.textContent = ready ? 'ULT!' : 'ULT';
  }

  function spawnUltimateCharge(f){
    if (!f) return;
    for(let i=0;i<30;i++){
      const a = (i / 30) * Math.PI * 2;
      const r = 54 + Math.random()*110;
      particles.push({
        kind:'ember',
        x:f.x + Math.cos(a)*r,
        y:f.y - (f.collisionH || f.h)*(.48 + Math.random()*.26) + Math.sin(a)*r*.34,
        vx:-Math.cos(a)*(80+Math.random()*180),
        vy:-60-Math.random()*160,
        life:.52 + Math.random()*.36,
        max:.88,
        color:i%2 ? (f.colorB || '#fff0b7') : '#fff0b7',
        size:3+Math.random()*8
      });
    }
    for(let i=0;i<4;i++){
      particles.push({kind:'shockwave', x:f.x, y:f.y-110-i*24, vx:0, vy:0, life:.42+i*.07, max:.42+i*.07, size:90+i*46, color:i%2 ? f.colorB : '#fff0b7'});
    }
    spawnAura(f, '#fff0b7');
    spawnAura(f, f.colorB);
  }

  function triggerUltimateCinematic(attacker, defender, finishing=false){
    if (!attacker || !defender) return;
    ultimateCineT = finishing ? 1.65 : .92;
    ultimateCineMax = ultimateCineT;
    ultimateCineKind = attacker.id === 'player' ? 'raven' : 'warden';
    ultimateCineAttacker = attacker;
    ultimateCineDefender = defender;
    ultimateCineFinisher = !!finishing;
    combatFeel10T = Math.max(combatFeel10T, finishing ? 1.45 : .95);
    cinematic = Math.max(cinematic, finishing ? 1.35 : .95);
    cameraZoom = Math.max(cameraZoom, finishing ? 1.22 : 1.14);
    shake = Math.max(shake, finishing ? 34 : 24);
    flash = Math.max(flash, finishing ? .42 : .28);
    slowMo = Math.min(slowMo, finishing ? .28 : .42);
    roundFreeze = Math.max(roundFreeze, finishing ? .30 : .12);
    spawnUltimateCharge(attacker);
    spawnPremiumImpact(attacker, defender, {name:'ultimate', damage:attacks.ultimate.damage}, false);
    spawnSlashWave(attacker, defender, 'ultimate');
    const title = finishing ? 'FINISHER' : 'ULTIMATE';
    const name = finishing ? finisherDisplayName(attacker) : ultimateDisplayName(attacker);
    showCallout(title, name);
    floatingText(name, (attacker.x + defender.x) * .5, Math.min(attacker.y, defender.y) - 285, '#fff0b7');
  }

  function updateUltimateCinematic(dt){
    if (ultimateCineT <= 0) return;
    ultimateCineT = Math.max(0, ultimateCineT - dt);
    const attacker = ultimateCineAttacker;
    const defender = ultimateCineDefender;
    if (attacker && defender && Math.random() < dt * (ultimateCineFinisher ? 32 : 20)) {
      const midX = (attacker.x + defender.x) * .5 + (Math.random()-.5)*140;
      const midY = Math.min(attacker.y, defender.y) - 160 + (Math.random()-.5)*110;
      particles.push({kind:'impactLine', x:midX, y:midY, vx:0, vy:0, life:.28, max:.28, size:80+Math.random()*90, angle:Math.random()*Math.PI*2, color:attacker.colorB || '#fff0b7'});
      particles.push({kind:'spark', x:midX, y:midY, vx:(Math.random()-.5)*180, vy:(Math.random()-.5)*180, life:.22, max:.22, size:8+Math.random()*12, color:'#fff0b7'});
    }
  }

  function drawUltimateCinematic(){
    if (ultimateCineT <= 0 || ultimateCineMax <= 0) return;
    const p = clamp(ultimateCineT / ultimateCineMax, 0, 1);
    const k = 1 - p;
    const attacker = ultimateCineAttacker;
    const accent = attacker?.colorB || '#fff0b7';
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${ultimateCineFinisher ? .36 + .28*p : .24 + .22*p})`;
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = `rgba(0,0,0,${ultimateCineFinisher ? .56 : .42})`;
    ctx.fillRect(0,0,w,h*.16);
    ctx.fillRect(0,h*.84,w,h*.16);
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha = .20 + .28*p;
    const g = ctx.createRadialGradient(w*.5,h*.50,w*.04,w*.5,h*.50,w*.62);
    g.addColorStop(0, accent + '88');
    g.addColorStop(.36, 'rgba(255,240,183,.24)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha = .88;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.shadowColor=accent;
    ctx.shadowBlur=28;
    ctx.fillStyle='#fff0b7';
    ctx.font='1000 ' + Math.round((ultimateCineFinisher ? 44 : 34) + k*8) + 'px Inter, Arial';
    ctx.fillText(ultimateCineFinisher ? 'FINAL EXECUTION' : 'ULTIMATE ART', w*.5, h*.205);
    ctx.font='1000 ' + Math.round((ultimateCineFinisher ? 68 : 48) + k*14) + 'px Inter, Arial';
    ctx.fillText(ultimateCineFinisher ? finisherDisplayName(attacker) : ultimateDisplayName(attacker), w*.5, h*.77);
    ctx.restore();
  }


  function startAttack(f, type, fromBuffer=false){
    if (gameState !== 'fight') return;
    if (roundFreeze > 0) return;
    if (isActionLocked(f)) {
      if (!fromBuffer) bufferAttack(f, type);
      return;
    }

    if (f.state === 'attack' && !canAttackCancel(f, type)) {
      if (!fromBuffer) bufferAttack(f, type);
      return;
    }

    const data = attacks[type];
    if (!data) return;
    if (type === 'ultimate' && (f.ultimateCd || 0) > 0) {
      if (f.id === 'player') floatingText('ULT COOLDOWN', f.x, f.y - f.h*.86, '#d9b76a');
      return;
    }

    if ((type === 'special' || type === 'ultimate') && f.energy < data.cost) {
      if (f.id === 'player') floatingText('NO ENERGY', f.x, f.y - f.h*.86, '#d9b76a');
      return;
    }

    if (type === 'ultimate') {
      f.energy = clamp(f.energy - data.cost, 0, 100);
      f.ultimateCd = 3.2;
      spawnUltimateCharge(f);
      cinematic = .95;
      cameraZoom = 1.12;
      shake = Math.max(shake, 22);
      flash = Math.max(flash, .34);
      showCallout('ULTIMATE READY', ultimateDisplayName(f));
      audio.hit('ultimate');
      tryHaptic('ultimate');
      syncUltimateButton();
    } else if (type === 'special') {
      f.energy = clamp(f.energy - data.cost, 0, 100);
      spawnAura(f, f.colorB);
      shake = Math.max(shake, 10);
      flash = Math.max(flash, .16);
      audio.tone(120,.11,'sawtooth',.075,.55);
      particles.push({kind:'shockwave', x:f.x + f.dir*34, y:f.y-96, vx:0, vy:0, life:.28, max:.28, size:60, color:f.colorB});
    } else {
      audio.tone(type==='heavy'?160:250,.045,'square',.025,.9);
      if (type === 'heavy') particles.push({kind:'shockwave', x:f.x + f.dir*28, y:f.y-110, vx:0, vy:0, life:.22, max:.22, size:44, color:f.colorB});
    }

    f.state = 'attack';
    f.stateT = 0;
    const comboName = registerAttackSequence(f, type);
    const comboBoost19 = comboName ? (comboName === 'EXECUTION STRING' ? 1.10 : 1.06) : 1;
    f.attack = { ...data, total: data.startup + data.active + data.recovery, name: data.name || type, dir: f.dir, whiffed: false, comboName, comboBoost19 };
    f.attackHasHit = false;
    f.lastAttackType = type;
    f.aiComboQueued = '';
    f.comboT = .62;
    f.comboStep = type === 'light' ? Math.min(2, (f.comboStep || 0) + 1) : 0;
    if (f.ai) {
      f.ai.actionCd = Math.max(f.ai.actionCd || 0, type === 'special' ? .32 : type === 'heavy' ? .26 : .18);
      f.ai.intent = type === 'special' ? 'special' : type === 'heavy' ? 'commit' : 'poke';
    }

    // Real attack momentum: sprite and hitbox move together.
    f.vx += f.dir * (data.lunge || 0) * .82 * (f.attack?.comboBoost19 || 1);
    f.vx = clamp(f.vx, -f.stats.speed*1.28, f.stats.speed*1.28);
    spawnFootDust(f, type === 'ultimate' ? 12 : type === 'special' ? 9 : type === 'heavy' ? 7 : 4, f.colorB);
  }

  function setState(f, s){
    if (f.state !== s) {
      f.state = s;
      f.stateT = 0;
      if (s !== 'attack') f.attack = null;
    }
  }

  function bodyBox(f){
    if (USE_PREMIUM_FIGHTER_ART) {
      const bw = f.collisionW || fighterVisualWidth(f) * (f.id === 'enemy' ? .58 : .52);
      const bh = f.collisionH || fighterVisualHeight(f) * .78;
      return { x:f.x - bw/2, y:f.y - bh, w:bw, h:bh };
    }
    return { x:f.x - f.w/2, y:f.y - f.h, w:f.w, h:f.h };
  }

  function hurtBox(f){
    if (USE_PREMIUM_FIGHTER_ART) {
      const bw = (f.collisionW || f.w) * (f.id === 'enemy' ? .92 : .88);
      const bh = (f.collisionH || f.h) * .94;
      return { x:f.x - bw/2, y:f.y - bh*.99, w:bw, h:bh };
    }
    return { x:f.x - f.w*.42, y:f.y - f.h*.95, w:f.w*.84, h:f.h*.9 };
  }

  function attackBox(f){
    if (f.state !== 'attack' || !f.attack) return null;
    const t = f.stateT;
    if (t < f.attack.startup || t > f.attack.startup + f.attack.active) return null;

    if (USE_PREMIUM_FIGHTER_ART) {
      const vh = fighterVisualHeight(f);
      const dir = attackDirection(f);
      const reachBoost = f.attack.name === 'ultimate' ? 1.38 : f.attack.name === 'special' ? 1.27 : f.attack.name === 'heavy' ? 1.16 : 1.04;
      const minRange = f.attack.name === 'ultimate' ? 410 : f.attack.name === 'special' ? 342 : f.attack.name === 'heavy' ? 308 : 246;
      const range = Math.max(minRange, f.attack.range * premiumFighterScaleFactor() * reachBoost);
      const boxH = Math.max(150, f.attack.height * premiumFighterScaleFactor() * 1.10);
      const y = f.y - vh * (f.attack.name === 'ultimate' ? .80 : f.attack.name === 'special' ? .75 : .72);
      const base = fighterBodyRadius(f) * .36;
      return {
        x: dir > 0 ? f.x + base : f.x - base - range,
        y,
        w: range,
        h: boxH
      };
    }

    const range = f.attack.range;
    const dir = attackDirection(f);
    return {
      x: dir > 0 ? f.x + f.w*.15 : f.x - f.w*.15 - range,
      y: f.y + f.attack.y,
      w: range,
      h: f.attack.height
    };
  }

  function isGrounded(f){ return f.y >= groundY - 0.5; }

  function applyHit(attacker, defender, atk){
    if (defender.invuln > 0 || defender.hp <= 0) return;

    const facing = attackDirection(attacker) || Math.sign(defender.x - attacker.x) || attacker.dir;
    const defenderFacingAttacker = Math.sign(attacker.x - defender.x) === defender.dir;
    const defenderBlocking = defender.state === 'block' && defender.stamina > 0 && defenderFacingAttacker;
    const counterHit = !defenderBlocking && isAttackStartup(defender);

    const hpBefore = defender.hp;
    let dmg = atk.damage;
    let blocked = false;

    if (defenderBlocking) {
      blocked = true;
      dmg = atk.blockDamage;
      defender.stamina = clamp(defender.stamina - (atk.guardDamage || 14), 0, 100);
      defender.vx += facing * Math.max(86, (atk.kb || 300) * .20);
      if (defender.stamina <= 0) {
        blocked = false;
        dmg += 8;
        defender.invuln = 0;
        triggerGuardBreak19(defender, attacker);
      }
    }

    if (counterHit) {
      dmg *= (atk.counterBonus || 1.22);
      defender.hitstunTime = Math.max(defender.hitstunTime || 0, (atk.hitstun || .28) + .12);
      floatingText('COUNTER', defender.x, defender.y - defender.h*.98, '#ffd27a');
      spawnAura(defender, '#ffd27a');
    }

    const comboName = (!blocked && attacker.attack && attacker.attack.comboName) ? attacker.attack.comboName : '';
    if (comboName) {
      dmg *= comboBonusFor(comboName, atk.name);
      attacker.comboNameT = .85;
      attacker.currentComboName = comboName;
      floatingText(comboName, defender.x, defender.y - defender.h*.98, attacker.id === 'player' ? '#ffd27a' : '#8edcff');
    }

    const armorReduce = (!blocked && defender.armor && atk.name !== 'ultimate') ? defender.armor : 0;
    dmg = Math.max(1, Math.round(dmg * (1 - armorReduce)));

    defender.hp = clamp(defender.hp - dmg, 0, defender.maxHp);
    if (blocked) defender.energy = clamp(defender.energy + 4, 0, 100);
    else defender.energy = clamp(defender.energy + (atk.name === 'ultimate' ? 14 : atk.name === 'special' ? 11 : atk.name === 'heavy' ? 8 : 5), 0, 100);
    const ultimateFinisher = !blocked && atk.name === 'ultimate' && (defender.hp <= 0 || hpBefore <= defender.maxHp * .30 || defender.hp <= defender.maxHp * .18);
    if (ultimateFinisher) {
      defender.hp = 0;
      triggerUltimateCinematic(attacker, defender, true);
    } else if (!blocked && atk.name === 'ultimate') {
      triggerUltimateCinematic(attacker, defender, false);
    }
    defender.lastDamageTakenAt = performance.now();
    defender.pressureT = blocked ? .42 : .68;
    defender.invuln = atk.name === 'ultimate' ? .16 : .08;

    const massScale = 1 / Math.max(.8, defender.mass || 1);
    const effectiveKb = blocked ? (atk.kb*.27) : atk.kb * (counterHit ? 1.16 : 1);
    defender.vx = facing * effectiveKb * massScale;
    defender.vy = blocked ? -28 : (atk.lift || -70) * massScale * (counterHit ? 1.10 : 1);
    // Real Physics 7.2: impact displacement happens on the same frame as the hit.
    // This makes hits visible immediately instead of feeling like static art.
    defender.x += facing * (blocked ? 18 : atk.name === 'ultimate' ? 78 : atk.name === 'special' ? 58 : atk.name === 'heavy' ? 48 : 30) * massScale;

    attacker.vx -= facing * (atk.pushback || 60) / Math.max(.9, attacker.mass || 1);
    attacker.x -= facing * Math.min(44, (atk.pushback || 60) * .28);
    attacker.vx *= atk.attackerBrake || .7;

    const bounds = stageBounds();
    const wallPad = Math.max(48, fighterBodyRadius(defender) * .55);
    if (!blocked && (defender.x < bounds.left + wallPad || defender.x > bounds.right - wallPad)) {
      defender.x = clamp(defender.x, bounds.left + wallPad, bounds.right - wallPad);
      defender.vx *= -.32;
      defender.vy = Math.min(defender.vy, -135);
      shake = Math.max(shake, 13);
      hitStop = Math.max(hitStop, .105);
      floatingText('WALL', defender.x, defender.y - defender.h*.78, '#ffd27a');
      spawnPremiumImpact(attacker, defender, { ...atk, name:'heavy' }, false);
    }

    const hardHit = !blocked && (atk.name === 'heavy' || atk.name === 'special' || atk.name === 'ultimate');
    if (hardHit && atk.name !== 'heavy') {
      defender.knockdownTime = atk.name === 'ultimate' ? .78 : .46;
      setState(defender, 'knockdown');
    } else {
      defender.hitstunTime = blocked ? .14 : Math.max(defender.hitstunTime || 0, (atk.hitstun || .28) * (counterHit ? 1.16 : 1));
      setState(defender, blocked ? 'block' : 'hitstun');
    }
    defender.stateT = 0;

    attacker.energy = clamp(attacker.energy + atk.energyGain, 0, 100);
    if (!blocked) aiQueueFollowup(attacker, defender, atk);
    hitStop = Math.max(hitStop, (atk.hitStop || .06) * (blocked ? .75 : 1.22));
    if (!blocked) {
      if (performance.now() - lastHitAt < 1500) comboCount += 1;
      else comboCount = 1;
      comboTimer = 1.45;
      matchMaxCombo = Math.max(matchMaxCombo, comboCount);
      comboDamage += dmg;
      lastHitAt = performance.now();
      updateComboTag();
    }

    shake = Math.max(shake, blocked ? 6 : atk.name === 'ultimate' ? 30 : atk.name === 'special' ? 21 : atk.name === 'heavy' ? 16 : 9);
    flash = Math.max(flash, blocked ? .08 : atk.name === 'ultimate' ? .34 : atk.name === 'special' ? .21 : .12);
    if (atk.name === 'ultimate') { cinematic = .82; cameraZoom = 1.16; }
    else if (!blocked && atk.name === 'special') { cinematic = Math.max(cinematic,.38); cameraZoom = Math.max(cameraZoom,1.075); }
    else if (!blocked && atk.name === 'heavy') { cameraZoom = Math.max(cameraZoom,1.045); }

    spawnHitSpark(defender.x - facing*28, defender.y - (defender.collisionH || defender.h)*.62, blocked ? '#8edcff' : attacker.colorB, atk.name);
    spawnPremiumImpact(attacker, defender, atk, blocked);
    spawnCombatImpact18(attacker, defender, atk, blocked, dmg, counterHit);
    registerCombatResult19(attacker, defender, atk, blocked, dmg, counterHit);
    spawnSlashWave(attacker, defender, atk.name);
    spawnFootDust(defender, blocked ? 4 : atk.name === 'ultimate' ? 16 : atk.name === 'special' ? 11 : atk.name === 'heavy' ? 8 : 5, blocked ? '#8edcff' : attacker.colorB);
    floatingDamage(blocked ? 'BLOCK' : (counterHit ? 'COUNTER -' + dmg : '-' + dmg), defender.x, defender.y - defender.h*.88, blocked ? '#8edcff' : '#fff3d1', atk.name);
    pulseCombatUi(defender, blocked);
    audio.hit(blocked ? 'block' : atk.name);
    tryHaptic(blocked ? 'light' : atk.name);
    updateHUD();

    if (defender.hp <= 0) {
      finishRound(attacker.id === 'player' ? 'player' : 'enemy');
    } else {
      forceRoundEndCheck('apply-hit');
    }
  }

  function tryHaptic(kind){
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        if (kind === 'ultimate') { window.Telegram.WebApp.HapticFeedback.impactOccurred('rigid'); window.Telegram.WebApp.HapticFeedback.notificationOccurred('success'); }
        else if (kind === 'special' || kind === 'heavy') window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
        else window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      } else if (navigator.vibrate) {
        navigator.vibrate(kind === 'ultimate' ? [35,20,55] : kind === 'special' ? 35 : kind === 'heavy' ? 22 : 10);
      }
    } catch(_) {}
  }

  function finishRound(winner){
    // 9.4 Round Fix: round resolution is now guarded and deterministic.
    // Previous builds could leave the game in fight/roundEnd with HP at 0 because
    // multiple states/timers competed after sprite combat changes.
    if (gameState !== 'fight' || roundResolving || matchFinalized) return;
    if (!player || !enemy) return;

    winner = winner === 'enemy' ? 'enemy' : 'player';
    roundResolving = true;
    gameState = 'roundEnd';
    roundFreeze = 1.55;
    hitStop = 0;
    slowMo = .42;
    shake = Math.max(shake, 18);
    flash = Math.max(flash, .28);

    // Freeze combat input during the K.O. beat.
    input.left = input.right = input.jump = input.dodge = input.block = false;
    input.light = input.heavy = input.special = input.ultimate = false;
    input.pressed = Object.create(null);

    if (winner === 'player') {
      enemy.hp = 0;
      playerRounds++;
    } else {
      player.hp = 0;
      enemyRounds++;
    }

    spawnKOBurst(winner);
    audio.ko();
    combatFeel10T = 1.15;
    if (ultimateCineFinisher && ultimateCineAttacker) {
      showCallout('FINISHER', finisherDisplayName(ultimateCineAttacker));
      roundFreeze = Math.max(roundFreeze, .75);
    } else {
      showCallout(winner === 'player' ? 'K.O.' : 'DOWN', winner === 'player' ? player.name + ' wins the round' : enemy.name + ' wins the round');
    }
    updateHUD(true);
    trackEvent('round_end', { winner, playerRounds, enemyRounds, roundIndex });

    if (roundEndTimer) clearTimeout(roundEndTimer);
    roundEndTimer = window.setTimeout(() => {
      roundEndTimer = 0;
      if (matchFinalized) return;

      if (playerRounds >= ROUND_WINS || enemyRounds >= ROUND_WINS) {
        endMatch(playerRounds > enemyRounds);
        return;
      }

      roundIndex++;
      resetRoundPositions();
      gameState = 'fight';
      roundFreeze = 1.35;
      roundResolving = false;
      showCallout('ROUND ' + roundIndex, 'Fight continues');
      updateHUD(true);
    }, 1450);
  }

  function forceRoundEndCheck(reason=''){
    if (gameState !== 'fight' || roundResolving || matchFinalized || !player || !enemy) return;
    const pDead = Number(player.hp) <= 0;
    const eDead = Number(enemy.hp) <= 0;
    if (!pDead && !eDead) return;

    let winner = 'player';
    if (pDead && !eDead) winner = 'enemy';
    else if (pDead && eDead) winner = player.hp >= enemy.hp ? 'player' : 'enemy';
    if (ui.debug) {
      ui.debug.style.display = 'block';
      ui.debug.innerHTML = 'ARENA FLOW 16.0<br>ROUND END CHECK<br>' + reason + '<br>Raven HP ' + Math.round(player.hp) + ' · Warden HP ' + Math.round(enemy.hp);
    }
    finishRound(winner);
  }

  function endMatch(victory){
    if (matchFinalized) return;
    matchFinalized = true;
    roundResolving = false;
    if (roundEndTimer) { clearTimeout(roundEndTimer); roundEndTimer = 0; }
    setPaused(false, true);
    gameState = 'result';
    document.body.classList.remove('is-fighting','fight-entering');
    document.body.classList.add('result-entering');
    window.setTimeout(()=>document.body.classList.remove('result-entering'), 520);
    hideTelegramMainButton();
    const rewards = grantRewards(victory);
    trackEvent('fight_finish', { result:victory ? 'win' : 'loss', rewards, playerRounds, enemyRounds, duration:Math.max(0, Math.round(ROUND_TIME - roundTime)) });
    ui.result.style.display = 'flex';
    ui.resultTitle.textContent = victory ? (ultimateCineFinisher ? 'FINISHER VICTORY' : 'VICTORY') : (ultimateCineFinisher ? 'EXECUTED' : 'DEFEAT');
    ui.resultKicker.textContent = victory ? (ultimateCineFinisher ? 'RIFT EXECUTION COMPLETE' : 'ARENA CLAIMED') : (ultimateCineFinisher ? 'TITAN JUDGEMENT COMPLETE' : 'MATCH LOST');
    ui.resultText.textContent = victory
      ? `Матч завершён: ${rewards.label}. Профиль обновлён и готов к Telegram leaderboard.`
      : `AI забрал арену. Награда за участие: ${rewards.label}. Жми реванш и копи энергию для special.`;
    if (ui.resultRewards) {
      ui.resultRewards.innerHTML = `
        <span style="padding:8px 10px;border:1px solid rgba(217,183,106,.28);border-radius:999px;background:rgba(255,255,255,.055)">XP ${appProfile.xp}/${appProfile.level * 250}</span>
        <span style="padding:8px 10px;border:1px solid rgba(217,183,106,.28);border-radius:999px;background:rgba(255,255,255,.055)">Coins ${appProfile.coins}</span>
        <span style="padding:8px 10px;border:1px solid rgba(217,183,106,.28);border-radius:999px;background:rgba(255,255,255,.055)">Wins ${appProfile.wins}</span>
        <span style="padding:8px 10px;border:1px solid rgba(217,183,106,.28);border-radius:999px;background:rgba(255,255,255,.055)">Streak ${appProfile.streak}</span>
        <span style="padding:8px 10px;border:1px solid rgba(217,183,106,.28);border-radius:999px;background:rgba(255,255,255,.055)">Season pts sync</span>
      `;
    }
    sendBattleResult(victory, rewards);
  }

  function setPaused(paused, silent=false){
    if (paused) {
      if (gameState !== 'fight') return;
      pausedFromState = gameState;
      gameState = 'paused';
      hitStop = 0;
      input.left = input.right = input.jump = input.dodge = input.block = false;
      input.light = input.heavy = input.special = input.ultimate = false;
      input.pressed = Object.create(null);
      document.querySelectorAll('.control-btn.active').forEach(btn=>btn.classList.remove('active'));
      if (ui.pauseOverlay) {
        ui.pauseOverlay.classList.add('show');
        ui.pauseOverlay.setAttribute('aria-hidden','false');
      }
      if (!silent) { audio.ui(); showCallout('PAUSED', 'Combat suspended'); }
      return;
    }

    if (gameState === 'paused') gameState = pausedFromState || 'fight';
    if (ui.pauseOverlay) {
      ui.pauseOverlay.classList.remove('show');
      ui.pauseOverlay.setAttribute('aria-hidden','true');
    }
    if (!silent && gameState === 'fight') {
      roundFreeze = Math.max(roundFreeze, .18);
      showCallout('FIGHT', 'Round ' + roundIndex);
      audio.ui();
    }
  }

  function togglePause(){
    if (gameState === 'paused') setPaused(false);
    else if (gameState === 'fight') setPaused(true);
  }


  function lowPowerCombat18(){
    try {
      return (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) || w < 760 || ((navigator.deviceMemory || 8) <= 4);
    } catch (_) {
      return w < 760;
    }
  }

  function impactClass18(kind){
    if (kind === 'block') return 'impact-block18';
    if (kind === 'ultimate') return 'impact-ultimate18';
    if (kind === 'special') return 'impact-special18';
    if (kind === 'heavy') return 'impact-heavy18';
    return 'impact-light18';
  }

  function pulseImpactClass18(kind, color){
    const cls = impactClass18(kind);
    document.documentElement.style.setProperty('--impact18-color', color || '#ffd27a');
    document.body.classList.remove('impact-light18','impact-heavy18','impact-special18','impact-ultimate18','impact-block18');
    void document.body.offsetWidth;
    document.body.classList.add(cls);
    window.clearTimeout(impactBeat18Timer);
    impactBeat18Timer = window.setTimeout(()=>document.body.classList.remove(cls), kind === 'ultimate' ? 520 : 330);
  }

  function showImpactBeat18(word, meta, color){
    const beat = ui.impactBeat18 || document.getElementById('impactBeat18');
    if (!beat) return;
    if (ui.impactWord18) ui.impactWord18.textContent = word;
    if (ui.impactMeta18) ui.impactMeta18.textContent = meta;
    beat.style.setProperty('--impact18-color', color || '#ffd27a');
    beat.setAttribute('aria-hidden','false');
    beat.classList.remove('show');
    void beat.offsetWidth;
    beat.classList.add('show');
    window.setTimeout(()=>beat.setAttribute('aria-hidden','true'), 620);
  }

  function spawnCombatImpact18(attacker, defender, atk, blocked=false, dmg=0, counterHit=false){
    if (!attacker || !defender || !atk) return;
    const type = atk.name || 'light';
    const low = lowPowerCombat18();
    const facing = Math.sign(defender.x - attacker.x) || attacker.dir || 1;
    const color = blocked ? '#8edcff' : (type === 'ultimate' ? '#fff0b7' : attacker.colorB || '#ff3946');
    const cx = defender.x - facing * (blocked ? 22 : 42);
    const cy = defender.y - (defender.collisionH || defender.h || 190) * (type === 'ultimate' ? .72 : type === 'special' ? .66 : .60);
    const power = type === 'ultimate' ? 2.20 : type === 'special' ? 1.62 : type === 'heavy' ? 1.32 : .92;
    const kind = blocked ? 'block' : type;

    pulseImpactClass18(kind, color);
    combatImpact18T = Math.max(combatImpact18T, type === 'ultimate' ? .62 : type === 'special' ? .46 : type === 'heavy' ? .34 : .20);

    const impactFreeze = blocked ? .025 : type === 'ultimate' ? .075 : type === 'special' ? .052 : type === 'heavy' ? .036 : .014;
    hitStop = Math.max(hitStop, (atk.hitStop || .06) + impactFreeze);
    if (!blocked && (type === 'heavy' || type === 'special' || type === 'ultimate')) {
      slowMo = Math.min(slowMo, type === 'ultimate' ? .52 : type === 'special' ? .68 : .78);
      cameraZoom = Math.max(cameraZoom, type === 'ultimate' ? 1.20 : type === 'special' ? 1.11 : 1.065);
    }

    if (blocked) showImpactBeat18('BLOCK IMPACT', `${Math.round(atk.blockDamage || dmg || 0)} CHIP · ${Math.round(defender.stamina)} GUARD`, color);
    else if (counterHit) showImpactBeat18('COUNTER HIT', `${Math.round(dmg)} DMG · ${Math.round((atk.kb || 0)/10)} KB`, '#ffd27a');
    else if (type === 'ultimate') showImpactBeat18('ULTIMATE IMPACT', `${Math.round(dmg)} DMG · cinematic freeze`, color);
    else if (type === 'special') showImpactBeat18('SPECIAL IMPACT', `${Math.round(dmg)} DMG · energy strike`, color);
    else if (type === 'heavy') showImpactBeat18('HEAVY IMPACT', `${Math.round(dmg)} DMG · armor break`, color);

    // 18.0: layered readable impact particles. Counts are capped on mobile.
    const ringCount = low ? 1 : (type === 'ultimate' ? 4 : type === 'special' ? 3 : 2);
    for (let i=0;i<ringCount;i++) {
      particles.push({
        kind:'shockwave',
        x: cx + facing * i * 8,
        y: cy + i * 7,
        vx:0, vy:0,
        life:.24 + power*.10 + i*.04,
        max:.36 + power*.10 + i*.04,
        size:(42 + i*18) * power,
        color:i%2 ? color : '#fff3d1'
      });
    }

    const rays = low ? (blocked ? 8 : 12) : (blocked ? 14 : Math.round(18 + power * 16));
    for (let i=0;i<rays;i++){
      const spread = blocked ? .72 : 1.10;
      const a = (facing > 0 ? Math.PI : 0) + (Math.random()-.5)*spread;
      const speed = (250 + Math.random()*780) * power;
      particles.push({
        kind:'impactLine',
        x:cx + (Math.random()-.5)*26,
        y:cy + (Math.random()-.5)*42,
        vx:Math.cos(a)*speed,
        vy:Math.sin(a)*speed*.40 - Math.random()*120,
        life:.16 + Math.random()*.18,
        max:.34,
        size:(40 + Math.random()*95) * power,
        color:i%5===0 ? '#fff3d1' : color,
        angle:a
      });
    }

    const floorCount = low ? 4 : (type === 'ultimate' ? 18 : type === 'special' ? 12 : type === 'heavy' ? 9 : 5);
    for (let i=0;i<floorCount;i++){
      particles.push({
        kind:'dust',
        x:defender.x + (Math.random()-.5)*82,
        y:defender.y - 6 + Math.random()*14,
        vx:(Math.random()-.5)*150,
        vy:-20 - Math.random()*90,
        life:.42 + Math.random()*.24,
        max:.72,
        size:8 + Math.random()*18*power,
        color:blocked ? 'rgba(142,220,255,.35)' : 'rgba(217,183,106,.36)'
      });
    }

    const premiumText = blocked ? 'GUARD' : type === 'light' ? 'HIT' : type.toUpperCase();
    if (type !== 'light' || counterHit || blocked) {
      showCombatWord(counterHit ? 'COUNTER' : premiumText, cx, cy - 34, counterHit ? '#ffd27a' : color);
    }
  }

  function spawnHitSpark(x,y,color,type){
    const low = lowPowerCombat18();
    const count = low ? (type === 'ultimate' ? 26 : type === 'special' ? 22 : type === 'heavy' ? 16 : 10) : (type === 'ultimate' ? 56 : type === 'special' ? 42 : type === 'heavy' ? 30 : 18);
    for(let i=0;i<count;i++){
      const a = Math.random()*Math.PI*2;
      const s = (type === 'ultimate' ? 760 : type === 'special' ? 560 : type === 'heavy' ? 440 : 320) * (0.25 + Math.random());
      particles.push({
        x,y,
        vx: Math.cos(a)*s,
        vy: Math.sin(a)*s - 80,
        life: type === 'ultimate' ? .58 : type === 'special' ? .48 : .32,
        max: type === 'ultimate' ? .58 : type === 'special' ? .48 : .32,
        size: Math.random()*3.2+1.4,
        color,
        kind:'spark'
      });
    }
    for(let i=0;i<10;i++){
      particles.push({
        x:x+(Math.random()*50-25), y:y+40+(Math.random()*20-10),
        vx:(Math.random()-.5)*140, vy:-Math.random()*120,
        life:.55, max:.55, size:Math.random()*12+5, color:'rgba(190,170,140,.48)', kind:'dust'
      });
    }
  }


  function spawnSlashWave(attacker, defender, type){
    const color = type === 'ultimate' ? '#fff0b7' : attacker.colorB;
    const count = type === 'ultimate' ? 16 : type === 'special' ? 10 : type === 'heavy' ? 7 : 4;
    for(let i=0;i<count;i++){
      particles.push({
        x:lerp(attacker.x, defender.x, .5) + (Math.random()-.5)*50,
        y:defender.y - defender.h*(.42 + Math.random()*.26),
        vx:attacker.dir * (220 + Math.random()*280),
        vy:(Math.random()-.5)*120,
        life:type === 'ultimate' ? .42 : .26,
        max:type === 'ultimate' ? .42 : .26,
        size:type === 'ultimate' ? 44 + Math.random()*28 : 22 + Math.random()*24,
        color,
        kind:'slash'
      });
    }
  }

  function spawnAura(f,color){
    for(let i=0;i<24;i++){
      const a = Math.random()*Math.PI*2;
      particles.push({
        x:f.x + Math.cos(a)*45,
        y:f.y - f.h*.55 + Math.sin(a)*70,
        vx:Math.cos(a)*140,
        vy:Math.sin(a)*140,
        life:.42,max:.42,size:Math.random()*6+3,color,kind:'aura'
      });
    }
  }

  function floatingText(text,x,y,color){
    texts.push({text,x,y,vy:-58,life:.72,max:.72,color});
  }

  function pulseCombatUi(defender, blocked=false){
    try {
      const cls = defender && defender.id === 'player' ? 'hp-pulse-player' : 'hp-pulse-enemy';
      document.body.classList.remove(cls);
      void document.body.offsetWidth;
      document.body.classList.add(cls);
      window.setTimeout(() => document.body.classList.remove(cls), blocked ? 170 : 310);
    } catch (_) {}
  }

  function floatingDamage(text,x,y,color,type='light'){
    const scale = type === 'ultimate' ? 1.55 : type === 'special' ? 1.32 : type === 'heavy' ? 1.20 : 1.04;
    texts.push({
      text,
      x:x + (Math.random()-.5)*26,
      y:y + (Math.random()-.5)*18,
      vy: type === 'ultimate' ? -92 : -72,
      life: type === 'ultimate' ? 1.05 : .88,
      max: type === 'ultimate' ? 1.05 : .88,
      color,
      scale
    });
  }

  function spawnPremiumImpact(attacker, defender, atk, blocked=false){
    const type = atk?.name || 'light';
    const facing = Math.sign(defender.x - attacker.x) || attacker.dir || 1;
    const color = blocked ? '#8edcff' : (type === 'ultimate' ? '#fff0b7' : attacker.colorB || '#ff3946');
    const cx = defender.x - facing * (blocked ? 18 : 36);
    const cy = defender.y - (defender.collisionH || defender.h || 190) * (type === 'ultimate' ? .70 : .60);
    const power = type === 'ultimate' ? 1.9 : type === 'special' ? 1.45 : type === 'heavy' ? 1.22 : .9;

    // cinematic radial burst
    particles.push({kind:'shockwave', x:cx, y:cy, vx:0, vy:0, life:.38*power, max:.38*power, size:54*power, color});
    particles.push({kind:'shockwave', x:cx, y:defender.y-18, vx:0, vy:0, life:.46*power, max:.46*power, size:82*power, color:'rgba(217,183,106,.85)'});

    const lines = blocked ? 10 : Math.round(12 + power*12);
    for(let i=0;i<lines;i++){
      const a = (-facing * 0.08) + (Math.random()-.5)*1.25 + (facing > 0 ? Math.PI : 0);
      const len = (36 + Math.random()*75) * power;
      const speed = (220 + Math.random()*560) * power;
      particles.push({
        kind:'impactLine',
        x:cx + (Math.random()-.5)*20,
        y:cy + (Math.random()-.5)*38,
        vx:Math.cos(a)*speed,
        vy:Math.sin(a)*speed*.42 - Math.random()*90,
        life:.22 + Math.random()*.16,
        max:.36,
        size:len,
        color,
        angle:a
      });
    }

    const chunks = blocked ? 8 : Math.round(8 + power*8);
    for(let i=0;i<chunks;i++){
      particles.push({
        kind:'ember',
        x:cx + (Math.random()-.5)*34,
        y:cy + (Math.random()-.5)*30,
        vx:(Math.random()-.5)*380*power,
        vy:-80-Math.random()*340*power,
        life:.42+Math.random()*.28,
        max:.72,
        size:2+Math.random()*5*power,
        color: i%3===0 ? '#fff3d1' : color
      });
    }

    if (!blocked && (type === 'heavy' || type === 'special' || type === 'ultimate')) {
      showCombatWord(type === 'ultimate' ? 'DEVASTATING' : type === 'special' ? 'RIFT STRIKE' : 'CRUSH', cx, cy - 72, color);
    }
  }

  function showCombatWord(word,x,y,color){
    texts.push({text:word,x,y,vy:-42,life:.72,max:.72,color,scale:1.28});
  }

  function spawnKOBurst(winner){
    const loser = winner === 'player' ? enemy : player;
    const color = winner === 'player' ? '#ff3946' : '#55c7ff';
    const x = loser ? loser.x : w*.5;
    const y = loser ? loser.y - (loser.collisionH || loser.h || 180)*.58 : h*.52;
    particles.push({kind:'shockwave', x, y, vx:0, vy:0, life:.92, max:.92, size:150, color:'#fff0b7'});
    particles.push({kind:'shockwave', x, y:groundY-16, vx:0, vy:0, life:1.1, max:1.1, size:220, color});
    for(let i=0;i<54;i++){
      const a = Math.random()*Math.PI*2;
      const s = 180 + Math.random()*720;
      particles.push({kind:i%2?'impactLine':'ember', x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s*.55-120, life:.52+Math.random()*.48, max:1, size:10+Math.random()*54, color:i%3 ? color : '#fff3d1', angle:a});
    }
  }

  function stageBounds(){
    if (EXACT_BLACK_CITADEL_ARENA) {
      const b = getExactArenaCombatBounds();
      // Use the central floor zone. This keeps both fighters on the premium stage,
      // not on the decorative left wall.
      const inset = (b.right - b.left) * (window.matchMedia && window.matchMedia('(pointer:coarse)').matches ? .09 : .12);
      return { left:b.left + inset, right:b.right - inset, center:b.center };
    }
    return { left: w * .08, right: w * .92, center: w * .5 };
  }

  function clampToStage(f){
    const b = stageBounds();
    const pad = USE_PREMIUM_FIGHTER_ART ? Math.max(48, fighterBodyRadius(f)*.70) : f.w*.35;
    f.x = clamp(f.x, b.left + pad, b.right - pad);
  }

  function resolveFighterCollision(){
    if (!player || !enemy) return;
    const pb = bodyBox(player);
    const eb = bodyBox(enemy);
    const pCenter = pb.x + pb.w/2;
    const eCenter = eb.x + eb.w/2;
    const minDist = fighterSpacing(player, enemy);
    const dist = Math.max(1, Math.abs(eCenter - pCenter));

    if (dist < minDist) {
      const dir = pCenter < eCenter ? -1 : 1;
      const overlap = minDist - dist;
      const pMass = player.mass || 1;
      const eMass = enemy.mass || 1;
      const total = pMass + eMass;
      const pMove = overlap * (eMass / total) * .62;
      const eMove = overlap * (pMass / total) * .62;

      // Physics 11.0: separation is positional first, velocity second.
      // That keeps the fighters from vibrating or exploding apart on contact.
      player.x += dir * pMove;
      enemy.x -= dir * eMove;

      const impulse = Math.min(120, overlap * 5.2);
      player.vx += dir * impulse / Math.max(.9, pMass);
      enemy.vx -= dir * impulse / Math.max(.9, eMass);
      player.vx *= .82;
      enemy.vx *= .82;
      player.contactPressure = Math.min(1, (player.contactPressure || 0) + .10);
      enemy.contactPressure = Math.min(1, (enemy.contactPressure || 0) + .10);
      clampToStage(player);
      clampToStage(enemy);
    } else {
      player.contactPressure = Math.max(0, (player.contactPressure || 0) - .05);
      enemy.contactPressure = Math.max(0, (enemy.contactPressure || 0) - .05);
    }
  }

  function applyMovementInput(f, axis, dt){
    f.walkIntent = axis;
    if (!axis) return;
    const grounded = isGrounded(f);
    const accel = grounded ? f.stats.accel : f.stats.airAccel;
    const blockPenalty = f.state === 'block' ? .30 : 1;
    const attackPenalty = f.state === 'attack' ? .10 : 1;
    const landingPenalty = f.landingLag > 0 ? .35 : 1;
    if (Math.sign(f.vx) && Math.sign(f.vx) !== Math.sign(axis) && grounded) {
      f.vx *= Math.pow(f.stats.turnBrake || .52, dt * 60);
    }
    f.vx += axis * accel * blockPenalty * attackPenalty * landingPenalty * dt;
    const max = f.stats.speed * (grounded ? 1 : .78) * (f.state === 'block' ? .40 : 1);
    f.vx = clamp(f.vx, -max, max);
  }

  function updateFighter(f, opponent, dt){
    const wasGrounded = isGrounded(f);
    f.stateT += dt;
    f.invuln = Math.max(0, f.invuln - dt);
    f.dodgeCd = Math.max(0, (f.dodgeCd || 0) - dt);
    f.afterImage = Math.max(0, (f.afterImage || 0) - dt);
    f.groundLock = Math.max(0, (f.groundLock || 0) - dt);
    f.landingLag = Math.max(0, (f.landingLag || 0) - dt);
    f.whiffRecoverT = Math.max(0, (f.whiffRecoverT || 0) - dt);
    f.clashCd = Math.max(0, (f.clashCd || 0) - dt);
    f.punishableT = Math.max(0, (f.punishableT || 0) - dt);
    f.pressureT = Math.max(0, (f.pressureT || 0) - dt);
    f.guardBreakCd = Math.max(0, (f.guardBreakCd || 0) - dt);
    f.guardBrokenT = Math.max(0, (f.guardBrokenT || 0) - dt);
    f.blockStress19 = Math.max(0, (f.blockStress19 || 0) - dt * 18);
    f.comboSeqT = Math.max(0, (f.comboSeqT || 0) - dt);
    f.comboNameT = Math.max(0, (f.comboNameT || 0) - dt);
    if (f.comboSeqT <= 0) { f.comboSeq = []; f.currentComboName = ''; }
    if (f.comboNameT <= 0) f.currentComboName = '';
    if (f.ai) {
      f.ai.actionCd = Math.max(0, (f.ai.actionCd || 0) - dt);
      f.ai.guardCd = Math.max(0, (f.ai.guardCd || 0) - dt);
      f.ai.retreatT = Math.max(0, (f.ai.retreatT || 0) - dt);
      f.ai.punishT = Math.max(0, (f.ai.punishT || 0) - dt);
      f.ai.comboCd = Math.max(0, (f.ai.comboCd || 0) - dt);
      f.ai.mindT = Math.max(0, (f.ai.mindT || 0) - dt);
      f.ai.baitT = Math.max(0, (f.ai.baitT || 0) - dt);
      f.ai.burstT = Math.max(0, (f.ai.burstT || 0) - dt);
      f.ai.pressureReadT = Math.max(0, (f.ai.pressureReadT || 0) - dt);
    }
    f.coyoteT = isGrounded(f) ? .095 : Math.max(0, (f.coyoteT || 0) - dt);
    f.jumpBufferT = Math.max(0, (f.jumpBufferT || 0) - dt);
    f.bufferedAttackT = Math.max(0, (f.bufferedAttackT || 0) - dt);
    f.comboT = Math.max(0, (f.comboT || 0) - dt);
    if (f.comboT <= 0) f.comboStep = 0;

    const staminaRegen = f.state === 'block' ? 7 : 24;
    f.stamina = clamp(f.stamina + dt*staminaRegen, 0, 100);
    f.energy = clamp(f.energy + dt*(f.id === 'player' ? 2.8 : 2.3), 0, 100);

    if (f.state === 'attack' && f.attack) {
      // Active hit check.
      const ab = attackBox(f);
      if (ab && !f.attackHasHit && rectsOverlap(ab, hurtBox(opponent))) {
        f.attackHasHit = true;
        applyHit(f, opponent, f.attack);
      }
      // Attack has real forward commit during startup/active, then brakes on recovery.
      const activeEnd = f.attack.startup + f.attack.active;
      if (f.stateT < activeEnd) {
        const root = (f.attack.lunge || 0);
        const dir = attackDirection(f);
        f.vx += dir * root * dt * 2.25;
        if (USE_PREMIUM_FIGHTER_ART) f.x += dir * root * dt * .24;
      } else {
        f.vx *= Math.pow((f.attack.whiffed ? (f.attack.whiffBrake || .52) : .76), dt*60);
      }
      if (f.stateT >= f.attack.total) {
        if (!f.attackHasHit) {
          f.whiffRecoverT = Math.max(f.whiffRecoverT || 0, f.attack.name === 'heavy' ? .18 : f.attack.name === 'special' ? .24 : .10);
          f.punishableT = Math.max(f.punishableT || 0, f.attack.name === 'special' ? .38 : f.attack.name === 'heavy' ? .30 : .16);
          f.attack.whiffed = true;
          if (f.id === 'player') floatingText('WHIFF', f.x, f.y - (f.collisionH || f.h)*.78, '#8edcff');
        }
        setState(f, 'idle');
        consumeBufferedAttack(f);
      }
    }

    if (f.state === 'hitstun' && f.stateT > (f.hitstunTime || .28)) {
      setState(f, 'idle');
      consumeBufferedAttack(f);
    }
    if (f.state === 'knockdown' && f.stateT > (f.knockdownTime || .55) && isGrounded(f)) {
      setState(f, 'idle');
      f.invuln = .12;
      spawnFootDust(f, 7, 'rgba(210,170,120,.34)');
    }
    if (f.state === 'dodge' && f.stateT > .24) {
      setState(f, 'idle');
      consumeBufferedAttack(f);
    }
    if (f.state === 'block') {
      f.blockHoldT = (f.blockHoldT || 0) + dt;
      const holdDrain = 11 + Math.min(26, f.blockHoldT * 16) + ((f.pressureT || 0) > 0 ? 8 : 0);
      f.stamina = clamp(f.stamina - dt * holdDrain, 0, 100);
      if (f.stamina <= 0 && f.guardBreakCd <= 0) {
        triggerGuardBreak19(f, opponent);
      } else {
        if (f.id === 'enemy' && f.stateT > (.34 + (f.ai?.guardPatience || .18))) setState(f, 'idle');
        if (f.id === 'player' && !input.block) setState(f, 'idle');
      }
    } else {
      f.blockHoldT = 0;
    }

    if (f.state !== 'attack' && f.state !== 'hitstun' && f.state !== 'knockdown' && f.state !== 'dodge') {
      if (f.id === 'player') updatePlayerControl(f, dt);
      else updateAI(f, opponent, dt);
    }

    f.vy += GRAVITY * (f.stats.gravityScale || 1) * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    if (f.y > groundY) {
      f.y = groundY;
      if (!wasGrounded && Math.abs(f.vy) > 320) {
        spawnFootDust(f, 8, 'rgba(210,170,120,.34)');
        shake = Math.max(shake, 3.5);
        f.landingLag = Math.max(f.landingLag || 0, .075);
      }
      f.vy = 0;
    }

    const grounded = isGrounded(f);
    const baseFriction = grounded
      ? (f.state === 'block' ? .66 : f.state === 'attack' ? .84 : f.landingLag > 0 ? .68 : (f.stats.brake || .74))
      : .972;
    f.vx *= Math.pow(baseFriction, dt*60);
    if (Math.abs(f.vx) < 7) f.vx = 0;
    clampToStage(f);

    if (USE_PREMIUM_FIGHTER_ART && gameState === 'fight' && grounded && Math.abs(f.vx) > 135 && Math.random() < dt * 11) {
      spawnFootDust(f, 1, 'rgba(210,170,120,.28)');
    }

    if (f.state !== 'attack' && f.state !== 'hitstun' && f.state !== 'block' && f.state !== 'dodge' && f.state !== 'knockdown') {
      if (!grounded) setState(f, 'jump');
      else if (Math.abs(f.vx) > 42) setState(f, 'walk');
      else setState(f, 'idle');
    }
  }

  function updatePlayerControl(f, dt){
    if (input.dodge) {
      input.dodge = false;
      performDodge(f);
      return;
    }

    if (input.block && isGrounded(f)) {
      setState(f, 'block');
      f.vx *= Math.pow(.62, dt*60);
      return;
    }

    const axis = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    applyMovementInput(f, axis, dt);

    if (input.jump) f.jumpBufferT = .12;
    if (f.jumpBufferT > 0 && (isGrounded(f) || f.coyoteT > 0) && f.groundLock <= 0 && f.landingLag <= 0) {
      f.jumpBufferT = 0;
      f.coyoteT = 0;
      f.vy = -f.stats.jump;
      setState(f, 'jump');
      spawnFootDust(f, 5, 'rgba(210,170,120,.36)');
      audio.tone(320,.045,'triangle',.025,1.1);
    }
  }

  function updateAI(f, opponent, dt){
    const ai = f.ai || (f.ai = {});
    const profile = AI_PROFILES[ai.difficulty || aiDifficultyName()] || AI_PROFILES.normal;
    const dist = Math.abs(opponent.x - f.x);
    const preferred = USE_PREMIUM_FIGHTER_ART ? fighterPreferredDistance(f, opponent) + 96 : 168;
    const band = distanceBand(dist, preferred);
    const dirToOpponent = opponent.x > f.x ? 1 : -1;
    const lightReach = attackReachValue('light', f, opponent);
    const heavyReach = attackReachValue('heavy', f, opponent);
    const specialReach = attackReachValue('special', f, opponent);
    const ultimateReach = attackReachValue('ultimate', f, opponent);
    const playerThreat = opponent.state === 'attack' && dist < specialReach + 105;
    const whiffPunish = isOpponentWhiffPunishable(opponent) && dist < specialReach + 105;
    const opponentBacking = Math.sign(opponent.vx || 0) === Math.sign(opponent.x - f.x);
    const lowStamina = f.stamina < 26;
    const hpLead = (f.hp / Math.max(1, f.maxHp)) - (opponent.hp / Math.max(1, opponent.maxHp));
    const behind = hpLead < -.18;
    const ahead = hpLead > .20;

    ai.think = Math.max(0, (ai.think || 0) - dt);
    ai.ultCd = Math.max(0, (ai.ultCd || 0) - dt);
    f.ultimateCd = Math.max(0, (f.ultimateCd || 0) - dt);
    ai.band = band;
    f.dir = dirToOpponent;

    if (ai.retreatT > 0) {
      ai.intent = lowStamina ? 'stamina reset' : 'spacing reset';
      setAiMind19(f, 'RESET', ai.intent, .34);
      applyMovementInput(f, -f.dir, dt);
      if (dist > preferred * 1.18 || ai.retreatT <= .02) ai.retreatT = 0;
      return;
    }

    const canUlt = f.energy >= attacks.ultimate.cost && ai.ultCd <= 0 && f.ultimateCd <= 0 && dist < ultimateReach + 80 && f.state !== 'attack';
    const shouldUlt = canUlt && (opponent.hp <= opponent.maxHp * .32 || (behind && band !== 'far') || (band === 'mid' && opponent.state === 'attack') || Math.random() < profile.special * .05);
    if (shouldUlt) {
      ai.intent = 'ultimate confirm';
      ai.actionCd = 1.10;
      ai.ultCd = 8.2 + Math.random()*4.4;
      setAiMind19(f, 'ULTIMATE READ', opponent.hp <= opponent.maxHp * .32 ? 'FINISHER RANGE' : 'COUNTER SWING', .95);
      startAttack(f, 'ultimate');
      return;
    }

    // Defensive read: hard AI blocks less randomly and more when the player is actually dangerous.
    if (playerThreat && ai.guardCd <= 0 && f.state !== 'attack') {
      const atkName = opponent.attack?.name || 'light';
      const danger = atkName === 'ultimate' ? .38 : atkName === 'special' ? .26 : atkName === 'heavy' ? .18 : .06;
      const inActive = isAttackActive(opponent);
      const shouldDefend = Math.random() < clamp(profile.block + danger + (inActive ? .10 : 0) - profile.mistake*.33, .10, .88);
      if (shouldDefend) {
        ai.guardCd = profile.reaction + Math.random()*.14;
        ai.intent = inActive ? 'perfect guard' : 'read guard';
        ai.guardPatience = clamp(profile.guardPatience + Math.random()*.16, .34, .96);
        setAiMind19(f, ai.intent, atkName.toUpperCase(), .58);
        if ((atkName === 'heavy' || atkName === 'special' || atkName === 'ultimate') && Math.random() < .18 + profile.footsie*.23 && f.dodgeCd <= 0 && dist < heavyReach + 120) {
          performDodge(f);
          ai.retreatT = .18 + Math.random()*.20;
          return;
        }
        setState(f, 'block');
        f.vx *= .32;
        return;
      }
    }

    if (f.state === 'block') return;

    // Punish whiffs with reliable routes instead of random single hits.
    if (whiffPunish && ai.actionCd <= 0 && Math.random() < profile.punish) {
      ai.intent = 'whiff punish';
      ai.actionCd = .26 + Math.random()*.16;
      setAiMind19(f, 'WHIFF PUNISH', opponent.attack?.name || 'RECOVERY', .82);
      const plan = chooseAIComboPlan19(f, opponent, { ...profile, special: profile.special + .12, combo: profile.combo + .10 }, dist);
      if (startAIComboPlan19(f, opponent, plan, 'WHIFF PUNISH ROUTE')) return;
    }

    // Tactical footsies: keep the AI readable but not passive.
    let axis = 0;
    if (band === 'far') {
      ai.intent = 'advance';
      axis = f.dir;
    } else if (band === 'close') {
      ai.intent = lowStamina ? 'reset stamina' : 'micro space';
      axis = Math.random() < (.58 + profile.footsie*.20) ? -f.dir : 0;
      if (lowStamina && Math.random() < .020 + profile.reset*.010) ai.retreatT = .36 + Math.random()*.32;
    } else {
      ai.intent = 'footsies';
      const drift = Math.sin((performance.now()/1000) * (1.75 + profile.footsie) + ai.patience*6.28);
      if (Math.abs(drift) > .33) axis = drift > 0 ? f.dir : -f.dir;
      if (opponentBacking && Math.random() < profile.aggression*.020) axis = f.dir;
      if (ahead && Math.random() < profile.reset*.010) axis = -f.dir;
    }
    applyMovementInput(f, axis, dt);

    if (ai.think <= 0) {
      ai.think = profile.reaction + Math.random() * (.14 + profile.mistake*.16);
      ai.next = Math.random();
    }

    if (ai.actionCd > 0 || ai.think > profile.reaction*.30) return;

    const canLight = dist < lightReach;
    const canHeavy = dist < heavyReach;
    const canSpecial = f.energy >= attacks.special.cost && dist < specialReach;
    const pressure = clamp(profile.aggression + (behind ? .16 : ahead ? -.09 : 0) + (opponent.stamina < 36 ? .08 : 0), .18, .90);

    // Planned pressure strings.
    if ((band === 'mid' || band === 'close') && canLight && Math.random() < pressure * profile.plan) {
      const plan = chooseAIComboPlan19(f, opponent, profile, dist);
      ai.intent = 'combo plan';
      ai.actionCd = .30 + Math.random()*.18;
      if (startAIComboPlan19(f, opponent, plan, aiPlanName19(plan))) return;
    }

    // Guard-break pressure when player holds block too long.
    if (opponent.state === 'block' && opponent.stamina < 58 && canHeavy && Math.random() < profile.punish * .55) {
      ai.intent = 'guard break';
      ai.actionCd = .34 + Math.random()*.18;
      setAiMind19(f, 'GUARD BREAK PLAN', `${Math.round(opponent.stamina)} STAMINA`, .82);
      if (canSpecial && opponent.stamina < 34 && Math.random() < profile.special + .18) startAttack(f, 'special');
      else startAttack(f, 'heavy');
      return;
    }

    if (band === 'mid' && canLight && Math.random() < pressure * .40) {
      ai.intent = 'poke';
      ai.actionCd = .22 + Math.random()*.18;
      setAiMind19(f, 'POKE', 'MID RANGE CHECK', .42);
      startAttack(f, 'light');
      return;
    }

    if (band === 'close' && canHeavy && Math.random() < pressure * .36) {
      ai.intent = 'commit';
      ai.actionCd = .30 + Math.random()*.22;
      setAiMind19(f, 'COMMIT', Math.random() < .55 ? 'LIGHT STARTER' : 'HEAVY PUNISH', .48);
      startAttack(f, Math.random() < .55 ? 'light' : 'heavy');
      return;
    }

    if (canSpecial && Math.random() < profile.special * (band === 'mid' ? 1.15 : .80)) {
      ai.intent = 'special';
      ai.actionCd = .52 + Math.random()*.32;
      setAiMind19(f, 'SPECIAL', 'ENERGY SPEND', .58);
      startAttack(f, 'special');
      return;
    }

    if (Math.random() < .0014 + profile.footsie*.0012 && isGrounded(f) && dist > preferred * .90) {
      f.vy = -f.stats.jump*.70;
      spawnFootDust(f, 4, 'rgba(210,170,120,.26)');
    }
  }

  function resolveAttackClash(){
    if (!player || !enemy || player.clashCd > 0 || enemy.clashCd > 0) return;
    if (!isAttackActive(player) || !isAttackActive(enemy)) return;
    const pa = attackBox(player);
    const ea = attackBox(enemy);
    if (!pa || !ea || !rectsOverlap(pa, ea)) return;

    const pPrio = player.attack?.priority || 1;
    const ePrio = enemy.attack?.priority || 1;
    const midX = (player.x + enemy.x) * .5;
    const midY = Math.min(player.y, enemy.y) - Math.max(player.collisionH || player.h, enemy.collisionH || enemy.h) * .58;

    if (pPrio === ePrio) {
      player.attackHasHit = true;
      enemy.attackHasHit = true;
      player.clashCd = enemy.clashCd = .34;
      player.vx = -player.dir * 360;
      enemy.vx = -enemy.dir * 360;
      player.hitstunTime = enemy.hitstunTime = .12;
      setState(player, 'hitstun');
      setState(enemy, 'hitstun');
      hitStop = Math.max(hitStop, .12);
      shake = Math.max(shake, 12);
      flash = Math.max(flash, .18);
      spawnHitSpark(midX, midY, '#ffd27a', 'heavy');
      floatingText('CLASH', midX, midY - 40, '#ffd27a');
      audio.hit('block');
      return;
    }

    const winner = pPrio > ePrio ? player : enemy;
    const loser = winner === player ? enemy : player;
    loser.attackHasHit = true;
    loser.clashCd = .28;
    loser.hitstunTime = .18;
    loser.vx = -loser.dir * 310;
    setState(loser, 'hitstun');
    hitStop = Math.max(hitStop, .09);
    shake = Math.max(shake, 9);
    floatingText('PRIORITY', midX, midY - 40, '#fff3d1');
    spawnHitSpark(midX, midY, winner.colorB, winner.attack?.name || 'heavy');
  }

  function updateRound(dt){
    if (roundFreeze > 0) {
      roundFreeze -= dt;
      if (roundFreeze <= 0 && gameState === 'fight') showCallout('FIGHT', 'Round ' + roundIndex);
      return;
    }
    if (gameState !== 'fight') return;
    roundTime -= dt;
    if (roundTime <= 0) {
      roundTime = 0;
      const winner = player.hp >= enemy.hp ? 'player' : 'enemy';
      finishRound(winner);
    }
  }


  function updateComboTag(){
    if (!ui.comboTag) return;
    if (comboCount >= 2) {
      const activeName = (player && player.currentComboName) || (enemy && enemy.currentComboName) || 'HIT COMBO';
      const dmg = Math.max(0, Math.round(comboDamage || 0));
      ui.comboTag.innerHTML = `<b id="comboCount">${comboCount}</b> ${comboCount >= 3 ? 'HIT CHAIN' : 'HIT COMBO'}<small style="display:block;font-size:9px;letter-spacing:.16em;opacity:.78;margin-top:1px">${activeName} · ${dmg} DMG · BEST ${matchMaxCombo}</small>`;
      ui.comboCount = document.getElementById('comboCount');
      ui.comboTag.style.display = 'block';
      ui.comboTag.style.opacity = String(clamp(comboTimer, .15, 1));
    } else {
      ui.comboTag.style.display = 'none';
    }
  }

  function updateHUD(force=false){
    if (!player || !enemy || !ui.pHp || !ui.eHp) return;

    const pHp = Math.round(clamp(player.hp, 0, player.maxHp || 100));
    const eHp = Math.round(clamp(enemy.hp, 0, enemy.maxHp || 110));
    const pEnergy = Math.round(clamp(player.energy, 0, 100));
    const eEnergy = Math.round(clamp(enemy.energy, 0, 100));
    const timerValue = Math.ceil(Math.max(0, roundTime));
    const roundsValue = playerRounds + ' : ' + enemyRounds;

    if (force || lastHudSnapshot.pHp !== pHp) ui.pHp.style.width = pHp + '%';
    if (force || lastHudSnapshot.eHp !== eHp) ui.eHp.style.width = eHp + '%';
    if (force || lastHudSnapshot.pEnergy !== pEnergy) ui.pEnergy.style.width = pEnergy + '%';
    if (force || lastHudSnapshot.eEnergy !== eEnergy) ui.eEnergy.style.width = eEnergy + '%';
    if (force || lastHudSnapshot.timer !== timerValue) ui.timer.textContent = timerValue;
    if (force || lastHudSnapshot.rounds !== roundsValue) ui.rounds.textContent = roundsValue;

    // 9.3 Freeze Fix:
    // Old version created a new setTimeout every frame. After a few seconds the browser
    // could queue hundreds of delayed HP updates and the fight looked frozen.
    // Now the delayed damage bar is updated only when HP actually changes.
    const hpChanged = force || lastHudSnapshot.pHp !== pHp || lastHudSnapshot.eHp !== eHp;
    if (force) {
      player.hpDelay = pHp;
      enemy.hpDelay = eHp;
      if (ui.pDelay) ui.pDelay.style.width = pHp + '%';
      if (ui.eDelay) ui.eDelay.style.width = eHp + '%';
    } else if (hpChanged && !hudDelayTimer) {
      hudDelayTimer = window.setTimeout(()=>{
        hudDelayTimer = 0;
        if (ui.pDelay && player) ui.pDelay.style.width = Math.round(clamp(player.hp, 0, player.maxHp || 100)) + '%';
        if (ui.eDelay && enemy) ui.eDelay.style.width = Math.round(clamp(enemy.hp, 0, enemy.maxHp || 110)) + '%';
      }, 220);
    }

    lastHudSnapshot = { pHp, eHp, pEnergy, eEnergy, timer: timerValue, rounds: roundsValue };
  }

  function updateParticles(dt){
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];
      p.life-=dt;
      p.x+=p.vx*dt; p.y+=p.vy*dt;
      p.vx*=Math.pow(.9,dt*60);
      p.vy+=350*dt;
      if(p.life<=0) particles.splice(i,1);
    }
    for(let i=texts.length-1;i>=0;i--){
      const t=texts[i];
      t.life-=dt;
      t.y+=t.vy*dt;
      if(t.life<=0) texts.splice(i,1);
    }
  }

  function update(dt){
    if (!Number.isFinite(dt) || dt <= 0) dt = .016;
    dt = Math.min(.033, dt);

    if (gameState === 'menu' || gameState === 'result') return;
    if (gameState === 'paused') {
      syncUltimateButton();
      updateHUD();
      return;
    }

    // 9.3 Freeze Fix: never let hitStop/slowMo/camera values become NaN or permanent.
    if (!Number.isFinite(hitStop)) hitStop = 0;
    if (!Number.isFinite(slowMo) || slowMo <= 0) slowMo = 1;
    if (!Number.isFinite(cameraZoom) || cameraZoom <= 0) cameraZoom = 1;
    if (!Number.isFinite(roundFreeze)) roundFreeze = 0;

    if (hitStop > 0) {
      hitStop = Math.max(0, hitStop - dt);
      updateParticles(dt*.45);
      updateHUD();
      return;
    }

    comboTimer = Math.max(0, comboTimer - dt);
    if (comboTimer <= 0 && comboCount > 0) {
      comboCount = 0;
      comboDamage = 0;
      updateComboTag();
    }
    cinematic = Math.max(0, cinematic - dt);
    combatFeel10T = Math.max(0, combatFeel10T - dt);
    combatImpact18T = Math.max(0, combatImpact18T - dt);
    combatAi19T = Math.max(0, combatAi19T - dt);
    comboTrainer19T = Math.max(0, comboTrainer19T - dt);
    updateUltimateCinematic(dt);
    cameraZoom = lerp(cameraZoom, 1, dt*2.6);

    const sdt = dt * slowMo;
    slowMo = lerp(slowMo, 1, dt*3.4);

    updateFacingLock(player, enemy);
    updateFacingLock(enemy, player);

    updateRound(sdt);
    if (gameState === 'fight') {
      updateFighter(player, enemy, sdt);
      updateFighter(enemy, player, sdt);
      resolveAttackClash();
      resolveFighterCollision();
      clampToStage(player);
      clampToStage(enemy);
      forceRoundEndCheck('post-update');
    } else if (gameState === 'roundEnd') {
      updateParticles(sdt);
      updateHUD();
      return;
    }
    updateParticles(sdt);

    physicsDebugT = Math.max(0, physicsDebugT - dt);
    physicsDebugLine();

    shake = Math.max(0, shake - dt*35);
    flash = Math.max(0, flash - dt*1.9);
    syncUltimateButton();
    updateHUD();
  }


  function drawArena(){
    const arena = contentArena();
    const arenaAccent = arena.accent || '#d9b76a';
    const time = performance.now();
    const t = time / 1000;
    const pulse = Math.sin(time / 900) * .5 + .5;
    const hexA = (c,a)=> (typeof c === 'string' && c[0] === '#' && c.length === 7) ? c + a : c;

    // Dark Cinematic Arena 5.1 — Black Citadel Courtyard.
    // This version uses a real painted arena asset as the base layer,
    // then adds live smoke, embers, lighting, shadows and subtle rune VFX.
    function drawCoverImage(img, dx, dy, dw, dh, focusX=.5, focusY=.5){
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return false;
      const scale = Math.max(dw / iw, dh / ih);
      const sw = dw / scale;
      const sh = dh / scale;
      const sx = clamp((iw - sw) * focusX, 0, Math.max(0, iw - sw));
      const sy = clamp((ih - sh) * focusY, 0, Math.max(0, ih - sh));
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      return true;
    }

    function drawExactStagePlate(img){
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) return false;

      // Dark blurred fill behind the real 16:9 plate. It removes ugly empty sides
      // on desktop without pretending to be playable arena space.
      ctx.save();
      ctx.globalAlpha = .34;
      ctx.filter = 'blur(14px) brightness(.48) saturate(.86)';
      drawCoverImage(img, -24, -24, w + 48, h + 48, .5, .5);
      ctx.filter = 'none';
      ctx.restore();

      const r = getExactArenaStageRect();

      // Letterbox/side framing so the uploaded art keeps its native cinematic ratio.
      ctx.save();
      ctx.fillStyle = '#020202';
      ctx.fillRect(0,0,w,h);

      // Soft background bleed outside the stage frame.
      ctx.globalAlpha = .26;
      ctx.filter = 'blur(18px) brightness(.38)';
      drawCoverImage(img, 0, 0, w, h, .5, .5);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;

      // Exact image, no procedural replacement, no grid, no fake map.
      ctx.drawImage(img, 0, 0, iw, ih, r.x, r.y, r.w, r.h);

      // Premium edge mask: hides any browser-aspect mismatch and focuses the arena.
      const leftFade = ctx.createLinearGradient(0,0,Math.max(1,r.x + r.w*.08),0);
      leftFade.addColorStop(0,'rgba(0,0,0,.82)');
      leftFade.addColorStop(.55,'rgba(0,0,0,.22)');
      leftFade.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = leftFade;
      ctx.fillRect(0,0,Math.max(1,r.x + r.w*.08),h);

      const rightFade = ctx.createLinearGradient(w,0,Math.min(w-1,r.x + r.w*.92),0);
      rightFade.addColorStop(0,'rgba(0,0,0,.82)');
      rightFade.addColorStop(.55,'rgba(0,0,0,.22)');
      rightFade.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = rightFade;
      ctx.fillRect(Math.min(w-1,r.x + r.w*.92),0,w,h);

      const topFade = ctx.createLinearGradient(0,0,0,h*.22);
      topFade.addColorStop(0,'rgba(0,0,0,.42)');
      topFade.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = topFade;
      ctx.fillRect(0,0,w,h*.24);

      const bottomFade = ctx.createLinearGradient(0,h,0,h*.70);
      bottomFade.addColorStop(0,'rgba(0,0,0,.38)');
      bottomFade.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = bottomFade;
      ctx.fillRect(0,h*.70,w,h*.30);

      ctx.restore();
      return true;
    }

    function drawArena15VariantOverlay(kind, accent){
      const selected = kind || 'black-citadel';
      const selectedAccent = accent || '#d9b76a';
      ctx.save();

      // 15.0 color direction: one real stage plate, four premium lighting moods.
      let washA = 'rgba(217,183,106,.12)';
      let washB = 'rgba(255,80,40,.10)';
      let fog = 'rgba(210,190,150,.045)';
      let particle = selectedAccent;

      if (selected === 'infernal-bridge') {
        washA = 'rgba(255,58,22,.24)';
        washB = 'rgba(255,134,38,.15)';
        fog = 'rgba(255,85,38,.070)';
        particle = '#ff6a2b';
      } else if (selected === 'moon-ritual') {
        washA = 'rgba(83,176,255,.22)';
        washB = 'rgba(126,84,255,.13)';
        fog = 'rgba(128,194,255,.060)';
        particle = '#86d8ff';
      } else if (selected === 'frozen-throne') {
        washA = 'rgba(173,238,255,.24)';
        washB = 'rgba(190,218,255,.15)';
        fog = 'rgba(195,238,255,.070)';
        particle = '#d8fbff';
      }

      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(w*.50,h*.28,0,w*.50,h*.30,w*.48);
      glow.addColorStop(0, washA);
      glow.addColorStop(.42, washB);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0,0,w,h);

      const side = ctx.createLinearGradient(0,0,w,0);
      side.addColorStop(0, selected === 'moon-ritual' || selected === 'frozen-throne' ? 'rgba(45,120,255,.16)' : 'rgba(255,64,28,.14)');
      side.addColorStop(.46, 'rgba(0,0,0,0)');
      side.addColorStop(1, selected === 'frozen-throne' ? 'rgba(185,243,255,.14)' : 'rgba(217,183,106,.10)');
      ctx.fillStyle = side;
      ctx.fillRect(0,0,w,h);

      // Stage floor tone.
      const floor = ctx.createLinearGradient(0,h*.58,0,h);
      floor.addColorStop(0,'rgba(0,0,0,0)');
      floor.addColorStop(.42, fog);
      floor.addColorStop(1,'rgba(0,0,0,.30)');
      ctx.fillStyle = floor;
      ctx.fillRect(0,h*.52,w,h*.48);

      // Air particles per arena.
      for(let i=0;i<68;i++){
        const seed = i*97;
        const x = (seed + t*(selected === 'infernal-bridge' ? 34 : 18) + Math.sin(i)*40) % (w+120) - 60;
        const y = h - ((seed*1.37 + t*(selected === 'frozen-throne' ? 18 : 34)) % h);
        const size = selected === 'frozen-throne' ? (1.1 + (i%4)*.65) : (.75 + (i%5)*.44);
        ctx.globalAlpha = selected === 'moon-ritual' ? .10 : selected === 'frozen-throne' ? .15 : .18;
        ctx.fillStyle = selected === 'frozen-throne' ? 'rgba(225,250,255,.82)' : (i%3 ? particle : '#fff0b7');
        ctx.beginPath();
        ctx.arc(x,y,size,0,Math.PI*2);
        ctx.fill();
      }

      // Premium selected arena title etched into stage.
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = .78;
      ctx.font = '900 11px Inter, Arial';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '2px';
      ctx.fillStyle = 'rgba(255,240,190,.68)';
      ctx.fillText((arena.title || 'BLACK CITADEL').toUpperCase(), w*.5, Math.max(90, h*.145));
      ctx.restore();
    }

    const artReady = blackCitadelArenaArt && blackCitadelArenaArt.complete && blackCitadelArenaArt.naturalWidth > 0;
    if (artReady) {
      if (EXACT_BLACK_CITADEL_ARENA) {
        drawExactStagePlate(blackCitadelArenaArt);
        drawArena15VariantOverlay(arena.backgroundType || 'black-citadel', arenaAccent);
        return;
      }
      drawCoverImage(blackCitadelArenaArt, 0, 0, w, h);
      drawArena15VariantOverlay(arena.backgroundType || 'black-citadel', arenaAccent);
      return;
    } else {
      const sky = ctx.createLinearGradient(0,0,0,h);
      sky.addColorStop(0, '#030406');
      sky.addColorStop(.32, '#101018');
      sky.addColorStop(.68, '#080507');
      sky.addColorStop(1, '#000001');
      ctx.fillStyle = sky;
      ctx.fillRect(0,0,w,h);
    }

    // Cinematic color grading: blends the arena with HUD and fighters.
    ctx.save();
    const grade = ctx.createLinearGradient(0,0,w,h);
    grade.addColorStop(0, 'rgba(8,10,16,.20)');
    grade.addColorStop(.44, 'rgba(0,0,0,0)');
    grade.addColorStop(.74, 'rgba(60,8,5,.16)');
    grade.addColorStop(1, 'rgba(0,0,0,.34)');
    ctx.fillStyle = grade;
    ctx.fillRect(0,0,w,h);
    ctx.restore();

    // Subtle moon / fortress backlight.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const backLight = ctx.createRadialGradient(w*.54, h*.22, 0, w*.54, h*.25, w*.44);
    backLight.addColorStop(0, 'rgba(228,220,196,.105)');
    backLight.addColorStop(.26, 'rgba(255,104,52,.05)');
    backLight.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = backLight;
    ctx.fillRect(0,0,w,h);
    ctx.restore();

    // Low moving fog — keeps the stage alive without looking like a debug layer.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for(let i=0;i<7;i++){
      const x = ((t * (18 + i*4)) + i*w*.23) % (w + 320) - 160;
      const y = h*(.62 + (i%3)*.055) + Math.sin(t*.55+i)*8;
      const fog = ctx.createRadialGradient(x,y,0,x,y,w*(.22 + (i%3)*.035));
      fog.addColorStop(0, 'rgba(194,164,132,.070)');
      fog.addColorStop(.35, 'rgba(120,100,86,.035)');
      fog.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fog;
      ctx.beginPath();
      ctx.arc(x,y,w*(.22 + (i%3)*.035),0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    // Ground volume and center combat area. No bright grid, no debug look.
    const floorTop = h * .60;
    ctx.save();
    const floorShade = ctx.createLinearGradient(0,floorTop,0,h);
    floorShade.addColorStop(0,'rgba(0,0,0,.02)');
    floorShade.addColorStop(.44,'rgba(0,0,0,.22)');
    floorShade.addColorStop(1,'rgba(0,0,0,.68)');
    ctx.fillStyle = floorShade;
    ctx.beginPath();
    ctx.moveTo(-w*.06,h);
    ctx.lineTo(w*1.06,h);
    ctx.lineTo(w*.84,floorTop);
    ctx.lineTo(w*.16,floorTop);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Wet obsidian reflections: premium streaks instead of a technical floor grid.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for(let i=0;i<24;i++){
      const x = (i*79 + Math.sin(t*.45+i)*26) % w;
      const y = floorTop + (i%12)*h*.030 + Math.sin(t*.9+i)*3;
      const length = w*(.035 + (i%4)*.018);
      const grad = ctx.createLinearGradient(x-length,y,x+length,y);
      grad.addColorStop(0,'rgba(0,0,0,0)');
      grad.addColorStop(.5, i%3 ? 'rgba(255,104,48,.062)' : hexA(arenaAccent,'22'));
      grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1 + (i%3)*.65;
      ctx.beginPath();
      ctx.moveTo(x-length, y);
      ctx.lineTo(x+length, y + Math.sin(i)*1.8);
      ctx.stroke();
    }
    ctx.restore();

    // Central sigil, much softer than before. It should feel like magic on stone,
    // not a UI/debug ellipse.
    ctx.save();
    ctx.translate(w*.5, h*.748);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(arenaAccent,'42');
    ctx.shadowColor = hexA(arenaAccent,'55');
    ctx.shadowBlur = 18;
    ctx.lineWidth = Math.max(1, w*.0015);
    for(let r=0;r<3;r++){
      ctx.globalAlpha = .10 + r*.035 + pulse*.03;
      ctx.beginPath();
      ctx.ellipse(0,0,w*(.070+r*.038),h*(.021+r*.012),0,0,Math.PI*2);
      ctx.stroke();
    }
    ctx.globalAlpha = .18 + pulse*.06;
    for(let i=0;i<18;i++){
      const a = i*Math.PI*2/18 + t*.08;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*w*.092, Math.sin(a)*h*.029);
      ctx.lineTo(Math.cos(a)*w*.115, Math.sin(a)*h*.037);
      ctx.stroke();
    }
    ctx.restore();

    // Fighter stage shadows and center spotlight.
    ctx.save();
    const spot = ctx.createRadialGradient(w*.5,h*.58,10,w*.5,h*.61,w*.46);
    spot.addColorStop(0,'rgba(246,213,139,.105)');
    spot.addColorStop(.18,'rgba(255,104,52,.040)');
    spot.addColorStop(.60,'rgba(0,0,0,0)');
    spot.addColorStop(1,'rgba(0,0,0,.22)');
    ctx.fillStyle = spot;
    ctx.fillRect(0,0,w,h);
    ctx.restore();

    // Animated embers.
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    for(let i=0;i<95;i++){
      const seed = i*113;
      const x = (seed + t*(16+(i%7)*6)) % (w+100) - 50;
      const y = h - ((seed*1.63 + t*(20+(i%5)*7)) % h);
      const size = .65 + (i%5)*.42;
      ctx.globalAlpha = .045 + ((i%4)/4)*.16;
      ctx.fillStyle = i%4 ? 'rgba(255,96,43,.76)' : hexA(arenaAccent,'aa');
      ctx.beginPath();
      ctx.arc(x,y,size,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    // Premium vignette and letterbox depth.
    ctx.save();
    const v = ctx.createRadialGradient(w*.5,h*.56,w*.20,w*.5,h*.56,w*.84);
    v.addColorStop(0,'rgba(0,0,0,0)');
    v.addColorStop(.62,'rgba(0,0,0,.20)');
    v.addColorStop(1,'rgba(0,0,0,.78)');
    ctx.fillStyle = v;
    ctx.fillRect(0,0,w,h);

    const top = ctx.createLinearGradient(0,0,0,h*.18);
    top.addColorStop(0,'rgba(0,0,0,.58)');
    top.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0,0,w,h*.18);

    const bottom = ctx.createLinearGradient(0,h*.82,0,h);
    bottom.addColorStop(0,'rgba(0,0,0,0)');
    bottom.addColorStop(1,'rgba(0,0,0,.72)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0,h*.82,w,h*.18);
    ctx.restore();
  }



  
  function spriteBankKeyForFighter(f){
    const id = String(f?.contentId || f?.name || '').toLowerCase();
    return id.includes('warden') ? 'enemy' : 'player';
  }

  function fighterIsWarden(f){
    const id = String(f?.contentId || f?.name || '').toLowerCase();
    return id.includes('warden') || String(f?.name || '').toLowerCase().includes('iron');
  }

  function spriteAnimForFighter(f){
    const bank = spriteFighterSheets[spriteBankKeyForFighter(f)] || (f.id === 'player' ? spriteFighterSheets.player : spriteFighterSheets.enemy);
    if (!bank) return null;

    if (f.state === 'attack' && f.attack) {
      const n = f.attack.name || 'light';
      if (n === 'heavy' || n === 'special' || n === 'ultimate') return bank.heavy || bank.light || bank.idle;
      return bank.light || bank.idle;
    }
    if (f.state === 'block') return bank.block || bank.idle;
    if (f.state === 'hitstun' || f.state === 'knockdown') return bank.hit || bank.idle;
    if (f.state === 'walk' || Math.abs(f.vx || 0) > 48) return bank.walk || bank.idle;
    return bank.idle;
  }

  function spriteFrameIndex(f, anim){
    const frames = Math.max(1, anim.frames || 1);
    if (f.state === 'attack' && f.attack) {
      const total = Math.max(.001, f.attack.total || .35);
      const p = clamp(f.stateT / total, 0, .999);
      return Math.min(frames - 1, Math.floor(p * frames));
    }
    if (f.state === 'hitstun' || f.state === 'knockdown') {
      return Math.min(frames - 1, Math.floor(clamp(f.stateT / .28, 0, .999) * frames));
    }
    if (f.state === 'block') {
      return Math.min(frames - 1, Math.floor(((performance.now()/1000) * (anim.fps || 6)) % frames));
    }
    return Math.floor(((performance.now()/1000 + (f.id === 'enemy' ? .23 : 0)) * (anim.fps || 8)) % frames);
  }

  function drawSpriteSheetFighter(f){
    if (!USE_SPRITE_FIGHTERS) return false;
    const anim = spriteAnimForFighter(f);
    if (!anim || !anim.img || !anim.img.complete || !anim.img.naturalWidth || !anim.img.naturalHeight) return false;

    const img = anim.img;
    const frames = Math.max(1, anim.frames || 1);
    const frame = spriteFrameIndex(f, anim);
    const fw = img.naturalWidth / frames;
    const fh = img.naturalHeight;
    const isEnemy = f.id !== 'player';
    const isWardenVisual = fighterIsWarden(f);
    const visualAccent = f.colorB || (isWardenVisual ? '#3eb6ff' : '#c92832');
    const dir = f.dir || (isEnemy ? -1 : 1);
    const attacking = f.state === 'attack';
    const hurt = f.state === 'hitstun' || f.state === 'knockdown';
    const blocking = f.state === 'block';
    const moving = f.state === 'walk' || Math.abs(f.vx || 0) > 58;
    const atkName = f.attack?.name || '';
    const active = attacking && f.attack && f.stateT >= f.attack.startup && f.stateT <= f.attack.startup + f.attack.active;
    const attackP = attacking && f.attack ? clamp(f.stateT / Math.max(.001, f.attack.total), 0, 1) : 0;
    const attackPunch = attacking ? Math.sin(attackP * Math.PI) : 0;
    const coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;

    let spriteH = coarse ? clamp(h * .44, 310, 455) : clamp(h * (isWardenVisual ? .54 : .50), 390, isWardenVisual ? 560 : 520);
    spriteH *= anim.scale || 1;
    if (attacking) spriteH *= atkName === 'ultimate' ? 1.04 : 1.015;
    let spriteW = spriteH * (fw / Math.max(1, fh));

    // Large frames from generated sheets can contain extra horizontal padding.
    // Keep visible size stable so the fighters do not become giant pasted posters.
    const maxW = coarse ? w * .38 : w * (isWardenVisual ? .34 : .32);
    if (spriteW > maxW) {
      const k = maxW / spriteW;
      spriteW *= k;
      spriteH *= k;
    }

    const walkBob = moving ? Math.sin(performance.now()/80) * 4 : Math.sin(performance.now()/230) * 1.8;
    const hitRecoil = hurt ? -dir * (16 + Math.min(16, f.stateT * 55)) : 0;
    const blockBrace = blocking ? -dir * 8 : 0;
    const lungeVisual = attacking ? dir * attackPunch * (atkName === 'ultimate' ? 34 : atkName === 'special' ? 26 : atkName === 'heavy' ? 22 : 14) : 0;
    const x = f.x + lungeVisual + hitRecoil + blockBrace;
    const y = f.y + walkBob;
    const lean = clamp((f.vx || 0) / 900, -0.10, 0.10) + (hurt ? -dir * .09 : 0) + (attacking ? dir * .035 * attackPunch : 0);
    const squashX = moving ? 1 + Math.abs(Math.sin(performance.now()/85))*.018 : 1;
    const squashY = moving ? 1 - Math.abs(Math.sin(performance.now()/85))*.010 : 1;

    // Ground contact shadow.
    ctx.save();
    const shW = Math.max(82, spriteW * (isEnemy ? .42 : .38));
    const shadow = ctx.createRadialGradient(x, y + 6, 6, x, y + 6, shW);
    shadow.addColorStop(0,'rgba(0,0,0,.88)');
    shadow.addColorStop(.44,'rgba(0,0,0,.42)');
    shadow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(x, y + 8, shW, 20, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Attack and dodge afterimage.
    if (attacking || f.afterImage > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = attacking ? .14 + attackPunch*.12 : .12;
      ctx.translate(x - dir * 22, y);
      ctx.scale(dir * squashX, squashY);
      ctx.rotate(lean * .5);
      ctx.filter = isEnemy ? 'brightness(1.1) saturate(1.2) hue-rotate(10deg)' : 'brightness(1.1) saturate(1.25)';
      ctx.drawImage(img, frame * fw, 0, fw, fh, -spriteW*.5, -spriteH, spriteW, spriteH);
      ctx.restore();
    }

    // Sprite body.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * squashX, squashY);
    ctx.rotate(lean);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = visualAccent;
    ctx.shadowBlur = 24;
    if (hurt) ctx.filter = 'brightness(1.75) contrast(1.2) saturate(1.25)';
    else if (blocking) ctx.filter = 'brightness(1.35) contrast(1.15) saturate(1.22)';
    else ctx.filter = 'brightness(1.28) contrast(1.18) saturate(1.18)';
    ctx.drawImage(img, frame * fw, 0, fw, fh, -spriteW*.5, -spriteH, spriteW, spriteH);
    ctx.filter = 'none';
    ctx.shadowBlur = 0;

    if (blocking) {
      const shieldColor = isEnemy ? 'rgba(80,190,255,.95)' : 'rgba(255,65,80,.85)';
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = shieldColor;
      ctx.lineWidth = 5;
      ctx.shadowColor = shieldColor;
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.ellipse(spriteW*.20, -spriteH*.52, spriteW*.13, spriteH*.27, -.08, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();

    // Active hit frame: draw a clear slash/impact arc that follows attack frames.
    if (attacking) {
      const c = visualAccent;
      const reach = atkName === 'ultimate' ? spriteW*.62 : atkName === 'special' ? spriteW*.52 : atkName === 'heavy' ? spriteW*.47 : spriteW*.36;
      const baseX = x + dir * spriteW*.18;
      const baseY = y - spriteH*.55;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = active ? .95 : .48;
      ctx.strokeStyle = active ? '#fff5df' : c;
      ctx.shadowColor = active ? '#fff5df' : c;
      ctx.shadowBlur = active ? 30 : 18;
      ctx.lineWidth = atkName === 'ultimate' ? 18 : atkName === 'heavy' ? 13 : 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX - dir*20, baseY + attackPunch*20);
      ctx.quadraticCurveTo(baseX + dir*reach*.45, baseY - spriteH*.22, baseX + dir*reach, baseY + spriteH*.03);
      ctx.stroke();
      ctx.globalAlpha *= .32;
      ctx.lineWidth *= 2.2;
      ctx.beginPath();
      ctx.moveTo(baseX - dir*14, baseY + attackPunch*26);
      ctx.quadraticCurveTo(baseX + dir*reach*.52, baseY - spriteH*.32, baseX + dir*reach*1.12, baseY + spriteH*.01);
      ctx.stroke();
      ctx.restore();
    }

    // Nameplate.
    ctx.save();
    const plateW = clamp(spriteW*.45, 110, 170);
    const plateGrad = ctx.createLinearGradient(x-plateW*.5, y+14, x+plateW*.5, y+38);
    plateGrad.addColorStop(0,'rgba(0,0,0,.70)');
    plateGrad.addColorStop(.5, isWardenVisual ? 'rgba(42,160,255,.22)' : 'rgba(255,35,50,.20)');
    plateGrad.addColorStop(1,'rgba(0,0,0,.70)');
    ctx.fillStyle = plateGrad;
    ctx.strokeStyle = isWardenVisual ? 'rgba(125,220,255,.58)' : 'rgba(255,60,76,.50)';
    roundRect(ctx, x-plateW*.5, y+13, plateW, 25, 12, true, true);
    ctx.font = '950 13px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isWardenVisual ? '#c8f2ff' : '#ffd06e';
    ctx.shadowColor = 'rgba(0,0,0,.85)';
    ctx.shadowBlur = 7;
    ctx.fillText((f.name || (isEnemy ? 'IRON WARDEN' : 'RAVEN')).slice(0,16).toUpperCase(), x, y+26);
    ctx.restore();

    return true;
  }


  function drawPremiumFighterArt(f){
    if (drawSpriteSheetFighter(f)) return true;
    if (!USE_PREMIUM_FIGHTER_ART) return false;
    const img = fighterIsWarden(f) ? premiumFighterArt.enemy : premiumFighterArt.player;
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return false;

    const time = performance.now();
    const isEnemy = f.id !== 'player';
    const dir = f.dir || (isEnemy ? -1 : 1);
    const hurt = f.state === 'hitstun' || f.state === 'knockdown';
    const blocking = f.state === 'block';
    const attacking = f.state === 'attack';
    const dodging = f.state === 'dodge';
    const atkName = f.attack?.name || '';
    const active = attacking && f.attack && f.stateT >= f.attack.startup && f.stateT <= f.attack.startup + f.attack.active;
    const tAttack = attacking && f.attack ? clamp(f.stateT / Math.max(.001, f.attack.total),0,1) : 0;
    const coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
    const hexA = (c,a)=> (typeof c === 'string' && c[0] === '#' && c.length === 7) ? c + a : c;
    const coreB = hurt ? '#ff5161' : (f.colorB || (isEnemy ? '#3eb6ff' : '#c92832'));
    const accent = f.accent || (isEnemy ? '#d7dff0' : '#d9b76a');

    const walkCycle = Math.sin(time / 58);
    const bob = f.state === 'idle' ? Math.sin(time/230)*4.2 : f.state === 'walk' ? Math.abs(walkCycle)*13.0 : 0;
    const attackPunch = attacking ? Math.sin(tAttack * Math.PI) : 0;
    const attackLunge = dir * attackPunch * (atkName === 'ultimate' ? 44 : atkName === 'special' ? 34 : atkName === 'heavy' ? 28 : 18);
    const dodgeSlide = dodging ? -dir * 34 * Math.max(0, 1 - f.stateT/.26) : 0;
    const poseX = attackLunge + dodgeSlide + (f.state === 'walk' ? Math.sin(time/72) * 16 : 0);
    const poseY = attacking ? -attackPunch * 13 : 0;
    const lean = clamp((f.vx || 0) / 440, -0.24, 0.24) + (hurt ? -0.20 : 0) + (dodging ? -0.26 : 0) + (attacking ? dir*.095*attackPunch : 0);
    const strideSquashX = f.state === 'walk' ? 1 + Math.abs(walkCycle) * .035 : 1;
    const strideSquashY = f.state === 'walk' ? 1 - Math.abs(walkCycle) * .018 : 1;
    const attackSquashX = attacking ? 1 + attackPunch * .075 : 1;
    const attackSquashY = attacking ? 1 - attackPunch * .035 : 1;

    let spriteH = coarse ? clamp(h * .40, 245, 405) : clamp(h * .47, 350, 490);
    if (isEnemy) spriteH *= coarse ? 1.06 : 1.09;
    if (atkName === 'ultimate') spriteH *= 1.018;
    const spriteW = spriteH * aspect;

    // Keep both full-body fighters readable on narrow/mobile screens.
    const maxSpriteW = coarse ? w * .36 : w * .235;
    if (spriteW > maxSpriteW) {
      const k = maxSpriteW / spriteW;
      spriteH *= k;
    }
    const finalW = spriteH * aspect;
    const finalH = spriteH;

    const x = f.x + poseX;
    const y = f.y + bob + poseY + (isEnemy ? 3 : 6);
    const xOffset = isEnemy ? 8 : -6;

    // Heavy grounded contact shadow, drawn in world space.
    ctx.save();
    const shadowW = finalW * (isEnemy ? .64 : .58);
    const shadow = ctx.createRadialGradient(x, y + 7, 8, x, y + 7, shadowW);
    shadow.addColorStop(0,'rgba(0,0,0,.86)');
    shadow.addColorStop(.42,'rgba(0,0,0,.42)');
    shadow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(x, y + 9, shadowW, 24, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Premium colored back aura for readability on the dark arena.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = hurt ? .34 : (isEnemy ? .18 : .20);
    const aura = ctx.createRadialGradient(x, y - finalH*.58, 10, x, y - finalH*.58, finalW*.72);
    aura.addColorStop(0, hexA(coreB,'72'));
    aura.addColorStop(.48, hexA(accent,'20'));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(x, y - finalH*.56, finalW*.60, finalH*.45, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Attack trail behind/around the sprite.
    if (attacking) {
      const reach = atkName === 'ultimate' ? finalW*.62 : atkName === 'special' ? finalW*.50 : atkName === 'heavy' ? finalW*.42 : finalW*.34;
      const baseX = x + dir * finalW*.22;
      const baseY = y - finalH*.53;
      const sweep = Math.sin(tAttack * Math.PI);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (active ? 1 : .62) * (atkName === 'ultimate' ? .95 : atkName === 'special' ? .78 : atkName === 'heavy' ? .62 : .45);
      ctx.strokeStyle = active ? '#fff2d0' : hexA(coreB,'cc');
      ctx.shadowColor = active ? '#fff2d0' : hexA(coreB,'cc');
      ctx.shadowBlur = active ? 24 : 16;
      ctx.lineWidth = atkName === 'ultimate' ? 18 : atkName === 'heavy' ? 12 : 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX - dir*finalW*.10, baseY + sweep*18);
      ctx.quadraticCurveTo(baseX + dir*reach*.42, baseY - finalH*.18, baseX + dir*reach, baseY + finalH*.04);
      ctx.stroke();
      ctx.globalAlpha *= .36;
      ctx.lineWidth *= 2.2;
      ctx.beginPath();
      ctx.moveTo(baseX - dir*finalW*.05, baseY + sweep*24);
      ctx.quadraticCurveTo(baseX + dir*reach*.50, baseY - finalH*.25, baseX + dir*reach*1.10, baseY + finalH*.02);
      ctx.stroke();
      ctx.restore();
    }

    // Draw full body character art.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * strideSquashX * attackSquashX, strideSquashY * attackSquashY);
    ctx.rotate(lean);
    if (hurt) {
      ctx.filter = 'brightness(1.35) saturate(1.2)';
    }
    const drawX = -finalW*.5 + xOffset;
    const drawY = -finalH;
    ctx.drawImage(img, drawX, drawY, finalW, finalH);
    ctx.filter = 'none';

    // Soft hit flash directly on top of sprite.
    if (hurt) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = .22;
      ctx.fillStyle = '#fff3ec';
      ctx.beginPath();
      ctx.ellipse(xOffset, -finalH*.54, finalW*.42, finalH*.42, 0, 0, Math.PI*2);
      ctx.fill();
    }

    // Block shield around guard side.
    if (blocking) {
      const shieldColor = isEnemy ? 'rgba(85,200,255,.90)' : 'rgba(220,55,68,.82)';
      ctx.globalCompositeOperation='lighter';
      ctx.strokeStyle = shieldColor;
      ctx.fillStyle = shieldColor;
      ctx.lineWidth = 5;
      ctx.shadowColor = shieldColor;
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.ellipse(finalW*.28, -finalH*.55, finalW*.16, finalH*.24, -.10, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = .11;
      ctx.fill();
    }
    ctx.restore();

    // Energy nodes / visor pulse on top for gameplay readability.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .52 + Math.sin(time/190)*.12;
    ctx.fillStyle = hexA(coreB,'dd');
    ctx.shadowColor = hexA(coreB,'cc');
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(x + dir*finalW*.02, y - finalH*.76, finalW*.045, finalH*.014, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Premium nameplate in world space, not mirrored.
    ctx.save();
    ctx.globalAlpha = .92;
    const plateW = Math.max(118, Math.min(174, finalW*.46));
    const plateGrad = ctx.createLinearGradient(x-plateW*.5, y+16, x+plateW*.5, y+39);
    plateGrad.addColorStop(0,'rgba(0,0,0,.66)');
    plateGrad.addColorStop(.50, hexA(coreB,'33'));
    plateGrad.addColorStop(1,'rgba(0,0,0,.66)');
    ctx.fillStyle = plateGrad;
    ctx.strokeStyle = hexA(accent,'66');
    roundRect(ctx, x-plateW*.5, y+14, plateW, 25, 12, true, true);
    ctx.fillStyle = isEnemy ? '#bdeeff' : '#ffd06e';
    ctx.font = '950 13px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.85)';
    ctx.shadowBlur = 8;
    ctx.fillText((f.name || (isEnemy ? 'IRON WARDEN' : 'SHADOW RAVEN')).slice(0,16).toUpperCase(), x, y+27);
    ctx.restore();

    return true;
  }

  function drawFighter(f){
    if (drawPremiumFighterArt(f)) return;
    const time = performance.now();
    const bob = f.state === 'idle' ? Math.sin(time/235)*2.8 : f.state === 'walk' ? Math.sin(time/80)*1.6 : 0;
    const x=f.x, y=f.y + bob, dir=f.dir;
    const hurt = f.state === 'hitstun' || f.state === 'knockdown';
    const blocking = f.state === 'block';
    const attacking = f.state === 'attack';
    const dodging = f.state === 'dodge';
    const grounded = isGrounded(f);
    const coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    const visualScale = coarse ? (h < 650 ? 1.16 : 1.30) : clamp(w / 1080, 1.38, 1.78);
    const hexA = (c,a)=> (typeof c === 'string' && c[0] === '#' && c.length === 7) ? c + a : c;
    const coreA = hurt ? '#ff5161' : (f.colorA || '#11151d');
    const coreB = hurt ? '#ffd5d8' : (f.colorB || '#c92832');
    const accent = f.accent || '#d9b76a';
    const isEnemy = f.id !== 'player';
    const armorDark = isEnemy ? '#05070b' : '#06070a';
    const bodyH = f.h;
    const bodyW = f.w;
    const tAttack = attacking && f.attack ? clamp(f.stateT / Math.max(.001, f.attack.total),0,1) : 0;
    const active = attacking && f.attack && f.stateT >= f.attack.startup && f.stateT <= f.attack.startup + f.attack.active;
    const atkName = f.attack?.name || '';
    const speedLean = clamp(f.vx / 520, -0.10, 0.10);
    const walkSwing = f.state === 'walk' ? Math.sin(time/92) : 0;
    const hurtLean = hurt ? -0.13 : 0;
    const dodgeLean = dodging ? -0.22 : 0;

    ctx.save();
    ctx.translate(x,y);
    ctx.scale(dir * visualScale, visualScale);
    ctx.rotate(speedLean + hurtLean + dodgeLean);

    // VISUAL 4.1 — silhouette rim aura so armored characters read at gameplay distance.
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha = isEnemy ? .16 : .18;
    const silhouetteAura = ctx.createRadialGradient(0,-bodyH*.58,10,0,-bodyH*.58,bodyW*1.75);
    silhouetteAura.addColorStop(0,hexA(coreB,'55'));
    silhouetteAura.addColorStop(.45,hexA(accent,'22'));
    silhouetteAura.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = silhouetteAura;
    ctx.beginPath();
    ctx.ellipse(0,-bodyH*.58,bodyW*1.38,bodyH*.72,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Top-tier ground contact shadow.
    ctx.save();
    const shadow = ctx.createRadialGradient(0,12,4,0,12,bodyW*1.55);
    shadow.addColorStop(0,'rgba(0,0,0,.84)');
    shadow.addColorStop(.46,'rgba(0,0,0,.38)');
    shadow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(0,13,bodyW*1.22,22,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Energy aura / afterimage.
    if (dodging || f.afterImage > 0 || atkName === 'ultimate') {
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      for(let i=0;i<4;i++){
        ctx.globalAlpha = (dodging ? .12 : .09) * (4-i);
        ctx.fillStyle = i%2 ? hexA(coreB,'55') : hexA(accent,'55');
        ctx.beginPath();
        ctx.ellipse(-34 - i*20, -bodyH*.50, bodyW*(.43+i*.07), bodyH*(.45+i*.03), -.08, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Back cape / energy ribbons.
    ctx.save();
    ctx.globalAlpha = .82;
    const cape = ctx.createLinearGradient(-34,-bodyH*.82,-78,5);
    cape.addColorStop(0, hexA(coreB,'85'));
    cape.addColorStop(.36, 'rgba(9,9,14,.82)');
    cape.addColorStop(1, 'rgba(0,0,0,.12)');
    ctx.fillStyle = cape;
    ctx.beginPath();
    ctx.moveTo(-20,-bodyH*.82);
    ctx.bezierCurveTo(-78 + Math.sin(time/300)*5, -bodyH*.72, -64 + Math.sin(time/260)*7, -bodyH*.18, -38, 1);
    ctx.bezierCurveTo(-14,-bodyH*.22,-12,-bodyH*.60,-20,-bodyH*.82);
    ctx.closePath();
    ctx.fill();
    // split ribbon
    ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle = hexA(coreB,'78');
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-33,-bodyH*.72);
    ctx.quadraticCurveTo(-72 + Math.sin(time/280)*8, -bodyH*.43, -50, -4);
    ctx.stroke();
    ctx.restore();

    // Attack VFX behind weapon arm.
    if (attacking) {
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      const trailAlpha = atkName === 'ultimate' ? .92 : atkName === 'special' ? .72 : atkName === 'heavy' ? .58 : .38;
      ctx.globalAlpha = trailAlpha * (active ? 1 : .55);
      const reach = atkName === 'ultimate' ? 164 : atkName === 'special' ? 136 : atkName === 'heavy' ? 112 : 88;
      const trail = ctx.createLinearGradient(25,-bodyH*.64,reach,-bodyH*.86);
      trail.addColorStop(0,'rgba(255,255,255,.03)');
      trail.addColorStop(.22,hexA(accent,'55'));
      trail.addColorStop(.72,hexA(coreB,'b8'));
      trail.addColorStop(1,'rgba(255,255,255,.92)');
      ctx.strokeStyle = trail;
      ctx.lineCap='round';
      ctx.lineWidth = atkName === 'ultimate' ? 18 : atkName === 'heavy' ? 12 : 8;
      ctx.beginPath();
      const sweep = Math.sin(tAttack*Math.PI);
      ctx.moveTo(18,-bodyH*.55 + sweep*18);
      ctx.quadraticCurveTo(reach*.55,-bodyH*(.93 - sweep*.15),reach,-bodyH*(.68 - sweep*.06));
      ctx.stroke();
      if (atkName === 'ultimate' || atkName === 'special') {
        ctx.globalAlpha *= .50;
        ctx.lineWidth *= 1.9;
        ctx.beginPath();
        ctx.moveTo(12,-bodyH*.58 + sweep*22);
        ctx.quadraticCurveTo(reach*.48,-bodyH*(1.05 - sweep*.22),reach*1.08,-bodyH*(.62 - sweep*.06));
        ctx.stroke();
      }
      ctx.restore();
    }

    // Lower body legs.
    const legGrad = ctx.createLinearGradient(0,-bodyH*.44,0,0);
    legGrad.addColorStop(0,armorDark);
    legGrad.addColorStop(.55,'#111722');
    legGrad.addColorStop(1,'#030305');
    ctx.fillStyle = legGrad;
    ctx.strokeStyle='rgba(255,255,255,.08)';
    ctx.lineWidth=1;

    ctx.save();
    ctx.rotate(walkSwing*.05);
    roundRect(ctx,-26,-bodyH*.45,18,bodyH*.42,9,true,true);
    ctx.restore();
    ctx.save();
    ctx.rotate(-walkSwing*.05);
    roundRect(ctx,9,-bodyH*.45,18,bodyH*.42,9,true,true);
    ctx.restore();

    // Boots with metallic caps.
    ctx.fillStyle='#030305';
    roundRect(ctx,-33,-20,34,22,8,true,false);
    roundRect(ctx,3,-20,36,22,8,true,false);
    ctx.fillStyle=hexA(accent,'54');
    roundRect(ctx,-33,-18,22,4,2,true,false);
    roundRect(ctx,16,-18,22,4,2,true,false);

    // Torso armor base.
    const torso = ctx.createLinearGradient(0,-bodyH*.92,0,-bodyH*.38);
    torso.addColorStop(0, hexA(coreA,'ff'));
    torso.addColorStop(.40, '#121822');
    torso.addColorStop(1, '#040508');
    ctx.fillStyle = torso;
    ctx.strokeStyle = 'rgba(255,255,255,.11)';
    ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(-bodyW*.30,-bodyH*.79);
    ctx.quadraticCurveTo(-bodyW*.43,-bodyH*.60,-bodyW*.26,-bodyH*.38);
    ctx.lineTo(bodyW*.26,-bodyH*.38);
    ctx.quadraticCurveTo(bodyW*.43,-bodyH*.60,bodyW*.30,-bodyH*.79);
    ctx.quadraticCurveTo(0,-bodyH*.98,-bodyW*.30,-bodyH*.79);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Chest plated layers.
    ctx.save();
    ctx.shadowColor=hexA(coreB,'80');
    ctx.shadowBlur=18;
    ctx.fillStyle=hexA(coreB,'35');
    ctx.beginPath();
    ctx.moveTo(-bodyW*.22,-bodyH*.73);
    ctx.lineTo(0,-bodyH*.87);
    ctx.lineTo(bodyW*.22,-bodyH*.73);
    ctx.lineTo(bodyW*.14,-bodyH*.54);
    ctx.lineTo(0,-bodyH*.46);
    ctx.lineTo(-bodyW*.14,-bodyH*.54);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle=hexA(accent,'78');
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(0,-bodyH*.84);
    ctx.lineTo(0,-bodyH*.46);
    ctx.stroke();
    ctx.restore();

    // Shoulder armor.
    const shoulderGrad = ctx.createLinearGradient(-bodyW*.5,-bodyH*.82,bodyW*.5,-bodyH*.70);
    shoulderGrad.addColorStop(0,'#050609');
    shoulderGrad.addColorStop(.5,hexA(coreB,'94'));
    shoulderGrad.addColorStop(1,'#050609');
    ctx.fillStyle=shoulderGrad;
    ctx.strokeStyle=hexA(accent,'44');
    ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(-bodyW*.48,-bodyH*.77);
    ctx.quadraticCurveTo(-bodyW*.36,-bodyH*.93,-bodyW*.10,-bodyH*.78);
    ctx.quadraticCurveTo(-bodyW*.28,-bodyH*.68,-bodyW*.48,-bodyH*.77);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bodyW*.48,-bodyH*.77);
    ctx.quadraticCurveTo(bodyW*.36,-bodyH*.93,bodyW*.10,-bodyH*.78);
    ctx.quadraticCurveTo(bodyW*.28,-bodyH*.68,bodyW*.48,-bodyH*.77);
    ctx.fill(); ctx.stroke();

    // Arms / gauntlets.
    const armReach = attacking ? (active ? 38 : 18) : blocking ? 18 : 0;
    const armY = attacking ? -bodyH*.66 : blocking ? -bodyH*.64 : -bodyH*.61;
    ctx.strokeStyle='#06080d';
    ctx.lineWidth=14;
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(-bodyW*.30,-bodyH*.70);
    ctx.quadraticCurveTo(-bodyW*.55,-bodyH*.58,-bodyW*.30,-bodyH*.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bodyW*.30,-bodyH*.70);
    ctx.quadraticCurveTo(bodyW*.48 + armReach*.55,armY,bodyW*.35 + armReach, -bodyH*.50);
    ctx.stroke();

    ctx.fillStyle=hexA(coreB,'88');
    roundRect(ctx,-bodyW*.44,-bodyH*.55,18,32,7,true,false);
    roundRect(ctx,bodyW*.30 + armReach,-bodyH*.58,22,34,7,true,false);

    // Weapon blade / energy claw.
    if (attacking) {
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.strokeStyle = active ? '#fff6df' : hexA(accent,'aa');
      ctx.shadowColor = active ? '#fff6df' : hexA(coreB,'aa');
      ctx.shadowBlur = active ? 18 : 10;
      ctx.lineWidth = atkName === 'ultimate' ? 5 : 3;
      ctx.lineCap='round';
      const reach = atkName === 'ultimate' ? 128 : atkName === 'special' ? 108 : atkName === 'heavy' ? 90 : 70;
      ctx.beginPath();
      ctx.moveTo(bodyW*.43 + armReach, -bodyH*.55);
      ctx.lineTo(bodyW*.43 + armReach + reach, -bodyH*(.64 + Math.sin(tAttack*Math.PI)*.13));
      ctx.stroke();
      ctx.restore();
    }

    // Neck and head helmet.
    ctx.fillStyle='#07080b';
    roundRect(ctx,-11,-bodyH*.90,22,20,6,true,false);

    const headGrad = ctx.createLinearGradient(0,-bodyH*1.16,0,-bodyH*.90);
    headGrad.addColorStop(0,'#1b202b');
    headGrad.addColorStop(.45,hexA(coreA,'ff'));
    headGrad.addColorStop(1,'#050609');
    ctx.fillStyle=headGrad;
    ctx.strokeStyle=hexA(accent,'5a');
    ctx.lineWidth=1.4;
    ctx.beginPath();
    ctx.moveTo(-24,-bodyH*1.03);
    ctx.quadraticCurveTo(-20,-bodyH*1.17,0,-bodyH*1.22);
    ctx.quadraticCurveTo(24,-bodyH*1.17,24,-bodyH*1.03);
    ctx.quadraticCurveTo(18,-bodyH*.91,0,-bodyH*.89);
    ctx.quadraticCurveTo(-18,-bodyH*.91,-24,-bodyH*1.03);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Helmet horns / silhouette.
    ctx.fillStyle='#050609';
    ctx.beginPath();
    ctx.moveTo(-15,-bodyH*1.16);
    ctx.lineTo(-38,-bodyH*1.25);
    ctx.lineTo(-22,-bodyH*1.10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(15,-bodyH*1.16);
    ctx.lineTo(38,-bodyH*1.25);
    ctx.lineTo(22,-bodyH*1.10);
    ctx.closePath();
    ctx.fill();

    // Glowing visor.
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.shadowColor=hexA(coreB,'cc');
    ctx.shadowBlur=16;
    ctx.fillStyle = hurt ? '#fff' : hexA(coreB,'ee');
    roundRect(ctx,-17,-bodyH*1.055,34,6,4,true,false);
    ctx.globalAlpha=.25;
    roundRect(ctx,-26,-bodyH*1.065,52,10,6,true,false);
    ctx.restore();

    // Armor accent nodes.
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=hexA(accent,'cc');
    ctx.shadowColor=hexA(accent,'aa');
    ctx.shadowBlur=14;
    for(const p of [[0,-bodyH*.66],[-bodyW*.20,-bodyH*.58],[bodyW*.20,-bodyH*.58]]){
      ctx.beginPath();
      ctx.arc(p[0],p[1],3.4,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    // Block premium shield.
    if (blocking) {
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      const shieldColor = f.id === 'player' ? 'rgba(81,199,255,.92)' : 'rgba(223,189,115,.82)';
      ctx.strokeStyle = shieldColor;
      ctx.fillStyle = shieldColor;
      ctx.lineWidth=5;
      ctx.shadowColor=shieldColor;
      ctx.shadowBlur=22;
      ctx.beginPath();
      ctx.ellipse(42,-bodyH*.62,42,76,-.12,0,Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha=.12;
      ctx.fill();
      ctx.globalAlpha=.50;
      ctx.lineWidth=1.4;
      for(let i=0;i<3;i++){
        ctx.beginPath();
        ctx.ellipse(42,-bodyH*.62,24+i*9,44+i*11,-.12,0,Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Ultimate / special aura overlay in front.
    if (attacking && (atkName === 'special' || atkName === 'ultimate')) {
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = atkName === 'ultimate' ? .34 : .22;
      const aura = ctx.createRadialGradient(0,-bodyH*.68,8,0,-bodyH*.68, atkName === 'ultimate' ? 150 : 100);
      aura.addColorStop(0,hexA(coreB,'aa'));
      aura.addColorStop(.36,hexA(accent,'55'));
      aura.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=aura;
      ctx.beginPath();
      ctx.arc(0,-bodyH*.68,atkName === 'ultimate' ? 150 : 100,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // Premium nameplate.
    ctx.save();
    ctx.globalAlpha=.86;
    const plateGrad = ctx.createLinearGradient(-54,12,54,30);
    plateGrad.addColorStop(0,'rgba(0,0,0,.58)');
    plateGrad.addColorStop(.5,hexA(coreB,'2c'));
    plateGrad.addColorStop(1,'rgba(0,0,0,.58)');
    ctx.fillStyle=plateGrad;
    ctx.strokeStyle=hexA(accent,'50');
    roundRect(ctx,-55,15,110,19,10,true,true);
    ctx.fillStyle=accent;
    ctx.font='950 9px Inter, Arial';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.save();
    if (dir < 0) ctx.scale(-1,1);
    ctx.fillText((f.name || (isEnemy?'WARDEN':'RAVEN')).slice(0,14).toUpperCase(),0,25);
    ctx.restore();
    ctx.restore();

    ctx.restore();
  }


  function roundRect(ctx,x,y,w,h,r,fill,stroke){
    const rr = Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y);
    ctx.arcTo(x+w,y,x+w,y+h,rr);
    ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr);
    ctx.arcTo(x,y,x+w,y,rr);
    ctx.closePath();
    if(fill) ctx.fill();
    if(stroke) ctx.stroke();
  }

  function drawParticles(){
    for(const p of particles){
      const a = clamp(p.life/p.max,0,1);
      ctx.save();
      ctx.globalAlpha = a;
      if (p.kind === 'dust') {
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(2,p.size*2.2*a));
        g.addColorStop(0,p.color || 'rgba(255,255,255,.4)');
        g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(1,p.size*2.2*a),0,Math.PI*2); ctx.fill();
      } else if (p.kind === 'slash') {
        ctx.globalCompositeOperation='lighter';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(2, p.size * .16) * a;
        ctx.lineCap='round';
        ctx.shadowColor=p.color;
        ctx.shadowBlur=12*a;
        ctx.beginPath();
        ctx.moveTo(p.x - p.size*.85, p.y - p.size*.22);
        ctx.quadraticCurveTo(p.x, p.y - p.size*.70, p.x + p.size*.90, p.y + p.size*.10);
        ctx.stroke();
        ctx.globalAlpha *= .45;
        ctx.lineWidth *= 2.2;
        ctx.beginPath();
        ctx.moveTo(p.x - p.size*.65, p.y - p.size*.04);
        ctx.quadraticCurveTo(p.x, p.y - p.size*.45, p.x + p.size*.68, p.y + p.size*.20);
        ctx.stroke();
      } else if (p.kind === 'after') {
        ctx.globalCompositeOperation='lighter';
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*2*a);
        g.addColorStop(0,p.color);
        g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(p.x,p.y,p.size*1.0*a,p.size*2.1*a,0,0,Math.PI*2); ctx.fill();
      } else if (p.kind === 'impactLine') {
        ctx.globalCompositeOperation='lighter';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(2, 5*a);
        ctx.lineCap = 'round';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 20*a;
        const ang = p.angle || 0;
        const len = Math.max(10, p.size) * a;
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(ang)*len*.42, p.y - Math.sin(ang)*len*.42);
        ctx.lineTo(p.x + Math.cos(ang)*len*.58, p.y + Math.sin(ang)*len*.58);
        ctx.stroke();
      } else if (p.kind === 'shockwave') {
        ctx.globalCompositeOperation='lighter';
        const age = 1 - a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 5*a);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 18*a;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size*(.30+age*1.15), p.size*(.10+age*.42), 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.globalAlpha *= .25*a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size*(.24+age*.65), p.size*(.08+age*.25), 0, 0, Math.PI*2);
        ctx.fill();
      } else if (p.kind === 'ember') {
        ctx.globalCompositeOperation='lighter';
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12*a;
        ctx.beginPath();
        ctx.arc(p.x,p.y,Math.max(1,p.size*a),0,Math.PI*2);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation='lighter';
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(2,p.size*3));
        g.addColorStop(0,'#fff');
        g.addColorStop(.18,p.color);
        g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(2,p.size*2.2*a),0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    for(const t of texts){
      const a=clamp(t.life/t.max,0,1);
      ctx.save();
      ctx.globalAlpha=a;
      ctx.font='950 ' + Math.round(19 * (t.scale || 1)) + 'px Inter, Arial';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.shadowColor='rgba(0,0,0,.95)';
      ctx.shadowBlur=14;
      ctx.lineWidth=4;
      ctx.strokeStyle='rgba(0,0,0,.72)';
      ctx.strokeText(t.text,t.x,t.y);
      ctx.fillStyle=t.color;
      ctx.fillText(t.text,t.x,t.y);
      ctx.restore();
    }
  }

  function drawVignette(){
    const g = ctx.createRadialGradient(w*.5,h*.47,w*.05,w*.5,h*.47,w*.76);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(.58,'rgba(0,0,0,.18)');
    g.addColorStop(.86,'rgba(0,0,0,.54)');
    g.addColorStop(1,'rgba(0,0,0,.88)');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,w,h);

    // Subtle anamorphic side glow.
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const side = ctx.createLinearGradient(0,0,w,0);
    side.addColorStop(0,'rgba(213,49,61,.10)');
    side.addColorStop(.22,'rgba(0,0,0,0)');
    side.addColorStop(.78,'rgba(0,0,0,0)');
    side.addColorStop(1,'rgba(81,199,255,.10)');
    ctx.fillStyle=side;
    ctx.fillRect(0,0,w,h);
    ctx.restore();

    if (combatFeel10T > 0) {
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = Math.min(.24, combatFeel10T*.22);
      const k = ctx.createRadialGradient(w*.5,h*.52,w*.08,w*.5,h*.52,w*.70);
      k.addColorStop(0,'rgba(255,240,183,.22)');
      k.addColorStop(.42,'rgba(214,43,52,.13)');
      k.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = k;
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }


    if (combatImpact18T > 0) {
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = Math.min(.32, combatImpact18T*.42);
      const mood = arenaMood17();
      const g18 = ctx.createRadialGradient(w*.5,h*.54,w*.05,w*.5,h*.54,w*.78);
      g18.addColorStop(0,'rgba(255,244,206,.24)');
      g18.addColorStop(.34,mood.gradeA || 'rgba(217,183,106,.14)');
      g18.addColorStop(.72,'rgba(201,40,50,.10)');
      g18.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g18;
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }

    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = flash;
      ctx.fillStyle = '#fff3d1';
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  }

  
  function drawCombatAI19Overlay(){
    if (gameState !== 'fight' && gameState !== 'roundEnd') return;
    const showAi = combatAi19T > 0 || (enemy?.ai?.mindT || 0) > 0;
    const showTrainer = comboTrainer19T > 0;
    if (!showAi && !showTrainer) return;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    if (showAi) {
      const alpha = clamp(combatAi19T || enemy?.ai?.mindT || .2, .10, 1);
      const bw = clamp(w * .18, 190, 300);
      const bh = 58;
      const x = w - bw - Math.max(16, w*.018);
      const y = Math.max(92, h*.118);
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(x, y, x + bw, y + bh);
      g.addColorStop(0, 'rgba(0,0,0,.78)');
      g.addColorStop(.5, 'rgba(28,55,70,.54)');
      g.addColorStop(1, 'rgba(0,0,0,.64)');
      ctx.fillStyle = g;
      ctx.strokeStyle = 'rgba(142,220,255,.48)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, bw, bh, 14, true, true);
      ctx.font = '900 9px Inter, Arial';
      ctx.fillStyle = 'rgba(142,220,255,.88)';
      ctx.fillText('AI MIND · 19.0', x+14, y+10);
      ctx.font = '1000 17px Inter, Arial';
      ctx.fillStyle = '#f5fbff';
      ctx.shadowColor = 'rgba(74,190,255,.55)';
      ctx.shadowBlur = 14;
      ctx.fillText((combatAi19Word || enemy?.ai?.mind || 'TACTICAL READ').slice(0, 22), x+14, y+25);
      ctx.shadowBlur = 0;
      ctx.font = '850 9px Inter, Arial';
      ctx.fillStyle = 'rgba(245,250,255,.66)';
      ctx.fillText((combatAi19Meta || enemy?.ai?.intent || 'NEUTRAL').slice(0, 28), x+14, y+45);
    }

    if (showTrainer) {
      const alpha = clamp(comboTrainer19T, .10, 1);
      const bw = clamp(w * .21, 230, 360);
      const bh = 62;
      const x = Math.max(18, w*.018);
      const y = Math.max(152, h*.185);
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(x, y, x + bw, y + bh);
      g.addColorStop(0, 'rgba(0,0,0,.78)');
      g.addColorStop(.45, 'rgba(94,24,18,.58)');
      g.addColorStop(1, 'rgba(0,0,0,.62)');
      ctx.fillStyle = g;
      ctx.strokeStyle = 'rgba(217,183,106,.56)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, bw, bh, 14, true, true);
      ctx.font = '900 9px Inter, Arial';
      ctx.fillStyle = 'rgba(217,183,106,.92)';
      ctx.fillText('COMBO TRAINER · 19.0', x+14, y+10);
      ctx.font = '1000 17px Inter, Arial';
      ctx.fillStyle = '#fff3d1';
      ctx.shadowColor = 'rgba(255,90,60,.58)';
      ctx.shadowBlur = 14;
      ctx.fillText((comboTrainer19Word || 'CHAIN WINDOW').slice(0, 26), x+14, y+26);
      ctx.shadowBlur = 0;
      ctx.font = '850 9px Inter, Arial';
      ctx.fillStyle = 'rgba(245,240,230,.70)';
      ctx.fillText((comboTrainer19Meta || 'PRESS HEAVY OR SPECIAL').slice(0, 34), x+14, y+47);
    }
    ctx.restore();
  }


  function render(){
    // EXACT ARENA FRAMING FIX:
    // clear the full physical viewport before any camera translation.
    // Previously the combat camera shifted the whole canvas, so the left edge kept
    // stale red/transparent frame data and looked like a broken debug wall.
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#020203';
    ctx.fillRect(0,0,w,h);

    const sx = shake ? (Math.random()-.5)*shake : 0;
    const sy = shake ? (Math.random()-.5)*shake : 0;

    // The exact user-provided Black Citadel art must stay locked to the screen.
    // Camera movement is applied only to fighters and live combat VFX, not to the
    // background image. This keeps the citadel centered and removes the red left block.
    ctx.save();
    ctx.translate(sx,sy);
    // Exact art stays locked. Zoom/shake belongs to fighters and impact VFX,
    // otherwise the left architecture becomes a broken-looking moving panel.
    if (!EXACT_BLACK_CITADEL_ARENA && cameraZoom > 1.002) {
      ctx.translate(w*.5, h*.52);
      ctx.scale(cameraZoom, cameraZoom);
      ctx.translate(-w*.5, -h*.52);
    }
    drawArena();
    drawArenaMood17Layer('back');
    ctx.restore();

    let cameraShift = 0;
    if (!EXACT_BLACK_CITADEL_ARENA && player && enemy) {
      const actionMid = (player.x + enemy.x) * 0.5;
      const desiredShift = w * 0.5 - actionMid;
      const maxShift = w * ((window.matchMedia && window.matchMedia('(pointer:coarse)').matches) ? 0.10 : 0.14);
      cameraShift = clamp(desiredShift, -maxShift, maxShift);
    }

    ctx.save();
    ctx.translate(sx + cameraShift, sy);
    if (cameraZoom > 1.002) {
      ctx.translate(w*.5, h*.52);
      ctx.scale(cameraZoom, cameraZoom);
      ctx.translate(-w*.5, -h*.52);
    }
    const first = player.x < enemy.x ? player : enemy;
    const second = first === player ? enemy : player;
    drawFighter(first);
    drawFighter(second);
    drawParticles();
    drawArenaMood17Layer('front');
    ctx.restore();

    drawVignette();
    drawUltimateCinematic();
    drawCombatAI19Overlay();

    if (cinematic > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${0.22 + cinematic*.38})`;
      ctx.fillRect(0,0,w,h*.135);
      ctx.fillRect(0,h*.865,w,h*.135);
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = cinematic*.28;
      ctx.fillStyle='rgba(217,183,106,.22)';
      ctx.fillRect(0,h*.135-2,w,2);
      ctx.fillRect(0,h*.865,w,2);
      ctx.restore();
    }
  }

  function loop(t){
    const raw = Math.min(.033, (t - last) / 1000 || .016);
    last = t;
    try {
      update(raw);
      render();
    } catch (err) {
      loopCrashCount += 1;
      console.error('[EraLash Combat] recovered game loop error', err);
      hitStop = 0;
      slowMo = 1;
      cameraZoom = 1;
      roundFreeze = 0;
      if (ui && ui.debug) {
        ui.debug.style.display = 'block';
        ui.debug.innerHTML = 'COMBAT IMPACT 18.0<br>LOOP RECOVERED #' + loopCrashCount + '<br>' + String(err && err.message || err).slice(0, 90);
      }
    }
    raf = requestAnimationFrame(loop);
  }

  function key(e, down){
    const map = {
      KeyA:'left', ArrowLeft:'left',
      KeyD:'right', ArrowRight:'right',
      KeyW:'jump', ArrowUp:'jump',
      Space:'dodge', KeyQ:'dodge',
      KeyI:'block', ShiftLeft:'block',
      KeyJ:'light',
      KeyK:'heavy',
      KeyL:'special',
      KeyO:'ultimate',
      KeyP:'pause', Escape:'pause'
    };
    const k = map[e.code];
    if(!k) return;
    e.preventDefault();
    input[k] = down;
    if (down && !input.pressed[k]) {
      input.pressed[k] = true;
      if(k === 'pause') { togglePause(); return; }
      if(k === 'dodge') performDodge(player);
      if(k === 'light' || k === 'heavy' || k === 'special' || k === 'ultimate') startAttack(player, k);
    }
    if(!down) input.pressed[k]=false;
  }

  function bindControls(){
    document.querySelectorAll('.control-btn').forEach(btn=>{
      const name = btn.dataset.input;
      const down = (e)=>{
        e.preventDefault();
        audio.ensure();
        btn.classList.add('active');
        input[name] = true;
        if(name === 'dodge') performDodge(player);
        if(name === 'light' || name === 'heavy' || name === 'special' || name === 'ultimate') startAttack(player, name);
      };
      const up = (e)=>{
        e.preventDefault();
        btn.classList.remove('active');
        input[name] = false;
      };
      btn.addEventListener('pointerdown', down, {passive:false});
      btn.addEventListener('pointerup', up, {passive:false});
      btn.addEventListener('pointercancel', up, {passive:false});
      btn.addEventListener('pointerleave', up, {passive:false});
    });

    window.addEventListener('keydown', e=>key(e,true), {passive:false});
    window.addEventListener('keyup', e=>key(e,false), {passive:false});
    function resetLiveInput(){
      input.left = input.right = input.jump = input.dodge = input.block = false;
      input.light = input.heavy = input.special = input.ultimate = false;
      input.pressed = Object.create(null);
      document.querySelectorAll('.control-btn.active').forEach(btn=>btn.classList.remove('active'));
    }
    window.addEventListener('blur', resetLiveInput);
    document.addEventListener('visibilitychange', ()=>{ if (document.hidden) resetLiveInput(); });
    window.addEventListener('pointercancel', resetLiveInput);


    if (ui.pauseBtn) ui.pauseBtn.addEventListener('click',()=>togglePause());
    if (ui.resumeBtn) ui.resumeBtn.addEventListener('click',()=>setPaused(false));
    if (ui.pauseRestartBtn) ui.pauseRestartBtn.addEventListener('click',()=>{ trackEvent('fight_start',{source:'pause_restart'}); audio.ui(); newMatch(); });
    if (ui.pauseMenuBtn) ui.pauseMenuBtn.addEventListener('click',()=>{ audio.ui(); setPaused(false, true); ui.result.style.display='none'; document.body.classList.remove('is-fighting','fight-entering','menu-leaving'); document.body.classList.add('menu-returning'); ui.menu.removeAttribute('aria-hidden'); ui.menu.style.removeProperty('display'); gameState='menu'; hideTelegramMainButton(); window.setTimeout(()=>document.body.classList.remove('menu-returning'),460); });


    ui.startBtn.addEventListener('click',()=>{trackEvent('character_select_open',{source:'start_button_16'});audio.ui();audio.ensure();openCharacterSelect('start_button_16');});
    ui.restartBtn.addEventListener('click',()=>{trackEvent('fight_start',{source:'restart'});audio.ui();newMatch();});
    ui.menuBtn.addEventListener('click',()=>{audio.ui();setPaused(false,true);if(roundEndTimer){clearTimeout(roundEndTimer);roundEndTimer=0;}ui.result.style.display='none';document.body.classList.remove('is-fighting','menu-leaving');document.body.classList.add('menu-returning');ui.menu.removeAttribute('aria-hidden');ui.menu.style.removeProperty('display');gameState='menu';hideTelegramMainButton();window.setTimeout(()=>document.body.classList.remove('menu-returning'),460);});
    ui.muteBtn.addEventListener('click',()=>{
      muted = !muted;
      ui.muteBtn.textContent = 'Звук: ' + (muted ? 'OFF' : 'ON');
      audio.ui();
    });

    document.addEventListener('visibilitychange',()=>{
      if(document.hidden) {
        Object.keys(input).forEach(k=>{ if(typeof input[k]==='boolean') input[k]=false; });
      }
    });
  }


  function economyEls(){
    return {
      daily: document.getElementById('dailyBtn'),
      shop: document.getElementById('shopBtn'),
      contentBtn: document.getElementById('contentBtn'),
      promo: document.getElementById('promoBtn'),
      weekly: document.getElementById('weeklyBtn'),
      invite: document.getElementById('inviteBtn'),
      season: document.getElementById('seasonBtn'),
      launch: document.getElementById('launchBtn'),
      news: document.getElementById('newsBtn'),
      founder: document.getElementById('founderBtn'),
      feedback: document.getElementById('feedbackBtn'),
      analytics: document.getElementById('analyticsBtn'),
      liveops: document.getElementById('liveopsBtn'),
      missions: document.getElementById('missionsBtn'),
      achievements: document.getElementById('achievementsBtn'),
      boss: document.getElementById('bossBtn'),
      admin: document.getElementById('adminBtn'),
      qa: document.getElementById('qaBtn'),
      content: document.getElementById('economyContent')
    };
  }

  function economyHeaders(json = false){
    const headers = { 'X-Telegram-Init-Data': telegramContext.initData || '' };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  function ensureCinematicModal(){
    let modal = document.getElementById('dcv4Modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dcv4Modal';
      modal.className = 'dcv4-modal';
      modal.innerHTML = `
        <section class="dcv4-panel" role="dialog" aria-modal="true" aria-label="EraLash Combat panel">
          <div class="dcv4-panel-head">
            <b id="dcv4ModalTitle">EraLash Combat</b>
            <button class="dcv4-panel-close" type="button">Закрыть</button>
          </div>
          <div id="dcv4ModalBody" class="dcv4-panel-body"></div>
        </section>
      `;
      document.body.appendChild(modal);
      modal.addEventListener('click', (event) => {
        if (event.target === modal || event.target.classList.contains('dcv4-panel-close')) {
          closeCinematicModal();
        }
      });
    }
    return modal;
  }

  function closeCinematicModal(){
    const modal = document.getElementById('dcv4Modal');
    if (modal) modal.classList.remove('show');
  }

  function showCinematicModal(html, title = 'COMMAND PANEL'){
    const modal = ensureCinematicModal();
    const body = document.getElementById('dcv4ModalBody');
    const titleEl = document.getElementById('dcv4ModalTitle');
    if (titleEl) titleEl.textContent = title;
    if (body) body.innerHTML = html;
    modal.classList.add('show');
  }

  function setEconomyContent(html){
    const el = economyEls().content;
    if (el) el.innerHTML = html;
    if (document.body.classList.contains('real-art-v4') && gameState === 'menu') {
      showCinematicModal(html, 'ERALASH COMMAND');
    }
  }

  function escapeUi(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
    }[ch]));
  }

  
function sessionId(){
    try {
      let id = sessionStorage.getItem('eralash_session_id');
      if (!id) {
        id = 's_' + Date.now().toString(36) + '_' + Math.random().toString(16).slice(2);
        sessionStorage.setItem('eralash_session_id', id);
      }
      return id;
    } catch(_) {
      return 's_' + Date.now().toString(36);
    }
  }

  async function trackEvent(eventName, payload = {}){
    try {
      await fetch('/api/analytics', {
        method:'POST',
        headers:economyHeaders(true),
        body: JSON.stringify({
          event:eventName,
          source:'miniapp',
          sessionId:sessionId(),
          user: telegramContext.user || { id: appProfile?.telegramId || 'guest', first_name:'Guest' },
          payload:{
            ...payload,
            screen: gameState,
            profile:{ level:appProfile.level, wins:appProfile.wins, losses:appProfile.losses, coins:appProfile.coins }
          }
        })
      });
    } catch(_) {}
  }



  async function reportClientError(type, error, extra = {}){
    try {
      await fetch('/api/client-error', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          type:type || 'client',
          source:'miniapp-client',
          message:String(error?.message || error || 'unknown_error'),
          stack:String(error?.stack || ''),
          path:location.pathname + location.search,
          userId:telegramContext.user?.id || appProfile?.telegramId || 'guest',
          payload:extra
        })
      });
    } catch (_) {}
  }


  async function loadShop(){
    trackEvent('shop_open');
    setEconomyContent('<div class="pill">Загрузка магазина...</div>');
    try {
      const res = await fetch('/api/shop', { headers: economyHeaders(false) });
      const data = await res.json();
      const owned = new Set((data.inventory || []).map(x => x.id || x.item_id));
      const cards = (data.catalog || []).map(item => `
        <div class="shop-card">
          <div>
            <h4>${escapeUi(item.title)} · ${escapeUi(item.rarity)}</h4>
            <p>${escapeUi(item.description)}</p>
            <div class="price">${item.priceCoins} coins · ${item.priceStars} Stars</div>
          </div>
          <div class="shop-actions">
            ${owned.has(item.id) ? '<span class="pill">Owned</span>' : `
              <button class="mini-btn buy-coins" data-item="${escapeUi(item.id)}">Coins</button>
              <button class="mini-btn stars-buy secondary" data-item="${escapeUi(item.id)}">Stars</button>
            `}
          </div>
        </div>
      `).join('');
      setEconomyContent(cards || '<div class="pill">Магазин пуст</div>');
      document.querySelectorAll('.buy-coins').forEach(btn => btn.addEventListener('click', () => buyWithCoins(btn.dataset.item)));
      document.querySelectorAll('.stars-buy').forEach(btn => btn.addEventListener('click', () => buyWithStars(btn.dataset.item)));
    } catch (error) {
      setEconomyContent('<div class="pill">Магазин недоступен. Проверь Supabase env и redeploy.</div>');
    }
  }

  async function buyWithCoins(itemId){
    setEconomyContent('<div class="pill">Покупка...</div>');
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: economyHeaders(true),
        body: JSON.stringify({
          itemId,
          user: telegramContext.user || { id: 'guest', first_name: 'Guest' }
        })
      });
      const data = await res.json();
      if (data.profile) {
        appProfile = { ...appProfile, ...normalizeServerProfile(data.profile) };
        saveProfile();
        updateTelegramBadge();
      }
      setEconomyContent(data.ok
        ? `<div class="pill">✅ Куплено: ${escapeUi(data.item?.title || itemId)}</div>`
        : `<div class="pill">Недостаточно coins: нужно ${data.required || 0}, есть ${data.coins || 0}</div>`);
    } catch (error) {
      setEconomyContent('<div class="pill">Ошибка покупки</div>');
    }
  }

  async function buyWithStars(itemId){
    trackEvent('stars_click', { itemId });
    setEconomyContent('<div class="pill">Создаём Telegram Stars invoice...</div>');
    try {
      const res = await fetch('/api/stars-invoice', {
        method: 'POST',
        headers: economyHeaders(true),
        body: JSON.stringify({
          itemId,
          user: telegramContext.user || { id: 'guest', first_name: 'Guest' }
        })
      });
      const data = await res.json();
      if (!data.ok || !data.invoiceLink) {
        setEconomyContent('<div class="pill">Stars доступны только внутри Telegram Mini App</div>');
        return;
      }

      pendingStarsItemId = itemId;
      const onClose = (status) => {
        if (status === 'paid') {
          setEconomyContent('<div class="pill">✅ Stars payment complete. Обновляем inventory...</div>');
          setTimeout(loadShop, 1200);
        } else if (status === 'cancelled' || status === 'failed') {
          setEconomyContent('<div class="pill">Stars payment cancelled</div>');
        } else {
          setEconomyContent('<div class="pill">Invoice closed. Если оплата прошла, inventory обновится через несколько секунд.</div>');
          setTimeout(loadShop, 1500);
        }
      };

      if (window.Telegram?.WebApp?.openInvoice) {
        window.Telegram.WebApp.openInvoice(data.invoiceLink, onClose);
      } else {
        window.open(data.invoiceLink, '_blank');
        setEconomyContent('<div class="pill">Invoice открыт в новой вкладке. После оплаты вернись и обнови магазин.</div>');
      }
    } catch (error) {
      setEconomyContent('<div class="pill">Не удалось создать Stars invoice</div>');
    }
  }

  async function claimDaily(){
    trackEvent('daily_open');
    setEconomyContent('<div class="pill">Получаем daily reward...</div>');
    try {
      const res = await fetch('/api/daily-reward', {
        method: 'POST',
        headers: economyHeaders(true),
        body: JSON.stringify({
          user: telegramContext.user || { id: 'guest', first_name: 'Guest' }
        })
      });
      const data = await res.json();
      if (data.profile) {
        appProfile = { ...appProfile, ...normalizeServerProfile(data.profile) };
        saveProfile();
        updateTelegramBadge();
      }
      setEconomyContent(data.claimed
        ? `<div class="pill-list"><span class="pill">+${data.reward.xp} XP</span><span class="pill">+${data.reward.coins} coins</span><span class="pill">Streak ${data.streak || 1}</span></div>`
        : '<div class="pill">Daily reward уже получен сегодня</div>');
    } catch (error) {
      setEconomyContent('<div class="pill">Daily reward недоступен</div>');
    }
  }

  async function loadWeekly(){
    setEconomyContent('<div class="pill">Загрузка weekly leaderboard...</div>');
    try {
      const res = await fetch('/api/weekly-leaderboard?limit=10');
      const data = await res.json();
      const rows = (data.leaderboard || []).map((p, i) => `
        <div class="shop-card">
          <div><h4>#${i + 1} ${escapeUi(p.name || p.username || 'Fighter')}</h4><p>${p.wins}W · ${p.xpTotal || 0} XP · ${p.coins || 0} coins</p></div>
          <span class="pill">LVL ${p.level || 1}</span>
        </div>
      `).join('');
      setEconomyContent(rows || '<div class="pill">Пока нет weekly-боёв</div>');
    } catch (error) {
      setEconomyContent('<div class="pill">Weekly leaderboard недоступен</div>');
    }
  }

  async function loadReferral(){
    setEconomyContent('<div class="pill">Готовим invite-ссылку...</div>');
    try {
      const res = await fetch('/api/referral', { headers: economyHeaders(false) });
      const data = await res.json();
      const refs = (data.referrals || []).slice(0, 6).map(r => `
        <div class="shop-card">
          <div><h4>${escapeUi(r.name || 'Fighter')}</h4><p>LVL ${r.level || 1} · +${r.rewardXp || 0} XP · +${r.rewardCoins || 0} coins</p></div>
          <span class="pill">${r.rewarded ? 'Rewarded' : 'Pending'}</span>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="shop-card">
          <div>
            <h4>🤝 Invite & Earn</h4>
            <p>Пригласи друга: ты получишь +50 XP и +100 coins, друг получит +25 XP и +50 coins.</p>
            <input id="inviteLinkInput" readonly value="${escapeUi(data.inviteLink || '')}" style="width:100%;margin-top:8px;padding:10px 12px;border-radius:14px;border:1px solid rgba(217,183,106,.3);background:rgba(0,0,0,.35);color:#fff;outline:none" />
            <div class="price">Invited ${data.stats?.total || 0} · Rewarded ${data.stats?.rewarded || 0} · Earned ${data.stats?.coinsEarned || 0} coins</div>
          </div>
          <div class="shop-actions">
            <button id="copyInviteBtn" class="mini-btn">Copy</button>
            <button id="shareInviteBtn" class="mini-btn secondary">Share</button>
          </div>
        </div>
        ${refs || '<div class="pill">Пока нет приглашённых игроков</div>'}
      `);
      document.getElementById('copyInviteBtn')?.addEventListener('click', async () => {
        const value = document.getElementById('inviteLinkInput')?.value || '';
        try { await navigator.clipboard.writeText(value); } catch(_) {}
        setEconomyContent(`<div class="pill">✅ Invite-ссылка скопирована</div>`);
      });
      document.getElementById('shareInviteBtn')?.addEventListener('click', () => shareInvite(data.inviteLink));
    } catch (error) {
      setEconomyContent('<div class="pill">Referral API недоступен</div>');
    }
  }

  async function loadSeason(){
    trackEvent('season_open');
    setEconomyContent('<div class="pill">Загрузка сезонного турнира...</div>');
    try {
      const res = await fetch('/api/season?limit=10', { headers: economyHeaders(false) });
      const data = await res.json();
      const rows = (data.leaderboard || []).map(p => `
        <div class="shop-card">
          <div><h4>#${p.rank || '?'} ${escapeUi(p.name || p.username || 'Fighter')}</h4><p>${p.points || 0} pts · ${p.wins || 0}W/${p.losses || 0}L · ${p.matches || 0} matches</p></div>
          <span class="pill">LVL ${p.level || 1}</span>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="pill-list">
          <span class="pill">${escapeUi(data.season?.title || 'Current Season')}</span>
          <span class="pill">Win: 100+ pts</span>
          <span class="pill">Clean win bonus</span>
        </div>
        ${rows || '<div class="pill">Пока нет очков сезона. Сыграй бой, чтобы попасть в рейтинг.</div>'}
      `);
    } catch (error) {
      setEconomyContent('<div class="pill">Season API недоступен</div>');
    }
  }

  function openShareUrl(url, text){
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url || location.href)}&text=${encodeURIComponent(text || 'EraLash Combat')}`;
    try {
      if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(shareUrl);
      else window.open(shareUrl, '_blank');
    } catch(_) {
      window.open(shareUrl, '_blank');
    }
  }

  async function shareInvite(inviteLink){
    trackEvent('invite_click');
    const link = inviteLink || location.href;
    try {
      await fetch('/api/referral', {
        method:'POST',
        headers:economyHeaders(true),
        body: JSON.stringify({
          action:'share',
          shareType:'invite',
          user: telegramContext.user || { id:'guest', first_name:'Guest' },
          payload:{ link }
        })
      });
    } catch(_) {}
    openShareUrl(link, 'Заходи в EraLash Combat ⚔️ Получим бонусы за приглашение и ворвёмся в сезонный топ.');
  }

  async function shareVictory(){
    const text = `Я выиграл бой в EraLash Combat ⚔️ ${appProfile.wins}W/${appProfile.losses}L · LVL ${appProfile.level}. Заходи на арену!`;
    let link = location.origin || location.href;
    try {
      const res = await fetch('/api/referral', { headers: economyHeaders(false) });
      const data = await res.json();
      if (data.inviteLink) link = data.inviteLink;
      await fetch('/api/referral', {
        method:'POST',
        headers:economyHeaders(true),
        body: JSON.stringify({
          action:'share',
          shareType:'victory',
          user: telegramContext.user || { id:'guest', first_name:'Guest' },
          payload:{ wins:appProfile.wins, level:appProfile.level }
        })
      });
    } catch(_) {}
    openShareUrl(link, text);
  }

  async function registerReferralFromLaunch(){
    const tgStart = window.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
    const params = new URLSearchParams(location.search);
    const ref = tgStart || params.get('ref') || '';
    if (!ref || ref === '1') return;
    const key = `eralash_ref_registered_${ref}`;
    if (localStorage.getItem(key)) return;
    try {
      const res = await fetch('/api/referral', {
        method:'POST',
        headers:economyHeaders(true),
        body: JSON.stringify({
          ref,
          source:'miniapp-launch',
          user: telegramContext.user || { id:'guest', first_name:'Guest' }
        })
      });
      const data = await res.json();
      if (data.profile) {
        appProfile = { ...appProfile, ...normalizeServerProfile(data.profile) };
        saveProfile();
        updateTelegramBadge();
      }
      if (data.registered) {
        localStorage.setItem(key, '1');
        setTimeout(() => setEconomyContent('<div class="pill">🎁 Referral bonus activated: +25 XP / +50 coins</div>'), 600);
      }
    } catch(_) {}
  }



  async function loadLaunch(){
    setEconomyContent('<div class="pill">Загрузка launch campaign...</div>');
    try {
      const res = await fetch('/api/launch', { headers: economyHeaders(false) });
      const data = await res.json();
      const c = data.campaign || {};
      const founder = data.founder || {};
      const rewards = (data.seasonRewards || []).map(r => `
        <div class="shop-card">
          <div><h4>${escapeUi(r.rank)}</h4><p>${escapeUi(r.reward)}</p></div>
          <span class="pill">Season</span>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="shop-card">
          <div>
            <h4>🚀 ${escapeUi(c.title || 'Launch Event')}</h4>
            <p>${escapeUi(c.description || '')}</p>
            <div class="price">Осталось Founder gifts: ${founder.remaining ?? '—'} / ${c.maxClaims || 100}</div>
          </div>
          <div class="shop-actions">
            <button id="claimFounderInline" class="mini-btn">🎖️ Claim</button>
            <button id="shareLaunchInline" class="mini-btn secondary">📤 Share</button>
          </div>
        </div>
        <div class="pill-list">
          <span class="pill">+${c.reward?.xp || 50} XP</span>
          <span class="pill">+${c.reward?.coins || 100} coins</span>
          <span class="pill">${escapeUi(c.reward?.title || 'Founder Frame')}</span>
        </div>
        <h3 style="margin:12px 0 8px">Season rewards</h3>
        ${rewards}
      `);
      document.getElementById('claimFounderInline')?.addEventListener('click', claimFounderBonus);
      document.getElementById('shareLaunchInline')?.addEventListener('click', () => openShareUrl(c.botUrl || location.href, c.shareText || 'EraLash Combat launch'));
    } catch (error) {
      setEconomyContent('<div class="pill">Launch API недоступен</div>');
    }
  }

  async function loadNews(){
    setEconomyContent('<div class="pill">Загрузка новостей...</div>');
    try {
      const res = await fetch('/api/news?limit=8', { headers: economyHeaders(false) });
      const data = await res.json();
      const cards = (data.news || []).map(item => `
        <div class="shop-card">
          <div>
            <h4>📰 ${escapeUi(item.title || 'News')}</h4>
            <p>${escapeUi(item.body || '')}</p>
          </div>
          <span class="pill">${escapeUi(item.tag || 'news')}</span>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="pill-list">
          <span class="pill">Public Launch News</span>
          <span class="pill">${escapeUi(data.storage || 'storage')}</span>
        </div>
        ${cards || '<div class="pill">Новостей пока нет</div>'}
      `);
    } catch (error) {
      setEconomyContent('<div class="pill">News API недоступен</div>');
    }
  }

  async function claimFounderBonus(){
    setEconomyContent('<div class="pill">Забираем Founder reward...</div>');
    try {
      const res = await fetch('/api/founder-bonus', {
        method:'POST',
        headers:economyHeaders(true),
        body: JSON.stringify({ user: telegramContext.user || { id:'guest', first_name:'Guest' } })
      });
      const data = await res.json();
      if (data.profile) {
        appProfile = { ...appProfile, ...normalizeServerProfile(data.profile) };
        saveProfile();
        updateTelegramBadge();
      }
      if (data.claimed) {
        trackEvent('daily_claim', { streak:data.streak, xp:data.reward?.xp, coins:data.reward?.coins });
        setEconomyContent(`
          <div class="pill-list">
            <span class="pill">✅ Founder Gift claimed</span>
            <span class="pill">+${data.campaign?.reward?.xp || 50} XP</span>
            <span class="pill">+${data.campaign?.reward?.coins || 100} coins</span>
            <span class="pill">${escapeUi(data.campaign?.reward?.title || 'Founder Frame')}</span>
          </div>
        `);
      } else if (data.alreadyClaimed) {
        setEconomyContent('<div class="pill">🎖️ Founder reward уже получен на этом аккаунте.</div>');
      } else if (data.soldOut) {
        setEconomyContent('<div class="pill">Founder Drop закончился. Следи за новыми events.</div>');
      } else {
        setEconomyContent(`<div class="pill">Founder reward не выдан: ${escapeUi(data.error || 'unknown')}</div>`);
      }
    } catch (error) {
      setEconomyContent('<div class="pill">Founder API недоступен</div>');
    }
  }

  function promoForm(){
    setEconomyContent(`
      <div class="shop-card">
        <div>
          <h4>🎟️ Promo Code</h4>
          <p>Введи промокод, чтобы получить coins, XP или предмет.</p>
          <input id="promoInput" placeholder="WELCOME100" style="width:100%;margin-top:8px;padding:10px 12px;border-radius:14px;border:1px solid rgba(217,183,106,.3);background:rgba(0,0,0,.35);color:#fff;outline:none;text-transform:uppercase" />
        </div>
        <div class="shop-actions">
          <button id="promoRedeemBtn" class="mini-btn">Redeem</button>
        </div>
      </div>
    `);
    document.getElementById('promoRedeemBtn')?.addEventListener('click', redeemPromo);
  }

  async function redeemPromo(){
    trackEvent('promo_open');
    const code = document.getElementById('promoInput')?.value || '';
    if (!code.trim()) {
      setEconomyContent('<div class="pill">Введи промокод</div>');
      return;
    }
    setEconomyContent('<div class="pill">Проверяем promo code...</div>');
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: economyHeaders(true),
        body: JSON.stringify({
          code,
          user: telegramContext.user || { id: 'guest', first_name: 'Guest' }
        })
      });
      const data = await res.json();
      if (data.profile) {
        appProfile = { ...appProfile, ...normalizeServerProfile(data.profile) };
        saveProfile();
        updateTelegramBadge();
      }
      if (data.redeemed) {
        trackEvent('promo_used', { code });
        setEconomyContent(`
          <div class="pill-list">
            <span class="pill">✅ ${escapeUi(data.promo?.title || 'Promo активирован')}</span>
            <span class="pill">+${data.promo?.rewardXp || 0} XP</span>
            <span class="pill">+${data.promo?.rewardCoins || 0} coins</span>
            ${data.promo?.itemId ? `<span class="pill">Item: ${escapeUi(data.promo.itemId)}</span>` : ''}
          </div>
        `);
      } else {
        setEconomyContent(`<div class="pill">Promo не активирован: ${escapeUi(data.reason || data.error || 'unknown')}</div>`);
      }
    } catch (error) {
      setEconomyContent('<div class="pill">Promo API недоступен</div>');
    }
  }

  async function loadAdmin(){
    setEconomyContent('<div class="pill">Загрузка admin dashboard...</div>');
    try {
      const res = await fetch('/api/admin', { headers: economyHeaders(false) });
      const data = await res.json();
      if (!data.ok) {
        setEconomyContent(`
          <div class="shop-card">
            <div>
              <h4>⚙️ Admin Panel</h4>
              <p>${escapeUi(data.error || 'Нет доступа. Добавь ADMIN_TELEGRAM_IDS в Vercel и открывай игру из Telegram.')}</p>
            </div>
          </div>
        `);
        return;
      }
      const live = data.live || {};
      const stats = data.stats || {};
      const top = (data.leaderboard || []).slice(0, 5).map((p, i) =>
        `<div class="shop-card"><div><h4>#${i + 1} ${escapeUi(p.name || p.username || 'Fighter')}</h4><p>${p.wins}W/${p.losses}L · ${p.coins} coins · LVL ${p.level}</p></div><span class="pill">TOP</span></div>`
      ).join('');
      setEconomyContent(`
        <div class="pill-list">
          <span class="pill">Players: ${stats.players || 0}</span>
          <span class="pill">Battles 24h: ${live.battles24h || 0}</span>
          <span class="pill">Shop active: ${live.activeShopItems || 0}</span>
          <span class="pill">Purchases: ${live.purchasesTotal || 0}</span>
          <span class="pill">Anti-cheat: ${live.antiCheatFlags || 0}</span>
        </div>
        ${top || '<div class="pill">Нет игроков в рейтинге</div>'}
        <div class="shop-card">
          <div><h4>Admin API</h4><p>POST /api/admin: grant, ban, unban, resetProgress, upsertShopItem, createPromo, togglePromo. GET /api/anti-cheat.</p></div>
          <span class="pill">${escapeUi(data.storage || 'storage')}</span>
        </div>
      `);
    } catch (error) {
      setEconomyContent('<div class="pill">Admin API недоступен</div>');
    }
  }


  async function loadQa(){
    setEconomyContent('<div class="pill">Проверяем Release 1.0 status...</div>');
    try {
      const res = await fetch('/api/status', { headers: economyHeaders(false) });
      const data = await res.json();
      const checks = (data.checks || []).map(c => `
        <div class="shop-card">
          <div><h4>${c.ok ? '✅' : '❌'} ${escapeUi(c.label || c.key)}</h4><p>${escapeUi(c.details || '')}</p></div>
          <span class="pill">${c.ms ? c.ms + 'ms' : (c.ok ? 'OK' : 'FAIL')}</span>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="pill-list">
          <span class="pill">${data.ok ? '🚀 Ready for launch' : '⚠️ Needs attention'}</span>
          <span class="pill">Release ${escapeUi(data.release || '1.0')}</span>
          <span class="pill">${escapeUi(data.storage || 'storage')}</span>
        </div>
        ${checks || '<div class="pill">QA checks unavailable</div>'}
      `);
    } catch (error) {
      await reportClientError('client', error, { screen:'qa' });
      setEconomyContent('<div class="pill">QA API недоступен</div>');
    }
  }




  async function loadAnalytics(){
    setEconomyContent('<div class="pill">Загрузка live analytics...</div>');
    try {
      const res = await fetch('/api/analytics?hours=24&limit=250', { headers: economyHeaders(false) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'analytics error');
      const s = data.summary || {};
      const events = (data.topEvents || []).slice(0, 10).map(e => `
        <div class="shop-card">
          <div><h4>${escapeUi(e.event)}</h4><p>${e.count} events за выбранное окно</p></div>
          <span class="pill">event</span>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="pill-list">
          <span class="pill">Players: ${s.uniquePlayers || 0}</span>
          <span class="pill">Events: ${s.events || 0}</span>
          <span class="pill">Fights: ${s.fightsStarted || 0}/${s.fightsFinished || 0}</span>
          <span class="pill">Completion: ${s.fightCompletionRate || 0}%</span>
          <span class="pill">Shop: ${s.shopOpens || 0}</span>
          <span class="pill">Stars conv: ${s.starsConversionRate || 0}%</span>
          <span class="pill">Feedback: ${s.feedback || 0}</span>
        </div>
        <h3 style="margin:12px 0 8px">Top events</h3>
        ${events || '<div class="pill">Пока нет analytics events</div>'}
        <div class="shop-card">
          <div><h4>LiveOps note</h4><p>Analytics показывает, где игроки выходят: app_open → fight_start → fight_finish → shop_open → stars_success.</p></div>
          <span class="pill">${escapeUi(data.storage || 'storage')}</span>
        </div>
      `);
    } catch (error) {
      await reportClientError('client', error, { screen:'analytics' });
      setEconomyContent('<div class="pill">Analytics доступен только админу или API недоступен</div>');
    }
  }

  function feedbackForm(){
    trackEvent('feedback_open');
    setEconomyContent(`
      <div class="shop-card">
        <div>
          <h4>💬 Feedback</h4>
          <p>Напиши баг, идею, жалобу или отзыв. Это сохранится в Supabase и попадёт в админку.</p>
          <select id="feedbackType" style="width:100%;margin-top:8px;padding:10px 12px;border-radius:14px;border:1px solid rgba(217,183,106,.3);background:rgba(0,0,0,.35);color:#fff;outline:none">
            <option value="bug">Баг</option>
            <option value="idea">Идея</option>
            <option value="balance">Баланс</option>
            <option value="payment">Покупка / Stars</option>
            <option value="feedback">Отзыв</option>
          </select>
          <textarea id="feedbackMessage" placeholder="Опиши проблему или идею..." style="width:100%;min-height:110px;margin-top:8px;padding:10px 12px;border-radius:14px;border:1px solid rgba(217,183,106,.3);background:rgba(0,0,0,.35);color:#fff;outline:none;resize:vertical"></textarea>
          <input id="feedbackContact" placeholder="@username или контакт, опционально" style="width:100%;margin-top:8px;padding:10px 12px;border-radius:14px;border:1px solid rgba(217,183,106,.3);background:rgba(0,0,0,.35);color:#fff;outline:none" />
        </div>
        <div class="shop-actions">
          <button id="feedbackSendBtn" class="mini-btn">Send</button>
        </div>
      </div>
    `);
    document.getElementById('feedbackSendBtn')?.addEventListener('click', sendFeedback);
  }

  async function sendFeedback(){
    const type = document.getElementById('feedbackType')?.value || 'feedback';
    const message = document.getElementById('feedbackMessage')?.value || '';
    const contact = document.getElementById('feedbackContact')?.value || telegramContext.user?.username || '';
    if (!message.trim()) {
      setEconomyContent('<div class="pill">Напиши сообщение перед отправкой</div>');
      return;
    }
    setEconomyContent('<div class="pill">Отправляем feedback...</div>');
    try {
      const res = await fetch('/api/feedback', {
        method:'POST',
        headers:economyHeaders(true),
        body:JSON.stringify({
          type,
          message,
          contact,
          user: telegramContext.user || { id:'guest', first_name:'Guest' },
          metadata:{ screen:gameState, version:'analytics-liveops' }
        })
      });
      const data = await res.json();
      trackEvent('feedback_submit', { type });
      setEconomyContent(data.ok
        ? '<div class="pill">✅ Feedback отправлен. Спасибо, боец.</div>'
        : `<div class="pill">Feedback не отправлен: ${escapeUi(data.error || 'unknown')}</div>`);
    } catch (error) {
      await reportClientError('client', error, { screen:'feedback' });
      setEconomyContent('<div class="pill">Feedback API недоступен</div>');
    }
  }

  async function loadLiveOps(){
    setEconomyContent('<div class="pill">Загрузка LiveOps config...</div>');
    try {
      const res = await fetch('/api/liveops?admin=1', { headers: economyHeaders(false) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'liveops error');
      const cards = (data.configs || []).map(c => `
        <div class="shop-card">
          <div><h4>🎛️ ${escapeUi(c.key)}</h4><p>${escapeUi(c.description || '')}</p><div class="price">${escapeUi(JSON.stringify(c.value || {})).slice(0, 260)}</div></div>
          <span class="pill">${c.public ? 'public' : 'private'}</span>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="pill-list">
          <span class="pill">LiveOps</span>
          <span class="pill">${escapeUi(data.storage || 'storage')}</span>
          <span class="pill">Configs: ${(data.configs || []).length}</span>
        </div>
        ${cards || '<div class="pill">LiveOps configs empty</div>'}
      `);
    } catch (error) {
      await reportClientError('client', error, { screen:'liveops' });
      setEconomyContent('<div class="pill">LiveOps доступен только админу или API недоступен</div>');
    }
  }





  async function loadMissions(){
    trackEvent('missions_open');
    setEconomyContent('<div class="pill">Загрузка миссий...</div>');
    try {
      const res = await fetch('/api/missions', { headers: economyHeaders(false) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'missions error');
      const cards = (data.missions || []).map(m => `
        <div class="shop-card">
          <div>
            <h4>🎯 ${escapeUi(m.title)} ${m.claimed ? '· CLAIMED' : ''}</h4>
            <p>${escapeUi(m.description)}</p>
            <div class="price">${m.progress || 0}/${m.goal_value || 1} · +${m.reward_xp || 0} XP · +${m.reward_coins || 0} coins</div>
          </div>
          <div class="shop-actions">
            ${m.claimed ? '<span class="pill">Done</span>' : m.completed ? `<button class="mini-btn claim-mission" data-id="${escapeUi(m.id)}">Claim</button>` : '<span class="pill">Progress</span>'}
          </div>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="pill-list">
          <span class="pill">Combat Missions</span>
          <span class="pill">${escapeUi(data.storage || 'storage')}</span>
          <span class="pill">Combo, wins, matches</span>
        </div>
        ${cards || '<div class="pill">Миссии пока недоступны</div>'}
      `);
      document.querySelectorAll('.claim-mission').forEach(btn => btn.addEventListener('click', () => claimMission(btn.dataset.id)));
    } catch (error) {
      await reportClientError('client', error, { screen:'missions' });
      setEconomyContent('<div class="pill">Missions API недоступен. Выполни свежий supabase_schema.sql и reload schema.</div>');
    }
  }

  async function claimMission(missionId){
    setEconomyContent('<div class="pill">Выдаём награду миссии...</div>');
    try {
      const res = await fetch('/api/missions', {
        method:'POST',
        headers:economyHeaders(true),
        body: JSON.stringify({ action:'claim', missionId, user: telegramContext.user || { id:'guest', first_name:'Guest' } })
      });
      const data = await res.json();
      if (data.profile) {
        appProfile = { ...appProfile, ...normalizeServerProfile(data.profile) };
        saveProfile();
        updateTelegramBadge();
      }
      setEconomyContent(data.ok
        ? `<div class="pill">✅ Mission claimed: +${data.reward?.xp || 0} XP · +${data.reward?.coins || 0} coins</div>`
        : `<div class="pill">Не удалось забрать миссию: ${escapeUi(data.error || 'unknown')}</div>`);
      setTimeout(loadMissions, 900);
    } catch (error) {
      setEconomyContent('<div class="pill">Ошибка выдачи миссии</div>');
    }
  }

  async function loadAchievements(){
    trackEvent('achievements_open');
    setEconomyContent('<div class="pill">Загрузка достижений...</div>');
    try {
      const res = await fetch('/api/achievements', { headers: economyHeaders(false) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'achievements error');
      const cards = (data.achievements || []).map(a => `
        <div class="shop-card">
          <div>
            <h4>🏅 ${escapeUi(a.title)} · ${escapeUi(a.rarity || 'common')}</h4>
            <p>${escapeUi(a.description)}</p>
            <div class="price">Trigger: ${escapeUi(a.trigger_type || '')} ${a.threshold || 1} · +${a.reward_xp || 0} XP · +${a.reward_coins || 0} coins</div>
          </div>
          <span class="pill">${a.unlocked ? 'Unlocked' : 'Locked'}</span>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="pill-list">
          <span class="pill">Achievements</span>
          <span class="pill">${escapeUi(data.storage || 'storage')}</span>
          <span class="pill">Permanent rewards</span>
        </div>
        ${cards || '<div class="pill">Достижения пока недоступны</div>'}
      `);
    } catch (error) {
      await reportClientError('client', error, { screen:'achievements' });
      setEconomyContent('<div class="pill">Achievements API недоступен</div>');
    }
  }

  async function loadBossRush(){
    trackEvent('boss_open');
    setEconomyContent('<div class="pill">Загрузка Boss Rush...</div>');
    try {
      const res = await fetch('/api/boss', { headers: economyHeaders(false) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'boss error');
      const cards = (data.bosses || []).map(b => `
        <div class="shop-card">
          <div>
            <h4>👹 ${escapeUi(b.title)}</h4>
            <p>${escapeUi(b.description)}</p>
            <div class="price">HP x${b.hp_multiplier || 1} · DMG x${b.damage_multiplier || 1} · +${b.reward_xp || 0} XP · +${b.reward_coins || 0} coins</div>
          </div>
          <button class="mini-btn boss-result" data-id="${escapeUi(b.id)}">Sim Win</button>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="pill-list">
          <span class="pill">Boss Rush</span>
          <span class="pill">${escapeUi(data.storage || 'storage')}</span>
          <span class="pill">Premium PvE mode</span>
        </div>
        ${cards || '<div class="pill">Boss Rush пока недоступен</div>'}
        <div class="pill" style="margin-top:10px">Сейчас кнопка Sim Win нужна для теста наград. Следующий пакет подключит полноценный boss-fight прямо в бой.</div>
      `);
      document.querySelectorAll('.boss-result').forEach(btn => btn.addEventListener('click', () => completeBoss(btn.dataset.id)));
    } catch (error) {
      await reportClientError('client', error, { screen:'boss' });
      setEconomyContent('<div class="pill">Boss API недоступен</div>');
    }
  }

  async function completeBoss(bossId){
    setEconomyContent('<div class="pill">Записываем Boss Rush результат...</div>');
    try {
      const res = await fetch('/api/boss', {
        method:'POST',
        headers:economyHeaders(true),
        body: JSON.stringify({ bossId, result:'win', score:{ combo: matchMaxCombo }, user: telegramContext.user || { id:'guest', first_name:'Guest' } })
      });
      const data = await res.json();
      if (data.profile) {
        appProfile = { ...appProfile, ...normalizeServerProfile(data.profile) };
        saveProfile();
        updateTelegramBadge();
      }
      setEconomyContent(data.ok
        ? `<div class="pill">👹 Boss defeated: +${data.reward?.xp || 0} XP · +${data.reward?.coins || 0} coins</div>`
        : `<div class="pill">Boss result error: ${escapeUi(data.error || 'unknown')}</div>`);
      setTimeout(loadBossRush, 900);
    } catch (error) {
      setEconomyContent('<div class="pill">Boss Rush ошибка</div>');
    }
  }


  async function loadContentPanel(){
    setEconomyContent('<div class="pill">Загрузка персонажей и арен из Supabase...</div>');
    try {
      const res = await fetch('/api/content', { headers: economyHeaders(false) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'content error');
      contentBundle = {
        fighters: data.fighters || DEFAULT_CONTENT.fighters,
        arenas: data.arenas || DEFAULT_CONTENT.arenas,
        abilities: data.abilities || [],
        balance: data.balance || DEFAULT_CONTENT.balance
      };
      if (!contentState.fighterId) contentState.fighterId = contentBundle.balance.activeFighterId || 'raven';
      if (!contentState.enemyId) contentState.enemyId = contentBundle.balance.enemyFighterId || 'iron_warden';
      if (!contentState.arenaId) contentState.arenaId = contentBundle.balance.activeArenaId || 'black_citadel';
      saveContentState();
      renderContentPanel(data.storage || 'supabase-postgres');
    } catch (error) {
      contentBundle = DEFAULT_CONTENT;
      renderContentPanel('offline-defaults');
    }
  }

  function statBar(label, value){
    const v = Math.max(0, Math.min(100, Number(value || 0)));
    return `<div style="margin-top:6px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>${label}</span><span>${v}</span></div><div style="height:5px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden"><i style="display:block;width:${v}%;height:100%;background:linear-gradient(90deg,var(--red),var(--gold))"></i></div></div>`;
  }

  function renderContentPanel(storage = ''){
    const fighters = contentBundle.fighters || [];
    const arenas = contentBundle.arenas || [];
    const fighterCards = fighters.map(f => `
      <div class="shop-card">
        <div>
          <h4>${escapeUi(f.name)} · ${escapeUi(f.archetype || 'Fighter')}</h4>
          <p>${escapeUi(f.description || '')}</p>
          ${statBar('Power', f.power)}${statBar('Speed', f.speed)}${statBar('Defense', f.defense)}
          <div class="price">HP ${f.hp || 100} · Special: ${escapeUi(f.specialName || 'Special')} · LVL ${f.unlockLevel || 1}</div>
        </div>
        <div class="shop-actions">
          ${contentState.fighterId === f.id ? '<span class="pill">Player</span>' : `<button class="mini-btn choose-fighter" data-id="${escapeUi(f.id)}">Выбрать</button>`}
          ${contentState.enemyId === f.id ? '<span class="pill">AI</span>' : `<button class="mini-btn secondary choose-enemy" data-id="${escapeUi(f.id)}">AI</button>`}
        </div>
      </div>
    `).join('');

    const arenaCards = arenas.map(a => `
      <div class="shop-card">
        <div>
          <h4>${escapeUi(a.title)} · ${escapeUi(a.palette || 'arena')}</h4>
          <p>${escapeUi(a.description || '')}</p>
          <div class="price">Accent ${escapeUi(a.accent || '#d9b76a')} · LVL ${a.unlockLevel || 1}</div>
        </div>
        <div class="shop-actions">
          ${contentState.arenaId === a.id ? '<span class="pill">Active</span>' : `<button class="mini-btn choose-arena" data-id="${escapeUi(a.id)}">Арена</button>`}
        </div>
      </div>
    `).join('');

    setEconomyContent(`
      <div class="pill-list">
        <span class="pill">Content DB: ${escapeUi(storage)}</span>
        <span class="pill">Fighters: ${fighters.length}</span>
        <span class="pill">Arenas: ${arenas.length}</span>
        <span class="pill">Abilities: ${(contentBundle.abilities || []).length}</span>
      </div>
      <h3 style="margin:12px 0 8px">Бойцы</h3>
      ${fighterCards || '<div class="pill">Нет бойцов</div>'}
      <h3 style="margin:12px 0 8px">Арены</h3>
      ${arenaCards || '<div class="pill">Нет арен</div>'}
      <div class="pill-list" style="margin-top:12px">
        <span class="pill">Текущий боец применится со следующего раунда</span>
        <span class="pill">Admin API умеет создавать новых бойцов</span>
      </div>
    `);

    document.querySelectorAll('.choose-fighter').forEach(btn => btn.addEventListener('click', () => {
      contentState.fighterId = btn.dataset.id;
      saveContentState();
      audio.ui();
      renderContentPanel(storage);
    }));
    document.querySelectorAll('.choose-enemy').forEach(btn => btn.addEventListener('click', () => {
      contentState.enemyId = btn.dataset.id;
      saveContentState();
      audio.ui();
      renderContentPanel(storage);
    }));
    document.querySelectorAll('.choose-arena').forEach(btn => btn.addEventListener('click', () => {
      contentState.arenaId = btn.dataset.id;
      saveContentState();
      audio.ui();
      renderContentPanel(storage);
    }));
  }


  async function loadInventoryPanel(){
    setEconomyContent('<div class="pill">Загрузка инвентаря...</div>');
    try {
      const res = await fetch('/api/inventory', { headers: economyHeaders(false) });
      const data = await res.json();
      const items = data.inventory || data.items || [];
      const rows = items.map(item => `
        <div class="shop-card">
          <div>
            <h4>🎒 ${escapeUi(item.title || item.item_id || item.id || 'Item')}</h4>
            <p>${escapeUi(item.description || item.rarity || 'Owned cosmetic / reward')}</p>
          </div>
          <span class="pill">${escapeUi(item.type || item.category || 'Owned')}</span>
        </div>
      `).join('');
      setEconomyContent(`
        <div class="pill-list">
          <span class="pill">Inventory</span>
          <span class="pill">${escapeUi(data.storage || 'supabase')}</span>
        </div>
        ${rows || '<div class="pill">Инвентарь пуст. Получи предметы через Daily, Missions, Boss Rush или Stars Shop.</div>'}
      `);
    } catch(_) {
      setEconomyContent('<div class="pill">Inventory API недоступен</div>');
    }
  }

  function loadProfilePanel(){
    const name = profileName();
    setEconomyContent(`
      <div class="shop-card">
        <div>
          <h4>👤 ${escapeUi(name)}</h4>
          <p>Telegram Fighter · EraLash Combat profile</p>
          <div class="price">LVL ${appProfile.level || 1} · ${appProfile.xp || 0} XP · ${appProfile.coins || 0} coins</div>
        </div>
        <span class="pill">${appProfile.wins || 0}W/${appProfile.losses || 0}L</span>
      </div>
      <div class="pill-list">
        <span class="pill">Matches ${appProfile.matches || 0}</span>
        <span class="pill">Best streak ${appProfile.bestStreak || 0}</span>
        <span class="pill">Daily streak ${appProfile.dailyStreak || 0}</span>
      </div>
    `);
  }

  function loadSettingsPanel(){
    setEconomyContent(`
      <div class="shop-card">
        <div>
          <h4>⚙️ Настройки</h4>
          <p>Быстрые настройки клиента. Основные боевые системы и backend не меняются.</p>
        </div>
      </div>
      <div class="pill-list">
        <button class="mini-btn" type="button" id="dcv4MuteCopy">Звук: ${muted ? 'OFF' : 'ON'}</button>
        <span class="pill">Telegram WebView ready</span>
        <span class="pill">Visual V4 active zones</span>
      </div>
    `);
    setTimeout(() => {
      document.getElementById('dcv4MuteCopy')?.addEventListener('click', () => {
        ui.muteBtn?.click();
        loadSettingsPanel();
      });
    }, 0);
  }

  function bindEconomyControls(){
    const els = economyEls();
    els.daily?.addEventListener('click', () => { audio.ui(); claimDaily(); });
    els.shop?.addEventListener('click', () => { audio.ui(); loadShop(); });
    els.contentBtn?.addEventListener('click', () => { audio.ui(); loadContentPanel(); });
    els.promo?.addEventListener('click', () => { audio.ui(); promoForm(); });
    els.weekly?.addEventListener('click', () => { audio.ui(); loadWeekly(); });
    els.invite?.addEventListener('click', () => { audio.ui(); loadReferral(); });
    els.season?.addEventListener('click', () => { audio.ui(); loadSeason(); });
    els.launch?.addEventListener('click', () => { audio.ui(); loadLaunch(); });
    els.news?.addEventListener('click', () => { audio.ui(); loadNews(); });
    els.founder?.addEventListener('click', () => { audio.ui(); claimFounderBonus(); });
    els.feedback?.addEventListener('click', () => { audio.ui(); feedbackForm(); });
    els.analytics?.addEventListener('click', () => { audio.ui(); loadAnalytics(); });
    els.liveops?.addEventListener('click', () => { audio.ui(); loadLiveOps(); });
    els.missions?.addEventListener('click', () => { audio.ui(); loadMissions(); });
    els.achievements?.addEventListener('click', () => { audio.ui(); loadAchievements(); });
    els.boss?.addEventListener('click', () => { audio.ui(); loadBossRush(); });
    els.admin?.addEventListener('click', () => { audio.ui(); loadAdmin(); });
    els.qa?.addEventListener('click', () => { audio.ui(); loadQa(); });

    const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      audio.ui();
      fn();
    });

    bind('realStartZone', () => { trackEvent('character_select_open', { source:'real_art_start_zone_16' }); audio.ensure(); openCharacterSelect('real_art_start_zone_16'); });
    bind('realProfileZone', loadProfilePanel);
    bind('realSeasonCardBtn', loadSeason);
    bind('realDailyCardBtn', claimDaily);
    bind('realMissionsCardBtn', loadMissions);
    bind('realStarsCardBtn', loadShop);
    bind('realInventoryBtn', loadInventoryPanel);
    bind('realProfileBtn', loadProfilePanel);
    bind('realAchievementsBtn', loadAchievements);
    bind('realReferralsBtn', loadReferral);
    bind('realSettingsBtn', loadSettingsPanel);

    // Clean hover frame: one elegant frame follows exact real-art zones instead of
    // letting browser hover paint large/crooked rectangles over the artwork.
    const hoverFrame = document.getElementById('dcRealHoverFrame');
    const lobbyFrame = document.querySelector('#menu .dc-v3-lobby');
    const zoneIds = [
      'realStartZone','realProfileZone','realSeasonCardBtn','realDailyCardBtn','realMissionsCardBtn','realStarsCardBtn',
      'realInventoryBtn','realProfileBtn','realAchievementsBtn','realReferralsBtn','realSettingsBtn',
      'dailyBtn','shopBtn','contentBtn','missionsBtn','bossBtn','seasonBtn','weeklyBtn','inviteBtn','promoBtn',
      'achievementsBtn','launchBtn','newsBtn','founderBtn','feedbackBtn','analyticsBtn'
    ];
    function moveHoverFrame(el){
      if (!hoverFrame || !lobbyFrame || !el || !document.body.classList.contains('real-art-v4')) return;
      const lr = lobbyFrame.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      hoverFrame.style.left = Math.max(0, r.left - lr.left) + 'px';
      hoverFrame.style.top = Math.max(0, r.top - lr.top) + 'px';
      hoverFrame.style.width = Math.max(1, r.width) + 'px';
      hoverFrame.style.height = Math.max(1, r.height) + 'px';
      hoverFrame.classList.toggle('start', el.id === 'realStartZone' || el.id === 'startBtn');
      hoverFrame.classList.add('show');
    }
    function hideHoverFrame(){
      if (hoverFrame) hoverFrame.classList.remove('show','start');
    }
    zoneIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerenter', () => moveHoverFrame(el), {passive:true});
      el.addEventListener('focus', () => moveHoverFrame(el), {passive:true});
      el.addEventListener('pointerleave', hideHoverFrame, {passive:true});
      el.addEventListener('blur', hideHoverFrame, {passive:true});
      el.addEventListener('pointerdown', () => {
        moveHoverFrame(el);
        if (lobbyFrame) {
          lobbyFrame.setAttribute('data-pressed-zone', id);
          window.setTimeout(() => lobbyFrame.removeAttribute('data-pressed-zone'), 190);
        }
      }, {passive:true});
    });


    document.getElementById('inventoryFakeBtn')?.addEventListener('click', () => { audio.ui(); loadInventoryPanel(); });
    document.getElementById('profileFakeBtn')?.addEventListener('click', () => { audio.ui(); loadProfilePanel(); });
    document.getElementById('settingsFakeBtn')?.addEventListener('click', () => { audio.ui(); loadSettingsPanel(); });

    ui.shareVictoryBtn?.addEventListener('click', () => { audio.ui(); shareVictory(); });
  }


  /* Dark Cinematic Real Art V4.2 — forced click-map.
     This is a fail-safe layer: even if transparent buttons are blocked by
     browser/Vercel rendering, desktop clicks are mapped by coordinates and
     routed directly to game actions. */
  function bindRealArtClickMap(){
    const lobby = document.querySelector('#menu .dc-v3-lobby');
    if (!lobby) return;

    const run = (fn) => {
      try { audio.ui(); } catch(_) {}
      try { fn(); } catch (err) { console.error('RealArt click action failed', err); }
    };

    const zones = [
      // Left command deck
      { id:'daily',        x1:1.6,  y1:10.7, x2:21.5, y2:16.9, fn:()=>claimDaily() },
      { id:'shop',         x1:1.6,  y1:16.1, x2:21.5, y2:22.3, fn:()=>loadShop() },
      { id:'content',      x1:1.6,  y1:21.5, x2:21.5, y2:27.7, fn:()=>loadContentPanel() },
      { id:'missions',     x1:1.6,  y1:26.9, x2:21.5, y2:33.1, fn:()=>loadMissions() },
      { id:'boss',         x1:1.6,  y1:32.3, x2:21.5, y2:38.5, fn:()=>loadBossRush() },
      { id:'season',       x1:1.6,  y1:37.7, x2:21.5, y2:43.9, fn:()=>loadSeason() },
      { id:'weekly',       x1:1.6,  y1:43.1, x2:21.5, y2:49.3, fn:()=>loadWeekly() },
      { id:'invite',       x1:1.6,  y1:48.5, x2:21.5, y2:54.7, fn:()=>loadReferral() },
      { id:'promo',        x1:1.6,  y1:53.9, x2:21.5, y2:60.1, fn:()=>promoForm() },
      { id:'achievements', x1:1.6,  y1:59.3, x2:21.5, y2:65.5, fn:()=>loadAchievements() },
      { id:'launch',       x1:1.6,  y1:64.7, x2:21.5, y2:70.9, fn:()=>loadLaunch() },
      { id:'news',         x1:1.6,  y1:70.1, x2:21.5, y2:76.3, fn:()=>loadNews() },
      { id:'founder',      x1:1.6,  y1:75.5, x2:21.5, y2:81.7, fn:()=>claimFounderBonus() },
      { id:'feedback',     x1:1.6,  y1:80.9, x2:21.5, y2:87.1, fn:()=>feedbackForm() },
      { id:'analytics',    x1:1.6,  y1:86.3, x2:21.5, y2:93.3, fn:()=>loadAnalytics() },

      // Main and top zones
      { id:'start',        x1:30.0, y1:72.3, x2:66.4, y2:84.9, fn:()=>{ trackEvent('character_select_open',{source:'real_art_clickmap_16'}); audio.ensure(); openCharacterSelect('real_art_clickmap_16'); } },
      { id:'profileTop',   x1:23.0, y1:1.4,  x2:48.0, y2:7.8,  fn:()=>loadProfilePanel() },
      { id:'settingsTop',  x1:92.0, y1:1.0,  x2:97.7, y2:8.0,  fn:()=>loadSettingsPanel() },

      // Right rail
      { id:'seasonCard',   x1:75.1, y1:11.2, x2:97.2, y2:30.6, fn:()=>loadSeason() },
      { id:'dailyCard',    x1:75.1, y1:31.1, x2:97.2, y2:50.8, fn:()=>claimDaily() },
      { id:'missionCard',  x1:75.1, y1:50.9, x2:97.2, y2:64.9, fn:()=>loadMissions() },
      { id:'starsCard',    x1:75.1, y1:64.8, x2:97.2, y2:84.4, fn:()=>loadShop() },

      // Bottom navigation
      { id:'inventory',    x1:23.0, y1:84.8, x2:33.2, y2:96.2, fn:()=>loadInventoryPanel() },
      { id:'profile',      x1:33.2, y1:84.8, x2:43.4, y2:96.2, fn:()=>loadProfilePanel() },
      { id:'achBottom',    x1:43.4, y1:84.8, x2:53.7, y2:96.2, fn:()=>loadAchievements() },
      { id:'refsBottom',   x1:53.7, y1:84.8, x2:63.9, y2:96.2, fn:()=>loadReferral() },
      { id:'settings',     x1:63.9, y1:84.8, x2:74.1, y2:96.2, fn:()=>loadSettingsPanel() }
    ];

    let lastTouchAt = 0;

    const handle = (event) => {
      if (!document.body.classList.contains('real-art-v4')) return;
      if (ui.menu.style.display === 'none' || gameState === 'fight') return;

      // Arena Flow 16.1 hotfix:
      // The painted real-art clickmap is a global capture listener. In 16.0 it also
      // intercepted clicks inside Character Select / Arena Select overlays and on
      // real DOM buttons, so "Start Fight / Начать бой" looked inactive.
      const target = event.target;
      if (target?.closest?.('#characterSelect, #arenaSelect, #arenaReveal16, #result, #pauseOverlay, .dcv4-modal')) return;
      if (target?.closest?.('#menu button:not(.dc-real-zone), #menu a, #menu input, #menu select, #menu textarea')) return;

      const isTouch = event.type === 'touchend';
      if (!isTouch && Date.now() - lastTouchAt < 650) return;
      const p = isTouch ? event.changedTouches?.[0] : event;
      if (!p) return;

      const r = lobby.getBoundingClientRect();
      if (r.width < 100 || r.height < 100) return;
      if (p.clientX < r.left || p.clientX > r.right || p.clientY < r.top || p.clientY > r.bottom) return;

      const x = ((p.clientX - r.left) / r.width) * 100;
      const y = ((p.clientY - r.top) / r.height) * 100;
      const z = zones.find(a => x >= a.x1 && x <= a.x2 && y >= a.y1 && y <= a.y2);
      if (!z) return;

      if (isTouch) lastTouchAt = Date.now();
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();

      lobby.dataset.pressedZone = z.id;
      setTimeout(() => { if (lobby.dataset.pressedZone === z.id) delete lobby.dataset.pressedZone; }, 180);
      run(z.fn);
    };

    document.addEventListener('click', handle, true);
    document.addEventListener('touchend', handle, { capture:true, passive:false });
  }


  function initTelegram(){
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        telegramContext.insideTelegram = true;
        telegramContext.initData = tg.initData || '';
        telegramContext.user = tg.initDataUnsafe?.user || null;
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#050506');
        tg.setBackgroundColor('#050506');
        if (tg.onEvent) tg.onEvent('viewportChanged', resize);
        if (tg.onEvent) {
          tg.onEvent('invoiceClosed', (eventData) => {
            const status = eventData?.status || eventData;
            if (status === 'paid') {
              setEconomyContent('<div class="pill">✅ Stars payment accepted. Inventory обновляется...</div>');
              setTimeout(loadShop, 1200);
            }
          });
        }
        if (tg.MainButton) {
          tg.MainButton.setText('ENTER ARENA');
          tg.MainButton.onClick(()=>{ audio.ui(); audio.ensure(); openCharacterSelect('telegram_main_button_16'); });
          // Внутриигровая кнопка Telegram перекрывала нижнюю часть экрана и блокировала прокрутку меню на iPhone.
          // Оставляем собственные premium-кнопки внутри Mini App и скрываем системную MainButton.
          tg.MainButton.hide();
        }
      }
    } catch(_) {}
    updateTelegramBadge();
    syncProfileFromBackend();
    registerReferralFromLaunch();
    fetch('/api/content').then(r=>r.json()).then(data=>{ if(data.ok){ contentBundle={ fighters:data.fighters||DEFAULT_CONTENT.fighters, arenas:data.arenas||DEFAULT_CONTENT.arenas, abilities:data.abilities||[], balance:data.balance||DEFAULT_CONTENT.balance }; }}).catch(()=>{});
    const params = new URLSearchParams(location.search);
    setTimeout(() => {
      if (params.get('admin') === '1') loadAdmin();
      if (params.get('promo') === '1') promoForm();
      if (params.get('content') === '1') loadContentPanel();
      if (params.get('invite') === '1' || params.get('ref') === '1') loadReferral();
      if (params.get('season') === '1') loadSeason();
      if (params.get('qa') === '1') loadQa();
      if (params.get('launch') === '1') loadLaunch();
      if (params.get('news') === '1') loadNews();
      if (params.get('founder') === '1') claimFounderBonus();
      if (params.get('feedback') === '1') feedbackForm();
      if (params.get('analytics') === '1') loadAnalytics();
      if (params.get('liveops') === '1') loadLiveOps();
      if (params.get('missions') === '1') loadMissions();
      if (params.get('achievements') === '1') loadAchievements();
      if (params.get('boss') === '1') loadBossRush();
    }, 350);
  }


  window.addEventListener('error', event => {
    reportClientError('client', event.error || event.message, { filename:event.filename, lineno:event.lineno, colno:event.colno });
  });
  window.addEventListener('unhandledrejection', event => {
    reportClientError('client', event.reason || 'unhandledrejection', { type:'unhandledrejection' });
  });


  /*
   * FIGHTER RIG 8.0 — hard replacement layer.
   * The uploaded character art is a single full-body PNG per fighter, not a sprite sheet.
   * This layer makes that limitation honest and playable: visible root motion, wider spacing,
   * bigger state poses, strong attack arcs, hit reactions, separation physics and cinematic feedback.
   */

  function premiumFighterScaleFactor(){
    // Smaller than 7.2 so the fighters fit the arena instead of covering each other.
    const coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    return coarse ? clamp(w / 1450, .62, .88) : clamp(w / 1920, .72, .96);
  }

  function fighterVisualHeight(f){
    if (!USE_PREMIUM_FIGHTER_ART) return f.h;
    const coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    const base = f.id === 'enemy' ? 430 : 398;
    return base * premiumFighterScaleFactor() * (coarse ? .96 : 1);
  }

  function fighterVisualWidth(f){
    if (!USE_PREMIUM_FIGHTER_ART) return f.w;
    return fighterVisualHeight(f) * (f.id === 'enemy' ? .50 : .46);
  }

  function fighterBodyRadius(f){
    if (!USE_PREMIUM_FIGHTER_ART) return f.w * .45;
    // This is the collision foot-space, not the full image width.
    return fighterVisualWidth(f) * (f.id === 'enemy' ? .56 : .50);
  }

  function fighterPreferredDistance(a,b){
    if (!USE_PREMIUM_FIGHTER_ART) return (a.w + b.w) * .45;
    // Keep a large readable gap between the two big painted fighters.
    return fighterBodyRadius(a) + fighterBodyRadius(b) + Math.max(145, w * .075);
  }

  function stageBounds(){
    if (EXACT_BLACK_CITADEL_ARENA) {
      const b = getExactArenaCombatBounds();
      // Use the central combat floor. Do not let fighters stand in decorative side walls.
      return {
        left: b.center - b.stageW * .245,
        right: b.center + b.stageW * .245,
        center: b.center
      };
    }
    return { left: w * .22, right: w * .78, center: w * .5 };
  }

  function clampToStage(f){
    const b = stageBounds();
    const pad = USE_PREMIUM_FIGHTER_ART ? Math.max(70, fighterBodyRadius(f)*.72) : f.w*.35;
    f.x = clamp(f.x, b.left + pad, b.right - pad);
  }

  function resetRoundPositions(){
    roundResolving = false;
    if (roundEndTimer) { clearTimeout(roundEndTimer); roundEndTimer = 0; }
    applyAbilityConfig();
    player = makeFighter('player');
    enemy = makeFighter('enemy');

    // Fighter Rig 8.0 combat values are deliberately visible.
    player.collisionW = 118;
    player.collisionH = 296;
    enemy.collisionW = 150;
    enemy.collisionH = 328;
    player.mass = 1.02;
    enemy.mass = 1.48;

    player.stats.speed = 560;
    player.stats.accel = 5400;
    player.stats.airAccel = 1460;
    player.stats.jump = 900;

    enemy.stats.speed = 385;
    enemy.stats.accel = 3250;
    enemy.stats.airAccel = 1030;
    enemy.stats.jump = 720;
    enemy.ai.aggression = .50;
    enemy.ai.blockChance = .42;
    enemy.ai.mistake = .28;

    const b = stageBounds();
    const gap = Math.min((b.right-b.left)*.40, Math.max(360, w*.235));
    player.x = b.center - gap * .52;
    enemy.x = b.center + gap * .52;
    player.y = enemy.y = groundY;
    player.dir = 1;
    enemy.dir = -1;

    particles.length = 0;
    texts.length = 0;
    projectiles.length = 0;
    roundTime = ROUND_TIME;
    roundFreeze = 1.35;
    hitStop = 0;
    shake = 0;
    slowMo = 1;
    flash = 0;
    cinematic = 0;
    cameraZoom = 1;
    comboCount = 0;
    comboTimer = 0;
    comboDamage = 0;
    updateComboTag();
    physicsDebugT = 8.0;
    showCallout('SPRITE COMBAT 9.2', 'VISIBLE SPRITES · DAMAGE/HITBOX FIX · ACTIVE FRAMES');
    updateHUD(true);
  }

  function bodyBox(f){
    if (USE_PREMIUM_FIGHTER_ART) {
      const bw = f.collisionW || fighterBodyRadius(f)*2;
      const bh = f.collisionH || fighterVisualHeight(f)*.70;
      return { x:f.x - bw/2, y:f.y - bh, w:bw, h:bh };
    }
    return { x:f.x - f.w/2, y:f.y - f.h, w:f.w, h:f.h };
  }

  function hurtBox(f){
    if (USE_PREMIUM_FIGHTER_ART) {
      const bw = (f.collisionW || fighterBodyRadius(f)*2) * (f.state === 'block' ? 1.05 : .96);
      const bh = (f.collisionH || fighterVisualHeight(f)*.70) * .95;
      return { x:f.x - bw/2, y:f.y - bh, w:bw, h:bh };
    }
    return { x:f.x - f.w*.42, y:f.y - f.h*.95, w:f.w*.84, h:f.h*.9 };
  }

  function attackBox(f){
    if (f.state !== 'attack' || !f.attack) return null;
    const t = f.stateT;
    if (t < f.attack.startup || t > f.attack.startup + f.attack.active) return null;
    if (USE_PREMIUM_FIGHTER_ART) {
      const scale = premiumFighterScaleFactor();
      const rangeBoost = f.attack.name === 'ultimate' ? 1.35 : f.attack.name === 'special' ? 1.22 : f.attack.name === 'heavy' ? 1.15 : 1.0;
      const minRange = f.attack.name === 'ultimate' ? 430 : f.attack.name === 'special' ? 360 : f.attack.name === 'heavy' ? 330 : 270;
      const range = Math.max(minRange, f.attack.range * scale * rangeBoost);
      const boxH = Math.max(170, f.attack.height * scale * 1.20);
      const base = fighterBodyRadius(f) * .42;
      return {
        x: f.dir > 0 ? f.x + base : f.x - base - range,
        y: f.y - fighterVisualHeight(f) * (f.attack.name === 'ultimate' ? .82 : .74),
        w: range,
        h: boxH
      };
    }
    const range = f.attack.range;
    return { x: f.dir > 0 ? f.x + f.w*.15 : f.x - f.w*.15 - range, y:f.y+f.attack.y, w:range, h:f.attack.height };
  }

  function resolveFighterCollision(){
    if (!player || !enemy) return;
    const pR = fighterBodyRadius(player);
    const eR = fighterBodyRadius(enemy);
    const minDist = pR + eR + Math.max(118, w*.055);
    const dx = enemy.x - player.x;
    const dist = Math.max(1, Math.abs(dx));
    if (dist < minDist) {
      const dir = dx >= 0 ? 1 : -1;
      const overlap = minDist - dist;
      const total = (player.mass||1) + (enemy.mass||1);
      const pMove = overlap * ((enemy.mass||1) / total);
      const eMove = overlap * ((player.mass||1) / total);
      player.x -= dir * pMove * 1.12;
      enemy.x += dir * eMove * 1.12;
      player.vx -= dir * 170;
      enemy.vx += dir * 150;
      player.contactPressure = 1;
      enemy.contactPressure = 1;
      if (Math.random() < .18) {
        spawnFootDust(player, 1, 'rgba(220,160,95,.26)');
        spawnFootDust(enemy, 1, 'rgba(220,160,95,.26)');
      }
      clampToStage(player);
      clampToStage(enemy);
    } else {
      player.contactPressure = Math.max(0, (player.contactPressure || 0) - .08);
      enemy.contactPressure = Math.max(0, (enemy.contactPressure || 0) - .08);
    }
  }

  function startAttack(f, type, fromBuffer=false){
    if (gameState !== 'fight') return;
    if (roundFreeze > 0) return;
    if (isActionLocked(f)) {
      if (!fromBuffer) bufferAttack(f, type);
      return;
    }
    if (f.state === 'attack' && !canAttackCancel(f, type)) {
      if (!fromBuffer) bufferAttack(f, type);
      return;
    }
    const data = attacks[type];
    if (!data) return;
    if ((type === 'special' || type === 'ultimate') && f.energy < data.cost) {
      if (f.id === 'player') floatingText('NO ENERGY', f.x, f.y - fighterVisualHeight(f)*.72, '#d9b76a');
      return;
    }

    if (type === 'special' || type === 'ultimate') f.energy = clamp(f.energy - data.cost, 0, 100);
    f.attack = { ...data, total: data.startup + data.active + data.recovery, name: data.name || type, dir: f.dir, whiffed: false };
    f.attackHasHit = false;
    f.lastAttackType = type;
    f.comboT = .55;
    f.comboStep += 1;
    f.groundLock = Math.max(f.groundLock || 0, type === 'ultimate' ? .42 : type === 'special' ? .30 : .18);
    setState(f, 'attack');

    // Visible startup displacement so button presses read immediately.
    const impulse = type === 'ultimate' ? 360 : type === 'special' ? 295 : type === 'heavy' ? 240 : 155;
    f.vx += f.dir * impulse;
    f.x += f.dir * (type === 'ultimate' ? 34 : type === 'special' ? 26 : type === 'heavy' ? 20 : 12);
    spawnFootDust(f, type === 'light' ? 3 : type === 'heavy' ? 5 : 8, f.id === 'enemy' ? 'rgba(80,190,255,.28)' : 'rgba(255,70,80,.26)');

    if (type === 'ultimate') {
      spawnAura(f, '#fff0b7');
      spawnAura(f, f.colorB);
      cinematic = .78;
      cameraZoom = 1.105;
      shake = Math.max(shake, 20);
      flash = Math.max(flash, .34);
      showCallout('ULTIMATE', f.ultimateName || 'Final Strike');
      tryHaptic('ultimate');
    } else if (type === 'special') {
      spawnAura(f, f.colorB);
      cameraZoom = Math.max(cameraZoom,1.055);
      shake = Math.max(shake, 6);
      tryHaptic('medium');
    } else if (type === 'heavy') {
      shake = Math.max(shake, 4);
    }

    audio.hit(type);
    clampToStage(f);
  }

  function applyHit(attacker, defender, atk){
    if (defender.invuln > 0 || defender.hp <= 0) return;

    const facing = Math.sign(defender.x - attacker.x) || attacker.dir || 1;
    const defenderFacingAttacker = Math.sign(attacker.x - defender.x) === defender.dir;
    const defenderBlocking = defender.state === 'block' && defender.stamina > 0 && defenderFacingAttacker;

    let dmg = atk.damage;
    let blocked = false;

    if (defenderBlocking) {
      blocked = true;
      dmg = atk.blockDamage;
      defender.stamina = clamp(defender.stamina - (atk.guardDamage || 14), 0, 100);
      defender.vx += facing * Math.max(170, (atk.kb || 300) * .34);
      defender.x += facing * 34;
      floatingText('BLOCK', defender.x, defender.y - fighterVisualHeight(defender)*.66, '#8edcff');
      if (defender.stamina <= 0) {
        blocked = false;
        dmg += 8;
        defender.invuln = 0;
        floatingText('GUARD BREAK', defender.x, defender.y - fighterVisualHeight(defender)*.75, '#d9b76a');
        spawnAura(defender, '#d9b76a');
      }
    }

    const armorReduce = (!blocked && defender.armor && atk.name !== 'ultimate') ? defender.armor : 0;
    dmg = Math.max(1, Math.round(dmg * (1 - armorReduce)));
    defender.hp = clamp(defender.hp - dmg, 0, defender.maxHp);
    defender.invuln = blocked ? .08 : (atk.name === 'ultimate' ? .24 : .14);

    const massScale = 1 / Math.max(.86, defender.mass || 1);
    const effectiveKb = blocked ? (atk.kb*.44) : atk.kb;
    defender.vx = facing * effectiveKb * massScale;
    defender.vy = blocked ? -18 : (atk.lift || -70) * massScale;
    defender.x += facing * (blocked ? 44 : atk.name === 'ultimate' ? 150 : atk.name === 'special' ? 118 : atk.name === 'heavy' ? 96 : 58) * massScale;

    attacker.vx -= facing * (atk.pushback || 70) / Math.max(.9, attacker.mass || 1);
    attacker.x -= facing * (atk.name === 'ultimate' ? 54 : atk.name === 'special' ? 42 : atk.name === 'heavy' ? 34 : 22);
    attacker.vx *= atk.attackerBrake || .68;

    const hardHit = !blocked && (atk.name === 'heavy' || atk.name === 'special' || atk.name === 'ultimate');
    if (hardHit && atk.name !== 'heavy') {
      defender.knockdownTime = atk.name === 'ultimate' ? .95 : .58;
      setState(defender, 'knockdown');
    } else if (!blocked) {
      defender.hitstunTime = atk.hitstun || .32;
      setState(defender, 'hitstun');
    }

    const fxX = defender.x - facing * 48;
    const fxY = defender.y - fighterVisualHeight(defender)*.58;
    spawnImpact(fxX, fxY, attacker.colorB, atk.name);
    if (!blocked) {
      floatingText('-' + dmg, defender.x, defender.y - fighterVisualHeight(defender)*.82, attacker.colorB);
      comboCount = attacker.id === 'player' ? comboCount + 1 : 0;
      comboDamage = attacker.id === 'player' ? comboDamage + dmg : 0;
      comboTimer = .95;
      matchMaxCombo = Math.max(matchMaxCombo, comboCount);
      updateComboTag();
    }

    attacker.attackHasHit = true;
    attacker.energy = clamp(attacker.energy + (atk.energyGain || 0), 0, 100);
    hitStop = blocked ? Math.min(.06, atk.hitStop*.70) : (atk.hitStop || .08);
    shake = Math.max(shake, blocked ? 5 : atk.name === 'ultimate' ? 28 : atk.name === 'special' ? 18 : atk.name === 'heavy' ? 13 : 7);
    flash = Math.max(flash, blocked ? .10 : atk.name === 'ultimate' ? .42 : .18);
    cameraZoom = Math.max(cameraZoom, blocked ? 1.025 : atk.name === 'ultimate' ? 1.12 : atk.name === 'special' ? 1.08 : 1.04);
    slowMo = atk.name === 'ultimate' ? .42 : atk.name === 'special' ? .66 : .84;
    tryHaptic(atk.name === 'light' ? 'light' : 'medium');

    clampToStage(attacker);
    clampToStage(defender);
    updateHUD();
    if (defender.hp <= 0) finishRound(attacker.id);
  }

  function updateAI(f, opponent, dt){
    const ai = f.ai;
    ai.think -= dt;
    const dist = Math.abs(opponent.x - f.x);
    const preferred = fighterPreferredDistance(f, opponent);
    const safe = preferred * .76;
    const strike = preferred * .98;
    const tooClose = dist < safe;
    f.dir = opponent.x > f.x ? 1 : -1;

    if (ai.think <= 0) {
      ai.think = .16 + Math.random()*.22;
      ai.next = Math.random();
    }

    if (opponent.state === 'attack' && dist < strike + 80 && f.state !== 'attack') {
      if (Math.random() < .20 && f.dodgeCd <= 0) { performDodge(f); return; }
      if (Math.random() < ai.blockChance) { setState(f, 'block'); f.vx *= .35; return; }
    }

    if (f.state === 'block') return;

    let axis = 0;
    if (tooClose) axis = -f.dir;
    else if (dist > preferred + 75) axis = f.dir;
    else if (Math.random() < .009) axis = Math.random() < .5 ? -f.dir : f.dir;

    applyMovementInput(f, axis, dt);

    // The Warden attacks less often but with clear readable spacing.
    if (dist < strike && ai.think < .07 && Math.random() > ai.mistake) {
      if (f.energy >= attacks.special.cost && Math.random() < .18) startAttack(f, 'special');
      else if (dist < preferred*.88 && Math.random() < .30) startAttack(f, 'heavy');
      else if (Math.random() < .40) startAttack(f, 'light');
    }
  }

  function updateFighter(f, opponent, dt){
    const wasGrounded = isGrounded(f);
    f.stateT += dt;
    f.invuln = Math.max(0, f.invuln - dt);
    f.dodgeCd = Math.max(0, (f.dodgeCd || 0) - dt);
    f.afterImage = Math.max(0, (f.afterImage || 0) - dt);
    f.groundLock = Math.max(0, (f.groundLock || 0) - dt);
    f.landingLag = Math.max(0, (f.landingLag || 0) - dt);
    f.whiffRecoverT = Math.max(0, (f.whiffRecoverT || 0) - dt);
    f.clashCd = Math.max(0, (f.clashCd || 0) - dt);
    f.coyoteT = isGrounded(f) ? .095 : Math.max(0, (f.coyoteT || 0) - dt);
    f.jumpBufferT = Math.max(0, (f.jumpBufferT || 0) - dt);
    f.bufferedAttackT = Math.max(0, (f.bufferedAttackT || 0) - dt);
    f.comboT = Math.max(0, (f.comboT || 0) - dt);
    if (f.comboT <= 0) f.comboStep = 0;

    const staminaRegen = f.state === 'block' ? 8 : 28;
    f.stamina = clamp(f.stamina + dt*staminaRegen, 0, 100);
    f.energy = clamp(f.energy + dt*(f.id === 'player' ? 3.2 : 2.5), 0, 100);

    if (f.state === 'attack' && f.attack) {
      const ab = attackBox(f);
      if (!f.attackHasHit) {
        const hb = hurtBox(opponent);
        const facingTarget = (opponent.x - f.x) * (f.dir || 1) > -18;
        const scale = premiumFighterScaleFactor ? premiumFighterScaleFactor() : 1;
        const reachBoost = f.attack.name === 'ultimate' ? 1.45 : f.attack.name === 'special' ? 1.32 : f.attack.name === 'heavy' ? 1.22 : 1.10;
        const centerReach = fighterBodyRadius(f) + fighterBodyRadius(opponent) + Math.max(180, f.attack.range * scale * reachBoost);
        const centerClose = Math.abs(opponent.x - f.x) <= centerReach;
        const verticalClose = Math.abs((opponent.y || groundY) - (f.y || groundY)) <= Math.max(130, fighterVisualHeight(f) * .42);
        if ((ab && rectsOverlap(ab, hb)) || (facingTarget && centerClose && verticalClose)) {
          applyHit(f, opponent, f.attack);
        }
      }

      const activeEnd = f.attack.startup + f.attack.active;
      const power = f.attack.name === 'ultimate' ? 1.42 : f.attack.name === 'special' ? 1.22 : f.attack.name === 'heavy' ? 1.10 : .95;
      if (f.stateT < activeEnd) {
        f.vx += f.dir * (f.attack.lunge || 0) * dt * 4.8 * power;
        f.x += f.dir * (f.attack.lunge || 0) * dt * .80 * power;
      } else {
        f.vx *= Math.pow(.62, dt*60);
      }
      if (f.stateT >= f.attack.total) {
        setState(f, 'idle');
        consumeBufferedAttack(f);
      }
    }

    if (f.state === 'hitstun' && f.stateT > (f.hitstunTime || .34)) {
      setState(f, 'idle');
      consumeBufferedAttack(f);
    }
    if (f.state === 'knockdown' && f.stateT > (f.knockdownTime || .70) && isGrounded(f)) {
      setState(f, 'idle');
      f.invuln = .16;
      spawnFootDust(f, 9, 'rgba(210,170,120,.34)');
    }
    if (f.state === 'dodge' && f.stateT > .28) {
      setState(f, 'idle');
      consumeBufferedAttack(f);
    }
    if (f.state === 'block') {
      if (f.id === 'enemy' && f.stateT > .55) setState(f, 'idle');
      if (f.id === 'player' && !input.block) setState(f, 'idle');
    }

    if (f.state !== 'attack' && f.state !== 'hitstun' && f.state !== 'knockdown' && f.state !== 'dodge') {
      if (f.id === 'player') updatePlayerControl(f, dt);
      else updateAI(f, opponent, dt);
    }

    f.vy += GRAVITY * (f.stats.gravityScale || 1) * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    if (f.y > groundY) {
      f.y = groundY;
      if (!wasGrounded && Math.abs(f.vy) > 300) {
        spawnFootDust(f, 10, 'rgba(210,170,120,.34)');
        shake = Math.max(shake, 4.5);
      }
      f.vy = 0;
    }

    const grounded = isGrounded(f);
    const friction = grounded ? (f.state === 'block' ? .66 : f.state === 'attack' ? .72 : .84) : .965;
    f.vx *= Math.pow(friction, dt*60);
    if (Math.abs(f.vx) < 9) f.vx = 0;
    clampToStage(f);

    if (USE_PREMIUM_FIGHTER_ART && grounded && Math.abs(f.vx) > 105 && Math.random() < dt * 18) {
      spawnFootDust(f, 1, f.id === 'enemy' ? 'rgba(80,190,255,.19)' : 'rgba(255,70,80,.18)');
    }

    if (f.state !== 'attack' && f.state !== 'hitstun' && f.state !== 'block' && f.state !== 'dodge' && f.state !== 'knockdown') {
      if (!grounded) setState(f, 'jump');
      else if (Math.abs(f.vx) > 35 || Math.abs(f.walkIntent || 0) > 0) setState(f, 'walk');
      else setState(f, 'idle');
    }
  }

  function physicsDebugLine(){
    if (!ui.debug || gameState === 'menu') return;
    if (physicsDebugT <= 0) {
      ui.debug.style.display = 'none';
      return;
    }
    ui.debug.style.display = 'block';
    ui.debug.style.border = '1px solid rgba(217,183,106,.42)';
    ui.debug.style.background = 'linear-gradient(180deg,rgba(8,9,12,.82),rgba(0,0,0,.58))';
    ui.debug.style.boxShadow = '0 18px 48px rgba(0,0,0,.40)';
    const dist = Math.round(Math.abs(enemy.x - player.x));
    ui.debug.innerHTML = `SPRITE COMBAT 9.2<br>` +
      `Raven: ${player.state} · vx ${Math.round(player.vx)} · HP ${Math.round(player.hp)}<br>` +
      `Warden: ${enemy.state} · vx ${Math.round(enemy.vx)} · HP ${Math.round(enemy.hp)}<br>` +
      `DISTANCE: ${dist}px`;
  }

  function drawRigSlash(f, spriteH, attackPunch, active, atkName){
    if (!f.attack || !attackPunch) return;
    const color = f.id === 'enemy' ? 'rgba(80,200,255,' : 'rgba(255,55,70,';
    const dir = f.dir || 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const reach = atkName === 'ultimate' ? spriteH*.64 : atkName === 'special' ? spriteH*.50 : atkName === 'heavy' ? spriteH*.42 : spriteH*.32;
    const cy = -spriteH*.48;
    const cx = dir * (spriteH*.13 + reach*.38);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i=0;i<3;i++){
      ctx.beginPath();
      ctx.strokeStyle = color + (active ? (.62 - i*.16) : (.22 - i*.05)) + ')';
      ctx.lineWidth = active ? (20 - i*5) : (10 - i*2);
      const start = dir > 0 ? -0.72 : Math.PI + .72;
      const end = dir > 0 ? .76 : Math.PI - .76;
      ctx.arc(cx, cy, reach + i*18, start, end, dir < 0);
      ctx.stroke();
    }
    if (active) {
      ctx.fillStyle = f.id === 'enemy' ? 'rgba(120,220,255,.55)' : 'rgba(255,80,85,.50)';
      ctx.beginPath();
      ctx.ellipse(dir*(spriteH*.42), -spriteH*.50, spriteH*.18, spriteH*.045, dir*.25, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPremiumFighterArt(f){
    // Sprite Combat 9.1: final renderer must use sprite sheets first.
    // Previous Fighter Rig 8.0 declaration was overriding the sprite renderer and causing invisible/static fighters.
    if (typeof drawSpriteSheetFighter === 'function' && drawSpriteSheetFighter(f)) return true;
    if (!USE_PREMIUM_FIGHTER_ART) return false;
    const img = f.id === 'player' ? premiumFighterArt.player : premiumFighterArt.enemy;
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return false;

    const time = performance.now();
    const isEnemy = f.id !== 'player';
    const dir = f.dir || (isEnemy ? -1 : 1);
    const hurt = f.state === 'hitstun' || f.state === 'knockdown';
    const blocking = f.state === 'block';
    const attacking = f.state === 'attack';
    const dodging = f.state === 'dodge';
    const walking = f.state === 'walk';
    const atkName = f.attack?.name || '';
    const active = attacking && f.attack && f.stateT >= f.attack.startup && f.stateT <= f.attack.startup + f.attack.active;
    const tAttack = attacking && f.attack ? clamp(f.stateT / Math.max(.001, f.attack.total),0,1) : 0;
    const startupRatio = attacking && f.attack ? clamp(f.stateT / Math.max(.001, f.attack.startup),0,1) : 0;
    const activeRatio = attacking && f.attack ? clamp((f.stateT - f.attack.startup) / Math.max(.001, f.attack.active),0,1) : 0;
    const attackPunch = attacking ? Math.sin(Math.min(1,tAttack) * Math.PI) : 0;
    const strikePop = active ? Math.sin(activeRatio * Math.PI) : 0;
    const recoil = hurt ? Math.sin(Math.min(1,f.stateT/.22)*Math.PI) : 0;
    const walkCycle = Math.sin(time/78);
    const idleBreathe = Math.sin(time/360);
    const aspect = img.naturalWidth / Math.max(1,img.naturalHeight);
    const spriteH = fighterVisualHeight(f);
    const spriteW = spriteH * aspect;

    const stateLean =
      walking ? clamp((f.vx||0)/360, -.16, .16) :
      attacking ? dir * (startupRatio < 1 ? -.12 * (1-startupRatio) : .18 * strikePop) :
      blocking ? -dir*.08 :
      hurt ? -dir*.22*recoil :
      dodging ? -dir*.28 :
      0;

    const bob = walking ? Math.abs(walkCycle)*18 : idleBreathe*4;
    const poseX = walking ? Math.sin(time/84)*12 : 0;
    const poseY = attacking ? -attackPunch*16 : hurt ? recoil*12 : 0;
    const lungeX = attacking ? dir * (atkName === 'ultimate' ? 70 : atkName === 'special' ? 52 : atkName === 'heavy' ? 42 : 28) * attackPunch : 0;
    const dodgeX = dodging ? -dir * (80 * Math.max(0,1-f.stateT/.28)) : 0;
    const squashX = 1 + (walking ? Math.abs(walkCycle)*.045 : 0) + (attacking ? attackPunch*.08 : 0);
    const squashY = 1 - (walking ? Math.abs(walkCycle)*.020 : 0) - (attacking ? attackPunch*.035 : 0);

    const drawX = f.x + poseX + lungeX + dodgeX;
    const drawY = f.y + bob + poseY;

    ctx.save();

    // Strong readable contact shadow.
    ctx.save();
    const shadow = ctx.createRadialGradient(f.x, f.y+12, 8, f.x, f.y+12, spriteW*.48);
    shadow.addColorStop(0,'rgba(0,0,0,.78)');
    shadow.addColorStop(.55,'rgba(0,0,0,.36)');
    shadow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y+14, spriteW*.34, 22, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Afterimage on dodge/attack/hit so movement is visible even with a single PNG.
    if (dodging || attacking || hurt || Math.abs(f.vx) > 180) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const trailColor = isEnemy ? 'rgba(70,190,255,.20)' : 'rgba(255,45,60,.20)';
      for (let i=1;i<=3;i++){
        ctx.globalAlpha = (dodging ? .22 : .11) / i;
        ctx.filter = `blur(${i*1.6}px)`;
        const tx = drawX - dir*i*(dodging ? 36 : attacking ? 28 : 18);
        ctx.save();
        ctx.translate(tx, drawY);
        ctx.scale(dir*squashX, squashY);
        ctx.rotate(stateLean*.55);
        ctx.drawImage(img, -spriteW/2, -spriteH, spriteW, spriteH);
        ctx.restore();
      }
      ctx.filter = 'none';
      ctx.restore();
    }

    // Colored aura behind character.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(f.x, f.y-spriteH*.48, 12, f.x, f.y-spriteH*.48, spriteW*.62);
    aura.addColorStop(0, isEnemy ? 'rgba(70,190,255,.18)' : 'rgba(255,40,58,.16)');
    aura.addColorStop(.48, isEnemy ? 'rgba(70,190,255,.055)' : 'rgba(255,40,58,.050)');
    aura.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y-spriteH*.48, spriteW*.45, spriteH*.52, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Attack slash behind/through sprite.
    if (attacking) {
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(1,1);
      drawRigSlash(f, spriteH, attackPunch, active, atkName);
      ctx.restore();
    }

    // Main fighter image.
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(dir*squashX, squashY);
    ctx.rotate(stateLean);
    if (hurt) {
      ctx.filter = 'brightness(1.35) contrast(1.1) drop-shadow(0 0 18px rgba(255,80,80,.72))';
    } else if (active) {
      ctx.filter = `brightness(1.22) contrast(1.10) drop-shadow(0 0 18px ${isEnemy?'rgba(80,210,255,.58)':'rgba(255,60,70,.58)'})`;
    } else if (blocking) {
      ctx.filter = 'brightness(.92) contrast(1.05) drop-shadow(0 0 16px rgba(120,210,255,.45))';
    } else {
      ctx.filter = `brightness(.96) contrast(1.06) drop-shadow(0 0 10px ${isEnemy?'rgba(60,180,255,.25)':'rgba(255,35,50,.20)'})`;
    }
    ctx.drawImage(img, -spriteW/2, -spriteH, spriteW, spriteH);
    ctx.filter = 'none';
    ctx.restore();

    // Visible guard shield.
    if (blocking) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const shieldX = f.x + dir * spriteW * .18;
      const shieldY = f.y - spriteH*.49;
      const grd = ctx.createRadialGradient(shieldX,shieldY,8,shieldX,shieldY,spriteH*.30);
      grd.addColorStop(0,'rgba(140,230,255,.30)');
      grd.addColorStop(.55,'rgba(80,190,255,.14)');
      grd.addColorStop(1,'rgba(80,190,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(shieldX, shieldY, spriteH*.16, spriteH*.27, dir*.10, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,230,255,.72)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(shieldX, shieldY, spriteH*.14, spriteH*.24, dir*.10, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    // Knockdown / hit visual readable label.
    if (hurt) {
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.fillStyle = 'rgba(255,70,80,.24)';
      ctx.beginPath();
      ctx.ellipse(f.x - dir*spriteW*.18, f.y-spriteH*.55, spriteW*.22, spriteH*.23, -dir*.3, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // Name plate follows feet without covering body.
    ctx.save();
    ctx.translate(f.x, f.y + 34);
    ctx.rotate(clamp((f.vx||0)/1600, -.08, .08));
    ctx.fillStyle = 'rgba(2,3,6,.78)';
    ctx.strokeStyle = isEnemy ? 'rgba(80,190,255,.42)' : 'rgba(201,40,50,.46)';
    ctx.lineWidth = 2;
    const plateW = isEnemy ? 158 : 128;
    ctx.beginPath();
    ctx.roundRect(-plateW/2, 0, plateW, 25, 11);
    ctx.fill();
    ctx.stroke();
    ctx.font = '800 12px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isEnemy ? '#c8eeff' : '#ffd08a';
    ctx.fillText((f.name || (isEnemy ? 'IRON WARDEN' : 'RAVEN')).toUpperCase(), 0, 13);
    ctx.restore();

    ctx.restore();
    return true;
  }



  /* Arena Flow 16.3 — Start Flow Layer Guard
     Hardens the whole launch chain:
     - real-art Start always opens visible Character Select above menu
     - Character Select Start always opens visible Arena Select above menu
     - Arena Select Start always starts combat and hides all overlays/menu
  */
  function forceVisibleOverlay16_3(id, bodyClass, zIndex){
    const el = document.getElementById(id);
    if (!el) return null;
    if (bodyClass) document.body.classList.add(bodyClass);
    el.style.setProperty('display', 'flex', 'important');
    el.style.setProperty('visibility', 'visible', 'important');
    el.style.setProperty('pointer-events', 'auto', 'important');
    el.style.setProperty('z-index', String(zIndex), 'important');
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('show');
    return el;
  }

  function hideOverlay16_3(id, bodyClass){
    const el = document.getElementById(id);
    if (bodyClass) document.body.classList.remove(bodyClass);
    if (!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    if (id === 'characterSelect' || id === 'arenaSelect') {
      window.setTimeout(() => {
        if (!el.classList.contains('show')) el.style.setProperty('display', 'none', 'important');
      }, 80);
    }
  }

  function openCharacterSelect16_3(source='start_gate_16_3'){
    if (gameState !== 'menu' && gameState !== 'result') gameState = 'menu';
    try { audio.ensure(); audio.ui(); } catch(_) {}
    try {
      contentBundle.balance = contentBundle.balance || {};
      const savedDiff = currentDifficulty14();
      contentBundle.balance.aiDifficulty = difficultyToValue(savedDiff);
      contentState.fighterId = contentState.fighterId || 'raven';
      contentState.enemyId = opponentForSelectedFighter(contentState.fighterId);
      contentBundle.balance.activeFighterId = contentState.fighterId;
      contentBundle.balance.enemyFighterId = contentState.enemyId;
      saveContentState();
      trackEvent('character_select_open', { source, patch:'16.3_layer_fix' });
      updateCharacterSelectUI();
    } catch(err) { console.warn('Arena Flow 16.3 character prefill failed', err); }
    forceVisibleOverlay16_3('characterSelect', 'character-select-open', 180);
  }

  function openArenaSelect16_3(source='character_start_16_3'){
    if (gameState !== 'menu' && gameState !== 'result') gameState = 'menu';
    try {
      contentBundle.balance = contentBundle.balance || {};
      const diff = currentDifficulty14();
      contentBundle.balance.aiDifficulty = difficultyToValue(diff);
      contentState.fighterId = contentState.fighterId || 'raven';
      contentState.enemyId = opponentForSelectedFighter(contentState.fighterId);
      contentState.arenaId = currentArena15();
      contentBundle.balance.activeFighterId = contentState.fighterId;
      contentBundle.balance.enemyFighterId = contentState.enemyId;
      contentBundle.balance.activeArenaId = contentState.arenaId;
      saveContentState();
      trackEvent('arena_select_open', { source, patch:'16.3_layer_fix' });
      updateArenaSelectUI();
    } catch(err) { console.warn('Arena Flow 16.3 arena prefill failed', err); }
    hideOverlay16_3('characterSelect', 'character-select-open');
    window.setTimeout(() => forceVisibleOverlay16_3('arenaSelect', 'arena-select-open', 181), 90);
  }

  function startSelectedArenaMatch16_3(source='arena_start_16_3'){
    try {
      contentBundle.balance = contentBundle.balance || {};
      contentState.fighterId = contentState.fighterId || 'raven';
      contentState.enemyId = contentState.enemyId || opponentForSelectedFighter(contentState.fighterId);
      contentState.arenaId = currentArena15();
      contentBundle.balance.activeFighterId = contentState.fighterId;
      contentBundle.balance.enemyFighterId = contentState.enemyId;
      contentBundle.balance.activeArenaId = contentState.arenaId;
      saveContentState();
      trackEvent('fight_start', {
        source,
        patch:'16.3_layer_fix',
        fighter: contentState.fighterId,
        enemy: contentState.enemyId,
        arena: contentState.arenaId,
        difficulty: currentDifficulty14()
      });
    } catch(err) { console.warn('Arena Flow 16.3 start state failed', err); }

    hideOverlay16_3('characterSelect', 'character-select-open');
    hideOverlay16_3('arenaSelect', 'arena-select-open');
    try { audio.ensure(); audio.ui(); } catch(_) {}

    let launched = false;
    const launch = () => {
      if (launched) return;
      launched = true;
      const ar = document.getElementById('arenaReveal16');
      if (ar) {
        ar.classList.remove('show');
        ar.setAttribute('aria-hidden','true');
        ar.style.setProperty('display','none','important');
      }
      newMatch();
    };

    try {
      showArenaReveal16(launch);
    } catch(err) {
      console.warn('Arena Flow 16.3 reveal fallback to direct match', err);
      launch();
    }

    window.setTimeout(() => {
      if (!document.body.classList.contains('is-fighting') && gameState !== 'fight') launch();
    }, 1250);
    window.setTimeout(() => {
      if (gameState === 'fight') {
        document.body.classList.add('is-fighting');
        ui.menu?.style?.setProperty('display', 'none', 'important');
      }
    }, 1550);
  }

  function bindArenaFlowLayerFix16_3(){
    const hardBind = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      ['pointerdown','click','touchend'].forEach(type => {
        el.addEventListener(type, (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          fn(type);
        }, { capture:true, passive:false });
      });
    };

    hardBind('startBtn', () => openCharacterSelect16_3('start_button_16_3'));
    hardBind('realStartZone', () => openCharacterSelect16_3('real_start_zone_16_3'));
    hardBind('csStartFightBtn', () => openArenaSelect16_3('character_start_button_16_3'));
    hardBind('asStartFightBtn', () => startSelectedArenaMatch16_3('arena_start_button_16_3'));

    // Coordinate shield for the painted big "НАЧАТЬ БОЙ" button.
    const handlePaintedStart = (event) => {
      if (!document.body.classList.contains('real-art-v4')) return;
      if (document.body.classList.contains('character-select-open') || document.body.classList.contains('arena-select-open')) return;
      if (gameState !== 'menu' && gameState !== 'result') return;
      const p = event.changedTouches?.[0] || event;
      if (!p || typeof p.clientX !== 'number') return;
      const lobby = document.querySelector('#menu .dc-v3-lobby') || ui.menu;
      if (!lobby) return;
      const r = lobby.getBoundingClientRect();
      if (r.width < 100 || r.height < 100) return;
      const x = ((p.clientX - r.left) / r.width) * 100;
      const y = ((p.clientY - r.top) / r.height) * 100;
      // Wider than the painted button so browser scaling/Vercel viewport differences cannot miss it.
      const insideBigStart = x >= 24 && x <= 72 && y >= 63 && y <= 87;
      if (!insideBigStart) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      openCharacterSelect16_3('painted_start_shield_16_3');
    };
    document.addEventListener('pointerdown', handlePaintedStart, { capture:true, passive:false });
    document.addEventListener('click', handlePaintedStart, { capture:true, passive:false });
    document.addEventListener('touchend', handlePaintedStart, { capture:true, passive:false });

    window.eralashStartFight = () => openCharacterSelect16_3('window_api_16_3');
    window.eralashOpenArenaSelect = () => openArenaSelect16_3('window_api_16_3');
    window.eralashDirectFight = () => startSelectedArenaMatch16_3('window_api_direct_16_3');
  }


  resize();
  bindControls();
  bindEconomyControls();
  bindRealArtClickMap();
  bindCharacterSelect();
  bindArenaSelect();
  bindArenaFlowLayerFix16_3();
  initTelegram();
  setTimeout(()=>trackEvent('app_open', { insideTelegram:telegramContext.insideTelegram }), 650);
  window.addEventListener('resize', resize);
  window.eralashStartFight = () => openCharacterSelect16_3('window_api_16_3');
  window.eralashOpenArenaSelect = () => openArenaSelect16_3('window_api_16_3');
  window.eralashDirectFight = () => startSelectedArenaMatch16_3('window_api_direct_16_3');

  raf = requestAnimationFrame((t)=>{ last=t; loop(t); });
})();
