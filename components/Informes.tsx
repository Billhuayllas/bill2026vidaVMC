
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getFridayFromWeekId } from '../lib/utils';
import { useCongregation } from '../lib/CongregationContext';
import { useProgramData } from '../lib/useProgramData';

declare const html2canvas: any;
declare const html2pdf: any;

type Assignment = {
    participant: string;
    helper: string;
    weekId: string;
    weekTitle: string;
    partTitle: string;
    room: string;
    intendedFor: 'participant' | 'helper';
};

interface InformesProps {
    restrictedGroupId?: number | null;
}

const createPrintSlipHTML = (a: Assignment): string => {
    const checkmarkHTML = `<div class="checkmark-dot"></div>`;
    const participantCheck = a.intendedFor === 'participant' ? checkmarkHTML : '';
    const helperCheck = a.intendedFor === 'helper' && a.helper ? checkmarkHTML : '';

    return `
        <div class="report-slip-print">
            <h3 class="title">ASIGNACIÓN PARA LA REUNIÓN<br/>VIDA Y MINISTERIO CRISTIANOS</h3>
            <div class="field">
                <strong class="label">Nombre:</strong>
                <span class="value">${a.participant}</span>
                ${participantCheck}
            </div>
            <div class="field">
                <strong class="label">Ayudante:</strong>
                <span class="value">${a.helper || 'Ninguno'}</span>
                ${helperCheck}
            </div>
            <div class="field">
                <strong class="label">Fecha:</strong>
                <span class="value">${getFridayFromWeekId(a.weekId, 'long')}</span>
            </div>
            <div class="field">
                <strong class="label">Intervención:</strong>
                <span class="value">${a.partTitle}</span>
            </div>
            <div class="rooms">
                <strong>Se presentará en:</strong>
                <div class="room-option ${a.room === 'main' ? 'selected-room' : ''}"><input type="checkbox" ${a.room === 'main' ? 'checked' : ''} disabled /> Sala principal</div>
                <div class="room-option ${a.room === 'aux2' ? 'selected-room' : ''}"><input type="checkbox" ${a.room === 'aux2' ? 'checked' : ''} disabled /> Sala auxiliar núm. 2</div>
                <div class="room-option ${a.room === 'aux3' ? 'selected-room' : ''}"><input type="checkbox" ${a.room === 'aux3' ? 'checked' : ''} disabled /> Sala auxiliar núm. 3</div>
            </div>
            <div class="footer">
                <p><strong>Nota:</strong> En la <em>Guía de actividades</em> encontrará la información para su intervención. Repase las <em>Instrucciones para la reunión</em> (S-38).</p>
                <span>S-89-S 11/23</span>
            </div>
        </div>
    `;
};

