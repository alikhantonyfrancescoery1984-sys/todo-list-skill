export function localDate(at:string|Date):string {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));}
export function localHour(at:Date):number {return Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'}).format(at));}
export function dueBatch(now:Date,successful:string[]):string|null {const hour=localHour(now),date=localDate(now);const eligible=[8,20].filter(h=>h<=hour).map(h=>`${date}@${h}`);return eligible.filter(k=>!successful.includes(k)).at(-1)??null;}
export function coveredBatches(now:Date):string[]{return [8,20].filter(h=>h<=localHour(now)).map(h=>`${localDate(now)}@${h}`);}
