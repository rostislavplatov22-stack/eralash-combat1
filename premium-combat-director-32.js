/* ERALASH COMBAT 32.0 — premium combat director (safe, no drawImage interception) */
(() => {
  'use strict';
  if (window.__HC320_INSTALLED__) return;
  window.__HC320_INSTALLED__ = true;

  const VERSION = '32.0';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const safe = (fn, fallback) => {
    try { const value = fn(); return value == null ? fallback : value; }
    catch (_) { return fallback; }
  };
  const playerRef = () => safe(() => player, window.player || null);
  const enemyRef = () => safe(() => enemy, window.enemy || null);
  const fighting = () => safe(() => gameState === 'fight', false) || document.body.classList.contains('is-fighting') || document.body.dataset.gameState === 'fight';
  const canvasRef = () => document.querySelector('canvas#game, canvas');

  let poisonUntil = 0;
  let evadeUntil = 0;
  let previousPlayerHp = null;
  let previousEnemyHp = null;
  let smoothScale = 1.055;
  let smoothX = 0;
  let smoothY = 3;
  let lastFightState = false;
  let lastRound = -1;

  function ensureDOM() {
    if (!document.getElementById('hc320Grade')) {
      const grade = document.createElement('div');
      grade.id = 'hc320Grade';
      document.body.appendChild(grade);
    }
    if (!document.getElementById('hc320Edge')) {
      const edge = document.createElement('div');
      edge.id = 'hc320Edge';
      document.body.appendChild(edge);
    }
    if (!document.getElementById('hc320Impact')) {
      const impact = document.createElement('div');
      impact.id = 'hc320Impact';
      impact.innerHTML = '<strong></strong><small></small>';
      document.body.appendChild(impact);
    }
    if (!document.getElementById('hc320Status')) {
      const status = document.createElement('div');
      status.id = 'hc320Status';
      status.innerHTML = '<span></span>';
      document.body.appendChild(status);
    }
    if (!document.getElementById('hc320Poison')) {
      const poison = document.createElement('div');
      poison.id = 'hc320Poison';
      poison.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
      document.body.appendChild(poison);
    }
    if (!document.getElementById('hc320Intro')) {
      const intro = document.createElement('div');
      intro.id = 'hc320Intro';
      intro.innerHTML = '<small></small><strong></strong>';
      document.body.appendChild(intro);
    }
  }

  function installStyles() {
    document.getElementById('hc315Style')?.remove();
    document.getElementById('hc315Light')?.remove();
    document.getElementById('hc314Style')?.remove();
    document.getElementById('hc314Grade')?.remove();
    if (document.getElementById('hc320Style')) return;

    const style = document.createElement('style');
    style.id = 'hc320Style';
    style.textContent = `
      :root{--hc32-gold:#d6b968;--hc32-gold2:#8f6a28;--hc32-red:#c61f35;--hc32-blue:#38a8ff;--hc32-green:#79d64a}
      canvas#game,body.is-fighting canvas#game{display:block!important;visibility:visible!important;opacity:1!important;transform-origin:50% 56%;will-change:transform,translate,filter;backface-visibility:hidden}
      #hardCombat311{z-index:2147482000!important;font-family:Georgia,'Times New Roman',serif!important}
      #hardCombat311 .hc311-top-mask{height:136px!important;background:linear-gradient(180deg,rgba(1,2,3,.92) 0%,rgba(2,3,5,.70) 48%,rgba(2,3,5,.20) 78%,transparent 100%)!important}
      #hardCombat311 .hc311-bottom-mask{height:172px!important;background:linear-gradient(0deg,rgba(1,2,3,.78) 0%,rgba(1,2,3,.40) 38%,rgba(1,2,3,.08) 74%,transparent 100%)!important}
      #hardCombat311 .hc311-grade{display:none!important}
      #hardCombat311 .hc311-top{left:16px!important;right:16px!important;top:10px!important;height:112px!important;grid-template-columns:minmax(0,1fr) 112px minmax(0,1fr)!important;gap:16px!important;filter:drop-shadow(0 10px 18px rgba(0,0,0,.72))!important}
      #hardCombat311 .hc311-side{grid-template-columns:84px minmax(0,1fr)!important;gap:11px!important}
      #hardCombat311 .hc311-side.enemy{grid-template-columns:minmax(0,1fr) 84px!important}
      #hardCombat311 .hc311-portrait{width:80px!important;height:80px!important;border:1px solid rgba(224,192,111,.90)!important;box-shadow:0 0 0 3px rgba(2,3,4,.92),0 0 22px rgba(209,173,97,.18),inset 0 0 18px #000!important}
      #hardCombat311 .hc311-name{font-size:clamp(21px,1.9vw,31px)!important;margin:1px 0 5px!important;letter-spacing:.045em!important;line-height:1!important}
      #hardCombat311 .hc311-bar-frame{height:23px!important;padding:3px!important;border-color:rgba(224,190,107,.72)!important;background:linear-gradient(180deg,rgba(22,23,25,.86),rgba(2,3,4,.94))!important}
      #hardCombat311 .hc311-hp{background:linear-gradient(180deg,#bfe66d,#72b83a 52%,#376f1d)!important;box-shadow:inset 0 2px rgba(255,255,255,.23),0 0 12px rgba(105,195,55,.28)!important}
      #hardCombat311 .hc311-energy-track{height:5px!important;margin-top:4px!important;border-color:rgba(209,173,97,.32)!important}
      #hardCombat311 .hc311-value{font-size:11px!important;margin-top:2px!important;opacity:.90!important}
      #hardCombat311 .hc311-clock{width:108px!important;height:108px!important}
      #hardCombat311 .hc311-time{font-size:46px!important}
      #hardCombat311 .hc311-pips{bottom:-3px!important;gap:6px!important}
      #hardCombat311 .hc311-pip{width:14px!important;height:14px!important}
      #hardCombat311 .hc311-controls{left:18px!important;right:18px!important;bottom:12px!important;height:156px!important;align-items:end!important}
      #hardCombat311 .hc311-dpad{width:132px!important;height:132px!important;background:radial-gradient(circle,rgba(33,34,37,.92) 0 19%,rgba(7,8,10,.78) 20% 58%,rgba(23,24,27,.80) 59% 63%,rgba(2,3,4,.76) 64%)!important;border:1px solid rgba(209,173,97,.55)!important;box-shadow:0 9px 22px rgba(0,0,0,.62),inset 0 0 20px #000,0 0 0 1px rgba(255,255,255,.035)!important;backdrop-filter:blur(7px)}
      #hardCombat311 .hc311-dpad button{width:46px!important;height:46px!important;font-size:21px!important;color:rgba(242,236,222,.88)!important}
      #hardCombat311 .hc311-left{left:3px!important;top:42px!important}#hardCombat311 .hc311-right{right:3px!important;top:42px!important}#hardCombat311 .hc311-up{left:42px!important;top:3px!important}#hardCombat311 .hc311-down{left:42px!important;bottom:3px!important}
      #hardCombat311 .hc311-actions{width:min(440px,43vw)!important;height:150px!important}
      #hardCombat311 .hc311-btn{width:76px!important;height:76px!important;border:1px solid rgba(217,185,104,.66)!important;background:radial-gradient(circle at 38% 30%,rgba(53,55,60,.92),rgba(9,10,13,.91) 58%,rgba(1,2,3,.94) 78%)!important;box-shadow:0 9px 22px rgba(0,0,0,.64),inset 0 0 0 3px rgba(2,3,4,.84),0 0 0 1px rgba(255,255,255,.035)!important;backdrop-filter:blur(8px);transition:transform .08s ease,filter .08s ease,box-shadow .18s ease!important}
      #hardCombat311 .hc311-btn b{font-size:22px!important;line-height:1!important}#hardCombat311 .hc311-btn span{font-size:8px!important;letter-spacing:.11em!important}
      #hardCombat311 .hc311-light{left:0!important;bottom:0!important}#hardCombat311 .hc311-heavy{left:75px!important;bottom:51px!important}#hardCombat311 .hc311-jump-btn{left:150px!important;bottom:0!important}#hardCombat311 .hc311-ult{right:80px!important;bottom:51px!important}#hardCombat311 .hc311-special{right:0!important;top:0!important}#hardCombat311 .hc311-block{right:0!important;bottom:0!important;width:88px!important;height:88px!important}
      #hardCombat311 .hc311-special{border-color:rgba(103,213,70,.78)!important;box-shadow:0 9px 22px rgba(0,0,0,.64),0 0 20px rgba(77,208,54,.13),inset 0 0 0 3px rgba(2,3,4,.84)!important}
      #hardCombat311 .hc311-ult{border-color:rgba(205,48,67,.82)!important;background:radial-gradient(circle at 38% 30%,rgba(104,27,38,.94),rgba(23,7,11,.94) 60%,rgba(2,3,4,.96) 80%)!important}
      #hardCombat311 .hc311-ult.hc32-ready{border-color:rgba(255,224,131,.98)!important;box-shadow:0 0 19px rgba(255,206,90,.38),0 9px 22px rgba(0,0,0,.64),inset 0 0 0 3px rgba(2,3,4,.82)!important;animation:hc32Ready .8s ease-in-out infinite alternate}
      #hardCombat311 .hc311-special.hc32-ready{box-shadow:0 0 19px rgba(101,231,68,.34),0 9px 22px rgba(0,0,0,.64),inset 0 0 0 3px rgba(2,3,4,.82)!important}
      #hardCombat311 .hc311-pause{width:42px!important;height:42px!important;bottom:13px!important;font-size:15px!important;background:rgba(4,5,7,.82)!important;backdrop-filter:blur(8px)}
      #hardCombat311 .hc311-banner{display:none!important}
      @keyframes hc32Ready{from{filter:brightness(1);transform:scale(1)}to{filter:brightness(1.25);transform:scale(1.035)}}
      #hc320Grade{position:fixed;inset:0;z-index:2147480500;pointer-events:none;background:radial-gradient(ellipse at 14% 58%,rgba(176,19,36,.18),transparent 30%),radial-gradient(ellipse at 86% 57%,rgba(29,112,232,.17),transparent 31%),linear-gradient(180deg,rgba(0,0,0,.10),transparent 22%,transparent 73%,rgba(0,0,0,.20));mix-blend-mode:screen;opacity:.90}
      #hc320Edge{position:fixed;inset:0;z-index:2147480600;pointer-events:none;opacity:0;box-shadow:inset 0 0 0 2px transparent,inset 0 0 110px 28px transparent}
      #hc320Edge.player{animation:hc32EdgeRed .22s ease-out}#hc320Edge.enemy{animation:hc32EdgeGold .18s ease-out}
      @keyframes hc32EdgeRed{0%{opacity:.9;box-shadow:inset 0 0 130px 34px rgba(183,20,39,.46)}100%{opacity:0;box-shadow:inset 0 0 60px 8px rgba(183,20,39,0)}}
      @keyframes hc32EdgeGold{0%{opacity:.78;box-shadow:inset 0 0 115px 25px rgba(225,184,80,.30)}100%{opacity:0;box-shadow:inset 0 0 55px 5px rgba(225,184,80,0)}}
      #hc320Impact{position:fixed;z-index:2147482200;left:50%;top:24%;transform:translate(-50%,-50%) scale(.92);pointer-events:none;text-align:center;opacity:0;filter:drop-shadow(0 12px 24px rgba(0,0,0,.78))}
      #hc320Impact strong{display:block;font:900 clamp(22px,2.5vw,40px)/.92 Georgia,'Times New Roman',serif;letter-spacing:.09em;color:#f8e6ab;text-transform:uppercase;text-shadow:0 2px 0 #3c2710,0 6px 18px #000}#hc320Impact small{display:block;margin-top:5px;font:800 9px/1 system-ui;letter-spacing:.22em;color:rgba(242,235,216,.72);text-transform:uppercase}
      #hc320Impact.show{animation:hc32Impact .54s cubic-bezier(.16,.88,.25,1)}
      @keyframes hc32Impact{0%{opacity:0;transform:translate(-50%,-50%) scale(.74)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}70%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-56%) scale(.96)}}
      #hc320Status{position:fixed;z-index:2147482150;pointer-events:none;opacity:0;transform:translate(-50%,-50%) translateY(8px);padding:5px 11px;border:1px solid rgba(98,190,255,.55);border-radius:999px;background:linear-gradient(180deg,rgba(8,18,28,.88),rgba(2,5,9,.72));box-shadow:0 8px 24px rgba(0,0,0,.62),0 0 18px rgba(54,157,255,.15);backdrop-filter:blur(8px)}
      #hc320Status span{font:900 9px/1 system-ui;letter-spacing:.20em;color:#dff3ff;text-transform:uppercase}#hc320Status.show{animation:hc32Status .72s ease-out}
      @keyframes hc32Status{0%{opacity:0;transform:translate(-50%,-50%) translateY(13px) scale(.92)}18%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) translateY(-12px) scale(.97)}}
      #hc320Poison{position:fixed;z-index:2147480700;width:128px;height:84px;pointer-events:none;opacity:0;transform:translate(-50%,-50%);background:radial-gradient(ellipse,rgba(105,231,61,.20),rgba(54,159,31,.07) 42%,transparent 72%);filter:blur(.1px);mix-blend-mode:screen}
      #hc320Poison.show{opacity:1;animation:hc32PoisonAura .72s ease-out}#hc320Poison i{position:absolute;width:5px;height:5px;border-radius:50%;background:#9cff6d;box-shadow:0 0 10px #6cff3a;animation:hc32Particle .75s ease-out both}#hc320Poison i:nth-child(1){left:18%;top:64%;animation-delay:.03s}#hc320Poison i:nth-child(2){left:35%;top:52%;animation-delay:.09s}#hc320Poison i:nth-child(3){left:58%;top:66%;animation-delay:.14s}#hc320Poison i:nth-child(4){left:72%;top:48%;animation-delay:.18s}#hc320Poison i:nth-child(5){left:47%;top:73%;animation-delay:.22s}
      @keyframes hc32PoisonAura{0%{opacity:0;transform:translate(-50%,-50%) scale(.75)}25%{opacity:.9;transform:translate(-50%,-50%) scale(1.05)}100%{opacity:0;transform:translate(-50%,-62%) scale(1.22)}}@keyframes hc32Particle{0%{opacity:0;transform:translateY(10px) scale(.5)}25%{opacity:1}100%{opacity:0;transform:translateY(-42px) scale(1.2)}}
      #hc320Intro{position:fixed;z-index:2147482250;left:50%;top:42%;transform:translate(-50%,-50%);pointer-events:none;text-align:center;opacity:0}#hc320Intro small{display:block;font:900 10px/1 system-ui;letter-spacing:.34em;color:rgba(221,190,111,.9);text-transform:uppercase;margin-bottom:7px}#hc320Intro strong{display:block;font:900 clamp(45px,6vw,82px)/.88 Georgia,'Times New Roman',serif;letter-spacing:.06em;text-transform:uppercase;background:linear-gradient(#fff7dd,#d6b96f 56%,#7b5420);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 5px 0 rgba(35,22,7,.68),0 15px 32px rgba(0,0,0,.78)}#hc320Intro.show{animation:hc32Intro .82s cubic-bezier(.16,.85,.23,1)}
      @keyframes hc32Intro{0%{opacity:0;transform:translate(-50%,-50%) scale(.78)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.04)}72%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-56%) scale(.96)}}
      body.hc32-low-health #hardCombat311 .hc311-side.player .hc311-bar-frame{border-color:rgba(226,55,70,.88)!important;box-shadow:0 0 15px rgba(207,35,53,.20),inset 0 0 0 2px #020203!important}body.hc32-low-health #hc320Grade{background:radial-gradient(ellipse at 13% 58%,rgba(192,14,37,.29),transparent 34%),radial-gradient(ellipse at 86% 57%,rgba(29,112,232,.15),transparent 31%),linear-gradient(180deg,rgba(0,0,0,.10),transparent 22%,transparent 73%,rgba(0,0,0,.25))}
      .result .menu-panel,.result [class*='panel']{width:min(680px,calc(100% - 32px))!important;padding:40px 34px!important;border-radius:26px!important;border:1px solid rgba(221,187,102,.62)!important;background:radial-gradient(circle at 50% 0%,rgba(217,183,106,.16),transparent 40%),linear-gradient(180deg,rgba(18,20,24,.96),rgba(3,4,6,.97))!important;box-shadow:0 34px 110px rgba(0,0,0,.78),inset 0 0 0 1px rgba(255,255,255,.04)!important}.result h1,.result h2{font-family:Georgia,'Times New Roman',serif!important;font-size:clamp(48px,7vw,78px)!important;letter-spacing:.10em!important;background:linear-gradient(#fff7d8,#d6b663 58%,#7a521d)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important;text-shadow:0 6px 22px rgba(0,0,0,.75)!important}.result button{border-radius:10px!important;padding:13px 22px!important;border:1px solid rgba(230,198,113,.56)!important;background:linear-gradient(180deg,#d9b96b,#7c541d)!important;box-shadow:0 12px 30px rgba(0,0,0,.44),inset 0 1px rgba(255,255,255,.35)!important}
      body.is-fighting #arenaIntro17,body.is-fighting .arena-intro-17,body.is-fighting #versusIntro,body.is-fighting .versus-intro,body.is-fighting #fightCallout,body.is-fighting .fight-callout,body.is-fighting #roundCallout,body.is-fighting .round-callout{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}
      @media(max-width:900px){#hardCombat311 .hc311-top{left:5px!important;right:5px!important;top:4px!important;height:82px!important;grid-template-columns:minmax(0,1fr) 72px minmax(0,1fr)!important;gap:5px!important}#hardCombat311 .hc311-side{grid-template-columns:53px minmax(0,1fr)!important;gap:5px!important}#hardCombat311 .hc311-side.enemy{grid-template-columns:minmax(0,1fr) 53px!important}#hardCombat311 .hc311-portrait{width:51px!important;height:51px!important}#hardCombat311 .hc311-name{font-size:11px!important;margin:0 0 2px!important}#hardCombat311 .hc311-bar-frame{height:15px!important;padding:2px!important}#hardCombat311 .hc311-energy-track{height:3px!important;margin-top:2px!important}#hardCombat311 .hc311-value{font-size:7px!important}#hardCombat311 .hc311-clock{width:69px!important;height:69px!important}#hardCombat311 .hc311-time{font-size:29px!important}#hardCombat311 .hc311-pips{display:none!important}#hardCombat311 .hc311-controls{left:6px!important;right:6px!important;bottom:4px!important;height:105px!important}#hardCombat311 .hc311-dpad{width:96px!important;height:96px!important}#hardCombat311 .hc311-dpad button{width:34px!important;height:34px!important;font-size:16px!important}#hardCombat311 .hc311-left{top:31px!important}#hardCombat311 .hc311-right{top:31px!important}#hardCombat311 .hc311-up{left:31px!important}#hardCombat311 .hc311-down{left:31px!important}#hardCombat311 .hc311-actions{width:260px!important;height:102px!important}#hardCombat311 .hc311-btn{width:55px!important;height:55px!important}#hardCombat311 .hc311-btn b{font-size:15px!important}#hardCombat311 .hc311-btn span{font-size:6px!important}#hardCombat311 .hc311-heavy{left:50px!important;bottom:35px!important}#hardCombat311 .hc311-jump-btn{left:100px!important}#hardCombat311 .hc311-ult{right:58px!important;bottom:35px!important}#hardCombat311 .hc311-block{width:63px!important;height:63px!important}#hardCombat311 .hc311-pause{width:32px!important;height:32px!important;bottom:4px!important;font-size:11px!important}#hc320Impact{top:22%!important}}
    `;
    document.head.appendChild(style);
  }

  function positionForFighter(element, fighter, lift = 128) {
    const canvas = canvasRef();
    if (!element || !fighter || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cw = Number(canvas.width || rect.width || innerWidth);
    const ch = Number(canvas.height || rect.height || innerHeight);
    const x = Number(fighter.x ?? cw * .5);
    const y = Number(fighter.y ?? ch * .72);
    const cssX = rect.left + (x / Math.max(1, cw)) * rect.width;
    const cssY = rect.top + (y / Math.max(1, ch)) * rect.height - lift * (rect.height / Math.max(1, ch));
    element.style.left = `${cssX}px`;
    element.style.top = `${cssY}px`;
  }

  function showStatus(text, fighter) {
    const node = document.getElementById('hc320Status');
    if (!node) return;
    positionForFighter(node, fighter, 150);
    node.querySelector('span').textContent = text;
    node.classList.remove('show');
    void node.offsetWidth;
    node.classList.add('show');
  }

  function showPoison(fighter) {
    poisonUntil = performance.now() + 650;
    const node = document.getElementById('hc320Poison');
    if (!node) return;
    positionForFighter(node, fighter, 56);
    node.classList.remove('show');
    void node.offsetWidth;
    node.classList.add('show');
  }

  function showImpact(title, subtitle, target) {
    const node = document.getElementById('hc320Impact');
    if (!node) return;
    node.querySelector('strong').textContent = title;
    node.querySelector('small').textContent = subtitle;
    node.classList.remove('show');
    void node.offsetWidth;
    node.classList.add('show');

    const edge = document.getElementById('hc320Edge');
    edge?.classList.remove('player', 'enemy');
    void edge?.offsetWidth;
    edge?.classList.add(target);

    const canvas = canvasRef();
    if (canvas?.animate) {
      const direction = target === 'player' ? 1 : -1;
      canvas.animate([
        { translate: '0 0', filter: 'brightness(1)' },
        { translate: `${direction * 5}px -1px`, filter: 'brightness(1.12)' },
        { translate: `${direction * -3}px 1px`, filter: 'brightness(1.04)' },
        { translate: '0 0', filter: 'brightness(1)' }
      ], { duration: 125, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  }

  function showIntro(roundNo) {
    const node = document.getElementById('hc320Intro');
    if (!node) return;
    node.querySelector('small').textContent = `ROUND ${Math.max(1, roundNo || 1)}`;
    node.querySelector('strong').textContent = 'FIGHT';
    node.classList.remove('show');
    void node.offsetWidth;
    node.classList.add('show');
  }

  function installTextDirector() {
    const proto = CanvasRenderingContext2D.prototype;
    if (proto.__hc320TextDirector) return;
    const original = proto.fillText;
    proto.fillText = function(text, ...args) {
      try {
        const canvas = canvasRef();
        if (this.canvas === canvas && fighting()) {
          const value = String(text || '').trim().toUpperCase();
          if (value === 'POISON') { showPoison(enemyRef()); return; }
          if (value === 'DODGE') { evadeUntil = performance.now() + 500; showStatus('EVADE', enemyRef()); return; }
          if (value === 'PARRY') { showStatus('PARRY', enemyRef()); return; }
          if (/^(STUN|BLOCKED|GUARD)$/.test(value)) { showStatus(value === 'BLOCKED' ? 'GUARD' : value, enemyRef()); return; }
          if (/^(ROUND\s*\d+|FIGHT|VS)$/.test(value)) return;
        }
      } catch (_) {}
      return original.call(this, text, ...args);
    };
    proto.__hc320TextDirector = true;
  }

  function installRingCleaner() {
    const proto = CanvasRenderingContext2D.prototype;
    if (proto.__hc320RingCleaner) return;
    const originalBegin = proto.beginPath;
    const originalArc = proto.arc;
    const originalStroke = proto.stroke;
    proto.beginPath = function(...args) {
      this.__hc320LastArc = null;
      return originalBegin.apply(this, args);
    };
    proto.arc = function(x, y, radius, start, end, ...rest) {
      try {
        if (this.canvas === canvasRef() && fighting() && Math.abs(Number(end) - Number(start)) > 5.8) {
          this.__hc320LastArc = { x:Number(x), y:Number(y), r:Number(radius) };
        }
      } catch (_) {}
      return originalArc.call(this, x, y, radius, start, end, ...rest);
    };
    proto.stroke = function(...args) {
      try {
        const arc = this.__hc320LastArc;
        const enemy = enemyRef();
        const activeStatus = performance.now() < poisonUntil || performance.now() < evadeUntil;
        if (activeStatus && arc && enemy && this.canvas === canvasRef() && arc.r >= 7 && arc.r <= 82) {
          const near = Math.hypot(arc.x - Number(enemy.x || 0), arc.y - Number(enemy.y || 0)) < 145;
          const color = String(this.strokeStyle || '').toLowerCase();
          const statusColor = /#(?:[0-9a-f]{2})?(?:ff|ee|dd|cc)(?:[0-9a-f]{0,4})|rgb\([^)]*(?:255|220|200)|green|lime|cyan|magenta/.test(color);
          if (near && statusColor && Number(this.lineWidth || 1) <= 9) {
            this.__hc320LastArc = null;
            return;
          }
        }
      } catch (_) {}
      this.__hc320LastArc = null;
      return originalStroke.apply(this, args);
    };
    proto.__hc320RingCleaner = true;
  }

  function styleButtons() {
    const root = document.getElementById('hardCombat311');
    if (!root) return;
    const map = [
      ['.hc311-light', '✦', 'LIGHT'],
      ['.hc311-heavy', '✹', 'HEAVY'],
      ['.hc311-jump-btn', '▲', 'JUMP'],
      ['.hc311-ult', '☄', 'ULT'],
      ['.hc311-special', '☣', 'SPECIAL'],
      ['.hc311-block', '◆', 'BLOCK']
    ];
    for (const [selector, icon, label] of map) {
      const button = root.querySelector(selector);
      if (!button || button.dataset.hc32Styled) continue;
      const b = button.querySelector('b');
      const span = button.querySelector('span');
      if (b) b.textContent = icon;
      if (span) span.textContent = label;
      button.dataset.hc32Styled = '1';
    }
  }

  function updateCamera() {
    const canvas = canvasRef();
    if (!canvas) return;
    if (!fighting()) {
      smoothScale += (1 - smoothScale) * .14;
      smoothX += (0 - smoothX) * .14;
      smoothY += (0 - smoothY) * .14;
      canvas.style.transform = `translate3d(${smoothX.toFixed(2)}px,${smoothY.toFixed(2)}px,0) scale(${smoothScale.toFixed(4)})`;
      return;
    }

    const p = playerRef();
    const e = enemyRef();
    const rect = canvas.getBoundingClientRect();
    const cw = Number(canvas.width || rect.width || innerWidth);
    if (!p || !e || !cw) return;
    const px = Number(p.x || cw * .35);
    const ex = Number(e.x || cw * .65);
    const distance = Math.abs(ex - px);
    const ratio = clamp(distance / cw, .20, .72);
    const targetScale = 1.105 - ((ratio - .20) / .52) * .055;
    const midpoint = (px + ex) * .5;
    const cssFactor = rect.width / Math.max(1, cw);
    const targetX = clamp((cw * .5 - midpoint) * cssFactor * .07, -16, 16);
    const targetY = 4;
    smoothScale += (targetScale - smoothScale) * .075;
    smoothX += (targetX - smoothX) * .075;
    smoothY += (targetY - smoothY) * .075;
    canvas.style.transform = `translate3d(${smoothX.toFixed(2)}px,${smoothY.toFixed(2)}px,0) scale(${smoothScale.toFixed(4)})`;
  }

  function updateCombatState() {
    const p = playerRef();
    const e = enemyRef();
    const inFight = fighting();
    document.getElementById('hc320Grade').style.display = inFight ? 'block' : 'none';

    if (!inFight || !p || !e) {
      previousPlayerHp = p ? Number(p.hp || 0) : null;
      previousEnemyHp = e ? Number(e.hp || 0) : null;
      document.body.classList.remove('hc32-low-health');
      return;
    }

    const pHp = Number(p.hp || 0);
    const eHp = Number(e.hp || 0);
    const pMax = Math.max(1, Number(p.maxHp || 100));
    const energy = Number(p.energy || 0);
    document.body.classList.toggle('hc32-low-health', pHp / pMax <= .25);

    const ult = document.querySelector('#hardCombat311 .hc311-ult');
    const special = document.querySelector('#hardCombat311 .hc311-special');
    ult?.classList.toggle('hc32-ready', energy >= 95);
    special?.classList.toggle('hc32-ready', energy >= 42);

    if (previousEnemyHp != null && eHp < previousEnemyHp) {
      const damage = Math.max(1, Math.round(previousEnemyHp - eHp));
      showImpact(damage >= 16 ? 'CRUSHING HIT' : damage >= 9 ? 'HEAVY HIT' : 'STRIKE', `${damage} DAMAGE`, 'enemy');
    }
    if (previousPlayerHp != null && pHp < previousPlayerHp) {
      const damage = Math.max(1, Math.round(previousPlayerHp - pHp));
      showImpact(damage >= 15 ? 'ARMOR BREAK' : 'UNDER ATTACK', `${damage} DAMAGE`, 'player');
    }

    previousPlayerHp = pHp;
    previousEnemyHp = eHp;

    const roundNo = safe(() => Number(roundIndex || currentRound || round || 1), 1);
    if (!lastFightState || roundNo !== lastRound) {
      lastRound = roundNo;
      setTimeout(() => showIntro(roundNo), 120);
    }
  }

  function restoreScene() {
    const canvas = canvasRef();
    if (canvas) {
      canvas.style.setProperty('display', 'block', 'important');
      canvas.style.setProperty('visibility', 'visible', 'important');
      canvas.style.setProperty('opacity', '1', 'important');
    }
  }

  function frame() {
    ensureDOM();
    installStyles();
    restoreScene();
    styleButtons();
    updateCamera();
    updateCombatState();
    lastFightState = fighting();
    requestAnimationFrame(frame);
  }

  function start() {
    ensureDOM();
    installStyles();
    installTextDirector();
    installRingCleaner();
    frame();
    console.info('[ERALASH] Premium Combat Director', VERSION);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
