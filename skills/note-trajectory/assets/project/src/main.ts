import {moduleEditor,bindModuleEditor} from './ui/workspace/module-editor';
import type {ModuleRef} from './core/modules';
import {bindTaskHints,paintDeadlines} from './ui/workspace/hints';
import {taskEditor,bindTaskEditor,taskClick} from './ui/workspace/editor';
import type {LedgerTask} from './application/workspace';
import {Plugin,ItemView,TFile,Notice,Modal,type App,type WorkspaceLeaf} from 'obsidian';
import {WorkspaceController,type SourceFile,type ImportQuestion} from './application/workspace';
import {renderTasks} from './ui/workspace/tasks';
import {localDate} from './core/scheduler';import {renderModuleDistribution,renderStatistics} from './ui/statistics/view';
import {escapeHtml as esc} from './ui/html';

const VIEW='note-trajectory-readonly';
const time=(at:string)=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at));

export default class NoteWorkspace extends Plugin {
  controller!:WorkspaceController;
  private confirmationTail:Promise<unknown>=Promise.resolve();
  private activeModal:ImportModal|null=null;
  private pending=new Map<TFile,{timer:number;text:string}>();
  private stopped=false;
  async onload():Promise<void>{
    const data=await this.loadData();
    try{this.controller=new WorkspaceController({read:async(file:SourceFile)=>({text:await this.app.vault.cachedRead(file as TFile),indexed:!!this.app.metadataCache.getFileCache(file as TFile)})},{now:()=>new Date()},{save:value=>this.saveData(value)},question=>this.askImport(question),data??null);}
    catch(error){new Notice('任务数据无法载入，原数据已保留。');throw error;}
    this.registerView(VIEW,leaf=>new WorkspaceView(leaf,this));
    // Keep this command/view identifier so existing workspace layouts and shortcuts still open.
    this.addCommand({id:'open-readonly-trajectory',name:'打开待办清单',callback:()=>{void this.openView();}});
    this.addCommand({id:'read-current-note-tasks',name:'读取当前笔记待办',callback:()=>{const file=this.app.workspace.getActiveFile();if(file)void this.controller.open(file).then(()=>{const note=this.controller.state.notes.find(n=>n.path===file.path);if(note)return this.controller.collect(note.id,true);}).catch(error=>new Notice(String(error)));}});
    this.registerEvent(this.app.workspace.on('file-open',file=>{this.flush();if(file){void this.controller.open(file);}}));
    this.registerEvent(this.app.workspace.on('editor-change',(editor,info)=>{const file=info.file;if(!file||file.stat.size>1_000_000)return;const before=this.pending.get(file);if(before)window.clearTimeout(before.timer);const text=editor.getValue();const timer=window.setTimeout(()=>{this.pending.delete(file);if(!this.stopped)this.controller.edit(file,text);},500);this.pending.set(file,{timer,text});}));
    this.registerEvent(this.app.metadataCache.on('changed',(file,data)=>this.controller.indexed(file,data)));
    this.registerEvent(this.app.vault.on('rename',(file,oldPath)=>{if(file instanceof TFile)this.controller.renamed(file,oldPath);}));
    this.registerEvent(this.app.vault.on('delete',file=>{if(file instanceof TFile){const pending=this.pending.get(file);if(pending)window.clearTimeout(pending.timer);this.pending.delete(file);this.controller.deleted(file);}}));
    this.registerEvent(this.app.workspace.on('active-leaf-change',leaf=>{if(leaf?.view.getViewType()!=='markdown'){this.flush();this.controller.pause();}}));
    this.registerEvent(this.app.workspace.on('window-open',(_workspace,win)=>this.watchWindow(win)));
    this.watchWindow(window);
    this.registerInterval(window.setInterval(()=>this.controller.checkIdle(),15_000));
    this.registerInterval(window.setInterval(()=>this.refreshTimedViews(),1000));
    this.app.workspace.onLayoutReady(()=>{if(this.stopped)return;const file=this.app.workspace.getActiveFile();if(file){void this.controller.open(file);}if(this.app.workspace.getLeavesOfType(VIEW).length)void this.openView();});
  }
  private refreshTimedViews():void{for(const leaf of this.app.workspace.getLeavesOfType(VIEW))if(leaf.view instanceof WorkspaceView&&leaf.view.owns(this))leaf.view.refreshTimedUI();}
  private watchWindow(win:Window):void{this.registerDomEvent(win,'focus',()=>this.refreshTimedViews());this.registerDomEvent(win.document,'visibilitychange',()=>{if(!win.document.hidden)this.refreshTimedViews();});this.registerDomEvent(win,'blur',()=>{this.flush();this.controller.pause();});}
  private flush():void{for(const [file,pending] of this.pending){window.clearTimeout(pending.timer);if(!this.stopped)this.controller.edit(file,pending.text);}this.pending.clear();}
  async openView():Promise<void>{
    let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];
    // Recreate this plugin's stale leaf so old DOM listeners cannot survive a hot reload.
    if(leaf&&(!(leaf.view instanceof WorkspaceView)||!leaf.view.owns(this))){leaf.detach();leaf=undefined;}
    leaf=leaf??this.app.workspace.getRightLeaf(false)??this.app.workspace.getLeaf('tab');
    await leaf.setViewState({type:VIEW,active:true});await this.app.workspace.revealLeaf(leaf);
  }
  private askImport(question:ImportQuestion):Promise<boolean>{
    const work=this.confirmationTail.then(()=>new Promise<boolean>(resolve=>{
      if(this.stopped){resolve(false);return;}
      this.activeModal=new ImportModal(this.app,question,value=>{this.activeModal=null;resolve(value);});this.activeModal.open();
    }));this.confirmationTail=work.catch(()=>{});return work;
  }
  onunload():void{this.flush();this.stopped=true;this.activeModal?.close();if(this.controller)void this.controller.dispose().catch(()=>{});}

}

