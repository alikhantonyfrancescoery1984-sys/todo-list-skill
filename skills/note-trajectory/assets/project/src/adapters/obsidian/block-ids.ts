import {EditorView,Decoration,ViewPlugin,type DecorationSet,type ViewUpdate} from '@codemirror/view';
import type {Range} from '@codemirror/state';

/**
 * Plugin-owned block IDs are bookkeeping, not note content: they are always hidden in the editor.
 * Matched anywhere in the line: an edit can leave the ID glued to the text or in the middle of it,
 * and hiding only line-final IDs made those cases visible again.
 */
const ID=/\s*\^nt-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const hidden=Decoration.replace({});

/** Visible lines only: the editor reports its viewport, so a large note is never scanned end to end. */
function build(view:EditorView):DecorationSet{
  const ranges:Range<Decoration>[]=[];
  let lastLine=-1;
  for(const {from,to} of view.visibleRanges){
    let pos=from;
    while(pos<=to){
      const line=view.state.doc.lineAt(pos);
      pos=line.to+1;
      if(line.from===lastLine)continue;
      lastLine=line.from;
      for(const match of line.text.matchAll(ID)){
        const start=line.from+(match.index??0);
        ranges.push(hidden.range(start,start+match[0].length));
      }
    }
  }
  // Decoration.set sorts the ranges itself, so repeated lines in a viewport cannot break the order.
  return Decoration.set(ranges,true);
}

export const hideTaskBlockIds=ViewPlugin.fromClass(class{
  decorations:DecorationSet;
  constructor(view:EditorView){this.decorations=build(view)}
  update(update:ViewUpdate){if(update.docChanged||update.viewportChanged)this.decorations=build(update.view)}
},{decorations:plugin=>plugin.decorations});
