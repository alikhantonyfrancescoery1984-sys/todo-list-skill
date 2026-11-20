import test from 'node:test';import assert from 'node:assert/strict';import {emptyState} from '../src/core/model';import {dailyStats} from '../src/core/analytics';import {UsageRecorder} from '../src/core/usage';import {SimulatedClock} from '../src/adapters/browser/memory';
test('idle closes at last confirmed activity, external events excluded, restart has no open session',()=>{const state=emptyState(),clock=new SimulatedClock(new Date('2026-11-20T10:00:00+08:00')),recorder=new UsageRecorder(state,clock);recorder.interact('n');clock.advance(1);recorder.interact('n');clock.advance(120);recorder.checkIdle();assert.equal(state.sessions.length,1);assert.equal(dailyStats(state,'2026-11-20').activeMinutes,1);recorder.interact('n','external');assert.equal(state.observations.length,1);const restarted=new UsageRecorder(state,clock);clock.advance(30);restarted.close('interruption');assert.equal(state.sessions.length,1);});
test('splits Shanghai midnight, deduplicates overlap and never allocates note duration to tasks',()=>{const state=emptyState();state.notes=[{id:'n',path:'AI learning/a.md',text:'',version:1}];state.sessions=[{id:'s',noteId:'n',start:'2026-11-20T23:50:00+08:00',end:'2026-11-21T00:10:00+08:00',estimated:true,reason:'pause'},{id:'overlap',noteId:'n',start:'2026-11-21T00:00:00+08:00',end:'2026-11-21T00:20:00+08:00',estimated:true,reason:'pause'}];const first=dailyStats(state,'2026-11-20'),second=dailyStats(state,'2026-11-21');assert.equal(first.activeMinutes,10);assert.equal(second.activeMinutes,20);assert.equal(second.modules[0]?.name,'AI');assert(second.intervals.every(s=>s.taskId===undefined));assert(second.warnings.includes('已去除重叠时间'));});
test('daily unique tasks, date-only history and missing values do not invent durations',()=>{const s=emptyState();s.completions=[{taskId:'t',noteId:'n',at:'2026-11-20',precision:'day'},{taskId:'t',noteId:'n',at:'2026-11-20T15:00:00+08:00'}];s.receipts=[{id:'a',noteId:'n',taskIds:['t','t2'],at:'2026-11-20T09:00:00+08:00'},{id:'b',noteId:'n',taskIds:['t'],at:'2026-11-20T10:00:00+08:00'}];const stats=dailyStats(s,'2026-11-20');assert.equal(stats.completed,1);assert.equal(stats.collected,2);assert.equal(stats.activeMinutes,0);assert.equal(stats.intervals.length,0);});
test('note observations are unique per day across switches and restarts without an event log',()=>{
 const state=emptyState(),clock=new SimulatedClock(new Date('2026-11-20T10:00:00+08:00')),r=new UsageRecorder(state,clock);
 r.interact('a');for(let i=0;i<12;i++){clock.advance(.25);r.interact('a');}
 r.close('blur');r.interact('b');r.interact('a');new UsageRecorder(state,clock).interact('a');
 assert.deepEqual(state.observations,[{noteId:'a',date:'2026-11-20'},{noteId:'b',date:'2026-11-20'}]);assert(!('activities' in state));
});
test('observation day changes at Shanghai midnight while timing still splits accurately',()=>{
 const state=emptyState(),clock=new SimulatedClock(new Date('2026-11-20T23:59:50+08:00')),r=new UsageRecorder(state,clock);
 r.interact('n');clock.advance(1/3);r.interact('n');r.close('pause');
 assert.deepEqual(state.observations.map(o=>o.date),['2026-11-20','2026-11-21']);
 assert.equal(dailyStats(state,'2026-11-20').notes,1);assert.equal(dailyStats(state,'2026-11-21').notes,1);
 assert.equal(dailyStats(state,'2026-11-20').activeMinutes,1/6);assert.equal(dailyStats(state,'2026-11-21').activeMinutes,1/6);
});
