import {decodePixels,PIXEL_COLORS} from './widget-utils.js';
const PAPER='#ecebd7',INK='#121318',BLUE='#252ce5';
/** Silhouettes are drawn into both color and height maps; the surrounding quad stays transparent. */
export function drawVariant(kind,variant,{rect,text,mono,line,ellipse,ring,polygon,rounded,path,centered,clip,hole,H,accent,date,content}){
  const time=date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),day=String(date.getDate()).padStart(2,'0'),month=date.toLocaleDateString('en-GB',{month:'short'}).toUpperCase();
  const disk=(r=464,color=INK)=>ellipse(500,500,r,r,color,.52);
  if(kind==='calendar'&&variant==='orbit'){
    disk(471,INK);disk(456,accent);ring(500,500,424,INK,2,.66);ring(500,500,385,INK,1,.64);
    centered(month,500,258,72,INK,.82,650);centered(day,493,671,398,INK,.93,750);centered(date.toLocaleDateString('en-GB',{weekday:'long'}).toUpperCase(),500,786,36,INK,.8,500);
    for(let i=0;i<31;i++){const a=i/31*Math.PI*2-Math.PI/2;ellipse(500+402*Math.cos(a),500+402*Math.sin(a),i===date.getDate()-1?10:3,i===date.getDate()-1?10:3,INK,i===date.getDate()-1?.91:.72);}
  }else if(kind==='calendar'&&variant==='ticket'){
    path(ctx=>{ctx.moveTo(74,25);ctx.lineTo(925,25);for(let y=25;y<H-25;y+=45){ctx.lineTo(y%90<45?960:925,Math.min(y+22,H-25));ctx.lineTo(925,Math.min(y+45,H-25));}ctx.lineTo(74,H-25);for(let y=H-25;y>25;y-=45){ctx.lineTo(40,y-22);ctx.lineTo(74,Math.max(25,y-45));}ctx.closePath();},PAPER,.61);
    rounded(99,59,307,H-118,19,accent,.7);centered(day,250,307,234,INK,.91,750);mono(month,458,156,58,INK,.86);text(String(date.getFullYear()),455,232,50,INK,.82,550);text(date.toLocaleDateString('en-GB',{weekday:'long'}).toUpperCase(),458,319,40,INK,.84,600);
    for(let y=52;y<H-50;y+=22)line(432,y,432,y+9,INK,2,.73);for(let i=0;i<46;i++)rect(753+i*3,78,1+i%3,H-156,INK,.72);
  }else if(kind==='calendar'&&variant==='peel'){
    polygon([[78,55],[791,31],[942,193],[953,H-110],[900,H-87],[861,H-111],[794,H-70],[755,H-97],[676,H-77],[633,H-104],[542,H-58],[480,H-85],[398,H-48],[343,H-93],[275,H-76],[223,H-108],[140,H-67],[72,H-96]],PAPER,.59);
    polygon([[791,31],[788,205],[942,193]],'#aaa9bb',.76);rect(100,154,621,9,accent,.86);mono(month+' / '+date.getFullYear(),117,278,50,INK,.85);centered(day,509,828,500,INK,.93,750);text(date.toLocaleDateString('en-GB',{weekday:'short'}).toUpperCase(),119,H-193,82,INK,.87,650);
  }else if(kind==='clock'&&variant==='dial'){
    disk(473,PAPER);disk(450,INK);ring(500,500,420,accent,2,.72);
    for(let i=0;i<60;i++){const a=i*Math.PI/30,r=i%5?397:375;line(500+Math.sin(a)*r,500-Math.cos(a)*r,500+Math.sin(a)*411,500-Math.cos(a)*411,i%5?'#636176':PAPER,i%5?2:6,.74);}
    centered('12',500,205,77,PAPER,.82);centered('6',500,853,77,PAPER,.82);centered('3',816,528,77,PAPER,.82);centered('9',181,528,77,PAPER,.82);
    const h=(date.getHours()%12+date.getMinutes()/60)*Math.PI/6,m=date.getMinutes()*Math.PI/30;line(500,500,500+Math.sin(h)*202,500-Math.cos(h)*202,accent,29,.91);line(500,500,500+Math.sin(m)*303,500-Math.cos(m)*303,PAPER,15,.93);ellipse(500,500,24,24,accent,.95);centered('LOCAL TIME',500,675,27,accent,.81,500);
  }else if(kind==='clock'&&variant==='pill'){
    rounded(21,22,958,H-44,(H-44)/2,INK,.45);rounded(30,30,940,H-60,(H-60)/2,accent,.65);ellipse(128,H/2,42,42,INK,.79);ellipse(128,H/2,19,19,PAPER,.9);centered(time,582,H/2+66,202,INK,.93,600);
  }else if(kind==='turntable'){
    ellipse(500,464,440,440,INK,.56);for(let r=424;r>163;r-=8)ring(500,464,r,r%3?'#555547':'#929482',1.7,.62);ellipse(500,464,153,153,accent,.78);centered('SIDE A',500,407,52,INK,.88,700);centered('33⅓',500,559,34,INK,.85,500);hole(500,464,18);
    rounded(233,959,534,112,56,PAPER,.68);polygon([[350,991],[350,1041],[391,1016]],INK,.87);rect(482,991,12,50,INK,.85);rect(507,991,12,50,INK,.85);text('↗',617,1041,55,INK,.88);
  }else if(kind==='lamp'&&variant==='sunburst'){
    const points=Array.from({length:48},(_,i)=>{const a=i*Math.PI/24,r=i%2?357:478;return[500+Math.cos(a)*r,500+Math.sin(a)*r];});polygon(points,accent,.65);ellipse(500,500,324,324,INK,.58);ellipse(500,500,293,293,'#ff7353',.65);ellipse(500,500,229,229,PAPER,.72);ellipse(500,500,168,168,accent,.82);ellipse(500,500,99,99,BLUE,.89);
  }else if(kind==='lamp'&&variant==='cloud'){
    ellipse(774,171,140,140,accent,.65);ring(774,171,113,INK,3,.75);
    path(ctx=>{ctx.moveTo(142,575);ctx.bezierCurveTo(10,570,15,376,130,355);ctx.bezierCurveTo(95,186,350,111,419,267);ctx.bezierCurveTo(470,69,743,97,753,287);ctx.bezierCurveTo(978,240,1033,570,845,576);ctx.closePath();},PAPER,.67);
    centered('SOFT WEATHER',500,439,74,INK,.89,700);centered('A CLOUD OF YOUR OWN',500,505,25,INK,.79,500);
  }else if(kind==='book'){
    polygon([[38,96],[835,34],[961,181],[928,H-56],[867,H-90],[793,H-42],[737,H-84],[671,H-45],[588,H-77],[517,H-40],[443,H-84],[366,H-47],[305,H-97],[210,H-58],[142,H-102],[61,H-68]],PAPER,.59);
    polygon([[835,34],[817,209],[961,181]],accent,.77);['KEEP','WHAT','MOVES','YOU.'].forEach((word,i)=>text(word,116,331+i*202,166,INK,.9,650));
  }else if(kind==='camera'){
    disk(470,PAPER);disk(451,INK);clip(ctx=>ctx.arc(500,500,430,0,Math.PI*2),()=>{rect(60,60,880,880,BLUE,.35);for(let i=0;i<22;i++)line(500,500,75+i*42,953,'#c1b4ee',2,.42);ellipse(611,401,243,243,'#b19cdf',.58);for(let y=181;y<830;y+=14)line(80,y,930,y+120,PAPER,1,.63);centered('AFTER',497,474,179,PAPER,.92,850);centered('IMAGE',499,642,179,PAPER,.91,850);});
    centered('AFTERIMAGE.PNG',500,799,28,accent,.86,600);
  }else if(kind==='cassette'){
    rounded(174,111,652,366,180,INK,.48);[258,741].forEach(x=>{ellipse(x,294,230,230,accent,.6);ring(x,294,195,INK,11,.7);ring(x,294,146,INK,5,.74);ellipse(x,294,85,85,INK,.61);for(let i=0;i<6;i++){const a=i*Math.PI/3;line(x+30*Math.cos(a),294+30*Math.sin(a),x+63*Math.cos(a),294+63*Math.sin(a),PAPER,15,.89);}hole(x,294,15);});line(258,71,741,71,INK,6,.76);line(258,517,741,517,INK,6,.76);rounded(264,558,473,82,41,PAPER,.7);centered('IN BETWEEN',500,614,42,INK,.89,750);
  }else if(kind==='calculator'){
    rounded(51,24,898,H-50,[449,449,76,76],PAPER,.61);rounded(157,192,686,239,60,INK,.42);centered('128.00',501,353,141,accent,.88,650);
    const keys=['AC','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','⌫','0','.','='];keys.forEach((key,i)=>{const x=149+i%4*184,y=480+Math.floor(i/4)*176;ellipse(x+75,y+73,72,72,i%4===3?accent:INK,.74);centered(key,x+75,y+94,58,i%4===3?INK:PAPER,.9,500);});
  }else if(kind==='terminal'){
    rounded(27,25,946,573,75,INK,.6);polygon([[122,547],[81,H-31],[303,584]],INK,.6);mono('room@somewhere',82,115,30,accent,.82);line(83,151,909,151,'#566149',2,.65);mono('> ls /unfinished',82,245,45,accent,.9);mono('dreams    tomorrow',82,323,38,PAPER,.85);text('STILL HERE_',82,476,113,PAPER,.94,750);rect(83,516,27,39,accent,.85);
  }else if(kind==='radio'){
    rounded(22,21,956,H-42,(H-42)/2,accent,.62);text('88.7',102,265,170,INK,.92,650);mono('FM',553,259,42,INK,.86);ellipse(794,H/2,139,139,INK,.54);for(let r=127;r>49;r-=10)ring(794,H/2,r,'#87634b',2,.69);ellipse(794,H/2,36,36,PAPER,.84);line(794,H/2,814,H/2-25,INK,6,.92);for(let i=0;i<32;i++)line(124+i*15,300,124+i*15,i%4?321:335,INK,2,.78);mono('ROOM.FM',162,114,28,INK,.8);
  }else if(kind==='portal'){
    rounded(25,25,950,H-50,[475,475,8,8],INK,.39);rounded(39,39,922,H-78,[461,461,4,4],accent,.59);
    for(let i=0;i<12;i++){const x=72+i*17,top=82+i*27;rounded(x,top,1000-x*2,H-top-73,[(1000-x*2)/2,(1000-x*2)/2,3,3],i%2?'#515b29':accent,.61+i*.014);}
    centered('ELSE',500,770,189,PAPER,.94,750);centered('WHERE',500,950,189,PAPER,.94,750);centered('↗',500,1267,257,PAPER,.92,500);
  }else if(kind==='sketch'){
    path(ctx=>{ctx.moveTo(307,40);ctx.bezierCurveTo(659,-24,984,114,964,455);ctx.bezierCurveTo(955,762,710,862,451,804);ctx.bezierCurveTo(305,787,69,814,32,600);ctx.bezierCurveTo(-1,408,96,83,307,40);ctx.closePath();},PAPER,.58);
    const pixels=decodePixels(content);pixels.forEach((color,i)=>rect(300+i%16*32,167+Math.floor(i/16)*32,31,31,PIXEL_COLORS[color],color===0?.34:.7+color*.035));PIXEL_COLORS.slice(1).forEach((color,i)=>ellipse(157,351+i*86,31,31,color,.85));hole(185,185,61);
  }else if(kind==='projector'){
    polygon([[63,25],[937,25],[971,76],[939,111],[971,148],[939,189],[971,228],[939,265],[971,305],[939,345],[970,390],[937,H-25],[63,H-25],[30,391],[61,350],[30,307],[61,266],[30,226],[61,185],[30,146],[61,106],[30,69]],PAPER,.61);
    rect(95,61,810,H-158,BLUE,.35);for(let i=0;i<17;i++)polygon([[125+i*45,64],[151+i*45,64],[111+i*45,H-100],[73+i*45,H-100]],i%3?BLUE:'#b4a0df',.48+i%3*.08);centered('MOVEMENT',500,257,117,PAPER,.94,850);polygon([[110,H-67],[110,H-38],[135,H-52]],INK,.89);line(179,H-52,866,H-52,INK,2,.79);rect(179,H-54,266,5,accent,.9);
  }else if(kind==='scope'){
    disk(474,PAPER);disk(455,'#0c2118');clip(ctx=>ctx.arc(500,500,432,0,Math.PI*2),()=>{for(let i=0;i<19;i++){line(60+i*49,60,60+i*49,940,'#385447',1,.3);line(60,60+i*49,940,60+i*49,'#385447',1,.3);}for(let r=95;r<420;r+=100)ring(500,500,r,'#819c66',2,.61);polygon([[500,500],[500,69],[719,130]],'#768c36',.64);line(500,500,719,130,accent,6,.89);[[341,642],[622,327],[701,642]].forEach(([x,y])=>{ellipse(x,y,12,12,accent,.94);ring(x,y,29,accent,2,.8);});});centered('SIGNAL',500,854,35,PAPER,.84,600);
  }else throw new Error(`Unknown widget design: ${kind}/${variant}`);
}
