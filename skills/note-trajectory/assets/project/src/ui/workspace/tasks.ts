import {orderByDeadline,deadlineState,deadlineHint} from '../../core/planning';
import {displayTaskName} from './hints';
import type {WorkspaceController} from '../../application/workspace';
import {escapeHtml as esc} from '../html';
const link='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m10 13 4-4M8 15l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></svg>';
export function renderTasks(c:WorkspaceController,filter:'pending'|'done',href:(noteId:string)=>string,expanded:ReadonlySet<string>=new Set(),moduleId?:string):string{
  const tasks=orderByDeadline(c.tasks.filter(t=>t.done===(filter==='done')&&(!moduleId||c.taskInModule(t,moduleId))));
  const fileLink=(noteId:string,line:number,compact=false,header=false)=>`<a class="${header?'task-file-link':'note-link readonly-note-link'}${compact?' compact-source-link':''}" href="${esc(href(noteId))}" data-action="source-note" data-note="${esc(noteId)}" data-line="${line}" title="${esc(c.state.notes.find(n=>n.id===noteId)?.path??'')}" aria-label="打开源笔记 ${esc(c.title(noteId))}${header?'':'的任务行'}">${link}${compact?'':`<span>${esc(c.title(noteId))}</span>`}</a>`;
  const item=(t:typeof tasks[number],compact=false)=>{
    const name=displayTaskName(t),status=deadlineState(t,c.now().getTime()),warning=status==='warning'||status==='overdue',help='task-help-'+t.id,hint=deadlineHint(t);
    const tags=t.origin==='manual'?(t.moduleIds??[]).map(id=>c.modules.find(m=>m.id===id)).filter(m=>m&&m.id!=='manual-inbox'):[];
    return `<li class="task-item ${t.done?'done':''} ${warning?'deadline-warning':''}" data-task-item="${esc(t.id)}" data-deadline-state="${status}"><input type="checkbox" data-complete="${esc(t.id)}" aria-label="${t.done?'重新打开':'完成'}任务：${esc(name)}" ${t.done?'checked':''}><div class="task-copy readonly-task-copy"><button class="task-title-button" data-action="edit-task" data-task="${esc(t.id)}" ${hint?`aria-describedby="${esc(help)}"`:""}>${esc(name)}</button>${hint?`<span id="${esc(help)}" class="task-time-description" hidden>${esc(hint)}</span>`:""}${tags.length?`<div class="task-tags">${tags.map(m=>`<span>#${esc(m!.name)}</span>`).join('')}</div>`:''}${t.sourceUnavailable?'<small>来源不可用</small>':''}</div>${t.origin==='manual'?'<span class="manual-task-label">手动</span>':t.sourceUnavailable?'':fileLink(t.noteId,t.line,compact)}</li>`;
  };
  const counts=new Map<string,number>();for(const t of c.tasks)counts.set(t.noteId,(counts.get(t.noteId)??0)+1);
  const rendered=new Set<string>();
  const rows=tasks.map(t=>{
    if((filter==='pending'&&t.dueAt)||t.origin==='manual'||(counts.get(t.noteId)??0)<=5)return item(t);
    if(rendered.has(t.noteId))return '';rendered.add(t.noteId);
    const group=tasks.filter(task=>task.noteId===t.noteId&&(filter==='done'||!task.dueAt)),unavailable=c.data.deletedNotes.includes(t.noteId);
    return `<li class="task-file-container"><details class="task-file-group" data-task-group="${esc(t.noteId)}" ${expanded.has(t.noteId)?'open':''}><summary><span class="task-file-title" title="${esc(c.state.notes.find(n=>n.id===t.noteId)?.path??'')}">${esc(c.title(t.noteId))}</span><span class="task-file-count">${group.length} 条</span><svg class="task-file-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>${unavailable?'<span class="source-unavailable">来源不可用</span>':fileLink(t.noteId,0,true,true)}</summary><ul class="task-list readonly-tasks task-file-children">${group.map(task=>item(task,true)).join('')}</ul></details></li>`;
  }).join('');
  return `<div class="task-create-surface" data-task-surface>${moduleId?`<div class="module-task-filter"><span>模块：${esc(c.modules.find(m=>m.id===moduleId)?.name??'全部')}</span><button data-action="clear-module">查看全部</button></div>`:''}<nav class="task-filters" aria-label="任务状态"><button data-action="filter" data-filter="pending" aria-pressed="${filter==='pending'}">待办 ${c.pending.length}</button><button data-action="filter" data-filter="done" aria-pressed="${filter==='done'}">已完成 ${c.tasks.length-c.pending.length}</button></nav><ul class="task-list readonly-tasks">${rows||`<li class="empty">${filter==='done'?'还没有已完成任务。':'没有待办；访问笔记后会读取任务。'}</li>`}</ul><button class="task-create-button" data-action="new-task"><span aria-hidden="true">＋</span><span>写下一个待办</span></button><div class="task-blank-area" aria-hidden="true"></div></div>`;
}
