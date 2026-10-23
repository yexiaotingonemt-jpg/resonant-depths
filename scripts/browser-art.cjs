const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const base=process.env.RESONANT_TEST_URL||'http://127.0.0.1:5178/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let releaseArt;const gate=new Promise(resolve=>releaseArt=resolve);await page.route('**/assets/flare/ember.png',async route=>{await gate;await route.continue();});
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('[data-action="start"]').waitFor();
  assert.equal(await page.locator('[data-action="start"]').isDisabled(),true);assert.equal(await page.locator('.asset-loading').isVisible(),true);releaseArt();
  await page.waitForFunction(()=>window.resonant?.scene.actors.views.size===2);
  assert.equal(await page.locator('[data-action="start"]').isEnabled(),true);assert.equal(await page.locator('.asset-loading').count(),0);
  await page.screenshot({path:path.join(__dirname,'../preview.jpg'),quality:90});
  await page.locator('[data-mode="duo"]').click();await page.locator('[data-action="start"]').click();
  await page.evaluate(()=>{const w=window.resonant.world;w.enemies=[];w.spawnTimer=100;});
  const dirs=[['a'],['a','w'],['w'],['w','d'],['d'],['d','s'],['s'],['s','a']];
  for(let i=0;i<dirs.length;i++){
   for(const key of dirs[i])await page.keyboard.down(key);await page.waitForTimeout(140);
   const frame=await page.evaluate(()=>{const v=window.resonant.scene.actors.views.get('p0');return{frame:v.image.frame.name,rotation:v.image.rotation,x:v.image.x,y:v.image.y,origin:[v.image.originX,v.image.originY]};});
   assert.match(frame.frame,new RegExp('^run-'+i+'-'));assert.equal(frame.rotation,0);assert.deepEqual(frame.origin,[.5,.75]);
   for(const key of dirs[i])await page.keyboard.up(key);
   await page.waitForTimeout(50);assert.match(await page.evaluate(()=>window.resonant.scene.actors.views.get('p0').image.frame.name),new RegExp('^stance-'+i+'-'));
  }
  await page.keyboard.press('e');await page.waitForTimeout(80);assert.match(await page.evaluate(()=>window.resonant.scene.actors.views.get('p0').image.frame.name),/^swing-/);
  await page.keyboard.press('Enter');await page.waitForTimeout(80);assert.match(await page.evaluate(()=>window.resonant.scene.actors.views.get('p1').image.frame.name),/^cast-/);
  await page.evaluate(()=>{const w=window.resonant.world;for(const[k,x,y]of[['chaser',390,320],['ranged',850,300],['brute',970,510],['dasher',270,500]])w.spawnEnemy(k,x,y);});
  await page.waitForTimeout(450);await fs.mkdir(path.join(__dirname,'../qa'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../qa/formal-art-gameplay.png')});
  await page.evaluate(()=>{const w=window.resonant.world;w.players[1].hp=0;w.players[1].down=true;});await page.waitForTimeout(100);assert.match(await page.evaluate(()=>window.resonant.scene.actors.views.get('p1').image.frame.name),/^die-/);
  assert.deepEqual(errors,[]);console.log('PASS: real renderer uses eight authored run/idle views, no rotation, stable anchors, sword/cast/death clips; screenshots saved');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
