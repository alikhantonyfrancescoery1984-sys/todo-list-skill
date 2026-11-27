import test from 'node:test';import assert from 'node:assert/strict';import {emptyState} from '../src/core/model';import {dailyStats,recentDays} from '../src/core/analytics';import {observeNote} from '../src/core/observations';
test('daily completions deduplicate task IDs, preserve date-only history and count zero honestly',()=>{
 const s=emptyState();s.completions=[{taskId:'t',noteId:'n',at:'2026-11-20',precision:'day'},{taskId:'t',noteId:'n',at:'2026-11-20T15:00:00+08:00'}];s.receipts=[{id:'a',noteId:'n',taskIds:['t','t2'],at:'2026-11-20T09:00:00+08:00'},{id:'b',noteId:'n',taskIds:['t'],at:'2026-11-20T10:00:00+08:00'}];assert.equal(dailyStats(s,'2026-11-20').completed,1);assert.equal(dailyStats(s,'2026-11-20').collected,2);assert.equal(dailyStats(s,'2026-11-19').completed,0);
});
test('completion dates use Shanghai midnight; same task may complete on different days once per day',()=>{
 const s=emptyState();s.completions=[{taskId:'one',noteId:'n',at:'2026-11-20T15:59:59Z'},{taskId:'one',noteId:'n',at:'2026-11-20T16:00:00Z'},{taskId:'two',noteId:'n',at:'2026-11-21T01:00:00+08:00'}];const days=recentDays('2026-11-21');assert.deepEqual(days.map(d=>dailyStats(s,d).completed),[0,0,0,0,0,1,2]);
});
test('daily observations remain deduplicated without collecting active time',()=>{const s=emptyState();for(let i=0;i<5;i++)observeNote(s,'n','2026-11-20');observeNote(s,'n','2026-11-21');assert.equal(s.observations.length,2);assert(!('sessions' in s));assert.equal(dailyStats(s,'2026-11-21').notes,1)});
