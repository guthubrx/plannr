// Exports complets : filtres réservés à la lecture interactive.
function exportToHTML() {
    commitDocument();
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('script[src^="plannr-data"], #embedded-document, #embedded-loader').forEach(el => el.remove());
    clone.querySelector('#planning-container').innerHTML = '';
    clone.querySelector('#task-panel').removeAttribute('open');
    clone.querySelectorAll('[data-editing-initialized], [data-listener-initialized]').forEach(el => {
        el.removeAttribute('data-editing-initialized'); el.removeAttribute('data-listener-initialized');
    });
    const payload = document.createElement('script'); payload.id = 'embedded-document'; payload.type = 'application/json';
    payload.textContent = JSON.stringify(buildCanonicalData()).replace(/</g, '\\u003c');
    const loader = document.createElement('script'); loader.id = 'embedded-loader';
    loader.textContent = 'window.PLANNR_EMBEDDED_DATA = JSON.parse(document.getElementById("embedded-document").textContent);';
    clone.querySelector('head').prepend(payload, loader);
    downloadTextFile('<!doctype html>\n' + clone.outerHTML, 'plannr-autonome.html', 'text/html');
}
function exportToPDF() {
    commitDocument();
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({orientation: 'landscape', unit: 'mm', format: 'a3'});
    const oldFilters = planningFilters, oldZoom = ganttZoomSpanDays, oldAnchor = ganttZoomAnchorMs;
    let chartCanvas;
    try {
        planningFilters = {query:'',phase:'',person:'',status:'',overdue:false};
        ganttZoomSpanDays = null; ganttExportWidth = 1120; updateGantt();
        chartCanvas = document.getElementById('ganttChart');
        const scale = 388 / chartCanvas.width;
        const sliceHeight = Math.floor(225 / scale);
        const ratio = chartCanvas.width / ganttChart.width;
        const boundaries = [...new Set(ganttChart.options.readableRows.map(row => Math.ceil(ganttChart.scales.y.getPixelForValue(row.bottom - 4) * ratio)))].sort((a,b)=>a-b);
        for (let offset = 0, page = 1; offset < chartCanvas.height; page++) {
            const limit = Math.min(chartCanvas.height, offset + sliceHeight);
            const candidates = boundaries.filter(y => y > offset && y <= limit);
            const end = limit === chartCanvas.height ? limit : (candidates.at(-1) || limit);
            if (offset) doc.addPage();
            doc.setFontSize(16); doc.text(doc.splitTextToSize(document.getElementById('main-title').textContent, 350).slice(0,2), 16, 16);
            doc.setFontSize(10); doc.text('Gantt · ' + ganttViewMode + ' · ' + page, 16, 35);
            const slice = document.createElement('canvas'); slice.width = chartCanvas.width; slice.height = end - offset;
            const ctx = slice.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0,0,slice.width,slice.height); ctx.drawImage(chartCanvas,0,offset,slice.width,slice.height,0,0,slice.width,slice.height);
            doc.addImage(slice.toDataURL('image/png'), 'PNG', 16, 44, 388, slice.height * scale);
            offset = end;
        }
    } finally {
        planningFilters = oldFilters; ganttZoomSpanDays = oldZoom; ganttZoomAnchorMs = oldAnchor; ganttExportWidth = null; updateGantt();
    }
    doc.addPage();
    const rows = riskGroups.flatMap(group => group.tasks.map(task => [group.name, task.id, task.title, task.startDate, task.endDate || task.startDate, task.duration, getStatusOptions().find(s => s.value === task.statut)?.label || task.statut || '', task.assignedTo || '', task.effortDays ?? '—', task.notes || '']));
    doc.autoTable({startY: 18, margin: 16, head: [['Phase','#','Tâche','Début','Fin','J ouvrés','Statut','Responsables','Effort','Notes']], body: rows, styles:{fontSize:9,cellPadding:3,overflow:'linebreak'}, headStyles:{fillColor:[36,91,121]}, columnStyles:{0:{cellWidth:40},1:{cellWidth:16},2:{cellWidth:76},3:{cellWidth:25},4:{cellWidth:25},5:{cellWidth:20},6:{cellWidth:26},7:{cellWidth:38},8:{cellWidth:20},9:{cellWidth:62}}, rowPageBreak:'avoid'});
    doc.addPage();
    doc.autoTable({startY:18,margin:16,head:[['ID','Responsable','Reste à faire','Début réel','Fin réelle','Décision / critères / blocage']],body:risks.map(task=>[task.id,deliveryOwner(task),remainingEffort(task) ?? 'Inconnu',task.actualStartDate||'—',task.actualEndDate||'—',[task.blockerReason,task.decisionOwner,task.decision?uiText(task.decision):null,task.acceptanceCriteria,task.decisionDate,task.allocationShares?Object.entries(task.allocationShares).map(([name,share])=>name+' '+Math.round(share*10000)/100+' %').join(', '):null].filter(Boolean).join(' · ')]),styles:{fontSize:10,cellPadding:3,overflow:'linebreak'},rowPageBreak:'avoid'});
    if(projectResources.length) {doc.addPage();doc.autoTable({head:[['Personne','Capacité projet','Absences']],body:projectResources.map(r=>[r.name,r.capacity*100+'%',r.absences.join(', ')]),styles:{fontSize:10,cellPadding:3,overflow:'linebreak'}});}
    doc.save('plannr-' + todayISO() + '.pdf');
}
function exportRows(group) {
    return group.tasks.map(task => [task.id, task.title, task.startDate, task.endDate || task.startDate, task.duration, task.progress ?? effectiveProgress(task), task.statut || '', task.assignedTo || task.responsable || '', task.effortDays ?? '', (task.dependsOn || []).join(', '), task.deadline || '', task.notes || '', task.link || '', deliveryOwner(task), task.remainingEffortDays ?? '', task.actualStartDate || '', task.actualEndDate || '', task.blockerReason || '', task.allocationShares ? JSON.stringify(task.allocationShares) : '', task.decisionOwner || '', task.acceptanceCriteria || '', task.decision || '', task.decisionDate || '']);
}
function exportHeaders() { return ['ID','Tâche','Début','Fin','Durée ouvrée','Avancement (%)','Statut','Responsables','Effort (j-personnes)','Dépendances','Butoir','Notes','Lien','Responsable de livraison','Reste à faire (j-personnes)','Début réel','Fin réelle','Blocage','Répartition','Valideur','Critères d’acceptation','Décision','Date de décision']; }
function exportToExcel() {
    const wb = XLSX.utils.book_new();
    riskGroups.forEach(group => {
        const ws = XLSX.utils.aoa_to_sheet([exportHeaders(), ...exportRows(group)]);
        ws['!cols'] = [10,60,14,14,14,14,22,30,20,25,14,70,45,30,20,14,14,40,40,30,60,20,14].map(wch=>({wch}));
        XLSX.utils.book_append_sheet(wb, ws, (group.id + ' ' + group.name).replace(/[\\/?:*\[\]]/g,'').slice(0,31));
    });
    if (!wb.SheetNames.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([exportHeaders()]), 'Planning');
    if(projectResources.length){const ws=XLSX.utils.aoa_to_sheet([['Personne','Capacité (%)','Absences'],...projectResources.map(r=>[r.name,r.capacity*100,r.absences.join(', ')])]);ws['!cols']=[{wch:30},{wch:16},{wch:65}];XLSX.utils.book_append_sheet(wb,ws,'Disponibilités');}
    XLSX.writeFile(wb,'plannr-' + todayISO() + '.xlsx');
}
function exportToCSV() {
    const cell = value => '"' + String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g,'""') + '"';
    const rows = [['Phase',...exportHeaders()],...riskGroups.flatMap(group=>exportRows(group).map(row=>[group.name,...row]))];
    downloadTextFile('\uFEFF' + rows.map(row=>row.map(cell).join(';')).join('\r\n'),'plannr-' + todayISO() + '.csv','text/csv;charset=utf-8');
}
