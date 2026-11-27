import type {State} from './model';
/** One observed note per local day; no duration or active session. */
export function observeNote(state:State,noteId:string,date:string):void{if(!state.observations.some(o=>o.noteId===noteId&&o.date===date))state.observations.push({noteId,date});}
