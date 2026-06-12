
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
                depsHint: "IDs des tâches préalables, séparés par des virgules (ex: 1.1, 2.3)",
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
                depsHint: "IDs of prerequisite tasks, comma-separated (e.g. 1.1, 2.3)",
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
                depsHint: "IDs de tareas previas, separados por comas (ej. 1.1, 2.3)",
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
                depsHint: "معرفات المهام السابقة مفصولة بفواصل (مثال: 1.1, 2.3)",
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
        function easterSunday(year) {
            const a = year % 19, b = Math.floor(year / 100), c = year % 100,
                  d = Math.floor(b / 4), e = b % 4,
                  f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
                  h = (19 * a + b - d - g + 15) % 30,
                  i = Math.floor(c / 4), k = c % 4,
                  l = (32 + 2 * e + 2 * i - h - k) % 7,
                  m = Math.floor((a + 11 * h + 22 * l) / 451),
                  month = Math.floor((h + l - 7 * m + 114) / 31),
                  day = ((h + l - 7 * m + 114) % 31) + 1;
            return new Date(Date.UTC(year, month - 1, day));
        }

        var _frHolidaysCache = {};
        // Fériés français (métropole) : 8 fixes + lundi de Pâques, Ascension,
        // lundi de Pentecôte. Retourne un Set de chaînes "YYYY-MM-DD".
        function frenchHolidays(year) {
            if (_frHolidaysCache[year]) return _frHolidaysCache[year];
            const set = new Set(
                ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25']
                    .map(s => year + '-' + s));
            const easter = easterSunday(year);
            [1, 39, 50].forEach(offset => {
                const d = new Date(easter.getTime() + offset * 86400000);
                set.add(d.toISOString().slice(0, 10));
            });
            _frHolidaysCache[year] = set;
            return set;
        }

        // ------------------------------------------------------------------
        // Calendrier MÉTIER paramétrable (v2.2 / FR-11) : porté par
        // PLANNR_DATA.calendar (décision de l'agent, par projet), avec
        // override utilisateur persisté pour le samedi. Affecte durées,
        // cascade, chemin critique et grisage — c'est voulu.
        // ------------------------------------------------------------------
        var calendarConfig = {
            saturdayWorked: false,
            extraHolidays: new Set(),
            skippedHolidays: new Set()
        };

        function initCalendarConfig() {
            const data = (window.PLANNR_DATA && window.PLANNR_DATA.calendar) || {};
            calendarConfig.extraHolidays =
                new Set(Array.isArray(data.extraHolidays) ? data.extraHolidays : []);
            calendarConfig.skippedHolidays =
                new Set(Array.isArray(data.skippedHolidays) ? data.skippedHolidays : []);
            const stored = appStorage.getItem('plannr-saturday-worked');
            calendarConfig.saturdayWorked =
                stored !== null ? stored === 'true' : !!data.saturdayWorked;
            const cb = document.getElementById('toggle-saturday-worked');
            if (cb) cb.checked = calendarConfig.saturdayWorked;
        }

        function toggleSaturdayWorked(checked) {
            calendarConfig.saturdayWorked = !!checked;
            appStorage.setItem('plannr-saturday-worked', String(!!checked));
            // MÉTIER : recalcul complet des durées puis des contraintes
            risks.forEach(tk => {
                tk.duration = tk.isMilestone ? 0 :
                    workingDaysBetween(tk.startDate, tk.endDate || tk.startDate);
            });
            applyDependencyCascade({ silent: true });
            recomputeCriticalPath();
            renderPlanning();
            updateGantt();
            updateDashboard();
        }

        // date : objet Date ancré à midi UTC (évite les dérives de fuseau)
        function isWeekendDay(date) {
            const day = date.getUTCDay();
            return day === 0 || (day === 6 && !calendarConfig.saturdayWorked);
        }

        function isFrenchHoliday(date) {
            const iso = date.toISOString().slice(0, 10);
            if (calendarConfig.extraHolidays.has(iso)) return true;
            if (calendarConfig.skippedHolidays.has(iso)) return false;
            return frenchHolidays(date.getUTCFullYear()).has(iso);
        }

        // Référence MÉTIER (durées, cascade) : ne dépend PAS des préférences
        // d'affichage des barres de neutralisation.
        function isWorkingDay(date) {
            return !isWeekendDay(date) && !isFrenchHoliday(date);
        }

        // N-ième jour ouvré STRICTEMENT après dateStr. O(n) sur l'intervalle.
        function addWorkingDays(dateStr, n) {
            let d = new Date(dateStr + 'T12:00:00Z');
            let count = 0, guard = 0;
            while (count < n && guard++ < 3700) {
                d = new Date(d.getTime() + 86400000);
                if (isWorkingDay(d)) count++;
            }
            return d.toISOString().slice(0, 10);
        }

        // ------------------------------------------------------------------
        // Barres grises de neutralisation : préférences d'AFFICHAGE uniquement
        // (les calculs en jours ouvrés ignorent toujours week-ends + fériés)
        // ------------------------------------------------------------------
        var showWeekendShading = true;
        var showHolidayShading = true;

        function initShadingPrefs() {
            showWeekendShading = appStorage.getItem('plannr-shade-weekends') !== 'false';
            showHolidayShading = appStorage.getItem('plannr-shade-holidays') !== 'false';
            const cw = document.getElementById('toggle-shade-weekends');
            const ch = document.getElementById('toggle-shade-holidays');
            if (cw) cw.checked = showWeekendShading;
            if (ch) ch.checked = showHolidayShading;
        }

        function toggleWeekendShading(checked) {
            showWeekendShading = !!checked;
            appStorage.setItem('plannr-shade-weekends', String(showWeekendShading));
            if (typeof ganttChart !== 'undefined' && ganttChart) ganttChart.update('none');
        }

        function toggleHolidayShading(checked) {
            showHolidayShading = !!checked;
            appStorage.setItem('plannr-shade-holidays', String(showHolidayShading));
            if (typeof ganttChart !== 'undefined' && ganttChart) ganttChart.update('none');
        }

        // Jours ouvrés entre deux dates ISO, bornes INCLUSES. O(n) sur l'intervalle.
        function workingDaysBetween(startStr, endStr) {
            if (!startStr || !endStr) return 0;
            let cur = new Date(startStr + 'T12:00:00Z');
            const end = new Date(endStr + 'T12:00:00Z');
            if (isNaN(cur) || isNaN(end) || end < cur) return 0;
            let n = 0, guard = 0;
            while (cur <= end && guard++ < 36600) { // borne ~100 ans
                if (isWorkingDay(cur)) n++;
                cur = new Date(cur.getTime() + 86400000);
            }
            return n;
        }

        function addCalendarDays(dateStr, days) {
            const d = new Date(dateStr + 'T12:00:00Z');
            return new Date(d.getTime() + days * 86400000).toISOString().slice(0, 10);
        }

        // --------------------------------------------------------------
        // Statut, retard, avancement
        // --------------------------------------------------------------
        function isTaskDone(task) {
            return task.statut === 'statusDone' || task.statut === 'statusTreated' ||
                   task.statut === 'Terminé';
        }

        function todayISO() {
            const d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
                   '-' + String(d.getDate()).padStart(2, '0');
        }

        function isTaskOverdue(task) {
            if (isTaskDone(task)) return false;
            const ref = task.isMilestone ? task.startDate : (task.endDate || task.startDate);
            return !!ref && ref < todayISO();
        }

        // Avancement effectif 0-100 : champ `progress` si présent, sinon
        // déduit du statut (terminé = 100, sinon 0 — pas d'invention).
        function effectiveProgress(task) {
            if (isTaskDone(task)) return 100;
            const p = parseInt(task.progress, 10);
            return Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0;
        }

        // --------------------------------------------------------------
        // Dépendances : cascade + chemin critique
        // --------------------------------------------------------------
        // Entrées dependsOn : "1.2" ou "1.2+3" (lag de 3 jours OUVRÉS après
        // le jour ouvré suivant la fin du prédécesseur) — FR-7
        function parseDependsOnFull(task) {
            if (!Array.isArray(task.dependsOn)) return [];
            return task.dependsOn.filter(Boolean).map(entry => {
                const m = String(entry).match(/^(.*?)(?:\+(\d+))?$/);
                return { id: m[1].trim(), lag: m[2] ? parseInt(m[2], 10) : 0 };
            });
        }

        function parseDependsOn(task) {
            return parseDependsOnFull(task).map(dep => dep.id);
        }

        function tasksById() {
            const map = {};
            risks.forEach(t => { map[t.id] = t; });
            return map;
        }

        function taskEndForDeps(task) {
            return (task.isMilestone || !task.endDate) ? task.startDate : task.endDate;
        }

        // Décale les successeurs : un successeur démarre au plus tôt le jour
        // OUVRÉ suivant la fin de son dernier prédécesseur. Le décalage
        // conserve l'étendue calendaire (start et end glissent du même delta).
        // Complexité : O(V+E) (DFS mémoïsé), anti-cycle par marquage.
        function applyDependencyCascade(options) {
            const opts = options || {};
            const exceededBefore = new Set(
                risks.filter(isDeadlineExceeded).map(tk => tk.id));
            const byId = tasksById();
            const memo = new Set();
            const visiting = new Set();
            let shifted = 0;
            let cycle = false;

            function resolve(task) {
                if (memo.has(task.id)) return;
                if (visiting.has(task.id)) { cycle = true; return; }
                visiting.add(task.id);
                let minStart = null;
                parseDependsOnFull(task).forEach(dep => {
                    const pred = byId[dep.id];
                    if (!pred) return;
                    resolve(pred);
                    const predEnd = taskEndForDeps(pred);
                    if (!predEnd) return;
                    // jour ouvré suivant la fin + lag éventuel (en jours ouvrés)
                    const candidate = addWorkingDays(predEnd, 1 + dep.lag);
                    if (minStart === null || candidate > minStart) minStart = candidate;
                });
                visiting.delete(task.id);
                memo.add(task.id);
                if (minStart && task.startDate && task.startDate < minStart) {
                    const deltaDays = Math.round(
                        (new Date(minStart + 'T12:00:00Z') - new Date(task.startDate + 'T12:00:00Z')) / 86400000);
                    task.startDate = minStart;
                    if (task.isMilestone) {
                        // un jalon est ponctuel : end suit start
                        if (task.endDate) task.endDate = task.startDate;
                    } else if (task.endDate) {
                        task.endDate = addCalendarDays(task.endDate, deltaDays);
                    }
                    task.duration = workingDaysBetween(task.startDate, task.endDate || task.startDate);
                    shifted++;
                }
            }

            risks.forEach(resolve);
            if (cycle && !opts.silent && typeof showToast === 'function') {
                showToast(t('depsCycle'), 'error');
            }
            if (shifted > 0) {
                riskGroups.forEach(updatePhaseDates);
                if (!opts.silent && typeof showToast === 'function') {
                    showToast(t('tasksShifted').replace('{n}', shifted));
                    // FR-3 : alerter si la cascade vient de faire sauter une butoir
                    const newlyExceeded = risks.filter(tk =>
                        isDeadlineExceeded(tk) && !exceededBefore.has(tk.id));
                    if (newlyExceeded.length) {
                        showToast('⚑ Butoir dépassée : ' +
                            newlyExceeded.map(tk => tk.id).join(', '), 'error');
                    }
                }
            }
            return shifted;
        }

        // Chemin critique : plus long chemin (durée ouvrée cumulée) dans le
        // graphe des dépendances. Vide si aucune dépendance ou chaîne de 1.
        var _criticalIds = new Set();
        function computeCriticalPath() {
            if (!risks.some(tk => parseDependsOn(tk).length > 0)) return new Set();
            const byId = tasksById();
            const memo = {};
            const visiting = new Set();

            function longest(task) {
                if (memo[task.id]) return memo[task.id];
                if (visiting.has(task.id)) return { len: 0, prev: null }; // cycle neutralisé
                visiting.add(task.id);
                const dur = Math.max(1, workingDaysBetween(task.startDate, taskEndForDeps(task) || task.startDate));
                let best = { len: dur, prev: null };
                parseDependsOn(task).forEach(pid => {
                    const pred = byId[pid];
                    if (!pred) return;
                    const r = longest(pred);
                    if (r.len + dur > best.len) best = { len: r.len + dur, prev: pid };
                });
                visiting.delete(task.id);
                memo[task.id] = best;
                return best;
            }

            let endId = null, max = -1;
            risks.forEach(tk => {
                const r = longest(tk);
                if (r.len > max) { max = r.len; endId = tk.id; }
            });
            const set = new Set();
            let cur = endId;
            while (cur) { set.add(cur); cur = memo[cur] ? memo[cur].prev : null; }
            return set.size > 1 ? set : new Set();
        }

        function recomputeCriticalPath() {
            _criticalIds = computeCriticalPath();
        }

        // Successeurs transitifs d'une tâche (descendance complète).
        // Complexité : O(V*E) borné — collections de quelques dizaines de tâches.
        function collectDescendants(rootId) {
            const out = new Set();
            const queue = [rootId];
            while (queue.length) {
                const id = queue.shift();
                risks.forEach(t => {
                    if (!out.has(t.id) && parseDependsOn(t).includes(id)) {
                        out.add(t.id);
                        queue.push(t.id);
                    }
                });
            }
            return out;
        }

        // Déplacement RIGIDE du sous-arbre (Alt+glisser) : toute la descendance
        // suit du même delta calendaire, vers la gauche comme vers la droite.
        // La cascade (applyDependencyCascade) repasse derrière pour réparer
        // toute violation résiduelle vis-à-vis d'autres branches.
        function shiftDescendants(rootTask, deltaDays) {
            if (!deltaDays) return 0;
            const ids = collectDescendants(rootTask.id);
            let count = 0;
            ids.forEach(id => {
                const t = risks.find(r => r.id === id);
                if (!t || !t.startDate) return;
                t.startDate = addCalendarDays(t.startDate, deltaDays);
                if (t.isMilestone) {
                    if (t.endDate) t.endDate = t.startDate;
                } else if (t.endDate) {
                    t.endDate = addCalendarDays(t.endDate, deltaDays);
                }
                t.duration = workingDaysBetween(t.startDate, t.endDate || t.startDate);
                count++;
            });
            if (count) riskGroups.forEach(updatePhaseDates);
            return count;
        }

        // --------------------------------------------------------------
        // Baseline (planning initial figé, dérive en barres fantômes)
        // --------------------------------------------------------------
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
            return '<td class="progress-cell">' +
                '<input type="number" class="editable-progress" data-risk-id="' + risk.id +
                '" min="0" max="100" step="5" value="' + p + '">' +
                '<div class="progress-mini"><div class="progress-mini-fill" style="width:' + p + '%"></div></div>' +
                '</td>';
        }

        function renderDependsCellHTML(risk) {
            const deps = parseDependsOn(risk).join(', ');
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
                    if (!task) return;
                    saveState();
                    let v = parseInt(this.value, 10);
                    if (!Number.isFinite(v)) v = 0;
                    v = Math.min(100, Math.max(0, v));
                    task.progress = v;
                    this.value = v;
                    const fill = this.parentElement.querySelector('.progress-mini-fill');
                    if (fill) fill.style.width = v + '%';
                    updateGantt();
                    updateDashboard();
                });
            });
        }

        function initDependsEditing() {
            document.querySelectorAll('.editable-depends').forEach(span => {
                if (span.dataset.editingInitialized) return;
                span.dataset.editingInitialized = 'true';
                span.addEventListener('click', function () {
                    if (this.querySelector('input')) return;
                    const task = risks.find(r => r.id === this.dataset.riskId);
                    if (!task) return;
                    const current = parseDependsOn(task).join(', ');
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = current;
                    input.className = 'depends-input';
                    input.placeholder = '1.1, 2.3';
                    this.textContent = '';
                    this.appendChild(input);
                    input.focus();
                    let committed = false;
                    const commit = () => {
                        if (committed) return;
                        committed = true;
                        const byId = tasksById();
                        const ids = input.value.split(',').map(s => s.trim()).filter(Boolean);
                        const valid = [], bad = [];
                        ids.forEach(id => {
                            if (!byId[id] || id === task.id) bad.push(id);
                            else valid.push(id);
                        });
                        saveState();
                        task.dependsOn = valid;
                        if (bad.length) showToast(t('depsInvalid').replace('{ids}', bad.join(', ')), 'error');
                        applyDependencyCascade({});
                        recomputeCriticalPath();
                        renderPlanning();
                        updateGantt();
                        updateDashboard();
                    };
                    input.addEventListener('blur', commit);
                    input.addEventListener('keydown', e => {
                        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
                        if (e.key === 'Escape') { input.value = current; input.blur(); }
                    });
                });
            });
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
            return !!end && end > task.deadline;
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
            if (!isTaskDone(task) && prog === 100) {
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
                (has ? escapeHtml(risk.notes) : 'Ajouter une note') + '">📝</span>';
        }

        function linkIconHTML(risk) {
            const url = safeLink(risk.link);
            return url
                ? ' <a class="link-icon" href="' + escapeHtml(url) +
                  '" target="_blank" rel="noopener noreferrer" title="' +
                  escapeHtml(url) + '">🔗</a>'
                : '';
        }

        function initNotesEditing() {
            document.querySelectorAll('.notes-icon').forEach(el => {
                if (el.dataset.editingInitialized) return;
                el.dataset.editingInitialized = 'true';
                el.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    const task = risks.find(r => r.id === this.dataset.riskId);
                    if (!task) return;
                    const value = prompt('Note pour ' + task.id + ' :', task.notes || '');
                    if (value === null) return;
                    saveState();
                    if (value.trim()) task.notes = value.trim();
                    else delete task.notes;
                    renderPlanning();
                    updateGantt();
                });
            });
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
            const exceeded = risks.filter(isDeadlineExceeded);
            if (exceeded.length) {
                sections.push({ cls: 'banner-error', title: 'Dates butoirs dépassées',
                    items: exceeded.map(tk => tk.id + ' — ' + tk.title +
                        ' (butoir ' + formatDateFR(tk.deadline) +
                        ', fin ' + formatDateFR(taskEndForDeps(tk)) + ')') });
            }
            const inconsistencies = risks.flatMap(tk =>
                taskInconsistencies(tk).map(msg => tk.id + ' — ' + msg));
            if (inconsistencies.length) {
                sections.push({ cls: 'banner-warn', title: 'Incohérences',
                    items: inconsistencies });
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

        function renderWorkload() {
            const host = document.getElementById('workload-content');
            if (!host) return;
            const byPerson = {};
            risks.filter(tk => !tk.isMilestone).forEach(tk =>
                splitAssignees(tk).forEach(person => {
                    (byPerson[person] = byPerson[person] || []).push(tk);
                }));
            const names = Object.keys(byPerson).sort();
            if (!names.length) {
                host.innerHTML = '<p class="workload-empty">Aucun responsable renseigné.</p>';
                return;
            }
            // O(p * t²) — t = tâches par personne, borné à quelques dizaines.
            // XSS : noms, ids et titres échappés (données agent, NFR-2).
            host.innerHTML = names.map(name => {
                const list = byPerson[name];
                const total = list.reduce((sum, tk) =>
                    sum + workingDaysBetween(tk.startDate, tk.endDate || tk.startDate), 0);
                const conflicts = [];
                for (let i = 0; i < list.length; i++) {
                    for (let j = i + 1; j < list.length; j++) {
                        if (isTaskDone(list[i]) && isTaskDone(list[j])) continue;
                        const overlap = workingOverlapDays(list[i], list[j]);
                        if (overlap > 0) {
                            conflicts.push(list[i].id + ' ∥ ' + list[j].id +
                                ' (' + overlap + ' j ouvrés)');
                        }
                    }
                }
                return '<div class="workload-person' +
                    (conflicts.length ? ' has-conflict' : '') + '">' +
                    '<div class="workload-name">' + escapeHtml(name) +
                    ' <span class="workload-total">' + total + ' j ouvrés · ' +
                    list.length + ' tâche(s)</span></div>' +
                    '<div class="workload-tasks">' +
                    list.map(tk => escapeHtml(tk.id + ' ' + tk.title)).join(' · ') +
                    '</div>' +
                    (conflicts.length
                        ? '<div class="workload-conflicts">⚠ Chevauchements : ' +
                          conflicts.map(escapeHtml).join(' — ') + '</div>'
                        : '') +
                    '</div>';
            }).join('');
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
            const content = buildDataJsContent();
            if (!window.showSaveFilePicker) {
                // Safari / Firefox : pas de File System Access — téléchargement
                downloadTextFile(content, 'plannr-data.js', 'text/javascript');
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
                showToast('💾 plannr-data.js enregistré');
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
                ctx.fillStyle = 'rgba(60, 60, 67, 0.055)';
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
                const x = chart.scales.x;
                const meta = chart.getDatasetMeta(0);
                const ctx = chart.ctx;
                ctx.save();
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
                const ctx = chart.ctx;
                ctx.save();
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
                        ctx.fillStyle = '#3a3a3c';
                        ctx.font = '10px -apple-system, "Segoe UI", sans-serif';
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
                    const yPx = el.y + ((d.isMilestone && d.compactMode) ? 28 : 0);
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
                ctx.strokeStyle = 'rgba(99, 99, 102, 0.75)';
                ctx.fillStyle = 'rgba(99, 99, 102, 0.9)';
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
                    ctx.strokeStyle = '#B71C1C';
                    ctx.lineWidth = 1.5;
                    gd.forEach((d, i) => {
                        if (d.isMilestone || !_criticalIds.has(d.task.id)) return;
                        const el = meta.data[i];
                        if (!el) return;
                        ctx.strokeRect(el.base - 1.5, el.y - el.height / 2 - 1.5,
                                       (el.x - el.base) + 3, el.height + 3);
                    });
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#B71C1C';
                    ctx.font = '10px -apple-system, "Segoe UI", sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(t('criticalPathLegend'), x.right, y.top - 4);
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
