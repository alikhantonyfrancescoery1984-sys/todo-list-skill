import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkspaceController,validateWorkspace,type WorkspaceData,type SourceFile} from '../src/application/workspace';
import {SimulatedClock} from '../src/adapters/browser/memory';
const file=(path='notes/test.md'):SourceFile=>({path,extension:'md',stat:{size:100}});
const body=(count:number)=>'# Private source body must never persist\n'+Array.from({length:count},(_,i)=>`- [ ] task ${i} ^t-${i}`).join('\n');
function setup(text=body(2),ask:()=>Promise<boolean>=async()=>true,raw:unknown=null){
  let saved:WorkspaceData|null=null,content=text;
  const clock=new SimulatedClock(new Date('2026-11-20T09:00:00+08:00'));
  const c=new WorkspaceController({async read(){return {text:content,indexed:true};}},clock,{async save(data){saved=structuredClone(data);}},ask,raw);
  return {c,clock,get saved(){return saved;},set text(value:string){content=value;}};
}
test('five tasks import automatically; six wait for one confirmation and then import all',async()=>{
  let questions=0,answer!:(allow:boolean)=>void;
  const small=setup(body(5),async()=>{questions++;return true;});await small.c.open(file());assert.equal(small.c.tasks.length,5);assert.equal(questions,0);
  const x=setup(body(6),()=>{questions++;return new Promise(r=>answer=r);}),f=file();
  const opening=x.c.open(f);await new Promise(r=>setTimeout(r,0));assert.equal(questions,1);assert.equal(x.c.tasks.length,0);
  x.c.indexed(f,body(6));assert.equal(questions,1);answer(true);await opening;await x.c.ready();
  assert.equal(x.c.tasks.length,6);await x.c.open(f);assert.equal(x.c.tasks.length,6);assert.equal(x.c.state.receipts.flatMap(r=>r.taskIds).length,6);
});
test('decline persists without storing task text; manual retry can allow the file',async()=>{
  let questions=0,allow=false;const x=setup(body(7),async()=>{questions++;return allow;}),f=file();
  await x.c.open(f);await x.c.ready();assert.equal(x.c.tasks.length,0);
  assert(!JSON.stringify(x.saved).includes('task 0'));assert(!JSON.stringify(x.saved).includes('Private source body'));
  await x.c.open(f);assert.equal(questions,1);allow=true;await x.c.collect(x.c.state.notes[0]!.id,true);assert.equal(questions,2);assert.equal(x.c.tasks.length,7);
});
test('restart retains pending/completed tasks and identities; source checkboxes do not resurrect completed work',async()=>{
  const x=setup(),f=file();await x.c.open(f);const task=x.c.tasks[0]!,noteId=task.noteId;await x.c.complete(task.id,true);await x.c.dispose();
  assert.equal(x.saved!.tasks.length,2);assert(!JSON.stringify(x.saved).includes('Private source body'));
  const y=setup(body(2),async()=>true,x.saved);assert.equal(y.c.pending.length,1);await y.c.open(file());
  assert.equal(y.c.tasks.length,2);assert.equal(y.c.tasks[0]!.id,task.id);assert.equal(y.c.tasks[0]!.noteId,noteId);assert(y.c.tasks[0]!.done);
  assert.equal(y.c.state.completions.length,1);await y.c.complete(task.id,true);assert.equal(y.c.state.completions.length,1);
});
test('large file approval survives restart and later additions accumulate without a cap',async()=>{
  let questions=0;const x=setup(body(6),async()=>{questions++;return true;});await x.c.open(file());await x.c.ready();
  const y=setup(body(9),async()=>{questions++;return false;},x.saved);await y.c.open(file());assert.equal(questions,1);assert.equal(y.c.tasks.length,9);
});
test('previously collected large files retain their tasks; new additions still require consent',async()=>{
  const x=setup(body(6));await x.c.open(file());await x.c.ready();const raw=x.c.snapshot();raw.decisions={};
  let questions=0;const y=setup(body(6),async()=>{questions++;return false;},raw),f=file();await y.c.open(f);
  assert.equal(questions,0);assert.equal(y.c.tasks.length,6);
  y.c.indexed(f,body(7));await y.c.collect(y.c.state.notes[0]!.id);assert.equal(questions,1);assert.equal(y.c.tasks.length,6);
});
test('rename preserves identity after restart; deleting source preserves pending tasks and history',async()=>{
  const x=setup(),f=file();await x.c.open(f);await x.c.ready();const original=x.c.tasks.map(t=>t.id),noteId=x.c.tasks[0]!.noteId;
  const y=setup(body(2),async()=>true,x.saved),renamed=file('notes/renamed.md');y.c.renamed(renamed,f.path);await y.c.ready();
  await y.c.open(renamed);assert.deepEqual(y.c.tasks.map(t=>t.id),original);assert.equal(y.c.state.notes.find(n=>n.id===noteId)?.path,renamed.path);
  y.c.deleted(renamed);await y.c.ready();assert.equal(y.c.pending.length,2);assert(y.c.tasks.every(t=>t.sourceUnavailable));assert(y.c.state.observations.length>0);
  const z=setup(body(2),async()=>true,y.saved);assert.equal(z.c.pending.length,2);assert(z.c.tasks.every(t=>t.sourceUnavailable));
});
test('removing a source task cannot erase it; anchored edits update text while retaining local completion',async()=>{
  const x=setup(),f=file();await x.c.open(f);await x.c.complete(x.c.tasks[0]!.id,true);
  x.c.indexed(f,'- [ ] renamed task ^t-0');await x.c.collect(x.c.tasks[0]!.noteId);
  assert.equal(x.c.tasks.length,2);assert.equal(x.c.tasks[0]!.text,'renamed task');assert(x.c.tasks[0]!.done);assert(x.c.tasks[1]!.missingFromSource);
});
test('metadata updates create no activity and stale disk text cannot overwrite editor input',async()=>{
  const x=setup(),f=file();await x.c.open(f);const count=x.c.state.observations.length;
  x.c.indexed(f,body(2));await x.c.collect(x.c.tasks[0]!.noteId);assert.equal(x.c.state.observations.length,count);
  x.c.edit(f,'- [ ] editor ^t-0');x.c.indexed(f,body(2));assert.equal([...x.c.observed.values()][0]!.text,'- [ ] editor ^t-0');
  x.c.indexed(f,'- [ ] editor ^t-0');await x.c.collect(x.c.tasks[0]!.noteId);assert.equal(x.c.tasks[0]!.text,'editor');
});
test('saves are serialized; a failed write stays visible until retry and never empties the ledger',async()=>{
  let concurrent=0,max=0,fail=false,saved:WorkspaceData|null=null;
  const c=new WorkspaceController({async read(){return {text:body(2),indexed:true};}},new SimulatedClock(new Date()),{async save(data){concurrent++;max=Math.max(max,concurrent);await new Promise(r=>setTimeout(r,2));concurrent--;if(fail)throw new Error('disk failure');saved=structuredClone(data);}},async()=>true);
  await c.open(file());await c.ready();fail=true;await assert.rejects(c.complete(c.tasks[0]!.id,true));assert(c.storageError.includes('保存失败'));assert.equal(c.tasks.length,2);
  fail=false;await c.persist();assert.equal(c.storageError,'');assert.equal(saved!.tasks.length,2);assert(saved!.tasks[0]!.done);assert.equal(max,1);
});
test('unload during confirmation cannot import afterwards or clear previously accepted tasks',async()=>{
  let answer!:(allow:boolean)=>void;const x=setup(body(6),()=>new Promise(r=>answer=r));
  const opening=x.c.open(file());await new Promise(r=>setTimeout(r,0));await x.c.dispose();answer(true);await opening;assert.equal(x.c.tasks.length,0);
});
test('unknown or corrupt persistent data is rejected without calling the store',()=>{
  const x=setup();const raw=x.c.snapshot();assert.throws(()=>validateWorkspace({...raw,schemaVersion:99}));
  assert.throws(()=>validateWorkspace({...raw,tasks:[{id:'bad'}]}));
  assert.equal(x.saved,null);
});

