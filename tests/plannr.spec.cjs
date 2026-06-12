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
            canon.version === '2.2' && !!canon.phases && !('riskGroups' in canon) &&
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

test('neutralisation grisée : toggles week-ends/fériés indépendants, métier intact', async ({ page }) => {
    await page.evaluate(() => {
        document.getElementById('ganttChart').scrollIntoView({ block: 'center' });
        updateGantt();
    });
    await page.waitForTimeout(1300);

    const sample = (ds) => page.evaluate((dateStr) => {
        const x = ganttChart.scales.x, y = ganttChart.scales.y;
        const ctx = ganttChart.canvas.getContext('2d');
        const t0 = new Date(dateStr).getTime();
        const px = Math.round((x.getPixelForValue(t0) + x.getPixelForValue(t0 + 86400000)) / 2);
        const yP = Math.round((y.top + y.bottom) * 0.93);
        return ctx.getImageData(px, yP, 1, 1).data[3] > 0; // alpha = bande présente
    }, ds);
    const duration22 = () => page.evaluate(() => risks.find(r => r.id === '2.2').duration);

    // état initial : samedi ET 14 juillet grisés
    expect(await sample('2026-06-13')).toBe(true);
    expect(await sample('2026-07-14')).toBe(true);
    const durBefore = await duration22();

    // décocher week-ends : le samedi disparaît, le férié reste
    await page.evaluate(() => document.getElementById('toggle-shade-weekends').click());
    await page.waitForTimeout(250);
    expect(await sample('2026-06-13')).toBe(false);
    expect(await sample('2026-07-14')).toBe(true);
    expect(await duration22()).toBe(durBefore); // durées MÉTIER inchangées

    // décocher fériés : plus aucune bande
    await page.evaluate(() => document.getElementById('toggle-shade-holidays').click());
    await page.waitForTimeout(250);
    expect(await sample('2026-07-14')).toBe(false);

    // persistance après rechargement
    await page.reload();
    await page.waitForSelector('#ganttChart');
    await page.waitForTimeout(600);
    const persisted = await page.evaluate(() => ({
        w: document.getElementById('toggle-shade-weekends').checked,
        h: document.getElementById('toggle-shade-holidays').checked
    }));
    expect(persisted).toEqual({ w: false, h: false });
});

test('v2.2 FR-1 : anomalies d\'import visibles dans le bandeau', async ({ page }) => {
    await page.evaluate(() => new Promise(resolve => {
        const bad = {
            version: '2.2',
            phases: [{ id: 9, name: 'Test', description: '', color: '#333333', tasks: [
                { id: '9.1', title: 'A', startDate: '2026-10-01', endDate: '2026-10-05', statut: 'A faire' },
                { id: '9.1', title: 'A doublon', startDate: '2026-10-02', endDate: '2026-10-06', statut: 'A faire' },
                { id: '9.2', title: 'B', startDate: '2026-10-06', endDate: '2026-10-10', statut: 'A faire',
                  dependsOn: ['7.7'], link: 'javascript:alert(1)' }
            ]}]
        };
        const dt = new DataTransfer();
        dt.items.add(new File([JSON.stringify(bad)], 'bad.json', { type: 'application/json' }));
        const input = document.getElementById('import-file');
        input.files = dt.files;
        importFromJSON(input);
        setTimeout(resolve, 500);
    }));
    const banner = await page.evaluate(() =>
        document.getElementById('plannr-banner').textContent);
    expect(banner).toContain('double');
    expect(banner).toContain('inconnues');
    expect(banner).toContain('lien non http');
    // le lien javascript: a été purgé (NFR-2)
    const linkPurged = await page.evaluate(() => !risks.find(r => r.id === '9.2').link);
    expect(linkPurged).toBe(true);
});

test('v2.2 FR-3 : butoir dépassée — bandeau, badge, données démo', async ({ page }) => {
    const d = await page.evaluate(() => ({
        exceeded43: isDeadlineExceeded(risks.find(r => r.id === '4.3')),
        ok31: !isDeadlineExceeded(risks.find(r => r.id === '3.1')),
        badgeExceeded: !!document.querySelector('.deadline-badge.exceeded'),
        banner: document.getElementById('plannr-banner').textContent
    }));
    expect(d.exceeded43).toBe(true);
    expect(d.ok31).toBe(true);
    expect(d.badgeExceeded).toBe(true);
    expect(d.banner).toContain('butoir');
});

