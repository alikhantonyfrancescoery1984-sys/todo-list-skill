import {localDeadline,parseDeadline} from '../../core/planning';
import {escapeHtml as esc} from '../html';
export function deadlineParts(at?:string):{date:string;period:'am'|'pm';hour:string;minute:string}{
 if(!at)return {date:'',period:'am',hour:'9',minute:'00'};
 const local=localDeadline(at),hour=Number(local.slice(11,13));return {date:local.slice(0,10),period:hour>=12?'pm':'am',hour:String(hour%12||12),minute:local.slice(14,16)};
}
export function deadlineValue(date:string,period:string,hour:string,minute:string):string{
 if(!date)return '';
 if(!['am','pm'].includes(period)||!/^([1-9]|1[0-2])$/.test(hour)||!/^([0-5][0-9])$/.test(minute))throw new Error('请选择上午或下午，以及完整的时、分。');
 const value=`${date}T${String(Number(hour)%12+(period==='pm'?12:0)).padStart(2,'0')}:${minute}`;parseDeadline(value);return value;
}
export function deadlineInput(at?:string):string{
 const p=deadlineParts(at),options=(values:string[],selected:string)=>values.map(v=>`<option value="${v}" ${v===selected?'selected':''}>${v.padStart(2,'0')}</option>`).join('');
 return `<label for="task-deadline-date">截止日期 · 上海时间</label><input id="task-deadline-date" type="date" value="${esc(p.date)}"><div class="deadline-time-fields"><label for="task-deadline-period">时段<select id="task-deadline-period"><option value="am" ${p.period==='am'?'selected':''}>上午</option><option value="pm" ${p.period==='pm'?'selected':''}>下午</option></select></label><label for="task-deadline-hour">时<select id="task-deadline-hour">${options(Array.from({length:12},(_,i)=>String(i+1)),p.hour)}</select></label><label for="task-deadline-minute">分<select id="task-deadline-minute">${options(Array.from({length:60},(_,i)=>String(i).padStart(2,'0')),p.minute)}</select></label></div>`;
}
