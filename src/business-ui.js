Object.assign(WORKSPACE_I18N.fr, {
    beforeSchedule:'Planning actuel', afterSchedule:'Planning simulé', actualLegend:'Réel renseigné', appearance:'Apparence (application immédiate)', projectCalendar:'Calendrier du projet', removeResource:'Retirer la personne', saveBeforeSimulation:'Enregistrez les modifications du détail avant de simuler.', allocationEdit:'Modifiez les contributeurs et leur répartition ensemble dans Détails.', statusNotTreated:'À faire',statusInProgress:'En cours',statusBlocked:'Bloqué',statusReview:'À valider',statusTreated:'Terminé',statusCancelled:'Annulé',
    start:'Début prévisionnel',end:'Fin prévisionnelle',owner:'Responsable de livraison',assignee:'Contributeurs (séparés par une virgule)',remaining:'Reste à faire (jours-personnes)',remainingHelp:'Saisi indépendamment du pourcentage. Pour une tâche à faire, l’effort initial sert de valeur par défaut ; sinon un champ vide signifie inconnu.',actualStart:'Début réel',actualEnd:'Fin réelle',blocker:'Cause du blocage / décision attendue',allocation:'Répartition de l’effort (%)',allocationHelp:'Facultatif : une ligne par contributeur, ex. Alice=60 puis Bob=40. Total 100 %. Sans saisie, parts égales.',decisionOwner:'Responsable de validation',criteria:'Critères d’acceptation',decision:'Décision du jalon',decisionDate:'Date de décision',pending:'En attente',approved:'Approuvée',refused:'Refusée',referenceDates:'Référence',noReference:'Aucune référence figée',scheduleLocked:'Début ancré ou tâche clôturée : le réalisé est protégé. Modifiez la fin prévisionnelle dans Détails si la tâche est encore active.',
    nextDeadline:'Prochaine échéance',forecastFinish:'Fin prévisionnelle',referenceDrift:'Écart à la référence',blockedCount:'Blocages',projectSpan:'Durée du projet',effortMethod:'Avancement pondéré par effort',durationMethod:'Avancement pondéré par durée',estimateCoverage:'tâches estimées',partialReference:'Référence partielle',
    actionCenter:'À traiter',blocked:'Tâches bloquées',validation:'Validations attendues',threatened:'Échéances menacées ou dépassées',missingOwner:'Responsable de livraison à désigner',missingRemaining:'Reste à faire à estimer',missingActual:'Fin réelle à renseigner',missingDecision:'Jalons à préciser',invalidForecast:'Prévision antérieure au début réel',dependencyMissing:'Dépendance inconnue',dependencyCancelled:'Dépendance vers une tâche annulée',dependencyConflict:'Contraintes non respectées',capacityIssue:'Charge à rééquilibrer ou replanifier',noActions:'Aucune action signalée',
    settings:'Paramètres',resources:'Disponibilités des contributeurs',resourceHelp:'Capacité dédiée au projet, par jour ouvré. Sans configuration : 100 %. Les absences ne déplacent pas les tâches ; elles réduisent les jours disponibles pour répartir le reste à faire.',resourceName:'Nom',capacityPercent:'Capacité (%)',absences:'Absences (AAAA-MM-JJ, séparées par des virgules)',addResource:'Ajouter une personne',extraHolidays:'Jours non ouvrés supplémentaires',skippedHolidays:'Jours fériés travaillés',calendarHelp:'Dates au format AAAA-MM-JJ séparées par des virgules.',
    simulate:'Simuler un décalage',newStart:'Nouveau début',preview:'Voir les conséquences',simulation:'Conséquences du décalage',affected:'tâche(s) déplacée(s)',finishImpact:'Décalage de la fin du projet',applySimulation:'Appliquer ce planning',noScheduleChanges:'Aucune modification de date',simulationStale:'Le document a changé. Relancez la simulation.',unscheduled:'j-personnes à replanifier',futureLoad:'Charge restante à partir d’aujourd’hui',remainingUnknown:'tâche(s) sans reste à faire',capacity:'Charge calculée sur les jours à venir, selon le reste à faire et les disponibilités. Un reste inconnu n’est pas assimilé à zéro.',noEffort:'reste à faire non renseigné'
});
Object.assign(WORKSPACE_I18N.en, {
    beforeSchedule:'Current schedule', afterSchedule:'Simulated schedule', actualLegend:'Recorded actual dates', appearance:'Appearance (applies immediately)', projectCalendar:'Project calendar', removeResource:'Remove person', saveBeforeSimulation:'Save changes to task details before simulating.', allocationEdit:'Edit contributors and their allocation together in Details.', statusNotTreated:'To do',statusInProgress:'In progress',statusBlocked:'Blocked',statusReview:'Awaiting approval',statusTreated:'Done',statusCancelled:'Cancelled',
    start:'Forecast start',end:'Forecast finish',owner:'Delivery owner',assignee:'Contributors (comma separated)',remaining:'Remaining work (person-days)',remainingHelp:'Independent of progress percentage. Initial effort is used for unstarted To do tasks; otherwise blank means unknown.',actualStart:'Actual start',actualEnd:'Actual finish',blocker:'Blocker / decision needed',allocation:'Effort allocation (%)',allocationHelp:'Optional: one contributor per line, e.g. Alice=60 then Bob=40. Total 100%. Equal shares if blank.',decisionOwner:'Approver',criteria:'Acceptance criteria',decision:'Milestone decision',decisionDate:'Decision date',pending:'Pending',approved:'Approved',refused:'Refused',referenceDates:'Baseline',noReference:'No baseline saved',scheduleLocked:'Anchored start or closed task: actual history is protected. Edit the forecast finish in Details if still active.',
    nextDeadline:'Next deadline',forecastFinish:'Forecast finish',referenceDrift:'Baseline variance',blockedCount:'Blockers',projectSpan:'Project duration',effortMethod:'Effort-weighted progress',durationMethod:'Duration-weighted progress',estimateCoverage:'estimated tasks',partialReference:'Partial baseline',
    actionCenter:'Action required',blocked:'Blocked tasks',validation:'Approvals awaited',threatened:'Threatened or overdue deadlines',missingOwner:'Delivery owner missing',missingRemaining:'Remaining work to estimate',missingActual:'Actual finish missing',missingDecision:'Milestones to clarify',invalidForecast:'Forecast before actual start',dependencyMissing:'Unknown dependency',dependencyCancelled:'Dependency on cancelled task',dependencyConflict:'Unmet constraints',capacityIssue:'Work to rebalance or reschedule',noActions:'No action flagged',
    settings:'Settings',resources:'Contributor availability',resourceHelp:'Daily capacity allocated to this project. Default 100%. Absences reduce available days without moving tasks.',resourceName:'Name',capacityPercent:'Capacity (%)',absences:'Absences (YYYY-MM-DD, comma separated)',addResource:'Add person',extraHolidays:'Additional non-working days',skippedHolidays:'Working public holidays',calendarHelp:'Comma-separated YYYY-MM-DD dates.',
    simulate:'Simulate a reschedule',newStart:'New start',preview:'Preview consequences',simulation:'Reschedule consequences',affected:'task(s) moved',finishImpact:'Project finish shift',applySimulation:'Apply this schedule',noScheduleChanges:'No date changes',simulationStale:'The document changed. Run the simulation again.',unscheduled:'person-days to reschedule',futureLoad:'Remaining workload from today',remainingUnknown:'task(s) without remaining estimate',capacity:'Future workload based on remaining work and availability. Unknown estimates are not treated as zero.',noEffort:'remaining work unspecified'
});
var pendingSimulation = null, panelBusinessSignature = '';
function panelValuesSignature() { return JSON.stringify([...new FormData(document.getElementById('task-form')).entries()]); }
function renderBusinessDashboard() {
    const m=projectMetrics(), put=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    put('business-next',m.next?formatDateFR(m.next.date):'—');
    document.getElementById('business-next').title=m.next?m.next.task.id+' · '+m.next.task.title:'';
    put('business-finish',m.finish?formatDateFR(m.finish):'—');
    put('business-drift',m.drift===null?'—':(m.drift>0?'+':'')+m.drift+' j');
    document.getElementById('business-drift').title=m.referenceFinish?uiText(m.referenceComplete?'referenceDates':'partialReference')+' · '+formatDateFR(m.referenceFinish):uiText('noReference');
    put('business-blocked',m.blocked);put('dashboard-total-duration',m.duration+' j');put('dashboard-progression',m.progress+'%');
    put('progress-method',uiText(m.method==='effort'?'effortMethod':'durationMethod'));
    document.getElementById('dashboard-progression').title=m.estimated+'/'+m.totalWork+' '+uiText('estimateCoverage');
    put('dashboard-total-tasks',risks.length);put('dashboard-in-progress',risks.filter(t=>t.statut==='statusInProgress').length);put('dashboard-completed',risks.filter(isTaskDone).length);put('dashboard-overdue',m.overdue);
}
function renderBusinessActions() {
    const host=document.getElementById('action-groups');if(!host)return;
    const groups=businessActions(), ids=new Set(groups.flatMap(g=>g.items.map(i=>i.task.id)));
    document.getElementById('action-count').textContent=ids.size;
    host.innerHTML=groups.length?groups.map(group=>'<section><h3>'+uiText(group.kind)+' <span>'+group.items.length+'</span></h3><ul>'+group.items.map(({task,detail})=>'<li><button type="button" data-task-id="'+escapeHtml(task.id)+'"><strong>'+escapeHtml(task.id)+'</strong> '+escapeHtml(task.title)+(detail?' <small>· '+escapeHtml(detail)+'</small>':'')+'</button></li>').join('')+'</ul></section>').join(''):'<p>'+uiText('noActions')+'</p>';
    host.querySelectorAll('[data-task-id]').forEach(button=>button.onclick=()=>openTaskPanel(button.dataset.taskId));
}
function populateBusinessPanel(task) {
    const f=document.getElementById('task-form');
    for(const key of ['owner','remainingEffortDays','actualStartDate','actualEndDate','blockerReason','decisionOwner','acceptanceCriteria','decisionDate']) f.elements[key].value=task[key]??'';
    f.elements.owner.placeholder=deliveryOwner(task);
    f.elements.decision.value=task.decision||'pending';
    f.elements.allocationShares.value=task.allocationShares?Object.entries(task.allocationShares).map(([name,share])=>name+'='+Math.round(share*10000)/100).join('\n'):'';
    const baseline=baselineData?.tasks?.[task.id];
    document.getElementById('task-reference').textContent=baseline?uiText('referenceDates')+' : '+formatDateFR(baseline.startDate)+' → '+formatDateFR(baseline.endDate):uiText('noReference');
    document.getElementById('simulate-start').value=task.startDate;
    document.getElementById('schedule-simulation').hidden=isScheduleAnchored(task);
    f.elements.startDate.disabled=isScheduleAnchored(task);
    f.elements.endDate.disabled=task.isMilestone||isTaskClosed(task);
    document.getElementById('schedule-lock-help').hidden=!isScheduleAnchored(task);
    document.getElementById('milestone-fields').hidden=!task.isMilestone;
    panelBusinessSignature=panelValuesSignature();
}
function readBusinessPanel(next) {
    const f=document.getElementById('task-form');
    for(const key of ['owner','actualStartDate','actualEndDate','blockerReason','decisionOwner','acceptanceCriteria','decisionDate']) {
        const value=f.elements[key].value.trim();if(value)next[key]=value;else delete next[key];
    }
    const remaining=f.elements.remainingEffortDays.value;
    if(remaining==='')delete next.remainingEffortDays;else next.remainingEffortDays=Number(remaining);
    const shares=f.elements.allocationShares.value.trim();
    if(!shares)delete next.allocationShares;
    else {
        const entries=shares.split('\n').filter(s=>s.trim()).map(line=>{const at=line.lastIndexOf('=');if(at<1)throw new Error(uiText('allocationHelp'));return [line.slice(0,at).trim(),Number(line.slice(at+1))/100];});
        if(new Set(entries.map(e=>e[0])).size!==entries.length)throw new Error(uiText('allocationHelp'));
        next.allocationShares=Object.fromEntries(entries);
    }
    if(next.isMilestone)next.decision=f.elements.decision.value;
    normalizeBusinessTask(next);
    if(next.actualStartDate&&!isTaskClosed(next)&&next.endDate<next.actualStartDate)throw new Error(uiText('invalidForecast'));
}
function previewSchedule() {
    try {
        if(panelBusinessSignature!==panelValuesSignature())throw new Error(uiText('saveBeforeSimulation'));
        pendingSimulation=simulateSchedule(editingTaskId,document.getElementById('simulate-start').value);
        const p=pendingSimulation;
        document.getElementById('simulation-content').innerHTML='<p><strong>'+p.changes.length+' '+uiText('affected')+'</strong> · '+uiText('finishImpact')+' : '+(p.delta>0?'+':'')+p.delta+' '+uiText('days')+'</p>'+(p.changes.length?'<div class="simulation-table"><table><thead><tr><th>'+uiText('title')+'</th><th>'+uiText('beforeSchedule')+'</th><th>'+uiText('afterSchedule')+'</th></tr></thead><tbody>'+p.changes.map(({task,before})=>'<tr><td>'+escapeHtml(task.id+' · '+task.title)+'</td><td>'+formatDateFR(before.startDate)+' → '+formatDateFR(before.endDate)+'</td><td>'+formatDateFR(task.startDate)+' → '+formatDateFR(task.endDate)+'</td></tr>').join('')+'</tbody></table></div>':'<p>'+uiText('noScheduleChanges')+'</p>')+'<p>'+uiText('threatened')+' : '+p.threatened.map(t=>escapeHtml(t.id)).join(', ')+'</p>'+(p.conflicts.length?'<p class="form-error">'+uiText('dependencyConflict')+' : '+p.conflicts.map(c=>escapeHtml(c.task.id+' ← '+c.source)).join(', ')+'</p>':'');
        document.getElementById('simulation-error').textContent='';
        document.getElementById('apply-simulation').disabled=!p.changes.length;
        document.getElementById('simulation-dialog').showModal();
    }catch(error){document.getElementById('task-form-error').textContent=error.message;}
}
function applySimulation() {
    if(!pendingSimulation)return;
    if(pendingSimulation.signature!==JSON.stringify(canonicalSnapshot())){document.getElementById('simulation-error').textContent=uiText('simulationStale');return;}
    commitDocument();
    const byId=new Map(risks.map(t=>[t.id,t]));
    for(const {task} of pendingSimulation.changes)Object.assign(byId.get(task.id),{startDate:task.startDate,endDate:task.endDate,duration:task.duration});
    pendingSimulation=null;document.getElementById('simulation-dialog').close();document.getElementById('task-panel').close();refreshDocumentViews();commitDocument();
}
function resourceRow(resource={name:'',capacity:1,absences:[]}) {
    const row=document.createElement('div');row.className='resource-row';
    row.innerHTML='<label>'+uiText('resourceName')+'<input class="resource-name" required></label><label>'+uiText('capacityPercent')+'<input class="resource-capacity" type="number" min="0" max="100" step="1" required></label><label>'+uiText('absences')+'<textarea class="resource-absences" rows="2"></textarea></label><button type="button" class="remove-resource" aria-label="'+uiText('removeResource')+'">'+uiIcon('trash')+'</button>';
    row.querySelector('.resource-name').value=resource.name;row.querySelector('.resource-capacity').value=resource.capacity*100;row.querySelector('.resource-absences').value=resource.absences.join(', ');row.querySelector('button').onclick=()=>row.remove();
    document.getElementById('resource-rows').appendChild(row);
}
function openSettings() {
    document.getElementById('resource-rows').innerHTML='';projectResources.forEach(resourceRow);
    document.getElementById('settings-extra').value=[...calendarConfig.extraHolidays].join(', ');document.getElementById('settings-skipped').value=[...calendarConfig.skippedHolidays].join(', ');
    document.getElementById('toggle-saturday-worked').checked=calendarConfig.saturdayWorked;
    document.getElementById('settings-error').textContent='';document.getElementById('settings-dialog').showModal();
}
function saveSettings(event) {
    event.preventDefault();
    const dates=text=>text.split(',').map(s=>s.trim()).filter(Boolean);
    try{
        const resources=validateResources([...document.querySelectorAll('.resource-row')].map(row=>({name:row.querySelector('.resource-name').value,capacity:Number(row.querySelector('.resource-capacity').value)/100,absences:dates(row.querySelector('.resource-absences').value)})));
        const extra=dates(document.getElementById('settings-extra').value),skipped=dates(document.getElementById('settings-skipped').value);
        if([...extra,...skipped].some(date=>!validISODate(date)))throw new Error(uiText('calendarHelp'));
        commitDocument();projectResources=resources;calendarConfig={saturdayWorked:document.getElementById('toggle-saturday-worked').checked,extraHolidays:new Set(extra),skippedHolidays:new Set(skipped)};
        risks.forEach(t=>{t.duration=t.isMilestone?0:workingDaysBetween(t.startDate,t.endDate);});
        applyDependencyCascade({silent:true});refreshDocumentViews();commitDocument();document.getElementById('settings-dialog').close();
    }catch(error){document.getElementById('settings-error').textContent=error.message;}
}
