import type {Note,Task} from './model';
import {extractTasks} from './tasks';

/** Match one-to-one source-line edits; insertion/deletion remains a separate operation. */
export function extractTaskRevision(note:Note,previous:Task[],previousText?:string):Task[]{
  if(previousText===note.text)return previous.map(t=>({...t}));
  const next=extractTasks(note,previous);
  if(previousText===undefined)return next;
  const before=previousText.split(/\r?\n/),after=note.text.split(/\r?\n/);
  let start=0;while(start<before.length&&start<after.length&&before[start]===after[start])start++;
  let oldEnd=before.length,newEnd=after.length;
  while(oldEnd>start&&newEnd>start&&before[oldEnd-1]===after[newEnd-1]){oldEnd--;newEnd--;}
  const oldChanged=previous.filter(t=>t.line>=start&&t.line<oldEnd);
  // Clearing only the task body is still an edit, while removing its checkbox is deletion.
  for(const old of oldChanged){
    const line=old.line;
    if(!old.blockId&&line<newEnd&&/^\s*[-*+]\s+\[[ xX]\]\s*$/.test(after[line]??'')){
      next.push({...old,text:'',line});
    }
  }
  const newChanged=next.filter(t=>t.line>=start&&t.line<newEnd);
  const existingIds=new Set(previous.map(t=>t.id)),used=new Set(next.filter(t=>existingIds.has(t.id)).map(t=>t.id));
  const norm=(s:string)=>s.trim().replace(/\s+/g,' ');
  for(const candidate of newChanged){
    if(existingIds.has(candidate.id)||candidate.blockId)continue;
    const old=oldEnd-start===newEnd-start?oldChanged.find(t=>t.line===candidate.line):
      oldChanged.length===1&&newChanged.length===1?oldChanged[0]:undefined;
    if(!old||old.blockId||used.has(old.id))continue;
    if(previous.filter(t=>norm(t.text)===norm(old.text)).length!==1||next.filter(t=>norm(t.text)===norm(candidate.text)).length!==1)continue;
    candidate.id=old.id;candidate.ambiguous=old.ambiguous;used.add(old.id);
  }
  return next.sort((a,b)=>a.line-b.line);
}
