// All editions share geometry. Only material, graphics, typography and colour vary.
const palette=(name,floor,wall,ink,music,film,journal,musicInk,filmInk,journalInk,a,b,c)=>({
  name,colors:{wash:floor,'wall-paper':wall,ink,paper:journal,primary:music,'primary-deep':a,secondary:film,'secondary-deep':b,accent:c,'accent-deep':a,soft:journal,
    'music-fill':music,'film-fill':film,'journal-fill':journal,'music-ink':musicInk,'film-ink':filmInk,'journal-ink':journalInk,
    'art-a':a,'art-b':b,'art-c':c,'shadow-ink':'#10131c','hud-fill':journal,'hud-ink':journalInk}
});
export const EDITIONS={
  expressive:{name:'Expressive',index:'01',eyebrow:'COLOUR / SHAPE / PLAY',title:'Good things.<br>All yours.',subtitle:'취향이 머무는 가장 자유로운 방.',detail:'크게, 부드럽게, 기분 좋게.',material:{outline:.8,shine:0,light:.72},palettes:[
    palette('Citrus','#d9df63','#eff0b2','#273221','#c63d2e','#6c58cc','#f0efd7','#fff6e7','#fff4f1','#2e3527','#4e347e','#f4b7ce','#effb8c'),
    palette('Berry','#dda7cd','#f0cddd','#3b1944','#623993','#e85474','#f4dae9','#fff1fc','#301831','#43174c','#e68ab6','#bccf60','#f9bd92'),
    palette('Pool','#7eaeee','#b9d7f0','#14314d','#f27446','#2b63b4','#d9eed9','#241c38','#f2f6fa','#1c3830','#3d3e97','#f3b7bd','#d5fa70'),
  ]},
  liquid:{name:'Liquid',index:'02',eyebrow:'LIGHT / LAYERS / STILLNESS',title:'A little<br>less noise.',subtitle:'빛을 통과시키고, 감각을 남기다.',detail:'빛과 레이어 사이의 고요.',material:{outline:.25,shine:.72,light:.2},palettes:[
    palette('Blue hour','#1d2e59','#0c152e','#f0f5ff','#364f83','#4d588d','#273c63','#f3f7ff','#f3f7ff','#eef5ff','#657bf5','#78dcdf','#c8b8ff'),
    palette('Pearl','#cbd8da','#e7eeeb','#172f38','#dce8e7','#d1e3e6','#eaf1ed','#152f3b','#152f3b','#18353d','#678eaa','#8bb7b9','#fff0df'),
    palette('Aurora','#313654','#171d39','#f6f1ff','#655078','#354d69','#44435f','#fff2fa','#edfaff','#f5f2ff','#db8baa','#7fd4c7','#b7acf9'),
  ]},
  bauhaus:{name:'Bauhaus',index:'03',eyebrow:'FORM / FUNCTION / FEELING',title:'form follows<br>feeling.',subtitle:'원, 삼각형, 사각형. 그 안의 일상.',detail:'기본 형태로 다시 짓는 일상.',material:{outline:.9,shine:0,light:.34},palettes:[
    palette('Primary','#e7ddc7','#f4efdf','#181917','#c73327','#2149a0','#eec846','#fff4e5','#fff5e5','#181917','#2149a0','#eec846','#161918'),
    palette('Blueprint','#243e74','#172a53','#f4f0dd','#e6dfca','#bd3529','#e9bb35','#1b2d4d','#fff3dd','#1b2330','#bd3529','#173966','#e9bb35'),
    palette('Vermilion','#b7372d','#963d32','#fff1d8','#e9dabc','#1b2e42','#ddae39','#1b232b','#fff1dc','#1b232b','#cf382b','#153f65','#e7b932'),
  ]},
};
export const EDITION_IDS=Object.keys(EDITIONS);
export function resolveDesign(input={}){
  if(!input||typeof input!=='object')input={};
  const edition=Object.hasOwn(EDITIONS,input.edition)?input.edition:'expressive';
  const n=Number(input.palette),palette=Number.isInteger(n)&&n>=0&&n<EDITIONS[edition].palettes.length?n:0;
  return {edition,palette,solid:input.solid===true};
}
export const rgb=hex=>hex.slice(1).match(/.{2}/g).map(n=>parseInt(n,16));
export const easeColour=(from,to,dt,reduced=false,duration=260)=>from.map((n,i)=>n+(to[i]-n)*(reduced?1:1-Math.exp(-dt/duration)));
