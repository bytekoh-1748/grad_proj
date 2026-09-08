import {mountWidget,WIDGET_ACTIONS} from './widget-panels.js';
import {articles} from '../content/journal.js';
import {films} from '../content/films.js';
import {getTracks} from '../tracks/index.js';
import {allAssets,putAsset} from './storage.js';
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
export class RoomMedia {
  constructor({world,say,onNavigate,onUpload,onLight,onWidgetSave}){
    Object.assign(this,{world,say,onNavigate,onUpload,onLight,onWidgetSave,players:new Map(),assets:new Map(),urls:new Map(),request:0});
    this.dialog=$('#content-dialog');this.body=$('#content-body');this.dialog.addEventListener('close',()=>{this.widgetCleanup?.();this.widgetCleanup=null;this.request++;this.body.querySelectorAll('video').forEach(v=>v.pause());if(this.returnView)this.world.flyTo(this.returnView);this.returnView=null;this.active=null;this.opener?.focus({preventScroll:true});});
    $('#close-content').onclick=()=>this.dialog.close();this.dialog.addEventListener('click',e=>{if(e.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.dialog.close();}});
  }
  async refreshAssets(){for(const a of await allAssets()){this.assets.set(a.id,a);if(!this.urls.has(a.id))this.urls.set(a.id,URL.createObjectURL(a.blob));}}
  async open(object,roomId){
    if(!object||object.action==='none')return;
    if(object.action==='room'){this.onNavigate(object.content);return;}
    if(object.action==='light'){this.onLight();return;}
    const token=++this.request;this.active={object,roomId};this.opener=document.activeElement;if(!this.dialog.open)this.returnView=this.world.cameraState();this.world.focus(object.id);
    const p=this.world.projected(object.id);if(p){this.dialog.style.setProperty('--origin-x',`${p.x}px`);this.dialog.style.setProperty('--origin-y',`${p.y}px`);}
    try{await this.refreshAssets();}catch{this.say('기기의 미디어 보관함을 열지 못했습니다. 기본 콘텐츠를 표시합니다.');}if(token!==this.request)return;
    this.widgetCleanup?.();this.widgetCleanup=null;
    const labels={clock:['LOCAL TIME','지금, 여기에.'],calendar:['DAY BY DAY','하루씩.'],calculator:['NUMBERS','숫자의 자리.'],sketch:['SMALL PAINT','작은 그림.'],gallery:['COLLECTED MOMENTS','Ways of seeing.'],music:['A SIDE / B SIDE','한 장의 판을 듣는 시간'],video:['A SMALL CINEMA','One more scene.'],article:['THE ROOM JOURNAL','잠깐, 다른 속도로.']};
    $('#content-kicker').textContent=labels[object.action][0];$('#content-title').textContent=labels[object.action][1];this.body.replaceChildren();
    if(object.action==='gallery')this.gallery(object);
    if(object.action==='music')this.music(object,roomId);
    if(object.action==='video')this.video(object,roomId);
    if(object.action==='article')this.article(object);
    if(WIDGET_ACTIONS.includes(object.action))this.widgetCleanup=mountWidget(object.action,this.body,{content:object.content,onSave:content=>this.onWidgetSave?.(roomId,object.id,content)});
    if(!this.dialog.open)this.dialog.showModal();
  }
  attached(object,type){return object.content.split(',').map(id=>this.assets.get(id)).filter(a=>a?.type.startsWith(type));}
  uploadButton(type){const wrap=document.createElement('div');wrap.className='content-actions';const b=document.createElement('button');b.textContent=type==='image'?'내 사진 연결하기 ＋':type==='audio'?'내 음악 연결하기 ＋':'내 영상 연결하기 ＋';b.onclick=()=>{if(this.active)this.onUpload(type,this.active);};wrap.append(b);this.body.append(wrap);}
  gallery(object){
    const attached=this.attached(object,'image');const photos=attached.length?attached.map(a=>({src:this.urls.get(a.id),caption:a.caption||a.name,id:a.id})):['floor','close','graphic'].map((key,i)=>({src:`/images/study-${key}.png`,caption:['01 — A desktop, unfinished.','02 — Inside the image.','03 — Everything, elsewhere.'][i]}));
    const grid=document.createElement('div');grid.className='gallery-grid';for(const p of photos){const f=document.createElement('figure');f.className='gallery-item';const img=new Image();img.src=p.src;img.alt=p.caption;const caption=document.createElement('figcaption');caption.textContent=p.caption;f.append(img,caption);if(p.id){caption.contentEditable='plaintext-only';caption.setAttribute('aria-label','사진 캡션');caption.addEventListener('blur',async()=>{try{const a=this.assets.get(p.id);a.caption=caption.textContent.slice(0,300);await putAsset(a);this.say('사진 캡션을 저장했습니다.');}catch{this.say('캡션을 저장하지 못했습니다.');}});}grid.append(f);}this.body.append(grid);this.uploadButton('image');this.note('기본 앨범은 ROOM의 세 구도 스터디입니다. 연결한 사진은 이 기기에 보관됩니다.');
  }
  player(kind,key){if(this.players.has(key))return this.players.get(key);const player=document.createElement(kind);player.controls=true;player.className='media-player';player.preload='metadata';if(kind==='video')player.playsInline=true;player.addEventListener('error',()=>this.say('이 파일을 재생할 수 없습니다. 다른 파일이나 형식을 선택하세요.'));if(kind==='audio'){player.addEventListener('play',()=>{for(const p of this.players.values())if(p!==player)p.pause();this.world.playing=true;this.body.querySelector('.record-visual')?.classList.add('playing');});player.addEventListener('pause',()=>{this.world.playing=[...this.players.values()].some(p=>p.tagName==='AUDIO'&&!p.paused);this.body.querySelector('.record-visual')?.classList.remove('playing');});player.addEventListener('ended',()=>{this.world.playing=false;this.body.querySelector('.record-visual')?.classList.remove('playing');});}this.players.set(key,player);return player;}
  music(object,roomId){
    const visual=document.createElement('div');visual.className='record-visual';visual.innerHTML='<div class="record-label">ROOM<br>SIDE A</div>';this.body.append(visual);
    const attached=this.attached(object,'audio'),tracks=attached.length?attached.map(a=>({id:a.id,title:a.name,src:this.urls.get(a.id)})):getTracks().map(t=>({id:t.id,title:t.title,src:`/audio/${t.id}.wav`,genre:t.genre}));
    const player=this.player('audio',`${roomId}/${object.id}`);player.loop=true;if(!player.dataset.track||!tracks.some(t=>t.id===player.dataset.track)){const t=tracks.find(t=>t.id===object.content)||tracks[0];player.src=t.src;player.dataset.track=t.id;}if(!player.paused)visual.classList.add('playing');this.body.append(player);
    const list=document.createElement('div');list.className='media-list';for(const t of tracks){const b=document.createElement('button');b.className=player.dataset.track===t.id?'active':'';b.innerHTML=`<span>${escapeHTML(t.title)}</span><small>${escapeHTML(t.genre||'내 음악')}</small>`;b.onclick=async()=>{list.querySelectorAll('button').forEach(el=>el.classList.toggle('active',el===b));player.src=t.src;player.dataset.track=t.id;this.world.trackId=t.id;this.world.needsRender=true;try{await player.play();}catch{this.say('재생 버튼을 눌러 음악을 시작하세요.');}};list.append(b);}this.body.append(list);this.uploadButton('audio');this.note(attached.length?'음악 파일과 재생 위치는 장면의 재질·조명을 바꿔도 유지됩니다.':'기존 LP의 제목과 분위기를 이어받은 오리지널 사운드 스케치 6곡입니다. 실제 음원 파일을 연결할 수도 있습니다.');
  }
  video(object,roomId){const attached=this.attached(object,'video'),catalog=attached.length?attached.map(a=>({id:a.id,title:a.name,src:this.urls.get(a.id)})):films;const player=this.player('video',`${roomId}/${object.id}`);const stage=document.createElement('div');this.body.append(stage);const list=document.createElement('div');list.className='media-list';const show=film=>{player.pause();if(film.src){if(player.dataset.track!==film.id){player.src=film.src;player.dataset.track=film.id;}stage.replaceChildren(player);}else{stage.innerHTML='<div class="video-demo"><span>COLOUR<br>IN MOTION.</span></div>';}};for(const film of catalog){const b=document.createElement('button');b.textContent=film.title;b.onclick=()=>show(film);list.append(b);}show(catalog.find(f=>f.id===player.dataset.track)||catalog[0]);this.body.append(list);this.uploadButton('video');this.note('영상 파일을 연결하면 이 공간의 영상 창에서 다시 열 수 있습니다.');}
  article(object){const tabs=document.createElement('div');tabs.className='article-tabs';const copy=document.createElement('article');copy.className='article-copy';const show=a=>{$('#content-title').textContent=a.title;copy.replaceChildren();const intro=document.createElement('p');intro.className='article-intro';intro.textContent=a.intro;copy.append(intro);for(const p of a.text.split('\n\n')){const el=document.createElement('p');el.textContent=p;copy.append(el);}};for(const a of articles){const b=document.createElement('button');b.textContent=a.title;b.onclick=()=>show(a);tabs.append(b);}this.body.append(tabs,copy);show(articles.find(a=>a.id===object.content)||{title:'나의 글',intro:'',text:object.content||articles[0].text});}
  note(text){const p=document.createElement('p');p.className='content-footnote';p.textContent=text;this.body.append(p);}
  closeForNavigation(){this.widgetCleanup?.();this.widgetCleanup=null;this.request++;this.returnView=null;if(this.dialog.open)this.dialog.close();for(const p of this.players.values())p.pause();this.world.playing=false;}
  destroy(){this.closeForNavigation();for(const p of this.players.values()){p.removeAttribute('src');p.load();}for(const url of this.urls.values())URL.revokeObjectURL(url);this.players.clear();}
}
