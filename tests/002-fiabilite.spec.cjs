const {test, expect} = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const task = (id, extra={}) => ({id, title:'Tâche '+id, startDate:'2026-06-01',endDate:'2026-06-05',statut:'statusNotTreated',assignedTo:'Alice',...extra});
const documentData = (tasks) => ({version:'2.3',appState:{title:'Planning de validation',subtitle:'Document complet',language:'fr'},phases:[{id:1,name:'Phase de validation',color:'#426b89',description:'Contexte',tasks}]});
async function importData(page, data) {
    await page.locator('#import-file').setInputFiles({name:'planning.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
    await expect(page.locator('.toast').last()).toContainText(/Document complet chargé|Full document loaded/);
}
async function exported(page) { return page.evaluate(()=>canonicalSnapshot()); }

test.beforeEach(async ({page})=>{
    page.runtimeErrors = []; page.on('pageerror', err => page.runtimeErrors.push(err.message));
    await page.goto('/plannr.html');
    await page.waitForFunction(()=>workspaceReady && history.length > 0);
});
test.afterEach(async ({page})=>{
    expect(page.runtimeErrors).toEqual([]);
    expect(await page.evaluate(()=>risks.every(task=>riskGroups.some(g=>g.tasks.includes(task))))).toBe(true);
});

test('002 import complet, annulation et restauration navigateur sans perte', async ({page})=>{
    const data=documentData([task('1.1',{effortDays:3,notes:'Note intégrale',progress:25})]);
    data.calendar={saturdayWorked:true,extraHolidays:['2026-06-03'],skippedHolidays:['2026-07-14']};
    data.baseline={savedAt:'2026-05-01T00:00:00Z',tasks:{'1.1':{startDate:'2026-05-04',endDate:'2026-05-08'}}};
    await importData(page,data);
    const before=await exported(page);
    expect(before.calendar).toEqual(data.calendar);
    expect(before.baseline).toEqual(data.baseline);
    expect(before.phases[0].tasks[0]).toMatchObject(data.phases[0].tasks[0]);
    await page.locator('select.status-dropdown').selectOption('statusTreated');
    await expect.poll(async()=> (await exported(page)).phases[0].tasks[0].progress).toBe(100);
    await page.locator('#undo-action').click();
    expect(await exported(page)).toEqual(before);
    await page.locator('#redo-action').click();
    await page.reload();
    expect((await exported(page)).phases[0].tasks[0].statut).toBe('statusTreated');
    expect((await exported(page)).baseline).toEqual(data.baseline);
});

test('002 panneau atomique, clavier, note et effort conservés', async ({page})=>{
    await importData(page,documentData([task('1.1')]));
    await page.locator('.task-details-button').click();
    await page.locator('[name="title"]').fill('Un titre complet et modifiable');
    await page.locator('[name="notes"]').fill('Une note\navec plusieurs paragraphes');
    await page.locator('[name="effortDays"]').fill('2.5');
    await page.locator('#task-form button[type="submit"]').click();
    expect((await exported(page)).phases[0].tasks[0]).toMatchObject({title:'Un titre complet et modifiable',effortDays:2.5,notes:'Une note\navec plusieurs paragraphes'});
    await page.locator('.notes-icon').click();
    await expect(page.locator('[name="notes"]')).toHaveValue('Une note\navec plusieurs paragraphes');
    await page.locator('[name="title"]').fill('Modification abandonnée');
    await page.keyboard.press('Escape');
    expect((await exported(page)).phases[0].tasks[0].title).toBe('Un titre complet et modifiable');
});

test('002 import invalide ne modifie pas le document', async ({page})=>{
    const before=await exported(page);
    await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({phases:[{id:1,name:'cassé',tasks:'incorrect'}]}))});
    await expect(page.locator('.toast').last()).toContainText('Import refusé');
    expect(await exported(page)).toEqual(before);
});

test('002 début déplacé et cascade préservent les jours ouvrés autour du 14 juillet', async ({page})=>{
    await importData(page,documentData([task('1.1',{startDate:'2026-07-06',endDate:'2026-07-10'}),task('1.2',{startDate:'2026-07-13',endDate:'2026-07-20',dependsOn:['1.1+2']})]));
    const before=await page.evaluate(()=>risks.map(t=>workingDaysBetween(t.startDate,t.endDate)));
    await page.locator('.editable-date[data-risk-id="1.1"][data-date-type="startDate"]').fill('2026-07-10');
    await page.locator('.editable-date[data-risk-id="1.1"][data-date-type="startDate"]').dispatchEvent('change');
    const state=await page.evaluate(()=>({durations:risks.map(t=>workingDaysBetween(t.startDate,t.endDate)),end:risks[0].endDate,successor:risks[1].startDate,expected:addWorkingDays(risks[0].endDate,3)}));
    expect(state.durations).toEqual(before);expect(state.end).toBe('2026-07-17');expect(state.successor).toBe(state.expected);
});

