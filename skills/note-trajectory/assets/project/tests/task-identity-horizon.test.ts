import test from 'node:test';
import assert from 'node:assert/strict';
import {stripTaskBlockIds,extractTasks} from '../src/core/tasks';
import {WorkspaceController,emptyWorkspace} from '../src/application/workspace';
import {renderModuleDistribution} from '../src/ui/statistics/view';
import {taskHorizon} from '../src/core/planning';
import {renderTasks} from '../src/ui/workspace/tasks';

test('legacy plugin block IDs are stripped from task lines and no ID is added',()=>{
 const uuid=(n:string)=>`nt-${n.repeat(8)}-${n.repeat(4)}-${n.repeat(4)}-${n.repeat(4)}-${n.repeat(12)}`;
 const source=`---\ncheck: "- [ ] no"\n---\n- [ ] first ^${uuid('a')}\n\`\`\`md\n- [ ] code ^${uuid('b')}\n\`\`\`\n%% - [ ] comment %%\n- [x] done ^kept`;
 const result=stripTaskBlockIds(source);
 assert(result.includes('- [ ] first\n'));
 assert(result.includes(`- [ ] code ^${uuid('b')}`),'fenced blocks stay untouched');
 assert(result.includes('%% - [ ] comment %%'));
 assert(result.includes('- [x] done ^kept'),'foreign block IDs stay untouched');
 assert.equal(stripTaskBlockIds(result),result);
 const tasks=extractTasks({id:'note',path:'note.md',text:result,version:1});
 assert.equal(tasks.length,2);
 assert.equal(tasks[0]?.text,'first');
});

test('a deleted source task may be recreated with the same text when it has a new block ID',async()=>{
 let text='- [ ] Same title ^nt-first';const file={path:'notes/source.md',extension:'md',stat:{size:100}};
 const c=new WorkspaceController({async read(){return {text,indexed:true}}},{now:()=>new Date('2026-11-25T09:00:00+08:00')},{async save(){}},async()=>true);
 await c.open(file);const first=c.tasks[0]!;await c.removeTask(first.id);
 text='- [ ] Same title ^nt-second';await c.refresh(file);await c.collect(first.noteId);
 assert.equal(c.tasks.length,1);assert.notEqual(c.tasks[0]!.id,first.id);assert.equal(c.tasks[0]!.blockId,'nt-second');
});

test('today and project views preserve legacy horizons and allow moving work into today',async()=>{
 const now=new Date('2026-11-25T09:00:00+08:00'),c=new WorkspaceController({async read(){return {text:'',indexed:true}}},{now:()=>now},{async save(){}},async()=>true);
 const today=await c.createTask('Today','today',{horizon:'today'}),next=await c.createTask('Next','next',{horizon:'next'}),later=await c.createTask('Later','later',{horizon:'later'});
 assert.equal(taskHorizon(c.tasks.find(t=>t.id===today)!,now),'today');
 assert(renderTasks(c,'pending',()=>'#',new Set(),'today').includes(`data-task-item="${today}"`));
 assert(!renderTasks(c,'pending',()=>'#',new Set(),'today').includes(`data-task-item="${next}"`));
 const project=renderTasks(c,'pending',()=>'#',new Set(),'project');for(const id of [today,next,later])assert(project.includes(`data-task-item="${id}"`));
 assert(project.includes('data-horizon-drop="today"'));assert(project.includes('class="task-drag-handle"'));assert(!project.includes('data-view="next"'));assert(!project.includes('data-view="later"'));
 await c.assignTaskHorizon(later,'today');assert.equal(taskHorizon(c.tasks.find(t=>t.id===later)!,now),'today');assert(renderTasks(c,'pending',()=>'#',new Set(),'today').includes(`data-task-item="${later}"`));
});

