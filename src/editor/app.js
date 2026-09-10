import {RoomRenderer} from './renderer.js';
import {OBJECT_TITLES,objectCode,mergeObjectCode} from './object-code.js';
import './widget-appearance.css';
import {widgetVariant} from './widget-catalog.js';
import {FloatingWindows} from './floating-windows.js';
import {StudioDrawer} from './studio-drawer.js';
import './studio-drawer.css';
import './studio-mono.css';
import {parseRoom,patchRoom,patchObject,appendObject,RoomHistory,RoomError,KINDS} from './room-code.js';
import {INITIAL_ROOMS,LIBRARY,templateSource} from './templates.js';
import {loadProject,saveProject,download,exportBundle,importBundle,importAsset} from './storage.js';
import {createCodeEditor} from './code-editor.js';
import {RoomMedia,escapeHTML as esc} from './media.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],app=$('#app');
let project,loadWarning;try{project=loadProject();}catch(error){loadWarning=error.message;project={rooms:INITIAL_ROOMS.map(r=>({...r,history:new RoomHistory(r.source)})),current:'master'};}
let rooms=project.rooms,currentId=new URLSearchParams(location.search).has('edit')?project.current:'master',editing=new URLSearchParams(location.search).has('edit'),selected=null,world,media,codeEditor,toolWindows,studioDrawer,saveTimer,toastTimer,saveFailed=false,libraryDrag=null,mediaTarget=null;
let openRoomIds=rooms.map(r=>r.id),objectScope=null;
const current=()=>rooms.find(r=>r.id===currentId),scene=()=>parseRoom(current().history.source).scene;
function say(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4300);}
function persist(explicit=false){clearTimeout(saveTimer);try{if(loadWarning&&!explicit){$('#save-state').textContent='복원 확인 필요';return false;}saveProject(rooms,currentId);loadWarning=null;saveFailed=false;$('#save-state').textContent='저장됨';if(explicit)say(current().history.dirty?'공간과 미적용 초안을 이 기기에 저장했습니다.':'모든 방을 이 기기에 저장했습니다.');return true;}catch(error){saveFailed=true;$('#save-state').textContent='저장하지 못함';say('기기 저장 공간을 확인하세요. 프로젝트 내보내기로 보관할 수 있습니다.');return false;}}
function scheduleSave(){clearTimeout(saveTimer);$('#save-state').textContent='저장 중…';saveTimer=setTimeout(()=>persist(),350);}
function editable(){if(current().history.dirty){say('미적용 코드가 있습니다. 실행하거나 초안을 되돌린 뒤 편집하세요.');return false;}return true;}
function showError(error){toolWindows?.open('code-window');$('#code-error').hidden=false;$('#code-error').textContent=objectScope?error.message:`${error.line?`${error.line}행 · `:''}${error.message}`;$('#code-state').textContent='오류 · 마지막 장면 유지';$('#code-state').style.color='#ff998b';}
function clearError(){$('#code-error').hidden=true;$('#code-error').textContent='';$('#code-state').style.color='';}
function updateCodeState(){const history=current().history;world?.setMode(editing,history.dirty);$('#code-state').textContent=history.dirty?'미적용 초안':'실행됨';$('#code-state').style.color=history.dirty?'#d8c58f':'';$('#discard-draft').hidden=!history.dirty;$('#undo-button').disabled=history.dirty||history.index===0;$('#redo-button').disabled=history.dirty||history.index>=history.entries.length-1;$('#composition').disabled=history.dirty;$('#save-camera').disabled=history.dirty;$$('[data-history]').forEach(b=>b.disabled=b.dataset.history==='undo'?$('#undo-button').disabled:$('#redo-button').disabled);$$('#selection-overlay button').forEach(b=>b.disabled=history.dirty);renderFiles();}
function commit(source,message,{resetView=false}={}){
  try{const next=parseRoom(source).scene;if(next.room!==currentId)throw new RoomError('방 ID는 파일명과 독립적으로 유지됩니다. room ID를 바꿀 수 없습니다.');world.validateShader(next.shader.code);current().history.commit(source);clearError();world.apply(next,{resetView});syncCodeDocument();syncUI();persist();if(message)say(message);return true;}catch(error){showError(error);say(error.message);return false;}
}
function mutate(make,message,options){if(!editable())return false;try{return commit(make(current().history.source),message,options);}catch(error){showError(error);return false;}}
function runCode(){const history=current().history;const draft=history.draft;if(commit(draft,'코드를 공간에 적용했습니다.'))return;history.draft=draft;updateCodeState();showError((()=>{try{parseRoom(draft);world.validateShader(parseRoom(draft).scene.shader.code);return new RoomError('room ID는 변경할 수 없습니다.');}catch(e){return e;}})());persist();}
function historyStep(direction){if(!editable())return;const h=current().history,changed=direction==='undo'?h.undo():h.redo();if(changed){clearError();world.apply(parseRoom(h.source).scene);syncCodeDocument();syncUI();persist();say(direction==='undo'?'한 번의 변경을 되돌렸습니다.':'변경을 다시 적용했습니다.');}}
function setSelected(id,activate=false){selected=scene().objects.some(o=>o.id===id)?id:null;if(libraryTarget&&libraryTarget.id!==selected){libraryTarget=null;renderLibrary();}world.select(selected);if(editing&&selected&&objectScope&&objectScope.id!==selected&&!current().history.dirty){objectScope=objectCode(current().history.source,selected);codeEditor.value=objectScope.code;}renderObjects();renderCodeContext();positionTag();if(activate&&selected){if(editing)openObjectCode(selected);else world.focus(selected);}}
function positionTag(){
  if(!world)return;const frame=editing&&selected?world.frameFor(selected):null,overlay=$('#selection-overlay');overlay.hidden=!frame?.visible;app.dataset.selection=String(!overlay.hidden);if(overlay.hidden)return;
  const width=$('#scene').clientWidth,height=$('#scene').clientHeight,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),center=frame.center;
  const corners=frame.corners.map(p=>({x:center.x+(p.x-center.x)*1.045,y:center.y+(p.y-center.y)*1.045}));
  $('.selection-drawing').setAttribute('viewBox',`0 0 ${width} ${height}`);$('#selection-outline').setAttribute('points',corners.map(p=>`${p.x},${p.y}`).join(' '));
  $('#selection-corners').setAttribute('d',corners.map(p=>`M${p.x-5},${p.y}h10 M${p.x},${p.y-5}v10`).join(' '));
  const place=(el,p)=>{el.style.left=p.x+'px';el.style.top=p.y+'px';};
  const rotate={x:clamp(corners[1].x+24,18,width-18),y:clamp(corners[1].y-24,18,height-54)};
  $('#rotation-stem').setAttribute('d',`M${corners[1].x},${corners[1].y}L${rotate.x},${rotate.y}`);
  place($('#rotate-handle'),rotate);place($('#scale-handle'),{x:clamp(corners[2].x,18,width-18),y:clamp(corners[2].y,18,height-54)});
  const tag=$('#selection-tag'),o=world.objects.get(selected).userData.data;
  $('#selection-id').textContent=selected;$('#selection-title').textContent=OBJECT_TITLES[o.kind];
  $('#transform-readout').textContent=`${Math.round(((frame.angle+180)%360+360)%360-180)}° / ×${frame.scale.toFixed(2)}`;
  tag.style.maxWidth=Math.max(120,width-24)+'px';tag.classList.toggle('compact',height<360||width<440);
  const tw=tag.offsetWidth,th=tag.offsetHeight;
  place(tag,{x:height<360?12:clamp(frame.left,12,Math.max(12,width-tw-12)),y:height<360?12:clamp(frame.top-th-18,12,Math.max(12,height-th-52))});
  const toolbar=$('.edit-toolbar');toolbar.style.maxWidth=Math.max(130,width-24)+'px';
  const limit=height-toolbar.offsetHeight-50,y=height<360||width<440?limit:Math.min(frame.bottom+14,limit);
  place(toolbar,{x:clamp(center.x,toolbar.offsetWidth/2+12,Math.max(toolbar.offsetWidth/2+12,width-toolbar.offsetWidth/2-12)),y:clamp(y,78,Math.max(78,limit))});

}
function renderFiles(){const list=$('#file-list');list.replaceChildren();for(const room of rooms){const b=document.createElement('button');b.className=`file-button ${room.id===currentId?'active':''}`;b.innerHTML=`<span class="file-icon">◇</span><span>${esc(room.name)}</span>${room.history.dirty?'<span class="file-dot">●</span>':''}`;b.setAttribute('aria-current',room.id===currentId?'page':'false');b.onclick=()=>{switchRoom(room.id);editorTab('code');};list.append(b);}$('#rename-room').disabled=currentId==='master';renderRoomTabs();}
function renderRoomTabs(){
  openRoomIds=openRoomIds.filter(id=>rooms.some(r=>r.id===id));if(!openRoomIds.includes(currentId))openRoomIds.push(currentId);
  const tabs=$('#room-tabs');tabs.replaceChildren();
  for(const id of openRoomIds){
    const room=rooms.find(r=>r.id===id),tab=document.createElement('div');tab.className=`room-tab ${id===currentId?'active':''}`;
    const choose=document.createElement('button');choose.className='room-tab-label';choose.setAttribute('role','tab');choose.tabIndex=id===currentId?0:-1;choose.setAttribute('aria-controls','code-tab');choose.setAttribute('aria-selected',String(id===currentId));choose.innerHTML=`<span class="room-file-icon">◇</span><span>${esc(room.name)}</span>${room.history.dirty?'<span class="tab-dirty">●</span>':''}`;choose.onclick=()=>{switchRoom(id);editorTab('code');$('#room-tabs .active')?.scrollIntoView({block:'nearest',inline:'nearest'});};
    const close=document.createElement('button');close.className='room-tab-close';close.textContent='×';close.setAttribute('aria-label',`${room.name} 탭 닫기`);close.title='탭 닫기';close.tabIndex=id===currentId?0:-1;close.disabled=openRoomIds.length===1;
    close.onclick=()=>{const index=openRoomIds.indexOf(id);openRoomIds=openRoomIds.filter(key=>key!==id);if(id===currentId)switchRoom(openRoomIds[Math.min(index,openRoomIds.length-1)]);else renderRoomTabs();};
    choose.onkeydown=e=>{let index=openRoomIds.indexOf(id);if(e.key==='ArrowLeft')index=(index+openRoomIds.length-1)%openRoomIds.length;else if(e.key==='ArrowRight')index=(index+1)%openRoomIds.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=openRoomIds.length-1;else return;e.preventDefault();switchRoom(openRoomIds[index]);editorTab('code');$('#room-tabs [aria-selected=true]')?.focus();};
    tab.append(choose,close);tabs.append(tab);
  }
  requestAnimationFrame(ensureActiveTabVisible);
}
function ensureActiveTabVisible(){const tabs=$('#room-tabs'),active=tabs.querySelector('.active');if(!active||!tabs.clientWidth)return;const r=active.getBoundingClientRect(),box=tabs.getBoundingClientRect();if(r.left<box.left)tabs.scrollLeft+=r.left-box.left;else if(r.right>box.right)tabs.scrollLeft+=r.right-box.right;}
function renderObjects(){const objects=scene().objects;$('#object-count').textContent=String(objects.length).padStart(2,'0');const list=$('#object-list');list.replaceChildren();for(const o of objects){const row=document.createElement('div');row.className=`object-row ${selected===o.id?'selected':''}`;const choose=document.createElement('button');choose.innerHTML=`${esc(LIBRARY[o.kind].name)}<small>${esc(o.id)}${world.projected(o.id)?.visible?'':' · 화면 밖'}</small>`;choose.onclick=()=>{setSelected(o.id,true);$('#object-popover').hidden=true;$('#object-toggle').setAttribute('aria-expanded','false');};const focus=document.createElement('button');focus.textContent='⊙';focus.setAttribute('aria-label',`${o.id}로 시선 이동`);focus.onclick=()=>{setSelected(o.id);world.focus(o.id);};row.append(choose,focus);list.append(row);}if(!objects.length)list.textContent='오브제 없음';}
function syncUI(){const data=scene();if(selected&&!data.objects.some(o=>o.id===selected))selected=null;world.select(selected);$('#room-name').textContent=current().name;$('#scene-index').textContent=`${String(rooms.indexOf(current())+1).padStart(2,'0')} / ${currentId==='master'?'PERSONAL EXHIBITION':current().name.replace('.room','').toUpperCase()}`;$('#space-title').replaceChildren(...data.title.split('\n').flatMap((line,i)=>{const t=document.createTextNode(line);return i?[document.createElement('br'),t]:[t];}));$('#composition').value=data.composition;updateCodeState();renderObjects();renderCodeContext();positionTag();if(libraryTarget){if(!data.objects.some(o=>o.id===libraryTarget.id))libraryTarget=null;renderLibrary();}const dark=data.palette==='blue';$('#space-panel').style.color=dark?'#f0f0df':'';}
function switchRoom(id){if(!rooms.some(r=>r.id===id)){say('연결된 방을 찾을 수 없습니다. 포털 코드의 content에 연결할 방 ID를 넣으세요.');return;}if(id===currentId)return;media.closeForNavigation();persist();if(libraryTarget){libraryTarget=null;renderLibrary();}currentId=id;selected=null;objectScope=null;world.cancelDrag();world.apply(scene(),{resetView:true});codeEditor.value=current().history.draft;clearError();syncUI();persist();if(!editing)$('#object-popover').hidden=true;say(`${current().name}에 들어왔습니다.`);}
function setMode(value){media?.closeForNavigation();editing=value;app.dataset.mode=editing?'edit':'visit';app.dataset.mobilePanel='space';studioDrawer?.sync(editing);$('.scene-feel>span').textContent=editing?'조각을 골라 모양과 내용을 바꿔 보세요.':'마우스를 천천히 움직이며 들여다보세요.';if(!editing)world.cancelDrag();world.setMode(editing,current().history.dirty);toolWindows?.enable(editing);if(editing)toolWindows?.open('library-window');world.needsRender=true;const url=new URL(location.href);if(editing)url.searchParams.set('edit','1');else url.searchParams.delete('edit');history.replaceState(null,'',url);positionTag();}
function mobilePanel(name){if(name==='space'){if(innerWidth<=760)toolWindows.closeAll();return;}editorTab('code');}
function syncCodeDocument(){
  if(objectScope){try{objectScope=objectCode(current().history.draft,objectScope.id);}catch{objectScope=null;}}
  codeEditor.value=objectScope?.code??current().history.draft;renderCodeContext();
}
function renderCodeContext(){
  const scope=objectScope,data=scene(),o=scope?data.objects.find(o=>o.id===scope.id):null;
  $('#code-window').dataset.scope=o?'object':'room';$('#object-code-context').hidden=!o;
  $('#code-filename').textContent=o?OBJECT_TITLES[o.kind]:current().name;
  $('#source-number').textContent=o?`${String(data.objects.findIndex(item=>item.id===o.id)+1).padStart(2,'0')} / OBJECT SOURCE`:`${String(rooms.indexOf(current())+1).padStart(2,'0')} / ROOM SOURCE`;
  $('#code-context-id').textContent=o?`${o.id} · ${current().name}`:'';
  $('#object-declaration').textContent=o?`object "${o.id}" ${o.kind}`:'';
  $('#selected-code').disabled=!selected;
  codeEditor?.view.contentDOM.setAttribute('aria-label',o?`${o.id} 코드 편집기`:'방 코드 편집기');
}
function openObjectCode(id){
  if(!id)return;
  if(objectScope?.id!==id){
    try{objectScope=objectCode(current().history.draft,id);codeEditor.value=objectScope.code;}
    catch{say('작성 중인 코드를 적용하거나 되돌린 뒤 다른 오브제의 코드를 열 수 있습니다.');toolWindows.open('code-window');return;}
  }
  renderCodeContext();toolWindows.open('code-window');codeEditor.view.requestMeasure();
}
function editorTab(){objectScope=null;codeEditor.value=current().history.draft;renderCodeContext();toolWindows.open('code-window');codeEditor.view.requestMeasure();requestAnimationFrame(ensureActiveTabVisible);}
function setFilePanel(open,save=true){
  const panel=$('#room-files'),button=$('#toggle-room-files');if(!open&&panel.contains(document.activeElement))button.focus({preventScroll:true});
  panel.hidden=!open;$('#code-window').classList.toggle('files-collapsed',!open);button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'방 파일 접기':'방 파일 펼치기');button.title=(open?'방 파일 접기':'방 파일 펼치기')+' (3)';
  if(!open)$('.file-menu').open=false;
  if(save)try{localStorage.setItem('room-code-files-open',String(open));}catch{}
  codeEditor?.view.requestMeasure();requestAnimationFrame(ensureActiveTabVisible);
}
function addObject(kind,at,variant=LIBRARY[kind]?.preview){if(!KINDS.includes(kind)||!widgetVariant(kind,variant)||!editable())return;const surface=$('#placement-surface').value;const pos=at||world.surfacePoint({clientX:$('#scene').getBoundingClientRect().left+$('#scene').clientWidth*.5,clientY:$('#scene').getBoundingClientRect().top+$('#scene').clientHeight*.57},surface)?.toArray()||[0,0,0];pos[1]=surface==='wall'?0:Math.max(.1,...scene().objects.map(o=>o.at[1]))+.15;const props={at:pos.map(n=>+Math.max(-100,Math.min(100,n)).toFixed(2)),color:LIBRARY[kind].color,surface,variant,content:kind==='portal'?(currentId==='master'?'music':'master'):(LIBRARY[kind].content||''),action:LIBRARY[kind].action};const result=appendObject(current().history.source,kind,props);if(commit(result.code,`${LIBRARY[kind].name}를 배치했습니다.`)){setSelected(result.id);mobilePanel('space');}}
const thumbnails=new Map();let libraryKind=null,libraryTarget=null,libraryScroll=0;
function openVariants(kind,target=null){
  if(!libraryKind)libraryScroll=$('#library').scrollLeft;
  libraryKind=kind;libraryTarget=target?{id:target,roomId:currentId}:null;renderLibrary();toolWindows.open('library-window');$('#library-back').focus({preventScroll:true});
}
function libraryHome(){const kind=libraryKind;libraryKind=null;libraryTarget=null;renderLibrary();requestAnimationFrame(()=>{$('#library').scrollLeft=libraryScroll;$(`.library-widget[data-kind="${kind}"]`)?.focus({preventScroll:true});});}
function chooseVariant(kind,variant){
  if(!libraryTarget){addObject(kind,undefined,variant);return;}
  const target=libraryTarget,object=scene().objects.find(o=>o.id===target.id);
  if(target.roomId!==currentId||!object||object.kind!==kind){libraryHome();return;}
  if(mutate(source=>patchObject(source,target.id,{variant}))){setSelected(target.id);renderLibrary();$(`.library-widget[data-variant="${variant}"]`)?.focus({preventScroll:true});mobilePanel('space');}
}
function renderLibrary(){
  const list=$('#library');list.replaceChildren();$('#library-crumb').hidden=!libraryKind;$('#library-kind-name').textContent=libraryKind?LIBRARY[libraryKind].name:'';
  const choices=libraryKind?LIBRARY[libraryKind].variants.map(v=>({kind:libraryKind,variant:v.id,name:v.name})):KINDS.map(kind=>({kind,variant:LIBRARY[kind].preview,name:LIBRARY[kind].name}));
  $('#library-count').textContent=String(choices.length).padStart(2,'0');$('#library-count').setAttribute('aria-label',libraryKind?'디자인 수':'위젯 종류 수');list.setAttribute('aria-label',libraryKind?`${LIBRARY[libraryKind].name} 디자인`:'전체 위젯');list.classList.toggle('variant-list',!!libraryKind);
  for(const {kind,variant,name}of choices){const entry=LIBRARY[kind],key=kind+'/'+variant;if(!thumbnails.has(key))thumbnails.set(key,world.thumbnail(kind,entry.color,variant));
    const button=document.createElement('button');button.className='library-widget';button.draggable=true;button.dataset.kind=kind;button.dataset.variant=variant;
    button.setAttribute('aria-label',libraryKind?`${entry.name} · ${name} ${libraryTarget?'적용':'추가'}`:`${name} 디자인 선택`);button.title=libraryKind?name:entry.name;
    if(libraryKind&&libraryTarget)button.setAttribute('aria-pressed',String(scene().objects.find(o=>o.id===libraryTarget.id)?.variant===variant));
    const meta=document.createElement('span');meta.className='library-tile-heading';meta.innerHTML=`<small>${String(choices.findIndex(c=>c.kind===kind&&c.variant===variant)+1).padStart(2,'0')}</small><strong>${esc(OBJECT_TITLES[kind])}</strong><span aria-hidden="true">↗</span>`;button.append(meta);
    const image=new Image(),size=widgetVariant(kind,variant).size;image.width=1024;image.height=Math.round(1024*size[1]/size[0]);image.src=thumbnails.get(key);image.alt='';image.draggable=false;image.decoding='async';const art=document.createElement('span');art.className='library-tile-art';art.append(image);const caption=document.createElement('span');caption.className='library-tile-caption';caption.textContent=libraryKind?name:`${entry.name} · ${entry.variants.length} designs`;button.append(art,caption);
    button.onclick=()=>libraryKind?chooseVariant(kind,variant):openVariants(kind);
    button.ondragstart=e=>{if(!editable()){e.preventDefault();return;}libraryDrag={kind,variant};e.dataTransfer.setData('application/x-room-widget',JSON.stringify(libraryDrag));e.dataTransfer.effectAllowed='copy';};button.ondragend=()=>{world.clearPreview();libraryDrag=null;};list.append(button);
  }
  list.scrollTop=0;list.scrollLeft=0;
}
function duplicate(){if(!selected||!editable())return;const o=scene().objects.find(o=>o.id===selected),{id,kind,...props}=o;props.at=[o.at[0]+1,o.at[1],o.at[2]+.6];const next=appendObject(current().history.source,kind,props);if(commit(next.code,'오브제를 복제했습니다.'))setSelected(next.id);}
function removeSelected(){if(!selected)return;mutate(source=>patchObject(source,selected,null),'오브제를 삭제했습니다.');}
function openNameDialog(rename=false){$('#name-dialog').dataset.action=rename?'rename':'new';$('#name-title').textContent=rename?'방 이름 바꾸기':'새 방 만들기';$('#name-submit').textContent=rename?'이름 바꾸기':'만들기 ↗';$('#name-input').value=rename?current().name.replace(/\.room$/,''):'';$('#name-error').textContent='';$('#name-dialog').showModal();$('#name-input').focus();}
function submitName(e){if(e.submitter?.value==='cancel')return;e.preventDefault();const name=$('#name-input').value.trim().replace(/\.room$/,'');if(!/^[-\w가-힣 ]{1,64}$/.test(name)){$('#name-error').textContent='한글·영문·숫자·공백·하이픈을 사용하세요.';return;}const filename=name+'.room',rename=$('#name-dialog').dataset.action==='rename';if(rooms.some(r=>r.name===filename&&(!rename||r.id!==currentId))){$('#name-error').textContent='같은 이름의 방이 있습니다.';return;}if(rename){current().name=filename;renderFiles();syncUI();persist();}else{if(rooms.length>=50){$('#name-error').textContent='프로젝트당 방은 50개까지입니다.';return;}const id=`room-${crypto.randomUUID().slice(0,8)}`;const source=templateSource(id,'An unfinished\nexhibition.','floor','paper',[]);rooms.push({id,name:filename,history:new RoomHistory(source)});switchRoom(id);}$('#name-dialog').close();}
async function handleProjectFile(file){if(!file)return;try{if(file.size>160*1024*1024)throw new Error('프로젝트 파일은 160MB 이하만 가져올 수 있습니다.');const text=await file.text();if(file.name.endsWith('.room')){const data=parseRoom(text).scene;if(rooms.some(r=>r.id===data.room))throw new Error('같은 ID의 방이 이미 있습니다. 기존 방의 코드에 붙여 넣어 적용하세요.');if(rooms.some(r=>r.name===file.name)||rooms.length>=50)throw new Error('파일명이 중복되거나 방 개수가 50개를 넘습니다.');world.validateShader(data.shader.code);rooms.push({id:data.room,name:file.name,history:new RoomHistory(text)});switchRoom(data.room);}else{
    // Keep a downloadable recovery copy before replacing the working project.
    const imported=await importBundle(text);for(const r of imported.rooms)world.validateShader(parseRoom(r.history.source).scene.shader.code);
    download('before-import.roompack',new Blob([JSON.stringify({version:1,current:currentId,rooms:rooms.map(r=>({id:r.id,name:r.name,source:r.history.source,draft:r.history.draft}))})],{type:'application/json'}));
    media.closeForNavigation();rooms=imported.rooms;currentId=imported.current;selected=null;objectScope=null;world.apply(scene(),{resetView:true});codeEditor.value=current().history.draft;clearError();syncUI();persist(true);say('프로젝트를 가져왔습니다. 이전 방 코드도 파일로 보관했습니다.');}
  }catch(error){say(`가져오지 못했습니다: ${error.message}`);}finally{$('#project-file').value='';}}
