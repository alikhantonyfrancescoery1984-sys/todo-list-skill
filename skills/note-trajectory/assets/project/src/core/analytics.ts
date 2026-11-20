import type { State, Session, Config } from './model';import {DEFAULT_CONFIG} from './model';
import {moduleCatalog,moduleForTask,type ManualModule} from './modules';
export {moduleForPath} from './modules';
import type {PlannedTask} from './planning';
import {localDate} from './scheduler';import {classify} from './tasks';
export interface Interval extends Session {minutes:number}
export interface AnalyticsContext {tasks?:readonly PlannedTask[];manualModules?:readonly ManualModule[];hiddenModules?:readonly string[]}
export interface DailyStats {date:string;total:number;pending:number;completed:number;collected:number;notes:number;activeMinutes:number;intervals:Interval[];modules:{id:string;name:string;kind:'source'|'manual';hidden:boolean;minutes:number;completed:number;pending:number}[];warnings:string[]}
export function dailyStats(state:State,date:string,config:Config=DEFAULT_CONFIG,context:AnalyticsContext={}):DailyStats {
  const start=new Date(`${date}T00:00:00+08:00`).getTime();if(!Number.isFinite(start))throw new Error('日期格式不正确。');const end=start+86400000;
  const warnings:string[]=[],intervals:Interval[]=[];let previousEnd=-Infinity;
  const sorted=[...state.sessions].sort((a,b)=>new Date(a.start).getTime()-new Date(b.start).getTime());
  for(const s of sorted){const from=new Date(s.start).getTime(),to=new Date(s.end).getTime();if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>86400000){warnings.push('已排除无效时间区间');continue;}
    const uniqueStart=Math.max(from,previousEnd);if(uniqueStart>from)warnings.push('已去除重叠时间');previousEnd=Math.max(previousEnd,to);
    const a=Math.max(uniqueStart,start),b=Math.min(to,end);if(b>a)intervals.push({...s,start:new Date(a).toISOString(),end:new Date(b).toISOString(),minutes:(b-a)/60000});
  }
  const completed=state.completions.filter(e=>localDate(e.at)===date),receipts=state.receipts.filter(r=>localDate(r.at)===date);
  const tasks:readonly PlannedTask[]=context.tasks??state.taskRegistry,visible=tasks.filter(t=>!t.deletedAt),catalog=moduleCatalog(state,context.manualModules,context.hiddenModules,config),byId=new Map(tasks.map(t=>[t.id,t]));
  const modules=new Map<string,DailyStats['modules'][number]>();
  function group(noteId:string,task?:PlannedTask){const ref=moduleForTask(task,noteId,state,catalog,context.manualModules,config);if(!modules.has(ref.id))modules.set(ref.id,{...ref,minutes:0,completed:0,pending:0});return modules.get(ref.id)!;}
  for(const s of intervals)group(s.noteId).minutes+=s.minutes;
  for(const taskId of new Set(completed.map(e=>e.taskId))){const e=completed.find(e=>e.taskId===taskId)!;group(e.noteId,byId.get(taskId)).completed++;}
  for(const task of visible){const g=group(task.noteId,task);if(!task.done)g.pending++;}
  for(const ref of catalog.filter(m=>m.kind==='manual'))if(!modules.has(ref.id))modules.set(ref.id,{...ref,minutes:0,completed:0,pending:0});
  const noteIds=new Set([...state.observations.filter(a=>a.date===date).map(a=>a.noteId),...intervals.map(s=>s.noteId)]);
  return {date,total:visible.length,pending:visible.filter(t=>!t.done).length,completed:new Set(completed.map(e=>e.taskId)).size,collected:new Set(receipts.flatMap(r=>r.taskIds)).size,notes:noteIds.size,activeMinutes:intervals.reduce((n,i)=>n+i.minutes,0),intervals,modules:[...modules.values()].sort((a,b)=>b.minutes-a.minutes),warnings:[...new Set(warnings)]};
}
export function recentDays(date:string,count=7):string[]{const last=new Date(`${date}T12:00:00+08:00`);return Array.from({length:count},(_,i)=>localDate(new Date(last.getTime()-(count-1-i)*86400000)));}
export function minutesLabel(minutes:number):string{if(minutes<=0)return '未记录';if(minutes<1)return '<1 分钟';const value=Math.round(minutes);return value>=60?`${Math.floor(value/60)} 小时${value%60?` ${value%60} 分钟`:''}`:`${value} 分钟`;}
