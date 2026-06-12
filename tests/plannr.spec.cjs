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
