export const UPDATE_REPO='alikhantonyfrancescoery1984-sys/todo-list-skill';
export const UPDATE_FILES=['main.js','styles.css','manifest.json'] as const;
export type UpdateFile=typeof UPDATE_FILES[number];
export type UpdateBundle=Record<UpdateFile,string>;
export interface UpdateRelease {version:string;urls:Record<UpdateFile|'update.json',string>;notes:string}
export interface UpdateHttp {get(url:string):Promise<{status:number;text:string}>}
export interface UpdateStore {read(file:UpdateFile):Promise<string>;write(file:UpdateFile,text:string):Promise<void>;backup(files:UpdateBundle):Promise<string>}
export function versionCompare(a:string,b:string):number{const parse=(s:string)=>{if(!/^\d+\.\d+\.\d+$/.test(s))throw new Error('版本格式需要 x.y.z。');const n=s.split('.').map(Number);if(n.some(v=>!Number.isSafeInteger(v)))throw new Error('版本数字过大。');return n};const x=parse(a),y=parse(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]!>y[i]!?1:-1;return 0}
const get=async(http:UpdateHttp,url:string,max=8_000_000)=>{const r=await http.get(url);if(r.status!==200)throw new Error(r.status===403||r.status===429?'GitHub请求受限，请稍后重试。':'更新下载失败，HTTP '+r.status);if(new TextEncoder().encode(r.text).length>max)throw new Error('更新文件超过大小上限。');return r.text};
export async function checkUpdate(http:UpdateHttp,current:string):Promise<UpdateRelease|null>{
 const raw=await get(http,'https://api.github.com/repos/'+UPDATE_REPO+'/releases/latest',500_000),r=JSON.parse(raw);if(r.draft||r.prerelease)throw new Error('只支持正式版本更新。');const version=String(r.tag_name??'').replace(/^v/,'');if(versionCompare(version,current)<=0)return null;
 const urls={} as UpdateRelease['urls'];for(const name of [...UPDATE_FILES,'update.json'] as const){const matches=Array.isArray(r.assets)?r.assets.filter((a:{name:string})=>a.name===name):[];if(matches.length!==1)throw new Error('该版本缺少直接更新附件 '+name+'，请作者执行文档中的发布命令。');const url=matches[0].browser_download_url,prefix='https://github.com/'+UPDATE_REPO+'/releases/download/'+encodeURIComponent(r.tag_name)+'/';if(url!==prefix+name)throw new Error('更新附件来源不符合本项目仓库。');urls[name]=url;}return {version,urls,notes:typeof r.body==='string'?r.body.slice(0,4000):''};
}
export async function downloadUpdate(http:UpdateHttp,release:UpdateRelease,hostVersion:string):Promise<UpdateBundle>{
 const meta=JSON.parse(await get(http,release.urls['update.json'],20_000));if(meta.version!==release.version||meta.pluginId!=='note-trajectory'||!meta.files)throw new Error('更新校验清单不匹配。');const bundle={} as UpdateBundle;
 for(const name of UPDATE_FILES){const content=await get(http,release.urls[name]);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)))].map(v=>v.toString(16).padStart(2,'0')).join('');if(meta.files[name]!==hash)throw new Error('更新文件校验失败：'+name);bundle[name]=content;}
 const manifest=JSON.parse(bundle['manifest.json']);if(manifest.id!=='note-trajectory'||manifest.version!==release.version||versionCompare(hostVersion,manifest.minAppVersion)<0)throw new Error('插件身份、版本不匹配或Obsidian版本过低。');if(!bundle['main.js'].trim()||!bundle['styles.css'].trim())throw new Error('更新程序文件为空。');return bundle;
}
export async function installUpdate(store:UpdateStore,bundle:UpdateBundle,current:string):Promise<string>{
 const previous={} as UpdateBundle;for(const name of UPDATE_FILES)previous[name]=await store.read(name);if(JSON.parse(previous['manifest.json']).version!==current)throw new Error('本机程序已被其它方式更新，请先重载再检查。');
 const backup=await store.backup(previous);try{for(const name of UPDATE_FILES)await store.write(name,bundle[name]);for(const name of UPDATE_FILES)if(await store.read(name)!==bundle[name])throw new Error('写入核验失败：'+name);}catch(error){const failed:string[]=[];for(const name of UPDATE_FILES)try{await store.write(name,previous[name]);}catch{failed.push(name)}throw new Error('更新失败；'+(failed.length?'部分回滚失败，请从备份恢复 '+failed.join('、'):'已恢复原程序')+'。备份：'+backup+'；'+String(error));}return backup;
}
