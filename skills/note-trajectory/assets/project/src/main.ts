import {registerUpdateCommand} from './updater/host';
import {groupEditor,bindGroupEditor} from './ui/workspace/group-editor';
import type {TaskGroup,TaskGroupQuestion} from './core/task-groups';
import {deleteSourceTask} from './core/source-task-delete';
import {setSourceChecked} from './core/source-task-complete';
import {stripTaskBlockIds} from './core/tasks';
import {hideTaskBlockIds} from './adapters/obsidian/block-ids';
import {EditorSync} from './application/editor-sync';
import {moduleEditor,bindModuleEditor} from './ui/workspace/module-editor';
import type {ModuleRef} from './core/modules';
import {bindTaskHints,displayTaskName,paintDeadlines} from './ui/workspace/hints';
import {taskEditor,bindTaskEditor,taskClick} from './ui/workspace/editor';
import type {LedgerTask} from './application/workspace';
import {Plugin,ItemView,TFile,Notice,Modal,MarkdownView,type App,type WorkspaceLeaf} from 'obsidian';
import {WorkspaceController,type SourceFile,type ImportQuestion} from './application/workspace';
import {renderTasks,bindModuleSortables,type TaskViewMode} from './ui/workspace/tasks';
import {localDate} from './core/scheduler';import {renderModuleDistribution,renderStatistics} from './ui/statistics/view';
import {escapeHtml as esc} from './ui/html';
import {deadlineState,reminderAt} from './core/planning';

const VIEW='note-trajectory-readonly';

