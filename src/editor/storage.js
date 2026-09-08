import {parseRoom,RoomHistory} from './room-code.js';
import {INITIAL_ROOMS} from './templates.js';
const KEY='room-studio-v1';
export function loadProject(){
  const raw=localStorage.getItem(KEY);if(!raw)return {rooms:INITIAL_ROOMS.map(r=>({...r,history:new RoomHistory(r.source)})),current:'master'};
  return decodeProject(JSON.parse(raw));
}
export function decodeProject(data){
  if(data?.version!==1||!Array.isArray(data.rooms)||!data.rooms.length||data.rooms.length>50)throw new Error('ROOM 프로젝트 형식을 확인하세요.');
  const ids=new Set(),names=new Set();const rooms=data.rooms.map(r=>{
    const ast=parseRoom(r.source);if(ast.scene.room!==r.id||ids.has(r.id)||names.has(r.name)||typeof r.name!=='string'||!/^[-\w가-힣 ]{1,64}\.room$/.test(r.name))throw new Error('방 ID 또는 파일명이 올바르지 않습니다.');
    ids.add(r.id);names.add(r.name);const history=new RoomHistory(r.source);if(typeof r.draft==='string'&&r.draft.length<=500000)history.draft=r.draft;return {id:r.id,name:r.name,history};
  });if(!rooms.some(r=>r.id==='master'&&r.name==='master.room'))throw new Error('master.room은 프로젝트의 시작 공간으로 필요합니다.');
  return {rooms,current:ids.has(data.current)?data.current:'master'};
}
export function encodeProject(rooms,current){return {version:1,current,rooms:rooms.map(r=>({id:r.id,name:r.name,source:r.history.source,draft:r.history.draft}))};}
export function saveProject(rooms,current){localStorage.setItem(KEY,JSON.stringify(encodeProject(rooms,current)));}
let dbPromise;
function db(){return dbPromise??=new Promise((resolve,reject)=>{const req=indexedDB.open('room-media-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('assets',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function putAsset(asset){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('assets','readwrite');tx.objectStore('assets').put(asset);tx.oncomplete=()=>resolve(asset);tx.onerror=()=>reject(tx.error);});}
export async function allAssets(){const database=await db();return new Promise((resolve,reject)=>{const req=database.transaction('assets').objectStore('assets').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function importAsset(file){if(file.size>80*1024*1024)throw new Error('파일당 80MB까지 지원합니다.');if(!/^(image\/(png|jpeg|webp|gif|avif)|audio\/|video\/)/.test(file.type))throw new Error('이미지, 오디오, 영상 파일을 선택하세요.');return putAsset({id:`asset-${crypto.randomUUID()}`,name:file.name,type:file.type,blob:file});}
export function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export async function exportBundle(rooms,current){const assets=await allAssets(),encoded=await Promise.all(assets.map(async a=>({...a,blob:await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(a.blob);})})));download('my-rooms.roompack',new Blob([JSON.stringify({...encodeProject(rooms,current),assets:encoded})],{type:'application/json'}));}
export async function importBundle(text){
  const data=JSON.parse(text),project=decodeProject(data);if(data.assets&&!Array.isArray(data.assets))throw new Error('미디어 목록이 잘못되었습니다.');
  const assets=await Promise.all((data.assets||[]).map(async a=>{if(typeof a.id!=='string'||!a.id.startsWith('asset-')||typeof a.blob!=='string'||!/^data:(image\/(png|jpeg|webp|gif|avif)|audio\/[\w.+-]+|video\/[\w.+-]+);base64,/.test(a.blob))throw new Error('미디어 형식을 확인하세요.');return {...a,blob:await (await fetch(a.blob)).blob()};}));
  // Validation finishes before any durable writes.
  for(const a of assets)await putAsset(a);return project;
}