// --- CONFIGURACIÓN DEL DISEÑO DE IMPRESIÓN/PDF ---
const printStyles = `
    @page { 
        size: A4 landscape; 
        margin: 0; 
    }
    body { 
        margin: 0; 
        font-family: Arial, sans-serif; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact;
        background-color: white;
    }
    .print-page {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        align-content: flex-start;
        width: 29.7cm;
        padding: 0.5cm;
        box-sizing: border-box;
        overflow: hidden;
        background-color: white;
    }
    .print-page:not(:last-child) {
        page-break-after: always;
    }
    .report-slip-print { 
        border: 1px solid #999; 
        background-color: #fff; 
        padding: 0.35cm;
        display: flex; 
        flex-direction: column; 
        font-size: 11px;
        overflow: hidden;
        box-sizing: border-box;
        width: 6.9cm;
        height: 9.6cm;
        margin-right: 0.15cm;
        margin-bottom: 0.15cm;
        page-break-inside: avoid;
    }
    .report-slip-print:nth-child(4n) {
        margin-right: 0;
    }
    .report-slip-print:nth-child(n+5) {
        margin-bottom: 0;
    }
    .report-slip-print .title { 
        text-align: center; 
        margin-top: 0; 
        margin-bottom: 12px;
        font-size: 13px;
        line-height: 1.2; 
        color: #0d6efd; 
        font-weight: 800;
    }
    .report-slip-print .field { 
        display: flex; 
        align-items: baseline; 
        margin-bottom: 6px;
    }
    .report-slip-print .label { 
        width: 70px;
        flex-shrink: 0; 
        font-weight: bold; 
    }
    .report-slip-print .value { 
        flex-grow: 1; 
        border-bottom: 1px dotted #666; 
        padding-bottom: 1px;
        padding-left: 4px;
        word-break: break-word;
    }
    .report-slip-print .checkmark-dot {
        color: #0d6efd;
        font-weight: bold;
        font-size: 14px;
        margin-left: 5px;
        flex-shrink: 0;
        align-self: center;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .report-slip-print .checkmark-dot::after {
        content: "✔";
    }
    .report-slip-print .rooms { 
        margin-top: 0.2cm; 
        display: flex; 
        flex-direction: column; 
        gap: 0.1cm; 
    }
    .report-slip-print .rooms strong {
        margin-bottom: 0.05cm;
    }
    .report-slip-print .room-option { 
        display: flex; 
        align-items: center; 
        gap: 5px; 
    }
    .report-slip-print .room-option.selected-room {
        font-weight: bold;
    }
    .report-slip-print input[type="checkbox"] {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border: 1.5px solid #333;
        border-radius: 2px;
        vertical-align: middle;
        background-color: transparent;
        position: relative;
        top: -1px;
    }
    .report-slip-print input[type="checkbox"]:checked {
        background-color: #0d6efd;
        border-color: #0d6efd;
    }
    .report-slip-print input[type="checkbox"]:checked::after {
        content: "✔";
        color: white;
        font-size: 10px;
        font-weight: bold;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        line-height: 1;
    }
    .report-slip-print .footer { 
        margin-top: auto; 
        padding-top: 0.2cm; 
        font-size: 7.5pt;
        color: #555; 
        border-top: 1px solid #eee; 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-end; 
    }
    .report-slip-print .footer p { 
        margin: 0; 
    }
`;


