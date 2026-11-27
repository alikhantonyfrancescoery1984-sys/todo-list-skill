/** Apply the latest editor revision before accepting its asynchronous index event. */
export class EditorSync<F> {
 private pending=new Map<F,{timer:number;text:string}>();
 constructor(private edit:(file:F,text:string)=>void,private index:(file:F,text:string)=>void,private schedule:(fn:()=>void,ms:number)=>number,private cancel:(timer:number)=>void,private delay=250){}
 queue(file:F,text:string):void{this.drop(file);const timer=this.schedule(()=>this.flush(file),this.delay);this.pending.set(file,{timer,text});}
 indexed(file:F,text:string):void{this.flush(file);this.index(file,text);}
 flush(file?:F):void{for(const [key,p] of this.pending){if(file!==undefined&&file!==key)continue;this.pending.delete(key);this.cancel(p.timer);this.edit(key,p.text);}}
 drop(file:F):void{const p=this.pending.get(file);if(p)this.cancel(p.timer);this.pending.delete(file);}
}
