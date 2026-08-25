
import { getFridayFromWeekId } from '../lib/utils';

// Definimos la interfaz necesaria para la impresión
export interface PrintAssignment {
    participant: string;
    helper: string;
    weekId: string;
    weekTitle: string;
    partTitle: string;
    room: string;
    intendedFor: 'participant' | 'helper';
}

// Estilos CSS optimizados para A4 y PDF
// Usamos CSS Grid estricto con márgenes de seguridad para evitar desbordamientos
const PRINT_STYLES = `
    @page { 
        size: A4 landscape; 
        margin: 0; 
    }
    body { 
        margin: 0; 
        padding: 0;
        font-family: Arial, sans-serif; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact;
        background-color: white;
    }
    .print-page {
        width: 297mm;
        height: 209mm; /* 1mm menos que A4 para evitar salto de página fantasma */
        padding: 8mm; 
        box-sizing: border-box;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(2, 1fr);
        gap: 0;
        page-break-after: always;
        background-color: white;
        overflow: hidden; /* Crítico: evita que el contenido empuje el tamaño de la página */
    }
    .print-page:last-child {
        page-break-after: auto;
    }
    
    /* Contenedor de celda: Define el espacio exacto de 1/8 de página */
    .report-slip-wrapper { 
        width: 100%; 
        height: 100%;
        padding: 3px; /* Espacio visual entre tarjetas */
        box-sizing: border-box;
        overflow: hidden; /* Asegura que el contenido no rompa la celda */
    }

    /* La tarjeta visual real */
    .report-slip-print { 
        width: 100%;
        height: 100%;
        border: 1px dashed #aaa;
        background-color: #fff; 
        padding: 8px 10px; 
        display: flex; 
        flex-direction: column; 
        font-size: 8.5pt;
        box-sizing: border-box;
        position: relative;
    }
    
    .report-slip-print .title { 
        text-align: center; 
        margin-top: 2px; 
        margin-bottom: 8px; 
        font-size: 9pt;
        line-height: 1.1; 
        color: #0d6efd; 
        font-weight: 700; 
        text-transform: uppercase;
    }
    .report-slip-print .field { 
        display: flex; 
        align-items: baseline; 
        margin-bottom: 5px; 
        white-space: nowrap; /* Evita que los nombres largos bajen de línea y rompan altura */
    }
    .report-slip-print .label { 
        width: 60px;
        flex-shrink: 0; 
        font-weight: bold; 
        color: #333;
    }
    .report-slip-print .value { 
        flex-grow: 1; 
        border-bottom: 1px dotted #333; 
        padding-bottom: 0px;
        padding-left: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis; /* Pone puntos suspensivos si es muy largo */
        font-weight: 600;
        height: 15px;
        display: block;
    }
    .report-slip-print .checkmark-dot {
        width: 8px;
        height: 8px;
        background-color: #000000;
        border-radius: 50%;
        margin-left: 4px;
        flex-shrink: 0;
        align-self: center;
    }
    .report-slip-print .rooms { 
        margin-top: 6px; 
        display: flex; 
        flex-direction: column; 
        gap: 2px; 
        font-size: 7.5pt;
    }
    .report-slip-print .rooms strong {
        margin-bottom: 1px;
        display: block;
    }
    .report-slip-print .room-option { 
        display: flex; 
        align-items: center; 
        gap: 4px; 
    }
    .report-slip-print .room-option.selected-room {
        font-weight: bold;
    }
    .report-slip-print input[type="checkbox"] {
        -webkit-appearance: none;
        appearance: none;
        width: 10px;
        height: 10px;
        border: 1px solid #333;
        border-radius: 2px;
        vertical-align: middle;
        background-color: transparent;
        position: relative;
        margin: 0;
    }
    .report-slip-print input[type="checkbox"]:checked {
        background-color: #333;
        border-color: #333;
    }
    .report-slip-print input[type="checkbox"]:checked::after {
        content: "✔";
        color: white;
        font-size: 8px;
        font-weight: bold;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        line-height: 1;
    }
    .report-slip-print .footer { 
        margin-top: auto; 
        padding-top: 4px; 
        font-size: 6.5pt;
        color: #555; 
        border-top: 1px solid #eee; 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-end; 
    }
    .report-slip-print .footer p { 
        margin: 0; 
        width: 88%;
        line-height: 1.1;
    }
`;

