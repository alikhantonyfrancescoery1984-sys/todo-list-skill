import {DEFAULT_CONFIG,type State,type Config} from './model';import {classify} from './tasks';import {tagKey,type PlannedTask} from './planning';
export interface ManualModule {id:string;name:string;aliases:string[];createdAt:string;deletedAt?:string}
export interface ModuleRef {id:string;name:string;kind:'source'|'manual';hidden:boolean;aliases:string[]}
export const INBOX_MODULE='manual-inbox';
export function moduleForPath(path:string,config:Config=DEFAULT_CONFIG):string{
 if(path==='手动待办')return '手动待办';return classify(path,[...new Set([...Object.values(config.columnMap),config.fallback])],config);
}
export const sourceModuleId=(name:string):string=>'source:'+tagKey(name);
export function moduleCatalog(state:State,manuals:readonly ManualModule[]=[],hidden:readonly string[]=[],config:Config=DEFAULT_CONFIG):ModuleRef[]{
 const labels=[...new Set([...Object.values(config.columnMap),config.fallback,...state.notes.filter(n=>n.id!=='note-manual-tasks').map(n=>moduleForPath(n.path,config))])];
 return [...labels.map(name=>({id:sourceModuleId(name),name,kind:'source' as const,hidden:hidden.includes(sourceModuleId(name)),aliases:[]})),...manuals.filter(m=>!m.deletedAt).map(m=>({...m,kind:'manual' as const,hidden:false}))];
}
export function moduleForTask(task:PlannedTask|undefined,noteId:string,state:State,catalog:readonly ModuleRef[],manuals:readonly ManualModule[]=[],config:Config=DEFAULT_CONFIG):ModuleRef{
 if(task?.origin==='manual'){
  const key=task.moduleIds?.[0]??INBOX_MODULE,active=catalog.find(m=>m.id===key);if(active)return active;
  const removed=manuals.find(m=>m.id===key);if(removed)return {...removed,kind:'manual',hidden:true};
  return {id:INBOX_MODULE,name:'手动待办',kind:'manual',hidden:false,aliases:[]};
 }
 const note=state.notes.find(n=>n.id===noteId),name=note?moduleForPath(note.path,config):'来源不可用';return catalog.find(m=>m.id===sourceModuleId(name))??{id:sourceModuleId(name),name,kind:'source',hidden:false,aliases:[]};
}
