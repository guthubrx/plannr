// O(n) : filtres de présentation, sans incidence sur le calcul ni les exports.
var planningFilters = { query: '', phase: '', person: '', status: '', overdue: false };
var editingTaskId = null;
const WORKSPACE_I18N = {
    fr: {
        pinGantt: 'Épingler le diagramme pendant le défilement',
        saveAction: 'Enregistrer', importAction: 'Importer', reload: 'Recharger les données du fichier', save: 'Enregistrer le fichier', import: 'Importer un document', reference: 'Référence', baselineHelp: 'Figer le planning comme référence', export: 'Exporter', presentation: 'Mode présentation', edit: 'Revenir à l’édition', palette: 'Palette de couleurs', browserShort: 'Navigateur', fileDirtyShort: 'fichier à enregistrer', fileSavedShort: 'fichier enregistré', pendingShort: 'Sauvegarde en attente', theme: 'Apparence', light: 'Clair', dark: 'Sombre', search: 'Rechercher une tâche, une note…', phase: 'Toutes les phases', person: 'Tous les responsables', status: 'Tous les statuts', overdue: 'En retard', reset: 'Réinitialiser', visible: 'tâches visibles', empty: 'Aucune tâche ne correspond aux filtres.', details: 'Détails', task: 'Détail de la tâche', title: 'Titre', start: 'Début', end: 'Fin', assignee: 'Responsables (séparés par une virgule)', progress: 'Avancement (%)', state: 'Statut', deps: 'Dépendances et délai ouvré (ex. 1.2+3, 2.1)', notes: 'Notes', link: 'Lien http(s)', deadline: 'Date butoir', effort: 'Effort total (jours-personnes)', effortHelp: 'Facultatif. Réparti également entre les responsables et les jours ouvrés de la tâche.', milestone: 'Jalon ponctuel', cancel: 'Annuler', apply: 'Appliquer', slack: 'Marge', days: 'jours ouvrés', critical: 'Chemin critique', saveError: 'Sauvegarde navigateur impossible — exportez votre travail', browserSaved: 'Sauvegardé dans ce navigateur à', browserPending: 'Sauvegarde navigateur en attente', fileDirty: 'Modifications non enregistrées dans un fichier', fileSaved: 'Fichier enregistré à', downloaded: 'Téléchargement lancé à', imported: 'Document complet chargé', importError: 'Import refusé', reloadError: 'Impossible de recharger le fichier de données', invalid: 'Vérifiez les dates, le lien et les dépendances (sans cycle).', noEffort: 'effort non renseigné', workload: 'Charge estimée', capacity: 'Capacité : 1 jour-personne par jour ouvré. Les efforts manquants ne sont pas assimilés à une charge à temps plein.', overloaded: 'jours en surcharge', notAssigned: 'Sans responsable', unestimated: 'tâche(s) sans effort', duration: 'Durée', undo: 'Annuler', redo: 'Rétablir', finish: 'Fin prévisionnelle', chartHelp: 'Les lignes s’adaptent pour séparer les tâches. Sur petit écran, faites défiler le calendrier horizontalement. Cliquez sur une barre pour retrouver la tâche ; ouvrez Détails pour le texte complet.'
    },
    en: {
        pinGantt: 'Pin the chart while scrolling',
        saveAction: 'Save', importAction: 'Import', reload: 'Reload data from file', save: 'Save file', import: 'Import a document', reference: 'Baseline', baselineHelp: 'Set the current plan as baseline', export: 'Export', presentation: 'Presentation mode', edit: 'Return to editing', palette: 'Color palette', browserShort: 'Browser', fileDirtyShort: 'file unsaved', fileSavedShort: 'file saved', pendingShort: 'Save pending', theme: 'Appearance', light: 'Light', dark: 'Dark', search: 'Search tasks, notes…', phase: 'All phases', person: 'All assignees', status: 'All statuses', overdue: 'Overdue', reset: 'Reset', visible: 'visible tasks', empty: 'No tasks match your filters.', details: 'Details', task: 'Task details', title: 'Title', start: 'Start', end: 'End', assignee: 'Assignees (comma separated)', progress: 'Progress (%)', state: 'Status', deps: 'Dependencies and working-day lag (e.g. 1.2+3, 2.1)', notes: 'Notes', link: 'http(s) link', deadline: 'Deadline', effort: 'Total effort (person-days)', effortHelp: 'Optional. Shared equally among assignees and working days.', milestone: 'Milestone', cancel: 'Cancel', apply: 'Apply', slack: 'Float', days: 'working days', critical: 'Critical path', saveError: 'Browser save failed — export your work', browserSaved: 'Saved in this browser at', browserPending: 'Browser save pending', fileDirty: 'Changes not saved to a file', fileSaved: 'File saved at', downloaded: 'Download started at', imported: 'Full document loaded', importError: 'Import rejected', reloadError: 'Cannot reload the data file', invalid: 'Check dates, link and dependencies (no cycles).', noEffort: 'effort unspecified', workload: 'Estimated workload', capacity: 'Capacity: 1 person-day per working day. Missing estimates are not assumed to be full-time work.', overloaded: 'overloaded days', notAssigned: 'Unassigned', unestimated: 'task(s) without an estimate', duration: 'Duration', undo: 'Undo', redo: 'Redo', finish: 'Forecast finish', chartHelp: 'Rows expand to keep tasks separate. Scroll the calendar horizontally on narrow screens. Click a bar to locate its task; open Details for the full text.'
    }
};
function uiText(key) { return (WORKSPACE_I18N[currentLanguage] || WORKSPACE_I18N.fr)[key] || key; }
function taskMatchesFilters(task, group) {
    const f = planningFilters;
    return (!f.phase || String(group.id) === f.phase) && (!f.person || splitAssignees(task).includes(f.person)) &&
        (!f.status || task.statut === f.status) && (!f.overdue || isTaskOverdue(task)) &&
        (!f.query || [task.id, task.title, task.notes, task.assignedTo].join(' ').toLocaleLowerCase().includes(f.query.toLocaleLowerCase()));
}
function visiblePlanningGroups() {
    return riskGroups.map(g => ({ ...g, tasks: g.tasks.filter(task => taskMatchesFilters(task, g)) })).filter(g => g.tasks.length);
}
function filtersActive() { return Object.values(planningFilters).some(Boolean); }
function refreshFilterOptions() {
    const option = (value, label) => '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>';
    const phase = document.getElementById('filter-phase'), person = document.getElementById('filter-person'), status = document.getElementById('filter-status');
    if (!phase) return;
    phase.innerHTML = option('', uiText('phase')) + riskGroups.map(g => option(g.id, g.name)).join('');
    person.innerHTML = option('', uiText('person')) + [...new Set(risks.flatMap(splitAssignees))].sort().map(p => option(p, p)).join('');
    status.innerHTML = option('', uiText('status')) + getStatusOptions().map(s => option(s.value, s.label)).join('');
    phase.value = planningFilters.phase; person.value = planningFilters.person; status.value = planningFilters.status;
}
function updateFilters() {
    planningFilters = { query: document.getElementById('filter-query').value.trim(), phase: document.getElementById('filter-phase').value, person: document.getElementById('filter-person').value, status: document.getElementById('filter-status').value, overdue: document.getElementById('filter-overdue').checked };
    renderPlanning(); updateGantt();
}
function resetFilters() {
    planningFilters = { query: '', phase: '', person: '', status: '', overdue: false };
    document.getElementById('filter-query').value = '';
    document.getElementById('filter-overdue').checked = false;
    refreshFilterOptions(); renderPlanning(); updateGantt();
}
function decoratePlanning() {
    const visible = visiblePlanningGroups(), ids = new Set(visible.flatMap(g => g.tasks.map(t => t.id)));
    document.querySelectorAll('#planning-container tr[data-risk-id]').forEach(row => {
        row.hidden = !ids.has(row.dataset.riskId);
        if (row.previousElementSibling?.classList.contains('risk-separator-row')) row.previousElementSibling.hidden = filtersActive();
        const title = row.querySelector('.editable-risk-title');
        if (title && !row.querySelector('.task-details-button')) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'task-details-button';
            button.textContent = uiText('details'); button.setAttribute('aria-label', uiText('details') + ' — ' + title.textContent);
            button.addEventListener('click', () => openTaskPanel(row.dataset.riskId));
            row.firstElementChild.appendChild(button);
        }
    });
    document.querySelectorAll('#planning-container .risk-group').forEach(group => {
        group.hidden = !Array.from(group.querySelectorAll('tr[data-risk-id]')).some(row => !row.hidden) && filtersActive();
    });
    document.querySelectorAll('#planning-container .group-separator, #planning-container .risk-separator-row:last-child').forEach(el => { el.hidden = filtersActive(); });
    const counter = document.getElementById('filter-count');
    if (counter) counter.textContent = ids.size + ' / ' + risks.length + ' ' + uiText('visible');
    const empty = document.getElementById('filter-empty'); if (empty) { empty.hidden = ids.size > 0; empty.textContent = uiText('empty'); }
}

