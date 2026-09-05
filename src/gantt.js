        let ganttChart = null;
        var ganttExportWidth = null;
        let ganttViewMode = 'cascade'; // 'compact', 'cascade' ou 'groupe'

        // Changer le mode de vue du Gantt
        function setGanttView(mode) {
            ganttViewMode = mode;

            // Sauvegarder la préférence
            appStorage.setItem('plannr-gantt-view', mode);

            // Mettre à jour les boutons
            const btnCompact = document.getElementById('view-btn-compact');
            const btnCascade = document.getElementById('view-btn-cascade');
            const btnConsolide = document.getElementById('view-btn-consolide');

            // Reset tous les boutons
            [btnCompact, btnCascade, btnConsolide].forEach(btn => {
                if (btn) {
                    btn.style.background = 'transparent';
                    btn.style.color = 'var(--muted)';
                    btn.style.boxShadow = 'none';
                    btn.classList.remove('active');
                }
            });

            // Activer le bouton sélectionné
            let activeBtn = null;
            if (mode === 'compact') activeBtn = btnCompact;
            else if (mode === 'cascade') activeBtn = btnCascade;
            else if (mode === 'consolide') activeBtn = btnConsolide;

            if (activeBtn) {
                activeBtn.style.background = 'var(--surface)';
                activeBtn.style.color = 'var(--ink)';
                activeBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                activeBtn.classList.add('active');
            }

            // Mettre à jour le Gantt
            updateGantt();
        }

        // Initialiser la vue au chargement
        function initGanttView() {
            const savedView = appStorage.getItem('plannr-gantt-view');
            if (savedView && ['compact', 'cascade', 'consolide'].includes(savedView)) {
                setGanttView(savedView);
            } else {
                setGanttView('cascade'); // Défaut
            }
        }



