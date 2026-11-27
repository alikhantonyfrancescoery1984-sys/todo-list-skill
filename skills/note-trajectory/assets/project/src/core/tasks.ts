import { fingerprint, type Note, type Task, type Config } from './model';
/** Plugin-owned block IDs from older versions: remove them so notes stay plain Markdown. */
const LEGACY_ID=/[ \t]*\^nt-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const TASK_LINE=/^(\s*[-*+]\s+\[[ xX]\])\s*(.*)$/;
/** Strip legacy plugin block IDs and repair the spacing an ID used to occupy. */
export function stripTaskBlockIds(markdown:string):string{
  const lines=markdown.split('\n');let fence='',frontmatter=false,comment=false,changed=false;
  for(let line=0;line<lines.length;line++){
    const raw=lines[line]!,body=raw.replace(/\r$/,'');
    if(line===0&&body.trim()==='---'){frontmatter=true;continue}
    if(frontmatter){if(body.trim()==='---')frontmatter=false;continue}
    const marker=body.match(/^\s{0,3}(`{3,}|~{3,})/);if(marker){const m=marker[1]!;if(!fence)fence=m;else if(m[0]===fence[0]&&m.length>=fence.length)fence='';continue}
    if(fence)continue;
    if(body.includes('%%')){if((body.match(/%%/g)?.length??0)%2)comment=!comment;continue}
    if(body.includes('<!--')){comment=!body.includes('-->');continue}
    if(comment){if(body.includes('-->'))comment=false;continue}
    const match=body.match(TASK_LINE);if(!match)continue;
    const text=match[2]!.replace(LEGACY_ID,' ').replace(/[ \t]{2,}/g,' ').trim();
    const next=(text?`${match[1]} ${text}`:match[1]!)+(raw.endsWith('\r')?'\r':'');
    if(next!==raw){lines[line]=next;changed=true}
  }
  return changed?lines.join('\n'):markdown;
}
export function extractTasks(note: Note, previous: Task[] = []): Task[] {
  const found: {text:string; line:number; done:boolean; blockId?:string}[] = [];
  let fence = '', frontmatter = false, comment = false;
  for (const [line, raw] of note.text.split(/\r?\n/).entries()) {
    if (line === 0 && raw.trim() === '---') { frontmatter = true; continue; }
    if (frontmatter) { if (raw.trim() === '---') frontmatter = false; continue; }
    const marker = raw.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) { const m=marker[1]!; if (!fence) fence=m; else if (m[0]===fence[0] && m.length>=fence.length) fence=''; continue; }
    if (fence) continue;
    if (raw.includes('%%')) { if ((raw.match(/%%/g)?.length??0)%2) comment=!comment; continue; }
    if (raw.includes('<!--')) { comment=!raw.includes('-->'); continue; }
    if (comment) { if (raw.includes('-->')) comment=false; continue; }
    const m=raw.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/); if(!m) continue;
    const body=m[2]!.replace(LEGACY_ID,'');
    const ending=body.match(/(?:^|\s)\^([a-zA-Z0-9-]+)\s*$/);
    const text=body.replace(/(?:^|\s)\^[a-zA-Z0-9-]+\s*$/,'').replace(/[ \t]{2,}/g,' ').trim();
    found.push({text,line,done:m[1]!==' ',blockId:ending?.[1]});
  }
  const norm=(s:string)=>s.trim().replace(/\s+/g,' ');
  const previousHere=previous.filter(t=>t.noteId===note.id);
  const seen=new Map<string,number>();
  return found.map(f=>{
    const text=norm(f.text), occurrence=seen.get(text)??0;seen.set(text,occurrence+1);
    const same=previousHere.filter(t=>norm(t.text)===text);
    const duplicate=found.filter(t=>norm(t.text)===text).length>1;
    const oldAtLine=previousHere.find(t=>t.line===f.line&&!found.some(n=>norm(n.text)===norm(t.text)));
    const blockMatch=f.blockId?previousHere.find(t=>t.blockId===f.blockId):undefined;
    const generated=f.blockId?`task-${fingerprint(note.id)}-b-${f.blockId}`:`task-${fingerprint(note.id)}-${fingerprint(text)}-${occurrence}`;
    const duplicateBlock=!!f.blockId&&found.filter(t=>t.blockId===f.blockId).length>1;
    return {...f,noteId:note.id,id:blockMatch?.id??(!f.blockId&&!duplicate&&same.length===1?same[0]!.id:generated),ambiguous:duplicateBlock||(!f.blockId&&(duplicate||!!oldAtLine))};
  });
}
export function classify(path:string,columns:string[],config:Config):string {
  const hit=Object.entries(config.columnMap).sort((a,b)=>b[0].length-a[0].length).find(([prefix])=>path.startsWith(prefix));
  if(hit&&columns.includes(hit[1]))return hit[1];
  const normalize=(s:string)=>s.toLowerCase().replace(/[\s-]/g,'');
  for(const dir of path.split('/').slice(0,-1).reverse()){const match=columns.find(c=>normalize(c)===normalize(dir));if(match)return match;}
  if(columns.includes(config.fallback))return config.fallback;
  throw new Error('缺少目标列和 processing 兜底列，请确认看板结构。');
}
