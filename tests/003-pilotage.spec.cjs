const {test,expect}=require('@playwright/test');
const task=(id,extra={})=>({id,title:'Tâche '+id,startDate:'2026-06-15',endDate:'2026-06-19',statut:'statusNotTreated',assignedTo:'Alice',...extra});
const data=(tasks,extra={})=>({version:'2.4',appState:{title:'Pilotage métier',language:'fr'},phases:[{id:1,name:'Phase métier',color:'#426b89',tasks}],...extra});
async function load(page,document){await page.locator('#import-file').setInputFiles({name:'pilotage.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});await expect(page.locator('.toast').last()).toContainText('Document complet chargé');}
async function snapshot(page){return page.evaluate(()=>canonicalSnapshot());}
test.beforeEach(async({page})=>{page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));await page.clock.setFixedTime(new Date('2026-06-15T12:00:00Z'));await page.goto('/plannr.html');await page.waitForFunction(()=>workspaceReady);});
test.afterEach(async({page})=>{expect(page.errors).toEqual([]);});

test('003 durée enveloppe, effort prioritaire et méthode visible',async({page})=>{
 await load(page,data([task('a',{effortDays:2,progress:100,statut:'statusTreated'}),task('b',{effortDays:8})]));
 expect(await page.evaluate(()=>{const m=projectMetrics();return {duration:m.duration,method:m.method,progress:m.progress};})).toEqual({duration:5,method:'effort',progress:20});
 await expect(page.locator('#progress-method')).toHaveText('Avancement pondéré par effort');
 await page.evaluate(()=>refreshWorkspaceLabels());await expect(page.locator('#progress-method')).toHaveText('Avancement pondéré par effort');
 await load(page,data([task('a',{effortDays:2,statut:'statusTreated'}),task('b')]));
 expect(await page.evaluate(()=>projectMetrics().method)).toBe('duration');
 expect(await page.evaluate(()=>projectMetrics().progress)).toBe(50);
});

test('003 réalisé, prévision et référence restent distincts',async({page})=>{
 await load(page,data([task('a',{startDate:'2026-06-01',endDate:'2026-06-12',actualStartDate:'2026-06-02',actualEndDate:'2026-06-05',statut:'statusTreated'})],{baseline:{tasks:{a:{startDate:'2026-06-01',endDate:'2026-06-04'}}}}));
 expect(await page.evaluate(()=>{const m=projectMetrics();return {start:m.start,finish:m.finish,drift:m.drift};})).toEqual({start:'2026-06-02',finish:'2026-06-05',drift:1});
 const before=await snapshot(page);await page.evaluate(()=>{moveTaskToWorkingDate(risks[0],'2026-07-01');applyDependencyCascade({silent:true});});expect(await snapshot(page)).toEqual(before);
 await page.locator('.task-details-button').click();await expect(page.locator('[name="startDate"]')).toBeDisabled();await expect(page.locator('[name="endDate"]')).toBeDisabled();await expect(page.locator('[name="actualEndDate"]')).toHaveValue('2026-06-05');
});

test('003 progression ne termine pas implicitement une validation',async({page})=>{
 await load(page,data([task('a',{statut:'statusInProgress',remainingEffortDays:3,effortDays:5})]));
 await page.locator('.editable-progress').fill('100');await page.locator('.editable-progress').dispatchEvent('change');
 expect((await snapshot(page)).phases[0].tasks[0]).toMatchObject({statut:'statusReview',progress:100,remainingEffortDays:3});
 expect(await page.evaluate(()=>remainingEffort(risks[0]))).toBe(3);
 await page.locator('.status-dropdown').selectOption('statusCancelled');
 expect(await page.evaluate(()=>({load:computeWorkload().length,progress:projectMetrics().progress,duration:projectMetrics().duration,overdue:isTaskOverdue(risks[0])}))).toEqual({load:0,progress:0,duration:0,overdue:false});
});

test('003 reste à faire indépendant, inconnu et jamais réparti dans le passé',async({page})=>{
 await load(page,data([task('a',{startDate:'2026-06-01',endDate:'2026-06-19',effortDays:10,statut:'statusInProgress',progress:80,remainingEffortDays:4}),task('b',{effortDays:5,statut:'statusBlocked'})]));
 const r=await page.evaluate(()=>{const p=computeWorkload()[0];return {effort:p.effort,unknown:p.unknown,days:[...p.days],remaining:risks.map(remainingEffort)};});
 expect(r.effort).toBe(4);expect(r.unknown).toBe(1);expect(r.remaining).toEqual([4,null]);expect(r.days).toHaveLength(5);for(const [date,load]of r.days){expect(date>='2026-06-15').toBe(true);expect(load).toBeCloseTo(.8);}
});

test('003 capacité, absence et répartition explicite produisent une surcharge future',async({page})=>{
 await load(page,data([task('a',{effortDays:10,assignedTo:'Alice, Bob',owner:'Louise',allocationShares:{Alice:.6,Bob:.4}})],{resources:[{name:'Alice',capacity:.5,absences:['2026-06-17']},{name:'Bob',capacity:1,absences:[]}]}));
 const rows=await page.evaluate(()=>computeWorkload().map(p=>({name:p.name,effort:p.effort,days:[...p.days],overload:[...p.days.values()].filter(v=>v>p.capacity).length})));
 expect(rows[0].effort).toBe(6);expect(rows[0].overload).toBe(4);expect(rows[0].days.some(([d])=>d==='2026-06-17')).toBe(false);expect(rows[1].effort).toBe(4);expect(rows[1].overload).toBe(0);expect(await page.evaluate(()=>deliveryOwner(risks[0]))).toBe('Louise');
});

test('003 charge sans jour disponible explicitement à replanifier',async({page})=>{
 await load(page,data([task('a',{remainingEffortDays:3})],{resources:[{name:'Alice',capacity:0,absences:[]}]}));
 expect(await page.evaluate(()=>({days:computeWorkload()[0].days.size,unscheduled:computeWorkload()[0].unscheduled}))).toEqual({days:0,unscheduled:3});
 await expect(page.locator('#workload-content')).toContainText('3 j-personnes à replanifier');
});

test('003 dépendance annulée signalée, réalisé du successeur jamais déplacé',async({page})=>{
 await load(page,data([task('a',{endDate:'2026-06-30',statut:'statusCancelled'}),task('b',{dependsOn:['a'],actualStartDate:'2026-06-15',statut:'statusInProgress'})]));
 const result=await page.evaluate(()=>{applyDependencyCascade({silent:true});return {start:risks[1].startDate,actual:risks[1].actualStartDate,conflicts:dependencyConflicts().map(c=>c.kind)};});
 expect(result).toEqual({start:'2026-06-15',actual:'2026-06-15',conflicts:['dependencyCancelled']});
});

test('003 retard réel du prédécesseur pilote la contrainte et respecte un successeur commencé',async({page})=>{
 await load(page,data([task('a',{startDate:'2026-06-01',endDate:'2026-06-02',statut:'statusTreated',actualStartDate:'2026-06-01',actualEndDate:'2026-06-12'}),task('b',{startDate:'2026-06-03',endDate:'2026-06-19',actualStartDate:'2026-06-03',statut:'statusInProgress',dependsOn:['a']})]));
 expect(await page.evaluate(()=>dependencyConflicts().map(c=>c.task.id))).toEqual(['b']);expect((await snapshot(page)).phases[0].tasks[1].startDate).toBe('2026-06-03');
});

test('003 simulation pure, conséquences complètes et application annulable',async({page})=>{
 await load(page,data([task('a'),task('b',{startDate:'2026-06-22',endDate:'2026-06-26',dependsOn:['a'],deadline:'2026-06-26'})]));
 const before=await snapshot(page);const count=await page.evaluate(()=>history.length);
 const r=await page.evaluate(()=>{const p=simulateSchedule('a','2026-06-22');return {changes:p.changes.map(c=>c.task.id),threatened:p.threatened.map(t=>t.id),delta:p.delta};});
 expect(r).toEqual({changes:['a','b'],threatened:['b'],delta:5});expect(await snapshot(page)).toEqual(before);expect(await page.evaluate(()=>history.length)).toBe(count);
 await page.locator('.task-details-button').first().click();await page.locator('#schedule-simulation summary').click();await page.locator('#simulate-start').fill('2026-06-22');await page.locator('#schedule-simulation button').click();
 await expect(page.locator('#simulation-content')).toContainText('2 tâche(s) déplacée(s)');await page.keyboard.press('Escape');expect(await snapshot(page)).toEqual(before);
 await page.locator('#schedule-simulation button').click();await page.locator('#apply-simulation').click();expect((await snapshot(page)).phases[0].tasks[1].endDate).toBe('2026-07-03');await page.locator('#undo-action').click();expect(await snapshot(page)).toEqual(before);
});

test('003 simulation n’abandonne pas les modifications non appliquées du panneau',async({page})=>{
 await load(page,data([task('a')]));const before=await snapshot(page);await page.locator('.task-details-button').click();await page.locator('[name="owner"]').fill('Louise');await page.locator('#schedule-simulation summary').click();await page.locator('#schedule-simulation button').click();await expect(page.locator('#task-form-error')).toContainText('Enregistrez les modifications');await expect(page.locator('#simulation-dialog')).not.toBeVisible();expect(await snapshot(page)).toEqual(before);
});

test('003 nouveaux champs, paramètres et référence survivent à import/export/rechargement',async({page})=>{
 const t=task('a',{owner:'Louise',remainingEffortDays:2,actualStartDate:'2026-06-15',statut:'statusBlocked',blockerReason:'Validation fournisseur',allocationShares:{Alice:1},effortDays:4});
 const document=data([t],{resources:[{name:'Alice',capacity:.6,absences:['2026-06-18']}],baseline:{tasks:{a:{startDate:'2026-06-01',endDate:'2026-06-05'}}}});
 await load(page,document);const before=await snapshot(page);expect(before.phases[0].tasks[0]).toMatchObject(t);await page.reload();expect(await snapshot(page)).toEqual(before);await load(page,before);expect(await snapshot(page)).toEqual(before);
});

test('003 jalon : valideur, critères et décision enregistrés sans inventer de date réelle',async({page})=>{
 await load(page,data([task('a',{isMilestone:true,endDate:'2026-06-15'})]));await page.locator('.task-details-button').click();await page.locator('[name="decisionOwner"]').fill('Louise');await page.locator('[name="acceptanceCriteria"]').fill('PV de recette signé');await page.locator('[name="decision"]').selectOption('approved');await page.locator('[name="decisionDate"]').fill('2026-06-15');await page.locator('[name="statut"]').selectOption('statusTreated');await page.locator('#task-form button[type="submit"]').click();
 const t=(await snapshot(page)).phases[0].tasks[0];expect(t).toMatchObject({decisionOwner:'Louise',acceptanceCriteria:'PV de recette signé',decision:'approved',decisionDate:'2026-06-15',progress:100});expect(t.actualEndDate).toBeUndefined();
});

test('003 import métier invalide atomique',async({page})=>{
 const before=await snapshot(page);
 for(const document of [data([task('a',{remainingEffortDays:-1})]),data([task('a',{actualStartDate:'2030-01-01'})]),data([task('a',{allocationShares:{Alice:.5}})]),data([task('a')],{resources:[{name:'Alice',capacity:2}]})]) {
 await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});await expect(page.locator('.toast').last()).toContainText('Import refusé');expect(await snapshot(page)).toEqual(before);
 }
});