// Découpe mesurée, mots insécables compris. Le texte intégral reste dans le tableau/panneau.
function wrapGanttText(ctx, text, width, maxLines = 3) {
    const lines = []; let line = '';
    for (const word of String(text).split(/\s+/)) {
        if (line && ctx.measureText(line + ' ' + word).width > width) { lines.push(line); line = ''; }
        if (ctx.measureText(word).width > width) {
            if (line) { lines.push(line); line = ''; }
            for (const char of word) {
                if (ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
                line += char;
            }
        } else line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
        lines.length = maxLines;
        let last = lines[maxLines - 1];
        while (last && ctx.measureText(last + '…').width > width) last = last.slice(0, -1);
        lines[maxLines - 1] = last + '…';
    }
    return lines;
}

// O(n log n + n*l), l = lignes occupées. Chaque intervalle réserve barre ET texte.
function packGanttTasks(tasks, range, width) {
    const scale = (width - range.left - 32) / (range.max - range.min);
    const lines = [], ends = [];
    const sorted = tasks.map(task => {
        const start = (Date.parse(task.startDate) - range.min) * scale;
        const end = (Date.parse(task.endDate || task.startDate) - range.min) * scale;
        const maxX = width - range.left - 32;
        const labelX = Math.max(0, Math.min(start, maxX - 252));
        let x0 = Math.min(start - 28, labelX), x1 = Math.max(end + 28, labelX + 252);
        const base = baselineData?.tasks?.[task.id];
        if (base) { x0 = Math.min(x0, (Date.parse(base.startDate) - range.min) * scale); x1 = Math.max(x1, (Date.parse(base.endDate) - range.min) * scale); }
        return { task, x0, x1 };
    }).sort((a,b) => a.x0 - b.x0);
    for (const item of sorted) {
        let lane = ends.findIndex(end => end + 20 < item.x0);
        if (lane < 0) { lane = lines.length; lines.push([]); }
        lines[lane].push(item.task); ends[lane] = item.x1;
    }
    return lines;
}

Chart.register({
    id: 'readableGanttLabels',
    afterDatasetsDraw(chart) {
        const {ctx, scales: {x, y}} = chart;
        const rows = chart.options.readableRows || [];
        const theme = ganttColors();
        chart.$labelBoxes = [];
        chart.$headerBoxes = [];
        ctx.save(); ctx.font = '600 13px Helvetica, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        for (const header of chart.options.readableHeaders || []) {
            const py = y.getPixelForValue(header.y);
            ctx.fillStyle = theme.header; ctx.fillRect(x.left, py, x.right - x.left, header.height);
            ctx.fillStyle = theme.ink;
            header.lines.forEach((line,i)=>ctx.fillText(line,x.left + 12,py + 8 + i*17));
            chart.$headerBoxes.push({x: x.left, y: py, width: x.right - x.left, height: header.height});
        }
        for (const row of rows) {
            const task = row.task, centerY = y.getPixelForValue(row.y);
            const px = x.getPixelForValue(Date.parse(task.startDate));
            const labelX = ganttViewMode === 'cascade' ? 12 : Math.max(x.left + 4, Math.min(px, x.right - 252));
            const width = ganttViewMode === 'cascade' ? x.left - 30 : 244;
            const lines = row.lines;
            const labelY = ganttViewMode === 'cascade' ? centerY - lines.length * 8 : centerY - 16 - 6 - lines.length * 16;
            ctx.fillStyle = theme.surface; ctx.fillRect(labelX - 2, labelY - 2, width + 4, lines.length * 16 + 4);
            ctx.fillStyle = theme.ink;
            lines.forEach((line, i) => ctx.fillText(line, labelX, labelY + i * 16));
            chart.$labelBoxes.push({ id: task.id, x: labelX, y: labelY, width, height: lines.length * 16 });
            if (task.isMilestone) {
                ctx.fillStyle = '#274E68';
                ctx.beginPath(); ctx.roundRect(px - 24, centerY - 10, 48, 20, 8); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.font = '600 11px Helvetica, Arial, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(formatDateFR(task.startDate).slice(0,5), px, centerY - 7);
                ctx.font = '600 13px Helvetica, Arial, sans-serif'; ctx.textAlign = 'left';
            }
        }
        ctx.restore();
    }
});

        // Variables pour le drag & drop
        let isDragging = false;
        let draggedTaskIndex = null;
        let dragStartDate = null;
        let dragStartX = 0;
        let snapLines = []; // Lignes verticales de repère
        let draggedMilestone = null; // Jalon en cours de drag
        let draggedMilestoneData = null; // Données du jalon en cours de drag (yPosition, etc.)

        // Variables pour le redimensionnement
        let isResizing = false;
        let resizeEdge = null; // 'left' ou 'right'
        let resizeTaskIndex = null;
        let resizeStartDate = null;
        let resizeEndDate = null;

        // Enregistrer le plugin de drag & drop
        Chart.register({
            id: 'dragDropPlugin',
            defaultFontColor: '#666',

            // Dessiner les lignes de repère pendant le drag
            afterDraw: function(chart) {
                if (isDragging && snapLines.length > 0) {
                    const ctx = chart.ctx;
                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;

                    snapLines.forEach(x => {
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(x, yAxis.top);
                        ctx.lineTo(x, yAxis.bottom);
                        ctx.strokeStyle = 'rgba(0, 113, 227, 0.5)';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]);
                        ctx.stroke();
                        ctx.restore();
                    });
                }
            }
        });

        // Créer le conteneur pour les boutons de séparation
        const ganttChartCanvas = document.getElementById('ganttChart');
        if (ganttChartCanvas) {
            // Créer un conteneur overlay pour les boutons
            let separatorOverlay = document.getElementById('gantt-separator-overlay');
            if (!separatorOverlay) {
                separatorOverlay = document.createElement('div');
                separatorOverlay.id = 'gantt-separator-overlay';
                separatorOverlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1000;
                    display: none;
                `;
                ganttChartCanvas.parentElement.style.position = 'relative';
                ganttChartCanvas.parentElement.appendChild(separatorOverlay);
            }
        }

        // Variables pour le suivi de la souris
        let ganttMouseY = 0;
        let ganttMouseX = 0;
        let visibleSeparatorLane = null;
        let visibleSeparatorPhaseId = null;
        let isHoveringButtons = false; // Pour éviter de cacher quand on est sur les boutons
        let hideSeparatorTimeout = null; // Pour ajouter un délai avant de cacher
        let activeSeparatorY = null; // Mémoriser la ligne de séparation active
        let activeInsertPosition = null; // Mémoriser la position d'insertion active
        let activeDate = null; // Mémoriser la date correspondant à la position X de la souris

        // Enregistrer le plugin de séparation pour le Gantt
        Chart.register({
            id: 'ganttSeparatorPlugin',

            // Dessiner les lignes de séparation au survol
            afterDraw: function(chart) {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                const canvas = chart.canvas;

                // Ne pas afficher pendant le drag, le resize ou une liaison
                if (isDragging || isResizing || linkDrag) {
                    hideSeparatorButtons();
                    return;
                }

                // Calculer la position de la souris dans le chart
                const rect = canvas.getBoundingClientRect();
                const mouseY = ganttMouseY - rect.top;
                const mouseX = ganttMouseX - rect.left;

                // Vérifier si la souris est dans la zone du chart
                if (mouseY < yAxis.top || mouseY > yAxis.bottom ||
                    mouseX < xAxis.left || mouseX > xAxis.right) {
                    hideSeparatorButtons();
                    return;
                }

                // v2.1.3 : JAMAIS d'affordance « + » quand la souris est SUR une
                // barre — en consolidé/compact les frontières de lanes peuvent
                // traverser les barres, et le bouton volait alors le clic en
                // empêchant le drag & drop. L'affordance reste disponible dans
                // les zones vides (et sous les barres, comme en cascade).
                const gdGuard = chart.options.ganttData || [];
                const metaGuard = chart.getDatasetMeta(0);
                for (let gi = 0; gi < gdGuard.length; gi++) {
                    const elG = metaGuard.data[gi];
                    if (!elG) continue;
                    const gx0 = Math.min(elG.base, elG.x);
                    const gx1 = Math.max(elG.base, elG.x);
                    let gyC = elG.y;
                    if (gdGuard[gi].isMilestone && gdGuard[gi].compactMode &&
                        ganttViewMode === 'compact') gyC += 28;
                    const gHalf = ((elG.height || 35) / 2) + 4;
                    if (mouseX >= gx0 - 4 && mouseX <= gx1 + 4 &&
                        mouseY >= gyC - gHalf && mouseY <= gyC + gHalf) {
                        hideSeparatorButtons();
                        return;
                    }
                }

                // Frontières réelles des lignes adaptatives, indexées dans le document.
                // Les indices de l'axe ne sont pas des indices de tâches.
                const rows = chart.options.readableRows || [];
                const documentPositions = new Map(riskGroups.flatMap(group => group.tasks).map((task, index) => [task.id, index]));
                const boundaries = rows.map(row => ({
                    y: yAxis.getPixelForValue(row.bottom - 8),
                    position: documentPositions.get(row.task.id) + 1
                }));
                if (rows.length) boundaries.unshift({y: yAxis.getPixelForValue(rows[0].top), position: documentPositions.get(rows[0].task.id)});
                const boundary = boundaries.find(edge => Math.abs(mouseY - edge.y) < 6);
                let separatorY = boundary?.y ?? null;
                let insertPosition = boundary?.position ?? null;
                if (chart.$labelBoxes?.some(box => mouseX >= box.x && mouseX <= box.x + box.width && mouseY >= box.y - 4 && mouseY <= box.y + box.height + 4)) {
                    hideSeparatorButtons(); return;
                }

                // Vérifier si on est près de la ligne de séparation active (avec tolérance élargie pour les boutons)
                const buttonTolerance = 25; // Tolérance élargie pour inclure la zone des boutons
                if (separatorY === null && activeSeparatorY !== null) {
                    if (Math.abs(mouseY - activeSeparatorY) < buttonTolerance) {
                        // On est encore dans la zone de la ligne de séparation active
                        separatorY = activeSeparatorY;
                        insertPosition = activeInsertPosition;
                    }
                }

                if (separatorY !== null && insertPosition !== null) {
                    // On est sur une ligne de séparation entre deux lanes
                    // Mémoriser la ligne active
                    activeSeparatorY = separatorY;
                    activeInsertPosition = insertPosition;

                    // Calculer la date correspondant à la position X de la souris
                    const mouseXValue = xAxis.getValueForPixel(mouseX);
                    activeDate = new Date(mouseXValue);

                    // Vérifier si la souris est sur un jalon existant
                    let isHoveringMilestone = false;
                    const milestonesData = chart.options.milestonesData;
                    if (milestonesData && milestonesData.length > 0) {
                        const mouseTimestamp = mouseXValue;
                        for (const milestone of milestonesData) {
                            const milestoneTimestamp = milestone.date;
                            const tolerance = 2 * 24 * 60 * 60 * 1000; // 2 jours de tolérance
                            if (Math.abs(mouseTimestamp - milestoneTimestamp) < tolerance) {
                                isHoveringMilestone = true;
                                break;
                            }
                        }
                    }

                    // Si on est sur un jalon, ne pas afficher les boutons
                    if (isHoveringMilestone) {
                        hideSeparatorButtons();
                        return;
                    }

                    // Dessiner la ligne de séparation
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(xAxis.left, separatorY);
                    ctx.lineTo(xAxis.right, separatorY);
                    ctx.strokeStyle = 'rgba(0, 113, 227, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([8, 4]);
                    ctx.stroke();
                    ctx.restore();

                    // Afficher les boutons avec la position X de la souris
                    showSeparatorButtons(insertPosition, xAxis.left, separatorY, mouseX, canvas, chart);
                } else {
                    // On s'éloigne de la ligne de séparation, réinitialiser après un délai
                    scheduleHideSeparatorButtons();
                }
            }
        });

        // Fonction pour afficher les boutons de séparation
        function showSeparatorButtons(insertPosition, chartLeft, separatorY, mouseX, canvas, chart) {
            const separatorOverlay = document.getElementById('gantt-separator-overlay');
            if (!separatorOverlay) return;

            // IMPORTANT: Utiliser riskGroups directement pour garantir la synchronisation
            // car phases peut ne pas être à jour après ajout/suppression de tâches
            const currentGroups = riskGroups;

            // Trouver la phase et la position d'insertion
            let currentPhaseId = null;
            let positionInPhase = 0;
            let tasksSeen = 0;

            console.log('=== DEBUG insertPosition ===', insertPosition);
            console.log('=== riskGroups actuels ===', currentGroups.map(g => `${g.id}: ${g.tasks.length} tâches [${g.tasks.map(t => t.id + (t.isMilestone ? '★' : '')).join(', ')}]`));

            for (const group of currentGroups) {
                console.log(`Groupe ${group.id}: ${group.tasks.length} tâches totales`, group.tasks.map(t => `${t.id} (${t.isMilestone ? 'jalon' : 'tâche'})`));
                // Compter TOUTES les tâches (y compris les jalons) pour la position d'insertion
                if (tasksSeen + group.tasks.length >= insertPosition) {
                    currentPhaseId = group.id;
                    positionInPhase = insertPosition - tasksSeen;
                    console.log(`--> Phase trouvée: ${currentPhaseId}, positionInPhase: ${positionInPhase}`);
                    break;
                }
                tasksSeen += group.tasks.length;
            }

            // Si même position que précédent, ne pas redessiner
            // Vérifier si la position a changé (incluant la date)
            const dateChanged = activeDate && visibleSeparatorLane === insertPosition && visibleSeparatorPhaseId === currentPhaseId;
            if (dateChanged && !activeDate) {
                return;
            }

            visibleSeparatorLane = insertPosition;
            visibleSeparatorPhaseId = currentPhaseId;

            const rect = canvas.getBoundingClientRect();
            const xAxis = chart.scales.x;

            // separatorY est en pixels internes du canvas
            // Il faut convertir en pixels CSS pour le positionnement
            const pixelRatio = rect.height / chart.height;
            const pixelRatioX = rect.width / chart.width;
            const separatorYCSS = separatorY * pixelRatio;

            // Position X des boutons (convertir de pixels internes à pixels CSS)
            const mouseXCSS = mouseX * pixelRatioX;

            // Formater la date pour le dataset
            const dateStr = activeDate ? activeDate.toISOString().split('T')[0] : '';

            // Créer le HTML des boutons
            separatorOverlay.innerHTML = `
                <div class="gantt-add-buttons-container" style="
                    position: absolute;
                    left: ${mouseXCSS}px;
                    top: ${separatorYCSS}px;
                    transform: translate(-50%, -50%);
                    pointer-events: auto;
                ">
                    <!-- Petit bouton + principal -->
                    <div class="gantt-add-trigger" style="
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: var(--surface-soft);
                        color: var(--muted);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                        z-index: 10;
                    ">+</div>

                    <!-- Menu avec les options (caché par défaut) -->
                    <div class="gantt-add-menu" style="
                        display: none;
                        position: absolute;
                        left: 20px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: var(--surface);
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                        padding: 4px;
                        z-index: 11;
                    ">
                        <button class="gantt-add-milestone-btn" data-phase-id="${currentPhaseId}" data-position="${positionInPhase}" data-date="${dateStr}"
                            style="
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                width: 100%;
                                padding: 8px 12px;
                                background: transparent;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-weight: 500;
                                color: var(--ink);
                                white-space: nowrap;
                            " onmouseover="this.style.background='rgba(175, 82, 222, 0.1)';"
                               onmouseout="this.style.background='transparent';">
                            <span style="color: #AF52D6; font-size: 16px;">◆</span>
                            <span>${t('addMilestone')}</span>
                        </button>
                        <button class="gantt-add-task-btn" data-phase-id="${currentPhaseId}" data-position="${positionInPhase}" data-date="${dateStr}"
                            style="
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                width: 100%;
                                padding: 8px 12px;
                                background: transparent;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 13px;
                                font-weight: 500;
                                color: var(--ink);
                                white-space: nowrap;
                            " onmouseover="this.style.background='rgba(0, 113, 227, 0.1)';"
                               onmouseout="this.style.background='transparent';">
                            <span style="color: #0071E3; font-size: 16px;">+</span>
                            <span>${t('addRisk')}</span>
                        </button>
                    </div>
                </div>
            `;

            separatorOverlay.style.display = 'block';

            // Attacher les événements sur le conteneur
            const container = separatorOverlay.querySelector('.gantt-add-buttons-container');
            const trigger = separatorOverlay.querySelector('.gantt-add-trigger');
            const menu = separatorOverlay.querySelector('.gantt-add-menu');

            if (container && trigger && menu) {
                // Au clic sur le bouton +, afficher le menu
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    isHoveringButtons = true;
                    if (hideSeparatorTimeout) {
                        clearTimeout(hideSeparatorTimeout);
                        hideSeparatorTimeout = null;
                    }
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                });

                // Au survol du conteneur, empêcher de cacher
                container.addEventListener('mouseenter', () => {
                    isHoveringButtons = true;
                    if (hideSeparatorTimeout) {
                        clearTimeout(hideSeparatorTimeout);
                        hideSeparatorTimeout = null;
                    }
                });

                // Au sortie du conteneur, cacher le menu et planifier le cache
                container.addEventListener('mouseleave', () => {
                    isHoveringButtons = false;
                    menu.style.display = 'none';
                    scheduleHideSeparatorButtons();
                });
            }

            // Attacher les événements de clic
            const taskBtn = separatorOverlay.querySelector('.gantt-add-task-btn');
            const milestoneBtn = separatorOverlay.querySelector('.gantt-add-milestone-btn');

            if (taskBtn) {
                taskBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const phaseId = parseInt(taskBtn.dataset.phaseId);
                    const position = parseInt(taskBtn.dataset.position);
                    const date = taskBtn.dataset.date;
                    addNewRiskAtPosition(phaseId, position, false, date, chart);
                    hideSeparatorButtons();
                });
            }

            if (milestoneBtn) {
                milestoneBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const phaseId = parseInt(milestoneBtn.dataset.phaseId);
                    const position = parseInt(milestoneBtn.dataset.position);
                    const date = milestoneBtn.dataset.date;
                    addNewRiskAtPosition(phaseId, position, true, date);
                    hideSeparatorButtons();
                });
            }
        }

        // Fonction pour cacher les boutons de séparation
        function hideSeparatorButtons() {
            const separatorOverlay = document.getElementById('gantt-separator-overlay');
            if (separatorOverlay) {
                separatorOverlay.style.display = 'none';
                separatorOverlay.innerHTML = '';
            }
            visibleSeparatorLane = null;
            visibleSeparatorPhaseId = null;
            isHoveringButtons = false;
        }

        // Fonction pour planifier le cache des boutons (avec délai)
        function scheduleHideSeparatorButtons() {
            // Annuler le timeout précédent s'il existe
            if (hideSeparatorTimeout) {
                clearTimeout(hideSeparatorTimeout);
            }

            // Si on est en hover sur les boutons, ne pas cacher
            if (isHoveringButtons) {
                return;
            }

            // Cacher après 100ms et réinitialiser la ligne active
            hideSeparatorTimeout = setTimeout(() => {
                if (!isHoveringButtons) {
                    hideSeparatorButtons();
                    activeSeparatorY = null;
                    activeInsertPosition = null;
                }
            }, 100);
        }

        // Suivre le mouvement de la souris sur le canvas
        if (ganttChartCanvas) {
            ganttChartCanvas.addEventListener('mousemove', function(e) {
                ganttMouseX = e.clientX;
                ganttMouseY = e.clientY;
                if (ganttChart) {
                    ganttChart.draw('none'); // Redessiner pour mettre à jour les séparateurs
                }
            });

            // Cacher les séparateurs quand la souris quitte le canvas
            ganttChartCanvas.addEventListener('mouseleave', function() {
                hideSeparatorButtons();
                if (ganttChart) {
                    ganttChart.draw('none');
                }
            });
        }

        // Fonction pour calculer les dates de repère (snap targets)
        function getSnapTargets(excludeTaskIndex) {
            const targets = [];

            // Ajouter les dates de début et fin de toutes les tâches
            phases.forEach(phase => {
                phase.tasks.forEach((task, idx) => {
                    const globalIndex = phases.flatMap(p => p.tasks).findIndex((t, i) => t === task);
                    if (globalIndex !== excludeTaskIndex) {
                        // Date de début
                        targets.push({
                            date: new Date(task.startDate).getTime(),
                            type: 'start',
                            taskId: task.id
                        });
                        // Date de fin (si pas un jalon)
                        if (!task.isMilestone && task.endDate) {
                            targets.push({
                                date: new Date(task.endDate).getTime(),
                                type: 'end',
                                taskId: task.id
                            });
                        }
                    }
                });
            });

            // Ajouter les dates remarquables (débuts de mois et années)
            const allDates = phases.flatMap(p => p.tasks.map(t => new Date(t.startDate).getTime()));
            if (allDates.length > 0) {
                const minDate = new Date(Math.min(...allDates));
                const maxDate = new Date(Math.max(...allDates));

                // Ajouter le 1er de chaque mois dans la plage
                let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
                const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 1);

                while (current <= endDate) {
                    targets.push({
                        date: current.getTime(),
                        type: 'month',
                        taskId: null
                    });
                    current.setMonth(current.getMonth() + 1);
                }

                // Ajouter le 1er janvier de chaque année dans la plage
                current = new Date(minDate.getFullYear(), 0, 1);
                while (current <= endDate) {
                    targets.push({
                        date: current.getTime(),
                        type: 'year',
                        taskId: null
                    });
                    current.setFullYear(current.getFullYear() + 1);
                }
            }

            // Trier par date
            return targets.sort((a, b) => a.date - b.date);
        }

        // Fonction pour trouver la date la plus proche (magnétisme)
        function findSnapDate(currentDate, targets, threshold = 2 * 86400000) { // 2 jours en ms
            let closest = null;
            let minDistance = threshold;

            targets.forEach(target => {
                const distance = Math.abs(target.date - currentDate);
                if (distance < minDistance) {
                    minDistance = distance;
                    closest = target;
                }
            });

            return closest;
        }

        function updateGantt() {
            saveState();
            const canvas = document.getElementById('ganttChart'); if (!canvas) return;
            if (ganttChart) { ganttChart.destroy(); ganttChart = null; }
            const ctx = canvas.getContext('2d');
            const phases = visiblePlanningGroups();
            const allTasks = phases.flatMap(p => p.tasks);
            const dates = allTasks.flatMap(task => [Date.parse(task.startDate), Date.parse(task.endDate || task.startDate), Date.parse(task.deadline), Date.parse(baselineData?.tasks?.[task.id]?.startDate), Date.parse(baselineData?.tasks?.[task.id]?.endDate)]).filter(Number.isFinite);
            const dayMs = 86400000;
            const minDate = dates.length ? Math.min(...dates) : Date.parse(todayISO());
            const maxDate = dates.length ? Math.max(...dates) : minDate + 14 * dayMs;
            const range = { ...ganttZoomWindow(minDate, maxDate, dayMs), left: ganttViewMode === 'cascade' ? 290 : 32 };
            const width = ganttExportWidth || Math.max(1120, canvas.parentElement.parentElement.clientWidth);
            canvas.parentElement.style.width = width + 'px';
            const inWindow = task => Date.parse(task.endDate || task.startDate) >= range.min && Date.parse(task.startDate) <= range.max;
            const headers = [];
            const rows = [], ganttData = [], milestones = [], labels = [], colors = [];
            // Coordonnées verticales en pixels : 6 px entre texte et barre,
            // 16 px entre tâches (dont 6 réservés à une éventuelle baseline).
            ctx.font = '600 13px Helvetica, Arial, sans-serif';
            const labelWidth = ganttViewMode === 'cascade' ? range.left - 30 : 244;
            const taskLines = new Map(allTasks.map(task => [task.id, wrapGanttText(ctx, task.id + ' · ' + task.title, labelWidth, 3)]));
            let contentHeight = 8;
            const addLane = (tasks, phaseFor) => {
                const textHeight = Math.max(...tasks.map(task => taskLines.get(task.id).length * 16));
                const cascade = ganttViewMode === 'cascade';
                const height = cascade ? Math.max(48, textHeight + 16) : textHeight + 6 + 32 + 16;
                const y = contentHeight + (cascade ? height / 2 : textHeight + 6 + 16);
                tasks.forEach(task => rows.push({task, phase: phaseFor(task), y, top: contentHeight, bottom: contentHeight + height, lines: taskLines.get(task.id)}));
                contentHeight += height;
            };
            if (ganttViewMode === 'cascade') {
                phases.forEach(phase => phase.tasks.filter(inWindow).forEach(task => addLane([task], () => phase)));
            } else if (ganttViewMode === 'consolide') {
                phases.forEach(phase => {
                    const lines = packGanttTasks(phase.tasks.filter(inWindow), range, width);
                    if (!lines.length) return;
                    const headerLines = wrapGanttText(ctx, phase.name, width - range.left - 64, 2);
                    const height = headerLines.length * 17 + 16;
                    headers.push({label: phase.name, y: contentHeight, height, lines: headerLines, color: phase.color});
                    contentHeight += height + 8;
                    lines.forEach(line => addLane(line, () => phase));
                    contentHeight += 8;
                });
            } else {
                const phaseByTask = new Map(phases.flatMap(p => p.tasks.map(t => [t.id, p])));
                packGanttTasks(allTasks.filter(inWindow), range, width).forEach(line => addLane(line, task => phaseByTask.get(task.id)));
            }
            rows.forEach(row => {
                const task = row.task, start = Date.parse(task.startDate);
                labels.push(task.id);
                if (task.isMilestone && ganttViewMode === 'cascade') milestones.push({task, phase: row.phase, yPosition: row.y, date: start});
                else {
                    ganttData.push({x: [start, task.isMilestone ? start : Math.max(start + dayMs * 0.5, Date.parse(task.endDate || task.startDate))], y: row.y, task, isMilestone: !!task.isMilestone, color: row.phase.color});
                    colors.push(row.phase.color);
                }
            });
            contentHeight = Math.max(84, contentHeight);
            canvas.parentElement.style.height = (contentHeight + 96) + 'px';
            const theme = ganttColors();
            canvas.width = width; canvas.height = canvas.parentElement.offsetHeight;
            ganttChart = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Tâches', data: ganttData, backgroundColor: colors.map((c,i) => ganttData[i].isMilestone ? 'transparent' : c + '38'), borderColor: colors.map((c,i) => ganttData[i].isMilestone ? 'transparent' : c), borderWidth: 1.5, borderRadius: 4, borderSkipped: false, barThickness: 32, grouped: false }] },
                options: {
                    ganttData, phasesData: phases, milestonesData: milestones, readableRows: rows, readableHeaders: headers,
                    indexAxis: 'y', responsive: false, animation: false, maintainAspectRatio: false,
                    layout: {padding: {left: range.left, right: 32, top: 40, bottom: 16}},
                    scales: {
                        x: {...range, position: 'top', afterFit: axis => { axis.height = 40; }, ticks: {maxRotation: 0, autoSkip: true, maxTicksLimit: Math.max(4, Math.floor((width - range.left) / 105)), color: theme.muted, font: {size: 12}, callback: value => new Date(value).toLocaleDateString(currentLanguage === 'en' ? 'en-GB' : 'fr-FR', {day: '2-digit', month: 'short', timeZone: 'UTC'})}, grid: {color: theme.grid}},
                        y: {type: 'linear', display: false, offset: false, min: 0, max: contentHeight, reverse: true, ticks: {display: false}, grid: {display: false}, border: {display: false}}
                    },
                    plugins: { legend: {display: false}, tooltip: {
                        position: 'plannrOffset', caretSize: 0, displayColors: false, padding: 12,
                        callbacks: { title: () => '', label: context => {
                            const task = ganttData[context.dataIndex].task;
                            const margin = taskMargins.get(task.id);
                            return [...wrapGanttText(ctx, task.id + ' · ' + task.title, 320, 4), formatDateFR(task.startDate) + ' → ' + formatDateFR(task.endDate || task.startDate), uiText('duration') + ': ' + (task.isMilestone ? 0 : workingDaysBetween(task.startDate, task.endDate)) + ' ' + uiText('days'), uiText('slack') + ': ' + (margin ? margin.days : '—') + ' ' + uiText('days')];
                        }}
                    }}
                }
            });

            // ===== EVENT LISTENERS POUR LE DRAG & DROP =====
            canvas.style.cursor = 'grab';

            // v2.1.3 : purger les listeners du build précédent. Ils
            // s'empilaient à chaque updateGantt ; après un changement de
            // vue, l'ANCIEN closure (indexé sur l'autre mode) interceptait
            // le mouseup et committait le drag sur la MAUVAISE tâche.
            if (canvas._plannrDragListeners) {
                for (const [evType, evFn] of canvas._plannrDragListeners) {
                    canvas.removeEventListener(evType, evFn);
                }
            }
            canvas._plannrDragListeners = [];
            const addGanttListener = (evType, evFn) => {
                canvas.addEventListener(evType, evFn);
                canvas._plannrDragListeners.push([evType, evFn]);
            };

            addGanttListener('mousedown', function(e) {
                const rect = canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;

                // v2.3 : pastille de connexion — testée AVANT le resize
                // (zones disjointes : pastille à bord+12..+24, resize à ±10)
                const linkSource = findLinkDotAt(clickX, clickY);
                if (linkSource) {
                    startLinkDrag(linkSource);
                    canvas.style.cursor = 'crosshair';
                    return;
                }

                const xAxis = ganttChart.scales.x;
                const yAxis = ganttChart.scales.y;
                const labels = ganttChart.data.labels;

                let dataIndex; // Déclaration déplacée ici

                // D'abord, vérifier si le clic est sur une capsule de jalon
                let milestoneClickedTask = null;

                if (ganttViewMode === 'cascade') {
                    // Mode cascade : vérifier les jalons dans milestonesData
                    if (milestones && milestones.length > 0) {
                        milestones.forEach((milestone) => {
                            const x = xAxis.getPixelForValue(milestone.date);
                            // IMPORTANT: yPosition est déjà non-entier pour être ENTRE les lanes
                            const capsuleY = yAxis.getPixelForValue(milestone.yPosition);

                            const capsuleWidth = 50;
                            const capsuleHeight = 20;

                            const halfWidth = capsuleWidth / 2;
                            const halfHeight = capsuleHeight / 2;

                            if (clickX >= x - halfWidth && clickX <= x + halfWidth &&
                                clickY >= capsuleY - halfHeight && clickY <= capsuleY + halfHeight) {
                                milestoneClickedTask = milestone.task;
                            }
                        });
                    }
                } else {
                    // Modes groupe et compact : vérifier dans ganttData
                    ganttData.forEach((dataPoint, index) => {
                        if (dataPoint.isMilestone) {
                            const x = xAxis.getPixelForValue(dataPoint.x[0]);
                            let capsuleY = yAxis.getPixelForValue(dataPoint.y);

                            // Appliquer le décalage si mode compact
                            if (ganttViewMode === 'compact' && dataPoint.compactMode) {
                                capsuleY += 0;
                            }

                            const capsuleWidth = 50;
                            const capsuleHeight = 20;

                            const halfWidth = capsuleWidth / 2;
                            const halfHeight = capsuleHeight / 2;

                            if (clickX >= x - halfWidth && clickX <= x + halfWidth &&
                                clickY >= capsuleY - halfHeight && clickY <= capsuleY + halfHeight) {
                                // Mode Compact/Groupe : On traite le jalon comme une tâche normale via son index
                                // On ne définit PAS milestoneClickedTask pour éviter d'entrer dans la logique Cascade
                                dataIndex = index;
                                return; // Sortir de la boucle
                            }
                        }
                    });
                }

                // Vérifier d'abord si on clique sur un bord d'une tâche pour le redimensionnement
                if (!milestoneClickedTask && dataIndex === undefined) {
                    ganttData.forEach((dataPoint, index) => {
                        if (dataPoint.isMilestone) return; // Skip milestones

                        const xStart = xAxis.getPixelForValue(dataPoint.x[0]);
                        const xEnd = xAxis.getPixelForValue(dataPoint.x[1]);
                        const y = yAxis.getPixelForValue(dataPoint.y);
                        const barHeight = 35; // Hauteur fixe des barres (barThickness)

                        // Tolérance de 10 pixels pour le clic sur les bords
                        const edgeTolerance = 10;

                        // Vérifier si on est près du bord gauche ou droit
                        if (Math.abs(clickX - xStart) <= edgeTolerance &&
                            clickY >= y - barHeight/2 && clickY <= y + barHeight/2) {
                            // Bord gauche - redimensionner la date de début
                            resizeEdge = 'left';
                            resizeTaskIndex = index;
                            resizeStartDate = dataPoint.x[0];
                            resizeEndDate = dataPoint.x[1];
                            isResizing = true;
                            dragStartX = clickX; // Initialiser dragStartX pour éviter les bugs
                            return; // Sortir de la boucle
                        } else if (Math.abs(clickX - xEnd) <= edgeTolerance &&
                            clickY >= y - barHeight/2 && clickY <= y + barHeight/2) {
                            // Bord droit - redimensionner la date de fin
                            resizeEdge = 'right';
                            resizeTaskIndex = index;
                            resizeStartDate = dataPoint.x[0];
                            resizeEndDate = dataPoint.x[1];
                            isResizing = true;
                            dragStartX = clickX; // Initialiser dragStartX pour éviter les bugs
                            return; // Sortir de la boucle
                        }
                    });
                }

                if (isResizing) {
                    // Mode redimensionnement
                    canvas.style.cursor = resizeEdge === 'left' ? 'w-resize' : 'e-resize';
                    dragStartX = clickX;
                    return;
                }

                if (milestoneClickedTask !== null) {
                    // Clic sur une capsule de jalon - permettre le drag & drop
                    isDragging = true;
                    draggedMilestone = milestoneClickedTask;
                    dragStartDate = new Date(milestoneClickedTask.startDate).getTime();
                    dragStartX = clickX;

                    // Trouver les données du jalon dans milestones
                    draggedMilestoneData = milestones.find(m => m.task === milestoneClickedTask);

                    canvas.style.cursor = 'grabbing';

                    // Calculer les snap targets (sans exclusion de tâche pour les jalons)
                    const snapTargets = getSnapTargets(-1);

                    snapLines = snapTargets.map(target => ({
                        x: xAxis.getPixelForValue(target.date),
                        date: target.date,
                        type: target.type,
                        taskId: target.taskId
                    }));
                } else if (dataIndex === undefined) {
                    // Utiliser la détection Chart.js normale pour les tâches (seulement si pas déjà trouvé)
                    const elements = ganttChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);

                    if (elements.length > 0) {
                        dataIndex = elements[0].index;
                    } else {
                        // Fallback déterministe (v2.1.1) : hit-test manuel du corps
                        // des barres, même géométrie que la détection des bords
                        // ci-dessus. getElementsAtEventForMode s'avère non fiable
                        // immédiatement après un hover (retourne [] alors que la
                        // position relative est dans la barre).
                        ganttData.forEach((dataPoint, index) => {
                            if (dataIndex !== undefined || dataPoint.isMilestone) return;
                            const xStart = xAxis.getPixelForValue(dataPoint.x[0]);
                            const xEnd = xAxis.getPixelForValue(dataPoint.x[1]);
                            const y = yAxis.getPixelForValue(dataPoint.y);
                            const barHeight = 35;
                            if (clickX >= xStart && clickX <= xEnd &&
                                clickY >= y - barHeight / 2 && clickY <= y + barHeight / 2) {
                                dataIndex = index;
                            }
                        });
                    }
                }

                if (dataIndex !== undefined && dataIndex >= 0 && dataIndex < ganttData.length) {
                    isDragging = true;
                    draggedTaskIndex = dataIndex;
                    dragStartDate = ganttData[dataIndex].x[0];
                    dragStartX = clickX;

                    canvas.style.cursor = 'grabbing';

                    // Calculer les snap targets et leurs positions en pixels
                    const snapTargets = getSnapTargets(dataIndex);

                    snapLines = snapTargets.map(target => ({
                        x: xAxis.getPixelForValue(target.date),
                        date: target.date,
                        type: target.type,
                        taskId: target.taskId
                    }));

                }
            });

            addGanttListener('mousemove', function(e) {
                // v2.3 : drag de liaison en cours — la flèche élastique est
                // redessinée par le tracker global (ganttChart.draw)
                if (linkDrag) {
                    canvas.style.cursor = 'crosshair';
                    return;
                }
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // Détection du survol des bords pour changer le curseur (si pas en mode drag/resize)
                if (!isDragging && !isResizing) {
                    const xAxis = ganttChart.scales.x;
                    const yAxis = ganttChart.scales.y;
                    let hoveringEdge = false;

                    ganttData.forEach((dataPoint, index) => {
                        if (dataPoint.isMilestone) return; // Skip milestones

                        const xStart = xAxis.getPixelForValue(dataPoint.x[0]);
                        const xEnd = xAxis.getPixelForValue(dataPoint.x[1]);
                        const y = yAxis.getPixelForValue(dataPoint.y);
                        const barHeight = 50;
                        const edgeTolerance = 10;

                        // Vérifier si on survole le bord gauche ou droit
                        if ((Math.abs(mouseX - xStart) <= edgeTolerance ||
                             Math.abs(mouseX - xEnd) <= edgeTolerance) &&
                            mouseY >= y - barHeight/2 && mouseY <= y + barHeight/2) {
                            hoveringEdge = true;
                            canvas.style.cursor = Math.abs(mouseX - xStart) <= edgeTolerance ? 'w-resize' : 'e-resize';
                        }
                    });

                    if (!hoveringEdge) {
                        canvas.style.cursor = 'grab';
                    }
                }

                // Mode redimensionnement
                if (isResizing) {
                    const xAxis = ganttChart.scales.x;

                    // Calculer le déplacement en pixels et le convertir en temps
                    const deltaX = mouseX - dragStartX;

                    // Utiliser la bonne référence selon le bord qu'on redimensionne
                    const refDate = resizeEdge === 'left' ? resizeStartDate : resizeEndDate;
                    const newPixel = xAxis.getPixelForValue(refDate) + deltaX;
                    const newDate = xAxis.getValueForPixel(newPixel);

                    let finalDate = newDate;

                    // Appliquer le magnétisme seulement si Shift n'est PAS enfoncé
                    if (!e.shiftKey) {
                        const snapTargets = getSnapTargets(resizeTaskIndex);
                        const snapped = findSnapDate(newDate, snapTargets);

                        if (snapped) {
                            finalDate = snapped.date;
                            snapLines = snapLines.filter(line => Math.abs(line.date - finalDate) < 86400000);
                        } else {
                            snapLines = [];
                        }
                    } else {
                        snapLines = [];
                    }

                    const task = ganttData[resizeTaskIndex].task;
                    if (!task) return;

                    if (resizeEdge === 'left') {
                        // Redimensionner la date de début (garder la date de fin fixe)
                        ganttData[resizeTaskIndex].x[0] = finalDate;
                    } else {
                        // Redimensionner la date de fin (garder la date de début fixe)
                        ganttData[resizeTaskIndex].x[1] = finalDate;
                    }

                    ganttChart.update('none');
                    return;
                }

                if (!isDragging) return;
                if (draggedMilestone && !draggedMilestoneData) return;
                if (!draggedMilestone && draggedTaskIndex === null) return;

                const xAxis = ganttChart.scales.x;

                // Calculer le déplacement en pixels et le convertir en temps
                const deltaX = mouseX - dragStartX;
                const dataStart = dragStartDate;
                const pixelStart = xAxis.getPixelForValue(dataStart);
                const newPixel = pixelStart + deltaX;
                const newDate = xAxis.getValueForPixel(newPixel);

                let finalDate = newDate;

                // Appliquer le magnétisme seulement si Shift n'est PAS enfoncé
                if (!e.shiftKey) {
                    const snapTargets = getSnapTargets(draggedMilestone ? -1 : draggedTaskIndex);
                    const snapped = findSnapDate(newDate, snapTargets);

                    if (snapped) {
                        finalDate = snapped.date;
                        // Afficher les lignes de snap
                        snapLines = snapLines.filter(line => Math.abs(line.date - finalDate) < 86400000); // ±1 jour
                    } else {
                        snapLines = [];
                    }
                } else {
                    snapLines = [];
                }

                if (draggedMilestone && draggedMilestoneData) {
                    // Drag d'un jalon (tous modes)
                    draggedMilestoneData.date = finalDate;

                    // En mode compact/groupe, mettre aussi à jour ganttData pour le retour visuel
                    if (draggedTaskIndex !== null) {
                        ganttData[draggedTaskIndex].x[0] = finalDate;
                        ganttData[draggedTaskIndex].x[1] = finalDate + (2 * 24 * 60 * 60 * 1000);
                    }
                } else if (draggedTaskIndex !== null) {
                    const task = ganttData[draggedTaskIndex] ? ganttData[draggedTaskIndex].task : null;
                    if (!task) return;

                    const isMilestone = task.isMilestone || ganttData[draggedTaskIndex].isMilestone;

                    if (isMilestone) {
                        // Pour un jalon : déplacer la barre de 2 jours (zone de clic)
                        ganttData[draggedTaskIndex].x[0] = finalDate;
                        ganttData[draggedTaskIndex].x[1] = finalDate + (2 * 24 * 60 * 60 * 1000); // 2 jours pour la zone de clic
                    } else {
                        const preview = {...task};
                        moveTaskToWorkingDate(preview, new Date(finalDate).toISOString().slice(0,10));
                        ganttData[draggedTaskIndex].x[0] = Date.parse(preview.startDate);
                        ganttData[draggedTaskIndex].x[1] = Date.parse(preview.endDate);

                    }
                }

                ganttChart.update('none'); // Update sans animation pour la fluidité
            });

            addGanttListener('mouseup', function(e) {
                // v2.3 : fin d'un drag de liaison de dépendance
                if (linkDrag) {
                    const rectLink = canvas.getBoundingClientRect();
                    finishLinkDrag(e.clientX - rectLink.left, e.clientY - rectLink.top);
                    canvas.style.cursor = 'grab';
                    return;
                }
                // Gestion de la fin du redimensionnement
                if (isResizing) {
                    const task = ganttData[resizeTaskIndex].task;
                    if (!task) return;

                    // Sauvegarder l'état avant modification
                    saveState();

                    // Mettre à jour les dates de la tâche
                    const newStart = new Date(ganttData[resizeTaskIndex].x[0]);
                    const newEnd = new Date(ganttData[resizeTaskIndex].x[1]);

                    task.startDate = newStart.toISOString().split('T')[0];
                    task.endDate = newEnd.toISOString().split('T')[0];
                    if (task.endDate < task.startDate) task.endDate = task.startDate;
                    task.duration = workingDaysBetween(task.startDate, task.endDate);

                    // Recalculer les dates de la phase
                    const phase = phases.find(p => p.tasks.some(t => t.id === task.id));
                    if (phase) {
                        updatePhaseDates(phase);
                    }

                    // Réinitialiser
                    isResizing = false;
                    resizeEdge = null;
                    resizeTaskIndex = null;
                    resizeStartDate = null;
                    resizeEndDate = null;
                    snapLines = [];
                    canvas.style.cursor = 'grab';

                    // Cascade des dépendances + chemin critique (v2.1)
                    const shiftedByDeps = applyDependencyCascade({});
                    recomputeCriticalPath();

                    // Re-rendre tout (rebuild complet si la cascade a décalé
                    // d'autres tâches : leurs barres doivent être repositionnées)
                    updateGantt();
                    renderPlanning();
                    updateDashboard();

                    showToast('Tâche redimensionnée');
                    return;
                }

                // Gestion de la fin du drag & drop
                if (!isDragging) return;
                if (draggedMilestone && !draggedMilestoneData) return;
                if (!draggedMilestone && draggedTaskIndex === null) return;

                if (draggedMilestone && draggedMilestoneData) {
                    // v2.2 (FR-12) : simple clic sur la capsule -> ligne du tableau
                    const rectClickM = canvas.getBoundingClientRect();
                    if (Math.abs((e.clientX - rectClickM.left) - dragStartX) < 4) {
                        const clickedId = draggedMilestone.id;
                        isDragging = false;
                        draggedMilestone = null;
                        draggedMilestoneData = null;
                        draggedTaskIndex = null;
                        snapLines = [];
                        canvas.style.cursor = 'grab';
                        updateGantt();
                        highlightTaskRow(clickedId);
                        return;
                    }

                    // Fin du drag d'un jalon (tous modes)
                    saveState();

                    // Date d'origine (pour Alt+glisser : delta du sous-arbre)
                    const movedMilestone = draggedMilestone;
                    const prevMilestoneStart = movedMilestone.startDate;

                    // Mettre à jour la date du jalon
                    const newStart = new Date(draggedMilestoneData.date);
                    draggedMilestone.startDate = newStart.toISOString().split('T')[0];
                    // Pour un jalon, endDate = startDate
                    draggedMilestone.endDate = draggedMilestone.startDate;

                    // Recalculer les dates de la phase
                    const phase = phases.find(p => p.id === parseInt(draggedMilestone.id.split('.')[0]));
                    if (phase) {
                        updatePhaseDates(phase);
                    }

                    // Réinitialiser
                    isDragging = false;
                    draggedMilestone = null;
                    draggedMilestoneData = null;
                    draggedTaskIndex = null;
                    snapLines = [];
                    canvas.style.cursor = 'grab';

                    // Alt+glisser (v2.1.2) : déplacement RIGIDE du sous-arbre
                    let subtreeShifted = 0;
                    const dragDeltaDays = prevMilestoneStart ? Math.round(
                        (new Date(movedMilestone.startDate + 'T12:00:00Z') -
                         new Date(prevMilestoneStart + 'T12:00:00Z')) / 86400000) : 0;
                    if (e.altKey && dragDeltaDays !== 0) {
                        subtreeShifted = shiftDescendants(movedMilestone, dragDeltaDays);
                    }

                    // Cascade des dépendances + chemin critique (v2.1)
                    const shiftedByDeps = applyDependencyCascade({});
                    recomputeCriticalPath();

                    // Re-rendre tout
                    sanitizeData();
                    updateGantt();
                    renderPlanning();
                    updateDashboard();

                    showToast('Jalon déplacé');
                    if (subtreeShifted > 0) {
                        showToast(t('subtreeShifted').replace('{n}', subtreeShifted));
                    } else if (dragDeltaDays < 0 && collectDescendants(movedMilestone.id).size > 0) {
                        showToast(t('altDragHint'));
                    }
                } else {
                    // Fin du drag d'une tâche normale
                    if (!ganttData[draggedTaskIndex]) return; // Sécurité supplémentaire
                    const task = ganttData[draggedTaskIndex].task;
                    if (!task) return;

                    // v2.2 (FR-12) : simple CLIC (pas de déplacement) ->
                    // naviguer vers la ligne du tableau, pas de faux commit
                    const rectClick = canvas.getBoundingClientRect();
                    if (Math.abs((e.clientX - rectClick.left) - dragStartX) < 4) {
                        isDragging = false;
                        draggedTaskIndex = null;
                        snapLines = [];
                        canvas.style.cursor = 'grab';
                        updateGantt(); // restaure la position exacte de la barre
                        highlightTaskRow(task.id);
                        return;
                    }

                    const newStart = new Date(ganttData[draggedTaskIndex].x[0]);
                    const isMilestone = task.isMilestone || ganttData[draggedTaskIndex].isMilestone;

                    // Sauvegarder l'état avant modification
                    saveState();

                    // Date d'origine (pour Alt+glisser : delta du sous-arbre)
                    const prevStartDate = task.startDate;

                    // Mettre à jour la tâche/jalon
                    task.startDate = newStart.toISOString().split('T')[0];

                    if (isMilestone) {
                        // Pour un jalon : date fin = date début
                        task.endDate = task.startDate;
                    } else {
                        // Tâche normale
                        const newEnd = new Date(ganttData[draggedTaskIndex].x[1]);
                        task.endDate = newEnd.toISOString().split('T')[0];
                        task.duration = workingDaysBetween(task.startDate, task.endDate);
                    }

                    // Recalculer les dates de la phase
                    const phase = phases.find(p => p.tasks.some(t => t.id === task.id));
                    if (phase) {
                        updatePhaseDates(phase);
                    }

                    // Réinitialiser
                    isDragging = false;
                    draggedTaskIndex = null;
                    snapLines = [];
                    canvas.style.cursor = 'grab';

                    // Alt+glisser (v2.1.2) : déplacement RIGIDE du sous-arbre —
                    // toute la descendance suit du même delta, dans les 2 sens
                    let subtreeShifted = 0;
                    const dragDeltaDays = prevStartDate ? Math.round(
                        (new Date(task.startDate + 'T12:00:00Z') -
                         new Date(prevStartDate + 'T12:00:00Z')) / 86400000) : 0;
                    if (e.altKey && dragDeltaDays !== 0) {
                        subtreeShifted = shiftDescendants(task, dragDeltaDays);
                    }

                    // Cascade des dépendances + chemin critique (v2.1)
                    const shiftedByDeps = applyDependencyCascade({});
                    recomputeCriticalPath();

                    // Re-rendre tout
                    sanitizeData();
                    updateGantt();
                    renderPlanning();
                    updateDashboard();

                    const itemType = isMilestone ? 'Jalon' : 'Tâche';
                    showToast(`${itemType} déplacé(e)`);
                    if (subtreeShifted > 0) {
                        showToast(t('subtreeShifted').replace('{n}', subtreeShifted));
                    } else if (dragDeltaDays < 0 && collectDescendants(task.id).size > 0) {
                        // Découvrabilité : recul d'une tâche qui a des successeurs
                        showToast(t('altDragHint'));
                    }
                }
            });

            addGanttListener('mouseleave', function() {
                if (linkDrag) { linkDrag = null; } // v2.3 : liaison annulée
                if (isDragging) {
                    isDragging = false;
                    draggedTaskIndex = null;
                    draggedMilestone = null;
                    draggedMilestoneData = null;
                    snapLines = [];
                    canvas.style.cursor = 'grab';
                    ganttChart.update('none');
                }

                // Réinitialiser le redimensionnement si on quitte le canvas
                if (isResizing) {
                    isResizing = false;
                    resizeEdge = null;
                    resizeTaskIndex = null;
                    resizeStartDate = null;
                    resizeEndDate = null;
                    snapLines = [];
                    canvas.style.cursor = 'grab';
                    ganttChart.update('none');
                }
            });
        }

        // ========================================
        // Mise à jour du Dashboard
        // ========================================
