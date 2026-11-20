import test from 'node:test';import assert from 'node:assert/strict';
import {deadlineParts,deadlineValue} from '../src/ui/workspace/deadline-input';
import {deadlineHint,parseDeadline} from '../src/core/planning';
import {WorkspaceController} from '../src/application/workspace';import {renderTasks} from '../src/ui/workspace/tasks';
test('clickable AM/PM roundtrips all 24 Shanghai hours, including midnight and noon',()=>{
 for(let h=0;h<24;h++){const value=`2026-11-21T${String(h).padStart(2,'0')}:35`,p=deadlineParts(parseDeadline(value));assert.equal(deadlineValue(p.date,p.period,p.hour,p.minute),value);assert.equal(p.period,h<12?'am':'pm');}
 assert.equal(deadlineValue('2026-11-21','am','12','00'),'2026-11-21T00:00');assert.equal(deadlineValue('2026-11-21','pm','12','00'),'2026-11-21T12:00');assert.equal(deadlineValue('','pm','2','00'),'');
 for(const [period,hour,minute] of [['night','2','00'],['am','0','00'],['pm','13','00'],['am','1','60']])assert.throws(()=>deadlineValue('2026-11-21',period!,hour!,minute!));assert.throws(()=>deadlineValue('2026-02-30','pm','1','00'));
});
test('new tasks have no repeated edit sentence; only DDL tasks have an explicitly hidden time description',async()=>{
 const c=new WorkspaceController({async read(){return {text:'',indexed:true}}},{now:()=>new Date('2026-11-21T10:00:00+08:00')},{async save(){}},async()=>true);await c.createTask('plain','plain');let html=renderTasks(c,'pending',()=> '#');assert(!html.includes('编辑待办：'));assert(!html.includes('task-time-description'));assert.equal(deadlineHint(c.tasks[0]!), '');
 await c.createTask('dated','dated',{dueAt:'2026-11-21T12:00:00+08:00',reminder:{value:1,unit:'hours'}});html=renderTasks(c,'pending',()=> '#');assert(!html.includes('编辑待办：'));assert(html.includes('class="task-time-description" hidden'));const hint=deadlineHint(c.tasks[1]!);assert(hint.startsWith('截止时间：'));assert(hint.includes('\n提醒时间：'));assert(!hint.includes('dated'));
});
