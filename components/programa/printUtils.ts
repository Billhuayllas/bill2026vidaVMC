
export const handleOpenPrintPreview = (programs: any[], start: string, end: string, selectedWeek: string, currentData: any, settings: any) => {
    if (!start || !end) { alert('Por favor seleccione un rango de fechas válido'); return; }
    const weeks = programs.map(p => p.week_id).sort().filter(w => w >= start && w <= end);
    if (weeks.length === 0) { alert('No hay programas en el rango seleccionado'); return; }
    
    // Use currentData for the selected week to ensure unsaved changes are previewed
    const programsToPrint = weeks.map(week => ({ 
        data: week === selectedWeek ? currentData : programs.find(p => p.week_id === week)?.data, 
        week_id: week 
    }));
    
    const html = buildPrintableHTML(programsToPrint, settings);
    const printWindow = window.open('', '_blank');
    if (printWindow) { 
        printWindow.document.open(); 
        printWindow.document.write(html); 
        printWindow.document.close(); 
    } 
    else { alert("Por favor, permita las ventanas emergentes para esta página."); }
};

export const buildPrintableHTML = (programs: any[], settings?: { main: boolean; aux2: boolean; aux3: boolean }) => {
    const safe = (v: any) => (v == null ? '' : String(v));
    const formatPair = (str: string | null | undefined): string => {
        if (!str) return '';
        const parts = str.split('/').map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) {
            return `${parts[0]} /<br>${parts[1]}`;
        }
        return parts[0] || '';
    };

    const activeRooms = [];
    // Standard Order for Print: Aux 3, Aux 2, Main (Usually Main is last column)
    if (settings?.aux3 ?? true) activeRooms.push({ key: 'aux3', label: 'Sala Auxiliar N°3' });
    if (settings?.aux2 ?? true) activeRooms.push({ key: 'aux2', label: 'Sala Auxiliar N°2' });
    if (settings?.main ?? true) activeRooms.push({ key: 'principal', label: 'Auditorio Principal', mapKey: 'main' }); 

    const colCount = activeRooms.length; 
    // Logic to size columns dynamically
    // If 3 rooms: Parte ~38%, Rooms ~20.6%
    // If 2 rooms: Parte ~40%, Rooms ~30%
    // If 1 room: Parte ~50%, Room ~50%
    const colParteWidth = colCount === 3 ? 38 : (colCount === 2 ? 40 : 50);
    const colRoomWidth = (100 - colParteWidth) / colCount;

    const pages: any[][] = [];
    for (let i = 0; i < programs.length; i += 2) {
        pages.push(programs.slice(i, i + 2));
    }

    const pagesHTML = pages.map((pagePrograms, pageIdx) => {
        const pageContentHTML = pagePrograms.map((program, idx) => {
            const data = program.data || {};
            const title = safe(data.titulo) || `Programa ${program.week_id || ''}`;
            const canciones = data.canciones || {};
            const watermarkText = data.watermark ?? 'PRELIMINAR';
            const isBlurred = data.isBlurred ?? false;

            return `
                <div class="printable-program ${isBlurred ? 'blurred' : ''}" data-watermark="${watermarkText}">
                    <table class="print-table">
                        <colgroup>
                            <col style="width: ${colParteWidth}%" class="col-parte">
                            ${activeRooms.map((_, i) => `<col style="width: ${colRoomWidth}%" class="col-sala${i+1}">`).join('')}
                        </colgroup>
                        <thead>
                            <tr><th colspan="${colCount + 1}" class="print-header-date">${title}</th></tr>
                            <tr class="room-headers">
                                <th></th>
                                ${activeRooms.map(r => `<th>${r.label}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="part-label"><strong>Presidente:</strong></td>
                                ${activeRooms.map(r => `<td class="participante">${safe(data.presidentes?.[r.key])}</td>`).join('')}
                            </tr>
                            <tr>
                                <td class="part-label"><strong>Oración de Inicio:</strong></td>
                                ${activeRooms.map((r, i) => {
                                    // Oracion only in last room (Main) usually
                                    const isMain = r.key === 'principal';
                                    return isMain ? `<td class="participante">${safe(data.oracion?.inicio)}</td>` : `<td></td>`;
                                }).join('')}
                            </tr>
                            <tr class="item-row"><td colspan="${colCount + 1}" class="part-label">• <b>${safe(canciones.inicio)}</b></td></tr>
                            <tr class="item-row"><td colspan="${colCount + 1}" class="part-label">• Palabras de introducción (1 min.)</td></tr>
                            
                            <tr class="section tesoros"><td colspan="${colCount + 1}">TESOROS DE LA BIBLIA</td></tr>
                            
                            <tr>
                                <td class="part-label">${safe(data.tesoros?.p1?.title)}</td>
                                ${activeRooms.map(r => {
                                    const isMain = r.key === 'principal';
                                    return isMain ? `<td class="participante">${safe(data.tesoros?.p1?.main)}</td>` : `<td></td>`;
                                }).join('')}
                            </tr>
                            <tr>
                                <td class="part-label">${safe(data.tesoros?.p2?.title)}</td>
                                ${activeRooms.map(r => {
                                    const isMain = r.key === 'principal';
                                    return isMain ? `<td class="participante">${safe(data.tesoros?.p2?.main)}</td>` : `<td></td>`;
                                }).join('')}
                            </tr>
                            <tr>
                                <td class="part-label">${safe(data.tesoros?.p3?.title) || '3. Lectura de la Biblia (3 min.)'}</td>
                                ${activeRooms.map(r => {
                                    const key = r.key === 'principal' ? 'main' : r.key;
                                    return `<td class="participante">${safe(data.tesoros?.p3?.[key])}</td>`;
                                }).join('')}
                            </tr>
                            
                            <tr class="section maestros"><td colspan="${colCount + 1}">SEAMOS MEJORES MAESTROS</td></tr>
                            ${(data.maestros || []).map((m: any) => `
                                <tr>
                                    <td class="part-label">${safe(m.title)}</td>
                                    ${activeRooms.map(r => {
                                        const key = r.key === 'principal' ? 'main' : r.key;
                                        return `<td class="participante">${formatPair(m[key])}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                            
                            <tr class="section vida-cristiana"><td colspan="${colCount + 1}">NUESTRA VIDA CRISTIANA</td></tr>
                            <tr class="item-row"><td colspan="${colCount + 1}" class="part-label">• <b>${safe(canciones.vidaCristiana)}</b></td></tr>
                            ${(data.vidaCristiana || []).map((v: any) => {
                                let participantDetail = safe(v.hasOwnProperty('conductor') ? v.conductor : v.discursante);
                                if (v.hasOwnProperty('conductor') && v.lector) participantDetail += `<br>Lector: ${safe(v.lector)}`;
                                
                                return `<tr>
                                    <td class="part-label">• ${safe(v.titulo)}</td>
                                    ${activeRooms.map(r => {
                                        const isMain = r.key === 'principal';
                                        return isMain ? `<td class="participante">${participantDetail}</td>` : `<td></td>`;
                                    }).join('')}
                                </tr>`;
                            }).join('')}
                            <tr class="item-row"><td colspan="${colCount + 1}" class="part-label">• Palabras de conclusión (3 mins.)</td></tr>
                            <tr class="item-row"><td colspan="${colCount + 1}" class="part-label">• <b>${safe(canciones.final)}</b></td></tr>
                            <tr>
                                <td class="part-label"><strong>Oración Final:</strong></td>
                                ${activeRooms.map(r => {
                                    const isMain = r.key === 'principal';
                                    return isMain ? `<td class="participante">${safe(data.oracion?.final)}</td>` : `<td></td>`;
                                }).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
                ${idx === 0 && pagePrograms.length > 1 ? '<div class="program-separator"></div>' : ''}
            `;
        }).join('');
        return `<div class="print-page">${pageContentHTML}</div>`;
    }).join('');

    const styles = `
        <style>
            @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
            :root {
              --table-width: 100%;
              --width-tema: ${colParteWidth}%;
              --width-sala1: ${colRoomWidth}%;
              --width-sala2: ${colRoomWidth}%;
              --width-sala3: ${colRoomWidth}%;
            }
            .col-parte { width: var(--width-tema); min-width: 192px; text-align: left !important; }
            .col-sala1 { width: var(--width-sala1); }
            .col-sala2 { width: var(--width-sala2); }
            .col-sala3 { width: var(--width-sala3); }

            @media print { 
                @page { size: A4 portrait; margin: 0; } 
                html, body { margin: 0; padding: 0; background: #fff !important; min-width: 100% !important; }
                body { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; } 
                .no-print { display: none !important; }
                #print-container { width: 100% !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
                .print-page { 
                    page-break-after: always; 
                    width: 210mm !important; 
                    max-width: 210mm !important;
                    min-height: 297mm !important; 
                    height: 297mm !important; 
                    padding: 8mm !important; 
                    box-sizing: border-box !important; 
                    box-shadow: none !important; 
                    margin: 0 auto !important; 
                }
                .print-page:last-child { page-break-after: auto !important; }
                .print-table { width: 100% !important; table-layout: fixed; }
                .printable-program.blurred::before { display: none; }
            }
            body { font-family: "Segoe UI", "Arial", sans-serif; margin: 0; padding: 0; color: #000; background-color: #f1f5f9; }
            
            /* Action Bar */
            .print-actions {
                position: sticky;
                top: 0;
                z-index: 1000;
                background-color: #ffffff;
                padding: 10px 15px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                gap: 10px;
                justify-content: center;
                align-items: center;
                flex-wrap: wrap;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }

            .action-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 600;
                font-size: 0.85rem;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
                color: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .action-btn:active { transform: translateY(1px); }

            .btn-print { background-color: #2563eb; } 
            .btn-print:hover { background-color: #1d4ed8; }

            .btn-pdf { background-color: #059669; } 
            .btn-pdf:hover { background-color: #047857; }

            .btn-share { background-color: #10b981; } 
            .btn-share:hover { background-color: #059669; }

            .btn-png { background-color: #8b5cf6; } 
            .btn-png:hover { background-color: #7c3aed; }

            .btn-close { background-color: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
            .btn-close:hover { background-color: #e5e7eb; }

            .toggle-label {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.85rem;
                font-weight: 600;
                color: #475569;
                user-select: none;
            }
            .toggle-label:hover { background-color: #f1f5f9; }
            .toggle-label input[type="checkbox"] { accent-color: #2563eb; }

            .controls-divider { width: 1px; height: 24px; background: #e2e8f0; margin: 0 4px; }

            /* Content */
            #print-container { width: 210mm; margin: 20px auto; background-color: transparent; display: flex; flex-direction: column; gap: 20px; box-sizing: border-box; }
            .print-page { width: 210mm; min-height: 297mm; height: 297mm; padding: 8mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-start; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 0 auto; overflow: hidden; page-break-after: always; }
            
            .printable-program { height: 137mm; max-height: 137mm; font-size: 9pt; overflow: hidden; display: flex; flex-direction: column; position: relative; background: #fff; }
            .program-separator { height: 0; border-top: 1px dashed #999; margin: 3mm 0; width: 100%; flex-shrink: 0; }
            
            /* Main Table Border - Soft Grey */
            .print-table { width: 100%; margin: 0 auto; border-collapse: collapse; table-layout: fixed; font-size: 9pt; border: 1px solid #444; }
            
            /* Header */
            .print-header-date { font-size: 11pt; font-weight: 800; padding: 2px; border: 1px solid #444; text-align: center; text-transform: uppercase; background: #fff; color: #000; }
            
            /* Room Headers */
            .room-headers th { padding: 2.5px; border: 1px solid #444; text-align: center; font-weight: 700; font-size: 8.5pt; background: #f1f5f9; }
            
            /* Cells */
            .print-table td { padding: 1.5px 3.5px; vertical-align: middle; line-height: 1.1; border: 1px solid #999; }
            .print-table td.participante { text-align: center; font-weight: 500; color: #000; font-size: 8.5pt; }
            
            /* Sections */
            .section td { font-weight: 900; text-transform: uppercase; color: #fff; padding: 2px 3.5px; text-align: center !important; font-size: 9pt; border: 1px solid #444 !important; }
            .section.tesoros td { background-color: #475569 !important; } 
            .section.maestros td { background-color: #c19a26 !important; } 
            .section.vida-cristiana td { background-color: #8b2c39 !important; } 
            
            .printable-program.blurred::before { content: attr(data-watermark); position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 4.5em; color: rgba(0,0,0,0.08); font-weight: 900; pointer-events: none; z-index: 1000; white-space: nowrap; }
            .printable-program.blurred .print-table { filter: blur(4px); opacity: 0.7; }

            /* Hidden by default */
            .width-controls { 
                display: none; 
                gap: 15px; 
                justify-content: center; 
                align-items: center; 
                flex-wrap: wrap; 
                font-size: 0.85rem; 
                background: #f1f5f9; 
                padding: 10px; 
                border-bottom: 1px solid #e2e8f0;
                animation: slideDown 0.2s ease-out;
            }
            .width-controls.visible { display: flex; }

            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @media (max-width: 600px) {
                .print-actions { gap: 8px; padding: 10px; }
                .action-btn { flex: 1; justify-content: center; padding: 8px; font-size: 0.8rem; }
                .controls-divider { display: none; }
            }
        </style>
    `;

    const script = `
        <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <script>
            // Width Controls
            const root = document.documentElement;
            // Removed individual width controls for simplicity in dynamic layout
            
            document.getElementById('toggle-calibration').addEventListener('change', (e) => {
                const controls = document.getElementById('calibration-panel');
                if(e.target.checked) controls.classList.add('visible');
                else controls.classList.remove('visible');
            });

            // Width Control Listeners (Dynamic)
            if (document.getElementById('width-table')) {
                document.getElementById('width-table').addEventListener('input', function(e){
                    root.style.setProperty('--table-width', e.target.value + '%');
                });
            }
            if (document.getElementById('width-tema')) {
                document.getElementById('width-tema').addEventListener('input', function(e){
                    root.style.setProperty('--width-tema', e.target.value + '%');
                });
            }
            // Bind room sliders dynamically based on active count
            ['sala1', 'sala2', 'sala3'].forEach(id => {
                const el = document.getElementById('width-' + id);
                if (el) {
                    el.addEventListener('input', function(e){
                        root.style.setProperty('--width-' + id, e.target.value + '%');
                    });
                }
            });

            // Download PDF
            document.getElementById('btn-pdf').addEventListener('click', async function() {
                const btn = this;
                const originalContent = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
                btn.disabled = true;

                try {
                    const noPrints = document.querySelectorAll('.no-print');
                    noPrints.forEach(el => el.style.display = 'none');

                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pages = document.querySelectorAll('.print-page');

                    for (let i = 0; i < pages.length; i++) {
                        if (i > 0) pdf.addPage();
                        const canvas = await html2canvas(pages[i], { 
                            scale: 5, // 4K quality
                            useCORS: true, 
                            letterRendering: true,
                            backgroundColor: '#ffffff'
                        });
                        const imgData = canvas.toDataURL('image/jpeg', 1.0);
                        const pdfWidth = pdf.internal.pageSize.getWidth();
                        const pdfHeight = pdf.internal.pageSize.getHeight();
                        
                        const imgProps = pdf.getImageProperties(imgData);
                        const imgRatio = imgProps.width / imgProps.height;
                        const pdfRatio = pdfWidth / pdfHeight;
                        
                        let finalWidth = pdfWidth;
                        let finalHeight = pdfWidth / imgRatio;
                        
                        if (finalHeight > pdfHeight) {
                            finalHeight = pdfHeight;
                            finalWidth = pdfHeight * imgRatio;
                        }
                        
                        const x = (pdfWidth - finalWidth) / 2;
                        const y = 0; // place at top of page without blank shifting
                        
                        pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
                    }

                    pdf.save('programa_vmt.pdf');
                    
                    noPrints.forEach(el => el.style.display = '');
                    btn.innerHTML = originalContent;
                    btn.disabled = false;
                } catch (err) {
                    console.error(err);
                    const noPrints = document.querySelectorAll('.no-print');
                    noPrints.forEach(el => el.style.display = '');
                    btn.innerHTML = originalContent;
                    btn.disabled = false;
                    alert('Error al generar PDF');
                }
            });

            // Download PNG
            document.getElementById('btn-png').addEventListener('click', async function() {
                const btn = this;
                const originalContent = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
                btn.disabled = true;

                try {
                    const container = document.getElementById('print-container');
                    const noPrints = document.querySelectorAll('.no-print');
                    noPrints.forEach(el => el.style.display = 'none');

                    // Save original styles to restore later
                    const pages = document.querySelectorAll('.print-page');
                    const programs = document.querySelectorAll('.printable-program');
                    const origPageStyles = [];
                    const origProgStyles = [];
                    const origContainerGap = container.style.gap;
                    const origContainerMargin = container.style.margin;
                    const origContainerPadding = container.style.padding;

                    container.style.gap = '0';
                    container.style.margin = '0';
                    container.style.padding = '0';
                    
                    pages.forEach(p => {
                        origPageStyles.push({ height: p.style.height, minHeight: p.style.minHeight, padding: p.style.padding, boxShadow: p.style.boxShadow, margin: p.style.margin });
                        p.style.height = 'auto';
                        p.style.minHeight = 'auto';
                        p.style.padding = '4mm'; // Minimal padding to frame the table
                        p.style.boxShadow = 'none';
                        p.style.margin = '0';
                    });
                    programs.forEach(p => {
                        origProgStyles.push({ height: p.style.height, maxHeight: p.style.maxHeight });
                        p.style.height = 'auto';
                        p.style.maxHeight = 'none';
                    });

                    const canvas = await html2canvas(container, {
                        scale: 5, // 4K quality for sharp PNG
                        backgroundColor: '#ffffff',
                        useCORS: true
                    });

                    // Restore styles
                    container.style.gap = origContainerGap;
                    container.style.margin = origContainerMargin;
                    container.style.padding = origContainerPadding;

                    pages.forEach((p, i) => {
                        p.style.height = origPageStyles[i].height;
                        p.style.minHeight = origPageStyles[i].minHeight;
                        p.style.padding = origPageStyles[i].padding;
                        p.style.boxShadow = origPageStyles[i].boxShadow;
                        p.style.margin = origPageStyles[i].margin;
                    });
                    programs.forEach((p, i) => {
                        p.style.height = origProgStyles[i].height;
                        p.style.maxHeight = origProgStyles[i].maxHeight;
                    });
                    noPrints.forEach(el => el.style.display = '');

                    canvas.toBlob(async (blob) => {
                        const link = document.createElement('a');
                        link.download = 'programa.png';
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                        
                        btn.innerHTML = originalContent;
                        btn.disabled = false;
                    });
                } catch (err) {
                    console.error(err);
                    const noPrints = document.querySelectorAll('.no-print');
                    noPrints.forEach(el => el.style.display = '');
                    alert('Error al generar imagen PNG');
                    btn.innerHTML = originalContent;
                    btn.disabled = false;
                }
            });

            // Share / Download PNG
            document.getElementById('btn-share').addEventListener('click', async function() {
                const btn = this;
                const originalContent = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
                btn.disabled = true;

                try {
                    const container = document.getElementById('print-container');
                    const noPrints = document.querySelectorAll('.no-print');
                    noPrints.forEach(el => el.style.display = 'none');

                    // Save original styles to restore later
                    const pages = document.querySelectorAll('.print-page');
                    const programs = document.querySelectorAll('.printable-program');
                    const origPageStyles = [];
                    const origProgStyles = [];
                    const origContainerGap = container.style.gap;
                    const origContainerMargin = container.style.margin;
                    const origContainerPadding = container.style.padding;

                    container.style.gap = '0';
                    container.style.margin = '0';
                    container.style.padding = '0';
                    
                    pages.forEach(p => {
                        origPageStyles.push({ height: p.style.height, minHeight: p.style.minHeight, padding: p.style.padding, boxShadow: p.style.boxShadow, margin: p.style.margin });
                        p.style.height = 'auto';
                        p.style.minHeight = 'auto';
                        p.style.padding = '4mm'; // Minimal padding to frame the table
                        p.style.boxShadow = 'none';
                        p.style.margin = '0';
                    });
                    programs.forEach(p => {
                        origProgStyles.push({ height: p.style.height, maxHeight: p.style.maxHeight });
                        p.style.height = 'auto';
                        p.style.maxHeight = 'none';
                    });

                    const canvas = await html2canvas(container, {
                        scale: 5, // 4K quality for sharp PNG
                        backgroundColor: '#ffffff',
                        useCORS: true
                    });

                    // Restore styles
                    container.style.gap = origContainerGap;
                    container.style.margin = origContainerMargin;
                    container.style.padding = origContainerPadding;

                    pages.forEach((p, i) => {
                        p.style.height = origPageStyles[i].height;
                        p.style.minHeight = origPageStyles[i].minHeight;
                        p.style.padding = origPageStyles[i].padding;
                        p.style.boxShadow = origPageStyles[i].boxShadow;
                        p.style.margin = origPageStyles[i].margin;
                    });
                    programs.forEach((p, i) => {
                        p.style.height = origProgStyles[i].height;
                        p.style.maxHeight = origProgStyles[i].maxHeight;
                    });
                    noPrints.forEach(el => el.style.display = '');

                    canvas.toBlob(async (blob) => {
                        const file = new File([blob], "programa.png", { type: "image/png" });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({
                                    files: [file],
                                    title: 'Programa VMT',
                                    text: 'Aquí está el programa de la reunión.'
                                });
                            } catch (err) {
                                // Share cancelled
                            }
                        } else {
                            const link = document.createElement('a');
                            link.download = 'programa.png';
                            link.href = canvas.toDataURL('image/png');
                            link.click();
                        }
                        btn.innerHTML = originalContent;
                        btn.disabled = false;
                    });
                } catch (err) {
                    console.error(err);
                    const noPrints = document.querySelectorAll('.no-print');
                    noPrints.forEach(el => el.style.display = '');
                    alert('Error al generar imagen');
                    btn.innerHTML = originalContent;
                    btn.disabled = false;
                }
            });
        </script>
    `;

    return `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=800">
        <title>Programa VMT - Vista Previa</title>
        ${styles}
    </head>
    <body>
        <div class="print-actions no-print">
            <button class="action-btn btn-print" onclick="window.print()"><i class="fas fa-print"></i> Imprimir</button>
            <button id="btn-pdf" class="action-btn btn-pdf"><i class="fas fa-file-pdf"></i> PDF</button>
            <button id="btn-share" class="action-btn btn-share"><i class="fas fa-share-alt"></i> Compartir</button>
            <button id="btn-png" class="action-btn btn-png"><i class="fas fa-image"></i> Descargar PNG</button>
            <button class="action-btn btn-close" onclick="window.close()"><i class="fas fa-times"></i> Cerrar</button>
            
            <div class="controls-divider"></div>

            <label class="toggle-label">
                <input type="checkbox" id="toggle-calibration"> 
                <i class="fas fa-sliders-h"></i> Info
            </label>
        </div>
        
        <div id="calibration-panel" class="width-controls no-print">
            <label>Ancho Tabla (%): <input id="width-table" type="number" value="100" min="50" max="100" style="width:60px;"></label>
            <label>Ancho Tema (%): <input id="width-tema" type="number" value="${colParteWidth}" min="20" max="60" style="width:60px;"></label>
            ${activeRooms.map((r, i) => `<label>Ancho Col${i+1} (%): <input id="width-sala${i+1}" type="number" value="${colRoomWidth}" min="10" max="40" style="width:60px;"></label>`).join('')}
        </div>

        <div id="print-container">
            ${pagesHTML}
        </div>
        
        ${script}
    </body>
    </html>`;
};
