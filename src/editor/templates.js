const object=(id,kind,values)=>`object "${id}" ${kind} ${JSON.stringify(values)}`;
const camera={at:[-3.7,.55,-1.25],rotate:[0,-5,0],scale:1.5,color:'#edff52',material:'clay',relief:.32,action:'gallery',content:'photos',motion:'none'};
const deck={at:[.65,1.25,2.05],rotate:[0,6,0],scale:1.35,color:'#edff52',material:'clay',relief:.28,action:'music',content:'midnight-rotation'};
const lamp={at:[-7.9,.25,3.4],rotate:[0,8,0],scale:.82,color:'#edff52',material:'clay',relief:.34,action:'light',motion:'none'};
const book={at:[6.7,.6,-.45],rotate:[0,-7,0],scale:1.15,color:'#edff52',material:'clay',relief:.18,action:'article',content:'empty-time'};
const portal={at:[5.45,.85,-4.55],rotate:[0,4,0],scale:1.03,color:'#edff52',material:'clay',relief:.4,action:'room',content:'music'};
export function templateSource(id,title,composition,palette,objects){return `// ROOM / ${id} — an unfinished personal exhibition\nroom "${id}"\ntitle ${JSON.stringify(title)}\ncomposition "${composition}"\npalette "${palette}"\nsurface {"width":50,"depth":24,"wall":true}\nlight {"color":"#fff0ce","intensity":3,"cycle":"still"}\nshader {"pattern":"grain","strength":0.12,"speed":0.35,"code":""}\n\n// at [horizontal, layer, vertical] · rotate [tilt, angle, tilt]\n// relief 0–0.65: depth within the printed image\n${objects.map(([id,kind,v])=>object(id,kind,v)).join('\n')}\n`;}
export const INITIAL_ROOMS=[
{id:'master',name:'master.room',source:templateSource('master','Everything in\nits wrong place.','floor','citrus',[
['camera-1','camera',camera],['turntable-1','turntable',deck],['lamp-1','lamp',lamp],['book-1','book',book],['portal-1','portal',portal]])},
{id:'music',name:'music.room',source:templateSource('music','A little louder.\nA little further.','close','berry',[
['turntable-1','turntable',{...deck,at:[-2,.7,-1],scale:1.8,rotate:[0,-6,0]}],['lamp-1','lamp',{...lamp,at:[-7,0,3]}],['book-1','book',{...book,at:[5,.6,1],content:'flip-a-record'}],['portal-1','portal',{...portal,at:[5,1,-4.5],content:'master'}]])},
{id:'gallery',name:'gallery.room',source:templateSource('gallery','Collected,\nnever completed.','graphic','paper',[
['camera-1','camera',{...camera,at:[-2,.5,-1],scale:1.65,motion:'float'}],['book-1','book',{...book,at:[5,.7,1]}],['lamp-1','lamp',{...lamp,at:[-7,0,3],color:'#ff5635'}],['portal-1','portal',{...portal,at:[5,.8,-4.5],content:'master'}]])},
{id:'cinema',name:'cinema.room',source:templateSource('cinema','Stay for\nthe afterimage.','floor','blue',[
['projector-1','projector',{...camera,at:[-2,.55,-1],color:'#edff52',action:'video',content:'colour-in-motion'}],['lamp-1','lamp',{...lamp,at:[5,.2,2]}],['portal-1','portal',{...portal,at:[5,.8,-4],content:'master'}]])},
];
export {WIDGETS as LIBRARY} from './widget-catalog.js';
