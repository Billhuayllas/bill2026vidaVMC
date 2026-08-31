import { getFridayFromWeekId } from '../lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PrintAssignment {
    participant: string;
    helper: string;
    weekId: string;
    weekTitle: string;
    partTitle: string;
    room: string;
    intendedFor: 'participant' | 'helper';
}

// Estilos CSS exactos para A4 Landscape (297mm x 210mm) con 8 tarjetas por hoja
export const PRINT_STYLES = `
    @page { 
        size: 297mm 210mm landscape; 
        margin: 0; 
    }
    @media print {
        html, body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .print-page {
            page-break-after: always !important;
            break-after: page !important;
        }
        .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
        }
    }
    * {
        box-sizing: border-box;
    }
    body { 
        margin: 0; 
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact;
        background-color: #f1f5f9;
    }
    .print-page {
        width: 297mm;
        height: 210mm;
        padding: 6mm 8mm;
        box-sizing: border-box;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(2, 1fr);
        gap: 3mm;
        background-color: #ffffff;
        overflow: hidden;
        position: relative;
    }
    
    .report-slip-wrapper { 
        width: 100%; 
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
    }

    .report-slip-print { 
        width: 100%;
        height: 100%;
        border: 1px solid #94a3b8;
        border-radius: 4px;
        background-color: #ffffff; 
        padding: 7px 9px 5px 9px; 
        display: flex; 
        flex-direction: column; 
        justify-content: space-between;
        font-size: 8.5pt;
        box-sizing: border-box;
        position: relative;
    }
    
    .report-slip-print .title { 
        text-align: center; 
        margin: 0 0 5px 0; 
        font-size: 8.8pt;
        line-height: 1.15; 
        color: #1d4ed8; 
        font-weight: 800; 
        text-transform: uppercase;
        letter-spacing: -0.01em;
    }

    .report-slip-print .fields-container {
        display: flex;
        flex-direction: column;
        gap: 3.5px;
    }

    .report-slip-print .field { 
        display: flex; 
        align-items: baseline; 
        white-space: nowrap;
        font-size: 8.4pt;
    }
    .report-slip-print .label { 
        width: 62px;
        flex-shrink: 0; 
        font-weight: 700; 
        color: #1e293b;
        font-size: 8.2pt;
    }
    .report-slip-print .value-wrapper {
        flex-grow: 1;
        display: flex;
        align-items: baseline;
        border-bottom: 1px dotted #64748b;
        min-width: 0;
        padding-bottom: 0.5px;
        padding-left: 3px;
    }
    .report-slip-print .value { 
        flex-grow: 1; 
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 600;
        color: #0f172a;
        font-size: 8.5pt;
        line-height: 1.2;
    }
    .report-slip-print .checkmark-badge {
        font-size: 9pt;
        font-weight: 900;
        color: #1d4ed8;
        margin-left: 3px;
        line-height: 1;
        flex-shrink: 0;
    }
    .report-slip-print .rooms { 
        margin-top: 3px; 
        display: flex; 
        flex-direction: column; 
        gap: 1.5px; 
        font-size: 7.6pt;
        color: #1e293b;
    }
    .report-slip-print .rooms-title {
        font-weight: 700;
        margin-bottom: 1px;
        color: #0f172a;
    }
    .report-slip-print .room-option { 
        display: flex; 
        align-items: center; 
        gap: 4.5px; 
        color: #334155;
    }
    .report-slip-print .room-option.selected-room {
        font-weight: 700;
        color: #0f172a;
    }
    .report-slip-print .custom-checkbox {
        width: 10.5px;
        height: 10.5px;
        border: 1.2px solid #475569;
        border-radius: 2px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: #ffffff;
        flex-shrink: 0;
    }
    .report-slip-print .custom-checkbox.checked {
        background-color: #1d4ed8;
        border-color: #1d4ed8;
        color: #ffffff;
    }
    .report-slip-print .custom-checkbox.checked::after {
        content: "✓";
        font-size: 8pt;
        font-weight: 900;
        line-height: 1;
    }
    .report-slip-print .footer { 
        margin-top: 2px; 
        padding-top: 3px; 
        font-size: 6.5pt;
        color: #475569; 
        border-top: 1px solid #e2e8f0; 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-end; 
    }
    .report-slip-print .footer p { 
        margin: 0; 
        width: 82%;
        line-height: 1.15;
    }
    .report-slip-print .footer-code {
        font-weight: 700;
        font-size: 6.8pt;
        color: #334155;
        white-space: nowrap;
    }
`;

