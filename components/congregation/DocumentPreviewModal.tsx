import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    Printer, 
    Download, 
    ChevronLeft, 
    ChevronRight, 
    ZoomIn, 
    ZoomOut, 
    Maximize2, 
    Eye, 
    FileText,
    Loader2,
    CheckCircle2,
    IdCard,
    ListFilter,
    MessageCircle,
    Share2,
    Sliders,
    MoveHorizontal,
    Shrink
} from 'lucide-react';
import { printHtmlDocument, downloadHtmlAsPdf } from './printUtils';
import { S21Config, getSavedS21Config, saveS21Config, resetS21Config } from './s21CardGenerator';
import { S21ConfigDrawer } from './S21ConfigDrawer';

export interface DocumentPreviewVariant {
    id: string;
    label: string;
    icon?: 'table' | 'cards' | 'file';
    title: string;
    fileName: string;
    pages: string[];
    layoutLabel?: string;
    subtitle?: string;
    badgeCount?: number;
}

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fileName: string;
    pagesHtml: string[];
    layoutLabel?: string;
    subtitle?: string;
    variants?: DocumentPreviewVariant[];
    activeVariantId?: string;
    onVariantChange?: (variantId: string) => void;
    isS21?: boolean;
    onRegeneratePages?: (config: S21Config) => string[] | Promise<string[]>;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    isOpen,
    onClose,
    title: defaultTitle,
    fileName: defaultFileName,
    pagesHtml = [],
    layoutLabel: defaultLayoutLabel,
    subtitle: defaultSubtitle,
    variants,
    activeVariantId: propActiveVariantId,
    onVariantChange,
    isS21: propIsS21,
    onRegeneratePages
}) => {
    const [activeVariantId, setActiveVariantId] = useState<string>(() => {
        if (propActiveVariantId) return propActiveVariantId;
        if (variants && variants.length > 0) return variants[0].id;
        return 'default';
    });

    useEffect(() => {
        if (propActiveVariantId) {
            setActiveVariantId(propActiveVariantId);
        } else if (variants && variants.length > 0 && !variants.some(v => v.id === activeVariantId)) {
            setActiveVariantId(variants[0].id);
        }
    }, [propActiveVariantId, variants]);

    const currentVariant = variants?.find(v => v.id === activeVariantId);

    const activeTitle = currentVariant ? currentVariant.title : defaultTitle;
    const activeFileName = currentVariant ? currentVariant.fileName : defaultFileName;
    const activePages = currentVariant ? currentVariant.pages : pagesHtml;
    const activeLayoutLabel = currentVariant ? currentVariant.layoutLabel : defaultLayoutLabel;
    const activeSubtitle = currentVariant ? currentVariant.subtitle : defaultSubtitle;

    const isS21 = Boolean(
        propIsS21 || 
        (activeTitle && (activeTitle.includes('S-21') || activeTitle.includes('Registro de Publicador'))) ||
        (activeFileName && (activeFileName.includes('S21') || activeFileName.includes('Registro_'))) ||
        (activeLayoutLabel && activeLayoutLabel.includes('S-21'))
    );

    const isTwoInOne = !(activeLayoutLabel && (activeLayoutLabel.includes('1 en 1') || activeLayoutLabel.includes('1 por Hoja')));

    const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState<boolean>(false);
    const [s21Config, setS21Config] = useState<S21Config>(() => getSavedS21Config(isTwoInOne));
    const [dynamicPages, setDynamicPages] = useState<string[]>(activePages);

    useEffect(() => {
        setS21Config(getSavedS21Config(isTwoInOne));
    }, [isTwoInOne]);

    useEffect(() => {
        setDynamicPages(activePages);
    }, [activePages]);

    const handleChangeS21Config = async (newConfig: S21Config) => {
        setS21Config(newConfig);
        saveS21Config(newConfig, isTwoInOne);
        if (onRegeneratePages) {
            try {
                const refreshed = await onRegeneratePages(newConfig);
                if (refreshed && refreshed.length > 0) {
                    setDynamicPages(refreshed);
                }
            } catch (e) {
                console.error("Error regenerating pages with new config:", e);
            }
        }
    };

    const handleResetDefaults = async () => {
        const defaults = resetS21Config(isTwoInOne);
        setS21Config(defaults);
        if (onRegeneratePages) {
            try {
                const refreshed = await onRegeneratePages(defaults);
                if (refreshed && refreshed.length > 0) {
                    setDynamicPages(refreshed);
                }
            } catch (e) {
                console.error("Error resetting pages with defaults:", e);
            }
        }
    };

    const getOptimalScale = () => {
        if (typeof window === 'undefined') return 0.85;
        const w = window.innerWidth;
        if (w < 400) return 0.40;
        if (w < 500) return 0.45;
        if (w < 640) return 0.55;
        if (w < 1024) return 0.75;
        return 0.85;
    };

    const [currentPage, setCurrentPage] = useState<number>(0);
    const [scale, setScale] = useState<number>(getOptimalScale);
    const [isPrinting, setIsPrinting] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [statusMsg, setStatusMsg] = useState<string>('');
    const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
    const containerRef = useRef<HTMLDivElement>(null);

    const safePages = dynamicPages || [];
    const totalPages = safePages.length;

    useEffect(() => {
        if (isOpen) {
            setCurrentPage(0);
            setScale(getOptimalScale());
            if (containerRef.current) {
                containerRef.current.scrollTop = 0;
                containerRef.current.scrollLeft = 0;
            }
        }
    }, [isOpen, activeVariantId]);

    // Touch pinch-to-zoom support for mobile devices
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let initialDistance = 0;
        let initialScale = scale;

        const getDistance = (touches: TouchList) => {
            if (touches.length < 2) return 0;
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                initialDistance = getDistance(e.touches);
                initialScale = scale;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && initialDistance > 0) {
                e.preventDefault();
                const currentDistance = getDistance(e.touches);
                const ratio = currentDistance / initialDistance;
                const newScale = Math.min(2.0, Math.max(0.15, Math.round(initialScale * ratio * 100) / 100));
                setScale(newScale);
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                initialDistance = 0;
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [scale, isOpen]);

    if (!isOpen || (totalPages === 0 && (!variants || variants.length === 0))) return null;

    const fullHtmlDocument = safePages.join('');

    const handlePrint = () => {
        setIsPrinting(true);
        setStatusMsg('Enviando a impresión...');
        try {
            printHtmlDocument(fullHtmlDocument, activeTitle);
            setTimeout(() => {
                setIsPrinting(false);
                setStatusMsg('');
            }, 1200);
        } catch (e) {
            console.error(e);
            setIsPrinting(false);
            setStatusMsg('');
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            await downloadHtmlAsPdf(fullHtmlDocument, activeFileName, (msg) => setStatusMsg(msg));
            setStatusMsg('¡PDF descargado con éxito!');
            setTimeout(() => {
                setIsDownloading(false);
                setStatusMsg('');
            }, 1500);
        } catch (e) {
            console.error(e);
            alert('Error al descargar el PDF.');
            setIsDownloading(false);
            setStatusMsg('');
        }
    };

    const handleShareWhatsApp = () => {
        const text = `📋 *${activeTitle}*\n📄 Archivo: ${activeFileName}\n📑 Páginas: ${totalPages}\n📅 Generado oficialmente desde el sistema.`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleZoomIn = () => setScale(prev => Math.min(2.0, Math.round((prev + 0.05) * 100) / 100));
    const handleZoomOut = () => setScale(prev => Math.max(0.15, Math.round((prev - 0.05) * 100) / 100));
    
    const handleFitWidth = () => {
        if (containerRef.current) {
            const containerWidth = containerRef.current.clientWidth;
            const availableWidth = Math.max(200, containerWidth - 24);
            const fitScale = Math.min(1.5, Math.max(0.15, Math.round((availableWidth / 794) * 100) / 100));
            setScale(fitScale);
        } else {
            setScale(getOptimalScale());
        }
    };

    const handleFitPage = () => {
        if (containerRef.current) {
            const containerHeight = containerRef.current.clientHeight;
            const availableHeight = Math.max(300, containerHeight - 40);
            const fitScale = Math.min(1.2, Math.max(0.15, Math.round((availableHeight / 1120) * 100) / 100));
            setScale(fitScale);
        } else {
            setScale(0.45);
        }
    };

    const handleResetZoom = () => {
        setScale(getOptimalScale());
    };

    const handleSwitchVariant = (vId: string) => {
        setActiveVariantId(vId);
        setCurrentPage(0);
        if (onVariantChange) onVariantChange(vId);
    };

    const modalContent = (
        <div 
            className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[99999] flex flex-col items-center justify-start sm:justify-center bg-slate-950/90 backdrop-blur-md p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
            style={{ overscrollBehavior: 'contain' }}
        >
            <div 
                className="bg-slate-900 border-0 sm:border sm:border-slate-700/80 rounded-none sm:rounded-2xl w-full h-[100dvh] sm:h-[94vh] max-h-[100dvh] sm:max-w-5xl flex flex-col shadow-2xl overflow-hidden text-slate-100"
                onClick={e => e.stopPropagation()}
            >
                
                {/* Header Bar */}
                <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-850/95 border-b border-slate-750 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-xs sm:text-base text-white tracking-tight truncate max-w-[200px] sm:max-w-md">{activeTitle}</h3>
                                {activeLayoutLabel && (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[9px] sm:text-[10px] font-bold rounded-full whitespace-nowrap">
                                        {activeLayoutLabel}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[220px] sm:max-w-md hidden xs:block">
                                {activeSubtitle || `Vista previa de impresión oficial (${totalPages} ${totalPages === 1 ? 'página' : 'páginas'})`}
                            </p>
                        </div>
                    </div>

                    {/* Document Variant Switcher Tabs (e.g. Lista / Padrón vs Tarjetas S-21) */}
                    {variants && variants.length > 1 && (
                        <div className="hidden md:flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-700 gap-1 shadow-inner">
                            {variants.map(v => {
                                const isActive = v.id === activeVariantId;
                                return (
                                    <button
                                        key={v.id}
                                        onClick={() => handleSwitchVariant(v.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            isActive 
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40' 
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                                        }`}
                                    >
                                        {v.id === 'cards' || v.icon === 'cards' ? (
                                            <IdCard className="w-3.5 h-3.5" />
                                        ) : (
                                            <ListFilter className="w-3.5 h-3.5" />
                                        )}
                                        <span>{v.label}</span>
                                        {v.pages && (
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                                isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                                            }`}>
                                                {v.pages.length}p
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {isS21 && (
                            <button
                                onClick={() => setIsConfigDrawerOpen(true)}
                                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                                title="Administrar parámetros de diseño S-21 (alturas, letra y cuadrícula)"
                            >
                                <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                                <span className="hidden sm:inline">Administrar parámetros</span>
                                <span className="sm:hidden">Parámetros</span>
                            </button>
                        )}

                        <button
                            onClick={handlePrint}
                            disabled={isPrinting || isDownloading}
                            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 border border-slate-600"
                            title="Imprimir documento oficial"
                        >
                            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Imprimir</span>
                        </button>

                        <button
                            onClick={handleDownload}
                            disabled={isPrinting || isDownloading}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-rose-600/30 active:scale-95 cursor-pointer border border-rose-500 disabled:opacity-50"
                            title="Descargar archivo PDF oficial"
                        >
                            {isDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                            ) : (
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
                            <span className="hidden xs:inline">{isDownloading ? 'Generando...' : 'Descargar PDF'}</span>
                            <span className="xs:hidden">{isDownloading ? '...' : 'PDF'}</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700 ml-0.5"
                            title="Cerrar vista previa"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Mobile Variant Switcher if multiple variants */}
                {variants && variants.length > 1 && (
                    <div className="flex md:hidden items-center bg-slate-950 px-3 py-1.5 border-b border-slate-800 gap-1.5 overflow-x-auto shrink-0">
                        {variants.map(v => {
                            const isActive = v.id === activeVariantId;
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => handleSwitchVariant(v.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                                        isActive 
                                            ? 'bg-blue-600 text-white shadow-xs' 
                                            : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                                    }`}
                                >
                                    <span>{v.label}</span>
                                    {v.pages && (
                                        <span className="text-[10px] opacity-80">({v.pages.length}p)</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Sub-toolbar: Pagination & Zoom Controls */}
                <div className="px-2.5 sm:px-4 py-1.5 bg-slate-850 border-b border-slate-750 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs shrink-0">
                    {/* View mode & Page navigation */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-[10px] sm:text-xs">
                            <button
                                onClick={() => setViewMode('single')}
                                className={`px-2 py-0.5 sm:py-1 rounded-md font-bold transition-colors cursor-pointer ${
                                    viewMode === 'single' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Por Página
                            </button>
                            <button
                                onClick={() => setViewMode('all')}
                                className={`px-2 py-0.5 sm:py-1 rounded-md font-bold transition-colors cursor-pointer ${
                                    viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Todas ({totalPages})
                            </button>
                        </div>

                        {viewMode === 'single' && totalPages > 1 && (
                            <div className="flex items-center gap-0.5 bg-slate-800 px-1 py-0.5 sm:py-1 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                    disabled={currentPage === 0}
                                    className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer"
                                    title="Página anterior"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                                <span className="font-semibold text-slate-300 px-1 font-mono text-[10px] sm:text-xs">
                                    {currentPage + 1} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={currentPage === totalPages - 1}
                                    className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer"
                                    title="Página siguiente"
                                >
                                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status feedback */}
                    {statusMsg && (
                        <div className="text-[10px] sm:text-xs font-bold text-amber-400 flex items-center gap-1.5 animate-pulse bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                            <span>{statusMsg}</span>
                        </div>
                    )}

                    {/* Zoom tools */}
                    <div className="flex items-center gap-1 bg-slate-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg border border-slate-700">
                        <button
                            onClick={handleZoomOut}
                            className="p-1 text-slate-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
                            title="Achicar / Reducir zoom (hasta 15%)"
                        >
                            <ZoomOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                        
                        <span className="font-mono text-slate-200 px-0.5 sm:px-1 min-w-[32px] sm:min-w-[40px] text-center font-extrabold text-[10px] sm:text-xs">
                            {Math.round(scale * 100)}%
                        </span>

                        <button
                            onClick={handleZoomIn}
                            className="p-1 text-slate-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
                            title="Agrandar / Aumentar zoom"
                        >
                            <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>

                        <div className="w-px h-3 bg-slate-700 mx-0.5"></div>

                        <button
                            onClick={handleFitWidth}
                            className="p-1 text-blue-400 hover:text-blue-200 active:scale-90 transition-transform cursor-pointer flex items-center gap-0.5 font-bold text-[10px]"
                            title="Ajustar al ancho de pantalla"
                        >
                            <MoveHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span className="hidden sm:inline">Ancho</span>
                        </button>

                        <button
                            onClick={handleResetZoom}
                            className="p-1 text-slate-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
                            title="Ajustar tamaño óptimo"
                        >
                            <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Main Preview Canvas Area */}
                <div 
                    ref={containerRef}
                    className="flex-1 overflow-x-auto overflow-y-auto p-2 sm:p-6 md:p-8 bg-slate-950/95 custom-scrollbar overscroll-contain"
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'pan-x pan-y',
                    }}
                >
                    <div className="min-w-full flex flex-col items-center justify-start gap-6 py-2">
                        {viewMode === 'single' ? (
                            <div 
                                className="relative shrink-0 mx-auto"
                                style={{
                                    width: `${Math.round(794 * scale)}px`,
                                    height: `${Math.round(1120 * scale)}px`,
                                }}
                            >
                                <div 
                                    className="bg-white rounded-md shadow-2xl transition-transform select-text origin-top-left absolute top-0 left-0"
                                    style={{
                                        width: '794px',
                                        minHeight: '1120px',
                                        transform: `scale(${scale})`,
                                        transformOrigin: 'top left',
                                    }}
                                >
                                    <div 
                                        dangerouslySetInnerHTML={{ __html: safePages[currentPage] || '' }}
                                        className="text-black"
                                    />
                                </div>
                            </div>
                        ) : (
                            safePages.map((pageHtml, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0 mx-auto">
                                    <span className="text-[11px] text-slate-400 font-bold tracking-wider">
                                        Página {idx + 1} de {totalPages}
                                    </span>
                                    <div 
                                        className="relative shrink-0"
                                        style={{
                                            width: `${Math.round(794 * scale)}px`,
                                            height: `${Math.round(1120 * scale)}px`,
                                        }}
                                    >
                                        <div 
                                            className="bg-white rounded-md shadow-2xl transition-transform select-text origin-top-left absolute top-0 left-0"
                                            style={{
                                                width: '794px',
                                                minHeight: '1120px',
                                                transform: `scale(${scale})`,
                                                transformOrigin: 'top left',
                                            }}
                                        >
                                            <div 
                                                dangerouslySetInnerHTML={{ __html: pageHtml }}
                                                className="text-black"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {/* Generous bottom scroll buffer allowing users on mobile/desktop to scroll down comfortably */}
                        <div className="w-full h-48 sm:h-64 shrink-0 pointer-events-none" />
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="px-3 sm:px-6 py-2 sm:py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-md font-mono text-slate-300 text-[11px] sm:text-xs">{activeFileName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                            onClick={handleShareWhatsApp}
                            className="hidden xs:flex px-2.5 sm:px-3 py-1 sm:py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold items-center gap-1.5 transition-colors cursor-pointer text-xs"
                            title="Compartir por WhatsApp"
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                        </button>

                        <button
                            onClick={handlePrint}
                            disabled={isPrinting || isDownloading}
                            className="hidden sm:flex px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition-colors items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimir</span>
                        </button>

                        <button
                            onClick={handleDownload}
                            disabled={isPrinting || isDownloading}
                            className="px-3 sm:px-3.5 py-1 sm:py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl border border-rose-500 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                        >
                            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            <span>Descargar</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer text-xs"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>

            </div>

            {/* S-21 Parameters Control Drawer */}
            {isS21 && (
                <S21ConfigDrawer
                    isOpen={isConfigDrawerOpen}
                    onClose={() => setIsConfigDrawerOpen(false)}
                    config={s21Config}
                    isTwoInOne={isTwoInOne}
                    onChangeConfig={handleChangeS21Config}
                    onResetDefaults={handleResetDefaults}
                />
            )}
        </div>
    );

    if (typeof document === 'undefined') return modalContent;
    return createPortal(modalContent, document.body);
};
