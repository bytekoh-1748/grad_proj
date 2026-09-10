import {parseRoom,RoomError} from './room-code.js';
export const OBJECT_TITLES={camera:'poster',turntable:'record',clock:'clock',calendar:'calendar',lamp:'weather',book:'note',cassette:'tape',calculator:'calculator',terminal:'terminal',radio:'radio',portal:'portal',sketch:'pixels',projector:'screen',scope:'signal'};
/** A readable JSON lens onto one declaration; the .room document remains authoritative. */
export function objectCode(source,id){
  const ast=parseRoom(source),node=ast.nodes.find(n=>n.key==='object'&&n.id===id);
  if(!node)throw new RoomError('선택한 오브제가 코드에 없습니다.');
  const code=JSON.stringify(node.value,null,2).replace(/\[\n\s+(-?\d+(?:\.\d+)?),\s+(-?\d+(?:\.\d+)?),\s+(-?\d+(?:\.\d+)?)\n\s+\]/g,'[$1, $2, $3]');
  return {id,kind:ast.scene.objects.find(o=>o.id===id).kind,source,node,code};
}
// Keep invalid input as a recoverable full-document draft too. Never strip spaces inside strings.
export function compactObjectCode(code){
  let out='',quoted=false,escaped=false;
  for(const char of code){
    if(quoted){out+=char;if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')quoted=false;}
    else if(char==='"'){quoted=true;out+=char;}else if(!/\s/.test(char))out+=char;
  }
  return out;
}
export function mergeObjectCode(scope,code){
  const lines=scope.source.split('\n'),line=lines[scope.node.line];
  lines[scope.node.line]=line.slice(0,scope.node.start)+compactObjectCode(code)+line.slice(scope.node.end);
  return lines.join('\n');
}
