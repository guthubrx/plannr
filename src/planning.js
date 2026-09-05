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
            while (count < Math.abs(n) && guard++ < 366000) {
                d = new Date(d.getTime() + Math.sign(n) * 86400000);
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
            if (isTaskClosed(task)) return false;
            const ref = reportingEnd(task);
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
            const map = Object.create(null);
            risks.forEach(t => { map[t.id] = t; });
            return map;
        }

        function taskEndForDeps(task) {
            return reportingEnd(task);
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
                    if (!pred || isTaskCancelled(pred)) return;
                    resolve(pred);
                    const predEnd = taskEndForDeps(pred);
                    if (!predEnd) return;
                    // jour ouvré suivant la fin + lag éventuel (en jours ouvrés)
                    const candidate = addWorkingDays(predEnd, 1 + dep.lag);
                    if (minStart === null || candidate > minStart) minStart = candidate;
                });
                visiting.delete(task.id);
                memo.add(task.id);
                if (!isScheduleAnchored(task) && minStart && task.startDate && task.startDate < minStart) {
                    moveTaskToWorkingDate(task, minStart);
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
        // O(V+E) opérations de graphe ; arithmétique du calendrier en jours parcourus.
        var taskMargins = new Map();
        function computeCriticalPath() {
            taskMargins = new Map();
            const planned = risks.filter(task=>!isTaskCancelled(task));
            const byId = new Map(planned.map(task => [task.id, task]));
            const successors = new Map(planned.map(task => [task.id, []]));
            const degrees = new Map();
            planned.forEach(task => {
                const deps = parseDependsOnFull(task).filter(dep => byId.has(dep.id));
                degrees.set(task.id, deps.length);
                deps.forEach(dep => successors.get(dep.id).push({ id: task.id, lag: dep.lag }));
            });
            const order = planned.filter(task => degrees.get(task.id) === 0).map(task => task.id);
            for (let i = 0; i < order.length; i++) for (const next of successors.get(order[i])) {
                degrees.set(next.id, degrees.get(next.id) - 1);
                if (degrees.get(next.id) === 0) order.push(next.id);
            }
            if (order.length !== planned.length) return new Set();
            const early = new Map(), late = new Map(), durations = new Map();
            let finish = null;
            for (const id of order) {
                const task = byId.get(id);
                const duration = task.isMilestone ? 0 : Math.max(1, workingDaysBetween(reportingStart(task), reportingEnd(task)));
                durations.set(id, duration);
                let start = nextWorkingDate(reportingStart(task));
                for (const dep of parseDependsOnFull(task)) {
                    if (!early.has(dep.id)) continue;
                    const bound = addWorkingDays(early.get(dep.id), Math.max(1, durations.get(dep.id)) + dep.lag);
                    if (bound > start) start = bound;
                }
                early.set(id, start);
                const end = addWorkingDays(start, duration);
                if (!finish || end > finish) finish = end;
            }
            for (let i = order.length - 1; i >= 0; i--) {
                const id = order[i];
                let start = addWorkingDays(finish, -durations.get(id));
                for (const next of successors.get(id)) {
                    const bound = addWorkingDays(late.get(next.id), -(Math.max(1, durations.get(id)) + next.lag));
                    if (bound < start) start = bound;
                }
                late.set(id, start);
                const margin = Math.max(0, workingDaysBetween(early.get(id), start) - 1);
                taskMargins.set(id, { days: margin, earliestStart: early.get(id), latestStart: start });
            }
            return new Set(order.filter(id => taskMargins.get(id).days === 0));
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
            const byId = tasksById();
            const ids = collectDescendants(rootTask.id);
            ids.forEach(id => {
                const task = byId[id];
                if (task) moveTaskToWorkingDate(task, addCalendarDays(task.startDate, deltaDays));
            });
            riskGroups.forEach(updatePhaseDates);
            return ids.size;
        }

        function nextWorkingDate(date) {
            return isWorkingDay(new Date(date + 'T12:00:00Z')) ? date : addWorkingDays(date, 1);
        }
        function moveTaskToWorkingDate(task, date) {
            if (isScheduleAnchored(task)) return false;
            const duration = task.isMilestone ? 0 : Math.max(1, workingDaysBetween(task.startDate, task.endDate || task.startDate));
            task.startDate = task.isMilestone ? date : nextWorkingDate(date);
            task.endDate = task.isMilestone ? task.startDate : addWorkingDays(task.startDate, duration - 1);
            task.duration = duration;
        }

        // --------------------------------------------------------------
        // Baseline (planning initial figé, dérive en barres fantômes)
        // --------------------------------------------------------------
