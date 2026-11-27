import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {validateWorkspace,WorkspaceController} from '../src/application/workspace';
import {dailyStats} from '../src/core/analytics';
import {renderModuleDistribution,renderStatistics} from '../src/ui/statistics/view';
import {SimulatedClock} from '../src/adapters/browser/memory';

// Previous public format: all text is synthetic; never use a private plugin store as a fixture.
function legacy(){return {
 schemaVersion:2,state:{schemaVersion:1,
 notes:[{id:'a',path:'AI learning/Alpha.md',text:'',version:2},{id:'b',path:'English/Beta.md',text:'',version:1}],
 activities:[
  {id:'old1',noteId:'a',at:'2026-11-20T09:00:00+08:00',kind:'visit',source:'user'},
  {id:'old2',noteId:'a',at:'2026-11-20T09:00:10+08:00',kind:'edit',source:'user'},
  {id:'old3',noteId:'a',at:'2026-11-21T00:00:01+08:00',kind:'edit',source:'user'},
  {id:'external',noteId:'b',at:'2026-11-20T10:00:00+08:00',kind:'edit',source:'external'}],
 sessions:[{id:'s',noteId:'a',start:'2026-11-20T09:00:00+08:00',end:'2026-11-20T09:01:00+08:00',estimated:true,reason:'blur'}],
 receipts:[{id:'r',noteId:'a',taskIds:['t'],at:'2026-11-20T09:00:00+08:00'}],
 completions:[{noteId:'a',taskId:'t',at:'2026-11-20T09:01:00+08:00'}],operations:[],successfulRuns:[],taskRegistry:[]},
 tasks:[{id:'t',noteId:'a',text:'Synthetic complete task',line:1,done:true,ambiguous:false,collectedAt:'2026-11-20T09:00:00+08:00',completedAt:'2026-11-20T09:01:00+08:00'}],
 decisions:{a:'allow',b:'skip'},deletedNotes:['b']};}

test('upgrade discards old event nodes but preserves task identity, completion, consent, deletion while discarding timing',()=>{
 const old=legacy(),before=structuredClone(old),next=validateWorkspace(old);
 assert.equal(next.schemaVersion,7);assert.equal(next.state.schemaVersion,3);assert(!('activities' in next.state));
 assert.deepEqual(next.state.observations,[{noteId:'a',date:'2026-11-20'},{noteId:'a',date:'2026-11-21'}]);
 for(const key of ['tasks','decisions','deletedNotes'] as const)assert.deepEqual(next[key],old[key]);
 for(const key of ['notes','receipts','completions','operations','successfulRuns','taskRegistry'] as const)assert.deepEqual(next.state[key],old.state[key]);
 assert.deepEqual(old,before,'migration must not mutate caller or backup');assert.deepEqual(validateWorkspace(next),next);
 const day=dailyStats(next.state,'2026-11-20');assert(!('sessions' in next.state));assert.equal(day.notes,1);assert.equal(day.completed,1);assert.equal(day.collected,1);assert.equal(day.modules[0]?.name,'AI');
 assert.equal(dailyStats(next.state,'2026-11-21').notes,1);
});
test('migrated state survives save/reload and a still-unchecked source never resurrects completed tasks',async()=>{
 const old=legacy();let writes=0;const clock=new SimulatedClock(new Date('2026-11-20T10:00:00+08:00'));
 const source={async read(){return {text:'Heading\n- [ ] Synthetic complete task',indexed:true};}};
 const c=new WorkspaceController(source,clock,{async save(){writes++;}},async()=>true,old);
 await c.open({path:'AI learning/Alpha.md',extension:'md',stat:{size:100}});await c.ready();
 assert.equal(c.tasks.length,1);assert.equal(c.tasks[0]?.id,'t');assert(c.tasks[0]?.done);assert(writes>0);
 await c.dispose();const snapshot=c.snapshot();assert(!('activities' in snapshot.state));assert(snapshot.state.notes.every(n=>!n.text));
 const again=new WorkspaceController(source,clock,{async save(){}},async()=>true,snapshot);
 assert.equal(again.pending.length,0);assert.equal(again.state.completions.length,1);
});
test('malformed old and new statistical data reject without erasing the source store',()=>{
 const bad=legacy();bad.state.activities[0]!.noteId='unknown';assert.throws(()=>validateWorkspace(bad));
 const next=validateWorkspace(legacy());next.state.observations.push({...next.state.observations[0]!});assert.throws(()=>validateWorkspace(next));
 assert.throws(()=>validateWorkspace({...next,schemaVersion:999}));
 const valid=validateWorkspace(legacy());assert.throws(()=>validateWorkspace({...valid,state:{...valid.state,activities:[]}}));
});
test('only home owns module distribution, including empty and renamed directories',()=>{
 const s=validateWorkspace(legacy()).state,day='2026-11-20',context={title:(id:string)=>id,time:(at:string)=>at};
 const home=renderModuleDistribution(s,day),full=renderStatistics(s,day,context);assert(!full.includes('模块分布'));assert(home.includes('AI'));assert(!home.includes('分钟'));assert(home.includes('1 项完成'));
 s.notes[0]!.path='English/Alpha.md';assert(renderModuleDistribution(s,day).includes('english'));
 s.completions=[];assert(!renderModuleDistribution(s,day).includes('<strong>0 项完成</strong>'));
});
test('production source contains no graph implementation, selectors, actions or imports',()=>{
 for(const f of ['src/core/trajectory.ts','src/core/activity.ts','src/ui/trajectory/canvas.ts','src/adapters/obsidian/readonly.ts','scripts/trajectory-check.mjs','tests/trajectory.test.ts'])assert(!existsSync(f),f+' must be removed');
 const files=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(resolve(dir,e.name)):[resolve(dir,e.name)]);
 const banned=/trajectoryPages|renderCanvas|lastNode|data-node|data-row|blue-track|rail-row|node-dot|node-button|route-prev|route-next|next-round|selected-note|返回轨迹|纸飞机|笔记轨迹|轨道连线/;
 for(const file of files('src'))assert(!banned.test(readFileSync(file,'utf8')),file+' contains removed graph logic');
 const main=readFileSync('src/main.ts','utf8');assert(main.includes("id:'read-current-note-tasks'"));assert(main.includes('renderModuleDistribution'));
});
