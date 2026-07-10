/* ERALASH COMBAT 31.4 — final combat scale, intro and effects polish */
(() => {
  'use strict';
  if (window.__HC314_INSTALLED__) return;
  window.__HC314_INSTALLED__ = true;

  const VERSION = '31.4';
  const GHLUM_RE = /ghlum|gollum|cave[ _-]?devourer/i;
  const RAVEN_RE = /(shadow[ _-]?raven|fighter[ _-]?(?:real[ _-]?)?player|player[ _-]?(?:fighter|idle|walk|attack|hit|block|heavy|light)|attack[ _-]?pose[ _-]?player|\/raven(?:[-_.\/]|$))/i;
  const WARDEN_RE = /(iron[ _-]?warden|warden|\/warden(?:[-_.\/]|$)|blue.*fighter|enemy.*fighter)/i;

  const safe = (fn, fallback) => { try { const v = fn(); return v == null ? fallback : v; } catch { return fallback; } };
  const getPlayer = () => safe(() => player, window.player || null);
  const getEnemy = () => safe(() => enemy, window.enemy || null);
  const isFight = () => safe(() => gameState === 'fight', false) || document.body.classList.contains('is-fighting') || document.body.dataset.gameState === 'fight';
  const gameCanvas = () => document.querySelector('canvas#game, canvas');

  function selectedGhlum() {
    const fighter = getPlayer();
    const hudName = document.getElementById('hc311PName')?.textContent || '';
    const selected = safe(() => contentState?.fighterId, '') || safe(() => contentBundle?.balance?.activeFighterId, '');
    let stored = ''; try { stored = localStorage.getItem('eralashCombatSelectedFighter28') || ''; } catch {}
    const identity = [fighter?.contentId, fighter?.fighterId, fighter?.characterId, fighter?.selectedId, fighter?.name, selected, stored, hudName].filter(Boolean).join('|');
    return GHLUM_RE.test(identity);
  }

  function restoreCanvas() {
    const canvas = gameCanvas();
    if (!canvas) return;
    canvas.style.setProperty('display', 'block', 'important');
    canvas.style.setProperty('visibility', 'visible', 'important');
    canvas.style.setProperty('opacity', '1', 'important');
    canvas.style.removeProperty('filter');
  }

  function installStyles() {
    if (document.getElementById('hc314Style')) return;
    const style = document.createElement('style');
    style.id = 'hc314Style';
    style.textContent = `
      canvas#game, body.is-fighting canvas#game{display:block !important;visibility:visible !important;opacity:1 !important}
      #hardCombat311{z-index:2147482000 !important; pointer-events:none !important}
      #hardCombat311 *{pointer-events:auto}
      #hardCombat311 .hc311-top{left:14px !important;right:14px !important;top:10px !important;height:152px !important;grid-template-columns:minmax(0,1fr) 156px minmax(0,1fr) !important;gap:18px !important}
      #hardCombat311 .hc311-side{grid-template-columns:118px minmax(0,1fr) !important;gap:14px !important}
      #hardCombat311 .hc311-side.enemy{grid-template-columns:minmax(0,1fr) 118px !important}
      #hardCombat311 .hc311-portrait{width:114px !important;height:114px !important;box-shadow:0 0 0 3px #050506,0 0 30px rgba(209,173,97,.24),inset 0 0 24px #000 !important}
      #hardCombat311 .hc311-name{font-size:clamp(28px,2.3vw,38px) !important;margin:3px 0 8px !important}
      #hardCombat311 .hc311-bar-frame{height:31px !important}
      #hardCombat311 .hc311-energy-track{height:7px !important;margin-top:6px !important}
      #hardCombat311 .hc311-value{font-size:16px !important}
      #hardCombat311 .hc311-clock{width:148px !important;height:148px !important}
      #hardCombat311 .hc311-time{font-size:62px !important}
      #hardCombat311 .hc311-pips{bottom:-3px !important}
      #hardCombat311 .hc311-controls{left:18px !important;right:18px !important;bottom:10px !important;height:220px !important}
      #hardCombat311 .hc311-dpad{width:188px !important;height:188px !important}
      #hardCombat311 .hc311-dpad button{width:68px !important;height:68px !important;font-size:31px !important}
      #hardCombat311 .hc311-left{left:4px !important;top:60px !important}
      #hardCombat311 .hc311-right{right:4px !important;top:60px !important}
      #hardCombat311 .hc311-up{left:60px !important;top:4px !important}
      #hardCombat311 .hc311-down{left:60px !important;bottom:4px !important}
      #hardCombat311 .hc311-actions{width:min(580px,54vw) !important;height:210px !important}
      #hardCombat311 .hc311-btn{width:102px !important;height:102px !important}
      #hardCombat311 .hc311-btn b{font-size:29px !important}
      #hardCombat311 .hc311-btn span{font-size:12px !important}
      #hardCombat311 .hc311-light{left:0 !important;bottom:0 !important}
      #hardCombat311 .hc311-heavy{left:102px !important;bottom:72px !important}
      #hardCombat311 .hc311-jump-btn{left:204px !important;bottom:0 !important}
      #hardCombat311 .hc311-ult{right:110px !important;bottom:72px !important}
      #hardCombat311 .hc311-special{right:0 !important;top:4px !important}
      #hardCombat311 .hc311-block{right:0 !important;bottom:0 !important;width:118px !important;height:118px !important}
      #hardCombat311 .hc311-pause{bottom:14px !important;width:58px !important;height:58px !important}
      #hardCombat311 .hc311-banner{top:39.5% !important}
      #hardCombat311 .hc311-banner strong{font-size:clamp(46px,5.7vw,76px) !important;line-height:.92 !important;text-shadow:0 4px 0 rgba(25,16,7,.6),0 10px 24px #000 !important}
      #hardCombat311 .hc311-banner small{margin-top:8px !important;font-size:15px !important}
      #hc314Grade{position:fixed;inset:0;pointer-events:none;z-index:2147481500;background:
        radial-gradient(ellipse at 16% 58%, rgba(174,22,38,.24), transparent 28%),
        radial-gradient(ellipse at 84% 56%, rgba(41,118,231,.22), transparent 30%),
        radial-gradient(ellipse at 50% 80%, rgba(0,0,0,.18), transparent 36%),
        linear-gradient(180deg, rgba(3,4,7,.16), transparent 24%, transparent 78%, rgba(2,3,4,.28));
        mix-blend-mode:screen;opacity:.95}
      body.is-fighting #arenaIntro17, body.is-fighting .arena-intro-17,
      body.is-fighting #versusIntro, body.is-fighting .versus-intro,
      body.is-fighting #fightCallout, body.is-fighting .fight-callout,
      body.is-fighting #roundCallout, body.is-fighting .round-callout,
      body.is-fighting [data-hc-legacy-intro="1"]{display:none !important;opacity:0 !important;visibility:hidden !important;pointer-events:none !important}
      @media(max-width:900px){
        #hardCombat311 .hc311-top{left:6px !important;right:6px !important;top:4px !important;height:100px !important;grid-template-columns:minmax(0,1fr) 84px minmax(0,1fr) !important;gap:6px !important}
        #hardCombat311 .hc311-side{grid-template-columns:68px minmax(0,1fr) !important;gap:6px !important}
        #hardCombat311 .hc311-side.enemy{grid-template-columns:minmax(0,1fr) 68px !important}
        #hardCombat311 .hc311-portrait{width:66px !important;height:66px !important}
        #hardCombat311 .hc311-name{font-size:13px !important;margin:1px 0 3px !important}
        #hardCombat311 .hc311-bar-frame{height:18px !important;padding:3px !important}
        #hardCombat311 .hc311-energy-track{height:4px !important;margin-top:3px !important}
        #hardCombat311 .hc311-value{font-size:9px !important}
        #hardCombat311 .hc311-clock{width:82px !important;height:82px !important}
        #hardCombat311 .hc311-time{font-size:34px !important}
        #hardCombat311 .hc311-controls{left:7px !important;right:7px !important;bottom:5px !important;height:136px !important}
        #hardCombat311 .hc311-dpad{width:124px !important;height:124px !important}
        #hardCombat311 .hc311-dpad button{width:44px !important;height:44px !important;font-size:21px !important}
        #hardCombat311 .hc311-left{top:40px !important} #hardCombat311 .hc311-right{top:40px !important}
        #hardCombat311 .hc311-up{left:40px !important} #hardCombat311 .hc311-down{left:40px !important}
        #hardCombat311 .hc311-actions{width:320px !important;height:132px !important}
        #hardCombat311 .hc311-btn{width:70px !important;height:70px !important}
        #hardCombat311 .hc311-btn b{font-size:19px !important} #hardCombat311 .hc311-btn span{font-size:8px !important}
        #hardCombat311 .hc311-heavy{left:64px !important;bottom:45px !important}
        #hardCombat311 .hc311-jump-btn{left:128px !important}
        #hardCombat311 .hc311-ult{right:74px !important;bottom:45px !important}
        #hardCombat311 .hc311-block{width:80px !important;height:80px !important}
        #hardCombat311 .hc311-banner strong{font-size:48px !important}
        #hardCombat311 .hc311-banner small{font-size:11px !important}
      }`;
    document.head.appendChild(style);

    if (!document.getElementById('hc314Grade')) {
      const g = document.createElement('div');
      g.id = 'hc314Grade';
      document.body.appendChild(g);
    }
  }

  function hideLegacyIntroNodes() {
    const re = /^(ROUND\s*\d+|FIGHT|VS|GHLUM|IRON\s+WARDEN)$/i;
    for (const el of document.querySelectorAll('div,section,aside,span,strong,b')) {
      if (el.closest('#hardCombat311')) continue;
      const txt = String(el.textContent || '').trim().replace(/\s+/g, ' ');
      if (!txt || !re.test(txt)) continue;
      const rect = el.getBoundingClientRect?.();
      if (!rect || rect.width < 12 || rect.height < 12) continue;
      const nearCenter = rect.left < innerWidth * 0.78 && rect.right > innerWidth * 0.22 && rect.top < innerHeight * 0.65 && rect.bottom > innerHeight * 0.1;
      if (nearCenter) {
        el.setAttribute('data-hc-legacy-intro', '1');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    }
  }

  function isRavenImage(image) {
    if (!image || image._hc314Ghlum) return false;
    try {
      const src = String(image.currentSrc || image.src || '').toLowerCase();
      if (RAVEN_RE.test(src)) return true;
      if (typeof premiumFighterArt !== 'undefined' && premiumFighterArt) {
        if (image === premiumFighterArt.player || image === premiumFighterArt.raven) return true;
      }
    } catch {}
    return false;
  }

  function isWardenImage(image) {
    if (!image || image._hc314Ghlum) return false;
    try {
      const src = String(image.currentSrc || image.src || '').toLowerCase();
      if (WARDEN_RE.test(src)) return true;
      if (typeof premiumFighterArt !== 'undefined' && premiumFighterArt) {
        if (image === premiumFighterArt.enemy || image === premiumFighterArt.warden) return true;
      }
    } catch {}
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
    img._hc314Ghlum = true;
    img.src = src + '?v=314';
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
    const total = Math.max(1, anim?.frames || 6);
    const stateT = Math.max(0, Number(fighter?.stateT || 0));
    if (fighter?.attack) {
      const duration = Math.max(0.001, Number(fighter.attack.total || fighter.attack.duration || 0.46));
      return Math.min(total - 1, Math.floor(Math.min(0.999, stateT / duration) * total));
    }
    if (/knock|ko|hit|stun/i.test(String(fighter?.state || ''))) {
      return Math.min(total - 1, Math.floor(Math.min(0.999, stateT / 0.9) * total));
    }
    return Math.floor(((performance.now() / 1000) * (anim?.fps || 8)) % total);
  }

  function obtainCleanDrawImage() {
    try {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;left:-9999px;top:-9999px';
      document.documentElement.appendChild(frame);
      const clean = frame.contentWindow?.CanvasRenderingContext2D?.prototype?.drawImage;
      frame.remove();
      return typeof clean === 'function' ? clean : null;
    } catch { return null; }
  }

  function drawGroundShadow(ctx, dx, dy, dw, dh, color='rgba(0,0,0,.28)') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(dx + dw * 0.5, dy + dh * 0.98, Math.max(12, dw * 0.23), Math.max(6, dh * 0.05), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function scaledRect(dx, dy, dw, dh, side) {
    const scale = side === 'left' ? 1.38 : 1.34;
    const ndw = dw * scale;
    const ndh = dh * scale;
    const push = side === 'left' ? -dw * 0.18 : dw * 0.14;
    const ndx = dx - (ndw - dw) * 0.5 + push;
    const ndy = dy - (ndh - dh) * 0.78;
    return [ndx, ndy, ndw, ndh];
  }

  function installDrawPatch() {
    const current = CanvasRenderingContext2D.prototype.drawImage;
    const base = obtainCleanDrawImage() || current;
    if (typeof base !== 'function') return;
    if (current && current.__hc314Wrapped) return;

    const patched = function(image, ...args) {
      try {
        const canvas = gameCanvas();
        if (this.canvas === canvas && isFight()) {
          if (selectedGhlum() && isRavenImage(image)) {
            const fighter = getPlayer();
            const anim = animFor(fighter);
            const replacement = anim?.img;
            if (replacement?.complete && replacement.naturalWidth && replacement.naturalHeight) {
              const frames = Math.max(1, anim.frames || 6);
              const fw = replacement.naturalWidth / frames;
              const fh = replacement.naturalHeight;
              const frame = frameFor(fighter, anim);
              if (args.length === 4) {
                const [dx, dy, dw, dh] = args;
                const [ndx, ndy, ndw, ndh] = scaledRect(dx, dy, dw, dh, 'left');
                drawGroundShadow(this, ndx, ndy, ndw, ndh, 'rgba(6,10,5,.34)');
                return base.call(this, replacement, frame * fw, 0, fw, fh, ndx, ndy, ndw, ndh);
              }
              if (args.length === 8) {
                const [, , , , dx, dy, dw, dh] = args;
                const [ndx, ndy, ndw, ndh] = scaledRect(dx, dy, dw, dh, 'left');
                drawGroundShadow(this, ndx, ndy, ndw, ndh, 'rgba(6,10,5,.34)');
                return base.call(this, replacement, frame * fw, 0, fw, fh, ndx, ndy, ndw, ndh);
              }
            }
          }
          if (isWardenImage(image) && (args.length === 4 || args.length === 8)) {
            const rect = args.length === 4 ? args : args.slice(4);
            const [dx, dy, dw, dh] = rect;
            const [ndx, ndy, ndw, ndh] = scaledRect(dx, dy, dw, dh, 'right');
            drawGroundShadow(this, ndx, ndy, ndw, ndh, 'rgba(7,10,18,.30)');
            if (args.length === 4) return base.call(this, image, ndx, ndy, ndw, ndh);
            return base.call(this, image, args[0], args[1], args[2], args[3], ndx, ndy, ndw, ndh);
          }
        }
      } catch (err) {
        console.warn('[ERALASH 31.4] draw patch fallback', err);
      }
      return base.call(this, image, ...args);
    };
    patched.__hc314Wrapped = true;
    CanvasRenderingContext2D.prototype.drawImage = patched;
  }

  function forceIdentity() {
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
    } catch {}
  }

  function suppressCanvasText() {
    try {
      const proto = CanvasRenderingContext2D.prototype;
      if (proto.__hc314TextPatched) return;
      const original = proto.fillText;
      proto.fillText = function(text, ...args) {
        try {
          const t = String(text || '').trim().toUpperCase();
          const gx = gameCanvas();
          if (this.canvas === gx && /^(ROUND\s*\d+|FIGHT|VS|GHLUM|IRON WARDEN)$/.test(t)) return;
        } catch {}
        return original.call(this, text, ...args);
      };
      proto.__hc314TextPatched = true;
    } catch {}
  }

  function tick() {
    restoreCanvas();
    installStyles();
    hideLegacyIntroNodes();
    if (isFight()) forceIdentity();
    requestAnimationFrame(tick);
  }

  function start() {
    restoreCanvas();
    installStyles();
    suppressCanvasText();
    installDrawPatch();
    tick();
    console.info('[ERALASH] Final Combat Polish', VERSION);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
