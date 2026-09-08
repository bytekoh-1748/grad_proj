import {getTracks} from './src/tracks/index.js';
import {REDUCED_MOTION} from './src/config.js';
import {VectorRoom} from './src/vector-room.js';
import {FloorHome} from './src/floor-home.js';
import {DesignStudio} from './src/design-studio.js';
import {MusicPlayer} from './src/activities/music-player.js';
import {FrameLoop} from './src/frame-loop.js';

const tracks=getTracks(),room=document.getElementById('room'),billboard=document.getElementById('billboard');
const say=text=>{document.getElementById('live-status').textContent=text;};
const music=new MusicPlayer({tracks,room,reduced:REDUCED_MOTION,say});
const events=new AbortController();
let world,studio,loop;
const actions={play:()=>music.play(),stop:()=>music.stop(),prev:()=>music.next(-1),next:()=>music.next(1)};
document.addEventListener('click',e=>{
  const action=e.target.closest('[data-act]');if(action&&!action.disabled)actions[action.dataset.act]?.();
  const view=e.target.closest('button[data-view]');if(view)music.changeView(view.dataset.view);
  const zoom=e.target.closest('[data-zoom]');if(zoom&&world)world.zoomBy(zoom.dataset.zoom==='in'?.08:-.08);
},{signal:events.signal});
document.addEventListener('keydown',e=>{
  if(music.state==='loading'||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('dialog'))return;
  if(e.key==='Escape'&&!document.getElementById('space-controls').hidden){e.preventDefault();studio.setPanel(false,true);return;}
  if(e.target.closest('input,textarea,select,video'))return;
  if(e.key==='Escape'&&world?.activity!=='home'){world.activities.select('home');return;}
  if(e.target.closest('#edition-dock,#space-controls'))return;
  if(world?.activity!=='music')return;
  if(e.key==='Escape')music.changeView('listen');
  if(e.key.toLowerCase()==='s')music.stop();
  if(['1','2','3','4'].includes(e.key))music.changeView(['listen','room','deck','wall'][Number(e.key)-1]);
  if(e.target.closest('[role=button],button'))return;
  if(e.code==='Space'){e.preventDefault();music.play();}
  if(e.key==='ArrowRight'){e.preventDefault();actions.next();}
  if(e.key==='ArrowLeft'){e.preventDefault();actions.prev();}
},{signal:events.signal});
function fail(error){
  console.error('Vector room:',error);loop?.stop();
  document.getElementById('loading').hidden=true;
  document.getElementById('room-error').hidden=false;room.dataset.state='error';
}
document.getElementById('reload').addEventListener('click',()=>location.reload(),{signal:events.signal});
async function start(){
  try{
    world=new VectorRoom({stage:document.getElementById('stage'),billboard,tracks,reduced:REDUCED_MOTION,
      onSelect:index=>index===music.selected&&music.state==='cued'?music.play():music.choose(index),
      onGesture:()=>{music.autoTour=false;},
      onView:(view,user)=>{
        if(user)music.autoTour=false;
        document.querySelectorAll('button[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
        document.getElementById('room-hint').textContent=view==='wall'?music.track.hint:'드래그하면 선과 면이 함께 움직여요';
      },
    });
    music.attach(world);
    world.activities=new FloorHome(world,name=>{
      studio?.setPanel(false);music.reset();
      say({home:'방의 홈 화면',music:'음악감상 공간',cinema:'영화감상 공간',journal:'신문 읽기 공간'}[name]);
    });
    world.studio=studio=new DesignStudio(world);
    await document.fonts.ready;
    if(events.signal.aborted)return;
    music.state='cued';music.updateTitle();world.render(16,performance.now());room.dataset.ready='true';
    document.getElementById('loading').hidden=true;
    loop=new FrameLoop((dt,now)=>{music.step(dt);studio.step(dt);music.draw(now);world.render(dt,now);},fail);
    loop.start();
  }catch(error){fail(error);}
}
function destroy(){events.abort();loop?.destroy();music.destroy();studio?.destroy();world?.activities?.destroy();world?.destroy();}
addEventListener('pagehide',event=>{if(event.persisted)loop?.stop();else destroy();},{signal:events.signal});
addEventListener('pageshow',event=>{if(event.persisted)loop?.start();},{signal:events.signal});
if(import.meta.hot)import.meta.hot.dispose(destroy);
start();