export default class NoteWorkspace extends Plugin {
  controller!:WorkspaceController;
  private confirmationTail:Promise<unknown>=Promise.resolve();
  private activeModal:ImportModal|null=null;
  private edits!:EditorSync<TFile>;
  private stopped=false;
  async onload():Promise<void>{
    const data=await this.loadData();
    try{this.controller=new WorkspaceController({read:async(source:SourceFile)=>{
      const file=source as TFile;
      const views=this.app.workspace.getLeavesOfType('markdown').map(l=>l.view).filter((v):v is MarkdownView=>v instanceof MarkdownView);
      // Read from disk: cachedRead can hand back a pre-write body, which used to append a fresh block ID on every pass.
      let text=await this.app.vault.read(file);
      const dirty=views.some(v=>v.file?.path===file.path&&v.editor.getValue()!==text);
      if(!dirty){
        // Notes never receive plugin IDs any more; only legacy ones written by 0.7.5 and earlier are removed.
        const cleaned=stripTaskBlockIds(text);
        if(cleaned!==text)text=await this.app.vault.process(file,current=>current===text?cleaned:current);
      }
      return {text,indexed:!!this.app.metadataCache.getFileCache(file)};
    }},{now:()=>new Date()},{save:value=>this.saveData(value)},question=>this.askImport(question),data??null,async(task,path)=>{
      const file=this.app.vault.getFileByPath(path);if(!file)return;
      await this.app.vault.process(file,current=>{
        const views=this.app.workspace.getLeavesOfType('markdown').map(l=>l.view).filter((v):v is MarkdownView=>v instanceof MarkdownView&&v.file?.path===path);
        if(views.some(v=>v.editor.getValue()!==current))throw new Error('笔记仍在保存中，请稍后重试删除。');
        return deleteSourceTask(current,task);
      });
    },question=>this.askGroup(question),async(task,path,done)=>{
      const file=this.app.vault.getFileByPath(path);
      if(!file){new Notice('这条待办的来源笔记已不可用，只在插件里勾选。');return;}
      try{
        await this.app.vault.process(file,current=>{
          const views=this.app.workspace.getLeavesOfType('markdown').map(l=>l.view).filter((v):v is MarkdownView=>v instanceof MarkdownView&&v.file?.path===path);
          if(views.some(v=>v.editor.getValue()!==current))throw new Error('笔记正在编辑，保存后再勾选');
          return setSourceChecked(current,task,done);
        });
      }catch(error){new Notice(error instanceof Error?error.message:String(error));}
    });}
    catch(error){new Notice('任务数据无法载入，原数据已保留。');throw error;}
    registerUpdateCommand(this,()=>this.controller.ready());
    this.edits=new EditorSync((f,text)=>{if(!this.stopped)this.controller.edit(f,text);},(f,text)=>this.controller.indexed(f,text),(fn,ms)=>window.setTimeout(fn,ms),timer=>window.clearTimeout(timer));
    this.registerView(VIEW,leaf=>new WorkspaceView(leaf,this));
    this.registerEditorExtension(hideTaskBlockIds);
    // Keep this command/view identifier so existing workspace layouts and shortcuts still open.
    this.addCommand({id:'open-readonly-trajectory',name:'打开待办清单',callback:()=>{void this.openView();}});
    this.addCommand({id:'read-current-note-tasks',name:'读取当前笔记待办',callback:()=>{const file=this.app.workspace.getActiveFile();if(file)void this.controller.open(file).then(()=>{const note=this.controller.state.notes.find(n=>n.path===file.path);if(note)return this.controller.collect(note.id,true);}).catch(error=>new Notice(String(error)));}});
    this.registerEvent(this.app.workspace.on('file-open',file=>{this.flush();if(file){void this.controller.open(file);}}));
    this.registerEvent(this.app.workspace.on('editor-change',(editor,info)=>{const file=info.file;if(!file||file.stat.size>1_000_000)return;this.edits.queue(file,editor.getValue());}));
    this.registerEvent(this.app.metadataCache.on('changed',(file,data)=>this.edits.indexed(file,data)));
    this.registerEvent(this.app.vault.on('rename',(file,oldPath)=>{if(file instanceof TFile)this.controller.renamed(file,oldPath);}));
    this.registerEvent(this.app.vault.on('delete',file=>{if(file instanceof TFile){this.edits.drop(file);this.controller.deleted(file);}}));
    this.registerEvent(this.app.workspace.on('active-leaf-change',leaf=>{if(leaf?.view.getViewType()!=='markdown'){this.flush();}}));
    this.registerEvent(this.app.workspace.on('window-open',(_workspace,win)=>this.watchWindow(win)));
    this.watchWindow(window);
    this.registerInterval(window.setInterval(()=>this.refreshTimedViews(),1000));
    this.app.workspace.onLayoutReady(()=>{if(this.stopped)return;
      const refresh=(file:unknown)=>{if(file instanceof TFile&&file.extension==='md')void this.controller.refresh(file).catch(error=>new Notice(String(error)));};
      this.registerEvent(this.app.vault.on('create',refresh));this.registerEvent(this.app.vault.on('modify',refresh));
      const file=this.app.workspace.getActiveFile();if(file){void this.controller.open(file);}if(this.app.workspace.getLeavesOfType(VIEW).length)void this.openView();
    });
  }
  private refreshTimedViews():void{for(const leaf of this.app.workspace.getLeavesOfType(VIEW))if(leaf.view instanceof WorkspaceView&&leaf.view.owns(this))leaf.view.refreshTimedUI();}
  private watchWindow(win:Window):void{this.registerDomEvent(win,'focus',()=>this.refreshTimedViews());this.registerDomEvent(win.document,'visibilitychange',()=>{if(!win.document.hidden)this.refreshTimedViews();});this.registerDomEvent(win,'blur',()=>{this.flush();});}
  private flush():void{this.edits?.flush();}
  async openView():Promise<void>{
    let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];
    // Recreate this plugin's stale leaf so old DOM listeners cannot survive a hot reload.
    if(leaf&&(!(leaf.view instanceof WorkspaceView)||!leaf.view.owns(this))){leaf.detach();leaf=undefined;}
    leaf=leaf??this.app.workspace.getRightLeaf(false)??this.app.workspace.getLeaf('tab');
    await leaf.setViewState({type:VIEW,active:true});await this.app.workspace.revealLeaf(leaf);void this.controller.suggestTaskGroups().catch(error=>new Notice(String(error)));
  }
  private askImport(question:ImportQuestion):Promise<boolean>{
    const work=this.confirmationTail.then(()=>new Promise<boolean>(resolve=>{
      if(this.stopped){resolve(false);return;}
      this.activeModal=new ImportModal(this.app,question,value=>{this.activeModal=null;resolve(value);});this.activeModal.open();
    }));this.confirmationTail=work.catch(()=>{});return work;
  }
  private askGroup(question:TaskGroupQuestion):Promise<boolean>{const work=this.confirmationTail.then(()=>new Promise<boolean>(resolve=>{if(this.stopped){resolve(false);return;}const modal=new FolderGroupModal(this.app,question,resolve);this.activeGroupModal=modal;modal.open();}));this.confirmationTail=work.catch(()=>{});return work;}
  private activeGroupModal:FolderGroupModal|undefined;
  onunload():void{this.flush();this.stopped=true;this.activeModal?.close();this.activeGroupModal?.close();if(this.controller)void this.controller.dispose().catch(()=>{});}

}