class WorkspaceView extends ItemView {
  private expandedTaskFiles=new Set<string>();private viewEvents=new AbortController();private savedScroll=0;private lastDeleted:string|null=null;private editorModal:TaskEditorModal|null=null;private moduleModal:ModuleEditorModal|null=null;private moduleFilter:string|undefined;private hints:ReturnType<typeof bindTaskHints>|undefined;private homeDate='';
  private tasksOpen=false;private taskFilter:'pending'|'done'='pending';private stats=false;private statsDate=localDate(new Date());private unsubscribe:(()=>void)|undefined;
  constructor(leaf:WorkspaceLeaf,private plugin:NoteWorkspace){super(leaf);}
  owns(plugin:NoteWorkspace):boolean{return this.plugin===plugin;}
  getViewType():string{return VIEW;}
  getDisplayText():string{return '待办清单';}
  async onOpen():Promise<void>{
    this.viewEvents.abort();this.viewEvents=new AbortController();
    const listen=<K extends keyof HTMLElementEventMap>(type:K,handler:(event:HTMLElementEventMap[K])=>void)=>this.contentEl.addEventListener(type,handler,{signal:this.viewEvents.signal});
    this.contentEl.addEventListener('toggle',event=>{const group=event.target as HTMLDetailsElement;if(group.dataset.taskGroup){if(group.open)this.expandedTaskFiles.add(group.dataset.taskGroup);else this.expandedTaskFiles.delete(group.dataset.taskGroup);}},{capture:true,signal:this.viewEvents.signal});
    this.contentEl.classList.add('note-workspace-host','note-workspace-root');this.contentEl.style.setProperty('background-color','var(--paper)','important');this.unsubscribe=this.plugin.controller.subscribe(()=>this.render());this.hints=bindTaskHints(this.contentEl,this.plugin.controller);
    listen('click',event=>this.click(event));
    listen('change',event=>{const input=event.target as HTMLInputElement;if(input.dataset.complete){void this.plugin.controller.complete(input.dataset.complete,input.checked).catch(error=>new Notice(String(error)));return;}if(input.id==='stats-date'&&/^\d{4}-\d{2}-\d{2}$/.test(input.value)&&Number.isFinite(Date.parse(input.value))){this.statsDate=input.value;this.render();}});
    this.render();
  }
  async onClose():Promise<void>{this.viewEvents.abort();this.unsubscribe?.();this.unsubscribe=undefined;this.editorModal?.close();this.moduleModal?.close();this.hints?.dispose();this.contentEl.classList.remove('note-workspace-host','note-workspace-root');this.contentEl.style.removeProperty('background-color');this.contentEl.empty();}
  private title=(noteId:string):string=>this.plugin.controller.title(noteId);
  private tasks():string{return renderTasks(this.plugin.controller,this.taskFilter,id=>{const n=this.plugin.controller.state.notes.find(n=>n.id===id);return 'obsidian://open?vault='+encodeURIComponent(this.app.vault.getName())+'&file='+encodeURIComponent(n?.path??'');},this.expandedTaskFiles,this.moduleFilter);}
  render():void{
    this.hints?.hide();const c=this.plugin.controller;this.homeDate=localDate(c.now());
    this.contentEl.innerHTML=`<header><strong>${this.stats?'每日统计':'待办清单'}</strong><button data-action="stats">${this.stats?'返回任务':'统计'}</button></header><p class="readonly-notice">本地保存 · 持续积累</p>${c.storageError?`<p class="storage-error" role="alert">${esc(c.storageError)} <button data-action="retry-save">重试保存</button></p>`:''}${this.stats?this.statistics():`<div class="home-modules note-workspace-statistics">${renderModuleDistribution(c.state,localDate(c.now()),c.analyticsContext)}</div><div class="readonly-disclosure"><button class="readonly-toggle" data-action="tasks" aria-expanded="${this.tasksOpen}" aria-controls="readonly-task-body" aria-label="${this.tasksOpen?'收起':'展开'}任务"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" style="transform:rotate(${this.tasksOpen?180:0}deg)"><path d="m6 9 6 6 6-6"/></svg></button><span class="tasks-heading">待办</span><button class="task-add-header" data-action="new-task" aria-label="创建待办">＋</button></div><div id="readonly-task-body" class="readonly-task-body" ${this.tasksOpen?'':'hidden'}>${this.tasks()}${this.lastDeleted?`<p class="task-undo" role="status">已删除待办 <button data-action="undo-delete" data-task="${esc(this.lastDeleted)}">撤销删除</button></p>`:''}</div>`}<details><summary>记录与导入状态</summary><p>累计 ${c.tasks.length} 条任务 · ${c.pending.length} 条待办 · 任务与历史保存在插件本地文件</p>${Object.entries(c.data.decisions).filter(([,decision])=>decision==='skip').map(([id])=>`<p>${esc(c.title(id))} · 已跳过 <button data-action="recheck" data-note="${esc(id)}">重新读取</button></p>`).join('')}${[...c.observed.values()].filter(n=>n.error).map(n=>`<p>${esc(n.path)}：${esc(n.error)}</p>`).join('')}</details>`;
  }
  private statistics():string{return renderStatistics(this.plugin.controller.state,this.statsDate,{title:this.title,time,dateControls:true,source:this.plugin.controller.analyticsContext});}
  refreshTimedUI():void{if(!this.stats&&this.homeDate!==localDate(this.plugin.controller.now()))this.render();else paintDeadlines(this.contentEl,this.plugin.controller);}
  private openModule(moduleId:string):void{const module=this.plugin.controller.modules.find(m=>m.id===moduleId);if(!module)return;this.moduleModal?.close();this.moduleModal=new ModuleEditorModal(this.app,this.plugin.controller,module,id=>{this.moduleFilter=id;this.tasksOpen=true;this.render();},id=>{if(this.moduleFilter===id)this.moduleFilter=undefined;this.render();});this.moduleModal.open();}
  private openEditor(taskId?:string):void{this.tasksOpen=true;this.render();const task=taskId?this.plugin.controller.tasks.find(t=>t.id===taskId):undefined;if(taskId&&!task)return;this.editorModal?.close();this.editorModal=new TaskEditorModal(this.app,this.plugin.controller,task,id=>{this.lastDeleted=id;this.render();},()=>{((taskId?this.contentEl.querySelector<HTMLButtonElement>('[data-action=edit-task][data-task="'+CSS.escape(taskId)+'"]'):null)??this.contentEl.querySelector<HTMLButtonElement>('.task-add-header'))?.focus();});this.editorModal.open();}
  private click(event:MouseEvent):void{const blank=taskClick(event.target as Element);if(blank){this.openEditor(blank.id);return;}const b=(event.target as Element).closest<HTMLElement>('button,a[data-action]');if(!b)return;
    const action=b.dataset.action;
    if(action==='module-menu'){this.openModule(b.dataset.moduleId!);return;}
    if(action==='clear-module'){this.moduleFilter=undefined;this.render();return;}
    if(action==='restore-module'){void this.plugin.controller.showModule(b.dataset.moduleId!).catch(error=>new Notice(String(error)));return;}
    if(action==='new-task'||action==='edit-task'){this.openEditor(b.dataset.task);return;}
    if(action==='undo-delete'){void this.plugin.controller.restoreTask(b.dataset.task!).then(()=>{this.lastDeleted=null;this.render();}).catch(error=>new Notice(String(error)));return;}
    if(action==='filter'){this.taskFilter=b.dataset.filter==='done'?'done':'pending';this.render();return;}
    if(action==='retry-save'){void this.plugin.controller.persist().catch(()=>{});return;}
    if(action==='recheck'){
      const id=b.dataset.note,n=this.plugin.controller.state.notes.find(n=>n.id===id),file=n&&this.app.vault.getFileByPath(n.path);
      if(file)void this.plugin.controller.open(file).then(()=>this.plugin.controller.collect(n!.id,true)).catch(error=>new Notice(String(error)));return;
    }
    if(action==='source-note'){event.preventDefault();event.stopPropagation();const n=this.plugin.controller.state.notes.find(n=>n.id===b.dataset.note),file=n&&this.app.vault.getFileByPath(n.path);if(file)void this.app.workspace.getLeaf('tab').openFile(file,{active:true,eState:{line:Number(b.dataset.line)}});else new Notice('源笔记已不可用。');return;}
    if(action==='day'){this.statsDate=b.dataset.date!;this.render();return;}
    if(action==='stats'){if(!this.stats)this.savedScroll=this.contentEl.scrollTop;this.plugin.controller.pause();this.stats=!this.stats;this.render();this.contentEl.scrollTop=this.stats?0:this.savedScroll;}if(action==='tasks'){this.tasksOpen=!this.tasksOpen;this.render();}
  }
}

