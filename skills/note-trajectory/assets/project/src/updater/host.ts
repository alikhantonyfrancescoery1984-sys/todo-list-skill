import {Modal,Notice,apiVersion,normalizePath,requestUrl,type App,type Plugin} from 'obsidian';
import {checkUpdate,downloadUpdate,installUpdate,UPDATE_FILES,type UpdateRelease,type UpdateHttp} from './core';
const http:UpdateHttp={async get(url){const r=await requestUrl({url,throw:false});return {status:r.status,text:r.text}}};
/** No startup requests. User invokes the command and confirms each version. */
export function registerUpdateCommand(plugin:Plugin,ready:()=>Promise<void>):void{
 let busy=false;plugin.addCommand({id:'check-plugin-update',name:'检查更新',callback:()=>{if(busy){new Notice('正在检查或安装更新。');return}busy=true;void (async()=>{try{const release=await checkUpdate(http,plugin.manifest.version);if(!release){new Notice('当前已是最新版本。');return}await new Promise<void>(resolve=>{new UpdateModal(plugin.app,release,plugin.manifest.version,async()=>{const bundle=await downloadUpdate(http,release,apiVersion);await ready();const dir=plugin.manifest.dir;if(!dir||!normalizePath(dir).endsWith('/note-trajectory'))throw new Error('插件安装目录不匹配。');const adapter=plugin.app.vault.adapter;await installUpdate({read:name=>adapter.read(normalizePath(dir+'/'+name)),write:(name,text)=>adapter.write(normalizePath(dir+'/'+name),text),async backup(files){const path=normalizePath(dir+'/.update-backup/'+plugin.manifest.version+'-'+Date.now());await adapter.mkdir(path);for(const name of UPDATE_FILES)await adapter.write(path+'/'+name,files[name]);return path}},bundle,plugin.manifest.version);new Notice('新版程序已安装。请关闭再开启“待办清单”插件加载新版；待办数据保留。',15000);},resolve).open()});}catch(e){new Notice('检查更新失败：'+String(e),10000)}finally{busy=false}})();}});
}
class UpdateModal extends Modal {
 private installing=false;
 close():void{if(!this.installing)super.close()}
 constructor(app:App,private release:UpdateRelease,private current:string,private install:()=>Promise<void>,private finish:()=>void){super(app)}
 onOpen():void{this.setTitle('待办清单发现新版本');this.contentEl.createEl('p',{text:this.current+' → '+this.release.version});this.contentEl.createEl('p',{text:this.release.notes||'作者未提供更新说明。'});this.contentEl.createEl('p',{text:'确认后下载校验程序、备份并更新三个插件文件；不会覆盖data.json。安装后需要关闭再开启插件。'});const error=this.contentEl.createEl('p',{attr:{role:'alert'}}),actions=this.contentEl.createDiv({cls:'modal-button-container'}),cancel=actions.createEl('button',{text:'暂不更新'}),install=actions.createEl('button',{text:'确认更新',cls:'mod-cta'});cancel.onclick=()=>this.close();install.onclick=()=>{this.installing=true;cancel.disabled=install.disabled=true;install.textContent='正在更新…';void this.install().then(()=>{this.installing=false;this.close()},e=>{this.installing=false;error.textContent=String(e);cancel.disabled=install.disabled=false;install.textContent='重试更新'})};}
 onClose():void{this.finish();this.contentEl.empty()}
}
