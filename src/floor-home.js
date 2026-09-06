import {ActivityMotion,POSTERS,stagger,clamp,landing} from './activity-motion.js';
import {corners,mapPoints,raisedFloor,shadowFloor,wallArtQuad,roundedOutline} from './floor-scene.js';
import {mix} from './vector-math.js';

const NS='http://www.w3.org/2000/svg';
const shape=(parent,attrs)=>{const p=document.createElementNS(NS,'path');Object.entries(attrs).forEach(([k,v])=>p.setAttribute(k,v));parent.append(p);return p;};
const path=points=>points.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join('')+'Z';
const burst=(cx,cy,r1,r2,n=12)=>Array.from({length:n*2},(_,i)=>{const a=i*Math.PI/n,r=i%2?r2:r1;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r];});

const journal=[
  {title:'아무것도 하지 않을 자유',tag:'LIFE · 01',intro:'일정표의 빈칸을 서둘러 채우지 않는 연습.',text:'하루의 모든 순간에 이름을 붙일 필요는 없다. 음악을 고르다가 창밖을 보고, 읽던 페이지 사이에 손가락을 끼운 채 잠깐 멈춘다. 그 사이에도 시간은 충분히 잘 흐른다.\n\n오늘의 작은 제안은 빈칸 하나를 남겨 두는 것. 꼭 해야 할 일도, 생산적인 취미도 아닌 시간을 한 칸 마련해 보자. 좋아하는 곡 한 면이 끝날 때까지, 아무것도 완성하지 않아도 좋다.'},
  {title:'방 안의 작은 영화관',tag:'CULTURE · 02',intro:'불을 낮추고, 오늘의 마지막 장면을 고른다.',text:'같은 영화도 어디에서 보느냐에 따라 조금 다른 기억이 된다. 커다란 스크린이 없어도 괜찮다. 익숙한 방의 불을 하나 끄고, 휴대폰을 뒤집어 놓고, 가장 편한 자리에 앉는다.\n\n엔딩 크레디트가 흐를 때 바로 다음 화면을 찾지 말자. 마음에 남은 색 하나, 대사 한 줄을 잠깐 더 바라보면 오늘의 방은 작은 영화관이 된다.'},
  {title:'한 장의 판을 뒤집는 시간',tag:'SOUND · 03',intro:'취향은 다음 곡보다, 다시 듣는 곡에 가까울지도.',text:'플레이리스트는 끝없이 이어지지만 한 장의 음반에는 끝이 있다. 마지막 홈에 바늘이 닿으면 누군가 자리에서 일어나 판을 뒤집어야 한다. 그 짧은 멈춤이 듣는 사람도 음악의 일부로 만든다.\n\n처음에는 지나쳤던 베이스 소리나 숨을 고르는 순간이 다시 들을 때 비로소 다가온다. 오늘은 새로운 곡 대신 오래 좋아했던 한 곡을 골라 보자.'},
];

