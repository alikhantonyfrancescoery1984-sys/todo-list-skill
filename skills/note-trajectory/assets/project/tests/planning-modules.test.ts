import test from 'node:test';import assert from 'node:assert/strict';
import {WorkspaceController,validateWorkspace} from '../src/application/workspace';
import {SimulatedClock} from '../src/adapters/browser/memory';
import {parseDeadline,localDeadline,reminderAt,deadlineState,orderByDeadline,parseTags,deadlineHint,validReminder} from '../src/core/planning';
import {dailyStats,recentDays} from '../src/core/analytics';import {renderTasks} from '../src/ui/workspace/tasks';
const now='2026-11-21T10:00:00+08:00',due='2026-11-22T10:00:00+08:00';
function setup(raw:unknown=null){let text=Array.from({length:7},(_,i)=>`- [ ] Source ${i} ^source-${i}`).join('\n'),fail=false;const clock=new SimulatedClock(new Date(now)),c=new WorkspaceController({async read(){return {text,indexed:true}}},clock,{async save(){if(fail)throw new Error('disk full')}},async()=>true,raw);return {c,clock,file:{path:'AI learning/test.md',extension:'md',stat:{size:200}},set(t:string){text=t},fail(v:boolean){fail=v}};}
test('deadlines parse Shanghai independent of host timezone and reject impossible dates',()=>{
 assert.equal(parseDeadline('2026-11-22T10:00'),'2026-11-22T02:00:00.000Z');assert.equal(localDeadline(due),'2026-11-22T10:00');assert.equal(parseDeadline(''),undefined);
 for(const value of ['2026-02-30T10:00','2026-11-22T24:00','2026-11-22','2026-13-01T10:00'])assert.throws(()=>parseDeadline(value));
 assert(validReminder({value:0,unit:'days'}));assert(validReminder({value:.5,unit:'hours'}));for(const v of [-1,Infinity,NaN,1000001])assert(!validReminder({value:v,unit:'days'}));assert(!validReminder({value:1,unit:'minutes'}));
});
test('reminders use exact day/hour thresholds and completion clears warning',()=>{
 const task={dueAt:due,done:false,reminder:{value:1,unit:'days' as const}},threshold=Date.parse(now);
 assert.equal(reminderAt(task),threshold);assert.equal(deadlineState(task,threshold-1),'scheduled');assert.equal(deadlineState(task,threshold),'warning');assert.equal(deadlineState(task,Date.parse(due)),'overdue');assert.equal(deadlineState({...task,done:true},Date.parse(due)+1),'done');
 assert.equal(reminderAt({...task,reminder:{value:24,unit:'hours'}}),threshold);assert.equal(deadlineState({dueAt:due,done:false},threshold),'scheduled');assert.equal(deadlineState({done:false},threshold),'none');
 assert(deadlineHint({...task,id:'t',noteId:'n',text:'x',line:0,ambiguous:false}).includes('截止时间：2026-11-22 10:00（上海时间）\n提醒时间：2026-11-21 10:00'));
});
test('tag parsing deduplicates normalized Unicode names and preview does not create modules',async()=>{
 assert.deepEqual(parseTags('写报告 #AI #ai #用户研究 #user_test #user-test'),{body:'写报告',tags:['AI','用户研究','user_test']});
 const {c}=setup();const before=c.snapshot();assert.equal(c.previewTags('报告 #AI')[0]?.module?.kind,'source');assert.equal(c.previewTags('报告 #用户研究')[0]?.module,undefined);assert.deepEqual(c.snapshot(),before);
 const id=await c.createTask('报告 #ai #用户研究');const t=c.tasks.find(t=>t.id===id)!;assert.equal(t.moduleIds?.length,2);assert.equal(t.moduleIds?.[0],'source:ai');assert.equal(c.taskModule(t).name,'AI');assert.equal(c.data.manualModules.length,1);
 await c.complete(id,true);const s=dailyStats(c.state,'2026-11-21',undefined,c.analyticsContext);assert.equal(s.modules.reduce((n,m)=>n+m.completed,0),1);assert.equal(s.modules.find(m=>m.name==='AI')?.completed,1);
 const raw=c.snapshot();for(const name of ['x #___','#OnlyTag'])await assert.rejects(c.createTask(name));assert.deepEqual(c.snapshot(),raw);
});
test('manual and source module rename persist, while collisions remain invalid',async()=>{
 const {c}=setup();const id=await c.createTask('报告 #市场研究');const module=c.taskModule(c.tasks.find(t=>t.id===id)!);
 await c.renameModule(module.id,'用户研究');assert.equal(c.taskModule(c.tasks[0]!).name,'用户研究');const second=await c.createTask('第二份 #市场研究');assert.equal(c.tasks.find(t=>t.id===second)?.moduleIds?.[0],module.id);
 await c.renameModule('source:ai','学习资料');assert.equal(c.modules.find(m=>m.id==='source:ai')?.name,'学习资料');await assert.rejects(c.renameModule(module.id,'学习资料'));await assert.rejects(c.renameModule(module.id,'___'));
 const saved=validateWorkspace(c.snapshot());assert.equal(saved.manualModules[0]?.name,'用户研究');assert.equal(saved.sourceModuleNames['source:ai'],'学习资料');
});
test('module deletion moves every member task to inbox and preserves source tasks and historical events',async()=>{
 const {c,file}=setup();await c.open(file);const sourceIds=c.tasks.map(t=>t.id);const a=await c.createTask('主模块 #AI'),b=await c.createTask('次模块 #研究 #AI'),other=await c.createTask('保留 #研究');await c.complete(b,true);
 const receipts=structuredClone(c.state.receipts),completions=structuredClone(c.state.completions);assert.equal(c.moduleTaskCount('source:ai'),sourceIds.length+2);await c.removeModule('source:ai');
 assert(sourceIds.every(id=>c.tasks.some(t=>t.id===id)));assert([a,b,other].every(id=>c.tasks.some(t=>t.id===id)));assert.equal(c.taskModule(c.tasks.find(t=>t.id===a)!).id,'manual-inbox');assert.deepEqual(c.state.receipts,receipts);assert.deepEqual(c.state.completions,completions);assert(c.modules.find(m=>m.id==='source:ai')?.hidden);
 await c.showModule('source:ai');assert(!c.modules.find(m=>m.id==='source:ai')?.hidden);const research=c.modules.find(m=>m.name==='研究')!;await c.removeModule(research.id);assert.equal(c.taskModule(c.tasks.find(t=>t.id===other)!).id,'manual-inbox');await c.removeModule(research.id);assert.doesNotThrow(()=>validateWorkspace(c.snapshot()));
});
test('module delete failure can retry, and saving task after invalid tags is atomic',async()=>{
 const x=setup(),id=await x.c.createTask('报告 #专题'),module=x.c.taskModule(x.c.tasks[0]!);const before=x.c.snapshot();await assert.rejects(x.c.updateTask(id,'changed #___'));assert.deepEqual(x.c.snapshot(),before);
 x.fail(true);await assert.rejects(x.c.removeModule(module.id));x.fail(false);await x.c.removeModule(module.id);assert.equal(x.c.tasks.length,1);assert.equal(x.c.taskModule(x.c.tasks[0]!).id,'manual-inbox');assert.doesNotThrow(()=>validateWorkspace(x.c.snapshot()));
});
test('DDL editing, failed create retry, synchronization and restart retain metadata',async()=>{
 const x=setup();x.fail(true);await assert.rejects(x.c.createTask('Draft #专题','stable',{dueAt:due,reminder:{value:2,unit:'hours'}}));x.fail(false);await x.c.createTask('Draft #专题','stable',{dueAt:due,reminder:{value:1,unit:'days'}});assert.equal(x.c.tasks.length,1);assert.equal(x.c.state.receipts.length,1);
 await x.c.open(x.file);const source=x.c.tasks.find(t=>t.origin!=='manual')!;await x.c.updateTask(source.id,'Local name',{dueAt:due,reminder:{value:.5,unit:'days'}});x.set('- [ ] Changed source ^source-0');x.c.indexed(x.file,'- [ ] Changed source ^source-0');await x.c.collect(source.noteId);assert.equal(source.label,'Local name');assert.equal(source.dueAt,due);
 const y=setup(x.c.snapshot());assert.equal(y.c.tasks.find(t=>t.id===source.id)?.reminder?.value,.5);await y.c.updateTask(source.id,'Another');assert.equal(y.c.tasks.find(t=>t.id===source.id)?.dueAt,due);await y.c.updateTask(source.id,'Another',{dueAt:null});assert.equal(y.c.tasks.find(t=>t.id===source.id)?.reminder,undefined);
 const before=y.c.snapshot();await assert.rejects(y.c.createTask('Bad','invalid',{reminder:{value:1,unit:'hours'}}));await assert.rejects(y.c.updateTask('stable','Bad',{dueAt:'2026-11-22'}));await assert.rejects(y.c.updateTask('stable','Bad',{dueAt:''}));assert.deepEqual(y.c.snapshot(),before);
});
test('global deadline order escapes large source groups without duplicates and keeps undated stable',async()=>{
 const {c,file}=setup();await c.open(file);const source=c.tasks[3]!;await c.updateTask(source.id,'urgent source',{dueAt:due});const earlier=await c.createTask('earlier','early',{dueAt:now}),later=await c.createTask('later','late',{dueAt:'2026-11-24T00:00:00Z'});await c.createTask('undated');
 const html=renderTasks(c,'pending',()=> '#'),ids=[...html.matchAll(/data-task-item="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(ids.slice(0,3),[earlier,source.id,later]);assert.equal(new Set(ids).size,c.tasks.length);assert.equal(ids.length,c.tasks.length);assert(!html.slice(0,html.indexOf('data-task-item="'+source.id+'"')).includes('task-file-group'));
 assert.deepEqual(orderByDeadline(c.tasks.filter(t=>!t.dueAt)).map(t=>t.id),c.tasks.filter(t=>!t.dueAt).map(t=>t.id));await c.complete(earlier,true);assert(!renderTasks(c,'done',()=> '#').includes('task-item done deadline-warning'));
});
test('inventory is current cumulative while dated additions and completions preserve deleted history',async()=>{
 const {c,clock}=setup();const a=await c.createTask('yesterday');clock.advance(24*60);const b=await c.createTask('today');await c.complete(a,true);await c.removeTask(b);
 c.state.receipts.push({...c.state.receipts[1]!,id:'duplicate'});c.state.completions.push({...c.state.completions[0]!});const stats=dailyStats(c.state,'2026-11-22',undefined,c.analyticsContext);
 assert.equal(stats.total,1);assert.equal(stats.pending,0);assert.equal(stats.collected,1);assert.equal(stats.completed,1);assert.equal(dailyStats(c.state,'2026-11-21',undefined,c.analyticsContext).collected,1);assert.equal(setup(c.snapshot()).c.tasks.length,1);
});
test('seven local days count unique completions using explicit ledger context',async()=>{
 const {c,file}=setup();await c.open(file);const noteId=c.state.notes[0]!.id;c.state.completions=[{taskId:c.tasks[0]!.id,noteId,at:'2026-11-20T23:59:59+08:00'},{taskId:c.tasks[1]!.id,noteId,at:'2026-11-21T00:00:00+08:00'}];const days=recentDays('2026-11-21');assert.deepEqual(days.map(d=>dailyStats(c.state,d,undefined,c.analyticsContext).completed),[0,0,0,0,0,1,1]);const snapshot=c.snapshot();assert.equal(snapshot.state.taskRegistry.length,0);assert.equal(dailyStats(snapshot.state,'2026-11-21',undefined,{tasks:snapshot.tasks}).total,7);
});
test('schema v4 upgrades losslessly and malformed modules, references or reminders reject',async()=>{
 const {c}=setup();await c.createTask('Legacy');const raw=c.snapshot(),old={...raw,schemaVersion:4};delete (old as Partial<typeof old>).manualModules;delete (old as Partial<typeof old>).hiddenModules;assert.throws(()=>validateWorkspace({...raw,schemaVersion:'5'}));old.state={...old.state,schemaVersion:2} as unknown as typeof old.state;const migrated=validateWorkspace(old);assert.equal(migrated.schemaVersion,7);assert.deepEqual(migrated.tasks,raw.tasks);assert.equal(migrated.manualModules[0]?.id,'manual-inbox');
 for(const change of [(d:typeof raw)=>{d.tasks[0]!.moduleIds=['unknown']},(d:typeof raw)=>{d.tasks[0]!.reminder={value:1,unit:'hours'}},(d:typeof raw)=>{d.manualModules[0]!.name='AI'},(d:typeof raw)=>{d.manualModules[0]!.aliases=['___']}]){const bad=structuredClone(raw);change(bad);assert.throws(()=>validateWorkspace(bad));}
});

test('default inbox tag and untagged manual tasks share one module; invalid fresh draft makes no changes',async()=>{
 const {c}=setup();const before=c.snapshot();await assert.rejects(c.createTask('body #___'));assert.deepEqual(c.snapshot(),before);await c.createTask('tagged #手动待办');await c.createTask('plain');assert.equal(c.data.manualModules.length,1);assert(c.tasks.every(t=>t.moduleIds?.[0]==='manual-inbox'));assert.doesNotThrow(()=>validateWorkspace(c.snapshot()));
});
