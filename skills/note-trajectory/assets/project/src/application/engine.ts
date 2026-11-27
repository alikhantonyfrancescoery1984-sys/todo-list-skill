import {observeNote} from '../core/observations';
import { DEFAULT_CONFIG, fingerprint, id, type State, type Task, type Config, type Result, type Operation } from '../core/model';
import { extractTasks, classify } from '../core/tasks';
import { addCard, changeCard, parseBoard } from '../core/board';
import { localDate, dueBatch, coveredBatches } from '../core/scheduler';
import type { BoardPort, Clock, StateStore } from '../ports';

export class Engine {
  private tail:Promise<unknown>=Promise.resolve();
  constructor(public state:State,public readonly board:BoardPort,public readonly store:StateStore,public readonly clock:Clock,public readonly config:Config=DEFAULT_CONFIG){}
  private serial<T>(work:()=>Promise<T>):Promise<T>{const next=this.tail.then(work);this.tail=next.catch(()=>undefined);return next;}
  tasks(noteId:string):Task[]{const note=this.state.notes.find(n=>n.id===noteId);if(!note)throw new Error('笔记不存在。');const tasks=extractTasks(note,this.state.taskRegistry);for(const task of tasks){const i=this.state.taskRegistry.findIndex(t=>t.id===task.id);if(i<0)this.state.taskRegistry.push(task);else this.state.taskRegistry[i]=task;}return tasks;}
  async persist():Promise<void>{await this.store.save(this.state);}
  private receipt(op:Operation):void{if(!this.state.receipts.some(r=>r.id===op.id))this.state.receipts.push({id:op.id,noteId:op.noteId,taskIds:[...op.taskIds],at:op.at});op.status='success';delete op.error;}
  async recover():Promise<void>{
    const cards=parseBoard(await this.board.read()).cards;let changed=false;
    for(const op of this.state.operations){if(op.status!=='success'&&cards.some(c=>c.id===`nt-inbox-${op.id}`)){this.receipt(op);changed=true;}}
    // Completion facts can be recovered from dated managed cards after a state-save interruption.
    for(const c of cards){const task=this.state.taskRegistry.find(t=>`nt-${t.id}`===c.id);const date=c.text.match(/#完成\/(\d{4}-\d{2}-\d{2})/)?.[1];
      if(task&&c.done&&date&&!this.state.completions.some(e=>e.taskId===task.id&&localDate(e.at)===date)){this.state.completions.push({taskId:task.id,noteId:task.noteId,at:date,precision:'day'});changed=true;}}
    if(changed)await this.persist();
  }
  collect(noteId:string):Promise<Result>{return this.serial(async()=>{
    const note=this.state.notes.find(n=>n.id===noteId);if(!note)throw new Error('笔记不存在。');
    if(this.config.ignore.some(p=>note.path.startsWith(p)))throw new Error('此目录默认忽略；请在后续配置中明确授权单项收录。');
    const all=this.tasks(noteId).filter(t=>!t.done);if(all.length>this.config.checklistLimit)throw new Error(`这是一份含 ${all.length} 条任务的清单，已跳过自动收录。`);
    const recorded=new Set(this.state.receipts.flatMap(r=>r.taskIds));const cards=parseBoard(await this.board.read()).cards;
    const fresh=all.filter(t=>!t.ambiguous&&!recorded.has(t.id)&&!cards.some(c=>c.id===`nt-${t.id}`));
    if(!fresh.length)return {added:0,skipped:all.length,message:all.some(t=>t.ambiguous)?'任务身份有歧义，请确认重复文字或改写内容。':'已收录，没有新增任务。'};
    const chosen=fresh.slice(0,this.config.cap),key=`collect-${fingerprint(noteId+'|'+chosen.map(t=>t.id).sort().join('|'))}`;
    let op=this.state.operations.find(o=>o.id===key);if(!op){op={id:key,noteId,taskIds:chosen.map(t=>t.id),at:this.clock.now().toISOString(),status:'pending'};this.state.operations.push(op);}else{op.status='pending';delete op.error;}
    await this.persist();
    try{await this.board.process(md=>addCard(md,this.config.inbox,`nt-inbox-${key}`,`${note.path.replace(/\.md$/,'')} [[${note.path.replace(/\.md$/,'')}]] #待办`));this.receipt(op);await this.persist();}
    catch(error){op.status='failed';op.error=error instanceof Error?error.message:'写入失败';try{await this.persist();}catch{/* durable pending record remains available for recovery */}throw error;}
    return {added:chosen.length,skipped:all.length-chosen.length,message:`已收录 ${chosen.length} 条待办${all.length>chosen.length?`，还有 ${all.length-chosen.length} 条未处理`:''}。`};
  });}
  private async dispatch():Promise<Result>{
    let added=0,skipped=0;const issues:string[]=[];
    for(const receipt of this.state.receipts){for(const taskId of receipt.taskIds){
      const task=this.state.taskRegistry.find(t=>t.id===taskId),note=this.state.notes.find(n=>n.id===receipt.noteId);
      if(!task||!note){skipped++;issues.push('来源缺失');continue;}
      try{const snapshot=await this.board.read(),b=parseBoard(snapshot);if(b.cards.some(c=>c.id===`nt-${taskId}`))continue;
        const current=this.tasks(note.id).find(t=>t.id===taskId);if(!current||current.done||current.ambiguous){skipped++;issues.push('源任务已变化');continue;}
        const column=classify(note.path,b.columns,this.config);
        let inserted=false;await this.board.process(md=>{if(parseBoard(md).cards.some(c=>c.id===`nt-${taskId}`))return md;const next=addCard(md,column,`nt-${taskId}`,`${current.text} [[${note.path.replace(/\.md$/,'')}]] #待办`);inserted=next!==md;return next;});if(inserted)added++;
      }catch(error){skipped++;issues.push(error instanceof Error?error.message:'分发失败');}
    }}
    // Never delete an unchecked inbox record. Only explicit completed managed cards move.
    const board=parseBoard(await this.board.read());for(const card of board.cards){if(!card.id.startsWith('nt-task-')||!card.done||card.column===this.config.completed||this.config.protectedColumns.includes(card.column))continue;
      try{await this.board.process(md=>changeCard(md,card.id,{column:this.config.completed,done:true,date:localDate(this.clock.now())}));}catch(error){skipped++;issues.push(String(error));}}
    await this.persist();return {added,skipped,message:`分发新增 ${added} 条${skipped?`，${skipped} 条需处理：${[...new Set(issues)].join('；')}`:'，其它记录保持不变'}。`};
  }
  distribute():Promise<Result>{return this.serial(()=>this.dispatch());}
  complete(taskId:string,done:boolean):Promise<void>{return this.serial(async()=>{
    const task=this.state.taskRegistry.find(t=>t.id===taskId);if(!task)throw new Error('任务不存在。');
    const card=parseBoard(await this.board.read()).cards.find(c=>c.id===`nt-${taskId}`);if(!card)throw new Error('请先将此任务分发到模块列，完成操作不会修改源笔记。');
    const column=done?(this.config.protectedColumns.includes(card.column)?card.column:this.config.completed):classify(this.state.notes.find(n=>n.id===task.noteId)!.path,parseBoard(await this.board.read()).columns,this.config);
    await this.board.process(md=>changeCard(md,card.id,{done,column,date:done?localDate(this.clock.now()):undefined}));
    if(done&&!this.state.completions.some(c=>c.taskId===taskId&&localDate(c.at)===localDate(this.clock.now())))this.state.completions.push({taskId,noteId:task.noteId,at:this.clock.now().toISOString()});
    await this.persist();
  });}
  tick():Promise<Result>{return this.serial(async()=>{const batch=dueBatch(this.clock.now(),this.state.successfulRuns);if(!batch)return {added:0,skipped:0,message:'当前没有到期批次。'};
    const result=await this.dispatch();if(!result.skipped){this.state.successfulRuns=[...new Set([...this.state.successfulRuns,...coveredBatches(this.clock.now())])];await this.persist();}return {...result,message:`${batch} · ${result.message}`};
  });}
  edit(noteId:string,text:string):Promise<void>{return this.serial(async()=>{const note=this.state.notes.find(n=>n.id===noteId);if(!note)throw new Error('笔记不存在。');note.text=text;note.version++;this.tasks(noteId);observeNote(this.state,noteId,localDate(this.clock.now()));await this.persist();});}
}