function posterMarkup(){
  return `<div id="home-heading" class="floor-copy"><p>MAKE ROOM FOR YOURSELF</p><h1>TAKE YOUR TIME.</h1><span>오늘은, 뭐 하고 놀까?</span></div>
  <button class="floor-poster poster-music" data-activity="music" aria-label="음악감상 열기">
    <span class="poster-kicker">01 / LISTEN</span><strong>음악감상</strong><span class="poster-caption">한 장의 판, 나만의 리듬.</span>
    <svg viewBox="0 0 570 490" aria-hidden="true"><path d="${path(burst(310,328,174,155,12))}" fill="#d9fb62"/><circle cx="310" cy="328" r="126" fill="#241736"/><g fill="none" stroke="#9364d3" stroke-width="2"><circle cx="310" cy="328" r="115"/><circle cx="310" cy="328" r="100"/><circle cx="310" cy="328" r="85"/></g><circle cx="310" cy="328" r="48" fill="#ffb1c8"/><path d="m300 306 30 22-30 22Z" fill="#32114b"/><path d="M70 350v-24m18 43v-62m18 91v-116m18 107v-97" stroke="#ffb1c8" stroke-width="10" stroke-linecap="round"/></svg>
    <span class="poster-arrow" aria-hidden="true">↗</span><span class="poster-bottom">SIX RECORDS. ENDLESS MOODS.</span>
  </button>
  <button class="floor-poster poster-cinema" data-activity="cinema" aria-label="영화감상 열기">
    <span class="poster-kicker">02 / WATCH</span><strong>영화감상</strong><span class="poster-caption">방 안의 작은 시네마.</span>
    <svg viewBox="0 0 440 340" aria-hidden="true"><rect x="166" y="129" width="228" height="141" rx="68" fill="#39234f"/><path d="m253 162 70 37-70 37Z" fill="#e8ffad"/><path d="M67 211a37 37 0 1 0 0-.1M84 186l-33 51m-12-33 54 6" fill="none" stroke="#72872c" stroke-width="5"/></svg><span class="poster-arrow" aria-hidden="true">↗</span><span class="poster-bottom">LIGHTS DOWN. WORLD ON.</span>
  </button>
  <button class="floor-poster poster-journal" data-activity="journal" aria-label="신문 보기 열기">
    <span class="poster-kicker">03 / READ</span><strong>신문 보기</strong><span class="poster-caption">잠깐, 다른 속도로.</span>
    <svg viewBox="0 0 445 290" aria-hidden="true"><path d="M38 182h219m-219 17h219m-219 17h150" stroke="#b6a388" stroke-width="4"/><path d="${path(burst(335,186,64,54,10))}" fill="#f88b65"/><path d="M308 186h54m-27-27v54" stroke="#4a241b" stroke-width="9" stroke-linecap="round"/></svg><span class="poster-arrow" aria-hidden="true">↗</span><span class="poster-bottom">THE ROOM JOURNAL</span>
  </button>`;
}
function cinemaMarkup(){
  return `<section id="cinema-screen" class="cinema-screen" aria-label="영화 화면">
    <div class="film-demo" id="film-demo"><svg viewBox="0 0 1000 600" aria-label="컬러 필름, 오리지널 모션 스터디"><rect width="1000" height="600" fill="#b8b9ff"/><circle class="film-orbit" cx="740" cy="250" r="182" fill="#f7fb92"/><path class="film-wave" d="M-400 490Q0 80 400 490T1200 490T2000 490V900H-400Z" fill="#6144bf"/><path d="M0 520Q320 300 560 520T1100 480V600H0Z" fill="#2e224a"/><text x="72" y="110" fill="#2e224a" font-size="28" font-family="sans-serif" letter-spacing="8">A ROOM ORIGINAL</text><text x="72" y="395" fill="#fff9e7" font-size="112" font-family="Arial Black, sans-serif" font-weight="900">COLOUR</text><text x="72" y="500" fill="#fff9e7" font-size="112" font-family="Arial Black, sans-serif" font-weight="900">IN MOTION.</text></svg></div>
    <video id="local-film" controls playsinline hidden aria-label="선택한 영화"></video>
  </section>
  <section id="cinema-console" class="cinema-console" aria-label="영화 조작"><span class="scene-eyebrow">PRIVATE SCREENING / 01</span><h2>작은 시네마.</h2><p id="film-name">COLOUR IN MOTION · 오리지널 모션 스터디</p><div><button id="film-play" aria-pressed="false">▶ 필름 재생</button><button id="film-open">내 영상 열기 ↗</button><input id="film-file" type="file" accept="video/*" hidden></div><p id="film-status" role="status"></p></section>
  <div id="projector" class="projector" aria-hidden="true"><svg viewBox="0 0 520 390" preserveAspectRatio="none"><rect x="30" y="91" width="398" height="247" rx="38" fill="#6351ac" stroke="#17121c" stroke-width="9"/><path d="M425 162h49v98h-49" fill="#d9fb62" stroke="#17121c" stroke-width="9"/><rect x="58" y="135" width="272" height="135" rx="22" fill="#352348"/><g class="projector-reels" fill="#f7efd6" stroke="#17121c" stroke-width="8"><circle cx="129" cy="101" r="84"/><circle cx="322" cy="101" r="84"/></g><g fill="#39254f"><circle cx="129" cy="101" r="17"/><circle cx="129" cy="52" r="16"/><circle cx="87" cy="126" r="16"/><circle cx="171" cy="126" r="16"/><circle cx="322" cy="101" r="17"/><circle cx="322" cy="52" r="16"/><circle cx="280" cy="126" r="16"/><circle cx="364" cy="126" r="16"/></g><path d="M67 300h169m-169 17h169" stroke="#bc9fed" stroke-width="5"/><circle cx="365" cy="296" r="13" fill="#d9fb62"/></svg></div>`;
}
function newspaperMarkup(){
  return `<section id="newspaper" class="newspaper" aria-label="룸 저널"><div class="paper-top"><span>SLOW LIVING / SMALL PLEASURES</span><span>샘플 에디션 · VOL. 01</span></div><h2>THE ROOM JOURNAL</h2><div class="paper-rule"></div><div class="paper-lead"><div><span class="scene-eyebrow">EDITOR'S LETTER</span><h3>잠깐,<br>다른 속도로.</h3><p>좋아하는 것들로 채우는 방.<br>그리고 아무것도 하지 않을 자유.</p></div><svg viewBox="0 0 300 280" aria-hidden="true"><rect x="5" y="5" width="290" height="270" fill="#f5a476"/><circle cx="150" cy="140" r="91" fill="#f9df84"/><path d="M61 198h178m-124 0v-88q0-43 44-43t44 43v88m-76 0v-80q0-25 26-25t26 25v80" fill="none" stroke="#382321" stroke-width="8"/><path d="M145 39v-21m-67 56-19-14m162 14 19-14" stroke="#382321" stroke-width="6"/></svg></div><div class="paper-articles">${journal.map((a,i)=>`<button data-article="${i}"><span>${a.tag}</span><h4>${a.title}</h4><p>${a.intro}</p><b>읽기 ↗</b></button>`).join('')}</div></section>
  <div id="coffee" class="coffee" aria-hidden="true"><svg viewBox="0 0 220 220"><circle cx="110" cy="116" r="94" fill="#e4b987" stroke="#34221b" stroke-width="5"/><path d="M170 78q62-12 28 51l-36 8" fill="#fff4db" stroke="#34221b" stroke-width="7"/><circle cx="108" cy="103" r="71" fill="#fff4db" stroke="#34221b" stroke-width="6"/><circle cx="108" cy="103" r="53" fill="#59362b"/><path d="M82 87q27-23 49-3" fill="none" stroke="#bb8b63" stroke-width="8" stroke-linecap="round"/></svg></div>`;
}

