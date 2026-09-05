// Document canonique, historique et persistance. Complexité O(n) par snapshot.
var documentReady = false;
var workspaceReady = false;
var storageFailure = '';
let history = [], historyIndex = -1;
var snapshotTimer = null;
var restoringDocument = false;
var fileSignature = null, fileSavedAt = null, browserSavedAt = null, downloadedAt = null;
var sourceSignature = '';
const MAX_HISTORY = 50;

function canonicalSnapshot() {
    const data = buildCanonicalData();
    delete data.timestamp;
    return JSON.parse(JSON.stringify(data));
}

function validateDocument(input) {
    if (!input || typeof input !== 'object') throw new Error('Document invalide');
    const data = JSON.parse(JSON.stringify(input));
    data.phases = data.phases || data.riskGroups;
    if (!Array.isArray(data.phases)) throw new Error('La liste des phases est requise');
    const phaseIds = new Set();
    for (const phase of data.phases) {
        if (!phase || !Number.isInteger(Number(phase.id)) || phaseIds.has(String(phase.id))) throw new Error('Identifiant de phase invalide ou dupliqué');
        phase.id = Number(phase.id); phaseIds.add(String(phase.id));
        if (!Array.isArray(phase.tasks)) throw new Error('Chaque phase doit contenir une liste de tâches');
        phase.name = String(phase.name || 'Phase'); phase.description = String(phase.description || '');
        if (!/^#[0-9a-f]{6}$/i.test(phase.color || '')) phase.color = '#426B89';
        for (const task of phase.tasks) {
            if (!task || !/^[\w.-]+$/.test(String(task.id))) throw new Error('Identifiant de tâche invalide');
            task.statut = ({'Terminé':'statusTreated','En cours':'statusInProgress','A faire':'statusNotTreated','À faire':'statusNotTreated','Accepté':'statusAccepted'})[task.statut] || task.statut || 'statusNotTreated';
            if (task.assignedTo === undefined && task.responsable !== undefined) task.assignedTo = String(task.responsable);
            if (parseDependsOnFull(task).some(dep => !Number.isFinite(dep.lag) || dep.lag > 3650)) throw new Error('Délai de dépendance supérieur à 3650 jours');
            normalizeBusinessTask(task);
            task.id = String(task.id); task.title = String(task.title || 'Tâche');
            if (task.effortDays !== undefined && (!Number.isFinite(task.effortDays) || task.effortDays < 0)) throw new Error('Effort invalide');
        }
    }
    const nodes = new Map(data.phases.flatMap(g => g.tasks).map(t => [t.id, t]));
    const outgoing = new Map([...nodes.keys()].map(id => [id, []]));
    const degrees = new Map();
    for (const [id, task] of nodes) {
        const deps = parseDependsOnFull(task).filter(dep => nodes.has(dep.id));
        degrees.set(id, deps.length);
        for (const dep of deps) outgoing.get(dep.id).push(id);
    }
    const order = [...nodes.keys()].filter(id => degrees.get(id) === 0);
    for (let i = 0; i < order.length; i++) for (const next of outgoing.get(order[i])) {
        degrees.set(next, degrees.get(next) - 1); if (degrees.get(next) === 0) order.push(next);
    }
    if (order.length !== nodes.size) throw new Error('Cycle de dépendances');
    const cal = data.calendar || {};
    for (const key of ['extraHolidays', 'skippedHolidays']) {
        if (cal[key] !== undefined && (!Array.isArray(cal[key]) || cal[key].some(d => !validISODate(d)))) throw new Error('Calendrier invalide');
    }
    if (data.baseline && (!data.baseline.tasks || typeof data.baseline.tasks !== 'object' || Array.isArray(data.baseline.tasks))) throw new Error('Référence invalide');
    if (data.baseline) for (const row of Object.values(data.baseline.tasks)) {
        if (!row || !validISODate(row.startDate) || (row.endDate && !validISODate(row.endDate))) throw new Error('Dates de référence invalides');
    }
    data.resources = validateResources(data.resources || []);
    return data;
}

function validISODate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
}

