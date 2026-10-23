const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs/promises');
const url=process.env.RESONANT_TEST_URL||'https://yexiaotingonemt-jpg.github.io/resonant-depths/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 try{
  const host=await(await browser.newContext({viewport:{width:1280,height:800}})).newPage(),guest=await(await browser.newContext({viewport:{width:1280,height:800}})).newPage();
  const errors=[],missing=[];for(const p of[host,guest]){p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push([r.status(),r.url()]);});}
  await host.goto(url);await host.locator('[data-mode="online"]').click();await host.locator('[data-action="net-create"]').first().click();await host.getByText('房间已创建，等待搭档加入',{exact:true}).waitFor({timeout:30000});
  const code=await host.locator('.room-code-block strong').innerText();assert.match(code,/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await guest.goto(url);await guest.locator('[data-mode="online"]').click();await guest.locator('#room-code').click();await guest.locator('#room-code').fill(code);await guest.locator('[data-action="net-join"]').click();await guest.locator('[data-action="net-ready"]').click();await host.locator('[data-action="net-start"]:enabled').click();
  await host.locator('.hud').waitFor();await guest.locator('.hud').waitFor();
  await guest.keyboard.down('d');await guest.waitForTimeout(500);await guest.keyboard.up('d');await guest.keyboard.press('e');await host.waitForTimeout(200);assert.match(await host.locator('#skill1').innerText(),/[1-9]/);assert.match(await guest.locator('#skill1').innerText(),/[1-9]/);
  await fs.mkdir(path.join(__dirname,'../qa'),{recursive:true});await host.screenshot({path:path.join(__dirname,'../qa/release-online.png')});
  await guest.keyboard.press('Escape');await host.locator('[data-action="resume"]').waitFor();await guest.locator('[data-action="resume"]').waitFor();
  await guest.reload();await guest.locator('[data-action="net-join"]').click();await guest.locator('[data-action="resume"]').waitFor({timeout:30000});await guest.locator('[data-action="resume"]').click();await host.locator('[data-action="resume"]').waitFor({state:'hidden'});
  await host.keyboard.press('Escape');await host.locator('[data-action="menu"]').click();await guest.getByText(/房主已关闭房间|连接中断/).first().waitFor();
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS: deployed release, manual room code join, ready/start, remote skill, shared pause, refresh/rejoin, host leave; no failed HTTP requests or page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