test('v2.2 FR-5 : fenêtre temporelle — zoom, pan, retour Tout, persistance', async ({ page }) => {
    const r = await page.evaluate(async () => {
        setGanttZoom(30);
        await new Promise(res => setTimeout(res, 250));
        const span30 = (ganttChart.scales.x.max - ganttChart.scales.x.min) / 86400000;
        const minBefore = ganttChart.scales.x.min;
        ganttPan(1);
        await new Promise(res => setTimeout(res, 250));
        const panDays = (ganttChart.scales.x.min - minBefore) / 86400000;
        return { span30: Math.round(span30), panDays: Math.round(panDays) };
    });
    expect(r.span30).toBe(30);
    expect(r.panDays).toBe(15);
    // persistance : rechargement -> fenêtre 30 j restaurée
    await page.reload();
    await page.waitForSelector('#ganttChart');
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({
        span: Math.round((ganttChart.scales.x.max - ganttChart.scales.x.min) / 86400000),
        activeBtn: document.querySelector('.zoom-btn.active')?.dataset.span
    }));
    expect(after.span).toBe(30);
    expect(after.activeBtn).toBe('30');
    await page.evaluate(() => setGanttZoom(null)); // reset pour les tests suivants
});

test('v2.2 FR-6 : charge par responsable avec détection de chevauchement', async ({ page }) => {
    const wl = await page.evaluate(() =>
        document.getElementById('workload-content').textContent);
    expect(wl).toContain('Alice');
    expect(wl).toContain('Diana');
    expect(wl).toContain('∥'); // conflit 2.1 ∥ 2.2 (Diana) présent dans la démo
    expect(wl).toContain('j ouvrés');
});

test('v2.2 FR-7 : lag de dépendance en jours ouvrés (id+N)', async ({ page }) => {
    const r = await page.evaluate(() => {
        const t23 = risks.find(rk => rk.id === '2.3');
        const before = t23.startDate;
        t23.dependsOn = ['2.2+5'];
        applyDependencyCascade({ silent: true });
        return { before, after: t23.startDate,
                 expected: addWorkingDays('2026-06-25', 6),
                 critical: _criticalIds.size > 1 };
    });
    expect(r.after).toBe(r.expected);
    expect(r.after > r.before).toBe(true);
});

test('v2.2 FR-10 : journal des changements entre chargements', async ({ page }) => {
    // Simuler un snapshot précédent différent puis recharger
    await page.evaluate(() => {
        const snap = JSON.parse(appStorage.getItem('plannr-data-snapshot'));
        snap['1.1'].s = '2026-03-15';        // date différente
        snap['x.9'] = { s: '2026-01-01', e: '2026-01-02', t: 'Tâche disparue' };
        delete snap['4.3'];                   // 4.3 paraîtra "ajoutée"
        appStorage.setItem('plannr-data-snapshot', JSON.stringify(snap));
    });
    await page.reload();
    await page.waitForSelector('#ganttChart');
    await page.waitForTimeout(800);
    const banner = await page.evaluate(() =>
        document.getElementById('plannr-banner').textContent);
    expect(banner).toContain('Changements depuis le dernier chargement');
    expect(banner).toContain('4.3');                    // ajoutée
    expect(banner).toContain('x.9');                    // supprimée
    expect(banner).toContain('dates modifiées');        // 1.1
});

test('v2.2 FR-11 : samedi ouvré — durées métier recalculées', async ({ page }) => {
    const r = await page.evaluate(async () => {
        const before = risks.find(rk => rk.id === '2.2').duration;
        toggleSaturdayWorked(true);
        await new Promise(res => setTimeout(res, 250));
        const after = risks.find(rk => rk.id === '2.2').duration;
        toggleSaturdayWorked(false);
        await new Promise(res => setTimeout(res, 250));
        const restored = risks.find(rk => rk.id === '2.2').duration;
        return { before, after, restored };
    });
    expect(r.before).toBe(19);  // 01-25/06 hors samedis et dimanches
    expect(r.after).toBe(22);   // + les 3 samedis de la période
    expect(r.restored).toBe(19);
});

test('v2.2 FR-12 : clic sans déplacement sur une barre = flash de la ligne', async ({ page }) => {
    await page.evaluate(() => {
        document.getElementById('ganttChart').scrollIntoView({ block: 'center' });
        updateGantt();
    });
    await page.waitForTimeout(1200);
    const pt = await page.evaluate(() => {
        const d = ganttChart.options.ganttData.find(g => g.task && g.task.id === '2.1');
        const x = ganttChart.scales.x, y = ganttChart.scales.y;
        const rect = ganttChart.canvas.getBoundingClientRect();
        return { x: rect.left + (x.getPixelForValue(d.x[0]) + x.getPixelForValue(d.x[1])) / 2,
                 y: rect.top + y.getPixelForValue(d.y) };
    });
    const before = await page.evaluate(() => risks.find(r => r.id === '2.1').startDate);
    await page.mouse.move(pt.x, pt.y);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({
        flashed: !!document.querySelector('tr.row-flash'),
        start: risks.find(rk => rk.id === '2.1').startDate
    }));
    expect(r.flashed).toBe(true);
    expect(r.start).toBe(before); // aucune date modifiée par un simple clic
});

