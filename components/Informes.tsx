import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getFridayFromWeekId } from '../lib/utils';
import { useCongregation } from '../lib/CongregationContext';
import { useProgramData } from '../lib/useProgramData';
import html2canvas from 'html2canvas';
import { 
    generatePrintHtml, 
    generatePdfBlob, 
    createWhatsAppSummary, 
    PrintAssignment 
} from './InformesPrintTemplate';

type Assignment = PrintAssignment;

interface InformesProps {
    restrictedGroupId?: number | null;
}

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
    
    // Individual Slip sharing
    const [loadingSlipId, setLoadingSlipId] = useState<string | null>(null);
    const [filesToShare, setFilesToShare] = useState<{ [slipId: string]: File }>({});

    // Modal & PDF Generation State
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [pdfStatusMessage, setPdfStatusMessage] = useState('');
    const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
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

        let effectiveStartWeek = startWeek;
        if (!effectiveStartWeek && weekOptions.length > 0) {
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const currentOrFutureWeeks = weekOptions.filter(w => {
                const weekDate = new Date(w);
                const diffTime = today.getTime() - weekDate.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                return diffDays <= 7;
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
    
    // Compartir hoja S-89 individual como imagen
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
            if (!element) {
                throw new Error('No se pudo encontrar el elemento para compartir.');
            }
    
            const elementToCapture = element.cloneNode(true) as HTMLElement;
            const shareButton = elementToCapture.querySelector('.share-button');
            if (shareButton) shareButton.remove();
    
            elementToCapture.style.position = 'absolute';
            elementToCapture.style.left = '-9999px';
            elementToCapture.style.top = '0px';
            elementToCapture.style.width = `${element.offsetWidth}px`;
            document.body.appendChild(elementToCapture);
    
            const canvas = await html2canvas(elementToCapture, { useCORS: true, scale: 3 });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            document.body.removeChild(elementToCapture);
    
            if (!blob) {
                throw new Error('No se pudo generar la imagen a partir del canvas.');
            }
    
            const file = new File([blob], 'asignacion_s89.png', { type: 'image/png' });
            setFilesToShare(prev => ({ ...prev, [slipId]: file }));

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Asignación VMT',
                    text: 'Aquí está tu asignación para la reunión.'
                });
            }
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

    // Abre la ventana modal con la hoja A4 completa de 8 hojitas S-89
    const handleOpenPreviewModal = () => {
        if (filteredAssignments.length === 0) {
            alert('No hay asignaciones que coincidan con los filtros seleccionados.');
            return;
        }

        const previewHtml = generatePrintHtml(filteredAssignments, true);
        setPdfPreviewHtml(previewHtml);
        setShowPdfPreviewModal(true);
    };

    // Botón Imprimir: Envía a imprimir directamente la hoja A4 con formato landscape oficial
    const handlePrint = () => {
        if (filteredAssignments.length === 0) {
            alert('No hay asignaciones para imprimir.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita las ventanas emergentes para imprimir.');
            return;
        }

        const fullHtml = generatePrintHtml(filteredAssignments, false);
        printWindow.document.open();
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
        }, 400);
    };

    // Botón Descargar PDF: Genera y descarga el archivo PDF oficial con las 8 asignaciones por página A4 (con jsPDF + html2canvas sin salir vacío)
    const handleDownloadPdf = async () => {
        if (filteredAssignments.length === 0) {
            alert('No hay asignaciones para descargar.');
            return;
        }

        try {
            setIsDownloadingPdf(true);
            setPdfStatusMessage('Preparando generación...');

            const { blob, doc } = await generatePdfBlob(filteredAssignments, (msg) => {
                setPdfStatusMessage(msg);
            });

            setPdfPreviewBlob(blob);

            // Generamos un nombre descriptivo para el archivo PDF
            const congName = currentCongregation?.nombre ? `_${currentCongregation.nombre.replace(/\s+/g, '_')}` : '';
            const filename = `Asignaciones_S89${congName}.pdf`;

            doc.save(filename);
        } catch (error: any) {
            console.error("Error al generar PDF:", error);
            alert(error.message || 'Ocurrió un error al generar el PDF.');
        } finally {
            setIsDownloadingPdf(false);
            setPdfStatusMessage('');
        }
    };

    // Botón Enviar: Abre WhatsApp con el resumen de todas las asignaciones seleccionadas
    const handleShareWhatsApp = async () => {
        if (filteredAssignments.length === 0) {
            alert('No hay asignaciones seleccionadas para compartir.');
            return;
        }

        const summaryText = createWhatsAppSummary(filteredAssignments, currentCongregation?.nombre);
        
        // Si el usuario está en un dispositivo móvil y desea compartir texto por WhatsApp
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`;
        window.open(whatsappUrl, '_blank');
    };

    const totalPages = Math.ceil(filteredAssignments.length / 8) || 1;

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
                <div className="filter-actions flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button onClick={handleClearFilters} className="btn-clear-filters">
                        <i className="fas fa-undo mr-1.5 text-xs"></i> Limpiar
                    </button>
                    <div className="action-buttons-group flex items-center gap-2">
                        <button 
                            onClick={handleOpenPreviewModal} 
                            className="download-button bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                        >
                            <i className="fas fa-file-pdf text-base"></i>
                            <span>Imprimir / Guardar PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            <p className="filter-note">
                <i className="fas fa-info-circle mr-1"></i> Se muestran asignaciones desde esta semana en adelante ({filteredAssignments.length} asignaciones encontradas).
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

            {/* Ventana Modal con la hoja A4 completa de 8 hojitas S-89 */}
            {showPdfPreviewModal && (
                <div className="fixed inset-0 z-[10008] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg flex items-center gap-2 m-0">
                                    <i className="fas fa-file-pdf text-indigo-600 dark:text-indigo-400"></i>
                                    <span>Vista Previa - Hojas S-89 (A4)</span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                                    {filteredAssignments.length} asignación(es) • {totalPages} página(s) A4 (8 hojitas por página)
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowPdfPreviewModal(false)} 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Cerrar vista previa"
                            >
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        {/* Body Preview */}
                        <div className="p-2 sm:p-4 flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex flex-col items-center">
                            {pdfPreviewHtml ? (
                                <iframe 
                                    srcDoc={pdfPreviewHtml} 
                                    className="w-full h-[62vh] rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm bg-white" 
                                    title="Vista Previa Hojas S-89"
                                    sandbox="allow-same-origin allow-scripts"
                                ></iframe>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full p-8">
                                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                                    <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">Cargando vista previa...</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Action Buttons */}
                        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5 bg-slate-50 dark:bg-slate-850">
                            {/* 1. Cancelar */}
                            <button 
                                type="button"
                                onClick={() => setShowPdfPreviewModal(false)}
                                className="px-4 py-2.5 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer text-sm"
                            >
                                Cancelar
                            </button>

                            {/* 2. Imprimir */}
                            <button 
                                type="button"
                                onClick={handlePrint}
                                className="px-4 py-2.5 rounded-xl font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer text-sm"
                            >
                                <i className="fas fa-print text-indigo-600 dark:text-indigo-400"></i>
                                <span>Imprimir</span>
                            </button>

                            {/* 3. Descargar PDF */}
                            <button 
                                type="button"
                                onClick={handleDownloadPdf}
                                disabled={isDownloadingPdf}
                                className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait text-sm"
                            >
                                {isDownloadingPdf ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        <span>{pdfStatusMessage || 'Generando PDF...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-download"></i>
                                        <span>Descargar PDF</span>
                                    </>
                                )}
                            </button>

                            {/* 4. Enviar */}
                            <button 
                                type="button"
                                onClick={handleShareWhatsApp}
                                className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                                title="Enviar resumen por WhatsApp"
                            >
                                <i className="fab fa-whatsapp text-base"></i>
                                <span>Enviar</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Informes;
