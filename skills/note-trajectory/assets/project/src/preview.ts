import {moduleEditor,bindModuleEditor} from './ui/workspace/module-editor';
import {bindTaskHints,paintDeadlines} from './ui/workspace/hints';
import {taskEditor,bindTaskEditor,taskClick} from './ui/workspace/editor';
import {WorkspaceController,validateWorkspace,type WorkspaceData,type SourceFile} from './application/workspace';
import {demoState,DEMO_NOW} from './adapters/browser/demo';
import {SimulatedClock} from './adapters/browser/memory';
import {extractTasks} from './core/tasks';
import {id} from './core/model';
import {localDate} from './core/scheduler';
import {escapeHtml as esc} from './ui/html';
import {renderModuleDistribution,renderStatistics} from './ui/statistics/view';
import {renderTasks} from './ui/workspace/tasks';

const KEY='note-trajectory-workspace-preview-v2';
interface Source {path:string;text:string}
interface Demo {format:'note-trajectory-standalone';schemaVersion:2;workspace:WorkspaceData;sources:Source[];now:string}
const app=document.querySelector<HTMLElement>('#app')!;app.classList.add('note-workspace-root');
const icon={down:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'};
const time=(at:string)=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at));
function fresh():Demo{
  const state=demoState(),sources=state.notes.map(n=>({path:n.path,text:n.text}));
  const tasks=state.notes.flatMap(n=>extractTasks(n).map(t=>({...t,collectedAt:'2026-11-20T08:04:00+08:00'})));
  state.receipts=state.notes.map(n=>({id:id('receipt'),noteId:n.id,taskIds:tasks.filter(t=>t.noteId===n.id).map(t=>t.id),at:'2026-11-20T08:04:00+08:00'}));
  for(const note of state.notes)note.text='';state.taskRegistry=[];
  return {format:'note-trajectory-standalone',schemaVersion:2,workspace:{schemaVersion:5,manualModules:[],hiddenModules:[],state,tasks,decisions:{},deletedNotes:[]},sources,now:DEMO_NOW};
}
function validate(raw:unknown):Demo{
  const d=raw as Demo;if(!d||d.format!=='note-trajectory-standalone'||d.schemaVersion!==2||!Array.isArray(d.sources)||d.sources.some(n=>!n||typeof n.path!=='string'||typeof n.text!=='string')||!Number.isFinite(Date.parse(d.now)))throw new Error('不受支持的演示数据，原数据未修改。');
  const copy=structuredClone(d);copy.workspace=validateWorkspace(d.workspace);return copy;
}
let initial=fresh(),warning='';
try{const data=localStorage.getItem(KEY);if(data)initial=validate(JSON.parse(data));}catch{warning='已有数据无法读取。原存储已保留，请先导出或检查；不会自动覆盖。';}
let sources=initial.sources,clock=new SimulatedClock(new Date(initial.now)),failNext=false,c:WorkspaceController;
let tasksOpen=false,filter:'pending'|'done'='pending',desk=false,selected=sources[0]?.path??'',statsDate=localDate(clock.now());
const expandedTaskFiles=new Set<string>();let lastDeleted:string|null=null;let moduleFilter:string|undefined;let hints:ReturnType<typeof bindTaskHints>|undefined;let homeDate='';
let unsub:(()=>void)|undefined;
const files=new Map<string,SourceFile>();
const file=(path:string)=>{if(!files.has(path))files.set(path,{path,extension:'md',stat:{size:100}});return files.get(path)!;};
let promptTail:Promise<unknown>=Promise.resolve();
function confirmImport(question:{path:string;count:number}):Promise<boolean>{
  const result=promptTail.then(()=>new Promise<boolean>(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='nt-import-dialog';dialog.innerHTML=`<h2>读取这篇笔记的待办？</h2><p>${esc(question.path)}</p><p>这篇笔记有 ${question.count} 条未完成待办，超过 5 条。允许后会全部导入，后续新增也会持续同步。</p><p>跳过后可点击工作台的“重新读取待办”。</p><div class="action-row"><button class="quiet-button" data-import-choice="skip">暂不读取</button><button class="primary-button" data-import-choice="allow">读取此文件的待办</button></div>`;
    dialog.addEventListener('click',e=>{const choice=(e.target as Element).closest<HTMLElement>('[data-import-choice]');if(choice)dialog.close(choice.dataset.importChoice);});
    dialog.addEventListener('close',()=>{const allow=dialog.returnValue==='allow';dialog.remove();resolve(allow);},{once:true});document.body.append(dialog);dialog.showModal();dialog.querySelector<HTMLButtonElement>('[data-import-choice=skip]')!.focus();
  }));promptTail=result.catch(()=>{});return result;
}
function setup(data:WorkspaceData){
  unsub?.();hints?.dispose();c=new WorkspaceController({async read(f){return {text:sources.find(n=>n.path===f.path)?.text??'',indexed:true};}},clock,{async save(workspace){if(warning)throw new Error('原数据待检查，停止覆盖。');if(failNext){failNext=false;throw new Error('模拟磁盘保存失败');}localStorage.setItem(KEY,JSON.stringify({format:'note-trajectory-standalone',schemaVersion:2,workspace,sources,now:clock.now().toISOString()} satisfies Demo));}},confirmImport,data);unsub=c.subscribe(render);hints=bindTaskHints(app,c);
}
setup(initial.workspace);
const title=(noteId:string)=>c.title(noteId);
const isStats=()=>location.hash.startsWith('#statistics');
function header(){return `<header class="topbar"><div class="identity"><h1>${isStats()?'每日统计':'待办清单'}</h1><span class="date-caption">${(isStats()?statsDate:localDate(clock.now())).replaceAll('-','.')}</span></div><button class="quiet-button stats-entry" data-action="stats">${isStats()?'返回任务':'统计'}</button></header>`;}
function footer(){return `<footer class="page-footer"><span>本地演示 · 全部为合成数据</span><button class="text-button" data-action="desk">${desk?'收起':'打开'}演示工作台</button></footer><section class="workbench" id="workbench" ${desk?'':'hidden'}><h2>演示工作台</h2><p class="data-note">独立任务管理 · 无需看板分发</p><div class="workbench-grid"><div><label for="note-picker">模拟笔记</label><select id="note-picker">${sources.map(n=>`<option ${n.path===selected?'selected':''} value="${esc(n.path)}">${esc(n.path)}</option>`).join('')}</select><label for="note-editor">笔记内容</label><textarea id="note-editor" rows="8">${esc(sources.find(n=>n.path===selected)?.text??'')}</textarea><div class="action-row"><button class="primary-button" data-action="save">保存模拟笔记</button><button class="quiet-button" data-action="visit">记录访问</button><button class="quiet-button" data-action="recheck">重新读取待办</button><button class="quiet-button" data-action="bulk-demo">创建 7 条待办的测试笔记</button></div></div><div><h3>模拟时钟</h3><output>${localDate(clock.now())} ${time(clock.now().toISOString())}</output><div class="action-row"><button class="quiet-button" data-action="advance">推进 30 分钟</button></div><div class="action-row"><button class="quiet-button" data-action="fail">下次保存失败</button><button class="quiet-button" data-action="retry-save">重试保存</button></div><h3>演示数据</h3><div class="action-row"><button class="quiet-button" data-action="export">导出 JSON</button><button class="quiet-button" data-action="import">导入 JSON</button></div><input type="file" id="import-file" accept=".json,application/json" hidden></div></div></section><p class="toast" id="status" role="status" aria-live="polite"></p>`;}
function render(){
  hints?.hide();homeDate=localDate(clock.now());
  const body=isStats()?renderStatistics(c.state,statsDate,{title,time,dateControls:true,source:c.analyticsContext}):`<main id="main" tabindex="-1" class="workspace-view"><div class="home-modules note-workspace-statistics">${renderModuleDistribution(c.state,localDate(clock.now()),c.analyticsContext)}</div><section class="tasks-section"><div class="disclosure-heading"><button class="icon-button" id="tasks-toggle" data-action="tasks" aria-expanded="${tasksOpen}" aria-controls="tasks-body" aria-label="${tasksOpen?'收起':'展开'}任务">${icon.down}</button><span class="tasks-label shown">待办</span><button class="task-add-header" data-action="new-task" aria-label="创建待办">＋</button></div><div id="tasks-body" class="disclosure ${tasksOpen?'open':''}" ${tasksOpen?'':'inert'}><div class="disclosure-inner">${renderTasks(c,filter,_id=>'#workbench',expandedTaskFiles,moduleFilter)}${lastDeleted?`<p class="task-undo" role="status">已删除待办 <button data-action="undo-delete" data-task="${esc(lastDeleted)}">撤销删除</button></p>`:''}</div></div></section></main>`;
  app.innerHTML=`${header()}${warning||c.storageError?`<p class="storage-error" role="alert">${esc(warning||c.storageError)} <button data-action="retry-save">重试保存</button></p>`:''}${body}${footer()}`;
}
function notify(message:string){const el=document.querySelector('#status');if(el){el.textContent=message;el.classList.add('visible');}}
async function run(work:()=>Promise<void>){try{await work();await c.ready();render();notify('已保存。');}catch(error){render();notify(error instanceof Error?error.message:String(error));}}
function showNote(noteId:string){const n=c.state.notes.find(n=>n.id===noteId);if(n){selected=n.path;desk=true;render();document.querySelector('#workbench')?.scrollIntoView({block:'start'});document.querySelector<HTMLTextAreaElement>('#note-editor')?.focus();}}
function openEditor(taskId?:string){
 tasksOpen=true;render();
 const task=taskId?c.tasks.find(t=>t.id===taskId):undefined;if(taskId&&!task)return;
 const dialog=document.createElement('dialog');dialog.className='note-workspace-root task-editor-dialog';dialog.setAttribute('aria-label',task?'编辑待办':'新建待办');dialog.innerHTML=`<h2>${task?'编辑待办':'新建待办'}</h2>${taskEditor(task)}`;
 document.body.append(dialog);dialog.showModal();const unbind=bindTaskEditor(dialog,c,task,()=>dialog.close(),id=>{lastDeleted=id;render();});dialog.addEventListener('close',()=>{unbind();dialog.remove();((taskId?app.querySelector<HTMLButtonElement>('[data-action=edit-task][data-task="'+CSS.escape(taskId)+'"]'):null)??app.querySelector<HTMLButtonElement>('.task-add-header'))?.focus();},{once:true});
}
function openModule(moduleId:string){
 const module=c.modules.find(m=>m.id===moduleId);if(!module)return;
 const dialog=document.createElement('dialog');dialog.className='note-workspace-root task-editor-dialog module-editor-dialog';dialog.setAttribute('aria-label','管理模块');dialog.innerHTML=`<h2>管理模块</h2>${moduleEditor(c,module)}`;document.body.append(dialog);dialog.showModal();
 const unbind=bindModuleEditor(dialog,c,module,()=>dialog.close(),id=>{moduleFilter=id;tasksOpen=true;render();},id=>{if(moduleFilter===id)moduleFilter=undefined;render();});dialog.addEventListener('close',()=>{unbind();dialog.remove();app.querySelector<HTMLButtonElement>('.task-add-header')?.focus();},{once:true});
}
app.addEventListener('toggle',event=>{const group=event.target as HTMLDetailsElement;if(group.dataset.taskGroup){if(group.open)expandedTaskFiles.add(group.dataset.taskGroup);else expandedTaskFiles.delete(group.dataset.taskGroup);}},{capture:true});
app.addEventListener('click',e=>{
  const blank=taskClick(e.target as Element);if(blank){openEditor(blank.id);return;}
  const b=(e.target as Element).closest<HTMLElement>('button,a[data-action]');if(!b)return;
  const a=b.dataset.action;
  if(a==='module-menu'){openModule(b.dataset.moduleId!);return;}
  if(a==='clear-module'){moduleFilter=undefined;render();return;}
  if(a==='restore-module'){void run(()=>c.showModule(b.dataset.moduleId!));return;}
  if(a==='new-task'||a==='edit-task'){openEditor(b.dataset.task);return;}
  if(a==='undo-delete'){void run(async()=>{await c.restoreTask(b.dataset.task!);lastDeleted=null;});return;}
  if(a==='source-note'){e.preventDefault();showNote(b.dataset.note!);return;}
  if(a==='tasks'){tasksOpen=!tasksOpen;render();return;}if(a==='filter'){filter=b.dataset.filter==='done'?'done':'pending';render();return;}
  if(a==='stats'){if(!isStats())c.pause();location.hash=isStats()?'home':'statistics';return;}
  if(a==='desk'){desk=!desk;render();return;}
  if(a==='day'){statsDate=b.dataset.date!;render();return;}
  if(a==='recheck'){void run(async()=>{await c.open(file(selected));const n=c.state.notes.find(n=>n.path===selected);if(n)await c.collect(n.id,true);});return;}
  if(a==='save'){const text=document.querySelector<HTMLTextAreaElement>('#note-editor')!.value,path=selected;void run(async()=>{const source=sources.find(n=>n.path===path)!;source.text=text;const f=file(path);if(!c.observed.size)await c.open(f);c.edit(f,text);c.indexed(f,text);await c.collect(c.state.notes.find(n=>n.path===path)!.id);});return;}
  if(a==='visit'){void run(async()=>{await c.open(file(selected));});return;}
  if(a==='bulk-demo'){const path='合成测试/多待办测试.md';if(!sources.some(n=>n.path===path))sources.push({path,text:'# 合成多待办测试\n'+Array.from({length:7},(_,i)=>`- [ ] 测试待办 ${i+1} ^bulk-${i}`).join('\n')});selected=path;void run(async()=>{await c.open(file(path));});return;}
  if(a==='advance'){clock.advance(30);c.checkIdle();void run(()=>c.persist());return;}
  if(a==='fail'){failNext=true;notify('下次保存将失败，可点击重试保存恢复。');return;}if(a==='retry-save'){void run(()=>c.persist());return;}
  if(a==='export'){const data:Demo={format:'note-trajectory-standalone',schemaVersion:2,workspace:c.snapshot(),sources,now:clock.now().toISOString()},url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='note-trajectory-demo.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
  if(a==='import'){document.querySelector<HTMLInputElement>('#import-file')!.click();return;}
});
app.addEventListener('change',e=>{const input=e.target as HTMLInputElement;
 if(input.dataset.complete){void run(()=>c.complete(input.dataset.complete!,input.checked));return;}
 if(input.id==='note-picker'){selected=input.value;const editor=document.querySelector<HTMLTextAreaElement>('#note-editor');if(editor)editor.value=sources.find(n=>n.path===selected)?.text??'';return;}
 if(input.id==='stats-date'){if(/^\d{4}-\d{2}-\d{2}$/.test(input.value)&&Number.isFinite(Date.parse(input.value))){statsDate=input.value;render();}return;}
 if(input.id==='import-file'&&input.files?.[0]){const f=input.files[0];if(f.size>5_000_000){notify('文件超过导入上限。');return;}void f.text().then(async raw=>{const next=validate(JSON.parse(raw));await c.ready();localStorage.setItem(KEY,JSON.stringify(next));unsub?.();sources=next.sources;clock=new SimulatedClock(new Date(next.now));warning='';setup(next.workspace);expandedTaskFiles.clear();moduleFilter=undefined;selected=sources[0]?.path??'';statsDate=localDate(clock.now());render();notify('演示数据已导入。');}).catch(error=>notify(String(error)));}
});
const refreshTime=()=>{if(!isStats()&&homeDate!==localDate(clock.now()))render();else paintDeadlines(app,c);};window.setInterval(refreshTime,1000);window.addEventListener('focus',refreshTime);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshTime();});
window.addEventListener('hashchange',render);window.addEventListener('blur',()=>c.pause());render();