async function handleMediaFiles(files){const target=mediaTarget;if(!target)return;const room=rooms.find(r=>r.id===target.roomId);if(!room||room.history.dirty){say('미적용 코드를 먼저 실행하세요.');return;}try{const object=parseRoom(room.history.source).scene.objects.find(o=>o.id===target.object.id);if(!object)return;const added=[];for(const file of [...files].slice(0,8)){if(!file.type.startsWith(target.type+'/'))continue;added.push(await importAsset(file));}if(!added.length)throw new Error('선택한 콘텐츠에 맞는 파일을 골라 주세요.');const content=[...object.content.split(',').filter(id=>id.startsWith('asset-')),...added.map(a=>a.id)].slice(-20).join(',');const next=patchObject(room.history.source,object.id,{content});if(room.id===currentId){commit(next,'미디어를 연결하고 이 기기에 보관했습니다.');media.open(scene().objects.find(o=>o.id===object.id),currentId);}else{room.history.commit(next);persist();} }catch(error){say(`미디어 연결 실패: ${error.message}`);}finally{$('#media-file').value='';}}
function help(){media.closeForNavigation();$('#content-kicker').textContent='A SMALL LANGUAGE FOR SPACE';$('#content-title').textContent='코드로 만드는 나의 방';$('#content-body').innerHTML=`<div class="code-help-copy"><p>한 줄에 하나의 선언을 씁니다. <code>//</code> 뒤는 주석입니다. 값을 바꾼 뒤 <code>⌘ Enter</code>로 실행하세요.</p><pre>composition "close"\n// floor / close / graphic\n\nobject "camera-1" camera {"at":[0,0,1],"scale":1.5,"color":"#9865c9","material":"chrome","motion":"float"}</pre><p>오브제: ${KINDS.join(', ')}<br>재질: clay, chrome, glass, ink<br>움직임: none, float, spin, pulse</p><p><code>at</code> [가로, 레이어 높이, 세로] · <code>rotate</code> 가운데 값이 평면 회전 · <code>scale</code> 크기 · <code>relief</code> 이미지 안의 깊이 (0–0.65)<br><code>action</code> gallery / music / video / article / light / room / clock / calendar / calculator / sketch / none<br><code>appearance</code> 표시 설정: {"date":"2026-08-15","text":"MY LITTLE ROOM"}<br>감상에서는 주민들이 위젯과 함께 생활하고, 클릭하면 가까이 봅니다. 꾸미기에서 오브제를 누르면 그 오브제의 코드가 열립니다. appearance 안의 날짜·문구·숫자를 바꾸고 적용하세요. 전체 코드를 누르면 방 전체를 편집할 수 있습니다.<br><code>variant</code> 위젯 디자인 (기존 파일은 classic)<br><code>content</code> 사진·음악 ID, 기사 ID나 글, 연결할 방 ID</p><p>셰이더의 <code>code</code>에는 GLSL 함수 본문을 씁니다. <code>color</code>, <code>p</code>, <code>time</code>을 사용할 수 있으며 vec3를 반환합니다.</p><pre>shader {"pattern":"stripes","strength":0.4,"speed":0.5,"code":"return color * (0.8 + 0.2 * sin(p.x + time));"}</pre><p>오류가 있으면 마지막 정상 장면이 유지됩니다. 미적용 초안이 있을 때는 화면 편집이 잠깁니다. 실행된 코드와 화면 편집은 하나의 실행 취소 이력을 공유합니다.</p><p>왼쪽 드래그는 선택·이동, 오른쪽 드래그는 오브제 회전입니다. 선택한 오브제 위 스크롤은 이미지의 깊이를 바꿉니다. 빈 공간에서 오른쪽 드래그하면 시점을 기울이고, 스크롤하면 확대·축소합니다. 터치와 방향키로는 기존 손잡이를 사용할 수 있습니다.</p><p><code>G</code> 직접 이동 · <code>T</code> 축 이동 · <code>R</code> 오른쪽 드래그 회전 · <code>S</code> 오른쪽 드래그 크기 · <code>F</code> 선택 보기 · <code>H</code> 기본 구도<br><code>⌘S</code> 저장 · <code>⌘Z</code> 실행 취소 · <code>⌘⇧Z</code> 다시 실행</p></div>`;$('#content-dialog').showModal();}
async function start(){try{
  await document.fonts.load('700 30px "Uncut Sans"');world=new RoomRenderer($('#scene'),{onSelect:setSelected,onTransform:(id,values)=>mutate(source=>patchObject(source,id,values)),onBlocked:say,onView:positionTag,onReady:()=>{$('#scene-loading').hidden=true;if(world?.palette){$('#space-panel').style.setProperty('--scene-ink',world.palette.ink);$('#space-panel').style.color=world.palette.ink;}positionTag();}});
  codeEditor=createCodeEditor($('#code-editor'),{onCursor:({line,column})=>{$('#code-summary').textContent=`${String(line).padStart(2,'0')} : ${String(column).padStart(2,'0')}`;$('#code-summary').setAttribute('aria-label',`${line}행 ${column}열`);},onChange:source=>{current().history.draft=objectScope?mergeObjectCode(objectScope,source):source;clearError();updateCodeState();renderCodeContext();scheduleSave();},onRun:runCode,onUndo:()=>historyStep('undo'),onRedo:()=>historyStep('redo'),isDirty:()=>current().history.dirty});
  media=new RoomMedia({world,say,onNavigate:switchRoom,onWidgetSave:(roomId,id,content)=>roomId===currentId&&mutate(source=>patchObject(source,id,{content})),onUpload:(type,target)=>{if(!editable())return;mediaTarget={...target,type};$('#media-file').accept=type==='image'?'image/png,image/jpeg,image/webp,image/gif,image/avif':`${type}/*`;$('#media-file').click();},onLight:()=>mutate(source=>patchRoom(source,'light',{...scene().light,intensity:scene().light.intensity>1?.65:3}),'방의 빛을 바꿨습니다.')});
  toolWindows=new FloatingWindows($('.workspace'),{onChange:()=>{codeEditor?.view.requestMeasure();requestAnimationFrame(ensureActiveTabVisible);}});
  let filesOpen=true;try{filesOpen=localStorage.getItem('room-code-files-open')!=='false';}catch{}setFilePanel(filesOpen,false);
  studioDrawer=new StudioDrawer($('#mode-button'),{onChange:setMode,isOpen:()=>editing});
  world.apply(scene(),{resetView:true});world.setTool('direct');codeEditor.value=current().history.draft;renderLibrary();setMode(editing);syncUI();
  let reduced=world.reduced;try{reduced=reduced||localStorage.getItem('room-reduced')==='true';}catch{}setReduced(reduced);
  $('#save-button').onclick=()=>persist(true);$('#run-code').onclick=runCode;$('#discard-draft').onclick=()=>{current().history.draft=current().history.source;syncCodeDocument();clearError();syncUI();persist();say('초안을 마지막 실행 상태로 되돌렸습니다.');};
  $('#undo-button').onclick=()=>historyStep('undo');$('#redo-button').onclick=()=>historyStep('redo');
  $('#home-view').onclick=()=>{world.home();world.setGrid(false);$('#grid-button').setAttribute('aria-pressed','false');};$('#focus-view').onclick=()=>selected?world.focus(selected):say('오브제를 먼저 선택하세요.');$('#top-view').onclick=()=>{world.top();$('#grid-button').setAttribute('aria-pressed','true');};
  $('#zoom-in').onclick=()=>zoom(.82);$('#zoom-out').onclick=()=>zoom(1.22);$('#panel-toggle').onclick=()=>{toolWindows.arrange();if(!toolWindows.opened.size)toolWindows.open('library-window');};
  $('#object-toggle').onclick=()=>{const hidden=!$('#object-popover').hidden;$('#object-popover').hidden=hidden;$('#object-toggle').setAttribute('aria-expanded',String(!hidden));renderObjects();};$('#object-close').onclick=()=>{$('#object-popover').hidden=true;$('#object-toggle').setAttribute('aria-expanded','false');};
  $$('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$('#snap-button').onclick=()=>{world.setSnap(!world.snap);$('#snap-button').setAttribute('aria-pressed',String(world.snap));};$('#grid-button').onclick=()=>{world.setGrid(!world.grid.visible);$('#grid-button').setAttribute('aria-pressed',String(world.grid.visible));};
  $$('[data-editor-tab]').forEach(b=>b.onclick=()=>editorTab(b.dataset.editorTab));$$('[data-window-toggle]').forEach(b=>b.onclick=()=>{if(b.dataset.windowToggle==='code-window'&&!toolWindows.opened.has('code-window'))editorTab();else toolWindows.toggle(b.dataset.windowToggle);});$$('[data-history]').forEach(b=>b.onclick=()=>historyStep(b.dataset.history));$('#duplicate-object').onclick=duplicate;$('#delete-object').onclick=removeSelected;$('#object-variants').onclick=()=>{if(selected)openVariants(scene().objects.find(o=>o.id===selected).kind,selected);};$('#library-back').onclick=libraryHome;$('#open-object-code').onclick=()=>openObjectCode(selected);$('#selection-tag').onclick=()=>openObjectCode(selected);$('#selected-code').onclick=()=>openObjectCode(selected);$('#show-room-code').onclick=()=>editorTab();
  $('#composition').onchange=e=>mutate(source=>patchRoom(patchRoom(source,'composition',e.target.value),'camera',null),'구도를 바꿨습니다.',{resetView:true});$('#save-camera').onclick=()=>mutate(source=>patchRoom(source,'camera',world.cameraState()),'현재 시점을 기본 구도로 저장했습니다.');
  $('#toggle-room-files').onclick=()=>setFilePanel($('#room-files').hidden);$('.file-actions').addEventListener('click',e=>{if(e.target.closest('button'))$('.file-menu').open=false;});$('#new-room').onclick=()=>openNameDialog();$('#rename-room').onclick=()=>openNameDialog(true);$('#name-dialog form').onsubmit=submitName;
  $('#download-room').onclick=()=>download(current().name,new Blob([current().history.source],{type:'text/plain'}));$('#export-project').onclick=async()=>{try{await exportBundle(rooms,currentId);say('미디어와 초안을 포함한 프로젝트를 내보냈습니다.');}catch(error){say(`내보내기 실패: ${error.message}`);}};
  $('#import-project').onclick=()=>$('#project-file').click();$('#project-file').onchange=e=>handleProjectFile(e.target.files[0]);$('#media-file').onchange=e=>handleMediaFiles(e.target.files);$('#code-help').onclick=help;$('#reduced-motion').onclick=()=>setReduced(!world.reduced);
  $('#scene').ondragover=e=>{if(!editing||current().history.dirty||!libraryDrag)return;e.preventDefault();e.dataTransfer.dropEffect='copy';world.preview(libraryDrag.kind,e,$('#placement-surface').value,libraryDrag.variant);};$('#scene').ondragleave=e=>{if(!$('#scene').contains(e.relatedTarget))world.clearPreview();};$('#scene').ondrop=e=>{e.preventDefault();let item;try{item=JSON.parse(e.dataTransfer.getData('application/x-room-widget'));}catch{return;}if(!editing||!item||!KINDS.includes(item.kind)||!widgetVariant(item.kind,item.variant))return;const p=world.preview(item.kind,e,$('#placement-surface').value,item.variant);world.clearPreview();libraryDrag=null;if(p)addObject(item.kind,p,item.variant);};
  installTransformHandles();document.addEventListener('keydown',keyDown);window.addEventListener('beforeunload',e=>{if(saveTimer)persist();if(saveFailed){e.preventDefault();e.returnValue='';}});window.addEventListener('pagehide',()=>{persist();media.destroy();world.destroy();toolWindows.destroy();studioDrawer.destroy();});
  window.addEventListener('storage',e=>{if(e.key==='room-studio-v1'&&e.newValue)say('다른 탭에서 저장된 변경이 있습니다. 이 탭의 작업을 내보낸 뒤 새로고침하세요.');});

  const clock=()=>{const now=new Date();$('#local-time').dateTime=now.toISOString();$('#local-time').textContent=`${now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} / LOCAL TIME`;};clock();const clockTimer=setInterval(clock,30000);window.addEventListener('pagehide',()=>clearInterval(clockTimer),{once:true});
  if(loadWarning)say(`저장된 프로젝트를 복원하지 못했습니다: ${loadWarning}. 원본은 유지됩니다. 저장 버튼으로 새 프로젝트를 저장할 수 있습니다.`);
}catch(error){console.error('ROOM studio:',error);$('#scene-loading').innerHTML='<p>공간을 열지 못했습니다.</p><p>그래픽 가속을 확인하고 새로고침해 주세요.</p><a href="/legacy.html">기존 ROOM 열기 ↗</a>';say(error.message);}}
function zoom(factor){const p=world.cameraState();p.position=p.position.map((n,i)=>p.target[i]+(n-p.target[i])*factor);world.flyTo(p);}
function setTool(tool){world.setTool(tool);app.dataset.tool=tool;$$('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===tool));}
function setReduced(value){world.reduced=value;world.needsRender=true;document.body.classList.toggle('reduced-motion',value);$('#reduced-motion').setAttribute('aria-pressed',String(value));$('#reduced-motion').textContent=value?'▷':'Ⅱ';$('#reduced-motion').title=value?'움직임 재개':'잠시 멈추기';$('#reduced-motion').setAttribute('aria-label',$('#reduced-motion').title);try{localStorage.setItem('room-reduced',String(value));}catch{}}
function keyDown(e){if(e.key==='Escape'){if($('#content-dialog').open||$('#name-dialog').open)return;const panel=e.target.closest('[data-studio-window]');if(panel){toolWindows.close(panel.id,true);return;}$('#object-popover').hidden=true;world.cancelDrag();setSelected(null);return;}const input=e.target.closest('input,textarea,select,[contenteditable=true],dialog');if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();persist(true);return;}if(input)return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();historyStep(e.shiftKey?'redo':'undo');return;}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='d'&&editing){e.preventDefault();duplicate();return;}if(e.altKey||e.ctrlKey||e.metaKey)return;if(e.key.toLowerCase()==='h')world.home();if(e.key.toLowerCase()==='f'&&selected)world.focus(selected);if(!editing)return;if(e.key==='3'){e.preventDefault();const wasOpen=toolWindows.opened.has('code-window')&&!objectScope;editorTab('code');setFilePanel(!wasOpen||$('#room-files').hidden);return;}const windowKeys={'1':'library-window','2':'code-window'};if(windowKeys[e.key]){e.preventDefault();if(e.key==='2'&&!toolWindows.opened.has('code-window'))editorTab();else toolWindows.toggle(windowKeys[e.key]);return;}const map={g:'direct',t:'translate',r:'rotate',s:'scale'};if(map[e.key.toLowerCase()])setTool(map[e.key.toLowerCase()]);if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelected();}}
function installTransformHandles(){
  for(const [id,mode]of [['rotate-handle','rotate'],['scale-handle','scale']]){const handle=$('#'+id);let active=false;
    handle.oncontextmenu=e=>e.preventDefault();
    handle.onpointerdown=e=>{e.preventDefault();e.stopPropagation();if(!world.beginHandle(e,mode))return;setTool(mode);active=true;handle.setPointerCapture(e.pointerId);};
    handle.onpointermove=e=>{if(active)world.pointerMove(e);};handle.onpointerup=e=>{if(!active)return;active=false;world.pointerUp(e);if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);};handle.onpointercancel=()=>{active=false;world.cancelDrag();};
    handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||!selected)return;e.preventDefault();const o=scene().objects.find(o=>o.id===selected),sign=['ArrowLeft','ArrowDown'].includes(e.key)?-1:1;const patch=mode==='rotate'?{rotate:[o.rotate[0],Math.max(-360,Math.min(360,o.rotate[1]+sign*(e.shiftKey?15:5))),o.rotate[2]]}:{scale:+Math.max(.15,Math.min(6,o.scale+sign*.1)).toFixed(2)};mutate(source=>patchObject(source,selected,patch));};
  }
}
start();
