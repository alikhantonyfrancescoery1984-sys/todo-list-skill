import type {Task} from './model';
import {extractTasks} from './tasks';
/** Delete only an unambiguous source checkbox; preserve surrounding bytes/line endings. */
export function deleteSourceTask(text:string,task:Task):string{
 const norm=(s:string)=>s.trim().replace(/\s+/g,' '),all=extractTasks({id:task.noteId,path:'',text,version:0});
 const matches=all.filter(t=>task.blockId?t.blockId===task.blockId:norm(t.text)===norm(task.text));
 if(!matches.length)return text; // Already absent: delete the stale ledger entry without touching another line.
 if(matches.length>1)throw new Error('原笔记存在多个相同待办，请先为任务添加唯一块 ID。');
 const lines=text.split('\n');lines.splice(matches[0]!.line,1);return lines.join('\n');
}