function applyDocument(data) {
    riskGroups.splice(0, riskGroups.length, ...JSON.parse(JSON.stringify(data.phases)));
    risks.splice(0, risks.length, ...riskGroups.flatMap(g => g.tasks));
    baselineData = data.baseline ? JSON.parse(JSON.stringify(data.baseline)) : null;
    projectResources = JSON.parse(JSON.stringify(data.resources || []));
    const cal = data.calendar || {};
    calendarConfig = { saturdayWorked: !!cal.saturdayWorked, extraHolidays: new Set(cal.extraHolidays || []), skippedHolidays: new Set(cal.skippedHolidays || []) };
    const meta = data.appState || {};
    document.getElementById('main-title').textContent = meta.title || 'Plannr — Planning de projet';
    document.getElementById('main-subtitle').textContent = meta.subtitle || '';
    currentLanguage = Object.hasOwn(translations, meta.language) ? meta.language : 'fr';
    document.getElementById('language-selector').value = currentLanguage;
    document.getElementById('toggle-saturday-worked').checked = calendarConfig.saturdayWorked;
}

// Migration unique des champs enregistrés par les versions précédentes, dans ce document uniquement.
function migrateLegacyDocument(source) {
    const data = JSON.parse(JSON.stringify(source));
    try {
        const read = key => localStorage.getItem(LS_PREFIX + key);
        data.appState = data.appState || {};
        for (const [key, field] of [['analysis-main-title','title'],['analysis-main-subtitle','subtitle'],['riskr-language','language']]) {
            const value = read(key); if (value !== null) data.appState[field] = value;
        }
        for (const group of data.phases || data.riskGroups || []) {
            for (const [prefix, field] of [['group-name-','name'],['group-desc-','description']]) {
                const value = read(prefix + group.id); if (value !== null) group[field] = value;
            }
            for (const task of Array.isArray(group.tasks) ? group.tasks : []) for (const [prefix, field] of [['risk-title-','title'],['risk-status-','statut'],['risk-responsable-','assignedTo']]) {
                const value = read(prefix + task.id); if (value !== null) task[field] = value;
            }
        }
        const base = read('plannr-baseline'); if (base && !data.baseline) data.baseline = JSON.parse(base);
        const saturday = read('plannr-saturday-worked');
        if (saturday !== null) data.calendar = {...data.calendar, saturdayWorked: saturday === 'true'};
    } catch (err) { storageFailure = err.message; }
    return data;
}

function prepareDocument() {
    let source = window.PLANNR_EMBEDDED_DATA || window.PLANNR_DATA || { phases: riskGroups };
    sourceSignature = JSON.stringify(source);
    let selected = source;
    let hasStoredDocument = false;
    try {
        const stored = JSON.parse(localStorage.getItem(LS_PREFIX + 'document-v3') || 'null');
        hasStoredDocument = !!stored;
        if (stored && stored.source === sourceSignature) {
            selected = stored.data;
            fileSignature = stored.fileSignature || null;
            fileSavedAt = stored.fileSavedAt || null;
            browserSavedAt = stored.savedAt;
        }
    } catch (err) { storageFailure = err.message; }
    if (!hasStoredDocument && !window.PLANNR_EMBEDDED_DATA) selected = migrateLegacyDocument(selected);
    try { selected = validateDocument(selected); }
    catch (err) { storageFailure = err.message; selected = validateDocument({ phases: [] }); }
    applyDocument(selected);
    // Empêche les loaders historiques de réappliquer les anciennes valeurs.
    window.PLANNR_DATA = JSON.parse(JSON.stringify(selected));
    documentReady = true;
}

function saveState() {
    if (!workspaceReady || restoringDocument) return;
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(commitDocument, 0);
}

function commitDocument() {
    clearTimeout(snapshotTimer);
    if (!workspaceReady || restoringDocument) return;
    risks.splice(0, risks.length, ...riskGroups.flatMap(g => g.tasks));
    riskGroups.forEach(updatePhaseDates);
    const state = canonicalSnapshot();
    const signature = JSON.stringify(state);
    if (historyIndex >= 0 && JSON.stringify(history[historyIndex]) === signature) { renderSaveStatus(); return; }
    history = history.slice(0, historyIndex + 1);
    history.push(state);
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
    persistDocument(state);
    updateHistoryButtons();
}

