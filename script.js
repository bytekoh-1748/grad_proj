import { getTracks } from './src/tracks/index.js';
import { REDUCED_MOTION } from './src/config.js';
import { VectorRoom } from './src/vector-room.js';
import { FloorHome } from './src/floor-home.js';

const tracks=getTracks(),room=document.getElementById('room'),billboard=document.getElementById('billboard');
const live=document.getElementById('live-status');
let world,selected=0,state='loading',generation=0,elapsed=0,visualTime=0,previous=0,frame=0,lastArt=0,autoTour=false;
const duration=track=>track.duration.split(':').reduce((value,part)=>value*60+Number(part),0)*1000;
const say=text=>{live.textContent=text;};
const colorKeys={wash:'wash',primary:'primary','primary-deep':'primaryDeep',secondary:'secondary','secondary-deep':'secondaryDeep',accent:'accent','accent-deep':'accentDeep',soft:'soft',ink:'ink',paper:'paper'};
const rgb=hex=>hex.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16));
const colors=Object.fromEntries(Object.entries(colorKeys).map(([key,value])=>[key,rgb(tracks[0].palette[value])]));
const lastColors={};

function syncUI(){
  room.dataset.state=state;room.dataset.track=tracks[selected].id;
  const busy=['loading','cueing','docking','returning'].includes(state),play=document.querySelector('[data-act=play]');
  play.disabled=busy;play.setAttribute('aria-pressed',String(state==='playing'));
  play.setAttribute('aria-label',state==='playing'?'일시정지':state==='paused'?'이어서 재생':'재생');
  document.querySelector('[data-act=stop]').disabled=state==='loading'||state==='cued';
}
function updateTitle(){
  const track=tracks[selected],words=track.title.toUpperCase().split(' ');
  let split=1,balance=Infinity;
  for(let i=1;i<words.length;i++){const delta=Math.abs(words.slice(0,i).join(' ').length-words.slice(i).join(' ').length);if(delta<balance){balance=delta;split=i;}}
  const title=document.getElementById('track-title');title.replaceChildren(document.createTextNode(words.slice(0,split).join(' ')));
  if(words.length>1)title.append(document.createElement('br'),document.createTextNode(words.slice(split).join(' ')));
  document.getElementById('track-artist').textContent=track.artist;
  document.getElementById('track-meta').replaceChildren(document.createTextNode(track.duration),document.createElement('br'),document.createTextNode(`${track.bpm} BPM`));
  if(!REDUCED_MOTION)document.getElementById('title-copy').animate([{opacity:.15,translate:'-12px 7px'},{opacity:1,translate:'0 0'}],{duration:420,easing:'ease-out'});
  document.querySelector('meta[name=theme-color]').content=track.palette.wash;
  syncUI();
}
async function choose(index){
  if(!world||world.activity!=='music'||state==='loading')return;
  if(index===selected&&state==='cued')return;
  const token=++generation;selected=index;state='cueing';elapsed=visualTime=0;autoTour=false;
  world.playing=false;world.artTarget=0;world.setArm(false);world.setView('listen');updateTitle();
  const done=await world.select(index);
  if(!done||token!==generation)return;state='cued';syncUI();say(`${tracks[index].title} 선택`);
}
async function play(){
  if(!world||world.activity!=='music')return;
  if(state==='playing'){state='paused';world.playing=false;world.armLiftTarget=24;autoTour=false;syncUI();say('일시정지');return;}
  if(state==='paused'){state='playing';world.playing=true;world.armLiftTarget=0;syncUI();say('이어서 재생');return;}
  if(state!=='cued')return;
  const token=++generation;state='docking';syncUI();world.setView('deck');
  const done=await world.dock();if(!done||token!==generation)return;
  world.setArm(true);await new Promise(resolve=>setTimeout(resolve,REDUCED_MOTION?0:750));
  if(token!==generation)return;
  state='playing';world.playing=true;elapsed=visualTime=0;world.artTarget=1;autoTour=!REDUCED_MOTION;
  syncUI();say(`${tracks[selected].title} 재생 장면 시작`);
}
async function stop(){
  if(!world||world.activity!=='music'||state==='loading'||state==='cued')return;
  const token=++generation;state='returning';autoTour=false;world.playing=false;world.artTarget=0;world.setArm(false);world.setView('listen');syncUI();
  const done=await world.cue();if(!done||token!==generation)return;
  elapsed=visualTime=0;state='cued';syncUI();say('재생을 멈췄어요.');
}
function changeView(view){if(!world||world.activity!=='music'||state==='loading')return;autoTour=false;world.setView(view,true);world.artTarget=view==='wall'||state==='playing'||state==='paused'?1:0;}
const actions={play,stop,prev:()=>choose((selected-1+tracks.length)%tracks.length),next:()=>choose((selected+1)%tracks.length)};
document.addEventListener('click',e=>{
  const action=e.target.closest('[data-act]');if(action&&!action.disabled)actions[action.dataset.act]?.();
  const view=e.target.closest('button[data-view]');if(view)changeView(view.dataset.view);
  const zoom=e.target.closest('[data-zoom]');if(zoom&&world)world.zoomBy(zoom.dataset.zoom==='in'?.08:-.08);
});
document.addEventListener('keydown',e=>{
  if(state==='loading'||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,video,dialog'))return;
  if(e.key==='Escape'&&world?.activity!=='home'){world.activities.select('home');return;}
  if(world?.activity!=='music')return;
  if(e.key==='Escape')changeView('listen');
  if(e.key.toLowerCase()==='s')stop();
  if(['1','2','3','4'].includes(e.key))changeView(['listen','room','deck','wall'][Number(e.key)-1]);
  if(e.target.closest('[role=button],button'))return;
  if(e.code==='Space'){e.preventDefault();play();}
  if(e.key==='ArrowRight'){e.preventDefault();actions.next();}
  if(e.key==='ArrowLeft'){e.preventDefault();actions.prev();}
});
function fail(error){console.error('Vector room:',error);cancelAnimationFrame(frame);document.getElementById('loading').hidden=true;document.getElementById('room-error').hidden=false;room.dataset.state='error';}
document.getElementById('reload').addEventListener('click',()=>location.reload());
function tick(now){
  try{
    const dt=previous?Math.min(now-previous,60):0;previous=now;
    if(!document.hidden){
      if(state==='playing'){elapsed+=dt;visualTime+=dt;world.setArm(true,elapsed/duration(tracks[selected]));
        if(autoTour&&elapsed>4300){world.setView('wall');autoTour=false;}
        if(elapsed>=duration(tracks[selected]))stop();
      }else if(world.view==='wall'&&state!=='paused'&&!REDUCED_MOTION)visualTime+=dt;
      for(const[key,value]of Object.entries(colorKeys)){
        const palette=world.activity==='music'?tracks[selected].palette:tracks[0].palette;
        const goal=rgb(palette[value]),ease=REDUCED_MOTION?1:1-Math.exp(-dt/720);
        colors[key]=colors[key].map((n,i)=>n+(goal[i]-n)*ease);
        const paint=`rgb(${colors[key].map(Math.round).join(',')})`;
        if(lastColors[key]!==paint){document.documentElement.style.setProperty(`--${key}`,paint);lastColors[key]=paint;}
      }
      world.render(dt,now);
      if((world.artTarget||world.artOpacity>.01)&&now-lastArt>33){world.drawTrack(tracks[selected],visualTime,Math.min(60,now-(lastArt||now)));lastArt=now;}
    }
    frame=requestAnimationFrame(tick);
  }catch(error){fail(error);}
}
async function start(){
  try{
    world=new VectorRoom({stage:document.getElementById('stage'),billboard,tracks,reduced:REDUCED_MOTION,
      onSelect:index=>index===selected&&state==='cued'?play():choose(index),
      onGesture:()=>{autoTour=false;},
      onView:(view,user)=>{if(user)autoTour=false;document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));document.getElementById('room-hint').textContent=view==='wall'?tracks[selected].hint:'드래그하면 선과 면이 함께 움직여요';},
    });
    world.activities=new FloorHome(world,name=>{
      ++generation;autoTour=false;elapsed=visualTime=0;state='cued';world.playing=false;world.select(selected);syncUI();
      say({home:'방의 홈 화면',music:'음악감상 공간',cinema:'영화감상 공간',journal:'신문 읽기 공간'}[name]);
    });
    await document.fonts.ready;
    state='cued';updateTitle();world.render(16,performance.now());room.dataset.ready='true';
    document.getElementById('loading').hidden=true;frame=requestAnimationFrame(tick);
  }catch(error){fail(error);}
}
document.addEventListener('visibilitychange',()=>{previous=0;});
addEventListener('pagehide',()=>{cancelAnimationFrame(frame);world?.activities?.destroy();world?.destroy();});
start();