test('003 ancien statut accepté migre vers à valider',async({page})=>{
 await load(page,data([task('a',{statut:'statusAccepted'})]));expect((await snapshot(page)).phases[0].tasks[0].statut).toBe('statusReview');await expect(page.locator('.status-dropdown')).toHaveValue('statusReview');
});

test('003 paramètres atomiques, calendrier et disponibilités annulables',async({page})=>{
 await load(page,data([task('a')]));const before=await snapshot(page);await page.getByRole('button',{name:'Paramètres',exact:true}).click();await page.getByRole('button',{name:'Ajouter une personne'}).click();await page.locator('.resource-name').fill('Alice');await page.locator('.resource-capacity').fill('50');await page.locator('.resource-absences').fill('2026-06-17');await page.locator('#settings-extra').fill('2026-06-18');await page.locator('#settings-form button[type="submit"]').click();
 expect((await snapshot(page)).resources).toEqual([{name:'Alice',capacity:.5,absences:['2026-06-17']}]);await page.locator('#undo-action').click();expect(await snapshot(page)).toEqual(before);
});

test('003 actions ouvrent directement le détail sans alertes de butoir dupliquées',async({page})=>{
 await load(page,data([task('a',{statut:'statusBlocked',blockerReason:'Arbitrage requis',deadline:'2026-06-12',assignedTo:''})]));await page.locator('#action-center summary').click();await expect(page.locator('#action-groups')).toContainText('Arbitrage requis');expect(await page.locator('#plannr-banner').textContent()).not.toContain('butoirs');await page.locator('#action-groups [data-task-id="a"]').first().click();await expect(page.locator('#task-panel')).toBeVisible();
});

