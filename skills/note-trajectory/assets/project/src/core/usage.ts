import { id, type State, type Session } from './model';
import type { Clock } from '../ports';
import {localDate} from './scheduler';
export class UsageRecorder {
  private active:{noteId:string;start:number;last:number}|null=null;
  constructor(private state:State,private clock:Clock,private idleMs=90_000){}
  interact(noteId:string,source:'user'|'external'='user'):void{
    const now=this.clock.now().getTime();if(source==='external')return;
    if(this.active&&now-this.active.last>this.idleMs)this.close('idle');
    if(this.active&&this.active.noteId!==noteId)this.close('switch');
    if(!this.active)this.active={noteId,start:now,last:now};else this.active.last=Math.max(this.active.last,now);
    observeNote(this.state,noteId,localDate(new Date(now)));
  }
  checkIdle():void{if(this.active&&this.clock.now().getTime()-this.active.last>this.idleMs)this.close('idle');}
  close(reason:Session['reason']='pause'):void{
    if(!this.active)return;const a=this.active,now=this.clock.now().getTime();
    const end=reason==='idle'||reason==='interruption'||now-a.last>this.idleMs?a.last:now;
    if(end>a.start)this.state.sessions.push({id:id('session'),noteId:a.noteId,start:new Date(a.start).toISOString(),end:new Date(end).toISOString(),estimated:true,reason});
    this.active=null;
  }
}

/** Statistical footprint only: one observed note per Shanghai date, no event nodes. */
export function observeNote(state:State,noteId:string,date:string):void {
  if(!state.observations.some(o=>o.noteId===noteId&&o.date===date))state.observations.push({noteId,date});
}
