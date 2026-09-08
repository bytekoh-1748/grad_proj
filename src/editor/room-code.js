/** A data-only, line-based .room language. No JavaScript is evaluated. */
import {KINDS,WIDGETS,widgetVariant} from './widget-catalog.js';
export {KINDS} from './widget-catalog.js';
export const MATERIALS = ['clay','chrome','glass','ink'];
export const COMPOSITIONS = ['floor','close','graphic'];
const SETTINGS = ['room','title','composition','palette','surface','light','camera','shader'];
const DEFAULTS = {title:'Good things.\nAll yours.',composition:'floor',palette:'citrus',surface:{width:28,depth:24,wall:true},light:{color:'#fff0ce',intensity:3,cycle:'day'},camera:null,shader:{pattern:'grain',strength:0.12,speed:0.35,code:''}};
export class RoomError extends Error { constructor(message,line=1){super(message);this.line=line;} }
const fail = (message,line) => {throw new RoomError(message,line);};
const finite = (n,min,max) => typeof n==='number' && Number.isFinite(n) && n>=min && n<=max;
const vec = (a,min,max) => Array.isArray(a) && a.length===3 && a.every(n=>finite(n,min,max));
const record = v => v && typeof v==='object' && !Array.isArray(v);
const color = v => typeof v==='string' && /^#[\da-f]{6}$/i.test(v);
const identifier = v => typeof v==='string' && /^[a-zA-Z][\w-]{0,63}$/.test(v);
function jsonEnd(line,start){
  if(!['"','{','['].includes(line[start])){
    const primitive=line.slice(start).match(/^(?:null|true|false|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
    if(primitive)return start+primitive[0].length;
  }
  let quoted=false,escape=false,depth=0;
  for(let i=start;i<line.length;i++){
    const c=line[i];
    if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"'){quoted=false;if(depth===0)return i+1;}}
    else if(c==='"')quoted=true;
    else if(c==='{'||c==='[')depth++;
    else if(c==='}'||c===']'){depth--;if(depth===0)return i+1;}
  }
  return line.length;
}
export function parseRoom(source){
  if(typeof source!=='string'||source.length>500000)fail('방 코드는 500KB 이하여야 합니다.');
  const scene={...structuredClone(DEFAULTS),objects:[]}, nodes=[], seen=new Set(),ids=new Set();
  source.split('\n').forEach((line,index)=>{
    if(!line.trim()||line.trimStart().startsWith('//'))return;
    const match=line.match(/^(\s*)(\w+)\s+/);if(!match)fail('선언을 읽을 수 없습니다.',index+1);
    const key=match[2];let start=match[0].length,id,kind;
    if(key==='object'){
      const head=line.slice(start).match(/^"([a-zA-Z][\w-]{0,63})"\s+(\w+)\s+/);
      if(!head)fail('object "고유-id" camera { ... } 형식으로 작성하세요.',index+1);
      [ ,id,kind]=head;start+=head[0].length;
      if(ids.has(id))fail(`중복 오브제 ID: ${id}`,index+1);
      if(!KINDS.includes(kind))fail(`지원하지 않는 오브제: ${kind}`,index+1);ids.add(id);
    }else{
      if(!SETTINGS.includes(key))fail(`알 수 없는 선언: ${key}`,index+1);
      if(seen.has(key))fail(`${key} 선언은 한 번만 사용할 수 있습니다.`,index+1);seen.add(key);
    }
    const end=jsonEnd(line,start),tail=line.slice(end).trim();
    if(tail&&!tail.startsWith('//'))fail('선언 뒤에는 주석만 올 수 있습니다.',index+1);
    let value;try{value=JSON.parse(line.slice(start,end));}catch{fail('따옴표, 쉼표, 괄호를 확인하세요.',index+1);}
    if(key==='object'){
      if(!record(value))fail('오브제 속성은 { } 안에 작성하세요.',index+1);
      const o={at:[0,0,0],rotate:[0,0,0],scale:1,color:'#9268d5',material:'clay',variant:'classic',relief:.24,motion:'none',surface:'floor',action:WIDGETS[kind].action,content:'',...value,id,kind};
      if(!vec(o.at,-100,100)||!vec(o.rotate,-360,360)||!finite(o.scale,.15,6))fail('위치 ±100, 회전 ±360, 크기 0.15–6 범위를 사용하세요.',index+1);
      if(!widgetVariant(kind,o.variant))fail('이 위젯에서 사용할 수 없는 디자인입니다.',index+1);
      if(!finite(o.relief,0,.65))fail('이미지 깊이 relief는 0–0.65 범위입니다.',index+1);
      if(!color(o.color)||!MATERIALS.includes(o.material))fail('색은 #RRGGBB, 재질은 clay / chrome / glass / ink입니다.',index+1);
      if(!['none','float','spin','pulse'].includes(o.motion)||!['floor','wall'].includes(o.surface))fail('움직임 또는 배치 표면을 확인하세요.',index+1);
      if(!['gallery','music','video','article','light','room','clock','calendar','calculator','sketch','none'].includes(o.action)||typeof o.content!=='string'||o.content.length>2000)fail('인터랙션과 콘텐츠 연결을 확인하세요.',index+1);
      scene.objects.push(o);
    }else scene[key]=value;
    nodes.push({key,id,line:index,start,end,value});
  });
  const at=key=>(nodes.find(n=>n.key===key)?.line??0)+1;
  if(!identifier(scene.room))fail('room "고유-id" 선언이 필요합니다.',at('room'));
  if(typeof scene.title!=='string'||scene.title.length>100)fail('제목은 100자 이하입니다.',at('title'));
  if(!COMPOSITIONS.includes(scene.composition))fail('구도는 floor / close / graphic입니다.',at('composition'));
  if(!['citrus','berry','blue','paper','auto'].includes(scene.palette))fail('팔레트는 citrus / berry / blue / paper / auto입니다.',at('palette'));
  if(!record(scene.surface)||!finite(scene.surface.width,10,60)||!finite(scene.surface.depth,10,60)||typeof scene.surface.wall!=='boolean')fail('표면은 width / depth (10–60), wall (true / false)로 정의하세요.',at('surface'));
  if(!record(scene.light)||!color(scene.light.color)||!finite(scene.light.intensity,0,8)||!['day','still','pulse'].includes(scene.light.cycle))fail('조명 속성을 확인하세요. intensity: 0–8, cycle: day / still / pulse',at('light'));
  if(scene.camera!==null&&(!record(scene.camera)||!vec(scene.camera.position,-100,100)||!vec(scene.camera.target,-100,100)||!finite(scene.camera.fov,20,90)||Math.hypot(...scene.camera.position.map((n,i)=>n-scene.camera.target[i]))<1))fail('카메라 position / target / fov (20–90)를 확인하세요.',at('camera'));
  if(!record(scene.shader)||!['grain','stripes','checker','none'].includes(scene.shader.pattern)||!finite(scene.shader.strength,0,1)||!finite(scene.shader.speed,0,3)||typeof scene.shader.code!=='string'||scene.shader.code.length>8000)fail('셰이더 pattern / strength (0–1) / speed (0–3) / code를 확인하세요.',at('shader'));
  if(scene.objects.length>150)fail('한 방에 오브제는 150개까지 배치할 수 있습니다.');
  return {scene,nodes,source};
}
// Replace only the edited JSON value. Other lines, indentation and comments survive.
export function patchRoom(source,key,value,id){
  const ast=parseRoom(source),node=ast.nodes.find(n=>n.key===key&&(key!=='object'||n.id===id));
  const lines=source.split('\n');
  if(node){
    if(value===undefined)lines.splice(node.line,1);
    else{const line=lines[node.line];lines[node.line]=line.slice(0,node.start)+JSON.stringify(value)+line.slice(node.end);}
  }else if(value!==undefined){lines.push(`${key} ${JSON.stringify(value)}`);}
  return lines.join('\n');
}
export function patchObject(source,id,patch){
  const node=parseRoom(source).nodes.find(n=>n.key==='object'&&n.id===id);
  if(!node)throw new RoomError('선택한 오브제가 없습니다.');
  return patchRoom(source,'object',patch===null?undefined:{...node.value,...patch},id);
}
export function appendObject(source,kind,properties={}){
  const ids=new Set(parseRoom(source).scene.objects.map(o=>o.id));let i=1;while(ids.has(`${kind}-${i}`))i++;
  const id=`${kind}-${i}`,value={at:[0,0,0],rotate:[0,0,0],scale:1,color:'#9268d5',material:'clay',motion:'none',...properties};
  const code=source.trimEnd()+`\nobject "${id}" ${kind} ${JSON.stringify(value)}\n`;parseRoom(code);return {code,id};
}
export class RoomHistory {
  constructor(source){parseRoom(source);this.entries=[source];this.index=0;this.draft=source;}
  get source(){return this.entries[this.index];}
  get dirty(){return this.draft!==this.source;}
  commit(source){parseRoom(source);if(source!==this.source){this.entries.splice(this.index+1);this.entries.push(source);if(this.entries.length>100)this.entries.shift();this.index=this.entries.length-1;}this.draft=source;}
  undo(){if(this.dirty)return false;if(this.index>0){this.draft=this.entries[--this.index];return true;}return false;}
  redo(){if(this.dirty)return false;if(this.index<this.entries.length-1){this.draft=this.entries[++this.index];return true;}return false;}
}
