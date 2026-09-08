import {Calculator,monthCells,PIXEL_COLORS,decodePixels} from './widget-utils.js';
export const WIDGET_ACTIONS=['clock','calendar','calculator','sketch'];
const element=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const button=(text,label,click)=>{const b=element('button','',text);b.type='button';b.setAttribute('aria-label',label);b.onclick=click;return b;};
export function mountWidget(action,host,{content='',onSave=()=>false}={}){
  const root=element('div',`widget-panel widget-${action}`);host.append(root);
  if(action==='clock'){
    const time=element('time','widget-clock-digits'),date=element('p','widget-clock-date'),zone=element('p','widget-clock-zone',Intl.DateTimeFormat().resolvedOptions().timeZone);root.append(time,date,zone);
    const update=()=>{const now=new Date();time.dateTime=now.toISOString();time.textContent=now.toLocaleTimeString('en-GB');date.textContent=now.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'});};update();const timer=setInterval(update,1000);return()=>clearInterval(timer);
  }
  if(action==='calendar'){
    const today=new Date();let year=today.getFullYear(),month=today.getMonth(),selected='';
    const heading=element('div','widget-calendar-heading'),title=element('h3'),grid=element('div','widget-calendar-grid'),status=element('p','widget-calendar-selection');status.setAttribute('aria-live','polite');
    const move=delta=>{const date=new Date(year,month+delta,1);year=date.getFullYear();month=date.getMonth();render();};heading.append(button('←','이전 달',()=>move(-1)),title,button('→','다음 달',()=>move(1)));root.append(heading,grid,status,button('오늘','이번 달로 이동',()=>{year=today.getFullYear();month=today.getMonth();render();}));
    const render=()=>{title.textContent=`${year}. ${String(month+1).padStart(2,'0')}`;grid.replaceChildren();for(const day of ['일','월','화','수','목','금','토'])grid.append(element('span','weekday',day));for(const day of monthCells(year,month)){if(!day){grid.append(element('span'));continue;}const key=`${year}-${month+1}-${day}`,b=button(String(day),`${year}년 ${month+1}월 ${day}일`,()=>{selected=key;status.textContent=`${year}년 ${month+1}월 ${day}일`;render();});b.setAttribute('aria-pressed',String(key===selected));if(year===today.getFullYear()&&month===today.getMonth()&&day===today.getDate()){b.classList.add('today');b.setAttribute('aria-current','date');}grid.append(b);}};render();return()=>{};
  }
  if(action==='calculator'){
    const calc=new Calculator(),display=element('output','calculator-display','0'),keys=element('div','calculator-keys');display.setAttribute('aria-label','계산 결과');display.setAttribute('aria-live','polite');root.tabIndex=0;root.setAttribute('aria-label','계산기');
    const input=key=>{display.textContent=calc.input(key);};for(const key of ['AC','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','⌫','0','.','=']){const b=button(key,key,()=>input(key));if(['+','−','×','÷','='].includes(key))b.className='operator';keys.append(b);}root.append(display,keys);
    root.onkeydown=e=>{const key=({'Enter':'=','=':'=','*':'×','/':'÷','-':'−','Backspace':'⌫','Delete':'AC'})[e.key]||e.key;if(/^[0-9.]$/.test(key)||['+','−','×','÷','=','⌫','AC','%'].includes(key)){e.preventDefault();e.stopPropagation();input(key);}};queueMicrotask(()=>root.focus({preventScroll:true}));return()=>{};
  }
  if(action==='sketch'){
    let pixels=decodePixels(content),color=2,drawing=false,last=null;const canvas=element('canvas','pixel-canvas');canvas.width=canvas.height=320;canvas.setAttribute('aria-label','16 × 16 픽셀 스케치');canvas.tabIndex=0;let cursor={x:7,y:7};
    const tools=element('div','pixel-tools'),status=element('span','pixel-status');status.setAttribute('aria-live','polite');const swatches=[];
    PIXEL_COLORS.forEach((fill,i)=>{const b=button('', ['지우개','흰색','연두색','보라색','주황색'][i],()=>{color=i;swatches.forEach((el,j)=>el.setAttribute('aria-pressed',String(i===j)));});b.style.setProperty('--swatch',fill);b.setAttribute('aria-pressed',String(i===color));tools.append(b);swatches.push(b);});
    const ctx=canvas.getContext('2d');const render=()=>{pixels.forEach((value,i)=>{ctx.fillStyle=PIXEL_COLORS[value];ctx.fillRect(i%16*20,Math.floor(i/16)*20,20,20);});ctx.strokeStyle='#ffffff12';ctx.lineWidth=1;for(let i=1;i<16;i++){ctx.beginPath();ctx.moveTo(i*20,0);ctx.lineTo(i*20,320);ctx.moveTo(0,i*20);ctx.lineTo(320,i*20);ctx.stroke();}if(document.activeElement===canvas){ctx.strokeStyle='#fff';ctx.strokeRect(cursor.x*20+1,cursor.y*20+1,18,18);}};
    const point=e=>{const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(15,Math.floor((e.clientX-r.left)/r.width*16))),y:Math.max(0,Math.min(15,Math.floor((e.clientY-r.top)/r.height*16)))}};
    const paint=p=>{if(last){const dx=p.x-last.x,dy=p.y-last.y,steps=Math.max(Math.abs(dx),Math.abs(dy));for(let i=0;i<=steps;i++){const t=steps?i/steps:0;pixels[Math.round(last.y+dy*t)*16+Math.round(last.x+dx*t)]=color;}}else pixels[p.y*16+p.x]=color;last=p;cursor=p;status.textContent='미저장';render();};
    canvas.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drawing=true;last=null;canvas.setPointerCapture(e.pointerId);paint(point(e));};canvas.onpointermove=e=>{if(drawing)paint(point(e));};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;last=null;};canvas.onfocus=canvas.onblur=render;
    canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();cursor.x=Math.max(0,Math.min(15,cursor.x+(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0)));cursor.y=Math.max(0,Math.min(15,cursor.y+(e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0)));render();}if(e.key===' '||e.key==='Enter'){e.preventDefault();last=null;paint(cursor);}};
    tools.append(button('비우기','스케치 비우기',()=>{pixels.fill(0);status.textContent='미저장';render();}),button('저장 ↗','스케치 저장',()=>{status.textContent=onSave(pixels.join(''))?'저장됨':'저장하지 못함';}));root.append(tools,canvas,status);render();return()=>{};
  }
  return()=>{};
}
