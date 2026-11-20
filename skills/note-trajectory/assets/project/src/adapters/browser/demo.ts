import {emptyState, type State} from '../../core/model';
export const DEMO_NOW='2026-11-20T17:35:00+08:00';
export function demoState():State {
  const state=emptyState();
  state.notes=[
    {id:'note-reading',path:'AI learning/阅读摘记.md',version:1,text:'# 阅读摘记\n\n整理几种信息检索方法，留下可以继续验证的问题。\n\n- [ ] 比较两种检索结果\n- [ ] 补充来源说明'},
    {id:'note-plan',path:'lessons/方案草稿.md',version:1,text:'# 方案草稿\n\n从一个小问题开始，把要做的事写清楚。\n\n- [ ] 列出三种实现方式\n- [ ] 补充边界情况'},
    {id:'note-practice',path:'English/语言练习.md',version:1,text:'# 语言练习\n\n记录今天读到的表达和可以复用的句式。\n\n- [ ] 整理新的连接表达\n- [ ] 完成一次口头复述'},
    {id:'note-api',path:'AI learning/接口练习.md',version:1,text:'# 接口练习\n\n为接口准备几个可重复的小实验。\n\n- [ ] 验证异常返回 ^demo-api-error\n- [ ] 记录请求与响应'},
    {id:'note-research',path:'lessons/research/资料提纲.md',version:1,text:'# 资料提纲\n\n先整理材料之间的关系，再决定下一次阅读。\n\n- [ ] 写下待验证的问题\n- [ ] 对照原始材料'}
  ];
  const edits=[1,0,2,3,1],hours=[8,10,12,14,16];
  state.observations=state.notes.map(n=>({noteId:n.id,date:'2026-11-20'}));
  // Synthetic, deliberately confirmed observation ranges. These are not the user's history.
  for(let i=0;i<5;i++){const hour=hours[i]!,minute=4+edits[i]!*12;const start=new Date(`2026-11-20T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00+08:00`);const note=state.notes[(i+edits[i]!)%5]!;
    state.sessions.push({id:`demo-session-${i}`,noteId:note.id,start:start.toISOString(),end:new Date(start.getTime()+[18,24,16,28,22][i]!*60000).toISOString(),estimated:true,reason:'pause'});}
  for(let day=1;day<7;day++){const date=`2026-11-${20-day}`;state.sessions.push({id:`demo-past-${day}`,noteId:state.notes[day%5]!.id,start:`${date}T09:00:00+08:00`,end:`${date}T09:${[42,28,36,48,24,32][day-1]}:00+08:00`,estimated:true,reason:'pause'});}
  return state;
}
export function demoBoard():string{return '---\nkanban-plugin: board\n---\n\n'+['我做了什么','AI','课程','english','research','processing','completed'].map(c=>`## ${c}\n\n`).join('')+'%% kanban:settings\n```\n{"show-checkboxes":true}\n```\n%%\n';}
