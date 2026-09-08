// Curated art direction, not audio analysis. Times are the device's local time.
const look=(edition,palette)=>({edition,palette});
const E=n=>look('expressive',n),L=n=>look('liquid',n),B=n=>look('bauhaus',n);
export const PERIODS=['morning','day','evening','night'];
export const TRACK_MOODS={
  'midnight-rotation':[L(1),L(1),L(2),L(0)],
  'eye-of-the-needle':[E(2),E(0),E(1),B(1)],
  'twin-profile':[B(0),B(0),B(2),L(2)],
  'sun-machine':[E(0),E(0),B(2),E(1)],
  'cut-and-paste':[B(0),B(0),B(2),B(1)],
  'slow-bloom':[L(1),E(2),L(2),L(0)],
};
const HOME=[E(0),B(0),E(1),L(0)];
const COPY={
  morning:{label:'MORNING LIGHT',title:'A slower<br>start.',subtitle:'좋아하는 것으로 하루를 깨우는 시간.'},
  day:{label:'IN THE DAYLIGHT',title:'Room for<br>yourself.',subtitle:'온전히 나를 위해 비워 둔 한 칸.'},
  evening:{label:'THE GOLDEN HOUR',title:'Stay a<br>little longer.',subtitle:'하루의 끝에, 조금 더 머물러요.'},
  night:{label:'AFTER HOURS',title:'Let the<br>world wait.',subtitle:'세상은 잠시, 내일로 미뤄 두어요.'},
};
export const localHour=(date=new Date())=>date.getHours()+date.getMinutes()/60+date.getSeconds()/3600;
export function normalizeHour(value){
  const n=Number(value);return Number.isFinite(n)?((n%24)+24)%24:13;
}
export function timePeriod(hour){
  const h=normalizeHour(hour);
  return h>=5&&h<11?'morning':h>=11&&h<17?'day':h>=17&&h<20?'evening':'night';
}
export function roomMood({hour=13,activity='home',trackId,trackMoods}={}){
  const h=normalizeHour(hour),period=timePeriod(h),i=PERIODS.indexOf(period);
  let design=HOME[i];
  if(activity==='music')design=trackMoods?.[period]??TRACK_MOODS[trackId]?.[i]??HOME[i];
  if(activity==='cinema')design=L(period==='morning'||period==='day'?1:period==='evening'?2:0);
  if(activity==='journal')design=period==='night'?L(0):B(period==='evening'?2:0);
  // The same day/night envelope also controls the projected window light.
  const daylight=Math.max(0,Math.sin((h-6)*Math.PI/14));
  const minutes=Math.floor(h*60+1e-7)%1440;
  return {...design,period,hour:h,lightHour:Math.min(19,Math.max(7,h)),daylight,
    clock:`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`,...COPY[period]};
}
export function debugAllowed({dev=false,hostname='',search=''}={}){
  return dev===true&&['localhost','127.0.0.1','[::1]','::1'].includes(hostname)&&new URLSearchParams(search).get('debug')==='1';
}