test('unanchored task typing and punctuation edits update one stable task and one receipt',async()=>{
  const x=setup('- [ ] UI设计'),f=file();await x.c.open(f);const original=x.c.tasks[0]!.id;
  for(const text of ['UI设计，我应该去找个情绪版','UI设计我应该去找个情绪版','UI设计我应该去找个情绪版！']){
    x.clock.advance(.2);x.c.edit(f,'- [ ] '+text);x.c.indexed(f,'- [ ] '+text);await x.c.collect(x.c.state.notes[0]!.id);
    x.c.indexed(f,'- [ ] '+text);await x.c.collect(x.c.state.notes[0]!.id);
    assert.equal(x.c.tasks.length,1);assert.equal(x.c.tasks[0]!.id,original);assert.equal(x.c.tasks[0]!.text,text);assert(!x.c.tasks[0]!.missingFromSource);
  }
  assert.equal(x.c.state.receipts.flatMap(r=>r.taskIds).length,1);assert.equal(x.c.state.observations.length,1);
});
test('metadata arriving before editor debounce cannot create task versions',async()=>{
  const x=setup('- [ ] First draft'),f=file();await x.c.open(f);const original=x.c.tasks[0]!.id;
  x.c.indexed(f,'- [ ] Final draft');await x.c.collect(x.c.state.notes[0]!.id);
  x.c.edit(f,'- [ ] Final draft');x.c.indexed(f,'- [ ] Final draft');await x.c.collect(x.c.state.notes[0]!.id);
  assert.equal(x.c.tasks.length,1);assert.equal(x.c.tasks[0]!.id,original);assert.equal(x.c.tasks[0]!.text,'Final draft');
});
test('empty task body keeps identity, while deleting the checkbox then creating a task is distinct',async()=>{
  const x=setup('- [ ] Original'),f=file();await x.c.open(f);const original=x.c.tasks[0]!.id,noteId=x.c.tasks[0]!.noteId;
  x.c.indexed(f,'- [ ] ');await x.c.collect(noteId);assert.equal(x.c.tasks.length,1);assert.equal(x.c.tasks[0]!.text,'Original');
  x.c.indexed(f,'- [ ] Rewritten');await x.c.collect(noteId);assert.equal(x.c.tasks.length,1);assert.equal(x.c.tasks[0]!.id,original);assert.equal(x.c.tasks[0]!.text,'Rewritten');
  x.c.indexed(f,'');await x.c.collect(noteId);x.c.indexed(f,'- [ ] Separate task');await x.c.collect(noteId);
  assert.equal(x.c.tasks.length,2);assert.notEqual(x.c.tasks[1]!.id,original);assert(x.c.tasks[0]!.missingFromSource);
});
test('adding a new line does not steal task identity and editing completed text cannot reopen it',async()=>{
  const x=setup('- [ ] Existing'),f=file();await x.c.open(f);const original=x.c.tasks[0]!.id,noteId=x.c.tasks[0]!.noteId;
  x.c.indexed(f,'- [ ] New task\n- [ ] Existing');await x.c.collect(noteId);assert.equal(x.c.tasks.length,2);assert.equal(x.c.tasks.find(t=>t.id===original)!.line,1);
  await x.c.complete(original,true);x.c.indexed(f,'- [ ] New task\n- [ ] Existing edited');await x.c.collect(noteId);
  assert.equal(x.c.tasks.length,2);assert.equal(x.c.tasks.find(t=>t.id===original)!.text,'Existing edited');assert(x.c.tasks.find(t=>t.id===original)!.done);
  await x.c.ready();const y=setup('- [ ] New task\n- [ ] Existing edited',async()=>true,x.saved);await y.c.open(file());assert.equal(y.c.tasks.length,2);assert(y.c.tasks.find(t=>t.id===original)!.done);
});
