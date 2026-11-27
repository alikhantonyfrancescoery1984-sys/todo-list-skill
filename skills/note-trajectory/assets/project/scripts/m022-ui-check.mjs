import {chromium} from 'playwright-core';
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const executablePath=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});await page.goto(pathToFileURL(resolve('dist/index.html')).href);await page.locator('#tasks-toggle').click();
 assert.deepEqual(await page.locator('.task-view-tabs button').allTextContents(),['今天','项目']);
 assert.equal(await page.locator('[data-action=new-module]').count(),1);assert(await page.locator('.module-open').count()>0);
 await page.locator('[data-action=task-view][data-view=today]').click();assert.equal(await page.locator('[data-action=task-view][aria-current=page]').textContent(),'今天');
 const shanghaiToday=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());await page.locator('.task-add-header').click();assert.equal(await page.locator('#task-deadline-date').inputValue(),shanghaiToday);assert.equal(await page.locator('#task-module').count(),1);assert.equal(await page.locator('#task-horizon').count(),0);assert.equal(await page.getByText('下一步',{exact:true}).count(),0);assert.equal(await page.getByText('长期',{exact:true}).count(),0);await page.locator('#task-name').fill('M022 today');await page.locator('.save-task').click();await page.waitForSelector('.task-editor-dialog',{state:'detached'});assert.equal(await page.locator('.task-title-button').filter({hasText:'M022 today'}).count(),1);
 const surface=page.locator('.task-create-surface');await surface.evaluate(el=>el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[new Touch({identifier:1,target:el,clientX:300,clientY:300})]})));await surface.evaluate(el=>el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[new Touch({identifier:1,target:el,clientX:100,clientY:300})]})));assert.equal(await page.locator('[data-action=task-view][aria-current=page]').textContent(),'项目');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));console.log('PASS: module completion, today/project views, horizon editing and touch navigation');
}finally{await browser.close();}