export const createSlipHTML = (a: PrintAssignment): string => {
    const isParticipant = a.intendedFor === 'participant';
    const isHelper = a.intendedFor === 'helper';
    const checkmarkParticipant = isParticipant ? `<span class="checkmark-badge">✓</span>` : '';
    const checkmarkHelper = isHelper && a.helper ? `<span class="checkmark-badge">✓</span>` : '';

    return `
        <div class="report-slip-wrapper">
            <div class="report-slip-print">
                <div class="title">ASIGNACIÓN PARA LA REUNIÓN<br/>VIDA Y MINISTERIO CRISTIANOS</div>
                
                <div class="fields-container">
                    <div class="field">
                        <span class="label">Nombre:</span>
                        <div class="value-wrapper">
                            <span class="value">${a.participant || ''}</span>
                            ${checkmarkParticipant}
                        </div>
                    </div>
                    <div class="field">
                        <span class="label">Ayudante:</span>
                        <div class="value-wrapper">
                            <span class="value">${a.helper || 'Ninguno'}</span>
                            ${checkmarkHelper}
                        </div>
                    </div>
                    <div class="field">
                        <span class="label">Fecha:</span>
                        <div class="value-wrapper">
                            <span class="value">${getFridayFromWeekId(a.weekId, 'long')}</span>
                        </div>
                    </div>
                    <div class="field">
                        <span class="label">Intervención:</span>
                        <div class="value-wrapper">
                            <span class="value">${a.partTitle || ''}</span>
                        </div>
                    </div>
                </div>

                <div class="rooms">
                    <span class="rooms-title">Se presentará en:</span>
                    <div class="room-option ${a.room === 'main' ? 'selected-room' : ''}">
                        <span class="custom-checkbox ${a.room === 'main' ? 'checked' : ''}"></span>
                        <span>Sala principal</span>
                    </div>
                    <div class="room-option ${a.room === 'aux2' ? 'selected-room' : ''}">
                        <span class="custom-checkbox ${a.room === 'aux2' ? 'checked' : ''}"></span>
                        <span>Sala auxiliar núm. 2</span>
                    </div>
                    <div class="room-option ${a.room === 'aux3' ? 'selected-room' : ''}">
                        <span class="custom-checkbox ${a.room === 'aux3' ? 'checked' : ''}"></span>
                        <span>Sala auxiliar núm. 3</span>
                    </div>
                </div>

                <div class="footer">
                    <p><strong>Nota:</strong> En la <em>Guía de actividades</em> encontrará la información para su intervención. Repase las <em>Instrucciones para la reunión</em> (S-38).</p>
                    <span class="footer-code">S-89-S 11/23</span>
                </div>
            </div>
        </div>
    `;
};

/**
 * Genera el documento HTML completo para iframe de vista previa o impresión en navegador.
 */
