import type {PlannedTask} from './planning';
export interface TaskGroup {id:string;name:string;createdAt:string;folder?:string;deletedAt?:string}
export interface TaskGroupQuestion {folder:string;count:number}
export const groupNameKey=(name:string):string=>name.trim().normalize('NFKC').toLowerCase();
/** Only loose, undated, unfinished source tasks; existing large-file groups take precedence. */
export function folderCandidates<T extends PlannedTask>(tasks:readonly T[],notes:readonly {id:string;path:string}[]):Map<string,T[]>{
 const counts=new Map<string,number>();for(const t of tasks)if(!t.deletedAt)counts.set(t.noteId,(counts.get(t.noteId)??0)+1);
 const result=new Map<string,T[]>();for(const t of tasks){if(t.deletedAt||t.done||t.dueAt||t.groupId||t.groupExcluded||t.origin==='manual'||(counts.get(t.noteId)??0)>5)continue;
 const folder=notes.find(n=>n.id===t.noteId)?.path.split('/').slice(0,-1).join('/');if(!folder)continue;const list=result.get(folder)??[];list.push(t);result.set(folder,list);
 }return result;
}