test('002 marges et chemin critique tiennent compte du lag et de branches parallèles', async ({page})=>{
    await importData(page,documentData([
        task('1.1',{endDate:'2026-06-01'}),
        task('1.2',{startDate:'2026-06-02',endDate:'2026-06-02',dependsOn:['1.1+5']}),
        task('1.3',{endDate:'2026-06-04'})
    ]));
    const result=await page.evaluate(()=>({critical:[..._criticalIds],margins:Object.fromEntries([...taskMargins].map(([id,m])=>[id,m.days]))}));
    expect(result.critical.sort()).toEqual(['1.1','1.2']);
    expect(result.margins['1.3']).toBe(3);
});

test('002 effort partagé et surcharge réelle, sans assimiler durée et effort', async ({page})=>{
    await page.clock.setFixedTime(new Date('2026-06-01T12:00:00Z'));
    await importData(page,documentData([task('1.1',{effortDays:5,assignedTo:'Alice, Bob'}),task('1.2',{effortDays:5}),task('1.3')]));
    const result=await page.evaluate(()=>computeWorkload().map(p=>({name:p.name,effort:p.effort,unknown:p.unknown,overload:[...p.days.values()].filter(n=>n>1).length})));
    expect(result).toEqual([{name:'Alice',effort:7.5,unknown:1,overload:5},{name:'Bob',effort:2.5,unknown:0,overload:0}]);
    await expect(page.locator('#workload-content')).toContainText('5 jours en surcharge');
});

test('002 filtres synchronisés, export et chemin critique complets', async ({page})=>{
    await importData(page,documentData([task('1.1',{title:'Alpha',assignedTo:'Alice'}),task('1.2',{title:'Bravo',assignedTo:'Bob'})]));
    await page.locator('#filter-person').selectOption('Bob');
    await expect(page.locator('tr[data-risk-id]:visible')).toHaveCount(1);
    expect(await page.evaluate(()=>ganttChart.options.readableRows.map(r=>r.task.id))).toEqual(['1.2']);
    expect((await exported(page)).phases[0].tasks).toHaveLength(2);
    await page.locator('#filter-query').fill('inexistant');
    await expect(page.locator('#filter-empty')).toBeVisible();
    expect(await page.evaluate(()=>ganttChart.options.readableRows.length)).toBe(0);
    await page.locator('.planning-filters button').click();
    await expect(page.locator('tr[data-risk-id]:visible')).toHaveCount(2);
});

test('002 insertion et suppression ne changent pas les références de dépendance', async ({page})=>{
    await importData(page,documentData([task('1.1'),task('1.2',{dependsOn:['1.1+2']})]));
    await page.evaluate(()=>addNewRiskAtPosition(1,0));
    expect((await exported(page)).phases[0].tasks.find(t=>t.id==='1.2').dependsOn).toEqual(['1.1+2']);
    page.on('dialog',d=>d.accept());
    await page.evaluate(()=>deleteRisk('1.1'));
    expect((await exported(page)).phases[0].tasks.find(t=>t.id==='1.2').dependsOn).toBeUndefined();
});

test('002 enregistrement distingue téléchargement et écriture fichier', async ({page})=>{
    await page.evaluate(()=>{window.showSaveFilePicker=undefined;});
    const download=page.waitForEvent('download');await page.evaluate(()=>saveDataToDisk());await download;
    await expect(page.locator('#save-status')).toContainText('Téléchargement lancé');
    await expect(page.locator('#save-status')).toHaveAttribute('data-dirty','true');
    await page.evaluate(()=>{window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async text=>{window.savedContent=text;},close:async()=>{}})});});
    await page.evaluate(()=>saveDataToDisk());
    await expect(page.locator('#save-status')).toHaveAttribute('data-dirty','false');
    expect(await page.evaluate(()=>window.savedContent.includes('window.PLANNR_DATA'))).toBe(true);
});

test('002 HTML exporté autonome conserve les données sans réseau', async ({page,browser})=>{
    await importData(page,documentData([task('1.1',{notes:'Texte <script> inerte',effortDays:2})]));
    const before=await exported(page);
    const download=page.waitForEvent('download');await page.evaluate(()=>exportToHTML());
    const file=await (await download).path();
    const dir=fs.mkdtempSync('/tmp/plannr-standalone-');const target=path.join(dir,'planning.html');fs.copyFileSync(file,target);
    const context=await browser.newContext({offline:true});const other=await context.newPage();const errors=[];other.on('pageerror',e=>errors.push(e.message));
    await other.goto('file://'+target);await other.waitForFunction(()=>workspaceReady);
    expect(await exported(other)).toEqual(before);expect(errors).toEqual([]);await context.close();
});

