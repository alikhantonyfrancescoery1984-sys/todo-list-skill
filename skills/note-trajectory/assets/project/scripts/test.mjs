import { build } from 'esbuild';
import { readdir,mkdir,rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await rm('.test-build',{recursive:true,force:true});
await mkdir('.test-build',{recursive:true});
const tests=(await readdir('tests')).filter(f=>f.endsWith('.test.ts'));
if(!tests.length){console.log('No behavior tests yet.');process.exit(0);}
await build({entryPoints:tests.map(f=>'tests/'+f),bundle:true,platform:'node',format:'esm',outdir:'.test-build',outExtension:{'.js':'.mjs'}});
const result=spawnSync(process.execPath,['--test',...tests.map(f=>'.test-build/'+f.replace('.ts','.mjs'))],{stdio:'inherit'});process.exitCode=result.status??1;
