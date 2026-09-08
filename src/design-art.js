const NS='http://www.w3.org/2000/svg';
const loop=(cx,cy,r,n=64)=>Array.from({length:n},(_,i)=>{const a=i*Math.PI*2/n;return[cx+Math.cos(a)*r,cy+Math.sin(a)*r];});
const flower=(cx,cy,r)=>Array.from({length:120},(_,i)=>{const a=i*Math.PI/60,q=r*(1+.09*Math.cos(a*10));return[cx+Math.cos(a)*q,cy+Math.sin(a)*q];});
const d=points=>points.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join('')+'Z';
const arcRings=(cx,cy,radii,stroke='var(--art-c)')=>radii.map(r=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="1.3"/>`).join('');
const variant=(name,content)=>`<g class="edition-art" data-edition-art="${name}">${content}</g>`;

export function posterArtwork(name){
  if(name==='music')return `<svg viewBox="0 0 570 450" aria-hidden="true"><defs><linearGradient id="vinyl-chrome" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="var(--art-b)" stop-opacity=".5"/><stop offset=".52" stop-color="var(--art-a)" stop-opacity=".2"/><stop offset=".8" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="var(--art-c)"/></linearGradient></defs>
  ${variant('expressive',`<path d="${d(flower(338,295,140))}" fill="var(--art-b)"/><circle cx="338" cy="295" r="104" fill="var(--art-a)"/>${arcRings(338,295,[92,77,62])}<circle cx="338" cy="295" r="31" fill="var(--art-c)"/><circle cx="338" cy="295" r="6" fill="var(--art-a)"/><path d="M69 253v38m24-68v99m24-124v145m24-119v89" stroke="var(--art-c)" stroke-width="14" stroke-linecap="round"/>`)}
  ${variant('liquid',`<circle cx="342" cy="287" r="142" fill="url(#vinyl-chrome)"/><circle cx="342" cy="287" r="122" fill="var(--music-fill)" opacity=".58"/>${arcRings(342,287,[112,99,85,72,57],'#ffffff40')}<circle cx="342" cy="287" r="34" fill="url(#vinyl-chrome)"/><circle cx="342" cy="287" r="8" fill="var(--music-fill)"/><path d="M232 251a118 118 0 0 1 208-37" fill="none" stroke="#ffffffa8" stroke-width="4" stroke-linecap="round"/><path d="M76 302v20m19-38v56m19-78v105m19-72v35" stroke="var(--music-ink)" stroke-opacity=".75" stroke-width="5" stroke-linecap="round"/>`)}
  ${variant('bauhaus',`<circle cx="307" cy="310" r="178" fill="var(--art-a)"/><path d="M306 132v318h215V132Z" fill="var(--art-c)"/><circle cx="307" cy="310" r="115" fill="none" stroke="var(--music-fill)" stroke-width="27"/><circle cx="307" cy="310" r="39" fill="var(--art-b)"/><path d="M43 179h35v210H43Zm51 0h9v210h-9" fill="var(--music-ink)"/>`)}
  </svg>`;
  if(name==='cinema')return `<svg viewBox="0 0 440 215" aria-hidden="true">
  ${variant('expressive','<rect x="253" y="59" width="157" height="113" rx="56" fill="var(--art-c)"/><path d="m313 83 52 31-52 31Z" fill="var(--art-a)"/>')}
  ${variant('liquid','<ellipse cx="338" cy="111" rx="76" ry="68" fill="var(--art-a)" fill-opacity=".18" stroke="#ffffff88" stroke-width="1.5"/><path d="m321 85 44 26-44 26Z" fill="var(--film-ink)"/><path d="M281 87a62 62 0 0 1 112 2" fill="none" stroke="#ffffffab" stroke-width="2"/>')}
  ${variant('bauhaus','<path d="m316 39 111 159H205Z" fill="var(--art-b)"/><circle cx="316" cy="140" r="23" fill="var(--art-c)"/><path d="M230 39h172" stroke="var(--film-ink)" stroke-width="2"/>')}
  </svg>`;
  return `<svg viewBox="0 0 440 215" aria-hidden="true">
  ${variant('expressive',`<path d="${d(flower(342,111,64))}" fill="var(--art-a)"/><path d="M315 111h54m-27-27v54" stroke="var(--art-b)" stroke-width="10" stroke-linecap="round"/>`)}
  ${variant('liquid','<rect x="280" y="39" width="117" height="136" rx="25" fill="#ffffff16" stroke="#ffffff70"/><path d="M300 70h77m-77 16h77m-77 16h42m-42 33h77m-77 16h58" stroke="var(--journal-ink)" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"/>')}
  ${variant('bauhaus','<rect x="279" y="41" width="111" height="132" fill="var(--art-a)"/><path d="M294 71h82m-82 13h82m-82 13h82m-82 13h82m-82 13h82m-82 13h82" stroke="var(--journal-fill)" stroke-width="4"/><circle cx="363" cy="144" r="31" fill="var(--music-fill)"/>')}
  </svg>`;
}

export function buildFloorMotifs(parent){
  const items=[];
  const add=(edition,points,fill,opacity,stroke='none',width=0)=>{
    const node=document.createElementNS(NS,'path');node.setAttribute('class','floor-motif');node.dataset.editionArt=edition;
    node.setAttribute('fill',fill);node.setAttribute('fill-opacity',opacity);node.setAttribute('stroke',stroke);node.setAttribute('stroke-opacity',opacity);node.setAttribute('stroke-width',width);parent.append(node);items.push({node,points});
  };
  add('expressive',flower(100,850,290),'var(--art-a)',.12);
  add('expressive',[[1320,20],[1520,20],[1520,980],[1320,980]],'var(--art-b)',.20);
  add('liquid',loop(600,470,630),'url(#ambient-a)',1);
  add('liquid',loop(1400,620,570),'url(#ambient-b)',1);
  add('bauhaus',loop(80,900,265),'var(--primary)',.84);
  add('bauhaus',[[1395,235],[1525,235],[1525,990],[1395,990]],'var(--art-a)',.92);
  add('bauhaus',[[0,920],[1600,920]],'none',.7,'var(--ink)',2);
  return items;
}