test('v2.3 : sélecteur de dépendances — anti-cycle, lag, commit, Échap', async ({ page }) => {
    await page.click('.editable-depends[data-risk-id="2.3"]');
    await page.waitForSelector('.depends-popover');
    const state = await page.evaluate(() => {
        const pop = document.querySelector('.depends-popover');
        return {
            checked22: pop.querySelector('input[data-id="2.2"]').checked,
            no31checkbox: !pop.querySelector('input[data-id="3.1"]'), // descendante -> grisée
            disabledHasCycle: Array.from(pop.querySelectorAll('.dp-disabled'))
                .some(r => r.textContent.includes('cycle')),
            selfDisabled: Array.from(pop.querySelectorAll('.dp-disabled'))
                .some(r => r.textContent.includes('2.3'))
        };
    });
    expect(state.checked22).toBe(true);
    expect(state.no31checkbox).toBe(true);
    expect(state.disabledHasCycle).toBe(true);
    expect(state.selfDisabled).toBe(true);

    // décocher 2.2, cocher 1.1 avec lag 2, valider
    await page.evaluate(() => {
        const pop = document.querySelector('.depends-popover');
        pop.querySelector('input[data-id="2.2"]').click();
        pop.querySelector('input[data-id="1.1"]').click();
        pop.querySelector('input[data-id="1.1"]').closest('.dp-row')
            .querySelector('.dp-lag-input').value = '2';
    });
    await page.click('.depends-popover .dp-ok');
    await page.waitForTimeout(400);
    const committed = await page.evaluate(() => ({
        deps: risks.find(r => r.id === '2.3').dependsOn,
        cell: document.querySelector('.editable-depends[data-risk-id="2.3"]')
            .textContent.trim()
    }));
    expect(committed.deps).toEqual(['1.1+2']);
    expect(committed.cell).toContain('1.1+2');

    // Échap = annulation pure
    await page.click('.editable-depends[data-risk-id="2.2"]');
    await page.waitForSelector('.depends-popover');
    await page.evaluate(() => {
        document.querySelector('.depends-popover input[data-id="1.0"]').click();
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const cancelled = await page.evaluate(() => ({
        deps22: risks.find(r => r.id === '2.2').dependsOn || null,
        gone: !document.querySelector('.depends-popover')
    }));
    expect(cancelled.deps22).toBe(null);
    expect(cancelled.gone).toBe(true);
});

test('v2.3 : pastille de connexion — drag crée la dépendance, cascade immédiate', async ({ page }) => {
    await page.evaluate(() => {
        document.getElementById('ganttChart').scrollIntoView({ block: 'center' });
        updateGantt();
    });
    await page.waitForTimeout(1200);
    const pts = await page.evaluate(() => {
        const rect = ganttChart.canvas.getBoundingClientRect();
        const geo = _ganttBarGeometry(ganttChart);
        const src = geo.find(b => b.id === '2.1');
        const dst = geo.find(b => b.id === '2.2');
        return { dot: { x: rect.left + src.x1 + 14, y: rect.top + src.y },
                 target: { x: rect.left + (dst.x0 + dst.x1) / 2, y: rect.top + dst.y } };
    });
    await page.mouse.move(pts.dot.x, pts.dot.y);
    await page.mouse.down();
    await page.mouse.move(pts.target.x, pts.target.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({
        deps22: risks.find(t => t.id === '2.2').dependsOn,
        start22: risks.find(t => t.id === '2.2').startDate,
        expected: addWorkingDays(risks.find(t => t.id === '2.1').endDate, 1),
        noViolation: risks.every(t => parseDependsOn(t).every(pid => {
            const p = risks.find(rk => rk.id === pid);
            return !p || t.startDate > taskEndForDeps(p);
        }))
    }));
    expect(r.deps22).toContain('2.1');
    expect(r.start22).toBe(r.expected);
    expect(r.noViolation).toBe(true);
});

test('v2.3 : liaison refusée si elle créerait un cycle', async ({ page }) => {
    await page.evaluate(() => {
        document.getElementById('ganttChart').scrollIntoView({ block: 'center' });
        updateGantt();
    });
    await page.waitForTimeout(1200);
    // 2.2 est un ancêtre de 2.3 (2.3 dependsOn 2.2) : tirer 2.3 -> 2.2 = cycle
    const pts = await page.evaluate(() => {
        const rect = ganttChart.canvas.getBoundingClientRect();
        const geo = _ganttBarGeometry(ganttChart);
        const src = geo.find(b => b.id === '2.3');
        const dst = geo.find(b => b.id === '2.2');
        return { dot: { x: rect.left + src.x1 + 14, y: rect.top + src.y },
                 target: { x: rect.left + (dst.x0 + dst.x1) / 2, y: rect.top + dst.y },
                 depsBefore: JSON.stringify(risks.find(t => t.id === '2.2').dependsOn || null) };
    });
    await page.mouse.move(pts.dot.x, pts.dot.y);
    await page.mouse.down();
    await page.mouse.move(pts.target.x, pts.target.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() =>
        JSON.stringify(risks.find(t => t.id === '2.2').dependsOn || null));
    expect(after).toBe(pts.depsBefore); // données inchangées
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
