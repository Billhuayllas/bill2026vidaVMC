import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { fetchAllRows } from '../../lib/supabasePagination';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { printHtmlDocument, downloadHtmlAsPdf } from './printUtils';
import { 
    generateCardPagesArray, 
    generateCardsHtml, 
    S21Config, 
    getSavedS21Config, 
    saveS21Config, 
    resetS21Config 
} from './s21CardGenerator';
import { S21ConfigDrawer } from './S21ConfigDrawer';
import { Eye, Printer, Download, FileText, Loader2, X, SlidersHorizontal } from 'lucide-react';


interface BulkCardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    groups: any[];
    masterPublishers: any[];
    globalMembers: any[];
    defaultServiceYear?: number;
    initialRoleFilter?: string;
    filteredPublisherNames?: string[];
}

export const BulkCardsModal: React.FC<BulkCardsModalProps> = ({
    isOpen,
    onClose,
    groups,
    masterPublishers,
    globalMembers,
    defaultServiceYear = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
    initialRoleFilter = 'todos',
    filteredPublisherNames
}) => {
    const [selectedGroupId, setSelectedGroupId] = useState<string>('todos');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>(
        filteredPublisherNames && filteredPublisherNames.length > 0
            ? 'actual'
            : (initialRoleFilter || 'todos')
    );
    const [serviceYear, setServiceYear] = useState<number>(defaultServiceYear);
    const [cardsPerPage, setCardsPerPage] = useState<'2' | '1'>('2');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [showParamDrawer, setShowParamDrawer] = useState<boolean>(false);
    const [s21Config, setS21Config] = useState<S21Config>(() => getSavedS21Config(cardsPerPage === '2'));
    const [previewModalData, setPreviewModalData] = useState<{
        isOpen: boolean;
        pages: string[];
        title: string;
        fileName: string;
        layoutLabel: string;
    } | null>(null);

    useEffect(() => {
        setS21Config(getSavedS21Config(cardsPerPage === '2'));
    }, [cardsPerPage]);

    const handleRegeneratePreviewPages = async (customConfig: S21Config) => {
        const activePublishers = getFilteredPublishers();
        const reportsData = await fetchReportsForServiceYear();
        return generateCardPagesArray(activePublishers, reportsData || [], globalMembers, cardsPerPage, serviceYear, customConfig);
    };


    useEffect(() => {
        if (isOpen) {
            if (filteredPublisherNames && filteredPublisherNames.length > 0) {
                setSelectedRoleFilter('actual');
            } else if (initialRoleFilter && initialRoleFilter !== 'todos') {
                setSelectedRoleFilter(initialRoleFilter);
            } else {
                setSelectedRoleFilter('todos');
            }
            if (defaultServiceYear) {
                setServiceYear(defaultServiceYear);
            }
        }
    }, [isOpen, initialRoleFilter, filteredPublisherNames, defaultServiceYear]);

    if (!isOpen) return null;

    const getFilteredPublishers = () => {
        return masterPublishers
            .filter(p => p.clasificacion_vmt !== 'estudiante_vmt')
            .filter(p => {
                // Group filter
                if (selectedGroupId && selectedGroupId !== 'todos') {
                    const memberRow = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
                    if (!memberRow || String(memberRow.grupo_id) !== String(selectedGroupId)) {
                        return false;
                    }
                }

                // Role / Current selection filter
                if (selectedRoleFilter === 'actual' && filteredPublisherNames && filteredPublisherNames.length > 0) {
                    return filteredPublisherNames.some(name => name.trim().toLowerCase() === p.nombre.trim().toLowerCase());
                }

                if (selectedRoleFilter && selectedRoleFilter !== 'todos' && selectedRoleFilter !== 'actual') {
                    const memberRow = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
                    const role = (memberRow?.rol || p.rol || 'Publicador').toLowerCase();

                    if (selectedRoleFilter === 'anciano') return role.includes('anciano');
                    if (selectedRoleFilter === 'siervo') return role.includes('siervo ministerial') || role.includes('siervo');
                    if (selectedRoleFilter === 'precursor regular') return role.includes('precursor regular');
                    if (selectedRoleFilter === 'precursor especial') return role.includes('precursor especial');
                    if (selectedRoleFilter === 'inactivo') return role.includes('inactivo');
                }

                return true;
            });
    };

    const getDocumentInfo = () => {
        const groupName = selectedGroupId === 'todos' 
            ? 'Todos' 
            : (groups.find(g => String(g.id) === String(selectedGroupId))?.nombre?.replace(/\s+/g, '_') || 'Grupo');

        let filterSlug = 'General';
        if (selectedRoleFilter === 'actual') filterSlug = 'Filtrados';
        else if (selectedRoleFilter === 'precursor regular') filterSlug = 'Precursores_Regulares';
        else if (selectedRoleFilter === 'precursor especial') filterSlug = 'Precursores_Especiales';
        else if (selectedRoleFilter === 'anciano') filterSlug = 'Ancianos';
        else if (selectedRoleFilter === 'siervo') filterSlug = 'Siervos';
        else if (selectedRoleFilter === 'inactivo') filterSlug = 'Inactivos';

        const layoutSlug = cardsPerPage === '2' ? '2en1' : '1en1';
        const fileName = `Tarjetas_S21_${filterSlug}_${groupName}_${serviceYear}_${layoutSlug}.pdf`;
        const title = `Tarjetas S-21 (${cardsPerPage === '2' ? 'Formato 2 en 1' : 'Formato Individual'}) - ${serviceYear}`;

        return { groupName, filterSlug, layoutSlug, fileName, title };
    };

    const fetchReportsForServiceYear = async () => {
        const startMonth = `${serviceYear - 1}-09`;
        const endMonth = `${serviceYear}-08`;

        return await fetchAllRows(async (start, end) => {
            return await supabase
                .from('informes_ministerio')
                .select('*')
                .gte('mes', startMonth)
                .lte('mes', endMonth)
                .order('mes', { ascending: true })
                .range(start, end);
        });
    };

    const handleOpenPreview = async () => {
        const activePublishers = getFilteredPublishers();
        if (activePublishers.length === 0) {
            alert('No se encontraron publicadores para los filtros seleccionados.');
            return;
        }

        setIsGenerating(true);
        setStatusMessage('Cargando datos para previsualización...');
        try {
            const reportsData = await fetchReportsForServiceYear();
            const pages = generateCardPagesArray(activePublishers, reportsData || [], globalMembers, cardsPerPage, serviceYear, s21Config);
            const { fileName, title, layoutSlug } = getDocumentInfo();

            setPreviewModalData({
                isOpen: true,
                pages,
                title,
                fileName,
                layoutLabel: cardsPerPage === '2' ? '2 por Hoja A4' : '1 por Hoja A4'
            });
        } catch (err) {
            console.error("Error loading preview:", err);
            alert("Error al cargar la vista previa. Intente de nuevo.");
        } finally {
            setIsGenerating(false);
            setStatusMessage('');
        }
    };

    const handleGeneratePdf = async () => {
        const activePublishers = getFilteredPublishers();
        if (activePublishers.length === 0) {
            alert('No se encontraron publicadores para los filtros seleccionados.');
            return;
        }

        setIsGenerating(true);
        setStatusMessage('Obteniendo datos de publicadores...');

        try {
            const reportsData = await fetchReportsForServiceYear();
            setStatusMessage('Renderizando páginas PDF de alta calidad...');

            const cardsHtml = generateCardsHtml(activePublishers, reportsData || [], globalMembers, cardsPerPage, serviceYear, s21Config);
            const { fileName } = getDocumentInfo();

            await downloadHtmlAsPdf(cardsHtml, fileName, (msg) => setStatusMessage(msg));

            setStatusMessage('¡Descarga completada con éxito!');
            setTimeout(() => {
                setIsGenerating(false);
                setStatusMessage('');
                onClose();
            }, 1200);
        } catch (err) {
            console.error("Error in bulk card generation:", err);
            alert("Ocurrió un error al generar las tarjetas en lote. Por favor intente nuevamente.");
            setIsGenerating(false);
            setStatusMessage('');
        }
    };

    const handlePrintDirect = async () => {
        const activePublishers = getFilteredPublishers();
        if (activePublishers.length === 0) {
            alert('No se encontraron publicadores para los filtros seleccionados.');
            return;
        }

        setIsGenerating(true);
        setStatusMessage('Preparando vista de impresión sin cortes...');

        try {
            const reportsData = await fetchReportsForServiceYear();
            const cardsHtml = generateCardsHtml(activePublishers, reportsData || [], globalMembers, cardsPerPage, serviceYear, s21Config);
            const { title } = getDocumentInfo();

            printHtmlDocument(cardsHtml, title);

            setTimeout(() => {
                setIsGenerating(false);
                setStatusMessage('');
            }, 1000);
        } catch (e) {
            console.error("Error direct print:", e);
            alert("Ocurrió un error al preparar la impresión.");
            setIsGenerating(false);
            setStatusMessage('');
        }
    };


    const activeFilteredList = getFilteredPublishers();
    const activeCount = activeFilteredList.length;

    // Counts for options
    const nonStudents = masterPublishers.filter(p => p.clasificacion_vmt !== 'estudiante_vmt');
    const regularCount = nonStudents.filter(p => {
        const m = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
        return (m?.rol || p.rol || '').toLowerCase().includes('precursor regular');
    }).length;
    const elderCount = nonStudents.filter(p => {
        const m = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
        return (m?.rol || p.rol || '').toLowerCase().includes('anciano');
    }).length;
    const msCount = nonStudents.filter(p => {
        const m = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
        const r = (m?.rol || p.rol || '').toLowerCase();
        return r.includes('siervo ministerial') || r.includes('siervo');
    }).length;
    const specialCount = nonStudents.filter(p => {
        const m = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
        return (m?.rol || p.rol || '').toLowerCase().includes('precursor especial');
    }).length;
    const inactiveCount = nonStudents.filter(p => {
        const m = globalMembers.find(gm => gm.publicador_nombre.trim().toLowerCase() === p.nombre.trim().toLowerCase());
        return (m?.rol || p.rol || '').toLowerCase().includes('inactivo');
    }).length;

    const modalContent = (
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
                {/* Modal Header */}
                <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-lg text-white">Descarga Masiva de Tarjetas S-21</h3>
                            <p className="text-xs text-slate-300">Formato oficial S-21-S (11/23) limpio</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800 flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <strong className="block font-bold mb-0.5">Exportación fiel y optimizada:</strong>
                            Genera las tarjetas oficiales S-21 con el desglose anual. El modo <strong>2 en 1</strong> ahorra el 50% de papel imprimiendo dos tarjetas listas por página A4 con línea de corte.
                        </div>
                    </div>

                    {/* Filter by Role / Active Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">
                            Filtro por Nombramiento / Padrón
                        </label>
                        <select
                            value={selectedRoleFilter}
                            onChange={(e) => setSelectedRoleFilter(e.target.value)}
                            disabled={isGenerating}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            {filteredPublisherNames && filteredPublisherNames.length > 0 && (
                                <option value="actual">
                                    📋 Selección actual en pantalla ({filteredPublisherNames.length} publicadores)
                                </option>
                            )}
                            <option value="todos">👥 Todos los Publicadores ({nonStudents.length})</option>
                            <option value="precursor regular">🏃 Solo Precursores Regulares ({regularCount})</option>
                            <option value="anciano">👔 Solo Ancianos ({elderCount})</option>
                            <option value="siervo">🤝 Solo Siervos Ministeriales ({msCount})</option>
                            <option value="precursor especial">🎖️ Solo Precursores Especiales ({specialCount})</option>
                            <option value="inactivo">⛔ Solo Inactivos ({inactiveCount})</option>
                        </select>
                    </div>

                    {/* Filter by Group */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">
                            Grupo de Servicio
                        </label>
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            disabled={isGenerating}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="todos">Todos los Grupos</option>
                            {groups.map(g => {
                                const countInGroup = globalMembers.filter(m => String(m.grupo_id) === String(g.id)).length;
                                return (
                                    <option key={g.id} value={g.id}>
                                        {g.nombre} ({countInGroup} publicadores)
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Format Layout: 2 in 1 vs 1 per page */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">
                            Formato de Impresión / Distribución
                        </label>
                        <select
                            value={cardsPerPage}
                            onChange={(e) => setCardsPerPage(e.target.value as '2' | '1')}
                            disabled={isGenerating}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            <option value="2">📄 2 Tarjetas por Hoja (2 en 1 - A4) [Recomendado / Ahorra Papel]</option>
                            <option value="1">📄 1 Tarjeta por Hoja (A4 Completa)</option>
                        </select>
                    </div>

                    {/* Service Year */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 tracking-wider">
                            Año de Servicio
                        </label>
                        <select
                            value={serviceYear}
                            onChange={(e) => setServiceYear(parseInt(e.target.value, 10))}
                            disabled={isGenerating}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                            {Array.from({ length: 5 }, (_, i) => defaultServiceYear - 2 + i).map(y => (
                                <option key={y} value={y}>Año de Servicio {y} (Sep {y - 1} - Ago {y})</option>
                            ))}
                        </select>
                    </div>

                    {/* Summary badge */}
                    <div className="flex items-center justify-between p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <i className="fas fa-id-card text-indigo-600"></i>
                            <span className="uppercase">Tarjetas a generar:</span>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-extrabold text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-200 shadow-sm inline-block">
                                {activeCount} {activeCount === 1 ? 'Tarjeta' : 'Tarjetas'} ({Math.ceil(activeCount / (cardsPerPage === '2' ? 2 : 1))} {Math.ceil(activeCount / (cardsPerPage === '2' ? 2 : 1)) === 1 ? 'hoja A4' : 'hojas A4'})
                            </span>
                        </div>
                    </div>

                    {statusMessage && (
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                            <div className="flex items-center justify-center gap-2 text-indigo-700 font-bold text-xs">
                                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <span>{statusMessage}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                    <div className="flex items-center gap-2 order-4 sm:order-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isGenerating}
                            className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200/60 transition-colors text-center"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowParamDrawer(true)}
                            className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300/80 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                            title="Administrar parámetros de diseño S-21 (alturas, letra y cuadrícula)"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                            <span>Parámetros</span>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 order-1 sm:order-2">
                        <button
                            type="button"
                            onClick={handleOpenPreview}
                            disabled={isGenerating}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isGenerating && statusMessage.includes('previsualización') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Eye className="w-4 h-4" />
                            )}
                            <span>Previsualizar</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePrintDirect}
                            disabled={isGenerating}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Imprimir Todas</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleGeneratePdf}
                            disabled={isGenerating}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-rose-300/50 transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-700 disabled:opacity-50"
                        >
                            {isGenerating && !statusMessage.includes('previsualización') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span>Descargar PDF Masivo</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Document Preview Modal */}
            {previewModalData && (
                <DocumentPreviewModal
                    isOpen={previewModalData.isOpen}
                    onClose={() => setPreviewModalData(null)}
                    title={previewModalData.title}
                    fileName={previewModalData.fileName}
                    pagesHtml={previewModalData.pages}
                    layoutLabel={previewModalData.layoutLabel}
                    subtitle={`Vista previa de ${activeCount} tarjetas S-21 (${cardsPerPage === '2' ? '2 tarjetas por página A4' : '1 tarjeta por página A4'})`}
                    isS21={true}
                    onRegeneratePages={handleRegeneratePreviewPages}
                />
            )}

            {/* S-21 Parameter Config Drawer */}
            <S21ConfigDrawer
                isOpen={showParamDrawer}
                onClose={() => setShowParamDrawer(false)}
                config={s21Config}
                isTwoInOne={cardsPerPage === '2'}
                onChangeConfig={(newCfg) => {
                    setS21Config(newCfg);
                    saveS21Config(newCfg, cardsPerPage === '2');
                }}
                onResetDefaults={() => {
                    const defaults = resetS21Config(cardsPerPage === '2');
                    setS21Config(defaults);
                }}
            />
        </div>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
};

