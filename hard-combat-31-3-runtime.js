/* ERALASH COMBAT 31.3 — renderer recovery and safe Ghlum takeover */
(() => {
  'use strict';
  if (window.__HC313_INSTALLED__) return;
  window.__HC313_INSTALLED__ = true;

  const VERSION = '31.3';
  const GHLUM_RE = /ghlum|gollum|cave[ _-]?devourer/i;
  const RAVEN_RE = /(shadow[ _-]?raven|fighter[ _-]?(?:real[ _-]?)?player|player[ _-]?(?:fighter|idle|walk|attack|hit|block|heavy|light)|attack[ _-]?pose[ _-]?player|\/raven(?:[-_.\/]|$))/i;

  const safeValue = (fn, fallback) => {
    try {
      const value = fn();
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  };

  const getPlayer = () => safeValue(() => player, window.player || null);
  const isFighting = () =>
    safeValue(() => gameState === 'fight', false) ||
    document.body.classList.contains('is-fighting') ||
    document.body.dataset.gameState === 'fight';

  function selectedGhlum() {
    const fighter = getPlayer();
    const hudName = document.getElementById('hc311PName')?.textContent || '';
    const selected = safeValue(() => contentState?.fighterId, '') ||
      safeValue(() => contentBundle?.balance?.activeFighterId, '');
    let stored = '';
    try { stored = localStorage.getItem('eralashCombatSelectedFighter28') || ''; } catch (_) {}
    const identity = [
      fighter?.contentId,
      fighter?.fighterId,
      fighter?.characterId,
      fighter?.selectedId,
      fighter?.name,
      selected,
      stored,
      hudName
    ].filter(Boolean).join('|');
    return GHLUM_RE.test(identity);
  }

  function restoreSceneVisibility() {
    // 31.2 could mark a large centered game container as legacy and hide the entire canvas.
    document.getElementById('hc312Style')?.remove();
    document.getElementById('hc312IntroShield')?.remove();

    for (const el of document.querySelectorAll('[data-hc312-hide]')) {
      delete el.dataset.hc312Hide;
      el.removeAttribute('data-hc312-hide');
    }

    const canvas = document.querySelector('canvas#game, canvas');
    if (canvas) {
      canvas.style.setProperty('display', 'block', 'important');
      canvas.style.setProperty('visibility', 'visible', 'important');
      canvas.style.setProperty('opacity', '1', 'important');
      canvas.style.removeProperty('filter');

      let parent = canvas.parentElement;
      let depth = 0;
      while (parent && parent !== document.body && depth < 6) {
        if (parent.hasAttribute('data-hc312-hide')) {
          parent.removeAttribute('data-hc312-hide');
          delete parent.dataset.hc312Hide;
        }
        parent = parent.parentElement;
        depth += 1;
      }
    }
  }

  function installSafeOverlayRules() {
    if (document.getElementById('hc313Style')) return;
    const style = document.createElement('style');
    style.id = 'hc313Style';
    style.textContent = `
      canvas#game, body.is-fighting canvas#game {
        display:block !important;
        visibility:visible !important;
        opacity:1 !important;
      }
      body.is-fighting #arenaIntro17,
      body.is-fighting .arena-intro-17,
      body.is-fighting #versusIntro,
      body.is-fighting .versus-intro,
      body.is-fighting #fightCallout,
      body.is-fighting .fight-callout,
      body.is-fighting #roundCallout,
      body.is-fighting .round-callout {
        display:none !important;
        opacity:0 !important;
        visibility:hidden !important;
        pointer-events:none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function obtainCleanDrawImage() {
    try {
      const frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;left:-9999px;top:-9999px';
      document.documentElement.appendChild(frame);
      const clean = frame.contentWindow?.CanvasRenderingContext2D?.prototype?.drawImage;
      frame.remove();
      return typeof clean === 'function' ? clean : null;
    } catch (_) {
      return null;
    }
  }

  function isRavenImage(image) {
    if (!image || image._hc312Ghlum || image._hc313Ghlum) return false;
    try {
      const src = String(image.currentSrc || image.src || '').toLowerCase();
      if (RAVEN_RE.test(src)) return true;
      if (typeof premiumFighterArt !== 'undefined' && premiumFighterArt) {
        if (image === premiumFighterArt.player || image === premiumFighterArt.raven) return true;
      }
    } catch (_) {}
    return false;
  }

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
  const sheets = {};
  for (const [key, [src, frames, fps]] of Object.entries(sheetSpec)) {
    const img = new Image();
    img.decoding = 'async';
    img._hc313Ghlum = true;
    img.src = src + '?v=313';
    sheets[key] = { img, frames, fps };
  }

  function animFor(fighter) {
    const state = String(fighter?.state || '').toLowerCase();
    const attack = String(fighter?.attack?.name || fighter?.lastAttackType || '').toLowerCase();
    if (state.includes('knock') || state === 'ko' || Number(fighter?.hp) <= 0) return sheets.ko;
    if (state.includes('hit') || state.includes('stun') || state.includes('stagger')) return sheets.hit;
    if (state.includes('block') || fighter?.blocking) return sheets.block;
    if (state.includes('jump') || state.includes('air') || Math.abs(Number(fighter?.vy || 0)) > 45) return sheets.jump;
    if (state.includes('attack') || fighter?.attack) return /special|ultimate|finisher/.test(attack) ? sheets.special : sheets.attack;
    if (state.includes('walk') || state.includes('run') || Math.abs(Number(fighter?.vx || 0)) > 35) return sheets.walk;
    return sheets.idle;
  }

  function frameFor(fighter, anim) {
    const totalFrames = Math.max(1, anim?.frames || 6);
    const stateTime = Math.max(0, Number(fighter?.stateT || 0));
    if (fighter?.attack) {
      const duration = Math.max(.001, Number(fighter.attack.total || fighter.attack.duration || .45));
      return Math.min(totalFrames - 1, Math.floor(Math.min(.999, stateTime / duration) * totalFrames));
    }
    if (/knock|ko|hit|stun/i.test(String(fighter?.state || ''))) {
      return Math.min(totalFrames - 1, Math.floor(Math.min(.999, stateTime / .85) * totalFrames));
    }
    return Math.floor(((performance.now() / 1000) * (anim?.fps || 8)) % totalFrames);
  }

  function installSafeDrawImage() {
    const current = CanvasRenderingContext2D.prototype.drawImage;
    const clean = obtainCleanDrawImage();
    const base = clean || current;
    if (typeof base !== 'function') return;

    const safeDrawImage = function(image, ...args) {
      try {
        const gameCanvas = document.querySelector('canvas#game, canvas');
        if (this.canvas === gameCanvas && isFighting() && selectedGhlum() && isRavenImage(image)) {
          const fighter = getPlayer();
          const anim = animFor(fighter);
          const replacement = anim?.img;

          // Critical recovery rule: never erase the fighter while a replacement image is loading.
          if (!replacement?.complete || !replacement.naturalWidth || !replacement.naturalHeight) {
            return base.call(this, image, ...args);
          }

          const frames = Math.max(1, anim.frames || 6);
          const fw = replacement.naturalWidth / frames;
          const fh = replacement.naturalHeight;
          const frame = frameFor(fighter, anim);

          if (args.length === 2) {
            const [dx, dy] = args;
            return base.call(this, replacement, frame * fw, 0, fw, fh, dx, dy, fw, fh);
          }
          if (args.length === 4) {
            const [dx, dy, dw, dh] = args;
            return base.call(this, replacement, frame * fw, 0, fw, fh, dx, dy, dw, dh);
          }
          if (args.length === 8) {
            const [, , , , dx, dy, dw, dh] = args;
            return base.call(this, replacement, frame * fw, 0, fw, fh, dx, dy, dw, dh);
          }
        }
      } catch (error) {
        console.warn('[ERALASH 31.3] safe draw fallback', error);
      }
      return base.call(this, image, ...args);
    };

    safeDrawImage.__hc313Wrapped = true;
    safeDrawImage.__hc313Base = base;
    CanvasRenderingContext2D.prototype.drawImage = safeDrawImage;
  }

  function forceGhlumIdentity() {
    if (!selectedGhlum()) return;
    const fighter = getPlayer();
    if (!fighter) return;
    try {
      fighter.name = 'Ghlum';
      fighter.contentId = 'ghlum';
      fighter.fighterId = 'ghlum';
      fighter.characterId = 'ghlum';
      fighter.selectedId = 'ghlum';
      if (typeof contentState !== 'undefined' && contentState) contentState.fighterId = 'ghlum';
      if (typeof contentBundle !== 'undefined' && contentBundle?.balance) contentBundle.balance.activeFighterId = 'ghlum';
    } catch (_) {}
  }

  let frames = 0;
  function recoveryTick() {
    restoreSceneVisibility();
    if (isFighting()) forceGhlumIdentity();
    frames += 1;
    requestAnimationFrame(recoveryTick);
  }

  function start() {
    installSafeOverlayRules();
    restoreSceneVisibility();
    installSafeDrawImage();
    recoveryTick();
    console.info('[ERALASH] Renderer Recovery', VERSION);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
