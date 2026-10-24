const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
(async()=>{
 const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html','Permissions-Policy':'gamepad=()'});res.end('<iframe src="http://127.0.0.1:5178/" style="width:1400px;height:900px"></iframe>');});
 await new Promise(resolve=>server.listen(58933,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const scenario of ['normal','restricted','audio-unavailable','audio-rejected']){
   const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   if(scenario==='audio-unavailable')await page.addInitScript(()=>{Object.defineProperty(window,'AudioContext',{value:undefined,configurable:true});});
   if(scenario==='audio-rejected')await page.addInitScript(()=>{window.AudioContext=class{state='suspended';resume(){return Promise.reject(new DOMException('Test: autoplay denied','NotAllowedError'));}};});
   await page.goto(scenario==='restricted'?'http://127.0.0.1:58933/':'http://127.0.0.1:5178/');
   const frame=scenario==='restricted'?page.frames().find(f=>f.url().startsWith('http://127.0.0.1:5178')):page.mainFrame();
   await frame.waitForSelector('[data-action="start"]');
   const policy=await frame.evaluate(()=>{try{navigator.getGamepads();return'allowed';}catch(e){return e.name;}});
   if(scenario==='restricted')assert.equal(policy,'SecurityError');else assert.equal(policy,'allowed');
   await frame.locator('[data-action="start"]').click();await frame.locator('[data-relic]').first().click();await page.waitForTimeout(200);
   const snapshot=()=>frame.evaluate(()=>{const w=window.resonant.world;return{phase:w.phase,time:w.time,x:w.players[0].x,ai:{x:w.players[1].x,y:w.players[1].y}};});
   const before=await snapshot();await page.keyboard.down('d');await page.waitForTimeout(750);await page.keyboard.up('d');const after=await snapshot();
   assert.equal(after.phase,'playing');assert.ok(after.time>before.time+.4,JSON.stringify({scenario,before,after}));assert.ok(after.x>before.x+80);assert.notDeepEqual(after.ai,before.ai);
   await page.keyboard.press('Escape');await page.waitForTimeout(150);const paused=await snapshot();assert.equal(paused.phase,'paused');await page.waitForTimeout(450);assert.equal((await snapshot()).time,paused.time);
   await frame.locator('[data-action="resume"]').click();await page.waitForTimeout(550);assert.ok((await snapshot()).time>paused.time+.3);
   assert.deepEqual(errors,[]);console.log(JSON.stringify({scenario,policy,before:before.time,after:after.time,keyboardMoved:after.x-before.x,aiAdvanced:true,pauseResume:true,uncaughtErrors:errors}));
   await page.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
