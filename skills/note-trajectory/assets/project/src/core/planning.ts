import type {Task} from './model';
export interface Reminder {value:number;unit:'days'|'hours'}
export interface PlannedTask extends Task {origin?:'manual';label?:string;deletedAt?:string;dueAt?:string;reminder?:Reminder;moduleIds?:string[]}
export interface TaskOptions {dueAt?:string|null;reminder?:Reminder|null}
export const SHANGHAI_ZONE='Asia/Shanghai';
export function localDeadline(at:string):string{return new Intl.DateTimeFormat('sv-SE',{timeZone:SHANGHAI_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at)).replace(' ','T');}
export function parseDeadline(value:string):string|undefined{
 if(!value)return undefined;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error('请选择完整的截止日期和时间。');
 const time=Date.parse(value+':00+08:00');if(!Number.isFinite(time)||localDeadline(new Date(time).toISOString())!==value)throw new Error('截止日期或时间无效。');return new Date(time).toISOString();
}
export function validReminder(v:unknown):v is Reminder {if(!v||typeof v!=='object')return false;const r=v as Reminder;return ['days','hours'].includes(r.unit)&&typeof r.value==='number'&&Number.isFinite(r.value)&&r.value>=0&&r.value<=1_000_000;}
export function reminderAt(task:Pick<PlannedTask,'dueAt'|'reminder'>):number|undefined{if(!task.dueAt)return undefined;return Date.parse(task.dueAt)-(task.reminder?task.reminder.value*(task.reminder.unit==='days'?86400000:3600000):0);}
export function deadlineState(task:Pick<PlannedTask,'dueAt'|'reminder'|'done'>,now:number):'none'|'scheduled'|'warning'|'overdue'|'done'{
 if(task.done)return 'done';if(!task.dueAt)return 'none';if(now>=Date.parse(task.dueAt))return 'overdue';if(task.reminder&&now>=reminderAt(task)!)return 'warning';return 'scheduled';
}
export function orderByDeadline<T extends PlannedTask>(tasks:readonly T[]):T[]{return tasks.map((task,index)=>({task,index})).sort((a,b)=>{const d=(a.task.dueAt?Date.parse(a.task.dueAt):Infinity)-(b.task.dueAt?Date.parse(b.task.dueAt):Infinity);return Number.isNaN(d)||d===0?a.index-b.index:d;}).map(v=>v.task);}
export function parseTags(text:string):{body:string;tags:string[]}{
 const tags:string[]=[];const body=text.replace(/(^|[\s，,；;])#([\p{L}\p{N}_/-]+)/gu,(_match,space:string,name:string)=>{if(!tags.some(t=>tagKey(t)===tagKey(name)))tags.push(name);return space;}).replace(/[ \t]+/g,' ').trim();return {body,tags};
}
export const tagKey=(name:string):string=>name.normalize('NFKC').toLowerCase().replace(/[\s_-]+/g,'');
export function deadlineHint(task:PlannedTask):string{
 const lines:string[]=[];if(task.dueAt){lines.push('截止时间：'+localDeadline(task.dueAt).replace('T',' ')+'（上海时间）');if(task.reminder)lines.push('提醒时间：'+localDeadline(new Date(reminderAt(task)!).toISOString()).replace('T',' ')+' · 提前 '+task.reminder.value+(task.reminder.unit==='days'?' 天':' 小时'));}return lines.join('\n');
}
