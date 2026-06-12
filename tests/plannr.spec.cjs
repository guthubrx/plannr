// Tests e2e Plannr v2.1 — `npx playwright test`
// Le serveur HTTP est lancé automatiquement (cf. playwright.config.cjs).
const { test, expect } = require('@playwright/test');

let consoleErrors;

test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.goto('/plannr.html');
    await page.waitForSelector('#ganttChart');
});

test('charge sans erreur console, libs vendorisées présentes', async ({ page }) => {
    await expect(page).toHaveTitle(/Plannr/);
    const libs = await page.evaluate(() =>
        typeof Chart !== 'undefined' && typeof XLSX !== 'undefined' &&
        typeof window.jspdf !== 'undefined');
    expect(libs).toBe(true);
    expect(consoleErrors).toEqual([]);
});

test('données v2.1 chargées via la clé phases', async ({ page }) => {
    const d = await page.evaluate(() => ({
        fromPhases: !!window.PLANNR_DATA.phases,
        phases: phases.length,
        tasks: tasks.length
    }));
    expect(d.fromPhases).toBe(true);
    expect(d.phases).toBeGreaterThan(0);
    expect(d.tasks).toBeGreaterThan(0);
});

test('jours ouvrés : week-ends et fériés français exclus', async ({ page }) => {
    const w = await page.evaluate(() => [
        workingDaysBetween('2026-06-08', '2026-06-12'), // lun-ven : 5
        workingDaysBetween('2026-06-08', '2026-06-14'), // semaine + WE : 5
        workingDaysBetween('2026-07-14', '2026-07-14'), // 14 juillet : 0
        workingDaysBetween('2026-04-06', '2026-04-06')  // lundi de Pâques 2026 : 0
    ]);
    expect(w).toEqual([5, 5, 0, 0]);
});

test('dépendances : aucune violation après cascade, chemin critique calculé', async ({ page }) => {
    const d = await page.evaluate(() => ({
        noViolation: risks.every(t => parseDependsOn(t).every(pid => {
            const p = risks.find(r => r.id === pid);
            return !p || t.startDate > taskEndForDeps(p);
        })),
        milestonesCoherent: risks.filter(r => r.isMilestone && r.endDate)
            .every(r => r.endDate === r.startDate),
        criticalSize: _criticalIds.size
    }));
    expect(d.noViolation).toBe(true);
    expect(d.milestonesCoherent).toBe(true);
    expect(d.criticalSize).toBeGreaterThan(1);
});

test('round-trip : export canonique v2.1 -> import sans perte', async ({ page }) => {
    const ok = await page.evaluate(() => new Promise(resolve => {
        const before = { p: riskGroups.length, t: risks.length };
        const canon = buildCanonicalData();
        const dt = new DataTransfer();
        dt.items.add(new File([JSON.stringify(canon)], 'rt.json',
            { type: 'application/json' }));
        const input = document.getElementById('import-file');
        input.files = dt.files;
        importFromJSON(input);
        setTimeout(() => resolve(
            canon.version === '2.1' && !!canon.phases && !('riskGroups' in canon) &&
            riskGroups.length === before.p && risks.length === before.t
        ), 500);
    }));
    expect(ok).toBe(true);
});

test('rétro-compat : import de l\'ancien format riskGroups accepté', async ({ page }) => {
    const ok = await page.evaluate(() => new Promise(resolve => {
        const legacy = {
            version: '2.0',
            riskGroups: [{
                id: 9, name: 'Legacy', description: 'ancien format', color: '#333333',
                tasks: [{ id: '9.1', title: 'Tache legacy', startDate: '2026-10-01',
                          endDate: '2026-10-05', statut: 'A faire', assignedTo: '' }]
            }]
        };
        const dt = new DataTransfer();
        dt.items.add(new File([JSON.stringify(legacy)], 'legacy.json',
            { type: 'application/json' }));
        const input = document.getElementById('import-file');
        input.files = dt.files;
        importFromJSON(input);
        setTimeout(() => resolve(riskGroups.length === 1 && risks.length === 1 &&
            risks[0].id === '9.1'), 500);
    }));
    expect(ok).toBe(true);
});