export class FloorHome {
  constructor(world,onActivity){
    this.world=world;this.onActivity=onActivity;this.motion=new ActivityMotion(world.reduced);this.active='home';this.filmPlaying=false;this.url=null;
    const layer=document.getElementById('activity-layer');layer.innerHTML=posterMarkup()+cinemaMarkup()+newspaperMarkup();
    this.heading=document.getElementById('home-heading');
    this.posters=Object.entries(POSTERS).map(([name,pose])=>({name,pose,el:layer.querySelector(`[data-activity=${name}]`),shadow:this.makeShadow(),edge:this.makeEdge()}));
    this.objects=[
      {name:'projector',activity:'cinema',u:480,v:500,width:490,depth:350,angle:-10,height:46},
      {name:'newspaper',activity:'journal',u:490,v:190,width:910,depth:650,angle:-2,height:7},
      {name:'coffee',activity:'journal',u:1360,v:635,width:205,depth:205,angle:14,height:42},
    ].map(p=>({...p,el:document.getElementById(p.name),shadow:this.makeShadow(),edge:this.makeEdge()}));
    this.screen=document.getElementById('cinema-screen');this.console=document.getElementById('cinema-console');
    this.video=document.getElementById('local-film');this.demo=document.getElementById('film-demo');
    this.abort=new AbortController();const options={signal:this.abort.signal};
    this.posters.forEach(p=>p.el.addEventListener('click',()=>this.select(p.name),options));
    document.getElementById('go-home').addEventListener('click',()=>this.select('home'),options);
    document.getElementById('film-play').addEventListener('click',()=>this.toggleFilm(),options);
    document.getElementById('film-open').addEventListener('click',()=>document.getElementById('film-file').click(),options);
    document.getElementById('film-file').addEventListener('change',e=>this.loadFilm(e.target.files?.[0]),options);
    this.video.addEventListener('error',()=>{document.getElementById('film-status').textContent='이 영상 형식을 재생할 수 없어요. 다른 영상을 골라 주세요.';},options);
    this.video.addEventListener('play',()=>this.filmState(true),options);this.video.addEventListener('pause',()=>this.filmState(false),options);this.video.addEventListener('ended',()=>this.filmState(false),options);
    layer.querySelectorAll('[data-article]').forEach(el=>el.addEventListener('click',()=>this.readArticle(Number(el.dataset.article)),options));
    document.getElementById('close-article').addEventListener('click',()=>document.getElementById('article-reader').close(),options);
    this.sync();
  }
  makeShadow(){return shape(document.getElementById('activity-shadows'),{fill:'#24152e',opacity:'.18'});}
  makeEdge(){return shape(document.getElementById('activity-edges'),{fill:'#453324',stroke:'#231b24','stroke-width':2,'stroke-linejoin':'round'});}
  select(name){
    if(name===this.active||!this.motion.select(name))return;
    this.active=name;this.world.activity=name;this.world.setView({home:'home',music:'listen',cinema:'cinema',journal:'journal'}[name]);
    this.world.artTarget=0;this.world.playing=false;this.world.setArm(false);
    this.video.pause();this.filmState(false);this.onActivity(name);this.sync();
    this.focusTarget=name==='home'?this.posters[0].el:document.getElementById('go-home');
  }
  sync(){
    this.world.room.dataset.activity=this.active;
    document.getElementById('go-home').hidden=this.active==='home';
    document.querySelector('.view-controls').hidden=this.active!=='music';
    document.getElementById('home-caption').hidden=this.active!=='home';
    this.posters.forEach(p=>{p.el.inert=this.active!=='home';});
    this.objects.forEach(p=>p.el.inert=p.activity!==this.active);
    this.console.inert=this.active!=='cinema';this.screen.inert=this.active!=='cinema';
    document.getElementById('record-layer').inert=this.active!=='music';this.world.billboard.inert=this.active!=='music';
  }
  step(dt){this.motion.step(dt);this.world.musicAmount=this.motion.amount('music');}
  filmState(playing){
    this.filmPlaying=playing;this.demo.dataset.playing=String(playing);const b=document.getElementById('film-play');
    b.setAttribute('aria-pressed',String(playing));b.textContent=playing?'Ⅱ 일시정지':'▶ 필름 재생';
  }
  async toggleFilm(){
    if(this.url){
      if(this.video.paused){try{await this.video.play();}catch{document.getElementById('film-status').textContent='재생 버튼을 다시 눌러 주세요.';}}else this.video.pause();
    }else this.filmState(!this.filmPlaying);
  }
  loadFilm(file){
    if(!file)return;this.video.pause();if(this.url)URL.revokeObjectURL(this.url);
    this.url=URL.createObjectURL(file);this.video.src=this.url;this.video.hidden=false;this.demo.hidden=true;
    document.getElementById('film-name').textContent=file.name;document.getElementById('film-status').textContent='선택한 영상은 이 기기에서만 재생됩니다.';this.filmState(false);
  }
  readArticle(index){
    const article=journal[index],dialog=document.getElementById('article-reader');
    dialog.querySelector('h2').textContent=article.title;dialog.querySelector('.article-tag').textContent=article.tag+' · 룸 저널 샘플 에디션';
    const body=dialog.querySelector('.article-body');body.replaceChildren(...article.text.split('\n\n').map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));dialog.showModal();
  }
  visibility(el,amount){el.style.opacity=clamp(amount*3);el.style.visibility=amount<.002?'hidden':'visible';}
  plane(item,frame,amount,index=0){
    const p=stagger(amount,index*.06),s=mix(.68,1,p),z=item.height+landing(p),u=item.u+(1-p)*110,v=item.v+(1-p)*150;
    const points=corners(u,v,item.width*s,item.depth*s,item.angle+(1-p)*12);
    this.world.place(item.el,mapPoints(raisedFloor(frame,z),points),item.width,item.depth);this.visibility(item.el,p);
    if(item.poster){item.shadow.style.opacity=0;item.edge.style.opacity=0;return;}
    let outline=corners(0,0,item.width,item.depth);
    if(item.name==='projector')outline=roundedOutline(28,82,375,222,26);
    if(item.name==='coffee')outline=Array.from({length:64},(_,i)=>{const a=i*Math.PI/32;return[102+Math.cos(a)*85,108+Math.sin(a)*85];});
    const angle=(item.angle+(1-p)*12)*Math.PI/180,c=Math.cos(angle),sn=Math.sin(angle);
    const footprint=outline.map(([x,y])=>[u+s*(c*x-sn*y),v+s*(sn*x+c*y)]);
    item.shadow.setAttribute('d',path(mapPoints(shadowFloor(frame,z,this.world.lightHour),footprint)));item.shadow.style.opacity=p*.20;
    const top=mapPoints(raisedFloor(frame,z),footprint),base=mapPoints(raisedFloor(frame,z-item.height),footprint);
    item.edge.setAttribute('fill',item.name==='projector'?'#362340':item.name==='coffee'?'#d6a76e':'#a89171');
    item.edge.setAttribute('d',path([...top,...base.reverse()]));item.edge.style.opacity=clamp(p*3);
  }
  render(frame){
    const home=this.motion.amount('home');
    this.world.place(this.heading,mapPoints(frame.floor,corners(420,72,940,205,-2)),940,205);this.visibility(this.heading,home);
    this.posters.forEach((p,i)=>this.plane({...p,...p.pose,height:5,poster:true},frame,home,i));
    this.objects.forEach((p,i)=>this.plane(p,frame,this.motion.amount(p.activity),i));
    const cinema=stagger(this.motion.amount('cinema'),.13);
    this.world.place(this.screen,wallArtQuad(frame.wall),1000,600);this.visibility(this.screen,cinema);
    this.world.place(this.console,mapPoints(frame.floor,corners(985,175,590,300,0)),590,300);this.visibility(this.console,cinema);
    if(this.focusTarget&&!this.focusTarget.hidden&&this.focusTarget.style.visibility!=='hidden'){this.focusTarget.focus({preventScroll:true});this.focusTarget=null;}
    this.world.room.dataset.transitioning=String(this.motion.amount(this.active)<.995);
  }
  destroy(){this.abort.abort();this.video.pause();if(this.url)URL.revokeObjectURL(this.url);}
}