class ImportModal extends Modal {
  private approved=false;
  constructor(app:App,private question:ImportQuestion,private resolve:(allow:boolean)=>void){super(app);}
  onOpen():void{
    this.modalEl.classList.add('note-workspace-import-modal');this.setTitle('读取这篇笔记的待办？');
    this.contentEl.createEl('p',{text:this.question.path});
    this.contentEl.createEl('p',{text:'这篇笔记有 '+this.question.count+' 条未完成待办，超过 5 条。允许后会全部导入，后续新增也会持续同步。'});
    this.contentEl.createEl('p',{text:'跳过后不会读取其任务；可从记录与导入状态或“读取当前笔记待办”命令重新选择。'});
    const actions=this.contentEl.createDiv({cls:'modal-button-container'});
    const skip=actions.createEl('button',{text:'暂不读取',attr:{'data-import-choice':'skip'}});skip.onclick=()=>this.close();
    const allow=actions.createEl('button',{text:'读取此文件的待办',cls:'mod-cta',attr:{'data-import-choice':'allow'}});allow.onclick=()=>{this.approved=true;this.close();};
    skip.focus();
  }
  onClose():void{this.resolve(this.approved);this.contentEl.empty();}
}

class TaskEditorModal extends Modal {
 private unbind:(()=>void)|undefined;
 constructor(app:App,private controller:WorkspaceController,private task:LedgerTask|undefined,private deleted:(id:string)=>void,private closed:()=>void){super(app);}
 onOpen():void{this.modalEl.classList.add('note-workspace-root','task-editor-dialog');this.setTitle(this.task?'编辑待办':'新建待办');this.contentEl.innerHTML=taskEditor(this.task);this.unbind=bindTaskEditor(this.contentEl,this.controller,this.task,()=>this.close(),this.deleted);}
 onClose():void{this.unbind?.();this.contentEl.empty();this.closed();}
}

class ModuleEditorModal extends Modal {
 private unbind:(()=>void)|undefined;
 constructor(app:App,private controller:WorkspaceController,private module:ModuleRef,private viewTasks:(id:string)=>void,private removed:(id:string)=>void){super(app);}
 onOpen():void{this.modalEl.classList.add('note-workspace-root','task-editor-dialog','module-editor-dialog');this.setTitle('管理模块');this.contentEl.innerHTML=moduleEditor(this.controller,this.module);this.unbind=bindModuleEditor(this.contentEl,this.controller,this.module,()=>this.close(),this.viewTasks,this.removed);}
 onClose():void{this.unbind?.();this.contentEl.empty();}
}
