
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

        // date : objet Date ancré à midi UTC (évite les dérives de fuseau)
        function isWorkingDay(date) {
            const day = date.getUTCDay();
            if (day === 0 || day === 6) return false;
            return !frenchHolidays(date.getUTCFullYear()).has(date.toISOString().slice(0, 10));
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

        function nextWorkingDayISO(dateStr) {
            let d = new Date(dateStr + 'T12:00:00Z');
            let guard = 0;
            while (!isWorkingDay(d) && guard++ < 30) d = new Date(d.getTime() + 86400000);
            return d.toISOString().slice(0, 10);
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
        function parseDependsOn(task) {
            return Array.isArray(task.dependsOn) ? task.dependsOn.filter(Boolean) : [];
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
                parseDependsOn(task).forEach(pid => {
                    const pred = byId[pid];
                    if (!pred) return;
                    resolve(pred);
                    const predEnd = taskEndForDeps(pred);
                    if (!predEnd) return;
                    const candidate = nextWorkingDayISO(addCalendarDays(predEnd, 1));
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
                    if (!isWorkingDay(probe)) {
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
