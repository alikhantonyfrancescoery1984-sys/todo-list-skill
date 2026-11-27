import {deadlineInput,deadlineValue,deadlineParts} from './deadline-input';
import type {WorkspaceController,LedgerTask} from '../../application/workspace';
import {id} from '../../core/model';
import {localDeadline,parseDeadline,type TaskOptions} from '../../core/planning';
import {escapeHtml as esc} from '../html';
export const taskLabel=(task:LedgerTask):string=>task.label??task.text;
export function taskEditor(task?:LedgerTask,c?:WorkspaceController):string{
 return `<form class="task-editor-form"><label for="task-name">待办名称${!task||task.origin==='manual'?' · 支持 #标签':''}</label><textarea id="task-name" name="task-name" rows="3" maxlength="2000" required>${task?esc(taskLabel(task)):''}</textarea>${!task||task.origin==='manual'?'<div class="tag-preview" aria-live="polite"></div><p class="editor-context">标签只用于模块完成度统计。</p>':'<p class="editor-context">在清单中保存名称与时间，笔记来源保持不变。</p>'}<div class="task-group-field"><label for="task-group">所属项目</label><select id="task-group"><option value="">不属于项目</option>${(c?.groups??[]).map(g=>`<option value="${esc(g.id)}" ${task?.groupId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}<option value="__new">创建新项目…</option></select><div id="task-new-group-field" hidden><label for="task-new-group">新项目名称</label><input id="task-new-group" maxlength="80"></div></div><div class="planning-fields"><div class="deadline-field">${deadlineInput(task?.dueAt)}<button type="button" class="deadline-clear" data-editor="clear-deadline">清空截止时间</button></div><label class="reminder-enable"><input id="task-reminder-enabled" type="checkbox" aria-describedby="task-reminder-hint" ${task?.reminder?'checked':''}>提前提醒</label><p id="task-reminder-hint" class="editor-context" aria-live="polite" hidden>已启用提前提醒，请选择截止日期后保存。</p><div class="reminder-fields"><label for="task-reminder-value">提前量<input id="task-reminder-value" type="number" min="0" max="1000000" step="any" value="${task?.reminder?.value??1}"></label><label for="task-reminder-unit">单位<select id="task-reminder-unit"><option value="hours" ${task?.reminder?.unit==='hours'?'selected':''}>小时</option><option value="days" ${task?.reminder?.unit==='days'?'selected':''}>天</option></select></label></div><p class="editor-context">到提醒时间后名称变红；截止已过则保持红色，完成后取消。</p></div><p class="editor-error" role="alert" hidden></p><div class="editor-actions">${task?'<button type="button" class="delete-task" data-editor="delete">删除待办</button>':''}<button type="button" data-editor="cancel">取消</button><button type="submit" class="save-task">${task?'保存修改':'创建待办'}</button></div></form>`;
}
export function bindTaskEditor(root:HTMLElement,c:WorkspaceController,task:LedgerTask|undefined,close:()=>void,onDeleted:(id:string)=>void):()=>void{
 const events=new AbortController(),form=root.querySelector<HTMLFormElement>('form')!,input=form.querySelector<HTMLTextAreaElement>('#task-name')!,error=form.querySelector<HTMLElement>('.editor-error')!,deadline=form.querySelector<HTMLInputElement>('#task-deadline-date')!,period=form.querySelector<HTMLSelectElement>('#task-deadline-period')!,hour=form.querySelector<HTMLSelectElement>('#task-deadline-hour')!,minute=form.querySelector<HTMLSelectElement>('#task-deadline-minute')!,enabled=form.querySelector<HTMLInputElement>('#task-reminder-enabled')!,amount=form.querySelector<HTMLInputElement>('#task-reminder-value')!,unit=form.querySelector<HTMLSelectElement>('#task-reminder-unit')!;
 if(!task&&!deadline.value)deadline.value=localDeadline(c.now().toISOString()).slice(0,10);
 const group=form.querySelector<HTMLSelectElement>('#task-group')!,newGroup=form.querySelector<HTMLInputElement>('#task-new-group')!,groupField=form.querySelector<HTMLElement>('#task-new-group-field')!;
 const moduleLabel=document.createElement('label'),moduleSelect=document.createElement('select');moduleLabel.htmlFor='task-module';moduleLabel.append('所属模块');moduleSelect.id='task-module';for(const module of c.modules.filter(m=>!m.hidden)){const option=document.createElement('option');option.value=module.id;option.textContent=module.name;if(task&&c.taskModule(task).id===module.id)option.selected=true;moduleSelect.append(option)}moduleLabel.append(moduleSelect);form.querySelector('.task-group-field')!.before(moduleLabel);
 const syncGroup=()=>{groupField.hidden=group.value!=='__new';newGroup.required=!groupField.hidden;};group.addEventListener('change',syncGroup,{signal:events.signal});syncGroup();
 const draftId=id('task-manual');let busy=false;
 const hint=form.querySelector<HTMLElement>('#task-reminder-hint')!;
 const sync=()=>{enabled.disabled=false;deadline.required=enabled.checked;hint.hidden=!enabled.checked||!!deadline.value;amount.disabled=unit.disabled=!enabled.checked;amount.required=enabled.checked;};
 const tags=()=>{const holder=form.querySelector<HTMLElement>('.tag-preview');if(holder)holder.innerHTML=c.previewTags(input.value).map(({tag,module},i)=>`<span class="tag-preview-chip" data-tag-state="${module?'existing':'new'}">#${esc(module?.name??tag)}${i===0?' · 主模块':''}${module?'':' · 新建'}</span>`).join('');};
 const run=async(work:()=>Promise<unknown>)=>{if(busy)return;busy=true;error.hidden=true;form.setAttribute('aria-busy','true');for(const b of form.querySelectorAll<HTMLButtonElement>('button'))b.disabled=true;try{await work();close();}catch(e){error.textContent=e instanceof Error?e.message:String(e);error.hidden=false;if(enabled.checked&&!deadline.value)deadline.focus();else input.focus();}finally{busy=false;form.removeAttribute('aria-busy');for(const b of form.querySelectorAll<HTMLButtonElement>('button'))b.disabled=false;}};
 form.addEventListener('submit',e=>{e.preventDefault();void run(()=>{
  const value=deadlineValue(deadline.value,period.value,hour.value,minute.value);
  const dueAt=task?.dueAt&&localDeadline(task.dueAt)===value?task.dueAt:parseDeadline(value);
  if(enabled.checked&&!dueAt)throw new Error('请先选择截止日期后再保存提前提醒。');
  const options:TaskOptions={...(group.value==='__new'?{newGroupName:newGroup.value,groupId:null}:{groupId:group.value||null}),moduleId:moduleSelect.value,...(!task?{horizon:'today' as const}:{}),dueAt:dueAt??null,reminder:dueAt&&enabled.checked?{value:Number(amount.value),unit:unit.value as 'hours'|'days'}:null};
  return task?c.updateTask(task.id,input.value,options):c.createTask(input.value,draftId,options);
 });},{signal:events.signal});
 input.addEventListener('input',tags,{signal:events.signal});deadline.addEventListener('input',sync,{signal:events.signal});deadline.addEventListener('change',sync,{signal:events.signal});enabled.addEventListener('change',sync,{signal:events.signal});
 form.querySelector('[data-editor=clear-deadline]')?.addEventListener('click',()=>{const p=deadlineParts();deadline.value='';enabled.checked=false;period.value=p.period;hour.value=p.hour;minute.value=p.minute;sync();},{signal:events.signal});
 form.querySelector('[data-editor=cancel]')?.addEventListener('click',close,{signal:events.signal});
 form.querySelector('[data-editor=delete]')?.addEventListener('click',()=>{if(task)void run(async()=>{await c.removeTask(task.id);onDeleted(task.id);});},{signal:events.signal});
 sync();tags();input.focus();input.select();return()=>events.abort();
}
export function taskClick(target:Element):{action:'new-task'|'edit-task';id?:string}|undefined{
 if(target.closest('button,a,input,summary,textarea,label,details,select'))return;
 if(!target.closest('[data-task-surface]'))return;
 const item=target.closest<HTMLElement>('[data-task-item]');return item?{action:'edit-task',id:item.dataset.taskItem}:{action:'new-task'};
}
