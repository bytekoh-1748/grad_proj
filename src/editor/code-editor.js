import {EditorState} from '@codemirror/state';
import {EditorView,keymap,lineNumbers,highlightActiveLine,highlightActiveLineGutter,drawSelection} from '@codemirror/view';
import {history,defaultKeymap,historyKeymap,undo,redo,indentWithTab} from '@codemirror/commands';
import {StreamLanguage,syntaxHighlighting,HighlightStyle,bracketMatching} from '@codemirror/language';
import {tags} from '@lezer/highlight';
const roomHighlight=HighlightStyle.define([
  {tag:tags.comment,color:'#777777',fontStyle:'italic'},
  {tag:tags.keyword,color:'#ffffff',fontWeight:'500'},
  {tag:tags.string,color:'#d3d3d3'},
  {tag:tags.propertyName,color:'#bdbdbd'},
  {tag:tags.number,color:'#ffffff'},
  {tag:tags.atom,color:'#d3d3d3'},
  {tag:tags.typeName,color:'#eeeeee'},
  {tag:tags.bracket,color:'#888888'},
]);
const language=StreamLanguage.define({token(stream){
  if(stream.eatSpace())return null;
  if(stream.match('//')){stream.skipToEnd();return 'comment';}
  if(stream.match(/"(?:[^"\\]|\\.)*"/))return /^\s*:/.test(stream.string.slice(stream.pos))?'propertyName':'string';
  if(stream.match(/-?\d+(?:\.\d+)?/))return 'number';
  if(stream.match(/(?:room|title|composition|palette|surface|light|shader|camera|object)\b/))return 'keyword';
  if(stream.match(/(?:turntable|lamp|book|portal|projector|clock|calendar|cassette|calculator|terminal|radio|sketch|scope)\b/))return 'typeName';
  if(stream.match(/(?:true|false|null)\b/))return 'atom';
  if(stream.match(/[{}\[\]]/))return 'bracket';stream.next();return null;
}});
export function createCodeEditor(parent,{onChange,onRun,onUndo,onRedo,isDirty,onCursor=()=>{}}){
  let syncing=false;
  const extensions=[
    lineNumbers({formatNumber:n=>String(n).padStart(2,'0')}),highlightActiveLine(),highlightActiveLineGutter(),drawSelection(),history(),language,syntaxHighlighting(roomHighlight),bracketMatching(),EditorView.lineWrapping,
    EditorView.contentAttributes.of({'aria-label':'방 코드 편집기','spellcheck':'false'}),
    keymap.of([{key:'Mod-Enter',run:()=>{onRun();return true;}},{key:'Mod-z',run:()=>{if(isDirty())return undo(view);onUndo();return true;}},{key:'Mod-Shift-z',run:()=>{if(isDirty())return redo(view);onRedo();return true;}},indentWithTab,...defaultKeymap,...historyKeymap]),
    EditorView.updateListener.of(update=>{
      if(update.docChanged&&!syncing)onChange(update.state.doc.toString());
      if(update.docChanged||update.selectionSet){const pos=update.state.selection.main.head,line=update.state.doc.lineAt(pos);onCursor({line:line.number,column:pos-line.from+1});}
    }),
  ];
  const view=new EditorView({parent,state:EditorState.create({doc:'',extensions})});
  return {view,get value(){return view.state.doc.toString();},set value(source){if(source===view.state.doc.toString())return;syncing=true;view.setState(EditorState.create({doc:source,extensions}));syncing=false;onCursor({line:1,column:1});},focusLine(line){const n=Math.max(1,Math.min(line,view.state.doc.lines));view.dispatch({selection:{anchor:view.state.doc.line(n).from},scrollIntoView:true});view.focus();}};
}
