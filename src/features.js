
        // ====================================================================
        // PLANNR FEATURES — module additif (concaténé AVANT app.js au build)
        // Jours ouvrés/fériés FR, ligne aujourd'hui, retards, % avancement,
        // baseline, dépendances + cascade + chemin critique, export ICS.
        //
        // Règle d'architecture : UNIQUEMENT des déclarations de fonctions
        // (hoistées, donc visibles par app.js) et des enregistrements de
        // plugins Chart.js (leurs callbacks ne s'exécutent qu'au rendu).
        // Aucune exécution top-level ne touche à l'état applicatif :
        // app.js s'initialise après, et appelle les hooks de ce module.
        // ====================================================================

        // --------------------------------------------------------------
        // i18n additionnel — fusionné dans `translations` par app.js (init)
        // --------------------------------------------------------------
        var PLANNR_EXTRA_I18N = {
            fr: {
                colDuration: "Durée (j ouvrés)",
                colProgress: "Avanc.",
                colDependsOn: "Dépend de",
                dashboardOverdue: "En retard",
                todayLabel: "Aujourd'hui",
                overdueBadge: "retard",
                overdueTooltip: "Échéance dépassée et tâche non terminée",
                baselineBtn: "Baseline",
                baselineSet: "Baseline figée — la dérive s'affiche sous les barres",
                baselineReplaceConfirm: "Une baseline existe déjà. La remplacer par le planning actuel ?",
                depsHint: "Cliquer pour choisir les dépendances",
                depsInvalid: "IDs de dépendance inconnus ou auto-référents ignorés : {ids}",
                depsCycle: "Cycle de dépendances détecté — cascade interrompue",
                tasksShifted: "{n} tâche(s) décalée(s) par les dépendances",
                icsExported: "{n} jalon(s) exporté(s) au format calendrier",
                icsNoMilestone: "Aucun jalon à exporter",
                subtreeShifted: "Descendance déplacée : {n} tâche(s)",
                altDragHint: "💡 Alt+glisser pour déplacer aussi toute la descendance",
                criticalPathLegend: "─ ─ chemin critique"
            },
            en: {
                colDuration: "Duration (working d)",
                colProgress: "Progress",
                colDependsOn: "Depends on",
                dashboardOverdue: "Overdue",
                todayLabel: "Today",
                overdueBadge: "overdue",
                overdueTooltip: "Deadline passed and task not completed",
                baselineBtn: "Baseline",
                baselineSet: "Baseline frozen — drift shows under the bars",
                baselineReplaceConfirm: "A baseline already exists. Replace it with the current plan?",
                depsHint: "Click to pick dependencies",
                depsInvalid: "Unknown or self-referencing dependency IDs ignored: {ids}",
                depsCycle: "Dependency cycle detected — cascade aborted",
                tasksShifted: "{n} task(s) shifted by dependencies",
                icsExported: "{n} milestone(s) exported to calendar format",
                icsNoMilestone: "No milestone to export",
                subtreeShifted: "Subtree moved: {n} task(s)",
                altDragHint: "💡 Alt+drag to also move the whole subtree",
                criticalPathLegend: "─ ─ critical path"
            },
            es: {
                colDuration: "Duración (d lab.)",
                colProgress: "Avance",
                colDependsOn: "Depende de",
                dashboardOverdue: "Atrasadas",
                todayLabel: "Hoy",
                overdueBadge: "atraso",
                overdueTooltip: "Fecha límite superada y tarea no terminada",
                baselineBtn: "Baseline",
                baselineSet: "Baseline fijada — la deriva se muestra bajo las barras",
                baselineReplaceConfirm: "Ya existe una baseline. ¿Reemplazarla por el plan actual?",
                depsHint: "Clic para elegir dependencias",
                depsInvalid: "IDs de dependencia desconocidos o auto-referentes ignorados: {ids}",
                depsCycle: "Ciclo de dependencias detectado — cascada interrumpida",
                tasksShifted: "{n} tarea(s) desplazada(s) por dependencias",
                icsExported: "{n} hito(s) exportado(s) a formato calendario",
                icsNoMilestone: "Ningún hito que exportar",
                subtreeShifted: "Descendencia desplazada: {n} tarea(s)",
                altDragHint: "💡 Alt+arrastrar para mover también toda la descendencia",
                criticalPathLegend: "─ ─ camino crítico"
            },
            ar: {
                colDuration: "المدة (أيام عمل)",
                colProgress: "التقدم",
                colDependsOn: "يعتمد على",
                dashboardOverdue: "متأخرة",
                todayLabel: "اليوم",
                overdueBadge: "متأخر",
                overdueTooltip: "تجاوز الموعد النهائي والمهمة غير مكتملة",
                baselineBtn: "الخط المرجعي",
                baselineSet: "تم تثبيت الخط المرجعي",
                baselineReplaceConfirm: "يوجد خط مرجعي بالفعل. استبداله بالخطة الحالية؟",
                depsHint: "انقر لاختيار التبعيات",
                depsInvalid: "تم تجاهل معرفات غير معروفة: {ids}",
                depsCycle: "تم اكتشاف حلقة تبعيات",
                tasksShifted: "تم إزاحة {n} مهمة بسبب التبعيات",
                icsExported: "تم تصدير {n} معلم إلى التقويم",
                icsNoMilestone: "لا يوجد معلم للتصدير",
                subtreeShifted: "تم نقل {n} مهمة تابعة",
                altDragHint: "💡 Alt+سحب لنقل كل المهام التابعة أيضًا",
                criticalPathLegend: "─ ─ المسار الحرج"
            }
        };

        // --------------------------------------------------------------
        // Jours ouvrés & fériés français
        // --------------------------------------------------------------
        // Dimanche de Pâques (algorithme de Meeus/Butcher, valide gregorien)
        var baselineData = null; // { savedAt, tasks: { id: {startDate, endDate} } }

        function loadBaseline() {
            if (window.PLANNR_DATA && window.PLANNR_DATA.baseline &&
                window.PLANNR_DATA.baseline.tasks) {
                baselineData = window.PLANNR_DATA.baseline;
                return;
            }
            try {
                const raw = appStorage.getItem('plannr-baseline');
                if (raw) baselineData = JSON.parse(raw);
            } catch (e) { /* baseline corrompue : on repart sans */ }
        }

        function setBaseline() {
            if (baselineData && !confirm(t('baselineReplaceConfirm'))) return;
            const snap = { savedAt: new Date().toISOString(), tasks: {} };
            risks.forEach(tk => {
                snap.tasks[tk.id] = { startDate: tk.startDate, endDate: tk.endDate || tk.startDate };
            });
            baselineData = snap;
            appStorage.setItem('plannr-baseline', JSON.stringify(snap));
            showToast(t('baselineSet'));
            updateGantt();
        }

        // --------------------------------------------------------------
        // Export ICS (jalons -> événements calendrier)
        // --------------------------------------------------------------
        function icsEscape(s) {
            return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;')
                            .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
        }

        function exportToICS() {
            const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
            const title = (document.getElementById('main-title') || {}).textContent || 'Plannr';
            const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0',
                           'PRODID:-//Plannr//Jalons//FR', 'CALSCALE:GREGORIAN'];
            let count = 0;
            risks.filter(tk => tk.isMilestone && tk.startDate).forEach(tk => {
                const d = tk.startDate.replace(/-/g, '');
                count++;
                lines.push(
                    'BEGIN:VEVENT',
                    'UID:plannr-' + tk.id + '-' + d + '@plannr.local',
                    'DTSTAMP:' + stamp,
                    'DTSTART;VALUE=DATE:' + d,
                    'SUMMARY:' + icsEscape('◆ ' + tk.id + ' — ' + tk.title),
                    'DESCRIPTION:' + icsEscape(title),
                    'END:VEVENT');
            });
            lines.push('END:VCALENDAR');
            if (!count) { showToast(t('icsNoMilestone'), 'error'); return; }
            downloadTextFile(lines.join('\r\n') + '\r\n', 'plannr_jalons.ics', 'text/calendar');
            showToast(t('icsExported').replace('{n}', count));
        }

        // --------------------------------------------------------------
        // Cellules tableau (avancement, dépendances, badge retard)
        // --------------------------------------------------------------
        function renderProgressCellHTML(risk) {
            if (risk.isMilestone) return '<td class="progress-cell">—</td>';
            const p = effectiveProgress(risk);
            return '<td class="progress-cell"><label class="progress-value">' +
                '<input type="number" class="editable-progress" data-risk-id="' + risk.id +
                '" aria-label="' + uiText('progress') + '" min="0" max="100" step="5" value="' + p + '"' + (isTaskClosed(risk) ? ' disabled' : '') + '>' +
                '<span aria-hidden="true">%</span></label>' +
                '</td>';
        }

        function renderDependsCellHTML(risk) {
            // entrées brutes : le lag "+N" doit rester visible
            const deps = (Array.isArray(risk.dependsOn) ? risk.dependsOn : []).join(', ');
            return '<td class="depends-cell"><span class="editable-depends" data-risk-id="' +
                risk.id + '" title="' + t('depsHint') + '">' +
                (deps || '<span class="depends-placeholder">＋</span>') + '</span></td>';
        }

        function overdueBadgeHTML(risk) {
            return isTaskOverdue(risk)
                ? ' <span class="overdue-badge" title="' + t('overdueTooltip') + '">⚠ ' + t('overdueBadge') + '</span>'
                : '';
        }

        function initProgressEditing() {
            document.querySelectorAll('.editable-progress').forEach(input => {
                if (input.dataset.editingInitialized) return;
                input.dataset.editingInitialized = 'true';
                input.addEventListener('change', function () {
                    const task = risks.find(r => r.id === this.dataset.riskId);
                    if (!task || isTaskClosed(task)) return;
                    saveState();
                    let v = parseInt(this.value, 10);
                    if (!Number.isFinite(v)) v = 0;
                    v = Math.min(100, Math.max(0, v));
                    task.progress = v;
                    if (v === 100 && !isTaskDone(task)) task.statut = 'statusReview';
                    else if (isTaskDone(task)) task.statut = 'statusInProgress';
                    this.value = v;
                    updateGantt();
                    updateDashboard(); renderPlanning();
                });
            });
        }

        function initDependsEditing() {
            document.querySelectorAll('.editable-depends').forEach(span => {
                if (span.dataset.editingInitialized) return;
                span.dataset.editingInitialized = 'true';
                span.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    const task = risks.find(r => r.id === this.dataset.riskId);
                    if (!task) return;
                    openDependsPopover(task, this);
                });
            });
        }

        // ----- Sélecteur de dépendances (v2.3 / picker popover) -----
        // Anti-cycle PRÉVENTIF : les descendantes de la tâche (et elle-même)
        // sont grisées — impossible de saisir une bêtise.
        var _depsPopover = null;

        function closeDependsPopover(commit) {
            if (!_depsPopover) return;
            const state = _depsPopover;
            _depsPopover = null;
            document.removeEventListener('mousedown', state.outsideHandler, true);
            document.removeEventListener('keydown', state.keyHandler, true);
            if (commit) _commitDependsPopover(state);
            state.el.remove();
        }

        function _commitDependsPopover(state) {
            const entries = [];
            state.el.querySelectorAll('.dp-row input[type="checkbox"]:checked')
                .forEach(cb => {
                    const lagInput = cb.closest('.dp-row').querySelector('.dp-lag-input');
                    const lag = Math.max(0, parseInt(lagInput && lagInput.value, 10) || 0);
                    entries.push(lag > 0 ? cb.dataset.id + '+' + lag : cb.dataset.id);
                });
            if (JSON.stringify(entries) === JSON.stringify(state.task.dependsOn || [])) {
                return; // rien n'a changé
            }
            saveState();
            if (entries.length) state.task.dependsOn = entries;
            else delete state.task.dependsOn;
            applyDependencyCascade({});
            recomputeCriticalPath();
            renderPlanning();
            updateGantt();
            updateDashboard();
        }

        function openDependsPopover(task, anchorEl) {
            closeDependsPopover(false);
            const cycleIds = collectDescendants(task.id);
            const current = new Map(parseDependsOnFull(task).map(d => [d.id, d.lag]));

            const pop = document.createElement('div');
            pop.className = 'depends-popover';
            // XSS : chaque valeur issue des données est échappée via
            // escapeHtml avant insertion (NFR-2)
            let html = '<div class="dp-title">Dépendances de ' + escapeHtml(task.id) +
                ' — ' + escapeHtml(task.title) + '</div>' +
                '<div class="dp-hint">La tâche démarre après la fin de chaque tâche ' +
                'cochée (+ délai éventuel en jours ouvrés)</div><div class="dp-list">';
            riskGroups.forEach(group => {
                html += '<div class="dp-phase">' + escapeHtml(group.name) + '</div>';
                group.tasks.forEach(other => {
                    const isSelf = other.id === task.id;
                    const isCycle = cycleIds.has(other.id);
                    if (isSelf || isCycle) {
                        html += '<div class="dp-row dp-disabled" title="' +
                            (isSelf ? 'La tâche elle-même'
                                    : 'Créerait un cycle de dépendances') + '">' +
                            '<span class="dp-check">▩</span> ' +
                            escapeHtml(other.id + ' — ' + other.title) +
                            ' <span class="dp-why">(' +
                            (isSelf ? 'elle-même' : 'cycle') + ')</span></div>';
                    } else {
                        const checked = current.has(other.id);
                        const lag = current.get(other.id) || 0;
                        html += '<label class="dp-row">' +
                            '<input type="checkbox" data-id="' + escapeHtml(other.id) +
                            '"' + (checked ? ' checked' : '') + '>' +
                            '<span class="dp-label">' +
                            escapeHtml(other.id + ' — ' + other.title) + '</span>' +
                            '<span class="dp-lag">+<input type="number" ' +
                            'class="dp-lag-input" min="0" max="365" value="' + lag +
                            '"' + (checked ? '' : ' disabled') + '> j</span>' +
                            '</label>';
                    }
                });
            });
            html += '</div><div class="dp-footer"><button class="dp-ok">OK</button>' +
                '<span class="dp-esc">Échap pour annuler</span></div>';
            pop.innerHTML = html;
            document.body.appendChild(pop);

            // Position : sous la cellule, recalée dans la fenêtre
            const r = anchorEl.getBoundingClientRect();
            pop.style.top = (r.bottom + window.scrollY + 6) + 'px';
            pop.style.left = Math.max(12, Math.min(r.left + window.scrollX,
                window.scrollX + document.documentElement.clientWidth -
                pop.offsetWidth - 12)) + 'px';

            pop.addEventListener('change', evd => {
                if (evd.target.type === 'checkbox') {
                    const lagInput = evd.target.closest('.dp-row')
                        .querySelector('.dp-lag-input');
                    if (lagInput) lagInput.disabled = !evd.target.checked;
                }
            });

            const state = { el: pop, task };
            state.outsideHandler = evd => {
                if (!pop.contains(evd.target)) closeDependsPopover(true);
            };
            state.keyHandler = evd => {
                if (evd.key === 'Escape') {
                    evd.stopPropagation();
                    closeDependsPopover(false);
                }
            };
            pop.querySelector('.dp-ok').addEventListener('click',
                () => closeDependsPopover(true));
            // Clavier : immédiat (aucune raison de différer — évite une
            // fenêtre de course où un Échap précoce serait perdu).
            document.addEventListener('keydown', state.keyHandler, true);
            // Clic-extérieur : différé d'un tick pour ignorer le clic d'ouverture
            setTimeout(() => {
                document.addEventListener('mousedown', state.outsideHandler, true);
            }, 0);
            _depsPopover = state;
        }

        // ==================================================================
        // v2.2 — sécurité, butoirs, bandeau, journal, charge, fenêtre, disque
        // ==================================================================

        // Les données viennent d'un agent : tout passage en innerHTML est échappé
        function escapeHtml(value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        // Seuls les liens http(s) sont acceptés (pas de javascript: etc.)
        function safeLink(url) {
            return /^https?:\/\//i.test(String(url || '')) ? String(url) : null;
        }

        // ----- Dates butoirs (FR-3) -----
        function isDeadlineExceeded(task) {
            if (!task.deadline) return false;
            const end = taskEndForDeps(task);
            return !isTaskCancelled(task) && !!end && end > task.deadline;
        }

        function deadlineBadgeHTML(risk) {
            if (!risk.deadline) return '';
            const exceeded = isDeadlineExceeded(risk);
            return ' <span class="deadline-badge' + (exceeded ? ' exceeded' : '') +
                '" title="Date butoir : ' + formatDateFR(risk.deadline) +
                (exceeded ? ' — DÉPASSÉE' : '') + '">⚑' +
                (exceeded ? ' butoir' : '') + '</span>';
        }

        // ----- Incohérences statut/avancement (FR-8) -----
        function taskInconsistencies(task) {
            const issues = [];
            const prog = parseInt(task.progress, 10);
            if (isTaskDone(task) && Number.isFinite(prog) && prog < 100) {
                issues.push('statut Terminé mais avancement ' + prog + ' %');
            }
            if (!isTaskClosed(task) && task.statut !== 'statusReview' && prog === 100) {
                issues.push('avancement 100 % mais statut « ' + (task.statut || '?') + ' »');
            }
            return issues;
        }

        function inconsistencyBadgeHTML(risk) {
            const issues = taskInconsistencies(risk);
            return issues.length
                ? ' <span class="inconsistency-badge" title="' +
                  escapeHtml(issues.join(' · ')) + '">⚠</span>'
                : '';
        }

        // ----- Notes & lien (FR-4) -----
        function notesIconHTML(risk) {
            const has = !!(risk.notes && String(risk.notes).trim());
            return ' <span class="notes-icon' + (has ? ' has-notes' : '') +
                '" data-risk-id="' + escapeHtml(risk.id) + '" title="' +
                (has ? escapeHtml(risk.notes) : 'Ajouter une note') + '">' + uiIcon('note') + '</span>';
        }

        function linkIconHTML(risk) {
            const url = safeLink(risk.link);
            return url
                ? ' <a class="link-icon" href="' + escapeHtml(url) +
                  '" target="_blank" rel="noopener noreferrer" title="' +
                  escapeHtml(url) + '">' + uiIcon('link') + '</a>'
                : '';
        }

        function initNotesEditing() {
            document.querySelectorAll('.notes-icon').forEach(el => { el.tabIndex = 0; el.setAttribute('role', 'button'); el.onclick = () => openTaskPanel(el.dataset.riskId); el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTaskPanel(el.dataset.riskId); } }; });
        }


        // ----- Anomalies de chargement + bandeau (FR-1/3/8/10) -----
        var dataAnomalies = [];
        var bannerDismissed = false;
        var dataChangeSummary = [];

        function pushAnomaly(message) {
            dataAnomalies.push(message);
        }

        function dismissBanner() {
            bannerDismissed = true;
            renderValidationBanner();
        }

        function renderValidationBanner() {
            const host = document.getElementById('plannr-banner');
            if (!host) return;
            if (bannerDismissed) { host.innerHTML = ''; return; }
            const sections = [];
            if (dataAnomalies.length) {
                sections.push({ cls: 'banner-error',
                    title: 'Anomalies corrigées au chargement', items: dataAnomalies });
            }
            if (dataChangeSummary.length) {
                sections.push({ cls: 'banner-info',
                    title: 'Changements depuis le dernier chargement',
                    items: dataChangeSummary });
            }
            if (!sections.length) { host.innerHTML = ''; return; }
            // XSS : chaque valeur interpolée ci-dessous est échappée (NFR-2)
            host.innerHTML = '<div class="plannr-banner-inner">' +
                '<button class="banner-close" title="Masquer" onclick="dismissBanner()">×</button>' +
                sections.map(s =>
                    '<div class="banner-section ' + s.cls + '">' +
                    '<div class="banner-title">' + escapeHtml(s.title) +
                    ' (' + s.items.length + ')</div><ul>' +
                    s.items.slice(0, 8).map(item =>
                        '<li>' + escapeHtml(item) + '</li>').join('') +
                    (s.items.length > 8
                        ? '<li>… et ' + (s.items.length - 8) + ' autre(s)</li>' : '') +
                    '</ul></div>').join('') +
                '</div>';
        }

        // ----- Journal des changements entre chargements (FR-10) -----
        function computeDataChangeJournal() {
            dataChangeSummary = [];
            try {
                const previousRaw = appStorage.getItem('plannr-data-snapshot');
                const current = {};
                risks.forEach(tk => {
                    current[tk.id] = { s: tk.startDate, e: tk.endDate || '', t: tk.title };
                });
                if (previousRaw) {
                    const previous = JSON.parse(previousRaw);
                    const added = Object.keys(current).filter(id => !(id in previous));
                    const removed = Object.keys(previous).filter(id => !(id in current));
                    let datesChanged = 0, titlesChanged = 0;
                    Object.keys(current).forEach(id => {
                        if (!(id in previous)) return;
                        if (previous[id].s !== current[id].s ||
                            previous[id].e !== current[id].e) datesChanged++;
                        if (previous[id].t !== current[id].t) titlesChanged++;
                    });
                    if (added.length) dataChangeSummary.push('Ajoutées : ' + added.join(', '));
                    if (removed.length) dataChangeSummary.push('Supprimées : ' + removed.join(', '));
                    if (datesChanged) dataChangeSummary.push(datesChanged + ' tâche(s) aux dates modifiées');
                    if (titlesChanged) dataChangeSummary.push(titlesChanged + ' titre(s) modifié(s)');
                }
                appStorage.setItem('plannr-data-snapshot', JSON.stringify(current));
            } catch (err) { /* journal best-effort, jamais bloquant */ }
        }

        // ----- Charge par responsable (FR-6) -----
        function splitAssignees(task) {
            return String(task.assignedTo || '').split(/[\/,;&]+/)
                .map(s => s.trim()).filter(Boolean);
        }

        function workingOverlapDays(a, b) {
            const start = a.startDate > b.startDate ? a.startDate : b.startDate;
            const endA = a.endDate || a.startDate, endB = b.endDate || b.startDate;
            const end = endA < endB ? endA : endB;
            return start <= end ? workingDaysBetween(start, end) : 0;
        }



        // ----- Fenêtre temporelle du Gantt (FR-5) -----
        var ganttZoomSpanDays = null;   // null = tout le projet
        var ganttZoomAnchorMs = null;

        function ganttZoomWindow(minDate, maxDate, dayMs) {
            if (!ganttZoomSpanDays) {
                return { min: minDate - 3 * dayMs, max: maxDate + 3 * dayMs };
            }
            if (ganttZoomAnchorMs === null) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                ganttZoomAnchorMs = now.getTime() -
                    Math.round(ganttZoomSpanDays * 0.2) * dayMs;
            }
            return { min: ganttZoomAnchorMs,
                     max: ganttZoomAnchorMs + ganttZoomSpanDays * dayMs };
        }

        function setGanttZoom(spanDays) {
            ganttZoomSpanDays = spanDays || null;
            if (ganttZoomSpanDays) {
                appStorage.setItem('plannr-zoom-span', String(ganttZoomSpanDays));
            } else {
                appStorage.removeItem('plannr-zoom-span');
                ganttZoomAnchorMs = null;
            }
            updateZoomButtons();
            updateGantt();
        }

        function ganttGoToday() {
            if (!ganttZoomSpanDays) return;
            ganttZoomAnchorMs = null; // recalculé autour d'aujourd'hui au rendu
            updateGantt();
        }

        function ganttPan(direction) {
            if (!ganttZoomSpanDays || ganttZoomAnchorMs === null) return;
            ganttZoomAnchorMs += direction *
                Math.round(ganttZoomSpanDays / 2) * 86400000;
            updateGantt();
        }

        function updateZoomButtons() {
            document.querySelectorAll('.zoom-btn[data-span]').forEach(btn => {
                const value = btn.dataset.span === 'all'
                    ? null : parseInt(btn.dataset.span, 10);
                btn.classList.toggle('active', value === ganttZoomSpanDays);
            });
            const nav = document.getElementById('zoom-nav');
            if (nav) nav.style.display = ganttZoomSpanDays ? 'inline-flex' : 'none';
        }

        function initGanttZoom() {
            const saved = parseInt(appStorage.getItem('plannr-zoom-span'), 10);
            if (Number.isFinite(saved) && saved > 0) {
                ganttZoomSpanDays = saved;
                updateGantt();
            }
            updateZoomButtons();
        }

        // ----- Enregistrement direct sur disque (FR-9) -----
        var fsDataFileHandle = null;

        function buildDataJsContent() {
            return '// plannr-data.js — Données du planning Plannr\n' +
                '// Généré depuis plannr.html le ' + new Date().toISOString() + '\n' +
                '// Schéma : schemas/plannr-data.schema.json (format canonique v2.2)\n' +
                'window.PLANNR_DATA = ' +
                JSON.stringify(buildCanonicalData(), null, 2) + ';\n';
        }

        async function saveDataToDisk() {
            commitDocument();
            const signature = JSON.stringify(canonicalSnapshot());
            const content = buildDataJsContent();
            if (!window.showSaveFilePicker) {
                // Safari / Firefox : pas de File System Access — téléchargement
                downloadTextFile(content, 'plannr-data.js', 'text/javascript');
                downloadedAt = new Date().toISOString(); renderSaveStatus();
                showToast('Navigateur sans accès fichier : plannr-data.js téléchargé');
                return;
            }
            try {
                if (!fsDataFileHandle) {
                    fsDataFileHandle = await window.showSaveFilePicker({
                        suggestedName: 'plannr-data.js',
                        types: [{ description: 'Données Plannr',
                                  accept: { 'text/javascript': ['.js'] } }]
                    });
                }
                const writable = await fsDataFileHandle.createWritable();
                await writable.write(content);
                await writable.close();
                markFileSaved(signature);
                showToast('plannr-data.js enregistré');
            } catch (err) {
                if (err && err.name === 'AbortError') return; // annulé par l'utilisateur
                fsDataFileHandle = null;
                downloadTextFile(content, 'plannr-data.js', 'text/javascript');
                showToast('Écriture directe impossible : fichier téléchargé', 'error');
            }
        }

        // ----- Clic sur une barre -> ligne du tableau (FR-12) -----
        function highlightTaskRow(taskId) {
            const selector = 'tr[data-risk-id="' +
                (window.CSS && CSS.escape ? CSS.escape(taskId) : taskId) + '"]';
            const row = document.querySelector(selector);
            if (!row) return;
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('row-flash');
            setTimeout(() => row.classList.remove('row-flash'), 1800);
        }

        // Marqueurs de dates butoirs sur le Gantt (FR-3)
        Chart.register({
            id: 'deadlineMarkersPlugin',
            afterDatasetsDraw: function (chart) {
                const gd = chart.options.ganttData;
                if (!gd) return;
                const x = chart.scales.x, ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                ctx.save();
                function drawMarker(px, yTop, yBottom, exceeded) {
                    if (px < x.left || px > x.right) return;
                    ctx.strokeStyle = '#D70015';
                    ctx.lineWidth = exceeded ? 2 : 1.5;
                    ctx.beginPath();
                    ctx.moveTo(px, yTop);
                    ctx.lineTo(px, yBottom);
                    ctx.stroke();
                    ctx.fillStyle = '#D70015';
                    ctx.font = (exceeded ? 'bold ' : '') + '11px -apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('⚑', px, yTop - 1);
                }
                gd.forEach((d, i) => {
                    if (!d.task || !d.task.deadline) return;
                    const el = meta.data[i];
                    if (!el) return;
                    // fin du jour butoir : finir LE jour butoir est autorisé
                    const px = x.getPixelForValue(
                        new Date(d.task.deadline).getTime() + 86400000);
                    const half = (el.height || 35) / 2;
                    drawMarker(px, el.y - half - 6, el.y + half + 4,
                        isDeadlineExceeded(d.task));
                });
                (chart.options.milestonesData || []).forEach(m => {
                    if (!m.task || !m.task.deadline) return;
                    const py = chart.scales.y.getPixelForValue(m.yPosition);
                    const px = x.getPixelForValue(
                        new Date(m.task.deadline).getTime() + 86400000);
                    drawMarker(px, py - 14, py + 14, isDeadlineExceeded(m.task));
                });
                ctx.restore();
            }
        });

        // ------------------------------------------------------------------
        // Pastille de connexion (v2.3) : créer une dépendance au drag.
        // La pastille apparaît À CÔTÉ du bord droit (bord+12..+24 px), zone
        // DISJOINTE de la poignée de resize (bord ±10 px) — aucun conflit.
        // Tirer depuis la pastille trace une flèche élastique ; lâcher sur
        // une barre cible crée cible.dependsOn += source (cascade immédiate).
        // ------------------------------------------------------------------
        var LINK_DOT_OFFSET = 14;
        var LINK_DOT_RADIUS = 7;
        var linkDrag = null; // { sourceId, invalidTargets:Set }

        // Géométrie écran des barres du Gantt courant. O(n).
        // IMPORTANT : positions FINALES via les échelles (comme les autres
        // hit-tests de l'app), pas via meta.data — pendant l'animation
        // d'entrée (~1 s), les éléments sont en transit et les zones de
        // clic seraient fausses (pastille sous un point inattendu).
        function _ganttBarGeometry(chart) {
            if (!chart || !chart.options.ganttData) return [];
            const gd = chart.options.ganttData;
            const xAxis = chart.scales.x, yAxis = chart.scales.y;
            if (!xAxis || !yAxis) return [];
            const barH = (ganttViewMode === 'compact' || ganttViewMode === 'consolide') ? 40 : 35;
            const out = [];
            gd.forEach(d => {
                if (!d.task) return;
                const px0 = xAxis.getPixelForValue(d.x[0]);
                const px1 = xAxis.getPixelForValue(d.x[1]);
                let y = yAxis.getPixelForValue(d.y);
                if (d.isMilestone && d.compactMode && ganttViewMode === 'compact') y += 0;
                out.push({ id: d.task.id, task: d.task,
                           x0: Math.min(px0, px1), x1: Math.max(px0, px1),
                           y: y, h: barH, isMilestone: !!d.isMilestone });
            });
            return out;
        }

        function findLinkDotAt(mouseX, mouseY) {
            if (typeof ganttChart === 'undefined' || !ganttChart) return null;
            const bars = _ganttBarGeometry(ganttChart);
            const r2 = (LINK_DOT_RADIUS + 3) * (LINK_DOT_RADIUS + 3);
            for (const b of bars) {
                if (b.isMilestone) continue;
                const dx = mouseX - (b.x1 + LINK_DOT_OFFSET);
                const dy = mouseY - b.y;
                if (dx * dx + dy * dy <= r2) return b.task;
            }
            return null;
        }

        // Ancêtres transitifs (tâches dont taskId dépend). O(V+E).
        function collectAncestors(taskId) {
            const byId = tasksById();
            const out = new Set();
            const queue = [taskId];
            while (queue.length) {
                const id = queue.shift();
                const tk = byId[id];
                if (!tk) continue;
                parseDependsOn(tk).forEach(pid => {
                    if (!out.has(pid)) { out.add(pid); queue.push(pid); }
                });
            }
            return out;
        }

        function startLinkDrag(sourceTask) {
            // cible.dependsOn += source crée un cycle ssi la cible est un
            // ANCÊTRE de la source (ou la source elle-même)
            const invalid = collectAncestors(sourceTask.id);
            invalid.add(sourceTask.id);
            linkDrag = { sourceId: sourceTask.id, invalidTargets: invalid };
        }

        function findLinkTargetAt(mouseX, mouseY) {
            if (typeof ganttChart === 'undefined' || !ganttChart) return null;
            const bars = _ganttBarGeometry(ganttChart);
            for (const b of bars) {
                const half = b.h / 2 + 4;
                if (mouseX >= b.x0 - 4 && mouseX <= b.x1 + 4 &&
                    mouseY >= b.y - half && mouseY <= b.y + half) return b.task;
            }
            // capsules de jalons (mode cascade)
            const ms = ganttChart.options.milestonesData;
            if (ms && ms.length) {
                const x = ganttChart.scales.x, y = ganttChart.scales.y;
                for (const m of ms) {
                    const px = x.getPixelForValue(m.date);
                    const py = y.getPixelForValue(m.yPosition);
                    if (Math.abs(mouseX - px) <= 25 && Math.abs(mouseY - py) <= 12) {
                        return m.task;
                    }
                }
            }
            return null;
        }

        function finishLinkDrag(mouseX, mouseY) {
            const drag = linkDrag;
            linkDrag = null;
            if (!drag) return;
            const target = findLinkTargetAt(mouseX, mouseY);
            const redraw = () => { if (ganttChart) ganttChart.draw(); };
            if (!target || target.id === drag.sourceId) { redraw(); return; }
            if (drag.invalidTargets.has(target.id)) {
                showToast('Liaison refusée : créerait un cycle de dépendances', 'error');
                redraw();
                return;
            }
            if (parseDependsOn(target).includes(drag.sourceId)) {
                showToast('Dépendance déjà existante');
                redraw();
                return;
            }
            saveState();
            target.dependsOn = (target.dependsOn || []).concat([drag.sourceId]);
            applyDependencyCascade({});
            recomputeCriticalPath();
            renderPlanning();
            updateGantt();
            updateDashboard();
            showToast('Dépendance créée : ' + drag.sourceId + ' → ' + target.id);
        }

        // Pastille au survol + flèche élastique pendant le drag de liaison
        Chart.register({
            id: 'linkConnectorPlugin',
            afterDatasetsDraw: function (chart) {
                if (!chart.options.ganttData) return;
                const rect = chart.canvas.getBoundingClientRect();
                const mX = (typeof ganttMouseX !== 'undefined' ? ganttMouseX : -1) - rect.left;
                const mY = (typeof ganttMouseY !== 'undefined' ? ganttMouseY : -1) - rect.top;
                const ctx = chart.ctx;
                const bars = _ganttBarGeometry(chart);

                ctx.save();
                if (linkDrag) {
                    const src = bars.find(b => b.id === linkDrag.sourceId);
                    if (src) {
                        const sx = src.x1 + LINK_DOT_OFFSET, sy = src.y;
                        const target = findLinkTargetAt(mX, mY);
                        const valid = target && target.id !== linkDrag.sourceId &&
                            !linkDrag.invalidTargets.has(target.id);
                        const color = !target ? 'rgba(0, 113, 227, 0.85)'
                            : valid ? 'rgba(26, 106, 62, 0.95)' : 'rgba(215, 0, 21, 0.9)';
                        // surbrillance de la cible
                        if (target) {
                            const tb = bars.find(b => b.id === target.id);
                            if (tb) {
                                ctx.strokeStyle = color;
                                ctx.lineWidth = 2.5;
                                ctx.setLineDash(valid ? [] : [4, 3]);
                                ctx.strokeRect(tb.x0 - 3, tb.y - tb.h / 2 - 3,
                                               (tb.x1 - tb.x0) + 6, tb.h + 6);
                                ctx.setLineDash([]);
                            }
                        }
                        // flèche élastique (courbe de Bézier)
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1.8;
                        if (!valid && target) ctx.setLineDash([5, 4]);
                        ctx.beginPath();
                        ctx.moveTo(sx, sy);
                        const midX = (sx + mX) / 2;
                        ctx.bezierCurveTo(midX, sy, midX, mY, mX - 4, mY);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        // pointe de flèche au curseur
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.moveTo(mX, mY);
                        ctx.lineTo(mX - 8, mY - 4);
                        ctx.lineTo(mX - 8, mY + 4);
                        ctx.closePath();
                        ctx.fill();
                        // pastille source remplie
                        ctx.beginPath();
                        ctx.arc(sx, sy, LINK_DOT_RADIUS - 1, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (!isDragging && !isResizing) {
                    // pastille au survol d'une barre (zone élargie à droite)
                    const hovered = bars.find(b => !b.isMilestone &&
                        mX >= b.x0 - 4 &&
                        mX <= b.x1 + LINK_DOT_OFFSET + LINK_DOT_RADIUS + 4 &&
                        Math.abs(mY - b.y) <= b.h / 2 + 6);
                    if (hovered) {
                        const dx = hovered.x1 + LINK_DOT_OFFSET, dy = hovered.y;
                        ctx.beginPath();
                        ctx.arc(dx, dy, LINK_DOT_RADIUS, 0, Math.PI * 2);
                        ctx.fillStyle = 'white';
                        ctx.fill();
                        ctx.strokeStyle = '#0071e3';
                        ctx.lineWidth = 1.8;
                        ctx.stroke();
                        // signe +
                        ctx.beginPath();
                        ctx.moveTo(dx - 3, dy);
                        ctx.lineTo(dx + 3, dy);
                        ctx.moveTo(dx, dy - 3);
                        ctx.lineTo(dx, dy + 3);
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }
        });

        // --------------------------------------------------------------
        // Positionneur d'infobulle : décalée du curseur pour ne jamais
        // recouvrir la barre survolée, avec bascule automatique de côté
        // près des bords et des coins du canvas.
        // --------------------------------------------------------------
        Chart.Tooltip.positioners.plannrOffset = function (elements, eventPosition) {
            const chart = this.chart;
            const offset = 18;
            // Proche du bord droit -> boîte à GAUCHE du curseur ; sinon à droite.
            const xAlign = eventPosition.x > chart.width * 0.6 ? 'right' : 'left';
            // Proche du haut -> boîte SOUS le curseur ; sinon au-dessus
            // (au-dessus par défaut : ne masque ni la barre ni la ligne suivante).
            const yAlign = eventPosition.y < chart.height * 0.35 ? 'top' : 'bottom';
            return {
                x: eventPosition.x + (xAlign === 'left' ? offset : -offset),
                y: eventPosition.y + (yAlign === 'top' ? offset : -offset),
                xAlign: xAlign,
                yAlign: yAlign
            };
        };

        // --------------------------------------------------------------
        // Plugins Chart.js (tous gardés par chart.options.ganttData :
        // ils n'agissent QUE sur le Gantt, jamais sur les autres charts)
        // --------------------------------------------------------------

        // Grise les jours non ouvrés (week-ends + fériés). Garde perf : saute
        // le shading au-delà de 2 ans d'étendue.
        Chart.register({
            id: 'workingDaysShadingPlugin',
            beforeDatasetsDraw: function (chart) {
                const gd = chart.options.ganttData;
                if (!gd) return;
                const x = chart.scales.x, y = chart.scales.y;
                if (!x || !y) return;
                if ((x.max - x.min) / 86400000 > 730) return;
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillStyle = ganttColors().shading;
                let dms = Math.floor(x.min / 86400000) * 86400000;
                for (; dms <= x.max; dms += 86400000) {
                    const probe = new Date(dms + 43200000);
                    // Affichage gouverné par les préférences utilisateur ;
                    // un jour à la fois férié ET week-end est grisé si l'une
                    // des deux neutralisations est active
                    const shade = (showWeekendShading && isWeekendDay(probe)) ||
                                  (showHolidayShading && isFrenchHoliday(probe));
                    if (shade) {
                        const x0 = Math.max(x.getPixelForValue(dms), x.left);
                        const x1 = Math.min(x.getPixelForValue(dms + 86400000), x.right);
                        if (x1 > x0) ctx.fillRect(x0, y.top, x1 - x0, y.bottom - y.top);
                    }
                }
                ctx.restore();
            }
        });

        // Barres fantômes de la baseline (sous les barres actuelles)
        Chart.register({
            id: 'baselinePlugin',
            beforeDatasetsDraw: function (chart) {
                const gd = chart.options.ganttData;
                if (!gd || !baselineData || !baselineData.tasks) return;
                const x = chart.scales.x, y = chart.scales.y;
                const meta = chart.getDatasetMeta(0);
                const ctx = chart.ctx;
                ctx.save();
                ctx.beginPath(); ctx.rect(x.left, y.top, x.right - x.left, y.bottom - y.top); ctx.clip();
                ctx.fillStyle = 'rgba(142, 142, 147, 0.5)';
                gd.forEach((d, i) => {
                    if (d.isMilestone) return;
                    const base = baselineData.tasks[d.task.id];
                    if (!base || !base.startDate) return;
                    const el = meta.data[i];
                    if (!el) return;
                    const x0 = x.getPixelForValue(new Date(base.startDate).getTime());
                    const x1 = x.getPixelForValue(new Date(base.endDate || base.startDate).getTime());
                    const yTop = el.y + el.height / 2 + 2;
                    ctx.fillRect(Math.min(x0, x1), yTop, Math.max(2, Math.abs(x1 - x0)), 4);
                });
                ctx.restore();
            }
        });

        // Remplissage d'avancement dans les barres + texte %
        Chart.register({
            id: 'progressFillPlugin',
            afterDatasetsDraw: function (chart) {
                const gd = chart.options.ganttData;
                if (!gd) return;
                const meta = chart.getDatasetMeta(0);
                const ctx = chart.ctx, x = chart.scales.x, y = chart.scales.y;
                ctx.save();
                ctx.beginPath(); ctx.rect(x.left, y.top, x.right - x.left, y.bottom - y.top); ctx.clip();
                gd.forEach((d, i) => {
                    if (d.isMilestone) return;
                    const el = meta.data[i];
                    if (!el) return;
                    const p = effectiveProgress(d.task);
                    const x0 = el.base, x1 = el.x, h = el.height, yTop = el.y - h / 2;
                    if (p > 0) {
                        const border = chart.data.datasets[0].borderColor;
                        ctx.fillStyle = (Array.isArray(border) ? border[i] : border) || '#5E81AC';
                        ctx.globalAlpha = 0.5;
                        ctx.fillRect(x0, yTop, (x1 - x0) * p / 100, h);
                        ctx.globalAlpha = 1;
                    }
                    if (x1 - x0 > 46) {
                        ctx.font = '12px -apple-system, "Segoe UI", sans-serif';
                        const labelWidth = ctx.measureText(p + '%').width + 6;
                        ctx.fillStyle = ganttColors().surface;
                        ctx.fillRect(x1 - labelWidth - 2, el.y - 9, labelWidth, 18);
                        ctx.fillStyle = ganttColors().ink;
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(p + '%', x1 - 4, el.y);
                    }
                });
                ctx.restore();
            }
        });

        // Flèches de dépendances (coude prédécesseur -> successeur)
        Chart.register({
            id: 'dependencyArrowsPlugin',
            afterDatasetsDraw: function (chart) {
                const gd = chart.options.ganttData;
                if (!gd) return;
                const x = chart.scales.x, y = chart.scales.y, ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                const pos = {};
                gd.forEach((d, i) => {
                    const el = meta.data[i];
                    if (!el || !d.task) return;
                    const yPx = el.y;
                    pos[d.task.id] = { start: el.base, end: d.isMilestone ? el.base : el.x, y: yPx };
                });
                (chart.options.milestonesData || []).forEach(m => {
                    pos[m.task.id] = {
                        start: x.getPixelForValue(m.date),
                        end: x.getPixelForValue(m.date),
                        y: y.getPixelForValue(m.yPosition)
                    };
                });
                const allTasks = gd.map(d => d.task)
                    .concat((chart.options.milestonesData || []).map(m => m.task));
                ctx.save();
                ctx.beginPath(); ctx.rect(x.left, y.top, x.right - x.left, y.bottom - y.top); ctx.clip();
                ctx.strokeStyle = ganttColors().dependency;
                ctx.fillStyle = ganttColors().dependency;
                ctx.lineWidth = 1.3;
                allTasks.forEach(task => {
                    if (!task) return;
                    parseDependsOn(task).forEach(pid => {
                        const from = pos[pid], to = pos[task.id];
                        if (!from || !to) return;
                        const x0 = from.end, y0 = from.y, x1 = to.start, y1 = to.y;
                        ctx.beginPath();
                        ctx.moveTo(x0, y0);
                        ctx.lineTo(x0 + 6, y0);
                        ctx.lineTo(x0 + 6, y1);
                        ctx.lineTo(x1 - 3, y1);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x1 - 6, y1 - 3.5);
                        ctx.lineTo(x1 - 6, y1 + 3.5);
                        ctx.closePath();
                        ctx.fill();
                    });
                });
                ctx.restore();
            }
        });

        // Ligne « aujourd'hui », contour des retards, chemin critique
        Chart.register({
            id: 'todayOverduePlugin',
            afterDatasetsDraw: function (chart) {
                const gd = chart.options.ganttData;
                if (!gd) return;
                const x = chart.scales.x, y = chart.scales.y, ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                ctx.save();
                // Contour rouge plein : tâches en retard
                gd.forEach((d, i) => {
                    if (d.isMilestone || !isTaskOverdue(d.task)) return;
                    const el = meta.data[i];
                    if (!el) return;
                    ctx.strokeStyle = '#FF3B30';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(el.base, el.y - el.height / 2, el.x - el.base, el.height);
                });
                // Contour pointillé : chemin critique
                if (_criticalIds.size) {
                    ctx.setLineDash([5, 3]);
                    ctx.strokeStyle = ganttColors().critical;
                    ctx.lineWidth = 1.5;
                    gd.forEach((d, i) => {
                        if (d.isMilestone || !_criticalIds.has(d.task.id)) return;
                        const el = meta.data[i];
                        if (!el) return;
                        ctx.strokeRect(el.base - 1.5, el.y - el.height / 2 - 1.5,
                                       (el.x - el.base) + 3, el.height + 3);
                    });
                    ctx.setLineDash([]);
                    ctx.fillStyle = ganttColors().critical;
                    ctx.font = '10px -apple-system, "Segoe UI", sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(t('criticalPathLegend'), x.right, 20);
                }
                // Ligne verticale « aujourd'hui »
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const ts = now.getTime();
                if (ts >= x.min && ts <= x.max) {
                    const px = x.getPixelForValue(ts);
                    ctx.strokeStyle = '#FF3B30';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.moveTo(px, y.top);
                    ctx.lineTo(px, y.bottom);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#FF3B30';
                    ctx.font = 'bold 10px -apple-system, "Segoe UI", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(t('todayLabel'), px, y.top - 4);
                }
                ctx.restore();
            }
        });
