const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const base=process.env.RESONANT_TEST_URL||'http://127.0.0.1:5178/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.locator('[data-mode="duo"]').click();await page.locator('[data-action="start"]').click();
  await page.locator('.draft-modal').waitFor();assert.equal(await page.locator('[data-relic]').count(),3);assert.equal(await page.locator('[data-action="reroll"]').count(),0);
  const draft=await page.evaluate(()=>{const w=window.resonant.world;return{room:w.room,time:w.time,choices:w.choices.map(r=>({id:r.id,path:r.path,core:r.core})),tokens:w.growth.rerolls};});
  assert.ok(draft.choices.every(r=>r.core));assert.equal(new Set(draft.choices.map(r=>r.path)).size,3);assert.equal(draft.room,0);assert.equal(draft.time,0);assert.equal(draft.tokens,2);
  await fs.mkdir(path.join(__dirname,'../qa'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../qa/growth-draft.png')});
  const oath=draft.choices[0];await page.locator('[data-relic="'+oath.id+'"]').click();
  await page.waitForFunction(()=>window.resonant.world.phase==='playing');assert.equal(await page.locator('#build-summary').isVisible(),true);
  await page.locator('#build-summary').click();await page.locator('.build-modal').waitFor();assert.equal(await page.evaluate(()=>window.resonant.world.phase),'paused');assert.equal(await page.locator('[data-build-path]').count(),4);
  await page.locator('[data-codex-tab="catalog"]').click();assert.equal(await page.locator('.codex-relic').count(),38);
  for(const style of['relay','bulwark','vortex','rescue']){await page.locator('[data-build-filter="'+style+'"]').click();assert.equal(await page.locator('.codex-relic').count(),5);}
  await page.locator('[data-build-filter="common"]').click();assert.equal(await page.locator('.codex-relic').count(),18);
  await page.locator('[data-action="close-build"]').first().click();await page.locator('[data-action="resume"]').click();
  // Reward fixture starts at two path ranks. The next choice must show and activate the 3-rank milestone.
  await page.evaluate(style=>{const w=window.resonant.world;const support={relay:'relay_refund',bulwark:'bulwark_capacity',vortex:'vortex_thread',rescue:'rescue_mend'}[style];w.applyRelic(support);w.phase='reward';w.choices=w.offerRelics();},oath.path);
  await page.locator('[data-action="reroll"]').waitFor();
  const old=await page.locator('[data-relic]').evaluateAll(items=>items.map(e=>e.getAttribute('data-relic')));
  await page.locator('[data-action="reroll"]').click();assert.equal(await page.evaluate(()=>window.resonant.world.growth.rerolls),1);
  const rolled=await page.locator('[data-relic]').evaluateAll(items=>items.map(e=>e.getAttribute('data-relic')));assert.ok(rolled.every(id=>!old.includes(id)));
  const focus=await page.evaluate(()=>{const w=window.resonant.world;return w.choices.find(r=>r.path===w.growth.path).id;});
  assert.match(await page.locator('[data-relic="'+focus+'"]').innerText(),/激活 3 印记/);await page.screenshot({path:path.join(__dirname,'../qa/growth-reward.png')});
  await page.locator('[data-relic="'+focus+'"]').click();await page.locator('[data-route]').first().click();
  await page.locator('#build-summary').click();await page.locator('.build-modal').waitFor();assert.equal(await page.locator('[data-build-path="'+oath.path+'"] .path-bonus.unlocked').count(),1);
  await page.screenshot({path:path.join(__dirname,'../qa/growth-build.png')});
  await page.setViewportSize({width:960,height:600});const modal=await page.locator('.build-modal').boundingBox();assert.ok(modal.x>=0&&modal.y>=0&&modal.y+modal.height<=600.5);assert.equal(await page.getByRole('button',{name:'关闭构筑手册'}).isVisible(),true);
  assert.deepEqual(errors,[]);console.log('PASS: random oath draft, 38-entry filtered codex, shared rank preview, reroll, milestone activation, pause and 960x600 layout; no browser errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
