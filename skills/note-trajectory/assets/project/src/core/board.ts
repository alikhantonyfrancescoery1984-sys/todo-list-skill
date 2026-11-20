export interface BoardCard { id:string; column:string; text:string; done:boolean; start:number; end:number }
export interface ParsedBoard { columns:string[]; cards:BoardCard[]; lines:string[]; sections:{name:string;start:number;end:number}[]; footer:number }
export function parseBoard(markdown:string):ParsedBoard {
  if(!/^---\r?\n[\s\S]*?kanban-plugin:\s*(board|basic)[\s\S]*?\r?\n---/.test(markdown))throw new Error('不是受支持的 Kanban Markdown 看板。');
  const lines=markdown.split('\n'),footer=lines.findIndex(l=>/^%%\s*kanban:settings/.test(l));
  const limit=footer<0?lines.length:footer, sections:ParsedBoard['sections']=[];
  let fence='';
  for(let i=0;i<limit;i++){const raw=lines[i]!.replace(/\r$/,'');const f=raw.match(/^(`{3,}|~{3,})/);if(f){if(!fence)fence=f[1]!;else if(f[1]![0]===fence[0])fence='';continue;}if(fence)continue;
    const h=raw.match(/^## (.+)$/);if(h){if(sections.length)sections[sections.length-1]!.end=i;sections.push({name:h[1]!.trim(),start:i,end:limit});}}
  if(new Set(sections.map(s=>s.name)).size!==sections.length)throw new Error('看板有重名列，无法安全写入。');
  const cards:BoardCard[]=[];
  for(const s of sections){for(let i=s.start+1;i<s.end;i++){const m=lines[i]!.match(/^- \[([ xX])\] (.*?)(?:\s+\^(nt-[a-zA-Z0-9-]+))?\r?$/);if(!m)continue;let end=i+1;while(end<s.end&&/^(?: {2,}|\t)\S/.test(lines[end]!))end++;
    cards.push({id:m[3]??'',column:s.name,text:m[2]!.trim(),done:m[1]!==' ',start:i,end});i=end-1;}}
  return {columns:sections.filter(s=>s.name!=='Archive').map(s=>s.name),cards,lines,sections,footer:limit};
}
export function addCard(markdown:string,column:string,id:string,content:string,done=false):string {
  const b=parseBoard(markdown);if(b.cards.some(c=>c.id===id))return markdown;
  const s=b.sections.find(s=>s.name===column&&s.name!=='Archive');if(!s)throw new Error(`缺少目标列「${column}」，操作已保留。`);
  const cr=markdown.includes('\r\n')?'\r':'';let at=s.end;while(at>s.start+1&&!b.lines[at-1]!.trim())at--;
  // JSON/Markdown structure must not be injected via task text.
  const safe=content.replace(/[\r\n]+/g,' ').trim();b.lines.splice(at,0,`- [${done?'x':' '}] ${safe} ^${id}${cr}`);return b.lines.join('\n');
}
export function changeCard(markdown:string,id:string,{done,column,date}:{done?:boolean;column?:string;date?:string}):string {
  const b=parseBoard(markdown),card=b.cards.find(c=>c.id===id);if(!card)throw new Error('找不到对应卡片，未修改源笔记。');
  const cr=markdown.includes('\r\n')?'\r':'';
  let content=card.text.replace(/\s*#完成\/\d{4}-\d{2}-\d{2}/g,'');if(date)content+=` #完成/${date}`;
  const line=`- [${(done??card.done)?'x':' '}] ${content} ^${id}${cr}`;
  if(column&&column!==card.column){const tail=b.lines.slice(card.start+1,card.end);b.lines.splice(card.start,card.end-card.start);let next=addCard(b.lines.join('\n'),column,id,content,done??card.done);
    if(tail.length){const target=parseBoard(next);const inserted=target.cards.find(c=>c.id===id)!;target.lines.splice(inserted.start+1,0,...tail);next=target.lines.join('\n');}return next;}
  b.lines[card.start]=line;return b.lines.join('\n');
}
