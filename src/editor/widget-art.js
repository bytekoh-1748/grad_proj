import {monthCells,decodePixels,PIXEL_COLORS} from './widget-utils.js';
const PAPER='#ecebd7',INK='#121318',BLUE='#252ce5';
export function drawWidget(kind,{rect,text,mono,line,ellipse,ring,polygon,chrome,H,accent,date,content}){
  if(kind==='clock'){
    rect(22,22,956,H-44,INK,.4);rect(30,30,940,H-60,accent,.52);rect(42,42,916,48,INK,.72);mono('local.time',60,74,23,PAPER,.84);ellipse(922,66,7,7,accent,.9);
    text(date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),65,325,240,INK,.91,550);
    line(58,369,942,369,INK,2,.66);mono(date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase(),63,426,27,INK,.76);mono('LOCAL',805,426,25,INK,.76);
  }else if(kind==='calendar'){
    rect(26,26,948,H-52,INK,.35);rect(36,38,928,H-78,PAPER,.57);rect(36,38,928,62,accent,.72);mono('day.by.day',60,79,26,INK,.9);mono('←  →',823,79,27,INK,.9);
    text(date.toLocaleDateString('en-GB',{month:'short'}).toUpperCase(),60,282,178,INK,.86,800);mono(String(date.getFullYear()),790,263,48,INK,.8);
    line(62,336,932,336,INK,2,.5);['S','M','T','W','T','F','S'].forEach((d,i)=>mono(d,80+i*126,401,26,'#6a6b60',.7));
    monthCells(date.getFullYear(),date.getMonth()).forEach((day,i)=>{if(!day)return;const x=78+(i%7)*126,y=502+Math.floor(i/7)*98;if(day===date.getDate())ellipse(x+25,y-22,48,48,accent,.79);text(String(day).padStart(2,'0'),x-4,y,46,INK,.91,550);});
    mono('ONE DAY AT A TIME.',64,H-90,24,INK,.73);
  }else if(kind==='calculator'){
    rect(22,22,956,H-44,INK,.35);rect(32,32,936,H-64,'#c4c7ba',.52);rect(44,44,912,55,INK,.7);mono('numbers.app',65,81,28,PAPER,.87);mono('×',905,81,28,PAPER,.87);
    rect(57,122,886,224,'#1b2416',.36);mono('0123456789',82,158,23,'#7d895e',.6);text('128.00',125,300,153,accent,.88,600);
    const keys=['AC','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','⌫','0','.','='];keys.forEach((key,i)=>{const x=58+i%4*225,y=378+Math.floor(i/4)*177;rect(x+5,y+6,207,155,'#444a3a',.45);rect(x,y,207,155,i%4===3?accent:PAPER,.74);text(key,x+61,y+105,65,INK,.94,550);});
  }else if(kind==='terminal'){
    chrome('thoughts.sh',{menu:false,background:'#121b16'});mono('room@somewhere:~',69,153,24,'#9eaf8a',.72);
    mono('> ls /unfinished',68,237,45,accent,.89);mono('dreams   noise   tomorrow',68,304,36,PAPER,.8);
    mono('> echo "still here"',68,412,45,accent,.89);text('STILL HERE_',70,516,93,PAPER,.91,750);rect(70,553,19,36,accent,.85);mono('01 process running',665,H-111,21,'#9eaf8a',.74);
  }else if(kind==='cassette'){
    rect(23,23,954,H-46,INK,.35);rect(33,33,934,H-66,accent,.57);rect(44,44,912,46,INK,.73);mono('mixtape.wav',64,77,26,PAPER,.9);mono('A / B',856,77,22,PAPER,.9);
    rect(62,114,876,372,PAPER,.66);text('IN BETWEEN',88,183,64,INK,.88,800);mono('C—60',773,183,28,INK,.8);rect(90,220,820,211,INK,.45);
    line(258,255,740,255,'#b7b9a1',10,.62);line(258,393,740,393,'#b7b9a1',10,.62);[259,742].forEach(x=>{ellipse(x,324,88,88,accent,.63);ring(x,324,61,INK,8,.72);ellipse(x,324,26,26,PAPER,.84);for(let i=0;i<6;i++){const t=i*Math.PI/3;line(x+32*Math.cos(t),324+32*Math.sin(t),x+56*Math.cos(t),324+56*Math.sin(t),INK,12,.87);}});
    polygon([[395,539],[395,582],[429,560]],INK,.85);rect(491,539,12,43,INK,.85);rect(512,539,12,43,INK,.85);rect(588,539,40,43,INK,.85);mono('SIDE A',70,582,30,INK,.85);
  }else if(kind==='radio'){
    rect(22,22,956,H-44,INK,.35);rect(32,32,936,H-64,accent,.6);rect(43,43,914,44,INK,.78);mono('room.fm',63,74,24,PAPER,.9);mono('STEREO',838,74,20,PAPER,.9);
    text('88.7',63,293,177,INK,.9,650);mono('FM',565,289,49,INK,.86);ellipse(806,242,112,112,INK,.56);for(let r=102;r>40;r-=9)ring(806,242,r,'#6b483a',2,.65);ellipse(806,242,36,36,PAPER,.85);line(806,242,825,216,INK,5,.92);
    rect(60,339,878,100,INK,.48);for(let i=0;i<44;i++){const x=77+i*20;line(x,350,x,i%5===0?397:375,PAPER,2,.72);}rect(575,342,4,86,PAPER,.91);mono('88        94       100       106',80,423,24,accent,.8);mono('TUNE INTO NOTHING.',65,H-55,22,INK,.82);
  }else if(kind==='scope'){
    chrome('signal.osc',{menu:false,background:'#0e1d18'});
    for(let i=0;i<18;i++)line(61+i*49,112,61+i*49,H-159,'#315246',1,.32);for(let i=0;i<10;i++)line(61,116+i*49,929,116+i*49,'#315246',1,.32);
    for(let x=63;x<930;x+=4){const y=p=>330+Math.sin(p*.017)*112*Math.cos(p*.003);line(x,y(x),x+4,y(x+4),accent,4,.78);line(x,350+Math.cos(x*.014)*68,x+4,350+Math.cos((x+4)*.014)*68,'#b9a4ea',2,.62);}
    rect(60,H-150,877,49,INK,.64);mono('CH 01',76,H-116,24,accent,.83);mono('∞ Hz',770,H-116,29,PAPER,.86);
  }else if(kind==='sketch'){
    chrome('small.paint',{menu:false,background:PAPER});
    rect(56,110,101,H-192,INK,.59);PIXEL_COLORS.slice(1).forEach((c,i)=>rect(75,142+i*104,61,68,c,.83));mono('↖',78,643,43,PAPER,.85);
    const pixels=decodePixels(content),cell=43;pixels.forEach((color,i)=>rect(203+i%16*cell,144+Math.floor(i/16)*cell,cell-1,cell-1,PIXEL_COLORS[color],color===0?.3:.7+color*.035));mono('16 × 16',208,H-110,27,INK,.76);
  }else throw new Error(`Unknown widget artwork: ${kind}`);
}
