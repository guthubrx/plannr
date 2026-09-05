// Pilotage métier. Calculs purs sauf normalisation explicite du document importé.
var projectResources = [];
const BUSINESS_STATUSES = ['statusNotTreated','statusInProgress','statusBlocked','statusReview','statusTreated','statusCancelled'];
function isTaskCancelled(task) { return task.statut === 'statusCancelled'; }
function isTaskClosed(task) { return isTaskDone(task) || isTaskCancelled(task); }
function isScheduleAnchored(task) { return isTaskClosed(task) || !!task.actualStartDate; }
function deliveryOwner(task) { const names = splitAssignees(task); return task.owner || (names.length === 1 ? names[0] : ''); }
function contributors(task) { const names = splitAssignees(task); return names.length ? names : task.owner ? [task.owner] : []; }
function reportingStart(task) { return task.actualStartDate || task.startDate; }
function reportingEnd(task) { return task.actualEndDate || task.endDate || task.startDate; }
function remainingEffort(task) {
    if (isTaskClosed(task) || task.isMilestone) return 0;
    if (Number.isFinite(task.remainingEffortDays)) return task.remainingEffortDays;
    if (task.statut === 'statusNotTreated' && !task.actualStartDate && effectiveProgress(task) === 0 && Number.isFinite(task.effortDays)) return task.effortDays;
    return null;
}
function signedWorkingDifference(from, to) {
    if (!from || !to || from === to) return 0;
    return to > from ? workingDaysBetween(from,to)-Number(isWorkingDay(new Date(from+'T12:00:00Z'))) : -signedWorkingDifference(to,from);
}
function normalizeBusinessTask(task) {
    const aliases = {'statusAccepted':'statusReview','Accepté':'statusReview','statusDone':'statusTreated','Bloqué':'statusBlocked','À valider':'statusReview','Annulé':'statusCancelled'};
    task.statut = aliases[task.statut] || task.statut;
    if (!BUSINESS_STATUSES.includes(task.statut)) throw new Error('Statut inconnu : ' + task.statut);
    for (const key of ['actualStartDate','actualEndDate','decisionDate']) {
        if (task[key] === '') delete task[key];
        if (task[key] !== undefined && (!validISODate(task[key]) || task[key] > todayISO())) throw new Error('Date réelle invalide ou future : ' + key);
    }
    if (task.actualStartDate && task.actualEndDate && task.actualEndDate < task.actualStartDate) throw new Error('La fin réelle précède le début réel');
    if (task.actualEndDate && !isTaskDone(task) && !isTaskCancelled(task)) throw new Error('Une fin réelle nécessite un statut terminé ou annulé');
    if (task.remainingEffortDays !== undefined && (!Number.isFinite(task.remainingEffortDays) || task.remainingEffortDays < 0)) throw new Error('Reste à faire invalide');
    for (const key of ['owner','blockerReason','decisionOwner','acceptanceCriteria']) if (task[key] !== undefined && typeof task[key] !== 'string') throw new Error('Champ métier invalide : ' + key);
    if (task.decision !== undefined && !['pending','approved','refused'].includes(task.decision)) throw new Error('Décision invalide');
    if (task.allocationShares !== undefined) {
        const shares = task.allocationShares, names = contributors(task);
        if (!shares || typeof shares !== 'object' || Array.isArray(shares) || Object.keys(shares).length !== names.length || names.some(n=>!Object.hasOwn(shares,n)) || Object.values(shares).some(n=>!Number.isFinite(n)||n<0||n>1) || Math.abs(Object.values(shares).reduce((a,b)=>a+b,0)-1)>0.00001) throw new Error('La répartition doit couvrir les contributeurs et totaliser 100 %');
    }
    if (isTaskDone(task)) { task.progress = 100; if (task.remainingEffortDays !== undefined) task.remainingEffortDays = 0; }
}
function validateResources(resources) {
    if (!Array.isArray(resources)) throw new Error('Liste de ressources invalide');
    const names = new Set();
    return resources.map(resource=>{
        if (!resource || typeof resource.name !== 'string' || !resource.name.trim() || names.has(resource.name.trim())) throw new Error('Nom de ressource vide ou dupliqué');
        const name = resource.name.trim(); names.add(name);
        if (!Number.isFinite(resource.capacity) || resource.capacity<0 || resource.capacity>1) throw new Error('Capacité attendue entre 0 et 100 %');
        if (!Array.isArray(resource.absences || []) || (resource.absences || []).some(date=>!validISODate(date))) throw new Error('Absence invalide');
        return {name, capacity:resource.capacity, absences:[...new Set(resource.absences || [])].sort()};
    });
}
function projectMetrics(list = risks) {
    const active = list.filter(task=>!isTaskCancelled(task));
    const work = active.filter(task=>!task.isMilestone);
    const start = active.length ? active.map(reportingStart).sort()[0] : null;
    const finish = active.length ? active.map(reportingEnd).sort().at(-1) : null;
    const useEffort = work.length > 0 && work.every(task=>Number.isFinite(task.effortDays)) && work.some(task=>task.effortDays>0);
    let total = 0, complete = 0;
    for (const task of work) {
        const weight = useEffort ? task.effortDays : Math.max(1,workingDaysBetween(task.startDate,task.endDate));
        total += weight; complete += weight * effectiveProgress(task);
    }
    const referenceDates = active.map(task=>baselineData?.tasks?.[task.id]?.endDate).filter(Boolean);
    const referenceFinish = referenceDates.length ? referenceDates.sort().at(-1) : null;
    const next = active.filter(task=>!isTaskClosed(task)).flatMap(task=>[...new Set([task.deadline,reportingEnd(task)].filter(Boolean))].map(date=>({task,date}))).filter(item=>item.date>=todayISO()).sort((a,b)=>a.date.localeCompare(b.date))[0];
    return {start,finish,duration:start&&finish?workingDaysBetween(start,finish):0,progress:total?Math.round(complete/total):0,method:useEffort?'effort':'duration',estimated:work.filter(t=>Number.isFinite(t.effortDays)).length,totalWork:work.length,referenceFinish,drift:referenceFinish&&finish?signedWorkingDifference(referenceFinish,finish):null,referenceComplete:referenceDates.length===active.length,next,blocked:active.filter(t=>t.statut==='statusBlocked').length,overdue:active.filter(isTaskOverdue).length};
}
// O(tâches × jours × contributeurs). La capacité ne déplace jamais implicitement le planning.
function computeFutureWorkload(list = risks, asOf = todayISO()) {
    const people = new Map(), resourceByName = new Map(projectResources.map(r=>[r.name,r]));
    for (const task of list) {
        if (isTaskClosed(task) || task.isMilestone) continue;
        const names = contributors(task), assigned = names.length ? names : [uiText('notAssigned')];
        const remaining = remainingEffort(task);
        for (const name of assigned) {
            const resource = resourceByName.get(name) || {capacity:1,absences:[]};
            if (!people.has(name)) people.set(name,{name,effort:0,unknown:0,unscheduled:0,tasks:[],days:new Map(),capacity:resource.capacity});
            const person = people.get(name); person.tasks.push(task);
            if (remaining === null) { person.unknown++; continue; }
            const share = task.allocationShares?.[name] ?? 1/assigned.length, effort = remaining*share;
            person.effort += effort;
            const days = [], absences = new Set(resource.absences);
            for (let date = [task.startDate,task.actualStartDate || '',asOf].sort().at(-1); date<=task.endDate; date=addCalendarDays(date,1)) {
                if (isWorkingDay(new Date(date+'T12:00:00Z')) && !absences.has(date) && resource.capacity>0) days.push(date);
            }
            if (!days.length) { person.unscheduled += effort; continue; }
            for (const date of days) person.days.set(date,(person.days.get(date)||0)+effort/days.length);
        }
    }
    return [...people.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function dependencyConflicts(list = risks) {
    const byId = new Map(list.map(t=>[t.id,t]));
    return list.filter(task=>!isTaskClosed(task)).flatMap(task=>parseDependsOnFull(task).flatMap(dep=>{
        const pred = byId.get(dep.id);
        if (!pred) return [{task,kind:'dependencyMissing',source:dep.id}];
        if (isTaskCancelled(pred)) return [{task,kind:'dependencyCancelled',source:dep.id}];
        return reportingStart(task)<addWorkingDays(reportingEnd(pred),dep.lag+1) ? [{task,kind:'dependencyConflict',source:dep.id}] : [];
    }));
}
function businessActions() {
    const groups = new Map();
    const add = (kind,task,detail='')=>{ if (!groups.has(kind)) groups.set(kind,[]); groups.get(kind).push({task,detail}); };
    for (const task of risks) {
        if (isTaskCancelled(task)) continue;
        if (isTaskDone(task)) { if (!task.actualEndDate) add('missingActual',task); continue; }
        if (task.statut==='statusBlocked') add('blocked',task,task.blockerReason);
        if (task.statut==='statusReview' || (task.isMilestone && task.decision !== 'approved')) add('validation',task,task.decision==='refused'?uiText('refused'):task.decisionOwner || '');
        if (isDeadlineExceeded(task) || isTaskOverdue(task)) add('threatened',task,formatDateFR(task.deadline || task.endDate));
        if (!deliveryOwner(task)) add('missingOwner',task);
        if (!task.isMilestone && remainingEffort(task)===null) add('missingRemaining',task);
        if (task.isMilestone && (!task.acceptanceCriteria || !task.decisionOwner)) add('missingDecision',task);
        if (task.actualStartDate && task.endDate<task.actualStartDate) add('invalidForecast',task);
    }
    for (const conflict of dependencyConflicts()) add(conflict.kind,conflict.task,conflict.source);
    for (const person of computeFutureWorkload()) {
        if (person.unscheduled>0 || [...person.days.values()].some(n=>n>person.capacity+0.00001)) for (const task of person.tasks) add('capacityIssue',task,person.name);
    }
    return [...groups].map(([kind,items])=>{const unique=new Map();for(const item of items){if(!unique.has(item.task.id))unique.set(item.task.id,{...item});else if(item.detail)unique.get(item.task.id).detail += ', '+item.detail;}return {kind,items:[...unique.values()]};});
}
// Simulation isolée : aucune écriture du document, de la référence ou de l'historique.
function simulateSchedule(id, newStart) {
    if (!validISODate(newStart)) throw new Error('Date de simulation invalide');
    const list = JSON.parse(JSON.stringify(risks)), byId = new Map(list.map(t=>[t.id,t])), task = byId.get(id);
    if (!task || isScheduleAnchored(task)) throw new Error(uiText('scheduleLocked'));
    moveTaskToWorkingDate(task,newStart);
    const visited = new Set(), visiting = new Set();
    const resolve = task=>{
        if (visited.has(task.id)) return;
        if (visiting.has(task.id)) throw new Error('Cycle de dépendances');
        visiting.add(task.id);
        for (const dep of parseDependsOnFull(task)) {
            const pred = byId.get(dep.id); if (!pred || isTaskCancelled(pred)) continue;
            resolve(pred);
            const bound = addWorkingDays(reportingEnd(pred),1+dep.lag);
            if (!isScheduleAnchored(task) && task.startDate<bound) moveTaskToWorkingDate(task,bound);
        }
        visiting.delete(task.id); visited.add(task.id);
    };
    list.forEach(resolve);
    const originals = new Map(risks.map(t=>[t.id,t]));
    const changes = list.filter(t=>t.startDate!==originals.get(t.id).startDate || t.endDate!==originals.get(t.id).endDate).map(task=>({task,before:originals.get(task.id)}));
    const before = projectMetrics(), after = projectMetrics(list);
    return {list,changes,conflicts:dependencyConflicts(list),threatened:list.filter(t=>!isTaskClosed(t)&&isDeadlineExceeded(t)),finish:after.finish,delta:before.finish&&after.finish?signedWorkingDifference(before.finish,after.finish):0,signature:JSON.stringify(canonicalSnapshot())};
}

// Deux pistes réservées sous chaque barre : référence puis dates réelles renseignées.
Chart.register({
    id:'actualDatesPlugin',
    afterDatasetsDraw(chart) {
        const rows=chart.options.readableRows;if(!rows)return;
        const {ctx,scales:{x,y}}=chart,theme=ganttColors();
        const actualColor=document.documentElement.dataset.theme==='dark'&&!ganttExportWidth?'#66d4be':'#087d6c';
        chart.$actualBoxes=[];ctx.save();ctx.beginPath();ctx.rect(x.left,y.top,x.right-x.left,y.bottom-y.top);ctx.clip();ctx.fillStyle=actualColor;
        for(const row of rows) {
            const task=row.task;if(!task.actualStartDate&&!task.actualEndDate)continue;
            const x0=x.getPixelForValue(Date.parse(task.actualStartDate||task.actualEndDate)),x1=x.getPixelForValue(Date.parse(task.actualEndDate||task.actualStartDate));
            const box={x:Math.min(x0,x1)-2,y:y.getPixelForValue(row.y)+24,width:Math.max(4,Math.abs(x1-x0)+4),height:4,id:task.id};
            ctx.fillRect(box.x,box.y,box.width,box.height);chart.$actualBoxes.push(box);
        }
        ctx.restore();
        if(chart.$actualBoxes.length){ctx.save();ctx.fillStyle=actualColor;ctx.fillRect(x.left+4,14,18,4);ctx.font='11px Helvetica, Arial, sans-serif';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle=theme.ink;ctx.fillText(uiText('actualLegend'),x.left+28,16);ctx.restore();}
    }
});
