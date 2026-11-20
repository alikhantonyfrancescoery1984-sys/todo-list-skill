import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../src/core/model';
import {renderModuleDistribution} from '../src/ui/statistics/view';

test('module bars reflect real shares below one minute and never invent time for completions',()=>{
  const state=emptyState();
  state.notes=[{id:'ai',path:'AI learning/a.md',text:'',version:1},{id:'en',path:'English/b.md',text:'',version:1}];
  state.sessions=[
    {id:'one',noteId:'ai',start:'2026-11-20T09:00:00+08:00',end:'2026-11-20T09:00:10+08:00',estimated:true,reason:'switch'},
    {id:'two',noteId:'en',start:'2026-11-20T09:00:10+08:00',end:'2026-11-20T09:00:30+08:00',estimated:true,reason:'blur'}
  ];
  const context={title:(id:string)=>id,time:(at:string)=>at.slice(11,16)};
  const widths=(html:string)=>[...html.matchAll(/class="module-track"[^>]*><span style="width:([^%]+)%"/g)].map(m=>Number(m[1]));
  const shares=widths(renderModuleDistribution(state,'2026-11-20'));
  assert.equal(shares.length,2);assert(Math.abs(shares.reduce((a,b)=>a+b,0)-100)<1e-8);
  assert(Math.abs(shares[0]!-200/3)<1e-8);assert(Math.abs(shares[1]!-100/3)<1e-8);
  state.sessions=[];state.completions=[{taskId:'t',noteId:'ai',at:'2026-11-20T09:00:00+08:00'}];
  assert.deepEqual(widths(renderModuleDistribution(state,'2026-11-20')),[0]);
});