function openTaskPanel(id) {
    const task = risks.find(t => t.id === id); if (!task) return;
    editingTaskId = id;
    const dialog = document.getElementById('task-panel'), form = document.getElementById('task-form');
    document.getElementById('task-panel-title').textContent = uiText('task') + ' · ' + id;
    form.elements.statut.innerHTML = generateStatusOptions(task.statut);
    for (const key of ['title', 'startDate', 'endDate', 'assignedTo', 'notes', 'link', 'deadline', 'effortDays']) form.elements[key].value = task[key] ?? '';
    form.elements.progress.value = effectiveProgress(task);
    form.elements.dependsOn.value = (task.dependsOn || []).join(', ');
    form.elements.isMilestone.checked = !!task.isMilestone;
    form.elements.endDate.disabled = !!task.isMilestone;
    document.getElementById('task-form-error').textContent = '';
    const margin = taskMargins.get(id);
    document.getElementById('task-margin').textContent = margin ? uiText('slack') + ' : ' + margin.days + ' ' + uiText('days') + (margin.days === 0 ? ' · ' + uiText('critical') : '') : '';
    populateBusinessPanel(task);
    if (!dialog.open) dialog.showModal();
    form.elements.title.focus();
}
function applyTaskPanel(event) {
    event.preventDefault();
    const form = event.target, task = risks.find(t => t.id === editingTaskId); if (!task) return;
    const value = name => form.elements[name].value.trim();
    const next = { ...task, title: value('title'), startDate: value('startDate'), endDate: value('endDate'), assignedTo: value('assignedTo'), notes: value('notes'), link: value('link'), deadline: value('deadline'), statut: value('statut'), progress: Number(value('progress')), isMilestone: form.elements.isMilestone.checked };
    if ((isScheduleAnchored(task) && (next.startDate!==task.startDate || next.isMilestone!==!!task.isMilestone)) || (isTaskClosed(task) && next.endDate!==task.endDate)) { document.getElementById('task-form-error').textContent=uiText('scheduleLocked'); return; }
    try { readBusinessPanel(next); } catch(error) { document.getElementById('task-form-error').textContent=error.message; return; }
    const dependencies = value('dependsOn').split(',').map(s => s.trim()).filter(Boolean);
    const blocked = collectDescendants(task.id); blocked.add(task.id);
    const byId = new Set(risks.map(t => t.id));
    const invalidDeps = dependencies.some(entry => { const match = entry.match(/^([\w.-]+)(?:\+(\d+))?$/); return !match || !byId.has(match[1]) || blocked.has(match[1]) || Number(match[2] || 0) > 3650; });
    if (next.isMilestone) next.endDate = next.startDate;
    if (!next.title || !validISODate(next.startDate) || !validISODate(next.endDate) || next.endDate < next.startDate || (next.deadline && !validISODate(next.deadline)) || (next.link && !safeLink(next.link)) || invalidDeps) {
        document.getElementById('task-form-error').textContent = uiText('invalid'); return;
    }
    if (value('effortDays') === '') delete next.effortDays;
    else next.effortDays = Number(value('effortDays'));
    if (next.effortDays !== undefined && (!Number.isFinite(next.effortDays) || next.effortDays < 0)) return;
    if (dependencies.length) next.dependsOn = [...new Set(dependencies)]; else delete next.dependsOn;
    if (isTaskDone(next)) next.progress = 100;
    else if (next.progress === 100 && next.statut === 'statusInProgress') next.statut = 'statusReview';
    commitDocument();
    Object.keys(task).forEach(key => delete task[key]); Object.assign(task, next);
    applyDependencyCascade({}); refreshDocumentViews(); commitDocument();
    document.getElementById('task-panel').close();
}

