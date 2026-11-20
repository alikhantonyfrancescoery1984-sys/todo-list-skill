import {type PlannedTask,type TaskOptions,validReminder,parseTags,tagKey} from '../core/planning';
import {moduleCatalog,moduleForTask,INBOX_MODULE,type ManualModule,type ModuleRef} from '../core/modules';
import type {AnalyticsContext} from '../core/analytics';
import {localDate} from '../core/scheduler';
import {emptyState,id,type State,type Task} from '../core/model';
import {extractTaskRevision} from '../core/task-revisions';
import {UsageRecorder} from '../core/usage';
import type {Clock} from '../ports';

export interface SourceFile {path:string;extension:string;stat:{size:number}}
export interface SourceReader {read(file:SourceFile):Promise<{text:string;indexed:boolean}>}
export interface LedgerTask extends PlannedTask {collectedAt:string;completedAt?:string;sourceUnavailable?:boolean;missingFromSource?:boolean;origin?:'manual';label?:string;deletedAt?:string}
export interface WorkspaceData {schemaVersion:5;manualModules:ManualModule[];hiddenModules:string[];state:State;tasks:LedgerTask[];decisions:Record<string,'allow'|'skip'>;deletedNotes:string[]}
export interface WorkspaceStore {save(data:WorkspaceData):Promise<void>}
export interface ImportQuestion {noteId:string;path:string;count:number}
export interface TrackedNote {id:string;path:string;text:string;version:number;indexed:boolean;dirty:boolean;error?:string}
export const emptyWorkspace=():WorkspaceData=>({schemaVersion:5,manualModules:[],hiddenModules:[],state:emptyState(),tasks:[],decisions:{},deletedNotes:[]});
const validDate=(s:unknown):s is string=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** Reject corrupt/unknown data; never silently replace an existing task collection. */
export function validateWorkspace(raw:unknown):WorkspaceData{
  if(!object(raw)||(typeof raw.schemaVersion!=='number'||![2,3,4,5].includes(raw.schemaVersion))||!object(raw.state)||raw.state.schemaVersion!==(raw.schemaVersion===2?1:2)||!Array.isArray(raw.tasks)||!object(raw.decisions)||!Array.isArray(raw.deletedNotes))throw new Error('任务数据格式不受支持；原数据未覆盖。');
  const s=raw.state;
  if(raw.schemaVersion!==2&&'activities' in s)throw new Error('当前任务格式不接受已移除的节点数据。');
  for(const k of ['notes',raw.schemaVersion===2?'activities':'observations','sessions','receipts','completions','operations','successfulRuns','taskRegistry'])if(!Array.isArray(s[k]))throw new Error('任务数据不完整；原数据未覆盖。');
  const notes=s.notes as unknown[],ids=new Set<string>(),paths=new Set<string>();
  for(const n of notes){if(!object(n)||typeof n.id!=='string'||typeof n.path!=='string'||typeof n.text!=='string'||!Number.isInteger(n.version)||ids.has(n.id))throw new Error('笔记身份数据损坏。');ids.add(n.id);paths.add(n.path);}
  const taskIds=new Set<string>();
  for(const t of raw.tasks){if(!object(t)||typeof t.id!=='string'||typeof t.noteId!=='string'||!ids.has(t.noteId)||typeof t.text!=='string'||typeof t.done!=='boolean'||typeof t.ambiguous!=='boolean'||!Number.isInteger(t.line)||Number(t.line)<0||!validDate(t.collectedAt)||taskIds.has(t.id)||(t.completedAt!==undefined&&!validDate(t.completedAt))||(t.deletedAt!==undefined&&!validDate(t.deletedAt))||(t.origin!==undefined&&t.origin!=='manual')||(t.dueAt!==undefined&&(!validDate(t.dueAt)||!/[Tt].*(?:Z|[+-]\d{2}:\d{2})$/.test(String(t.dueAt))))||(t.reminder!==undefined&&(!t.dueAt||!validReminder(t.reminder)))||(t.moduleIds!==undefined&&(!Array.isArray(t.moduleIds)||t.moduleIds.some(k=>typeof k!=='string')||new Set(t.moduleIds).size!==t.moduleIds.length))||(t.label!==undefined&&(typeof t.label!=='string'||!t.label.trim()||t.label.length>2000)))throw new Error('任务条目损坏。');taskIds.add(t.id);}
  if(raw.schemaVersion===2){
    for(const a of s.activities as unknown[])if(!object(a)||typeof a.id!=='string'||typeof a.noteId!=='string'||!ids.has(a.noteId)||!validDate(a.at)||!['user','external'].includes(String(a.source))||!['visit','edit'].includes(String(a.kind)))throw new Error('旧活动记录损坏。');
  }else{
    const seen=new Set<string>();
    for(const o of s.observations as unknown[]){
      if(!object(o)||typeof o.noteId!=='string'||!ids.has(o.noteId)||typeof o.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(o.date)||!validDate(o.date)||seen.has(o.noteId+'@'+o.date))throw new Error('笔记统计记录损坏。');
      seen.add(o.noteId+'@'+o.date);
    }
  }
  for(const i of s.sessions as unknown[])if(!object(i)||typeof i.noteId!=='string'||!ids.has(i.noteId)||!validDate(i.start)||!validDate(i.end))throw new Error('活动区间损坏。');
  for(const r of s.receipts as unknown[])if(!object(r)||!validDate(r.at)||!Array.isArray(r.taskIds)||r.taskIds.some(t=>typeof t!=='string'||!taskIds.has(t)))throw new Error('收录记录损坏。');
  for(const c of s.completions as unknown[])if(!object(c)||typeof c.taskId!=='string'||!taskIds.has(c.taskId)||!validDate(c.at))throw new Error('完成记录损坏。');
  for(const [key,value] of Object.entries(raw.decisions))if(!ids.has(key)||!['allow','skip'].includes(String(value)))throw new Error('导入选择损坏。');
  if(raw.deletedNotes.some(n=>typeof n!=='string'||!ids.has(n)))throw new Error('来源状态损坏。');
  const result=structuredClone(raw);
  if(raw.schemaVersion===2){
    const state=result.state as Record<string,unknown>,seen=new Set<string>();
    state.observations=(s.activities as {noteId:string;at:string;source:string}[]).filter(a=>a.source==='user').flatMap(a=>{
      const date=localDate(a.at),key=a.noteId+'@'+date;if(seen.has(key))return [];seen.add(key);return [{noteId:a.noteId,date}];
    });
    delete state.activities;state.schemaVersion=2;result.schemaVersion=3;
  }
  if(raw.schemaVersion===5){
    if(!Array.isArray(raw.manualModules)||!Array.isArray(raw.hiddenModules))throw new Error('模块数据不完整。');
    const moduleIds=new Set<string>(),names=new Map<string,string>();
    for(const m of raw.manualModules){
      if(!object(m)||typeof m.id!=='string'||typeof m.name!=='string'||!m.name.trim()||m.name.length>80||!Array.isArray(m.aliases)||m.aliases.some(a=>typeof a!=='string'||!tagKey(a)||a.length>80)||!validDate(m.createdAt)||(m.deletedAt!==undefined&&!validDate(m.deletedAt))||(!m.id.trim()||moduleIds.has(m.id)))throw new Error('模块数据损坏。');
      if(m.id.startsWith('source:')||!tagKey(m.name))throw new Error('模块身份或名称损坏。');
      moduleIds.add(m.id);if(!m.deletedAt){for(const name of [m.name,...m.aliases as string[]]){const key=tagKey(name);if(names.has(key)&&names.get(key)!==m.id)throw new Error('模块名称冲突。');names.set(key,m.id);}}

    }
    if(raw.hiddenModules.some(k=>typeof k!=='string'||!k.startsWith('source:'))||new Set(raw.hiddenModules).size!==raw.hiddenModules.length)throw new Error('模块显示状态损坏。');
    const catalog=moduleCatalog(result.state as unknown as State,raw.manualModules as unknown as ManualModule[],raw.hiddenModules as string[]),known=new Set([...catalog.map(m=>m.id),...moduleIds,INBOX_MODULE]);
    for(const source of catalog.filter(m=>m.kind==='source'))if(names.has(tagKey(source.name)))throw new Error('手动模块与笔记模块名称冲突。');
    if(raw.tasks.some(t=>(t as {moduleIds?:string[]}).moduleIds?.some(k=>!known.has(k))))throw new Error('任务模块引用损坏。');
  }else{
    result.manualModules=[];result.hiddenModules=[];
    const manual=raw.tasks.filter(t=>(t as {origin?:string}).origin==='manual');
    if(manual.length)(result.manualModules as ManualModule[]).push({id:INBOX_MODULE,name:'手动待办',aliases:[],createdAt:String((manual[0] as {collectedAt:string}).collectedAt)});
  }
  result.schemaVersion=5;
  return result as unknown as WorkspaceData;
}

