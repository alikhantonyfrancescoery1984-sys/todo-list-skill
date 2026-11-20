import type {StateStore, BoardPort} from '../../ports';import type {State} from '../../core/model';import {parseBoard} from '../../core/board';
export const STORAGE_KEY='note-trajectory-preview-v1';
export interface Snapshot {format:'note-trajectory-demo';schemaVersion:1;state:State;board:string;now:string}
export function validateSnapshot(value:unknown):Snapshot{
  if(!value||typeof value!=='object')throw new Error('请选择有效的演示 JSON。');const v=value as Snapshot;
  if(v.format!=='note-trajectory-demo'||v.schemaVersion!==1||!v.state||v.state.schemaVersion!==2||typeof v.board!=='string'||v.board.length>1_000_000||!Number.isFinite(Date.parse(v.now)))throw new Error('演示文件格式或版本不受支持。');
  const s=v.state;for(const key of ['notes','observations','sessions','receipts','completions','operations','successfulRuns','taskRegistry'] as const)if(!Array.isArray(s[key])||s[key].length>10000)throw new Error(`数据区「${key}」不正确或超过上限。`);
  const string=(x:unknown)=>typeof x==='string'&&x.length<100000;
  const stamp=(x:unknown)=>string(x)&&Number.isFinite(Date.parse(x as string));
  if(!s.notes.every(n=>n&&string(n.id)&&string(n.path)&&string(n.text)&&Number.isInteger(n.version)))throw new Error('笔记数据不完整。');
  const noteIds=new Set(s.notes.map(n=>n.id));if(noteIds.size!==s.notes.length)throw new Error('笔记身份重复。');
  if(!s.observations.every(o=>o&&noteIds.has(o.noteId)&&/^\d{4}-\d{2}-\d{2}$/.test(o.date)&&stamp(o.date)))throw new Error('统计笔记数据不完整。');
  if(!s.sessions.every(a=>a&&string(a.id)&&noteIds.has(a.noteId)&&stamp(a.start)&&stamp(a.end)&&Date.parse(a.end)>Date.parse(a.start)&&typeof a.estimated==='boolean'))throw new Error('时间区间不正确。');
  if(!s.taskRegistry.every(t=>t&&string(t.id)&&noteIds.has(t.noteId)&&string(t.text)&&Number.isInteger(t.line)&&typeof t.done==='boolean'&&typeof t.ambiguous==='boolean'))throw new Error('任务索引不正确。');
  const taskIds=new Set(s.taskRegistry.map(t=>t.id));
  if(!s.sessions.every(a=>!a.taskId||(!a.estimated&&s.taskRegistry.some(t=>t.id===a.taskId&&t.noteId===a.noteId))))throw new Error('任务用时必须来自明确关联的计时，不能分摊估算时长。');
  if(!s.receipts.every(r=>r&&string(r.id)&&noteIds.has(r.noteId)&&stamp(r.at)&&Array.isArray(r.taskIds)&&r.taskIds.every(t=>taskIds.has(t))))throw new Error('收录映射不正确。');
  if(!s.completions.every(e=>e&&taskIds.has(e.taskId)&&noteIds.has(e.noteId)&&stamp(e.at)&&(!e.precision||['day','instant'].includes(e.precision))))throw new Error('完成记录不正确。');
  if(!s.operations.every(o=>o&&string(o.id)&&noteIds.has(o.noteId)&&stamp(o.at)&&['pending','success','failed'].includes(o.status)&&Array.isArray(o.taskIds)&&o.taskIds.every(t=>taskIds.has(t))))throw new Error('操作记录不正确。');
  if(!s.successfulRuns.every(r=>typeof r==='string'&&/^\d{4}-\d{2}-\d{2}@(8|20)$/.test(r)))throw new Error('调度记录不正确。');
  parseBoard(v.board);return JSON.parse(JSON.stringify(v)) as Snapshot;
}
export class PreviewRepository implements StateStore,BoardPort {
  markdown:string;failNext=false;state:State;now:string;storageWarning='';
  constructor(initial:Snapshot){this.markdown=initial.board;this.state=initial.state;this.now=initial.now;}
  async load(){return structuredClone(this.state);}
  private write():void{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(this.snapshot()));}catch{throw new Error('浏览器未能保存演示数据。请先导出当前演示；恢复存储后可重试。');}}
  async save(state:State){const before=this.state;this.state=structuredClone(state);try{this.write();}catch(e){this.state=before;throw e;}}
  async read(){return this.markdown;}
  async process(fn:(md:string)=>string){if(this.failNext){this.failNext=false;throw new Error('模拟写入失败：队列已保留，请再次收录或分发。');}const next=fn(this.markdown),before=this.markdown;this.markdown=next;try{this.write();}catch(e){this.markdown=before;throw e;}return next;}
  snapshot():Snapshot{return {format:'note-trajectory-demo',schemaVersion:1,state:structuredClone(this.state),board:this.markdown,now:this.now};}
}
