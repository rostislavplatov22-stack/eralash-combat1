/* ERALASH COMBAT 31.2 — final runtime renderer takeover */
(() => {
  'use strict';
  if (window.__HC312_INSTALLED__) return;
  window.__HC312_INSTALLED__ = true;

  const VERSION = '31.2';
  const GHLUM_RE = /ghlum|gollum|cave[ _-]?devourer/i;
  const RAVEN_SRC_RE = /(shadow[ _-]?raven|\braven\b|fighter[ _-]?(?:real[ _-]?)?player|player[ _-]?(?:fighter|idle|walk|attack|hit|block|heavy|light)|attack[ _-]?pose[ _-]?player)/i;
  const sheets = {};
  const sheetSpec = {
    idle:    ['assets/ghlum312/ghlum-idle-30.png', 6, 7],
    walk:    ['assets/ghlum312/ghlum-idle-30.png', 6, 9],
    block:   ['assets/ghlum312/ghlum-block-30.png', 6, 8],
    hit:     ['assets/ghlum312/ghlum-block-30.png', 6, 11],
    attack:  ['assets/ghlum312/ghlum-attack-30.png', 6, 12],
    special: ['assets/ghlum312/ghlum-special-30.png', 6, 12],
    jump:    ['assets/ghlum312/ghlum-jump-30.png', 6, 10],
    ko:      ['assets/ghlum312/ghlum-ko-30.png', 6, 8]
  };
  for (const [key, [src, frames, fps]] of Object.entries(sheetSpec)) {
    const img = new Image();
    img.decoding = 'async';
    img._hc312Ghlum = true;
    img.src = src + '?v=312';
    sheets[key] = { img, frames, fps };
  }

  const val = (fn, fallback) => { try { const v = fn(); return v == null ? fallback : v; } catch (_) { return fallback; } };
  const getPlayer = () => val(() => player, window.player || null);
  const getEnemy = () => val(() => enemy, window.enemy || null);
  const getCtx = () => val(() => ctx, document.querySelector('canvas#game,canvas')?.getContext('2d') || null);
  const getW = c => val(() => w, c?.canvas?.width || innerWidth);
  const getH = c => val(() => h, c?.canvas?.height || innerHeight);
  const fighting = () => val(() => gameState === 'fight', false) || document.body.classList.contains('is-fighting') || document.body.dataset.gameState === 'fight';

  function identity(f) {
    const hud = document.getElementById('hc311PName')?.textContent || '';
    const selected = val(() => contentState?.fighterId, '') || val(() => contentBundle?.balance?.activeFighterId, '');
    const stored = (() => { try { return localStorage.getItem('eralashCombatSelectedFighter28') || ''; } catch (_) { return ''; } })();
    return [f?.contentId, f?.fighterId, f?.characterId, f?.selectedId, f?.name, selected, stored, hud].filter(Boolean).join('|').toLowerCase();
  }
  function selectedGhlum() { return GHLUM_RE.test(identity(getPlayer())); }
  function isPlayerFighter(f) {
    const p = getPlayer();
    if (!f || typeof f !== 'object') return false;
    return f === p || f.id === 'player' || f.side === 'player' || f.team === 'player';
  }
  function forceIdentity() {
    const p = getPlayer();
    if (!p || !selectedGhlum()) return;
    try {
      p.name = 'Ghlum';
      p.contentId = 'ghlum';
      p.fighterId = 'ghlum';
      p.characterId = 'ghlum';
      p.selectedId = 'ghlum';
      if (typeof contentState !== 'undefined' && contentState) contentState.fighterId = 'ghlum';
      if (typeof contentBundle !== 'undefined' && contentBundle?.balance) contentBundle.balance.activeFighterId = 'ghlum';
    } catch (_) {}
  }

  function animFor(f) {
    const state = String(f?.state || '').toLowerCase();
    const atk = String(f?.attack?.name || f?.lastAttackType || '').toLowerCase();
    if (state.includes('knock') || state === 'ko' || Number(f?.hp) <= 0) return sheets.ko;
    if (state.includes('hit') || state.includes('stun') || state.includes('stagger')) return sheets.hit;
    if (state.includes('block') || f?.blocking) return sheets.block;
    if (state.includes('jump') || state.includes('air') || Math.abs(Number(f?.vy || 0)) > 45) return sheets.jump;
    if (state.includes('attack') || f?.attack) {
      return /special|ultimate|finisher/.test(atk) ? sheets.special : sheets.attack;
    }
    if (state.includes('walk') || state.includes('run') || Math.abs(Number(f?.vx || 0)) > 35) return sheets.walk;
    return sheets.idle;
  }
  function frameFor(f, a) {
    const n = Math.max(1, a?.frames || 6);
    const stateT = Math.max(0, Number(f?.stateT || 0));
    if (f?.attack) {
      const total = Math.max(.001, Number(f.attack.total || f.attack.duration || .45));
      return Math.min(n - 1, Math.floor(Math.min(.999, stateT / total) * n));
    }
    if (/knock|ko|hit|stun/i.test(String(f?.state || ''))) {
      return Math.min(n - 1, Math.floor(Math.min(.999, stateT / .85) * n));
    }
    return Math.floor(((performance.now() / 1000) * (a?.fps || 8)) % n);
  }

  function drawGhlum312(f, targetCtx = getCtx()) {
    if (!fighting() || !selectedGhlum() || !isPlayerFighter(f) || !targetCtx) return false;
    const a = animFor(f), img = a?.img;
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return true;
    const frames = Math.max(1, a.frames || 6);
    const frame = frameFor(f, a);
    const fw = img.naturalWidth / frames, fh = img.naturalHeight;
    const W = getW(targetCtx), H = getH(targetCtx);
    const coarse = !!(matchMedia && matchMedia('(pointer:coarse)').matches);
    let sh = coarse ? Math.max(280, Math.min(H * .56, 490)) : Math.max(430, Math.min(H * .64, 690));
    let sw = sh * (fw / Math.max(1, fh));
    const maxW = coarse ? W * .40 : W * .30;
    if (sw > maxW) { const k = maxW / sw; sw *= k; sh *= k; }
    const dir = Number(f?.dir || 1) < 0 ? -1 : 1;
    const atkP = f?.attack ? Math.min(1, Math.max(0, Number(f.stateT || 0) / Math.max(.001, Number(f.attack.total || .45)))) : 0;
    const impulse = f?.attack ? Math.sin(atkP * Math.PI) : 0;
    const x = Number(f?.x || W * .28) + dir * impulse * (/ultimate|special/i.test(String(f?.attack?.name || '')) ? 42 : 24);
    const y = Number(f?.y || H * .78);

    targetCtx.save();
    const shadowW = Math.max(90, sw * .34);
    const g = targetCtx.createRadialGradient(x, y + 7, 7, x, y + 7, shadowW);
    g.addColorStop(0, 'rgba(0,0,0,.94)');
    g.addColorStop(.48, 'rgba(0,0,0,.50)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    targetCtx.fillStyle = g;
    targetCtx.beginPath();
    targetCtx.ellipse(x, y + 8, shadowW, 21, 0, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();

    if (f?.attack && /special|ultimate/i.test(String(f.attack.name || ''))) {
      targetCtx.save();
      targetCtx.globalCompositeOperation = 'lighter';
      targetCtx.globalAlpha = .18 + .28 * impulse;
      const aura = targetCtx.createRadialGradient(x, y - sh * .52, 0, x, y - sh * .52, sw * .72);
      aura.addColorStop(0, 'rgba(132,255,73,.70)');
      aura.addColorStop(.42, 'rgba(60,214,48,.24)');
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      targetCtx.fillStyle = aura;
      targetCtx.beginPath();
      targetCtx.ellipse(x, y - sh * .50, sw * .60, sh * .44, 0, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();
    }

    targetCtx.save();
    targetCtx.translate(x, y);
    targetCtx.scale(dir, 1);
    targetCtx.filter = /hit|stun|knock/i.test(String(f?.state || '')) ? 'brightness(1.38) contrast(1.18)' : 'brightness(1.08) contrast(1.16) saturate(.96)';
    targetCtx.shadowColor = f?.attack ? 'rgba(104,255,67,.60)' : 'rgba(0,0,0,.90)';
    targetCtx.shadowBlur = f?.attack ? 24 : 14;
    targetCtx.drawImage(img, frame * fw, 0, fw, fh, -sw * .5, -sh, sw, sh);
    targetCtx.restore();
    return true;
  }
  window.drawGhlum312 = drawGhlum312;

  function wrapFunction(name) {
    try {
      const original = window[name];
      if (typeof original !== 'function' || original.__hc312Wrapped) return;
      const wrapped = function(...args) {
        const f = args.find(v => v && typeof v === 'object' && ('x' in v || 'hp' in v || 'state' in v));
        if (fighting() && selectedGhlum() && isPlayerFighter(f) && drawGhlum312(f)) return true;
        return original.apply(this, args);
      };
      wrapped.__hc312Wrapped = true;
      wrapped.__hc312Original = original;
      window[name] = wrapped;
    } catch (_) {}
  }
  const functionNames = [
    'drawPremiumFighterArt','drawSpriteSheetFighter','drawFighterArt','drawCombatFighterArt',
    'renderFighterArt','drawTrueFighter','drawTrueFighter22','drawFighter22','drawFighter24'
  ];

  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  if (!originalDrawImage.__hc312Wrapped) {
    const patchedDrawImage = function(image, ...args) {
      try {
        const gameCanvas = document.querySelector('canvas#game,canvas');
        if (this.canvas === gameCanvas && fighting() && selectedGhlum() && image && !image._hc312Ghlum && isLegacyRavenImage(image)) {
          const f = getPlayer();
          const a = animFor(f), img = a?.img;
          if (img?.complete && img.naturalWidth && img.naturalHeight) {
            const n = Math.max(1, a.frames || 6), fw = img.naturalWidth / n, fh = img.naturalHeight, frame = frameFor(f, a);
            if (args.length === 4) {
              let [dx, dy, dw, dh] = args;
              const signW = Math.sign(dw || 1), signH = Math.sign(dh || 1);
              const aw = Math.abs(dw), ah = Math.abs(dh);
              let th = ah * 1.02, tw = th * (fw / fh);
              if (tw > aw * .96) { const k = (aw * .96) / tw; tw *= k; th *= k; }
              const tx = dx + signW * ((aw - tw) * .5);
              const ty = dy + signH * (ah - th);
              return originalDrawImage.call(this, img, frame * fw, 0, fw, fh, tx, ty, tw * signW, th * signH);
            }
            if (args.length === 8) {
              const [,,,, dx, dy, dw, dh] = args;
              const aw = Math.abs(dw), ah = Math.abs(dh), signW = Math.sign(dw || 1), signH = Math.sign(dh || 1);
              let th = ah * 1.02, tw = th * (fw / fh);
              if (tw > aw * .96) { const k = (aw * .96) / tw; tw *= k; th *= k; }
              const tx = dx + signW * ((aw - tw) * .5), ty = dy + signH * (ah - th);
              return originalDrawImage.call(this, img, frame * fw, 0, fw, fh, tx, ty, tw * signW, th * signH);
            }
          }
          return;
        }
      } catch (_) {}
      return originalDrawImage.call(this, image, ...args);
    };
    patchedDrawImage.__hc312Wrapped = true;
    CanvasRenderingContext2D.prototype.drawImage = patchedDrawImage;
  }

  function isLegacyRavenImage(image) {
    try {
      if (image?._hc312Ghlum) return false;
      const src = String(image?.currentSrc || image?.src || '').toLowerCase();
      if (RAVEN_SRC_RE.test(src)) return true;
      if (typeof premiumFighterArt !== 'undefined' && premiumFighterArt) {
        if (image === premiumFighterArt.player || image === premiumFighterArt.raven) return true;
      }
      if (typeof spriteFighterSheets !== 'undefined' && spriteFighterSheets?.player) {
        for (const v of Object.values(spriteFighterSheets.player)) if (v?.img === image || v === image) return true;
      }
      if (typeof attackPoseFrames26_3 !== 'undefined' && attackPoseFrames26_3?.player) {
        for (const list of Object.values(attackPoseFrames26_3.player)) {
          for (const v of (Array.isArray(list) ? list : [])) if (v?.img === image) return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function patchTextMethod(method) {
    const original = CanvasRenderingContext2D.prototype[method];
    if (typeof original !== 'function' || original.__hc312Wrapped) return;
    const wrapped = function(text, ...args) {
      try {
        const gameCanvas = document.querySelector('canvas#game,canvas');
        if (this.canvas === gameCanvas && fighting()) {
          const t = String(text || '').trim().replace(/\s+/g, ' ').toUpperCase();
          if (/^(FIGHT!?|ROUND\s*\d*|VS|VERSUS)$/.test(t) || (t.includes('GHLUM') && t.includes('WARDEN'))) return;
        }
      } catch (_) {}
      return original.call(this, text, ...args);
    };
    wrapped.__hc312Wrapped = true;
    CanvasRenderingContext2D.prototype[method] = wrapped;
  }
  patchTextMethod('fillText');
  patchTextMethod('strokeText');

  function installIntroShield() {
    if (document.getElementById('hc312IntroShield')) return;
    const style = document.createElement('style');
    style.id = 'hc312Style';
    style.textContent = `
      #hc312IntroShield{position:fixed;left:12%;right:12%;top:32%;height:31%;z-index:2147481500;display:none;pointer-events:none;align-items:center;justify-content:center;text-align:center;background:linear-gradient(90deg,transparent 0%,rgba(2,4,7,.94) 19%,rgba(3,5,8,.98) 50%,rgba(2,4,7,.94) 81%,transparent 100%);filter:drop-shadow(0 22px 34px rgba(0,0,0,.7));opacity:0;transition:opacity .18s ease}
      #hc312IntroShield.show{display:flex;opacity:1}
      #hc312IntroShield.fade{opacity:0}
      #hc312IntroShield strong{font:900 clamp(42px,6vw,92px)/.9 Georgia,serif;letter-spacing:.04em;text-transform:uppercase;background:linear-gradient(#fff7dc,#d6b96f 58%,#795522);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 8px 20px rgba(0,0,0,.9)}
      #hc312IntroShield small{display:block;margin-top:12px;color:#d5bd7d;font:700 15px/1 Georgia,serif;letter-spacing:.22em;text-transform:uppercase;text-shadow:0 3px 8px #000}
      body.is-fighting [data-hc312-hide="1"]{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}
      body.is-fighting #arenaIntro17,body.is-fighting .arena-intro-17,body.is-fighting #versusIntro,body.is-fighting .versus-intro,body.is-fighting #fightCallout,body.is-fighting .fight-callout,body.is-fighting #roundCallout,body.is-fighting .round-callout{display:none!important;opacity:0!important;visibility:hidden!important}
    `;
    document.head.appendChild(style);
    const shield = document.createElement('div');
    shield.id = 'hc312IntroShield';
    shield.innerHTML = '<div><strong id="hc312IntroBig">ROUND 1</strong><small id="hc312IntroSmall">Prepare for battle</small></div>';
    document.body.appendChild(shield);
  }

  let wasFighting = false;
  let introToken = 0;
  function playIntro() {
    const shield = document.getElementById('hc312IntroShield');
    if (!shield) return;
    const token = ++introToken;
    const roundNo = Math.max(1, Number(val(() => round, 1)) || 1);
    shield.classList.remove('fade'); shield.classList.add('show');
    document.getElementById('hc312IntroBig').textContent = 'ROUND ' + roundNo;
    document.getElementById('hc312IntroSmall').textContent = 'Prepare for battle';
    setTimeout(() => {
      if (token !== introToken) return;
      document.getElementById('hc312IntroBig').textContent = 'FIGHT';
      document.getElementById('hc312IntroSmall').textContent = '';
    }, 620);
    setTimeout(() => { if (token === introToken) shield.classList.add('fade'); }, 1180);
    setTimeout(() => { if (token === introToken) shield.classList.remove('show','fade'); }, 1450);
  }

  function hideLegacyDom() {
    const protectedRoot = document.getElementById('hardCombat311');
    const shield = document.getElementById('hc312IntroShield');
    for (const el of document.querySelectorAll('div,section,aside,article')) {
      if (protectedRoot?.contains(el) || shield?.contains(el) || el === shield) continue;
      if (el.dataset.hc312Hide === '1') continue;
      const rect = el.getBoundingClientRect?.();
      if (!rect || rect.width < 180 || rect.height < 70) continue;
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      if (cx < innerWidth * .18 || cx > innerWidth * .82 || cy < innerHeight * .20 || cy > innerHeight * .78) continue;
      const t = String(el.textContent || '').trim().replace(/\s+/g, ' ').toUpperCase();
      const legacyVs = (t.includes('VS') || t.includes('VERSUS')) && (t.includes('GHLUM') || t.includes('WARDEN') || t.includes('RAVEN'));
      const legacyCallout = /^(ROUND\s*\d+|FIGHT!?|VS|VERSUS)$/.test(t);
      if (legacyVs || legacyCallout) el.dataset.hc312Hide = '1';
    }
  }

  function tick() {
    const nowFighting = fighting();
    if (nowFighting) {
      forceIdentity();
      for (const name of functionNames) wrapFunction(name);
      hideLegacyDom();
    }
    if (nowFighting && !wasFighting) playIntro();
    if (!nowFighting && wasFighting) {
      document.getElementById('hc312IntroShield')?.classList.remove('show','fade');
      for (const el of document.querySelectorAll('[data-hc312-hide="1"]')) delete el.dataset.hc312Hide;
    }
    wasFighting = nowFighting;
    requestAnimationFrame(tick);
  }

  const start = () => { installIntroShield(); tick(); console.info('[ERALASH] Ghlum renderer takeover', VERSION); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