const createSlipHTML = (a: PrintAssignment): string => {
    const checkmarkHTML = `<div class="checkmark-dot"></div>`;
    const participantCheck = a.intendedFor === 'participant' ? checkmarkHTML : '';
    const helperCheck = a.intendedFor === 'helper' && a.helper ? checkmarkHTML : '';

    return `
        <div class="report-slip-wrapper">
            <div class="report-slip-print">
                <div class="title">ASIGNACIÓN PARA LA REUNIÓN<br/>VIDA Y MINISTERIO CRISTIANOS</div>
                <div class="field">
                    <span class="label">Nombre:</span>
                    <span class="value">${a.participant}</span>
                    ${participantCheck}
                </div>
                <div class="field">
                    <span class="label">Ayudante:</span>
                    <span class="value">${a.helper || 'Ninguno'}</span>
                    ${helperCheck}
                </div>
                <div class="field">
                    <span class="label">Fecha:</span>
                    <span class="value">${getFridayFromWeekId(a.weekId, 'long')}</span>
                </div>
                <div class="field">
                    <span class="label">Intervención:</span>
                    <span class="value" style="font-size: 0.85em;">${a.partTitle}</span>
                </div>
                <div class="rooms">
                    <strong>Se presentará en:</strong>
                    <div class="room-option ${a.room === 'main' ? 'selected-room' : ''}"><input type="checkbox" ${a.room === 'main' ? 'checked' : ''} disabled /> Sala principal</div>
                    <div class="room-option ${a.room === 'aux2' ? 'selected-room' : ''}"><input type="checkbox" ${a.room === 'aux2' ? 'checked' : ''} disabled /> Sala auxiliar núm. 2</div>
                    <div class="room-option ${a.room === 'aux3' ? 'selected-room' : ''}"><input type="checkbox" ${a.room === 'aux3' ? 'checked' : ''} disabled /> Sala auxiliar núm. 3</div>
                </div>
                <div class="footer">
                    <p><strong>Nota:</strong> En la <em>Guía de actividades</em> encontrará la información para su intervención. Repase las <em>Instrucciones para la reunión</em> (S-38).</p>
                    <span>S-89</span>
                </div>
            </div>
        </div>
    `;
};

/**
 * Genera el HTML completo para impresión o PDF.
 * Organiza las asignaciones en páginas A4.
 */
export const generatePrintHtml = (assignments: PrintAssignment[]): string => {
    const slipsPerPage = 8;
    const pages = [];
    
    if (assignments.length === 0) {
        return `<html><body><p style="text-align:center; padding: 50px;">No hay asignaciones seleccionadas para imprimir.</p></body></html>`;
    }

    for (let i = 0; i < assignments.length; i += slipsPerPage) {
        const chunk = assignments.slice(i, i + slipsPerPage);
        
        // Rellenar con slots vacíos para mantener la estructura visual de la cuadrícula
        const emptySlots = slipsPerPage - chunk.length;
        const pageSlipsHTML = chunk.map(createSlipHTML).join('') + 
                              Array(emptySlots).fill('<div class="report-slip-wrapper"></div>').join('');
        
        pages.push(`<div class="print-page">${pageSlipsHTML}</div>`);
    }
    
    const allPagesHTML = pages.join('');

    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Asignaciones VMT (S-89)</title>
            <style>${PRINT_STYLES}</style>
        </head>
        <body>
            ${allPagesHTML}
        </body>
        </html>
    `;
};