function persistDocument(state = canonicalSnapshot()) {
    const now = new Date().toISOString();
    try {
        localStorage.setItem(LS_PREFIX + 'document-v3', JSON.stringify({ data: state, source: sourceSignature, savedAt: now, fileSignature, fileSavedAt }));
        browserSavedAt = now; storageFailure = '';
    } catch (err) { storageFailure = err.message; }
    renderSaveStatus();
}

function refreshDocumentViews() {
    recomputeCriticalPath();
    refreshWorkspaceLabels();
    renderPlanning(); updateGantt(); updateDashboard();
    renderSaveStatus();
}

function restoreState(state) {
    restoringDocument = true;
    applyDocument(state);
    refreshDocumentViews();
    restoringDocument = false;
    persistDocument(); updateHistoryButtons();
}

function undo() {
    commitDocument();
    if (historyIndex > 0) restoreState(history[--historyIndex]);
}
function redo() {
    clearTimeout(snapshotTimer);
    if (historyIndex < history.length - 1) restoreState(history[++historyIndex]);
}
function updateHistoryButtons() {
    const u = document.getElementById('undo-action'), r = document.getElementById('redo-action');
    if (u) u.disabled = historyIndex <= 0;
    if (r) r.disabled = historyIndex >= history.length - 1;
}
function renderSaveStatus() {
    const host = document.getElementById('save-status');
    if (!host || !documentReady) return;
    const dirty = JSON.stringify(canonicalSnapshot()) !== fileSignature;
    const time = s => new Date(s).toLocaleTimeString(currentLanguage === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    host.dataset.dirty = String(dirty);
    host.textContent = storageFailure ? uiText('saveError') : (browserSavedAt ? uiText('browserSaved') + ' ' + time(browserSavedAt) : uiText('browserPending'));
    host.textContent += ' · ' + (dirty ? uiText('fileDirty') : uiText('fileSaved') + ' ' + time(fileSavedAt));
    if (downloadedAt) host.textContent += ' · ' + uiText('downloaded') + ' ' + time(downloadedAt);
    const detail = host.textContent;
    const compact = storageFailure ? uiText('saveError') : (browserSavedAt ? uiText('browserShort') : uiText('pendingShort')) + ' · ' + uiText(dirty ? 'fileDirtyShort' : 'fileSavedShort');
    host.title = detail;
    host.innerHTML = '<span class="sr-only">' + escapeHtml(detail) + '</span><span aria-hidden="true">' + escapeHtml(compact) + '</span>';

}
function markFileSaved(signature) {
    fileSignature = signature; fileSavedAt = new Date().toISOString(); persistDocument();
}

function importFromJSON(input) {
    const file = input.files[0]; if (!file) return;
    file.text().then(text => {
        const data = validateDocument(JSON.parse(text));
        commitDocument();
        applyDocument(data);
        sanitizeData(); applyDependencyCascade({ silent: true });
        bannerDismissed = false;
        refreshDocumentViews(); commitDocument();
        showToast(uiText('imported'));
    }).catch(err => showToast(uiText('importError') + ': ' + err.message, 'error'))
      .finally(() => { input.value = ''; });
}

function reloadPlannrData() {
    commitDocument();
    const script = document.createElement('script');
    script.src = 'plannr-data.js?t=' + Date.now();
    script.onload = () => {
        try {
            const data = validateDocument(window.PLANNR_DATA);
            sourceSignature = JSON.stringify(window.PLANNR_DATA);
            applyDocument(data); sanitizeData(); applyDependencyCascade({ silent: true });
            refreshDocumentViews(); commitDocument(); showToast(uiText('imported'));
        } catch (err) { showToast(err.message, 'error'); }
        script.remove();
    };
    script.onerror = () => { script.remove(); showToast(uiText('reloadError'), 'error'); };
    document.head.appendChild(script);
}

function initDocumentHistory() {
    workspaceReady = true;
    commitDocument();
    document.addEventListener('keydown', e => {
        if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
        if (!(e.metaKey || e.ctrlKey)) return;
        if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        else if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    });
    // Capture en fin de tour : inclut les éditions inline et leurs événements blur.
    for (const event of ['change', 'blur', 'click', 'mouseup', 'drop']) document.addEventListener(event, saveState, true);
}