class WorkspaceView extends ItemView {
  private taskGroupModal:TaskGroupModal|undefined;
  private expandedTaskFiles=new Set<string>();private reminded=new Set<string>();private viewEvents=new AbortController();private savedScroll=0;private editorModal:TaskEditorModal|null=null;private moduleModal:ModuleEditorModal|null=null;private moduleFilter:string|undefined;private hints:ReturnType<typeof bindTaskHints>|undefined;private homeDate='';
  private tasksOpen=true;private taskFilter:'pending'|'done'='pending';private taskView:TaskViewMode='project';private stats=false;private statsDate=localDate(new Date());private unsubscribe:(()=>void)|undefined;private unbindSortables:(()=>void)|undefined;
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
    let touchX:number|undefined;listen('touchstart',event=>{touchX=event.touches[0]?.clientX;});listen('touchend',event=>{const end=event.changedTouches[0]?.clientX;if(touchX===undefined||end===undefined||Math.abs(end-touchX)<48)return;const views:TaskViewMode[]=['today','project'],at=views.indexOf(this.taskView),next=Math.max(0,Math.min(views.length-1,at+(end<touchX?1:-1)));if(next!==at){this.taskView=views[next]!;this.render();}touchX=undefined;});
    listen('change',event=>{const input=event.target as HTMLInputElement;if(input.dataset.complete){void this.plugin.controller.complete(input.dataset.complete,input.checked).catch(error=>new Notice(String(error)));return;}if(input.id==='stats-date'&&/^\d{4}-\d{2}-\d{2}$/.test(input.value)&&Number.isFinite(Date.parse(input.value))){this.statsDate=input.value;this.render();}});
    this.render();
  }
  async onClose():Promise<void>{this.viewEvents.abort();this.unsubscribe?.();this.unsubscribe=undefined;this.unbindSortables?.();this.unbindSortables=undefined;this.editorModal?.close();this.taskGroupModal?.close();this.moduleModal?.close();this.hints?.dispose();this.contentEl.classList.remove('note-workspace-host','note-workspace-root');this.contentEl.style.removeProperty('background-color');this.contentEl.empty();}
  private tasks():string{return renderTasks(this.plugin.controller,this.taskFilter,id=>{const n=this.plugin.controller.state.notes.find(n=>n.id===id);return 'obsidian://open?vault='+encodeURIComponent(this.app.vault.getName())+'&file='+encodeURIComponent(n?.path??'');},this.expandedTaskFiles,this.taskView,this.moduleFilter);}
  render():void{
    this.hints?.hide();this.unbindSortables?.();this.unbindSortables=undefined;const c=this.plugin.controller;this.homeDate=localDate(c.now());
    this.contentEl.innerHTML=`<header><strong>${this.stats?'每日统计':'待办清单'}</strong><button data-action="stats">${this.stats?'返回任务':'统计'}</button></header><p class="readonly-notice">本地保存 · 持续积累</p>${c.storageError?`<p class="storage-error" role="alert">${esc(c.storageError)} <button data-action="retry-save">重试保存</button></p>`:''}${this.stats?this.statistics():`<div class="home-modules note-workspace-statistics">${renderModuleDistribution(c.state,localDate(c.now()),c.analyticsContext)}</div><div class="readonly-disclosure"><button class="readonly-toggle" data-action="tasks" aria-expanded="${this.tasksOpen}" aria-controls="readonly-task-body" aria-label="${this.tasksOpen?'收起':'展开'}任务"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" style="transform:rotate(${this.tasksOpen?180:0}deg)"><path d="m6 9 6 6 6-6"/></svg></button><span class="tasks-heading">待办</span><button class="task-add-header" data-action="new-task" aria-label="创建待办">＋</button></div><div id="readonly-task-body" class="readonly-task-body" ${this.tasksOpen?'':'hidden'}>${this.tasks()}</div>`}<details><summary>记录与导入状态</summary><p>累计 ${c.tasks.length} 条任务 · ${c.pending.length} 条待办 · 任务与历史保存在插件本地文件</p>${Object.entries(c.data.decisions).filter(([,decision])=>decision==='skip').map(([id])=>`<p>${esc(c.title(id))} · 已跳过 <button data-action="recheck" data-note="${esc(id)}">重新读取</button></p>`).join('')}${[...c.observed.values()].filter(n=>n.error).map(n=>`<p>${esc(n.path)}：${esc(n.error)}</p>`).join('')}</details>`;if(!this.stats)this.unbindSortables=bindModuleSortables(this.contentEl,c);
  }
  private statistics():string{return renderStatistics(this.plugin.controller.state,this.statsDate,{dateControls:true,source:this.plugin.controller.analyticsContext});}
  refreshTimedUI():void{const c=this.plugin.controller,now=c.now().getTime();if(!this.stats&&this.homeDate!==localDate(c.now()))this.render();else paintDeadlines(this.contentEl,c);for(const task of c.pending){const status=deadlineState(task,now);if(!task.reminder||(status!=='warning'&&status!=='overdue'))continue;const key=task.id+':'+reminderAt(task);if(this.reminded.has(key))continue;this.reminded.add(key);new Notice((status==='overdue'?'待办已截止：':'待办即将截止：')+displayTaskName(task),10000);}}
  private openModule(moduleId?:string):void{const module=moduleId?this.plugin.controller.modules.find(m=>m.id===moduleId):undefined;if(moduleId&&!module)return;this.moduleModal?.close();this.moduleModal=new ModuleEditorModal(this.app,this.plugin.controller,module,id=>{this.moduleFilter=id;this.taskView='project';this.tasksOpen=true;this.render();},id=>{if(this.moduleFilter===id)this.moduleFilter=undefined;this.render();});this.moduleModal.open();}
  private openEditor(taskId?:string):void{this.tasksOpen=true;this.render();const task=taskId?this.plugin.controller.tasks.find(t=>t.id===taskId):undefined;if(taskId&&!task)return;this.editorModal?.close();this.editorModal=new TaskEditorModal(this.app,this.plugin.controller,task,()=>{this.render();},()=>{((taskId?this.contentEl.querySelector<HTMLButtonElement>('[data-action=edit-task][data-task="'+CSS.escape(taskId)+'"]'):null)??this.contentEl.querySelector<HTMLButtonElement>('.task-add-header'))?.focus();});this.editorModal.open();}
  private click(event:MouseEvent):void{const blank=taskClick(event.target as Element);if(blank){this.openEditor(blank.id);return;}const b=(event.target as Element).closest<HTMLElement>('button,a[data-action]');if(!b)return;
    const action=b.dataset.action;
    if(action==='task-group-menu'){event.preventDefault();event.stopPropagation();const group=this.plugin.controller.groups.find(g=>g.id===b.dataset.group);this.taskGroupModal?.close();this.taskGroupModal=new TaskGroupModal(this.app,this.plugin.controller,group,()=>this.render());this.taskGroupModal.open();return;}
    if(action==='module-menu'){this.openModule(b.dataset.moduleId);return;}
    if(action==='new-module'){this.openModule();return;}
    if(action==='clear-module'){this.moduleFilter=undefined;this.render();return;}
    if(action==='task-view'){this.moduleFilter=undefined;this.taskView=(b.dataset.view as TaskViewMode)??'today';this.render();return;}
    if(action==='new-task'||action==='edit-task'){this.openEditor(b.dataset.task);return;}
    if(action==='filter'){this.taskFilter=b.dataset.filter==='done'?'done':'pending';this.render();return;}
    if(action==='retry-save'){void this.plugin.controller.persist().catch(()=>{});return;}
    if(action==='recheck'){
      const id=b.dataset.note,n=this.plugin.controller.state.notes.find(n=>n.id===id),file=n&&this.app.vault.getFileByPath(n.path);
      if(file)void this.plugin.controller.open(file).then(()=>this.plugin.controller.collect(n!.id,true)).catch(error=>new Notice(String(error)));return;
    }
    if(action==='source-note'){event.preventDefault();event.stopPropagation();const n=this.plugin.controller.state.notes.find(n=>n.id===b.dataset.note),file=n&&this.app.vault.getFileByPath(n.path);if(file)void this.app.workspace.getLeaf('tab').openFile(file,{active:true,eState:{line:Number(b.dataset.line)}});else new Notice('源笔记已不可用。');return;}
    if(action==='day'){this.statsDate=b.dataset.date!;this.render();return;}
    if(action==='stats'){if(!this.stats)this.savedScroll=this.contentEl.scrollTop;this.stats=!this.stats;this.render();this.contentEl.scrollTop=this.stats?0:this.savedScroll;}if(action==='tasks'){this.tasksOpen=!this.tasksOpen;this.render();}
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
 onOpen():void{this.modalEl.classList.add('note-workspace-root','task-editor-dialog');this.setTitle(this.task?'编辑待办':'新建待办');this.contentEl.innerHTML=taskEditor(this.task,this.controller);this.unbind=bindTaskEditor(this.contentEl,this.controller,this.task,()=>this.close(),this.deleted);}
 onClose():void{this.unbind?.();this.contentEl.empty();this.closed();}
}

