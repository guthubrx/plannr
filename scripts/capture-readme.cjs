// Captures reproductibles, exclusivement à partir du jeu de démonstration fictif.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:/,route=>route.abort());
  await page.clock.setFixedTime(new Date('2026-09-05T10:00:00Z'));
  await page.goto(pathToFileURL(path.join(root,'plannr.html')).href);
  await page.waitForFunction(()=>workspaceReady);
  await page.locator('#import-file').setInputFiles(path.join(root,'docs/examples/demo-v2.4.json'));
  await page.waitForFunction(()=>risks.length===7);
  await page.waitForFunction(()=>!document.querySelector('.toast'));
  const out=path.join(root,'docs/screenshots');fs.mkdirSync(out,{recursive:true});
  const capture=(selector,name)=>page.locator(selector).screenshot({path:path.join(out,name+'.png')});
  for(const theme of ['dark','light']){
   await page.evaluate(t=>{setTheme(t);setGanttView('consolide')},theme);
   await page.evaluate(()=>scrollTo(0,0));
   const bottom=await page.locator('#sticky-section').evaluate(el=>el.getBoundingClientRect().bottom);
   await page.screenshot({path:path.join(out,'apercu-'+theme+'.png'),clip:{x:0,y:0,width:1440,height:Math.ceil(bottom+12)}});
  }
  await page.evaluate(()=>setGanttView('compact'));await capture('#sticky-section','gantt-compact');
  await page.evaluate(()=>document.getElementById('action-center').open=true);await capture('#action-center','actions');
  await page.setViewportSize({width:720,height:1100});await capture('#workload-section','charge');await page.setViewportSize({width:1440,height:1100});
  await page.evaluate(()=>openSettings());await capture('#settings-dialog','parametres');await page.keyboard.press('Escape');
  await page.evaluate(()=>openTaskPanel('3.2'));await page.locator('#milestone-fields').scrollIntoViewIfNeeded();await page.locator('#task-panel').evaluate(el=>el.scrollTop+=160);await capture('#milestone-fields','jalon');await page.keyboard.press('Escape');
  await page.evaluate(()=>openTaskPanel('2.1'));await page.locator('#schedule-simulation summary').click();await page.locator('#simulate-start').fill('2026-09-10');await page.locator('#schedule-simulation button').click();await capture('#simulation-dialog','simulation');
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('8 captures créées à partir de données fictives.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
