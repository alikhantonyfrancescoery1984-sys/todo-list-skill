import test from 'node:test';import assert from 'node:assert/strict';
import {WorkspaceController,validateWorkspace,type WorkspaceData} from '../src/application/workspace';
import {SimulatedClock} from '../src/adapters/browser/memory';
import {dailyStats,moduleForPath} from '../src/core/analytics';
import {renderModuleDistribution,renderStatistics} from '../src/ui/statistics/view';
import {taskLabel} from '../src/ui/workspace/editor';
const at='2026-11-21T10:00:00+08:00';
function setup(raw:unknown=null){
 let text='- [ ] Source first ^source-one\n- [ ] Source second ^source-two',saved:WorkspaceData|undefined,fail=false;
 const clock=new SimulatedClock(new Date(at)),file={path:'AI learning/one.md',extension:'md',stat:{size:100}},c=new WorkspaceController({async read(){return {text,indexed:true};}},clock,{async save(d){if(fail)throw new Error('disk full');saved=structuredClone(d);}},async()=>true,raw);
 return {c,file,clock,get saved(){return saved},setText(t:string){text=t;c.indexed(file,t);},fail(v:boolean){fail=v}};
}
test('manual task creation, rename, completion, removal, undo and restart preserve IDs and history',async()=>{
 const x=setup();const id=await x.c.createTask('  Manual first  ');assert.equal(x.c.pending.length,1);assert.equal(x.c.tasks[0]?.text,'Manual first');assert.equal(x.c.tasks[0]?.origin,'manual');
 await x.c.renameTask(id,'Renamed');assert.equal(x.c.tasks[0]?.id,id);assert.equal(taskLabel(x.c.tasks[0]!), 'Renamed');
 await x.c.complete(id,true);await x.c.removeTask(id);assert.equal(x.c.tasks.length,0);assert.equal(x.c.data.tasks.length,1);assert.equal(x.c.state.completions.length,1);assert.equal(x.c.state.receipts[0]?.taskIds[0],id);
 const y=setup(x.c.snapshot());assert.equal(y.c.tasks.length,0);await y.c.restoreTask(id);assert(y.c.tasks[0]?.done);assert.equal(taskLabel(y.c.tasks[0]!),'Renamed');assert.equal(dailyStats(y.c.state,'2026-11-21').modules[0]?.name,'手动待办');
 assert.deepEqual(validateWorkspace(y.c.snapshot()).tasks,y.c.data.tasks);assert(y.c.snapshot().state.notes.every(n=>!n.text));
});
test('source labels survive source revisions and source text stays separate from the local rename',async()=>{
 const x=setup();await x.c.open(x.file);const id=x.c.tasks[0]!.id;await x.c.renameTask(id,'Local label');
 x.setText('- [ ] Source updated ^source-one\n- [ ] Source second ^source-two');await x.c.collect(x.c.tasks[0]!.noteId);
 const task=x.c.tasks.find(t=>t.id===id)!;assert.equal(task.text,'Source updated');assert.equal(taskLabel(task),'Local label');assert.equal(task.line,0);
 const y=setup(x.saved);await y.c.open(y.file);assert.equal(taskLabel(y.c.tasks.find(t=>t.id===id)!), 'Local label');
});
test('deleting an imported task cannot resurrect it on metadata refresh, later edits or restart',async()=>{
 const x=setup();await x.c.open(x.file);const t=x.c.tasks[0]!;await x.c.removeTask(t.id);
 for(const text of ['- [ ] Source first ^source-one\n- [ ] Source second ^source-two','- [ ] Source changed ^source-one\n- [ ] Source second ^source-two']){x.setText(text);await x.c.collect(t.noteId);assert.equal(x.c.tasks.length,1);}
 const y=setup(x.c.snapshot());await y.c.open(y.file);assert.equal(y.c.tasks.length,1);assert(!y.c.tasks.some(a=>a.id===t.id));assert.equal(y.c.data.tasks.length,2);await y.c.restoreTask(t.id);assert.equal(y.c.tasks.length,2);
});
test('manual create retries after persistence failure cannot create duplicates and CRUD rejects empty labels',async()=>{
 const x=setup();await assert.rejects(x.c.createTask('   '));assert.equal(x.c.tasks.length,0);
 x.fail(true);await assert.rejects(x.c.createTask('Draft','stable-draft'));assert.equal(x.c.tasks.length,1);
 x.fail(false);await x.c.createTask('Draft edited','stable-draft');assert.equal(x.c.tasks.length,1);assert.equal(x.c.state.receipts.length,1);assert.equal(x.saved?.tasks[0]?.text,'Draft edited');
 await assert.rejects(x.c.renameTask('stable-draft',''));assert.equal(x.c.tasks[0]?.text,'Draft edited');
 x.fail(true);await assert.rejects(x.c.removeTask('stable-draft'));assert.equal(x.c.tasks.length,0);x.fail(false);await x.c.removeTask('stable-draft');assert.equal(x.saved?.tasks[0]?.id,'stable-draft');assert(x.saved?.tasks[0]?.deletedAt);
});
test('v3 upgrade preserves existing data and validates edit/delete metadata',async()=>{
 const x=setup();await x.c.open(x.file);const raw=x.c.snapshot(),old={...raw,schemaVersion:3};old.state={...old.state,schemaVersion:2} as unknown as typeof old.state;const upgraded=validateWorkspace(old);assert.equal(upgraded.schemaVersion,7);assert.deepEqual(upgraded.tasks,raw.tasks);
 const bad=structuredClone(raw);bad.tasks[0]!.deletedAt='invalid';assert.throws(()=>validateWorkspace(bad));
 const badLabel=structuredClone(raw);badLabel.tasks[0]!.label='';assert.throws(()=>validateWorkspace(badLabel));
});
test('module completion totals match unique history and actual directory mapping',()=>{
 const x=setup(),s=x.c.state;s.notes=[{id:'ai',path:'AI learning/a.md',text:'',version:1},{id:'en',path:'English/b.md',text:'',version:1}];s.completions=[{taskId:'one',noteId:'ai',at},{taskId:'two',noteId:'en',at},{taskId:'two',noteId:'en',at}];const stats=dailyStats(s,'2026-11-21');assert.equal(stats.completed,2);assert.deepEqual(Object.fromEntries(stats.modules.map(m=>[m.name,m.completed])),{AI:1,english:1});const html=renderModuleDistribution(s,'2026-11-21');assert.equal((html.match(/width:50%/g)||[]).length,2);s.notes[0]!.path='English/moved.md';assert.equal(dailyStats(s,'2026-11-21').modules[0]!.completed,2);assert(!renderStatistics(s,'2026-11-21',{title:n=>n,time:a=>a}).includes('模块分布'));assert.equal(moduleForPath('lessons/research/a.md'),'research');
});