// O(t*d*a), d = jours ouvrés des tâches, a = nombre de responsables.
function computeWorkload() { return computeFutureWorkload(); }
function renderWorkload() {
    const host = document.getElementById('workload-content'); if (!host) return;
    host.innerHTML = '<p class="workload-explanation">' + uiText('capacity') + '</p>' + computeWorkload().map(person => {
        const overload = [...person.days.entries()].filter(([,load]) => load > person.capacity + 0.00001);
        return '<article class="workload-person' + (overload.length ? ' has-conflict' : '') + '"><h3 class="workload-name">' + escapeHtml(person.name) + '</h3><p><strong>' + (person.effort===0 && person.unknown ? '—' : Math.round(person.effort * 100) / 100) + ' j-personnes</strong> · ' + person.unknown + ' ' + uiText('remainingUnknown') + '</p><p>' + (person.unscheduled ? person.unscheduled + ' ' + uiText('unscheduled') : '') + '</p><p class="workload-tasks">' + person.tasks.map(t => escapeHtml(t.id + ' · ' + t.title)).join('<br>') + '</p>' + (overload.length ? '<details><summary>' + overload.length + ' ' + uiText('overloaded') + '</summary>' + overload.map(([date, load]) => '<div>' + formatDateFR(date) + ' · ' + Math.round(load * 100) + '%</div>').join('') + '</details>' : '') + '</article>';
    }).join('');
}
function refreshWorkspaceLabels() {
    document.querySelectorAll('[data-ui]').forEach(el => { el.textContent = uiText(el.dataset.ui); });
    document.querySelectorAll('[data-ui-label]').forEach(el => { el.title = uiText(el.dataset.uiLabel); el.setAttribute('aria-label', el.title); });
    document.getElementById('filter-query').placeholder = uiText('search');
    refreshFilterOptions(); decoratePlanning(); renderBusinessDashboard();
}
function initWorkspace() {
    refreshWorkspaceLabels();
    document.getElementById('task-form').addEventListener('submit', applyTaskPanel);
    document.getElementById('settings-form').addEventListener('submit', saveSettings);
    document.getElementById('task-form').elements.isMilestone.addEventListener('change', e => { document.getElementById('task-form').elements.endDate.disabled = e.target.checked; document.getElementById('milestone-fields').hidden=!e.target.checked; });
    initDocumentHistory();
}

let ganttResizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(ganttResizeTimer);
    ganttResizeTimer = setTimeout(() => {
        if (workspaceReady && ganttChart && Math.max(1120, document.querySelector('.gantt-scroll').clientWidth) !== ganttChart.width) updateGantt();
    }, 120);
});

// Préférence de lecture, indépendante du document et de son historique.
function setTheme(theme, persist = true) {
    theme = theme === 'dark' ? 'dark' : 'light';
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.dataset.theme = theme;
    void root.offsetWidth; // Appliquer ensemble fond et texte avant de rétablir les transitions.
    root.classList.remove('theme-switching');
    document.getElementById('theme-selector').value = theme;
    if (persist) appStorage.setItem('plannr-theme', theme);
    if (ganttChart) updateGantt();
}
function initTheme() {
    const saved = appStorage.getItem('plannr-theme');
    setTheme(saved === 'light' || saved === 'dark' ? saved : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), false);
}
function ganttColors() {
    // Le PDF conserve un fond clair, quelle que soit la préférence de lecture.
    if (ganttExportWidth) return {surface:'#ffffff',header:'#eef1f4',ink:'#23292f',muted:'#596570',grid:'#e4e8ed',shading:'rgba(35,41,47,.055)',dependency:'#63707c',critical:'#a34444'};
    const style = getComputedStyle(document.documentElement);
    const token = name => style.getPropertyValue('--'+name).trim();
    return {surface:token('surface'),header:token('chart-header'),ink:token('ink'),muted:token('muted'),grid:token('chart-grid'),shading:token('chart-shading'),dependency:token('chart-dependency'),critical:token('danger')};
}

function uiIcon(name) {
    return '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#ui-' + name + '"></use></svg>';
}