test('glued or mid-line legacy IDs are stripped and the task text survives',()=>{
 const uuid='nt-c0900a32-59c2-4a46-a730-c7748db1bc93';
 const glued=`- [ ] 待完成作业 -gong g^${uuid}`;
 assert.equal(stripTaskBlockIds(glued),'- [ ] 待完成作业 -gong g');
 const mid=`  - [ ]dai wan cheng ^${uuid}待完成`;
 assert.equal(stripTaskBlockIds(mid),'  - [ ] dai wan cheng 待完成');
 const [task]=extractTasks({id:'n',path:'n.md',text:`- [ ] 待完成作业 -gong g^${uuid}`,version:1});
 assert.equal(task?.text,'待完成作业 -gong g');
 assert.equal(task?.blockId,undefined);
 assert.equal(stripTaskBlockIds('- [ ] 任务 ^kept'),'- [ ] 任务 ^kept');
});

test('rereading the same source line keeps one task even after legacy IDs are removed',async()=>{
 let text='- [ ] 待完成 ^nt-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 const c=new WorkspaceController({async read(){return {text,indexed:true}}},{now:()=>new Date('2026-11-25T09:00:00+08:00')},{async save(){}},async()=>true);
 const file={path:'lessons/设计/note.md',extension:'md',stat:{size:100}};
 await c.open(file);const noteId=c.state.notes[0]!.id;await c.collect(noteId);
 const first=c.tasks.find(t=>t.text==='待完成')!;
 text='- [ ] 待完成';
 await c.refresh(file);await c.collect(noteId);
 const pending=c.tasks.filter(t=>t.text==='待完成');
 assert.equal(pending.length,1);
 assert.equal(pending[0]?.id,first.id);
 assert.equal(c.state.receipts.filter(r=>r.taskIds.includes(first.id)).length,1);
});

test('the toolbar creates a real module lane instead of a task group',async()=>{
 const c=new WorkspaceController({async read(){return {text:'',indexed:true}}},{now:()=>new Date('2026-11-25T09:00:00+08:00')},{async save(){}},async()=>true);
 const moduleId=await c.createModule('长期观察');
 const html=renderTasks(c,'pending',()=>'#',new Set(),'project');
 assert(html.includes('data-action="new-module"'),'toolbar offers module creation');
 assert(html.includes(`data-module-drop="${moduleId}"`),'created module renders as a board lane');
 assert(html.includes(`data-module-lane="${moduleId}"`));
 assert(!html.includes('data-action="task-group-menu">＋'));
});

test('a created module can be deleted, while the inbox is protected instead of silently recreated',async()=>{
 const c=new WorkspaceController({async read(){return {text:'',indexed:true}}},{now:()=>new Date('2026-11-25T09:00:00+08:00')},{async save(){}},async()=>true);
 const moduleId=await c.createModule('长期观察');
 assert(c.modules.some(m=>m.id===moduleId));
 await c.removeModule(moduleId);
 assert(!c.modules.some(m=>m.id===moduleId),'module disappears from the catalog');
 assert.equal(c.data.manualModules.filter(m=>m.id===moduleId&&!m.deletedAt).length,0);
 await assert.rejects(()=>c.removeModule('manual-inbox'),/不能删除/);
 assert.equal(c.data.manualModules.filter(m=>m.id==='manual-inbox').length<=1,true,'never duplicates the inbox row');
});

test('a duplicated inbox row from older builds is collapsed instead of blocking the load',()=>{
 const raw=emptyWorkspace();
 raw.manualModules.push({id:'manual-inbox',name:'手动待办',aliases:[],createdAt:'2026-11-24T21:38:03.162Z',deletedAt:'2026-11-24T21:38:28.597Z'});
 raw.manualModules.push({id:'manual-inbox',name:'手动待办',aliases:[],createdAt:'2026-11-25T05:55:19.176Z'});
 const c=new WorkspaceController({async read(){return {text:'',indexed:false}}},{now:()=>new Date('2026-11-25T09:00:00+08:00')},{async save(){}},async()=>true,raw);
 assert.equal(c.data.manualModules.filter(m=>m.id==='manual-inbox').length,1);
 assert.equal(c.data.manualModules.find(m=>m.id==='manual-inbox')?.deletedAt,undefined);
});
