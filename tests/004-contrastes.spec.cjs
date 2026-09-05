const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.goto('/plannr.html');await page.waitForFunction(()=>workspaceReady);});
async function contrasts(page,selector){return page.locator(selector).evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>{
 const parse=s=>s.match(/[\d.]+/g).map(Number); const lum=c=>{const v=c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722};
 const chain=[];for(let p=el;p;p=p.parentElement)chain.unshift(p);let bg=[255,255,255];for(const p of chain){const c=parse(getComputedStyle(p).backgroundColor),a=c[3]??1;bg=bg.map((n,i)=>n*(1-a)+c[i]*a)}
 const a=lum(parse(getComputedStyle(el).color)),b=lum(bg);return {label:el.className+' '+el.textContent.trim().slice(0,35),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
}));}
async function readable(page,selector){for(const item of await contrasts(page,selector))expect(item.ratio,item.label).toBeGreaterThanOrEqual(4.5);}
for(const theme of ['light','dark']){
 test(`004 contraste interactif du tableau ${theme}`,async({page})=>{
  await page.evaluate(t=>setTheme(t),theme);const selector='tr[data-risk-id="1.2"]';const row=page.locator(selector);
  await row.hover();await readable(page,selector+' .editable-risk-title,'+selector+' .responsable-cell,'+selector+' .editable-depends,'+selector+' input,'+selector+' select,'+selector+' .task-details-button');
  await page.mouse.move(0,0);await row.locator('.task-details-button').focus();await readable(page,selector+' .editable-risk-title');
  await row.evaluate(el=>{el.classList.add('row-flash');el.querySelectorAll('td').forEach(td=>td.getAnimations().forEach(a=>{a.pause();a.currentTime=0;}))});
  for(const ms of [0,650,1300]){await row.evaluate((el,ms)=>el.querySelectorAll('td').forEach(td=>td.getAnimations().forEach(a=>a.currentTime=ms)),ms);await readable(page,selector+' .editable-risk-title,'+selector+' .responsable-cell');}
  await page.locator('#sticky-toggle-btn').click();await readable(page,'#sticky-toggle-btn,.gantt-controls button');
  await page.locator('.task-details-button').first().click();await readable(page,'#task-form label,#task-form small,#task-form input,#task-form textarea,#task-form select,#task-form button');
 });
 for(const width of [1440,768,390])test(`004 en-tête compact ${theme} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.evaluate(t=>setTheme(t),theme);await page.locator('.zoom-btn[data-span="30"]').click();
  const layout=await page.evaluate(()=>{const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return {overflow:document.documentElement.scrollWidth>innerWidth,title:rect(document.querySelector('.gantt-heading h3')),buttons:[...document.querySelectorAll('.gantt-controls button')].filter(el=>el.getClientRects().length).map(rect),pin:rect(document.querySelector('#sticky-toggle-btn'))}});
  expect(layout.overflow).toBe(false);expect(layout.pin.width).toBe(32);expect(layout.pin.height).toBe(32);
  for(let i=0;i<layout.buttons.length;i++)for(const b of layout.buttons.slice(i+1)){const a=layout.buttons[i];expect(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1).toBe(false)}
  if(width===1440)expect(Math.abs(layout.pin.y-layout.title.y)).toBeLessThan(5);
  await expect(page.locator('#gantt-content')).not.toHaveClass(/collapsed/);
  await page.locator('#sticky-toggle-btn').click();await expect(page.locator('#sticky-toggle-btn')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#sticky-section')).not.toHaveClass(/sticky-disabled/);
  await page.reload();await expect(page.locator('#sticky-toggle-btn')).toHaveAttribute('aria-pressed','true');
  await page.locator('.gantt-heading h3 button').click();await expect(page.locator('#gantt-content')).toHaveClass(/collapsed/);await expect(page.locator('.gantt-heading h3 button')).toHaveAttribute('aria-expanded','false');
 });
}
test('004 impression claire depuis le thème sombre',async({page})=>{await page.evaluate(()=>setTheme('dark'));await page.emulateMedia({media:'print'});await readable(page,'.editable-risk-title,.responsable-cell,.dashboard-card-label,.deadline-badge.exceeded');await expect(page.locator('.gantt-controls')).toBeHidden();});