test('UI v2.1 : 9 colonnes, carte retards, baseline, ICS, namespace localStorage', async ({ page }) => {
    const d = await page.evaluate(() => ({
        headers: document.querySelector('.risks-table thead tr').children.length,
        overdueCard: !!document.getElementById('dashboard-overdue'),
        baselineBtn: !!document.querySelector('button[onclick="setBaseline()"]'),
        icsOption: !!document.querySelector('option[value="ics"]'),
        icsFn: typeof exportToICS === 'function',
        nsPrefix: LS_PREFIX.startsWith('plannr:'),
        progressInputs: document.querySelectorAll('.editable-progress').length,
        dependsCells: document.querySelectorAll('.editable-depends').length
    }));
    expect(d.headers).toBe(9);
    expect(d.overdueCard).toBe(true);
    expect(d.baselineBtn).toBe(true);
    expect(d.icsOption).toBe(true);
    expect(d.icsFn).toBe(true);
    expect(d.nsPrefix).toBe(true);
    expect(d.progressInputs).toBeGreaterThan(0);
    expect(d.dependsCells).toBeGreaterThan(0);
});

test('drag Gantt : déplacer une tâche déclenche la cascade des successeurs', async ({ page }) => {
    // Scénario utilisateur : on tire la tâche 2.2 vers la droite jusqu'à ce
    // que sa fin dépasse le début de 2.3 (qui dependsOn 2.2) -> 2.3 et toute
    // la chaîne doivent se décaler automatiquement, sans que 2.2 rétrécisse.
    const before = await page.evaluate(() => ({
        span22: new Date(risks.find(r => r.id === '2.2').endDate) -
                new Date(risks.find(r => r.id === '2.2').startDate),
        start22: risks.find(r => r.id === '2.2').startDate,
        start23: risks.find(r => r.id === '2.3').startDate
    }));

    // Amener le Gantt dans le viewport puis le reconstruire : en headless,
    // le chart initial peut avoir été rendu avant le dimensionnement du canvas
    await page.evaluate(() => {
        document.getElementById('ganttChart').scrollIntoView({ block: 'center' });
        updateGantt();
    });
    await page.waitForTimeout(300);

    const pt = await page.evaluate(() => {
        // IMPORTANT : calculer le point depuis les ÉCHELLES (positions finales),
        // pas depuis meta.data[i] — pendant l'animation d'entrée du chart,
        // l'élément est encore en transit et on cliquerait à côté de la barre.
        const d = ganttChart.options.ganttData.find(g => g.task && g.task.id === '2.2');
        const xAxis = ganttChart.scales.x;
        const yAxis = ganttChart.scales.y;
        const rect = ganttChart.canvas.getBoundingClientRect();
        const x0 = xAxis.getPixelForValue(d.x[0]);
        const x1 = xAxis.getPixelForValue(d.x[1]);
        return {
            x: rect.left + (x0 + x1) / 2,
            y: rect.top + yAxis.getPixelForValue(d.y),
            pxPerDay: (x1 - x0) / Math.max(1, (d.x[1] - d.x[0]) / 86400000)
        };
    });
    expect(pt.y).toBeGreaterThan(0);
    expect(pt.pxPerDay).toBeGreaterThan(1); // garde : chart correctement dimensionné

    // Drag de ~10 jours vers la droite, Shift enfoncé (désactive le snap)
    await page.keyboard.down('Shift');
    await page.mouse.move(pt.x, pt.y);
    await page.mouse.down();
    await page.mouse.move(pt.x + pt.pxPerDay * 10, pt.y, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.up('Shift');

    const after = await page.evaluate(() => ({
        start22: risks.find(r => r.id === '2.2').startDate,
        span22: new Date(risks.find(r => r.id === '2.2').endDate) -
                new Date(risks.find(r => r.id === '2.2').startDate),
        start23: risks.find(r => r.id === '2.3').startDate,
        noViolation: risks.every(t => parseDependsOn(t).every(pid => {
            const p = risks.find(r => r.id === pid);
            return !p || t.startDate > taskEndForDeps(p);
        }))
    }));

    expect(after.start22 > before.start22).toBe(true);  // 2.2 a bougé
    expect(after.span22).toBe(before.span22);           // sans rétrécir
    expect(after.start23 > before.start23).toBe(true);  // 2.3 a cascadé
    expect(after.noViolation).toBe(true);               // 0 violation
});

test('Alt+drag : recul rigide du sous-arbre (descendance suit vers la gauche)', async ({ page }) => {
    // Comportement v2.1.2 : Alt+glisser une tâche vers la GAUCHE entraîne
    // toute sa descendance du même delta (un glisser normal vers la gauche
    // laisse volontairement les successeurs en place).
    await page.evaluate(() => {
        document.getElementById('ganttChart').scrollIntoView({ block: 'center' });
        updateGantt();
    });
    await page.waitForTimeout(300);

    const before = await page.evaluate(() => ({
        start22: risks.find(r => r.id === '2.2').startDate,
        start23: risks.find(r => r.id === '2.3').startDate,
        start31: risks.find(r => r.id === '3.1').startDate
    }));

    const pt = await page.evaluate(() => {
        const d = ganttChart.options.ganttData.find(g => g.task && g.task.id === '2.2');
        const xAxis = ganttChart.scales.x;
        const yAxis = ganttChart.scales.y;
        const rect = ganttChart.canvas.getBoundingClientRect();
        const x0 = xAxis.getPixelForValue(d.x[0]);
        const x1 = xAxis.getPixelForValue(d.x[1]);
        return {
            x: rect.left + (x0 + x1) / 2,
            y: rect.top + yAxis.getPixelForValue(d.y),
            pxPerDay: (x1 - x0) / Math.max(1, (d.x[1] - d.x[0]) / 86400000)
        };
    });

    // Alt (sous-arbre rigide) + Shift (désactive le snap), ~8 jours à gauche
    await page.keyboard.down('Shift');
    await page.keyboard.down('Alt');
    await page.mouse.move(pt.x, pt.y);
    await page.mouse.down();
    await page.mouse.move(pt.x - pt.pxPerDay * 8, pt.y, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Alt');
    await page.keyboard.up('Shift');

    const after = await page.evaluate(() => ({
        start22: risks.find(r => r.id === '2.2').startDate,
        start23: risks.find(r => r.id === '2.3').startDate,
        start31: risks.find(r => r.id === '3.1').startDate,
        noViolation: risks.every(t => parseDependsOn(t).every(pid => {
            const p = risks.find(r => r.id === pid);
            return !p || t.startDate > taskEndForDeps(p);
        }))
    }));

    expect(after.start22 < before.start22).toBe(true); // la tâche a reculé
    expect(after.start23 < before.start23).toBe(true); // sa descendance directe aussi
    expect(after.start31 < before.start31).toBe(true); // et la descendance transitive
    expect(after.noViolation).toBe(true);              // 0 violation résiduelle
});

test('infobulle : contenu de la tâche survolée, jamais posée sur sa barre', async ({ page }) => {
    await page.evaluate(() => {
        document.getElementById('ganttChart').scrollIntoView({ block: 'center' });
        updateGantt();
    });
    await page.waitForTimeout(1200); // fin de l'animation d'entrée

    // 2.3 (centre — cas du bug : affichait 2.2) et 4.2 (proche coin bas-droit)
    for (const taskId of ['2.3', '4.2']) {
        const pt = await page.evaluate((id) => {
            const d = ganttChart.options.ganttData.find(g => g.task && g.task.id === id);
            const x = ganttChart.scales.x, y = ganttChart.scales.y;
            const rect = ganttChart.canvas.getBoundingClientRect();
            const x0 = x.getPixelForValue(d.x[0]), x1 = x.getPixelForValue(d.x[1]);
            return { px: rect.left + (x0 + x1) / 2,
                     py: rect.top + y.getPixelForValue(d.y),
                     bar: { x0, x1, yc: y.getPixelForValue(d.y) } };
        }, taskId);
        await page.mouse.move(pt.px, pt.py);
        await page.waitForTimeout(450);
        const tt = await page.evaluate(() => {
            const t = ganttChart.tooltip;
            return { opacity: t.opacity, x: t.x, y: t.y, w: t.width, h: t.height,
                     shownId: t.dataPoints && t.dataPoints[0] ? t.dataPoints[0].raw.task.id : null };
        });
        expect(tt.opacity).toBeGreaterThan(0);
        expect(tt.shownId).toBe(taskId); // régression : index décalé par les jalons
        const barTop = pt.bar.yc - 17.5, barBot = pt.bar.yc + 17.5;
        const overlaps = !(tt.x + tt.w < pt.bar.x0 || tt.x > pt.bar.x1 ||
                           tt.y + tt.h < barTop || tt.y > barBot);
        expect(overlaps).toBe(false); // l'infobulle ne recouvre pas la barre
    }
});

test('mode consolidé : pas de bouton + sur les barres, drag fonctionnel', async ({ page }) => {
    // Régressions couvertes : (1) l'affordance « + jalon » apparaissait SUR
    // les barres en consolidé/compact et volait le clic ; (2) les listeners
    // s'empilaient à chaque updateGantt et, après changement de vue, l'ancien
    // closure committait le drag sur la mauvaise tâche.
    await page.evaluate(() => {
        document.getElementById('ganttChart').scrollIntoView({ block: 'center' });
        setGanttView('consolide');
    });
    await page.waitForTimeout(1300);

    const pt = await page.evaluate(() => {
        const gd = ganttChart.options.ganttData;
        const i = gd.findIndex(g => g.task && g.task.id === '2.1');
        const x = ganttChart.scales.x, y = ganttChart.scales.y;
        const rect = ganttChart.canvas.getBoundingClientRect();
        const x0 = x.getPixelForValue(gd[i].x[0]), x1 = x.getPixelForValue(gd[i].x[1]);
        return { x: rect.left + (x0 + x1) / 2,
                 y: rect.top + y.getPixelForValue(gd[i].y),
                 pxPerDay: (x1 - x0) / Math.max(1, (gd[i].x[1] - gd[i].x[0]) / 86400000) };
    });

    // 1. souris sur la barre -> aucune affordance « + »
    await page.mouse.move(pt.x, pt.y);
    await page.waitForTimeout(400);
    const plusVisible = await page.evaluate(() => {
        const o = document.getElementById('gantt-separator-overlay');
        return !!o && o.children.length > 0 && o.style.display !== 'none';
    });
    expect(plusVisible).toBe(false);

    // 2. drag de la barre en consolidé -> la BONNE tâche bouge, et elle seule
    const before = await page.evaluate(() =>
        Object.fromEntries(risks.map(r => [r.id, r.startDate])));
    await page.keyboard.down('Shift');
    await page.mouse.down();
    await page.mouse.move(pt.x + pt.pxPerDay * 6, pt.y, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() =>
        Object.fromEntries(risks.map(r => [r.id, r.startDate])));
    expect(after['2.1'] > before['2.1']).toBe(true);
    const moved = Object.keys(after).filter(id => after[id] !== before[id]);
    expect(moved).toEqual(['2.1']);
});

test('avancement : édition du % met à jour la progression pondérée', async ({ page }) => {
    const before = await page.evaluate(() =>
        document.getElementById('dashboard-progression').textContent);
    await page.evaluate(() => {
        // Cibler une tâche NON terminée : sur une tâche "Terminé",
        // effectiveProgress retourne 100 quel que soit le champ (voulu)
        const notDone = risks.find(r => !r.isMilestone && !isTaskDone(r));
        const input = document.querySelector(
            `.editable-progress[data-risk-id="${notDone.id}"]`);
        input.value = String((effectiveProgress(notDone) + 50) % 100);
        input.dispatchEvent(new Event('change'));
    });
    const after = await page.evaluate(() =>
        document.getElementById('dashboard-progression').textContent);
    expect(after).not.toBe(before);
});
