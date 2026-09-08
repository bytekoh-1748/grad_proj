/** Shared visual and interaction defaults for every placeable window. */
export const WIDGETS={
  camera:{name:'이미지 창',label:'afterimage.png',color:'#edff52',size:[5.1,4.05],action:'gallery',content:'photos'},
  turntable:{name:'음악 플레이어',label:'sound.exe',color:'#edff52',size:[4.8,3.7],action:'music',content:'midnight-rotation'},
  clock:{name:'시계',label:'local.time',color:'#c2b3ed',size:[4.3,2.15],action:'clock'},
  calendar:{name:'달력',label:'day.by.day',color:'#ff7353',size:[3.35,3.85],action:'calendar'},
  lamp:{name:'날씨 위젯',label:'chromatic.study',color:'#edff52',size:[2.65,2.95],action:'light'},
  book:{name:'메모',label:'untitled.txt',color:'#edff52',size:[2.8,3.85],action:'article',content:'empty-time'},
  cassette:{name:'카세트',label:'mixtape.wav',color:'#c2b3ed',size:[4.65,3.1],action:'music',content:'midnight-rotation'},
  calculator:{name:'계산기',label:'numbers.app',color:'#edff52',size:[2.85,3.9],action:'calculator'},
  terminal:{name:'터미널',label:'thoughts.sh',color:'#edff52',size:[4.65,3.25],action:'article',content:'천천히 쌓이는 생각들.\n\n아직 이름 붙이지 않은 것들을 이곳에 남겨 둔다.'},
  radio:{name:'라디오',label:'room.fm',color:'#ff7353',size:[4.65,2.6],action:'music',content:'midnight-rotation'},
  portal:{name:'다른 방',label:'elsewhere.room',color:'#edff52',size:[3,2.1],action:'room'},
  sketch:{name:'픽셀 스케치',label:'small.paint',color:'#c2b3ed',size:[3.7,3.8],action:'sketch'},
  projector:{name:'영상 플레이어',label:'moving_image.mp4',color:'#edff52',size:[4.8,3.7],action:'video',content:'colour-in-motion'},
  scope:{name:'오실로스코프',label:'signal.osc',color:'#edff52',size:[4.15,3.15],action:'music',content:'midnight-rotation'},
};
export const KINDS=Object.keys(WIDGETS);

const styles={
  camera:[['aperture','원형 이미지',[4.2,4.2]]],
  turntable:[['vinyl','레코드',[3.7,4.2]]],
  clock:[['dial','아날로그',[3.5,3.5]],['pill','디지털 캡슐',[5.1,1.85]]],
  calendar:[['orbit','원형 날짜',[3.5,3.5]],['ticket','날짜 티켓',[4.9,2.25]],['peel','페이퍼 날짜',[3.2,3.85]]],
  lamp:[['sunburst','햇살',[3.4,3.4]],['cloud','구름',[4.1,2.6]]],
  book:[['torn','찢어진 메모',[3.2,3.7]]],
  cassette:[['reels','테이프 릴',[4.6,3.1]]],
  calculator:[['pebble','둥근 계산기',[2.85,4.2]]],
  terminal:[['bubble','말풍선 터미널',[4.4,3.2]]],
  radio:[['capsule','라디오 캡슐',[5.1,2.2]]],
  portal:[['arch','아치',[2.65,4.1]]],
  sketch:[['palette','팔레트',[4,3.4]]],
  projector:[['ticket','시네마 티켓',[5.4,2.7]]],
  scope:[['radar','레이더',[4,4]]],
};
for(const [kind,widget] of Object.entries(WIDGETS)){
  widget.variants=[...styles[kind].map(([id,name,size])=>({id,name,size})),{id:'classic',name:kind==='calendar'?'월간 달력':'클래식 창',size:widget.size}];
  widget.preview=widget.variants[0].id;
}
export const widgetVariant=(kind,id='classic')=>WIDGETS[kind]?.variants.find(v=>v.id===id);
export const widgetSize=(kind,id='classic')=>widgetVariant(kind,id)?.size||WIDGETS[kind].size;
