const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.setViewportSize({width:1600,height:950});await page.goto('/plannr.html');await page.waitForFunction(()=>workspaceReady);});
for(const mode of ['compact','cascade','consolide'])test(`005 défilement utile uniquement ${mode}`,async({page})=>{
 await page.evaluate(mode=>setGanttView(mode),mode);
 const fits=()=>page.evaluate(()=>{const e=document.querySelector('.gantt-scroll');return e.clientWidth===e.scrollWidth&&ganttChart.width===e.clientWidth});
 await expect.poll(fits).toBe(true);
 // Une variation du conteneur sans resize de fenêtre reproduit l'épinglage avec barre verticale.
 await page.locator('#sticky-section').evaluate(el=>el.style.width='1240px');await expect.poll(fits).toBe(true);
 await page.locator('#sticky-toggle-btn').click();await expect.poll(fits).toBe(true);
 await page.locator('#sticky-section').evaluate(el=>el.style.width='');await page.setViewportSize({width:390,height:950});
 await expect.poll(()=>page.evaluate(()=>ganttChart.width)).toBe(1120);
 expect(await page.locator('.gantt-scroll').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
 await page.locator('.gantt-scroll').evaluate(el=>el.scrollLeft=100);expect(await page.locator('.gantt-scroll').evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 await page.setViewportSize({width:1600,height:950});await expect.poll(fits).toBe(true);
 const right=await page.evaluate(()=>{const pin=document.querySelector('#sticky-toggle-btn').getBoundingClientRect(),group=document.querySelector('.gantt-controls').getBoundingClientRect();return {gap:group.right-pin.right,last:document.querySelector('.gantt-controls').lastElementChild.id}});expect(right).toEqual({gap:0,last:'sticky-toggle-btn'});
});
for(const theme of ['light','dark'])test(`005 pourcentage discret et éditable ${theme}`,async({page})=>{
 await page.evaluate(t=>setTheme(t),theme);const input=page.locator('.editable-progress[data-risk-id="2.1"]');await input.fill('65');await input.dispatchEvent('change');await expect(input).toHaveValue('65');
 expect(await page.evaluate(()=>risks.find(t=>t.id==='2.1').progress)).toBe(65);
 await expect(page.locator('.progress-mini')).toHaveCount(0);const display=await input.evaluate(el=>({height:el.getBoundingClientRect().height,suffix:el.parentElement.textContent.trim(),label:el.getAttribute('aria-label')}));expect(display.height).toBe(26);expect(display.suffix).toBe('%');expect(display.label).toContain('%');
 const closed=page.locator('.editable-progress[data-risk-id="1.1"]');await expect(closed).toBeDisabled();
 await expect(closed).toHaveCSS('border-top-color','rgba(0, 0, 0, 0)');await expect(closed).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await page.emulateMedia({media:'print'});await expect(input).toBeVisible();await expect(page.locator('.progress-value').first()).toBeVisible();
});
