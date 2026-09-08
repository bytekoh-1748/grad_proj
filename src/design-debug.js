import {EDITIONS,EDITION_IDS} from './design-data.js';

// Loaded only by the loopback development inspector, never by the shipped room.
export function mountDesignDebug(studio){
  const dock=document.createElement('aside');dock.id='edition-dock';dock.className='edition-dock';dock.setAttribute('aria-label','로컬 디자인 디버그');
  dock.innerHTML=`<div class="debug-caption"><b>LOCAL / DEBUG</b><output id="debug-context"></output></div><div class="debug-row"><nav class="edition-nav" aria-label="디버그 스타일"><button data-auto aria-pressed="true">자동</button>${EDITION_IDS.map(id=>`<button data-edition="${id}" aria-pressed="false">${EDITIONS[id].name}</button>`).join('')}</nav><div class="palette-picker" role="group" aria-label="디버그 팔레트">${[0,1,2].map(i=>`<button data-palette="${i}"><span></span><span></span><span></span></button>`).join('')}</div><button class="debug-time" type="button">시간 시뮬레이션 ↗</button></div>`;
  document.getElementById('room').append(dock);document.getElementById('light-debug').hidden=false;
  const opts={signal:studio.abort.signal};
  dock.querySelector('[data-auto]').addEventListener('click',()=>studio.setManual(null),opts);
  dock.querySelectorAll('[data-edition]').forEach(b=>b.addEventListener('click',()=>studio.setManual(b.dataset.edition),opts));
  dock.querySelectorAll('[data-palette]').forEach(b=>b.addEventListener('click',()=>studio.setManual(studio.selection.edition,Number(b.dataset.palette)),opts));
  dock.querySelector('.debug-time').addEventListener('click',()=>studio.setPanel(true),opts);
  const sync=()=>{
    const theme=EDITIONS[studio.selection.edition],track=studio.world.tracks[studio.world.selected];
    dock.querySelector('#debug-context').textContent=`${studio.debugHour===null?'기기':'가상'} ${studio.mood.clock} · ${studio.world.activity==='music'?track.title:studio.world.activity} → ${theme.name} / ${theme.palettes[studio.selection.palette].name}`;
    dock.querySelector('[data-auto]').setAttribute('aria-pressed',String(!studio.manual));
    dock.querySelectorAll('[data-edition]').forEach(b=>b.setAttribute('aria-pressed',String(studio.manual?.edition===b.dataset.edition)));
    dock.querySelectorAll('[data-palette]').forEach((b,i)=>{
      const palette=theme.palettes[i];b.setAttribute('aria-label',`${palette.name} 팔레트`);b.title=palette.name;b.setAttribute('aria-pressed',String(studio.selection.palette===i));
      [...b.children].forEach((el,j)=>el.style.background=palette.colors[['wash','music-fill','film-fill'][j]]);
    });
  };
  sync();return{sync,destroy:()=>dock.remove()};
}
