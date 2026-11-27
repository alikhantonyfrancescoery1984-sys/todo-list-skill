import test from 'node:test';
import assert from 'node:assert/strict';
import {setSourceChecked} from '../src/core/source-task-complete';
import {WorkspaceController} from '../src/application/workspace';

const id='nt-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

test('checking and unchecking writes the note checkbox in place',()=>{
 const md=`# 笔记\n\n- [ ] 待完成作业 ^${id}\n- [x] 已完成\n`;
 const done=setSourceChecked(md,{line:2,text:'待完成作业',blockId:id},true);
 assert.equal(done,`# 笔记\n\n- [x] 待完成作业 ^${id}\n- [x] 已完成\n`);
 assert.equal(setSourceChecked(done,{line:2,text:'待完成作业',blockId:id},true),done);
 assert.equal(setSourceChecked(done,{line:2,text:'待完成作业',blockId:id},false),md);
});

test('a drifted line number still finds the task, and ambiguous or missing lines are rejected',()=>{
 const md='- [ ] 写周报\n- [ ] 另一条\n';
 assert.equal(setSourceChecked(md,{line:9,text:'写周报'},true),'- [x] 写周报\n- [ ] 另一条\n');
 assert.throws(()=>setSourceChecked('- [ ] 同名\n- [ ] 同名\n',{line:9,text:'同名'},true),/同名/);
 assert.throws(()=>setSourceChecked(md,{line:9,text:'不存在'},true),/找不到/);
});

test('completing an imported task writes back into its source note',async()=>{
 let text=`- [ ] 写周报 ^${id}`;
 const c=new WorkspaceController(
  {async read(){return {text,indexed:true}}},
  {now:()=>new Date('2026-11-25T09:00:00+08:00')},
  {async save(){}},
  async()=>true,
  null,undefined,undefined,
  async(task,_path,done)=>{text=setSourceChecked(text,task,done);},
 );
 await c.open({path:'notes/a.md',extension:'md',stat:{size:100}});
 const noteId=c.state.notes[0]!.id;await c.collect(noteId);
 const task=c.tasks[0]!;
 await c.complete(task.id,true);
 assert.equal(text,`- [x] 写周报 ^${id}`);
 await c.complete(task.id,false);
 assert.equal(text,`- [ ] 写周报 ^${id}`);
});
