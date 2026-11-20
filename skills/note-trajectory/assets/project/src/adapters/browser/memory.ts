import type { BoardPort, Clock, StateStore } from '../../ports';
import type { State } from '../../core/model';
export class SimulatedClock implements Clock { constructor(private value:Date){}now():Date{return new Date(this.value);} advance(minutes:number):void{this.value=new Date(this.value.getTime()+minutes*60000);} }
export class MemoryStore implements StateStore {value:State|null=null; failNext=false;async load(){return structuredClone(this.value);}async save(state:State){if(this.failNext){this.failNext=false;throw new Error('模拟存储失败');}this.value=structuredClone(state);}}
export class MemoryBoard implements BoardPort {failNext=false;constructor(public markdown:string){}async read(){return this.markdown;}async process(fn:(current:string)=>string){if(this.failNext){this.failNext=false;throw new Error('模拟看板写入失败，可重试。');}this.markdown=fn(this.markdown);return this.markdown;}}
