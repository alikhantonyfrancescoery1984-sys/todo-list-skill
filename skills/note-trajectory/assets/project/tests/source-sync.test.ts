import test from 'node:test';import assert from 'node:assert/strict';
import {WorkspaceController,type WorkspaceData} from '../src/application/workspace';
import {SimulatedClock} from '../src/adapters/browser/memory';
import {deleteSourceTask} from '../src/core/source-task-delete';
import {extractTasks} from '../src/core/tasks';
const initial='Heading\n- [ ] Source first ^one\n- [ ] Source second ^two\nKeep this paragraph.\n';
function setup(text=initial,raw:unknown=null){
 let source=text,saved:WorkspaceData|undefined,failWrite=false,failSave=false,writes=0;
 const file={path:'AI learning/sync.md',extension:'md',stat:{size:100}},clock=new SimulatedClock(new Date('2026-11-21T10:00:00+08:00'));
 const c=new WorkspaceController({async read(){return {text:source,indexed:true}}},clock,{async save(d){if(failSave)throw new Error('disk full');saved=structuredClone(d)}},async()=>true,raw,async(t)=>{writes++;if(failWrite)throw new Error('source write failed');source=deleteSourceTask(source,t)});
 return {c,file,clock,get source(){return source},get saved(){return saved},get writes(){return writes},async update(s:string){source=s;c.indexed(file,s);await c.collect(c.state.notes.find(n=>n.path===file.path)!.id)},failWrite(v:boolean){failWrite=v},failSave(v:boolean){failSave=v}};
}
test('source checkbox completes the same task once, retaining its local label and deadline across restart',async()=>{
 const x=setup();await x.c.open(x.file);const t=x.c.tasks[0]!,id=t.id;
 await x.c.updateTask(id,'Local name',{dueAt:'2026-11-22T02:00:00Z',reminder:{value:2,unit:'hours'}});
 await x.update(initial.replace('[ ] Source first','[x] Source first'));assert(t.done);assert.equal(x.c.pending.length,1);assert.equal(x.c.state.completions.length,1);assert.equal(x.c.state.receipts.length,1);
 assert.equal(t.label,'Local name');assert.equal(t.dueAt,'2026-11-22T02:00:00Z');assert.deepEqual(t.reminder,{value:2,unit:'hours'});
 const completedAt=t.completedAt;await x.update(x.source.replace('[x]','[X]'));await x.c.open(x.file);assert.equal(x.c.state.completions.length,1);assert.equal(t.completedAt,completedAt);
 const y=setup(x.source,x.saved);await y.c.open(y.file);assert(y.c.tasks.find(t=>t.id===id)!.done);assert.equal(y.c.state.completions.length,1);
 await y.update(y.source.replace('[X]','[ ]'));assert(y.c.tasks.find(t=>t.id===id)!.done);assert.equal(y.c.state.completions.length,1);
});
test('unique text matching accepts source check after line shifts; initially checked and ambiguous tasks are not imported',async()=>{
 const x=setup('- [ ] Unique\n- [x] Already complete\n');await x.c.open(x.file);const id=x.c.tasks[0]!.id;
 await x.update('Added paragraph\n- [X] Unique\n- [x] Already complete\n');assert.equal(x.c.tasks.length,1);assert.equal(x.c.tasks[0]!.id,id);assert(x.c.tasks[0]!.done);
 const y=setup('- [ ] Duplicate\n- [ ] Duplicate\n');await y.c.open(y.file);assert.equal(y.c.tasks.length,0);
});
test('source completion waits for indexed text and ignores a stale editor/index packet',async()=>{
 const x=setup();await x.c.open(x.file);const t=x.c.tasks[0]!,next=initial.replace('[ ] Source first','[x] Source first');
 x.c.edit(x.file,next);x.c.indexed(x.file,initial);await x.c.collect(t.noteId);assert(!t.done);
 await x.update(next);assert(t.done);assert.equal(x.c.state.completions.length,1);
});
test('deleting imported work removes only its source checkbox and persists a tombstone; recheck/restart cannot revive it',async()=>{
 const x=setup();await x.c.open(x.file);const t=x.c.tasks[0]!;await x.c.removeTask(t.id);
 assert.equal(x.source,'Heading\n- [ ] Source second ^two\nKeep this paragraph.\n');assert.equal(x.c.tasks.length,1);assert(t.deletedAt);assert.equal(x.writes,1);
 await x.c.open(x.file);const y=setup(x.source,x.saved);await y.c.open(y.file);assert.equal(y.c.tasks.length,1);assert(!y.c.tasks.some(a=>a.id===t.id));
});
test('source write failure keeps the task and successful deletion can retry a failed ledger save without a second source mutation',async()=>{
 const x=setup();await x.c.open(x.file);const t=x.c.tasks[0]!;x.failWrite(true);await assert.rejects(x.c.removeTask(t.id),/source write failed/);assert(!t.deletedAt);assert.equal(x.source,initial);
 x.failWrite(false);x.failSave(true);await assert.rejects(x.c.removeTask(t.id),/disk full/);assert(t.deletedAt);const source=x.source,writes=x.writes;
 x.failSave(false);await x.c.removeTask(t.id);assert.equal(x.writes,writes);assert.equal(x.source,source);assert(x.saved!.tasks.find(a=>a.id===t.id)!.deletedAt);
});
test('manual deletion does not touch any source, and only explicitly retried legacy tombstones are repaired',async()=>{
 const x=setup();await x.c.open(x.file);const manual=await x.c.createTask('Local');await x.c.removeTask(manual);assert.equal(x.writes,0);assert.equal(x.source,initial);
 const t=x.c.tasks[0]!;t.deletedAt=x.clock.now().toISOString();const y=setup(initial,x.c.snapshot());await y.c.open(y.file);assert.equal(y.source,initial);assert.equal(y.writes,0);await y.c.removeTask(t.id);assert.equal(y.writes,1);assert(!y.source.includes('Source first'));
});
test('source deletion validates uniqueness and preserves CRLF, checked state and surrounding bytes',()=>{
 const task=extractTasks({id:'n',path:'test.md',version:0,text:'- [ ] Unique'})[0]!;
 assert.equal(deleteSourceTask('前文\r\n- [X] Unique\r\n后文\r\n',task),'前文\r\n后文\r\n');
 assert.throws(()=>deleteSourceTask('- [ ] Unique\n- [x] Unique',task),/多个/);assert.equal(deleteSourceTask('- [ ] Changed',task),'- [ ] Changed');
 const block=extractTasks({id:'n',path:'test.md',version:0,text:'- [ ] Old ^stable'})[0]!;
 assert.equal(deleteSourceTask('- [ ] Renamed ^stable\n- [ ] Other',block),'- [ ] Other');
 assert.throws(()=>deleteSourceTask('- [ ] A ^stable\n- [ ] B ^stable',block),/多个/);
 const exclusions='---\n- [ ] Unique\n---\n```\n- [ ] Unique\n```\n%%\n- [ ] Unique\n%%\n';
 assert.equal(deleteSourceTask(exclusions+'- [ ] Unique\nFooter',task),exclusions+'Footer');
});

test('skipping new imports cannot block completion of previously accepted source work',async()=>{
 const x=setup();await x.c.open(x.file);const t=x.c.tasks[0]!;x.c.data.decisions[t.noteId]='skip';
 await x.update(initial.replace('[ ] Source first','[x] Source first')+'- [ ] Newly added');assert(t.done);assert.equal(x.c.tasks.length,2);assert.equal(x.c.state.completions.length,1);
});