const Informes: React.FC<InformesProps> = ({ restrictedGroupId }) => {
    const { currentCongregation } = useCongregation();
    const { programs, loading: programLoading } = useProgramData();
    const [fullDataCache, setFullDataCache] = useState<any>({});
    const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
    const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
    const [allowedParticipants, setAllowedParticipants] = useState<Set<string> | null>(null);
    
    // Filters
    const [startWeek, setStartWeek] = useState('');
    const [endWeek, setEndWeek] = useState('');
    const [person, setPerson] = useState('');
    const [assignmentType, setAssignmentType] = useState('');
    const [showFilters, setShowFilters] = useState(false); // Mobile filter toggle

    const [weekOptions, setWeekOptions] = useState<string[]>([]);
    const [personOptions, setPersonOptions] = useState<string[]>([]);
    const [assignmentOptions, setAssignmentOptions] = useState<string[]>([]);
    
    const [loadingSlipId, setLoadingSlipId] = useState<string | null>(null);
    const [filesToShare, setFilesToShare] = useState<{ [slipId: string]: File }>({});
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [pdfPreviewHtml, setPdfPreviewHtml] = useState<string | null>(null);
    const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);

    const formatWeekLabel = (title: string, w: string) => {
        if (!title) return w;
        let label = title.split('|')[0].trim().toLowerCase();
        label = label.charAt(0).toUpperCase() + label.slice(1);
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        months.forEach(m => {
            label = label.replace(new RegExp(m, 'g'), m.charAt(0).toUpperCase() + m.slice(1));
        });
        return label;
    };

    const renderGroupedWeekOptions = (weeks: string[]) => {
        const renderedGroups: any[] = [];
        let currentMonth = '';
        let currentOptions: any[] = [];

        weeks.forEach(w => {
            const date = new Date(w + 'T12:00:00');
            const monthStr = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            const monthCapitalized = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
            
            if (monthCapitalized !== currentMonth) {
                if (currentMonth !== '') {
                    renderedGroups.push(
                        <optgroup key={currentMonth} label={currentMonth}>
                            {currentOptions}
                        </optgroup>
                    );
                }
                currentMonth = monthCapitalized;
                currentOptions = [];
            }
            
            currentOptions.push(
                <option key={w} value={w}>
                    {formatWeekLabel(fullDataCache[w]?.titulo, w)}
                </option>
            );
        });

        if (currentMonth !== '') {
            renderedGroups.push(
                <optgroup key={`last-${currentMonth}`} label={currentMonth}>
                    {currentOptions}
                </optgroup>
            );
        }

        return renderedGroups;
    };

    // Fetch allowed members if restriction is active
    useEffect(() => {
        const fetchRestrictedMembers = async () => {
            if (restrictedGroupId) {
                const { data } = await supabase
                    .from('miembros_grupo')
                    .select('publicador_nombre')
                    .eq('grupo_id', restrictedGroupId);
                
                if (data) {
                    const membersSet = new Set<string>(data.map((m: any) => m.publicador_nombre));
                    setAllowedParticipants(membersSet);
                }
            } else {
                setAllowedParticipants(null);
            }
        };
        fetchRestrictedMembers();
    }, [restrictedGroupId]);

    const processData = useCallback(() => {
        const assignments: Assignment[] = [];
        const participantSet = new Set<string>();
        const interventionSet = new Set<string>();

        const isAllowed = (name: string) => {
            if (!allowedParticipants) return true;
            return allowedParticipants.has(name);
        };

        Object.keys(fullDataCache).forEach(weekId => {
            const weekData = fullDataCache[weekId];
            if (!weekData) return;

            // Process Bible Reading
            if (weekData.tesoros?.p3) {
                ["main", "aux2", "aux3"].forEach(room => {
                    if (weekData.tesoros.p3[room]) {
                        const reader = weekData.tesoros.p3[room].trim();
                        if (reader && isAllowed(reader)) {
                            assignments.push({ participant: reader, helper: "", weekId, weekTitle: weekData.titulo, partTitle: "Lectura de la Biblia (3 min.)", room, intendedFor: "participant" });
                            participantSet.add(reader);
                            interventionSet.add("Lectura de la Biblia (3 min.)");
                        }
                    }
                });
            }

            // Process teaching assignments
            (weekData.maestros || []).forEach((assignment: any) => {
                ["main", "aux2", "aux3"].forEach(room => {
                    if (assignment[room]) {
                        const [participant, helper] = assignment[room].split("/").map((name: string) => name.trim()).filter(Boolean);
                        
                        if(participant && isAllowed(participant)) {
                            interventionSet.add(assignment.title);
                            assignments.push({ participant, helper: helper || "", weekId, weekTitle: weekData.titulo, partTitle: assignment.title, room, intendedFor: "participant" });
                            participantSet.add(participant);
                        }
                        
                        if(helper && isAllowed(helper)) {
                            interventionSet.add(assignment.title);
                            assignments.push({ participant, helper, weekId, weekTitle: weekData.titulo, partTitle: assignment.title, room, intendedFor: "helper" });
                            participantSet.add(helper);
                        }
                    }
                });
            });
        });
        
        setAllAssignments(assignments);
        
        // Remove filtering to allow users to generate reports for past months if they wish.
        const filteredWeeks = Object.keys(fullDataCache).sort();

        setWeekOptions(filteredWeeks);
        setPersonOptions(Array.from(participantSet).sort());
        setAssignmentOptions(Array.from(interventionSet).sort());

    }, [fullDataCache, allowedParticipants]);

    useEffect(() => {
        if (programs && programs.length > 0) {
            const cache: any = {};
            programs.forEach(p => { cache[p.week_id] = p.data; });
            setFullDataCache(cache);
        }
    }, [programs]);

    useEffect(() => {
        if (Object.keys(fullDataCache).length > 0) {
            processData();
        }
    }, [fullDataCache, processData]);

    useEffect(() => {
        let filtered = allAssignments;

        // Default to filtering from the current week or first future week to match "desde esta semana en adelante".
        let effectiveStartWeek = startWeek;
        if (!effectiveStartWeek && weekOptions.length > 0) {
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const currentOrFutureWeeks = weekOptions.filter(w => {
                const weekDate = new Date(w);
                const diffTime = today.getTime() - weekDate.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                return diffDays <= 7; // week started up to 7 days ago or is in the future
            });
            
            effectiveStartWeek = currentOrFutureWeeks[0] || weekOptions[0] || '';
        }

        if (effectiveStartWeek) {
            filtered = filtered.filter(a => a.weekId >= effectiveStartWeek);
        }
        
        if(endWeek) filtered = filtered.filter(a => a.weekId <= endWeek);
        if(person) filtered = filtered.filter(a => a.participant === person || a.helper === person);
        if(assignmentType) filtered = filtered.filter(a => a.partTitle === assignmentType);
        setFilteredAssignments(filtered);
    }, [startWeek, endWeek, person, assignmentType, allAssignments, weekOptions]);
    
    const handleShare = async (slipId: string) => {
        if (!navigator.share) {
            alert('La función de compartir no está disponible en este navegador.');
            return;
        }

        if (filesToShare[slipId]) {
            try {
                if (navigator.canShare && navigator.canShare({ files: [filesToShare[slipId]] })) {
                    await navigator.share({
                        files: [filesToShare[slipId]],
                        title: 'Asignación VMT',
                        text: 'Aquí está tu asignación para la reunión.'
                    });
                } else {
                    alert('Este navegador no soporta el compartir archivos.');
                }
            } catch (error) {
                // Ignore abort errors
            }
            return;
        }
    
        setLoadingSlipId(slipId);
    
        try {
            const element = document.querySelector(`.report-slip[data-slip-id="${slipId}"]`) as HTMLElement;
            if (!element || typeof html2canvas !== 'function') {
                throw new Error('No se pudo encontrar el elemento para compartir o la librería de captura no está cargada.');
            }
    
            const elementToCapture = element.cloneNode(true) as HTMLElement;
            const shareButton = elementToCapture.querySelector('.share-button');
            if (shareButton) shareButton.remove();
    
            elementToCapture.style.position = 'absolute';
            elementToCapture.style.left = '-9999px';
            elementToCapture.style.top = '0px';
            elementToCapture.style.width = `${element.offsetWidth}px`;
            document.body.appendChild(elementToCapture);
    
            const canvas = await html2canvas(elementToCapture, { useCORS: true, scale: 5 });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            document.body.removeChild(elementToCapture);
    
            if (!blob) {
                throw new Error('No se pudo generar la imagen a partir del canvas.');
            }
    
            const file = new File([blob], 'asignacion.png', { type: 'image/png' });
            setFilesToShare(prev => ({ ...prev, [slipId]: file }));
    
        } catch (error) {
            console.error("Error al generar imagen:", error);
            alert('Ocurrió un error al generar la imagen para compartir.');
        } finally {
            setLoadingSlipId(null);
        }
    };
    
    const handleClearFilters = () => {
        setStartWeek('');
        setEndWeek('');
        setPerson('');
        setAssignmentType('');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita las ventanas emergentes para imprimir.');
            return;
        }

        const slipsPerPage = 8;
        const pages = [];
        for (let i = 0; i < filteredAssignments.length; i += slipsPerPage) {
            const chunk = filteredAssignments.slice(i, i + slipsPerPage);
            const pageSlipsHTML = chunk.map(createPrintSlipHTML).join('');
            pages.push(`<div class="print-page">${pageSlipsHTML}</div>`);
        }
        const allPagesHTML = pages.join('');
        
        printWindow.document.write(`
            <!DOCTYPE html><html lang="es">
            <head><title>Imprimir Asignaciones (S-89)</title><style>${printStyles}</style></head>
            <body>${allPagesHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handleDownloadPdf = () => {
        if (typeof html2pdf === 'undefined') {
            alert('La función de descarga no está disponible. Por favor, recargue la página.');
            return;
        }
        setIsDownloadingPdf(true);
    
        const slipsPerPage = 8;
        const pages = [];
        for (let i = 0; i < filteredAssignments.length; i += slipsPerPage) {
            const chunk = filteredAssignments.slice(i, i + slipsPerPage);
            const pageSlipsHTML = chunk.map(createPrintSlipHTML).join('');
            pages.push(`<div class="preview-page-wrapper"><div class="print-page">${pageSlipsHTML}</div></div>`);
        }
        const allPagesHTML = pages.join('');
        
        const previewHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>${printStyles}</style>
                <style>
                    body { 
                        background-color: #e2e8f0; 
                        margin: 0; 
                        padding: 20px 0; 
                        display: flex;
                        justify-content: center;
                    }
                    .scale-wrapper {
                        /* use zoom to scale the entire container without breaking layout width */
                        zoom: 0.9;
                    }
                    .preview-page-wrapper {
                        width: 29.7cm;
                        height: 21.0cm;
                        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
                        margin-bottom: 24px;
                        background: white;
                        margin-left: auto;
                        margin-right: auto;
                    }
                    /* Responsive zoom for smaller screens */
                    @media (max-width: 1200px) { .scale-wrapper { zoom: 0.8; } }
                    @media (max-width: 1000px) { .scale-wrapper { zoom: 0.6; } }
                    @media (max-width: 768px) { .scale-wrapper { zoom: 0.45; } }
                    @media (max-width: 480px) { .scale-wrapper { zoom: 0.3; } }
                </style>
            </head>
            <body>
                <div class="scale-wrapper">
                    ${allPagesHTML}
                </div>
            </body>
            </html>
        `;
        
        setPdfPreviewHtml(previewHtml);
        setShowPdfPreviewModal(true);
    
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '29.7cm';
        container.style.backgroundColor = 'white';
        
        const styleElement = document.createElement('style');
        styleElement.innerHTML = printStyles;
        
        // Re-generate without scaling for the actual PDF
        const pdfPages = [];
        for (let i = 0; i < filteredAssignments.length; i += slipsPerPage) {
            const chunk = filteredAssignments.slice(i, i + slipsPerPage);
            const pageSlipsHTML = chunk.map(createPrintSlipHTML).join('');
            pdfPages.push(`<div class="print-page">${pageSlipsHTML}</div>`);
        }
        
        const content = document.createElement('div');
        content.style.width = '29.7cm';
        content.innerHTML = pdfPages.join('');
        
        content.appendChild(styleElement);
        container.appendChild(content);
        document.body.appendChild(container);
    
        const opt = {
            margin: 0,
            filename: 'asignaciones_vmt.pdf',
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 3, useCORS: true, logging: false, letterRendering: true },
            jsPDF: { unit: 'cm', format: 'a4', orientation: 'landscape', compress: true },
            pagebreak: { mode: ['css', 'legacy'] }
        };
    
        html2pdf().from(content).set(opt).output('blob').then((pdfBlob: Blob) => {
            const url = URL.createObjectURL(pdfBlob);
            setPdfPreviewBlob(pdfBlob);
            setPdfPreviewUrl(url);
            setIsDownloadingPdf(false);
            document.body.removeChild(container);
        }).catch((err: any) => {
            console.error("PDF generation failed:", err);
            alert('Ocurrió un error al generar el PDF.');
            setIsDownloadingPdf(false);
            document.body.removeChild(container);
        });
    };


    return (
        <div id="reports-container" className="container mx-auto px-4 py-8">
            <h2 className="page-title">
                Generador de Hojas S-89
                {restrictedGroupId && <span style={{fontSize:'0.5em', verticalAlign:'middle', backgroundColor:'#ef4444', color:'white', padding:'2px 6px', borderRadius:'4px', marginLeft:'8px'}}>Grupo Restringido</span>}
            </h2>
             
            {/* Mobile Filter Toggle */}
            <div className="md:hidden mb-4">
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="mobile-filters-toggle-btn"
                >
                    <i className={`fas fa-${showFilters ? 'times' : 'filter'} mr-2`}></i>
                    {showFilters ? 'Ocultar Filtros' : 'Filtrar Asignaciones'}
                </button>
            </div>

            <div className={`reports-filters ${showFilters ? 'active' : ''}`}>
                <div className="filter-grid">
                    <div className="filter-item">
                        <label htmlFor="report-week-start">Desde:</label>
                        <select id="report-week-start" value={startWeek} onChange={e => setStartWeek(e.target.value)}>
                            <option value="">-- Inicio --</option>
                            {renderGroupedWeekOptions(weekOptions.slice().reverse())}
                        </select>
                    </div>
                    <div className="filter-item">
                        <label htmlFor="report-week-end">Hasta:</label>
                        <select id="report-week-end" value={endWeek} onChange={e => setEndWeek(e.target.value)}>
                             <option value="">-- Fin --</option>
                            {renderGroupedWeekOptions(weekOptions.filter(w => w >= startWeek).slice().reverse())}
                        </select>
                    </div>
                    <div className="filter-item">
                        <label htmlFor="report-person-filter">Seleccionar participante:</label>
                        <select id="report-person-filter" value={person} onChange={e => setPerson(e.target.value)}>
                            <option value="">-- {allowedParticipants ? 'Participantes del Grupo' : 'Todos los participantes'} --</option>
                            {personOptions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="filter-item">
                        <label htmlFor="report-assignment-filter">Tipo de asignación:</label>
                        <select id="report-assignment-filter" value={assignmentType} onChange={e => setAssignmentType(e.target.value)}>
                           <option value="">-- Todas las asignaciones --</option>
                           {assignmentOptions.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>
                <div className="filter-actions">
                    <button onClick={handleClearFilters} className="btn-clear-filters">Limpiar</button>
                    <div className="action-buttons-group flex items-center gap-2">
                        {/* <button onClick={handlePrint} className="button-print"><i className="fas fa-print"></i></button> */}
                        <button onClick={handleDownloadPdf} className="download-button bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-75 disabled:cursor-wait" disabled={isDownloadingPdf}>
                            {isDownloadingPdf ? <i className="fas fa-spinner fa-spin text-lg"></i> : <i className="fas fa-file-pdf text-lg"></i>}
                            <span>Descargar</span>
                        </button>
                    </div>
                </div>
            </div>

            <p className="filter-note">
                <i className="fas fa-info-circle mr-1"></i> Se muestran asignaciones desde esta semana en adelante.
            </p>

            <div id="reports-output">
                {filteredAssignments.map((a, i) => {
                     const slipId = `slip-${a.weekId}-${i}`;
                     return (
                         <div key={slipId} data-slip-id={slipId} className="report-slip">
                            <h3>ASIGNACIÓN S-89</h3>
                            
                            <div className="slip-main-content">
                                <div className="report-field highlight">
                                    <span className="label-text">Nombre:</span> 
                                    <span className="value-text">{a.participant}</span>
                                    {a.intendedFor === 'participant' && (
                                        <i className="fas fa-check-circle text-green-500 ml-2"></i>
                                    )}
                                </div>
                                <div className="report-field">
                                    <span className="label-text">Ayudante:</span> 
                                    <span className="value-text">{a.helper || 'Ninguno'}</span>
                                    {a.intendedFor === 'helper' && a.helper && (
                                         <i className="fas fa-check-circle text-green-500 ml-2"></i>
                                    )}
                                </div>
                                <div className="report-field">
                                    <span className="label-text">Fecha:</span> 
                                    <span className="value-text date-value">{getFridayFromWeekId(a.weekId, 'long')}</span>
                                </div>
                                <div className="report-field full-width">
                                    <span className="label-text">Intervención:</span> 
                                    <span className="value-text part-title">{a.partTitle}</span>
                                </div>
                            </div>

                            <div className="rooms">
                                <label className={`room-pill ${a.room === 'main' ? 'active' : ''}`}>
                                    <i className="fas fa-users"></i> Principal
                                </label>
                                <label className={`room-pill ${a.room === 'aux2' ? 'active' : ''}`}>
                                    <i className="fas fa-chalkboard-teacher"></i> Sala 2
                                </label>
                                <label className={`room-pill ${a.room === 'aux3' ? 'active' : ''}`}>
                                    <i className="fas fa-chalkboard-teacher"></i> Sala 3
                                </label>
                            </div>

                            <div className="footer-note">
                                <p>S-89-S 11/23</p>
                            </div>
                            
                            <button onClick={() => handleShare(slipId)} className="share-button" disabled={loadingSlipId === slipId}>
                                {loadingSlipId === slipId
                                    ? <i className="fas fa-spinner fa-spin"></i>
                                    : filesToShare[slipId]
                                        ? <i className="fas fa-paper-plane"></i>
                                        : <i className="fab fa-whatsapp"></i>
                                }
                                <span>{filesToShare[slipId] ? 'Enviar' : 'Compartir'}</span>
                            </button>
                        </div>
                     )
                })}
            </div>

            {showPdfPreviewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Vista Previa de PDF</h3>
                            <button onClick={() => setShowPdfPreviewModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div className="p-0 flex-1 overflow-auto bg-slate-200 flex flex-col items-center">
                            {pdfPreviewHtml ? (
                                <iframe 
                                    srcDoc={pdfPreviewHtml} 
                                    className="w-full h-[60vh] border-0" 
                                    title="PDF Preview"
                                    sandbox="allow-same-origin allow-scripts"
                                ></iframe>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full p-8">
                                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                    <p className="text-slate-500 font-medium">Generando vista previa...</p>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-end bg-white">
                            <button 
                                onClick={() => setShowPdfPreviewModal(false)}
                                className="px-5 py-2.5 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handlePrint}
                                className="px-5 py-2.5 rounded-lg font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-print"></i>
                                Imprimir
                            </button>
                            <button 
                                onClick={() => {
                                    if (pdfPreviewUrl) {
                                        const link = document.createElement('a');
                                        link.href = pdfPreviewUrl;
                                        link.download = 'asignaciones_vmt.pdf';
                                        link.click();
                                    }
                                }}
                                className="px-5 py-2.5 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-file-download"></i>
                                Descargar PDF
                            </button>
                            <button 
                                onClick={async () => {
                                    if (pdfPreviewBlob && navigator.share) {
                                        try {
                                            const file = new File([pdfPreviewBlob], 'asignaciones_vmt.pdf', { type: 'application/pdf' });
                                            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                                await navigator.share({
                                                    files: [file],
                                                    title: 'Asignaciones VMT',
                                                    text: 'Aquí están las asignaciones en formato PDF.'
                                                });
                                            } else {
                                                alert('Este navegador no soporta el compartir archivos PDF.');
                                            }
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    } else {
                                        alert('Su navegador no soporta la función de compartir integrada.');
                                    }
                                }}
                                className="px-5 py-2.5 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <i className="fab fa-whatsapp"></i>
                                Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Informes;