class ModuleEditorModal extends Modal {
 private unbind:(()=>void)|undefined;
 constructor(app:App,private controller:WorkspaceController,private module:ModuleRef|undefined,private viewTasks:(id:string)=>void,private removed:(id:string)=>void){super(app);}
 onOpen():void{this.modalEl.classList.add('note-workspace-root','task-editor-dialog','module-editor-dialog');this.setTitle(this.module?'管理模块':'新建模块');this.contentEl.innerHTML=moduleEditor(this.controller,this.module);this.unbind=bindModuleEditor(this.contentEl,this.controller,this.module,()=>this.close(),this.viewTasks,this.removed);}
 onClose():void{this.unbind?.();this.contentEl.empty();}
}

class FolderGroupModal extends Modal {
 private approved=false;
 constructor(app:App,private question:TaskGroupQuestion,private resolve:(allow:boolean)=>void){super(app)}
 onOpen():void{this.modalEl.classList.add('note-workspace-group-prompt');this.setTitle('按子文件夹建立项目？');this.contentEl.createEl('p',{text:this.question.folder});this.contentEl.createEl('p',{text:'同一子文件夹有 '+this.question.count+' 条无截止时间、未加入项目的待办。建立项目后可折叠查看；模块归属不变。'});const actions=this.contentEl.createDiv({cls:'modal-button-container'});actions.createEl('button',{text:'暂不建立',attr:{'data-group-choice':'skip'}}).onclick=()=>this.close();actions.createEl('button',{text:'建立项目',cls:'mod-cta',attr:{'data-group-choice':'allow'}}).onclick=()=>{this.approved=true;this.close()};}
 onClose():void{this.resolve(this.approved);this.contentEl.empty()}
}
class TaskGroupModal extends Modal {
 private unbind:(()=>void)|undefined;
 constructor(app:App,private controller:WorkspaceController,private group:TaskGroup|undefined,private updated:()=>void){super(app)}
 onOpen():void{this.modalEl.classList.add('note-workspace-root','task-editor-dialog','task-group-dialog');this.setTitle(this.group?'管理项目':'新建项目');this.contentEl.innerHTML=groupEditor(this.group);this.unbind=bindGroupEditor(this.contentEl,this.controller,this.group,()=>this.close())}
 onClose():void{this.unbind?.();this.contentEl.empty();this.updated()}
}