export class WorkspaceController {
  readonly data:WorkspaceData;
  readonly observed=new Map<string,TrackedNote>();
  storageError='';
  private identities=new WeakMap<SourceFile,string>();
  private generations=new WeakMap<SourceFile,number>();
  private candidates=new Map<string,Task[]>();
  private listeners=new Set<()=>void>();
  private imports=new Map<string,Promise<void>>();
  private saveTail:Promise<void>=Promise.resolve();
  private disposed=false;
  private recorder:UsageRecorder;
  constructor(private source:SourceReader,private clock:Clock,private store:WorkspaceStore,private confirm:(question:ImportQuestion)=>Promise<boolean>,raw:unknown=null){
    this.data=raw===null?emptyWorkspace():validateWorkspace(raw);
    this.syncRegistry();this.recorder=new UsageRecorder(this.state,clock);
  }
  get state():State{return this.data.state;}
  get tasks():LedgerTask[]{return this.data.tasks.filter(t=>!t.deletedAt);}
  now():Date{return this.clock.now();}
  get analyticsContext():AnalyticsContext{return {tasks:this.data.tasks,manualModules:this.data.manualModules,hiddenModules:this.data.hiddenModules};}
  get modules():ModuleRef[]{return moduleCatalog(this.state,this.data.manualModules,this.data.hiddenModules);}
  taskModule(task:LedgerTask):ModuleRef{return moduleForTask(task,task.noteId,this.state,this.modules,this.data.manualModules);}
  taskInModule(task:LedgerTask,moduleId:string):boolean{return task.origin==='manual'?(task.moduleIds?.length?task.moduleIds.includes(moduleId):moduleId===INBOX_MODULE):this.taskModule(task).id===moduleId;}
  get pending():LedgerTask[]{return this.tasks.filter(t=>!t.done);}
  title(noteId:string):string{return this.state.notes.find(n=>n.id===noteId)?.path.split('/').at(-1)?.replace(/\.md$/,'')??'来源不可用';}
  subscribe(fn:()=>void):()=>void{this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  private emit():void{if(!this.disposed)for(const fn of this.listeners)fn();}
  private syncRegistry():void{this.state.taskRegistry=this.tasks;}
  private allowed(file:SourceFile):boolean{return file.extension==='md'&&file.stat.size<=1_000_000&&!['.obsidian/','.trash/','kanban/'].some(p=>file.path.startsWith(p));}
  private known(file:SourceFile):TrackedNote|undefined{const key=this.identities.get(file);return key?this.observed.get(key):undefined;}
  private register(file:SourceFile):TrackedNote{
    let key=this.identities.get(file);
    if(!key){key=this.state.notes.find(n=>n.path===file.path&&!this.data.deletedNotes.includes(n.id))?.id??id('note');this.identities.set(file,key);}
    let n=this.observed.get(key);
    if(!n){const stored=this.state.notes.find(n=>n.id===key);n={id:key,path:file.path,text:'',version:stored?.version??0,indexed:false,dirty:false};this.observed.set(key,n);if(!stored)this.state.notes.push({id:key,path:file.path,text:'',version:0});}
    return n;
  }
  snapshot():WorkspaceData{
    const result=structuredClone(this.data);
    // Persist accepted task snippets and metadata, never complete source-note bodies.
    for(const note of result.state.notes)note.text='';
    result.state.taskRegistry=[];
    return result;
  }
  persist():Promise<void>{
    const snapshot=this.snapshot();
    const next=this.saveTail.catch(()=>{}).then(()=>this.store.save(snapshot)).then(()=>{this.storageError='';this.emit();},error=>{this.storageError='保存失败，待办尚未写入磁盘：'+(error instanceof Error?error.message:String(error));this.emit();throw error;});
    this.saveTail=next;void next.catch(()=>{});return next;
  }
  private save():void{void this.persist().catch(()=>{});}
  async ready():Promise<void>{await this.saveTail;}
  private receive(n:TrackedNote,text:string,indexed:boolean,dirty=false):void{
    const previous=this.candidates.get(n.id);
    const oldText=previous?n.text:undefined;
    n.text=text;n.indexed=indexed;n.dirty=dirty;n.version++;delete n.error;
    const stored=this.state.notes.find(s=>s.id===n.id)!;stored.path=n.path;stored.version=n.version;stored.text=text;
    this.candidates.set(n.id,extractTaskRevision(stored,previous??this.data.tasks.filter(t=>t.noteId===n.id&&t.origin!=='manual'),oldText));
    this.emit();
    if(indexed&&!dirty)void this.collect(n.id).catch(error=>{n.error=error instanceof Error?error.message:String(error);this.emit();});
  }
  async open(file:SourceFile):Promise<void>{
    if(this.disposed||!this.allowed(file))return;
    const n=this.register(file),generation=(this.generations.get(file)??0)+1;this.generations.set(file,generation);
    this.recorder.interact(n.id);this.save();this.emit();
    try{const packet=await this.source.read(file);if(this.disposed||this.generations.get(file)!==generation)return;if(packet.text.length>1_000_000)throw new Error('文件超过 1MB 导入上限。');if(!n.dirty)this.receive(n,packet.text,packet.indexed);}
    catch(error){if(!this.disposed&&this.generations.get(file)===generation){n.error=error instanceof Error?error.message:String(error);this.emit();}}
    await this.imports.get(n.id);
  }
  edit(file:SourceFile,text:string):void{
    if(this.disposed||!this.allowed(file)||text.length>1_000_000)return;
    const n=this.register(file),confirmed=n.indexed&&n.text===text;this.generations.set(file,(this.generations.get(file)??0)+1);
    this.receive(n,text,confirmed,!confirmed);this.recorder.interact(n.id);this.save();this.emit();
  }
  indexed(file:SourceFile,text:string):void{
    if(this.disposed||!this.allowed(file)||text.length>1_000_000)return;const n=this.known(file);if(!n)return;
    this.generations.set(file,(this.generations.get(file)??0)+1);
    if(n.dirty&&n.text!==text){n.indexed=false;this.emit();return;}this.receive(n,text,true);
  }
  collect(noteId:string,force=false):Promise<void>{
    const running=this.imports.get(noteId);if(running)return running;
    const work=Promise.resolve().then(async()=>{
      const n=this.observed.get(noteId);if(this.disposed||!n||!n.indexed||n.dirty)return;
      let candidates=this.candidates.get(noteId)??[],pending=candidates.filter(t=>!t.done&&t.text.trim()&&!this.data.tasks.some(old=>old.id===t.id&&old.deletedAt));
      if(this.data.decisions[noteId]==='skip'&&!force)return;
      const hasNew=pending.some(t=>!this.tasks.some(existing=>existing.id===t.id));
      if(pending.length>5&&hasNew&&this.data.decisions[noteId]!=='allow'){
        const allow=await this.confirm({noteId,path:n.path,count:pending.length});
        if(this.disposed||this.data.deletedNotes.includes(noteId))return;
        this.data.decisions[noteId]=allow?'allow':'skip';this.save();this.emit();if(!allow)return;
      }
      if(this.disposed)return;
      // Permission applies to this file, including later additions, as stated in the dialog.
      candidates=this.candidates.get(noteId)??[];const at=this.clock.now().toISOString(),added:string[]=[];
      for(const candidate of candidates){
        const existing=this.data.tasks.find(t=>t.id===candidate.id);
        if(existing?.deletedAt)continue;
        if(!candidate.text.trim()){if(existing)existing.line=candidate.line;continue;}
        if(existing){existing.text=candidate.text;existing.line=candidate.line;existing.ambiguous=candidate.ambiguous;existing.sourceUnavailable=false;existing.missingFromSource=false;continue;}
        if(candidate.done||candidate.ambiguous)continue;
        this.data.tasks.push({...candidate,done:false,collectedAt:at});added.push(candidate.id);
      }
      for(const task of this.tasks.filter(t=>t.noteId===noteId))if(!candidates.some(c=>c.id===task.id))task.missingFromSource=true;
      if(added.length)this.state.receipts.push({id:id('receipt'),noteId,taskIds:added,at});
      this.syncRegistry();await this.persist();this.emit();
    }).finally(()=>{this.imports.delete(noteId);});
    this.imports.set(noteId,work);void work.catch(()=>{});return work;
  }
  async createTask(text:string,taskId=id('task-manual'),options:TaskOptions={}):Promise<string>{
    if(this.disposed)throw new Error('插件已关闭。');const value=this.taskText(text),details=this.taskDetails(options),noteId='note-manual-tasks';if(!parseTags(value).body)throw new Error('标签以外还需要填写待办名称。');
    const existing=this.data.tasks.find(t=>t.id===taskId);
    if(existing){if(existing.origin!=='manual'||existing.deletedAt)throw new Error('待办身份不可复用。');await this.updateTask(taskId,value,options);return taskId;}
    const moduleIds=this.assignTags(value);
    if(!this.state.notes.some(n=>n.id===noteId))this.state.notes.push({id:noteId,path:'手动待办',text:'',version:0});
    const at=this.clock.now().toISOString();
    this.data.tasks.push({id:taskId,noteId,text:value,line:0,done:false,ambiguous:false,collectedAt:at,origin:'manual',...details,moduleIds});
    this.state.receipts.push({id:id('receipt'),noteId,taskIds:[taskId],at});this.syncRegistry();this.emit();await this.persist();return taskId;
  }
  private taskText(text:string):string{const value=text.trim();if(!value)throw new Error('请输入待办名称。');if(value.length>2000)throw new Error('待办名称最多 2000 个字符。');return value;}
  private taskDetails(options:TaskOptions,task?:LedgerTask):Pick<LedgerTask,'dueAt'|'reminder'>{
    const dueAt=options.dueAt===undefined?task?.dueAt:options.dueAt??undefined;
    const reminder=options.reminder===undefined?(options.dueAt===null?undefined:task?.reminder):options.reminder??undefined;
    if(dueAt!==undefined&&(!validDate(dueAt)||!/[Tt].*(?:Z|[+-]\d{2}:\d{2})$/.test(dueAt)))throw new Error('截止时间需要完整日期、时间和时区。');
    if(reminder&&(!dueAt||!validReminder(reminder)))throw new Error('先设置截止时间，再填写非负的天或小时提醒。');
    return {dueAt,reminder:reminder?{...reminder}:undefined};
  }
  previewTags(text:string):{tag:string;module:ModuleRef|undefined}[]{return parseTags(text).tags.map(tag=>({tag,module:this.modules.find(m=>[m.name,...m.aliases].some(name=>tagKey(name)===tagKey(tag)))}));}
  private assignTags(text:string):string[]{
    const tags=parseTags(text).tags;if(tags.some(tag=>!tagKey(tag)||tag.length>80))throw new Error('标签需要有效名称，且最多 80 个字符。');
    if(!tags.length){let inbox=this.data.manualModules.find(m=>m.id===INBOX_MODULE);if(!inbox){inbox={id:INBOX_MODULE,name:'手动待办',aliases:[],createdAt:this.clock.now().toISOString()};this.data.manualModules.push(inbox);}else delete inbox.deletedAt;return [INBOX_MODULE];}
    return tags.map(tag=>{let module=this.modules.find(m=>[m.name,...m.aliases].some(name=>tagKey(name)===tagKey(tag)));if(!module){const m:ManualModule={id:tagKey(tag)===tagKey('手动待办')?INBOX_MODULE:id('module'),name:tag,aliases:[],createdAt:this.clock.now().toISOString()};const old=this.data.manualModules.findIndex(v=>v.id===m.id);if(old>=0)this.data.manualModules[old]=m;else this.data.manualModules.push(m);module={...m,kind:'manual',hidden:false};}this.data.hiddenModules=this.data.hiddenModules.filter(k=>k!==module!.id);return module.id;});
  }
  async renameTask(taskId:string,text:string):Promise<void>{return this.updateTask(taskId,text);}
  async updateTask(taskId:string,text:string,options:TaskOptions={}):Promise<void>{
    if(this.disposed)return;const value=this.taskText(text),task=this.tasks.find(t=>t.id===taskId);if(!task)throw new Error('待办已删除。');const details=this.taskDetails(options,task);
    if(task.origin==='manual'){if(!parseTags(value).body)throw new Error('标签以外还需要填写待办名称。');const moduleIds=this.assignTags(value);task.text=value;task.moduleIds=moduleIds;}else task.label=value;
    Object.assign(task,details);this.emit();await this.persist();
  }
  moduleTaskCount(moduleId:string):number{return this.tasks.filter(t=>t.origin==='manual'&&this.taskInModule(t,moduleId)).length;}
  async renameModule(moduleId:string,name:string):Promise<void>{
    if(this.disposed)return;const module=this.data.manualModules.find(m=>m.id===moduleId&&!m.deletedAt);if(!module)throw new Error('笔记来源模块的名称不能修改。');const value=name.trim();if(!value||!tagKey(value)||value.length>80)throw new Error('模块名称需要 1–80 个字符。');
    const collision=this.modules.find(m=>m.id!==moduleId&&[m.name,...m.aliases].some(n=>tagKey(n)===tagKey(value)));if(collision)throw new Error('已有同名模块，请使用其它名称。');
    if(tagKey(module.name)!==tagKey(value)&&!module.aliases.some(a=>tagKey(a)===tagKey(module.name)))module.aliases.push(module.name);module.name=value;this.emit();await this.persist();
  }
  async removeModule(moduleId:string):Promise<void>{
    if(this.disposed)return;const deleted=this.data.manualModules.find(m=>m.id===moduleId);const module=this.modules.find(m=>m.id===moduleId)??(deleted?{...deleted,kind:'manual' as const,hidden:true}:undefined);if(!module)throw new Error('模块已不存在。');const at=this.clock.now().toISOString();
    for(const t of this.tasks)if(t.origin==='manual'&&this.taskInModule(t,moduleId))t.deletedAt=at;
    if(module.kind==='manual')this.data.manualModules.find(m=>m.id===moduleId)!.deletedAt??=at;else if(!this.data.hiddenModules.includes(moduleId))this.data.hiddenModules.push(moduleId);
    this.syncRegistry();this.emit();await this.persist();
  }
  async showModule(moduleId:string):Promise<void>{if(this.disposed)return;this.data.hiddenModules=this.data.hiddenModules.filter(k=>k!==moduleId);this.emit();await this.persist();}
  async removeTask(taskId:string):Promise<void>{
    if(this.disposed)return;const task=this.data.tasks.find(t=>t.id===taskId);if(!task)return;
    task.deletedAt??=this.clock.now().toISOString();this.syncRegistry();this.emit();await this.persist();
  }
  async restoreTask(taskId:string):Promise<void>{
    if(this.disposed)return;const task=this.data.tasks.find(t=>t.id===taskId);if(!task)return;
    delete task.deletedAt;this.syncRegistry();this.emit();await this.persist();
  }
  async complete(taskId:string,done:boolean):Promise<void>{
    if(this.disposed)return;const task=this.tasks.find(t=>t.id===taskId);if(!task||task.done===done)return;
    task.done=done;
    if(done){task.completedAt=this.clock.now().toISOString();this.state.completions.push({taskId,noteId:task.noteId,at:task.completedAt});}
    else delete task.completedAt;
    this.emit();await this.persist();
  }
  renamed(file:SourceFile,oldPath?:string):void{
    if(this.disposed)return;
    const stored=this.state.notes.find(n=>n.id===this.identities.get(file)||n.path===oldPath);
    if(!stored)return;this.identities.set(file,stored.id);stored.path=file.path;
    const n=this.observed.get(stored.id);if(n)n.path=file.path;this.save();this.emit();
  }
  deleted(file:SourceFile):void{
    if(this.disposed)return;const key=this.identities.get(file)??this.state.notes.find(n=>n.path===file.path)?.id;if(!key)return;
    this.generations.set(file,(this.generations.get(file)??0)+1);this.recorder.close('interruption');this.observed.delete(key);this.candidates.delete(key);this.identities.delete(file);
    if(!this.data.deletedNotes.includes(key))this.data.deletedNotes.push(key);
    for(const task of this.tasks.filter(t=>t.noteId===key))task.sourceUnavailable=true;
    this.save();this.emit();
  }
  pause():void{if(this.disposed)return;this.recorder.close('blur');this.save();this.emit();}
  checkIdle():void{if(this.disposed)return;const before=this.state.sessions.length;this.recorder.checkIdle();if(this.state.sessions.length!==before){this.save();this.emit();}}
  async dispose():Promise<void>{
    if(this.disposed)return;this.recorder.close('interruption');this.disposed=true;this.listeners.clear();
    await this.persist();this.observed.clear();this.candidates.clear(); // durable tasks remain untouched
  }
}
