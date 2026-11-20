import {deadlineInput,deadlineValue,deadlineParts} from './deadline-input';
import type {WorkspaceController,LedgerTask} from '../../application/workspace';
import {id} from '../../core/model';
import {localDeadline,parseDeadline,type TaskOptions} from '../../core/planning';
import {escapeHtml as esc} from '../html';
export const taskLabel=(task:LedgerTask):string=>task.label??task.text;
export function taskEditor(task?:LedgerTask):string{
 return `<form class="task-editor-form"><label for="task-name">待办名称${!task||task.origin==='manual'?' · 支持 #标签':''}</label><textarea id="task-name" name="task-name" rows="3" maxlength="2000" required>${task?esc(taskLabel(task)):''}</textarea>${!task||task.origin==='manual'?'<div class="tag-preview" aria-live="polite"></div><p class="editor-context">标签匹配已有模块，否则保存时创建手动模块；第一个标签为完成统计主分类。</p>':'<p class="editor-context">在清单中保存名称与时间，笔记来源保持不变。</p>'}<div class="planning-fields"><div class="deadline-field">${deadlineInput(task?.dueAt)}<button type="button" class="deadline-clear" data-editor="clear-deadline">清空截止时间</button></div><label class="reminder-enable"><input id="task-reminder-enabled" type="checkbox" ${task?.reminder?'checked':''}>提前提醒</label><div class="reminder-fields"><label for="task-reminder-value">提前量<input id="task-reminder-value" type="number" min="0" max="1000000" step="any" value="${task?.reminder?.value??1}"></label><label for="task-reminder-unit">单位<select id="task-reminder-unit"><option value="hours" ${task?.reminder?.unit==='hours'?'selected':''}>小时</option><option value="days" ${task?.reminder?.unit==='days'?'selected':''}>天</option></select></label></div><p class="editor-context">到提醒时间后名称变红；截止已过则保持红色，完成后取消。</p></div><p class="editor-error" role="alert" hidden></p><div class="editor-actions">${task?'<button type="button" class="delete-task" data-editor="delete">删除待办</button>':''}<button type="button" data-editor="cancel">取消</button><button type="submit" class="save-task">${task?'保存修改':'创建待办'}</button></div></form>`;
}
export function bindTaskEditor(root:HTMLElement,c:WorkspaceController,task:LedgerTask|undefined,close:()=>void,onDeleted:(id:string)=>void):()=>void{
 const events=new AbortController(),form=root.querySelector<HTMLFormElement>('form')!,input=form.querySelector<HTMLTextAreaElement>('#task-name')!,error=form.querySelector<HTMLElement>('.editor-error')!,deadline=form.querySelector<HTMLInputElement>('#task-deadline-date')!,period=form.querySelector<HTMLSelectElement>('#task-deadline-period')!,hour=form.querySelector<HTMLSelectElement>('#task-deadline-hour')!,minute=form.querySelector<HTMLSelectElement>('#task-deadline-minute')!,enabled=form.querySelector<HTMLInputElement>('#task-reminder-enabled')!,amount=form.querySelector<HTMLInputElement>('#task-reminder-value')!,unit=form.querySelector<HTMLSelectElement>('#task-reminder-unit')!;
 const draftId=id('task-manual');let busy=false;
 const sync=()=>{enabled.disabled=!deadline.value;if(!deadline.value)enabled.checked=false;amount.disabled=unit.disabled=!deadline.value||!enabled.checked;amount.required=!amount.disabled;};
 const tags=()=>{const holder=form.querySelector<HTMLElement>('.tag-preview');if(holder)holder.innerHTML=c.previewTags(input.value).map(({tag,module},i)=>`<span class="tag-preview-chip" data-tag-state="${module?'existing':'new'}">#${esc(module?.name??tag)}${i===0?' · 主模块':''}${module?'':' · 新建'}</span>`).join('');};
 const run=async(work:()=>Promise<unknown>)=>{if(busy)return;busy=true;error.hidden=true;form.setAttribute('aria-busy','true');for(const b of form.querySelectorAll<HTMLButtonElement>('button'))b.disabled=true;try{await work();close();}catch(e){error.textContent=e instanceof Error?e.message:String(e);error.hidden=false;input.focus();}finally{busy=false;form.removeAttribute('aria-busy');for(const b of form.querySelectorAll<HTMLButtonElement>('button'))b.disabled=false;}};
 form.addEventListener('submit',e=>{e.preventDefault();void run(()=>{
  const value=deadlineValue(deadline.value,period.value,hour.value,minute.value);
  const dueAt=task?.dueAt&&localDeadline(task.dueAt)===value?task.dueAt:parseDeadline(value);
  const options:TaskOptions={dueAt:dueAt??null,reminder:dueAt&&enabled.checked?{value:Number(amount.value),unit:unit.value as 'hours'|'days'}:null};
  return task?c.updateTask(task.id,input.value,options):c.createTask(input.value,draftId,options);
 });},{signal:events.signal});
 input.addEventListener('input',tags,{signal:events.signal});deadline.addEventListener('input',sync,{signal:events.signal});deadline.addEventListener('change',sync,{signal:events.signal});enabled.addEventListener('change',sync,{signal:events.signal});
 form.querySelector('[data-editor=clear-deadline]')?.addEventListener('click',()=>{const p=deadlineParts();deadline.value='';period.value=p.period;hour.value=p.hour;minute.value=p.minute;sync();},{signal:events.signal});
 form.querySelector('[data-editor=cancel]')?.addEventListener('click',close,{signal:events.signal});
 form.querySelector('[data-editor=delete]')?.addEventListener('click',()=>{if(task)void run(async()=>{await c.removeTask(task.id);onDeleted(task.id);});},{signal:events.signal});
 sync();tags();input.focus();input.select();return()=>events.abort();
}
export function taskClick(target:Element):{action:'new-task'|'edit-task';id?:string}|undefined{
 if(target.closest('button,a,input,summary,textarea,label,details,select'))return;
 if(!target.closest('[data-task-surface]'))return;
 const item=target.closest<HTMLElement>('[data-task-item]');return item?{action:'edit-task',id:item.dataset.taskItem}:{action:'new-task'};
}
