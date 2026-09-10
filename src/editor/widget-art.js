import {monthCells,decodePixels,PIXEL_COLORS} from './widget-utils.js';
import {displayWords} from './widget-appearance.js';
const PAPER='#ecebd7',INK='#171916',LILAC='#b8a3d9',CORAL='#f16d48';

/** Printed editions. The broad top trim is a continuous resident ledge. */
export function drawWidget(kind,{rect,text,mono,line,ellipse,ring,polygon,centered,H,accent,date,content,appearance={}}){
  const sheet=(color=PAPER,index='01',label='PERSONAL COLLECTION')=>{
    rect(25,25,950,H-50,color,.58);line(25,25,975,25,INK,5,.7);line(55,99,945,99,INK,2,.69);
    mono(index+' / ROOM',57,76,22,INK,.81);mono(label,466,76,19,INK,.8);
    line(55,H-82,945,H-82,INK,2,.72);mono('AN UNFINISHED EDITION',57,H-48,18,INK,.8);text('↗',903,H-45,32,INK,.85,500);
  };
  if(kind==='camera'){
    sheet(CORAL,'01','IMAGE / AFTERIMAGE');rect(55,120,890,H-222,LILAC,.4);
    for(let i=0;i<19;i++){const x=482+i*24;line(x,130,x,H-113,INK,i%3===0?6:2,.57);}
    ellipse(682,431,213,245,PAPER,.62);
    for(let i=0;i<17;i++){const t=(i-8)/8,span=Math.sqrt(Math.max(0,1-t*t))*207;line(682-span,431+t*232,682+span,431+t*232,INK,3,.73);}
    const words=displayWords(appearance,'AFTER IMAGE');text(words[0],72,308,167,INK,.9,800);text(words.slice(1).join(' '),72,470,167,INK,.92,800);
    rect(71,H-202,490,61,accent,.78);text('THINGS THAT STAY.',85,H-162,31,INK,.9,550);mono('FIG. 01',730,H-130,22,INK,.86);
  }else if(kind==='turntable'){
    sheet(PAPER,'02','SOUND / LONG PLAY');rect(55,122,890,80,accent,.63);text('SIDE A',73,178,45,INK,.9,650);mono('33⅓ RPM',733,173,25,INK,.85);
    ellipse(291,435,182,182,INK,.55);for(let i=0;i<12;i++)ring(291,435,176-i*4,'#8c8e7a',1.7,.62);ellipse(291,435,119,119,accent,.73);ellipse(291,435,6,6,INK,.87);
    const words=displayWords(appearance,'SOFT NOISE');text(words[0],514,340,119,INK,.9,750);text(words.slice(1).join(' '),514,450,119,INK,.91,750);
    for(let i=0;i<32;i++){const amp=11+21*(1+Math.sin(i*.7))*Math.abs(Math.sin(i*.24));line(530+i*12,524-amp,530+i*12,524+amp,INK,3,.75);}
    line(510,595,934,595,INK,2,.76);text('LISTEN. REPEAT.',518,640,27,INK,.84,550);mono('STEREO / 001',76,H-114,20,INK,.84);
  }else if(kind==='lamp'){
    sheet(PAPER,'03','DAYLIGHT');rect(55,117,890,H*.62,accent,.42);ellipse(720,H*.255,116,116,CORAL,.67);
    rect(55,H*.385,890,H*.15,'#a2b8d0',.5);rect(55,H*.535,890,H*.225,PAPER,.6);
    for(let y=H*.407;y<H*.52;y+=23)line(74,y,927,y,INK,1.5,.65);
    // Clear sand at the lower right is the deck-chair area.
    line(73,H*.565,920,H*.565,'#b0b099',2,.67);text(appearance.text||'SUN',68,H*.848,H*.137,INK,.9,800);mono('WITHOUT A WINDOW.',74,H*.905,H*.025,INK,.83);
  }else if(kind==='book'){
    sheet(PAPER,'04','NOTES TO SELF');const words=displayWords(appearance,'KEEP WHAT MOVES YOU.');words.slice(0,4).forEach((word,i)=>text(i===3?words.slice(3).join(' '):word,62,321+i*200,184,INK,.91,650));
    // A quiet strip beneath the text provides the reading seat and foot room.
    line(63,H*.79,934,H*.79,INK,5,.79);rect(65,H*.806,865,H*.104,LILAC,.63);text('THE REST CAN WAIT.',81,H*.882,28,INK,.86,500);
  }else if(kind==='portal'){
    sheet(accent,'05','NEXT ROOM');text(appearance.text||'ELSEWHERE',57,252,113,INK,.94,750);text('↗',550,H-139,268,INK,.84,500);mono('SOMEWHERE / ELSE',60,H-123,22,INK,.83);
    for(let i=0;i<6;i++)line(66+i*24,302,66+i*24,H-164,INK,8,.7);
  }else if(kind==='sketch'){
    sheet(LILAC,'08','PIXEL STUDY');rect(180,132,743,743,PAPER,.53);const pixels=decodePixels(content),cell=43;pixels.forEach((color,i)=>rect(207+i%16*cell,159+Math.floor(i/16)*cell,cell-1,cell-1,PIXEL_COLORS[color],color===0?.35:.7+color*.035));
    PIXEL_COLORS.slice(1).forEach((c,i)=>rect(64,165+i*108,67,74,c,.8));mono('16 × 16 / SMALL IDEAS',208,H-111,22,INK,.84);
  }else if(kind==='scope'){
    sheet(accent,'07','SIGNAL STUDY');rect(55,123,890,H-245,INK,.38);
    for(let i=0;i<17;i++)line(68+i*54,135,68+i*54,H-135,'#57604c',1,.46);for(let i=0;i<8;i++)line(68,146+i*55,931,146+i*55,'#57604c',1,.46);
    for(let x=68;x<928;x+=4){const y=p=>H*.48+Math.sin(p*.017)*102*Math.cos(p*.003);line(x,y(x),x+4,y(x+4),accent,7,.82);line(x,H*.49+Math.cos(x*.014)*60,x+4,H*.49+Math.cos((x+4)*.014)*60,LILAC,3,.75);}
    mono(appearance.text||'CH 01 / ∞ Hz',74,H-147,23,PAPER,.84);
  }else if(kind==='clock'){
    sheet(accent,'06','LOCAL TIME');text(date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),57,343,256,INK,.92,600);mono(date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase(),62,H-119,25,INK,.82);
  }else if(kind==='calendar'){
    sheet(PAPER,'06','PASSING DAYS');text(date.toLocaleDateString('en-GB',{month:'short'}).toUpperCase(),59,294,193,INK,.9,750);mono(String(date.getFullYear()),771,280,48,INK,.86);rect(56,344,890,60,accent,.69);
    ['S','M','T','W','T','F','S'].forEach((d,i)=>mono(d,83+i*126,385,26,INK,.85));monthCells(date.getFullYear(),date.getMonth()).forEach((day,i)=>{if(!day)return;const x=79+(i%7)*126,y=500+Math.floor(i/7)*95;if(day===date.getDate())ellipse(x+24,y-22,45,45,accent,.79);text(String(day).padStart(2,'0'),x-4,y,48,INK,.9,550);});
  }else if(kind==='calculator'){
    sheet(PAPER,'09','NUMBERS');rect(55,122,890,230,accent,.54);text(appearance.value||'128.00',75,302,176,INK,.91,600);
    const keys=['AC','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','⌫','0','.','='];keys.forEach((key,i)=>{const x=57+i%4*225,y=382+Math.floor(i/4)*169;rect(x,y,208,152,i%4===3?LILAC:INK,.65);text(key,x+66,y+104,67,i%4===3?INK:PAPER,.9,500);});
  }else if(kind==='terminal'){
    sheet(accent,'10','UNFINISHED THOUGHTS');mono('> ls /unfinished',65,199,33,INK,.86);line(62,231,936,231,INK,2,.72);text(appearance.text||'STILL HERE_',63,450,138,INK,.94,700);mono('dreams    noise    tomorrow',67,H-150,30,INK,.82);
  }else if(kind==='cassette'){
    sheet(LILAC,'11','C—60 / MIXTAPE');text(appearance.text||'IN BETWEEN',59,204,99,INK,.92,700);rect(63,241,873,240,INK,.52);[265,739].forEach(x=>{ellipse(x,362,87,87,PAPER,.68);ring(x,362,53,INK,5,.76);ellipse(x,362,18,18,INK,.85);});line(268,300,735,300,PAPER,7,.7);line(268,424,735,424,PAPER,7,.7);mono('SIDE A / KEEP ON PLAYING',65,H-119,25,INK,.84);
  }else if(kind==='radio'){
    sheet(CORAL,'12','ROOM.FM');text(appearance.value||'88.7',59,307,218,INK,.92,650);ellipse(799,265,128,128,INK,.6);ellipse(799,265,77,77,PAPER,.73);line(799,265,842,217,INK,9,.91);for(let i=0;i<44;i++)line(67+i*20,365,67+i*20,i%5?389:412,INK,2,.78);mono('TUNE INTO NOTHING.',63,H-110,23,INK,.84);
  }else if(kind==='projector'){
    sheet(LILAC,'13','MOVING IMAGE');for(let i=0;i<21;i++)rect(63+i*42,124,19,H-259,INK,.5+i%3*.04);rect(63,225,873,337,accent,.69);const words=displayWords(appearance,'MOVE MENT');text(words[0],75,374,169,INK,.9,800);text(words.slice(1).join(' '),75,526,169,INK,.9,800);mono('00:13 / 00:32',69,H-115,25,INK,.85);
  }else throw new Error(`Unknown widget artwork: ${kind}`);
}
