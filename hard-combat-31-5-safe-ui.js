/* ERALASH COMBAT 31.5 — safe UI polish, no canvas interception */
(() => {
  'use strict';
  if (window.__HC315_INSTALLED__) return;
  window.__HC315_INSTALLED__ = true;
  function recover(){
    document.getElementById('hc314Style')?.remove();
    document.getElementById('hc314Grade')?.remove();
    const canvas=document.querySelector('canvas#game, canvas');
    if(canvas){canvas.style.setProperty('display','block','important');canvas.style.setProperty('visibility','visible','important');canvas.style.setProperty('opacity','1','important');canvas.style.removeProperty('filter');}
  }
  function styles(){
    if(document.getElementById('hc315Style'))return;
    const s=document.createElement('style');s.id='hc315Style';s.textContent=`
      canvas#game,body.is-fighting canvas#game{display:block!important;visibility:visible!important;opacity:1!important}
      #hardCombat311{z-index:2147482000!important}
      #hardCombat311 .hc311-top{left:14px!important;right:14px!important;top:9px!important;grid-template-columns:minmax(0,1fr) 150px minmax(0,1fr)!important;gap:18px!important}
      #hardCombat311 .hc311-portrait{width:112px!important;height:112px!important}
      #hardCombat311 .hc311-side{grid-template-columns:116px minmax(0,1fr)!important}
      #hardCombat311 .hc311-side.enemy{grid-template-columns:minmax(0,1fr) 116px!important}
      #hardCombat311 .hc311-name{font-size:clamp(26px,2.2vw,36px)!important}
      #hardCombat311 .hc311-bar-frame{height:30px!important}
      #hardCombat311 .hc311-clock{width:144px!important;height:144px!important}
      #hardCombat311 .hc311-time{font-size:60px!important}
      #hardCombat311 .hc311-controls{left:18px!important;right:18px!important;bottom:12px!important;height:205px!important}
      #hardCombat311 .hc311-dpad{width:180px!important;height:180px!important}
      #hardCombat311 .hc311-actions{width:min(550px,52vw)!important;height:198px!important}
      #hardCombat311 .hc311-btn{width:98px!important;height:98px!important}
      #hardCombat311 .hc311-light{left:0!important;bottom:0!important}
      #hardCombat311 .hc311-heavy{left:98px!important;bottom:68px!important}
      #hardCombat311 .hc311-jump-btn{left:196px!important;bottom:0!important}
      #hardCombat311 .hc311-ult{right:106px!important;bottom:68px!important}
      #hardCombat311 .hc311-special{right:0!important;top:2px!important}
      #hardCombat311 .hc311-block{right:0!important;bottom:0!important;width:114px!important;height:114px!important}
      #hc315Light{position:fixed;inset:0;pointer-events:none;z-index:2147481000;background:radial-gradient(ellipse at 15% 58%,rgba(145,20,36,.12),transparent 28%),radial-gradient(ellipse at 85% 58%,rgba(35,105,210,.11),transparent 30%);mix-blend-mode:screen}
      body.is-fighting #arenaIntro17,body.is-fighting .arena-intro-17,body.is-fighting #versusIntro,body.is-fighting .versus-intro,body.is-fighting #fightCallout,body.is-fighting .fight-callout,body.is-fighting #roundCallout,body.is-fighting .round-callout{display:none!important;opacity:0!important;visibility:hidden!important}
      @media(max-width:900px){#hardCombat311 .hc311-top{left:6px!important;right:6px!important;top:4px!important;grid-template-columns:minmax(0,1fr) 82px minmax(0,1fr)!important;gap:6px!important}#hardCombat311 .hc311-side{grid-template-columns:67px minmax(0,1fr)!important;gap:6px!important}#hardCombat311 .hc311-side.enemy{grid-template-columns:minmax(0,1fr) 67px!important}#hardCombat311 .hc311-portrait{width:65px!important;height:65px!important}#hardCombat311 .hc311-name{font-size:13px!important}#hardCombat311 .hc311-bar-frame{height:18px!important}#hardCombat311 .hc311-clock{width:82px!important;height:82px!important}#hardCombat311 .hc311-time{font-size:34px!important}#hardCombat311 .hc311-controls{left:7px!important;right:7px!important;bottom:5px!important;height:132px!important}#hardCombat311 .hc311-dpad{width:120px!important;height:120px!important}#hardCombat311 .hc311-actions{width:308px!important;height:130px!important}#hardCombat311 .hc311-btn{width:68px!important;height:68px!important}#hardCombat311 .hc311-heavy{left:62px!important;bottom:44px!important}#hardCombat311 .hc311-jump-btn{left:124px!important}#hardCombat311 .hc311-ult{right:71px!important;bottom:44px!important}#hardCombat311 .hc311-block{width:78px!important;height:78px!important}}
    `;document.head.appendChild(s);
    if(!document.getElementById('hc315Light')){const l=document.createElement('div');l.id='hc315Light';document.body.appendChild(l);}
  }
  function tick(){recover();styles();requestAnimationFrame(tick)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
})();
