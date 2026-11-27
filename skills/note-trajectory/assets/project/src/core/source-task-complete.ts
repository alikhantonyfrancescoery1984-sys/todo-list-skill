/** Write one local completion back into the source note's Markdown checkbox. */
export interface SourceTaskRef {line:number;text:string;blockId?:string}

const LEGACY_ID=/[ \t]*\^nt-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const TASK=/(\s*[-*+]\s+)\[([ xX])\](.*)/;
const norm=(value:string):string=>value.trim().replace(/\s+/g,' ');

function parse(raw:string):{prefix:string;flag:string;body:string}|undefined{
  const match=raw.replace(/\r$/,'').match(TASK);
  return match?{prefix:match[1]!,flag:match[2]!,body:match[3]!}:undefined;
}

function lineMatches(raw:string,text:string):boolean{
  const parsed=parse(raw);
  return !!parsed&&norm(parsed.body.replace(LEGACY_ID,''))===norm(text);
}

/**
 * Locate the task line by block ID, then by the recorded line number, then by a unique text match,
 * and flip its checkbox. An unmatched task throws so the caller can report it instead of guessing.
 */
export function setSourceChecked(markdown:string,task:SourceTaskRef,done:boolean):string{
  const lines=markdown.split('\n');
  let index=-1;
  if(task.blockId){
    const wanted=`^${task.blockId}`;
    index=lines.findIndex(line=>line.includes(wanted));
  }
  if(index<0&&task.line>=0&&task.line<lines.length&&lineMatches(lines[task.line]!,task.text))index=task.line;
  if(index<0){
    const hits=lines.map((line,i)=>lineMatches(line,task.text)?i:-1).filter(i=>i>=0);
    if(hits.length===1)index=hits[0]!;
    else if(hits.length>1)throw new Error('这篇笔记有多条同名待办，无法确定要勾哪一行');
  }
  if(index<0)throw new Error('找不到这条待办对应的笔记行，请在笔记里手动勾选');
  const raw=lines[index]!,parsed=parse(raw);
  if(!parsed)throw new Error('找不到这条待办对应的笔记行，请在笔记里手动勾选');
  const want=done?'x':' ';
  if(parsed.flag===want)return markdown;
  const cr=raw.endsWith('\r')?'\r':'';
  lines[index]=`${parsed.prefix}[${want}]${parsed.body}${cr}`;
  return lines.join('\n');
}
