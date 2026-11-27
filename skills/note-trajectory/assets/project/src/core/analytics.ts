import type {State,Config} from './model';import {DEFAULT_CONFIG} from './model';
import {moduleCatalog,moduleForTask,type ManualModule} from './modules';
export {moduleForPath} from './modules';import type {PlannedTask} from './planning';import {localDate} from './scheduler';
export interface AnalyticsContext {tasks?:readonly PlannedTask[];manualModules?:readonly ManualModule[];hiddenModules?:readonly string[];sourceModuleNames?:Readonly<Record<string,string>>}
export interface DailyStats {date:string;total:number;pending:number;completed:number;collected:number;notes:number;modules:{id:string;name:string;kind:'source'|'manual';hidden:boolean;completed:number;pending:number}[]}
export function dailyStats(state:State,date:string,config:Config=DEFAULT_CONFIG,context:AnalyticsContext={}):DailyStats{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))throw new Error('日期格式不正确。');
 const completed=state.completions.filter(e=>localDate(e.at)===date),receipts=state.receipts.filter(r=>localDate(r.at)===date),tasks:readonly PlannedTask[]=context.tasks??state.taskRegistry,visible=tasks.filter(t=>!t.deletedAt),catalog=moduleCatalog(state,context.manualModules,context.hiddenModules,config,context.sourceModuleNames),byId=new Map(tasks.map(t=>[t.id,t]));
 const modules=new Map<string,DailyStats['modules'][number]>();
 const group=(noteId:string,task?:PlannedTask)=>{const ref=moduleForTask(task,noteId,state,catalog,context.manualModules,config);if(!modules.has(ref.id))modules.set(ref.id,{...ref,completed:0,pending:0});return modules.get(ref.id)!};
 for(const taskId of new Set(completed.map(e=>e.taskId))){const e=completed.find(e=>e.taskId===taskId)!;group(e.noteId,byId.get(taskId)).completed++}
 for(const task of visible){const g=group(task.noteId,task);if(!task.done)g.pending++}
 for(const ref of catalog.filter(m=>m.kind==='manual'))if(!modules.has(ref.id))modules.set(ref.id,{...ref,completed:0,pending:0});
 return {date,total:visible.length,pending:visible.filter(t=>!t.done).length,completed:new Set(completed.map(e=>e.taskId)).size,collected:new Set(receipts.flatMap(r=>r.taskIds)).size,notes:new Set(state.observations.filter(o=>o.date===date).map(o=>o.noteId)).size,modules:[...modules.values()].sort((a,b)=>b.completed-a.completed)};
}
export function recentDays(date:string,count=7):string[]{const last=new Date(`${date}T12:00:00+08:00`);return Array.from({length:count},(_,i)=>localDate(new Date(last.getTime()-(count-1-i)*86400000)))}