test('002 cycle importé refusé sans modifier le document', async ({page})=>{
    const before=await exported(page);
    await page.locator('#import-file').setInputFiles({name:'cycle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(documentData([task('1.1',{dependsOn:['1.2']}),task('1.2',{dependsOn:['1.1']})])))});
    await expect(page.locator('.toast').last()).toContainText('Cycle');
    expect(await exported(page)).toEqual(before);
});

test('002 langue et métadonnées survivent au rechargement', async ({page})=>{
    const data=documentData([task('1.1')]);data.appState.language='en';
    await importData(page,data);const before=await exported(page);await page.reload();
    expect(await exported(page)).toEqual(before);
    await expect(page.locator('#filter-query')).toHaveAttribute('placeholder','Search tasks, notes…');
});

test('002 migration des champs navigateur historiques', async ({page})=>{
    await page.evaluate(()=>{localStorage.removeItem(LS_PREFIX+'document-v3');localStorage.setItem(LS_PREFIX+'risk-title-1.1','Titre conservé');localStorage.setItem(LS_PREFIX+'risk-responsable-1.1','Louise');});
    await page.reload();
    expect((await exported(page)).phases[0].tasks.find(t=>t.id==='1.1')).toMatchObject({title:'Titre conservé',assignedTo:'Louise'});
});

test('002 une référence hors fenêtre ne déborde pas sur les libellés', async ({page})=>{
    const data=documentData([task('1.1',{title:'Titre de la tâche',effortDays:2})]);
    data.baseline={savedAt:'2026-05-01T00:00:00Z',tasks:{'1.1':{startDate:'2026-01-01',endDate:'2026-06-05'}}};
    await importData(page,data);
    await page.evaluate(()=>{ganttZoomAnchorMs=Date.parse('2026-06-01');setGanttZoom(14);});
    expect(await page.evaluate(()=>{const c=ganttChart;return c.$labelBoxes.every(b=>b.x>=0&&b.x+b.width<c.scales.x.left);})).toBe(true);
});

for (const theme of ['light','dark']) for (const mode of ['cascade','compact','consolide']) for(const width of [1440,768,390]) {
    test(`002 géométrie sans collision ${theme} ${mode} à ${width}px`, async ({page},testInfo)=>{
        await page.setViewportSize({width,height:1000});
        const tasks=Array.from({length:12},(_,i)=>task('1.'+(i+1),{title:('Un intitulé long qui reste lisible et accessible pour la préparation du projet ').repeat(2),isMilestone:i<6,endDate:i<6?'2026-06-01':'2026-06-05'}));
        await importData(page,documentData(tasks));await page.evaluate(({mode,theme})=>{setTheme(theme);setGanttView(mode);},{mode,theme});
        const geometry=await page.evaluate(()=>{
            const chart=ganttChart, boxes=chart.$labelBoxes;
            const overlaps=(a,b)=>a.x<b.x+b.width-0.5&&a.x+a.width>b.x+0.5&&a.y<b.y+b.height-0.5&&a.y+a.height>b.y+0.5;
            const collisions=[];
            for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(overlaps(boxes[i],boxes[j]))collisions.push([boxes[i].id,boxes[j].id]);
            const bars=chart.options.readableRows.map(row=>({x:chart.scales.x.getPixelForValue(Date.parse(row.task.startDate))-(row.task.isMilestone?24:0),y:chart.scales.y.getPixelForValue(row.y)-16,width:row.task.isMilestone?48:Math.max(1,chart.scales.x.getPixelForValue(Date.parse(row.task.endDate))-chart.scales.x.getPixelForValue(Date.parse(row.task.startDate))),height:32}));
            return {headersOnContent:chart.$headerBoxes.some(header=>[...boxes,...bars].some(box=>overlaps(header,box))),collisions,barCollisions:bars.some((bar,i)=>bars.slice(i+1).some(other=>overlaps(bar,other))),textOnBars:boxes.some(box=>bars.some(bar=>overlaps(box,bar))),count:boxes.length,overflow:document.documentElement.scrollWidth>innerWidth+1};
        });
        expect(geometry).toEqual({headersOnContent:false,collisions:[],barCollisions:false,textOnBars:false,count:12,overflow:false});
        await page.screenshot({path:testInfo.outputPath(`${theme}-${mode}-${width}.png`),fullPage:true});
    });
}


test('002 thème mémorisé, indépendant du document, rendu PDF clair et retour sombre', async ({page})=>{
    const before = await exported(page);
    const historyBefore = await page.evaluate(()=>history.length);
    await page.locator('#theme-selector').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    expect(await exported(page)).toEqual(before);
    expect(await page.evaluate(()=>history.length)).toBe(historyBefore);
    await page.reload();
    await expect(page.locator('#theme-selector')).toHaveValue('dark');
    const download = page.waitForEvent('download');
    await page.evaluate(()=>exportToPDF()); await download;
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    expect(await page.evaluate(()=>ganttColors().surface)).toBe('#182330');
    expect(await exported(page)).toEqual(before);
    await page.locator('#theme-selector').selectOption('light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

for (const mode of ['compact','consolide']) {
    test(`002 espacement adapté aux titres courts et longs en ${mode}`, async ({page})=>{
        await importData(page,documentData([
            task('1.1',{title:'Titre court'}),
            task('1.2',{title:'Préparation des documents et validation des besoins du projet'}),
            task('1.3',{title:('Un titre très long pour vérifier la lisibilité de toutes les informations ').repeat(3)})
        ]));
        await page.evaluate(m=>setGanttView(m),mode);
        const geometry=await page.evaluate(()=>{
            const c=ganttChart, rows=c.options.readableRows;
            return rows.map(row=>{
                const box=c.$labelBoxes.find(b=>b.id===row.task.id);
                const barTop=c.scales.y.getPixelForValue(row.y)-16;
                return {lines:row.lines.length,gap:barTop-box.y-box.height,height:row.bottom-row.top};
            });
        });
        expect(geometry.map(r=>r.lines)).toEqual([1,2,3]);
        expect(geometry.map(r=>r.height)).toEqual([70,86,102]);
        for(const row of geometry) expect(row.gap).toBeCloseTo(6,1);
    });
}

for (const theme of ['light','dark']) {
    test(`002 contraste des textes et contrôles du thème ${theme}`, async ({page})=>{
        await page.locator('#theme-selector').selectOption(theme);
        await page.locator('.task-details-button').first().click();
        const contrast=await page.evaluate(()=>{
            const luminance = rgb => {
                const values=rgb.match(/[\d.]+/g).slice(0,3).map(v=>{const n=Number(v)/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;});
                return values[0]*0.2126+values[1]*0.7152+values[2]*0.0722;
            };
            const selectors=['#main-title','#main-subtitle','#theme-selector','.studio-toolbar button','.view-toggle-btn','.collapsible-header','#task-form textarea[name="title"]','#task-form textarea','.task-margin','.risk-even .editable-risk-title','.risk-odd .editable-risk-title','.risk-odd .responsable-cell','.zoom-btn[data-span]'];
            return selectors.flatMap(selector=>[...document.querySelectorAll(selector)].map(el=>{
                let parent=el,bg=getComputedStyle(parent).backgroundColor;
                while(bg==='rgba(0, 0, 0, 0)' && parent.parentElement){parent=parent.parentElement;bg=getComputedStyle(parent).backgroundColor;}
                const a=luminance(getComputedStyle(el).color),b=luminance(bg);
                return {selector,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};
            }));
        });
        for(const item of contrast) expect(item.ratio, item.selector).toBeGreaterThanOrEqual(4.5);
    });
}


for (const theme of ['light','dark']) for(const width of [1440,1715]) {
    test(`002 barre unique et icônes accessibles ${theme} à ${width}px`, async ({page})=>{
        await page.setViewportSize({width,height:950});
        await page.locator('#theme-selector').selectOption(theme);
        const geometry=await page.evaluate(()=>{
            const rect=selector=>document.querySelector(selector).getBoundingClientRect();
            const brand=rect('.app-brand'), tools=rect('.app-controls'), status=rect('.document-status');
            return {sameLine:Math.max(brand.top,tools.top,status.top)<Math.min(brand.bottom,tools.bottom,status.bottom),height:rect('.app-header').height,overflow:document.documentElement.scrollWidth>innerWidth,
                unnamed:[...document.querySelectorAll('.app-controls .icon-button')].filter(b=>!b.getAttribute('aria-label')||!b.title).length,
                emoji:/\p{Extended_Pictographic}/u.test(document.querySelector('.app-controls').textContent)};
        });
        expect(geometry.sameLine).toBe(true);expect(geometry.height).toBeLessThan(60);
        expect(geometry.overflow).toBe(false);expect(geometry.unnamed).toBe(0);expect(geometry.emoji).toBe(false);
        await page.locator('#save-status').focus();
        await expect(page.locator('#save-status')).toHaveAttribute('title',/Sauvegardé|en attente/);
        await page.locator('#pres-toggle').click();
        await expect(page.locator('#pres-toggle')).toHaveAttribute('aria-pressed','true');
        await page.locator('#pres-toggle').click();
        await expect(page.locator('#undo-action')).toBeVisible();
    });
}