export const generatePrintHtml = (assignments: PrintAssignment[], forModalPreview = false): string => {
    const slipsPerPage = 8;
    const pages: string[] = [];
    
    if (assignments.length === 0) {
        return `
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><style>${PRINT_STYLES}</style></head>
            <body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
                <p style="text-align:center;font-size:16px;color:#64748b;font-weight:bold;">
                    No hay asignaciones que coincidan con los filtros seleccionados.
                </p>
            </body>
            </html>
        `;
    }

    for (let i = 0; i < assignments.length; i += slipsPerPage) {
        const chunk = assignments.slice(i, i + slipsPerPage);
        const emptySlots = slipsPerPage - chunk.length;
        const pageSlipsHTML = chunk.map(createSlipHTML).join('') + 
                              Array(emptySlots).fill('<div class="report-slip-wrapper"><div style="width:100%;height:100%;border:1px dashed #e2e8f0;border-radius:4px;background:#fafafa;"></div></div>').join('');
        
        pages.push(`<div class="print-page">${pageSlipsHTML}</div>`);
    }
    
    const allPagesHTML = pages.join('');

    const previewCustomStyles = forModalPreview ? `
        body {
            background-color: #e2e8f0;
            padding: 20px 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        .print-page {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            border-radius: 4px;
            transform-origin: top center;
        }
        /* Mobile scale down for comfortable preview */
        @media (max-width: 1200px) {
            .print-page {
                zoom: 0.85;
            }
        }
        @media (max-width: 900px) {
            .print-page {
                zoom: 0.65;
            }
        }
        @media (max-width: 600px) {
            .print-page {
                zoom: 0.42;
            }
        }
    ` : '';

    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Asignaciones VMT (S-89)</title>
            <style>
                ${PRINT_STYLES}
                ${previewCustomStyles}
            </style>
        </head>
        <body>
            ${allPagesHTML}
        </body>
        </html>
    `;
};

/**
 * Genera el archivo PDF directamente con jsPDF y html2canvas de alta resolución
 * asegurando que no quede vacío y que mantenga 8 hojitas exactas por página A4 horizontal.
 */
export const generatePdfBlob = async (
    assignments: PrintAssignment[],
    onProgress?: (step: string) => void
): Promise<{ blob: Blob; doc: jsPDF }> => {
    if (assignments.length === 0) {
        throw new Error("No hay asignaciones para generar el PDF.");
    }

    if (onProgress) onProgress("Preparando páginas A4...");

    const slipsPerPage = 8;
    const totalPages = Math.ceil(assignments.length / slipsPerPage);
    
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    // Contenedor temporal aislado para renderizar cada página con estilos exactos
    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'fixed';
    renderContainer.style.left = '0';
    renderContainer.style.top = '0';
    renderContainer.style.width = '297mm';
    renderContainer.style.height = '210mm';
    renderContainer.style.backgroundColor = '#ffffff';
    renderContainer.style.zIndex = '-99999';
    renderContainer.style.opacity = '1';
    renderContainer.style.pointerEvents = 'none';

    const styleEl = document.createElement('style');
    styleEl.innerHTML = PRINT_STYLES;
    renderContainer.appendChild(styleEl);
    document.body.appendChild(renderContainer);

    try {
        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
            if (onProgress) onProgress(`Generando página ${pageIdx + 1} de ${totalPages}...`);

            const start = pageIdx * slipsPerPage;
            const chunk = assignments.slice(start, start + slipsPerPage);
            const emptySlots = slipsPerPage - chunk.length;
            
            const pageSlipsHTML = chunk.map(createSlipHTML).join('') + 
                                  Array(emptySlots).fill('<div class="report-slip-wrapper"><div style="width:100%;height:100%;border:1px dashed #e2e8f0;border-radius:4px;background:#fafafa;"></div></div>').join('');
            
            // Creamos el elemento DOM de la página
            const pageDiv = document.createElement('div');
            pageDiv.className = 'print-page';
            pageDiv.innerHTML = pageSlipsHTML;

            // Limpiamos contenido anterior y colocamos la página actual
            const existingPages = renderContainer.querySelectorAll('.print-page');
            existingPages.forEach(p => p.remove());
            renderContainer.appendChild(pageDiv);

            // Breve espera para que los estilos y fuentes se calculen en el DOM
            await new Promise(resolve => setTimeout(resolve, 80));

            // Capturamos el canvas en escala 2.5 (más de 240 DPI para nitidez cristalina)
            const canvas = await html2canvas(pageDiv, {
                scale: 2.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: pageDiv.offsetWidth,
                height: pageDiv.offsetHeight
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            if (pageIdx > 0) {
                doc.addPage('a4', 'landscape');
            }

            doc.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
        }

        if (onProgress) onProgress("Finalizando PDF...");
        const blob = doc.output('blob');
        return { blob, doc };
    } finally {
        if (renderContainer.parentNode) {
            renderContainer.parentNode.removeChild(renderContainer);
        }
    }
};

/**
 * Crea el texto formateado para enviar por WhatsApp con el resumen de todas las asignaciones seleccionadas.
 */
export const createWhatsAppSummary = (assignments: PrintAssignment[], congregationName?: string): string => {
    if (assignments.length === 0) return '';

    let text = `📋 *ASIGNACIONES S-89 - PROGRAMA VMT*\n`;
    if (congregationName) {
        text += `🏛 *Congregación:* ${congregationName}\n`;
    }
    text += `📅 *Total de asignaciones:* ${assignments.length}\n`;
    text += `───────────────────────\n\n`;

    // Agrupar por fecha/semana
    const groupedByWeek = assignments.reduce((acc, a) => {
        if (!acc[a.weekId]) acc[a.weekId] = [];
        acc[a.weekId].push(a);
        return acc;
    }, {} as Record<string, PrintAssignment[]>);

    Object.entries(groupedByWeek).forEach(([weekId, items]) => {
        const dateStr = getFridayFromWeekId(weekId, 'long');
        text += `🗓 *Semana:* ${dateStr}\n`;

        items.forEach((item, idx) => {
            const roomLabel = item.room === 'aux2' ? 'Sala 2' : item.room === 'aux3' ? 'Sala 3' : 'Sala Principal';
            text += `  ${idx + 1}. 👤 *${item.participant}*`;
            if (item.helper) {
                text += ` (Ayudante: _${item.helper}_)`;
            }
            text += `\n     📖 *${item.partTitle}* | 📍 _${roomLabel}_\n`;
        });
        text += `\n`;
    });

    text += `───────────────────────\n`;
    text += `ℹ️ _Recuerde revisar las instrucciones de la Guía de Actividades (S-38)._`;

    return text;
};
