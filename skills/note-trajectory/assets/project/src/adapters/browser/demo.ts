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
  state.observations=state.notes.map(n=>({noteId:n.id,date:'2026-11-20'}));
  return state;
}
export function demoBoard():string{return '---\nkanban-plugin: board\n---\n\n'+['我做了什么','AI','课程','english','research','processing','completed'].map(c=>`## ${c}\n\n`).join('')+'%% kanban:settings\n```\n{"show-checkboxes":true}\n```\n%%\n';}
