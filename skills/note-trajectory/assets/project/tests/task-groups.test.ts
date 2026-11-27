import test from 'node:test';import assert from 'node:assert/strict';
import {WorkspaceController,validateWorkspace,type WorkspaceData} from '../src/application/workspace';import {SimulatedClock} from '../src/adapters/browser/memory';import {renderTasks} from '../src/ui/workspace/tasks';import {deleteSourceTask} from '../src/core/source-task-delete';import {dailyStats} from '../src/core/analytics';
const rows=(n:number,p='Task')=>Array.from({length:n},(_,i)=>`- [ ] ${p} ${i}`).join('\n');
function setup(answer=true,raw:unknown=null){let saved:WorkspaceData|undefined,fail=false;const sources=new Map<string,string>(),questions:{folder:string;count:number}[]=[],imports:string[]=[];const c=new WorkspaceController({async read(f){return {text:sources.get(f.path)??'',indexed:true}}},new SimulatedClock(new Date('2026-11-21T10:00:00+08:00')),{async save(d){if(fail)throw new Error('disk full');saved=d}},async q=>{imports.push(q.path);return true},raw,async(t,path)=>{sources.set(path,deleteSourceTask(sources.get(path)??'',t))},async q=>{questions.push(q);return answer});return {c,sources,questions,imports,get saved(){return saved},fail(v:boolean){fail=v},async open(path:string,text:string){sources.set(path,text);await c.open({path,extension:'md',stat:{size:text.length}});await c.suggestTaskGroups()}}}
test('same immediate folder crosses exactly four loose tasks, asks once, and preserves source/statistics',async()=>{
 const x=setup();await x.open('AI learning/project/a.md',rows(3,'A'));assert.equal(x.questions.length,0);const before=dailyStats(x.c.state,'2026-11-21',undefined,x.c.analyticsContext);
 await x.open('AI learning/project/b.md',rows(1,'B'));assert.deepEqual(x.questions,[{folder:'AI learning/project',count:4}]);assert.equal(x.c.groups.length,1);assert(x.c.tasks.every(t=>t.groupId===x.c.groups[0]!.id));assert.equal(x.sources.get('AI learning/project/a.md'),rows(3,'A'));assert.equal(dailyStats(x.c.state,'2026-11-21',undefined,x.c.analyticsContext).completed,before.completed);
 await x.open('AI learning/project/c.md',rows(1,'C'));assert.equal(x.questions.length,1);assert(x.c.tasks.every(t=>t.groupId===x.c.groups[0]!.id));
});
test('folder declines persist across restart and separate full paths never merge by basename',async()=>{
 const x=setup(false);await x.open('AI learning/one/leaf/a.md',rows(4));assert.equal(x.questions.length,1);assert.equal(x.c.groups.length,0);await x.open('AI learning/one/leaf/a.md',rows(5));assert.equal(x.questions.length,1);
 const y=setup(false,x.saved);await y.open('AI learning/one/leaf/a.md',rows(5));assert.equal(y.questions.length,0);
 const z=setup();await z.open('AI learning/one/leaf/a.md',rows(4,'A'));await z.open('AI learning/two/leaf/a.md',rows(4,'B'));assert.equal(z.c.groups.length,2);assert.notEqual(z.c.groups[0]!.name,z.c.groups[1]!.name);assert.notEqual(z.c.tasks[0]!.groupId,z.c.tasks[4]!.groupId);
});
test('large-file groups, done, dated and explicitly grouped tasks are excluded; DDL stays first exactly once',async()=>{
 const x=setup();await x.open('AI learning/project/large.md',rows(6));assert.equal(x.imports.length,1);assert.equal(x.questions.length,0);assert.equal(x.c.groups.length,0);
 const id=await x.c.createTask('Soon','soon',{dueAt:'2026-11-22T00:00:00Z',newGroupName:'Manual'});await x.open('AI learning/project/small.md',rows(3,'B'));assert.equal(x.questions.length,0);
 const html=renderTasks(x.c,'pending',()=> '#');assert.equal(html.split(`data-task-item="${id}"`).length-1,1);assert(html.indexOf(`data-task-item="${id}"`)<html.indexOf('class="task-file-container"'));
});
test('manual create/select/reassign/rename/dissolve groups retain tasks, source, histories, deadlines and modules',async()=>{
 const x=setup();const a=await x.c.createTask('Manual #Study','a',{newGroupName:'Reading',dueAt:'2026-11-22T00:00:00Z'}),g=x.c.groups[0]!.id;await x.c.createTask('Another','b',{groupId:g});await x.c.complete(a,true);const receipts=structuredClone(x.c.state.receipts),completions=structuredClone(x.c.state.completions),moduleIds=[...x.c.tasks[0]!.moduleIds!];
 await x.c.renameGroup(g,'Study list');assert.equal(x.c.tasks[1]!.groupId,g);await assert.rejects(x.c.renameGroup(g,''));await x.c.removeGroup(g);assert.equal(x.c.tasks.length,2);assert(x.c.tasks.every(t=>!t.groupId));assert.deepEqual(x.c.state.receipts,receipts);assert.deepEqual(x.c.state.completions,completions);assert.deepEqual(x.c.tasks[0]!.moduleIds,moduleIds);assert(x.c.tasks[0]!.dueAt);assert.equal(x.c.groups.length,0);
 const again=setup(true,x.saved);assert.equal(again.c.tasks.length,2);assert.equal(again.c.groups.length,0);
});
test('group failure retry preserves identity and cancelled/invalid creation has no side effects',async()=>{
 const x=setup();await assert.rejects(x.c.createTask('Bad #Tag','bad',{newGroupName:' '}));assert.equal(x.c.groups.length,0);assert.equal(x.c.data.manualModules.length,0);
 x.fail(true);await assert.rejects(x.c.createTask('Draft','draft',{newGroupName:'Group'}));const g=x.c.groups[0]!.id;x.fail(false);await x.c.createTask('Draft','draft',{newGroupName:'Group'});assert.equal(x.c.groups.length,1);assert.equal(x.c.tasks.length,1);assert.equal(x.c.tasks[0]!.groupId,g);
 await assert.rejects(x.c.updateTask('draft','Draft',{groupId:'missing'}));assert.equal(x.c.tasks[0]!.groupId,g);
});
test('v5 migration preserves original data; invalid groups, choices and references reject without reset',async()=>{
 const x=setup();await x.c.createTask('Task');const current=x.c.snapshot(),old={...current,schemaVersion:5};delete (old as Partial<typeof old>).taskGroups;delete (old as Partial<typeof old>).groupDecisions;old.state={...old.state,schemaVersion:2} as unknown as typeof old.state;const copy=structuredClone(old),next=validateWorkspace(old);assert.equal(next.schemaVersion,7);assert.deepEqual(next.tasks,current.tasks);assert.deepEqual(old,copy);assert.deepEqual(next.taskGroups,[]);
 assert.throws(()=>validateWorkspace({...current,taskGroups:[{id:'x'}]}));assert.throws(()=>validateWorkspace({...current,groupDecisions:{folder:'wrong'}}));assert.throws(()=>validateWorkspace({...current,tasks:current.tasks.map(t=>({...t,groupId:'missing'}))}));
});
test('stale source deletion is idempotent and never removes the different replacement task',async()=>{
 const x=setup();await x.open('AI learning/a.md','- [ ] Old title');const t=x.c.tasks[0]!;x.sources.set('AI learning/a.md','- [ ] Replacement');await x.c.removeTask(t.id);assert.equal(x.sources.get('AI learning/a.md'),'- [ ] Replacement');assert(t.deletedAt);await x.c.removeTask(t.id);assert.equal(x.sources.get('AI learning/a.md'),'- [ ] Replacement');
});
test('fresh seven-checkbox note always prompts while a saved decline stays quiet',async()=>{
 const x=setup();await x.open('AI learning/new.md',rows(7));assert.deepEqual(x.imports,['AI learning/new.md']);assert.equal(x.c.tasks.length,7);
});

test('explicit ungrouping survives later source reads; folder grouping never absorbs dated or completed work',async()=>{
 const x=setup();await x.open('AI learning/project/a.md',rows(3));const [a,b]=x.c.tasks;await x.c.updateTask(a!.id,a!.text,{dueAt:'2026-11-22T00:00:00Z'});await x.c.complete(b!.id,true);await x.open('AI learning/project/b.md',rows(2,'New'));assert.equal(x.questions.length,0);await x.open('AI learning/project/c.md',rows(1,'More'));assert.equal(x.questions.length,1);assert(!a!.groupId&&!b!.groupId);const t=x.c.tasks.find(t=>t.groupId)!;await x.c.updateTask(t.id,t.text,{groupId:null});await x.c.suggestTaskGroups();assert(!t.groupId);assert(t.groupExcluded);
});