test('003 échéance future visible même si sa butoir est déjà dépassée',async({page})=>{
 await load(page,data([task('a',{deadline:'2026-06-12'})]));expect(await page.evaluate(()=>projectMetrics().next.date)).toBe('2026-06-19');
});

for(const mode of ['cascade','compact','consolide'])for(const theme of ['light','dark']){
 test(`003 dates réelles sans collision ${mode} ${theme}`,async({page})=>{
  const list=Array.from({length:8},(_,i)=>task('r'+i,{title:'Un intitulé long pour contrôler la séparation du réalisé et des libellés dans le planning de référence',startDate:'2026-06-01',endDate:'2026-06-12',actualStartDate:'2026-06-02',actualEndDate:'2026-06-10',statut:'statusTreated'}));
  await load(page,data(list,{baseline:{tasks:Object.fromEntries(list.map(t=>[t.id,{startDate:'2026-05-25',endDate:'2026-06-08'}]))}}));await page.evaluate(({mode,theme})=>{setTheme(theme);setGanttView(mode);},{mode,theme});
  const result=await page.evaluate(()=>{const c=ganttChart,overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;return {count:c.$actualBoxes.length,labels:c.$actualBoxes.some(b=>c.$labelBoxes.some(l=>overlap(b,l))),headers:c.$actualBoxes.some(b=>c.$headerBoxes.some(h=>overlap(b,h))),rows:c.$actualBoxes.some((b,i)=>c.$actualBoxes.slice(i+1).some(o=>overlap(b,o)))};});
  expect(result).toEqual({count:8,labels:false,headers:false,rows:false});
 });
}
