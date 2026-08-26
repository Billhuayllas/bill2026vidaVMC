import React, { useState, useEffect, useRef } from 'react';
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
    CheckCircle2
} from 'lucide-react';
import { printHtmlDocument, downloadHtmlAsPdf } from './printUtils';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fileName: string;
    pagesHtml: string[];
    layoutLabel?: string;
    subtitle?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    isOpen,
    onClose,
    title,
    fileName,
    pagesHtml = [],
    layoutLabel,
    subtitle
}) => {
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [scale, setScale] = useState<number>(0.85);
    const [isPrinting, setIsPrinting] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [statusMsg, setStatusMsg] = useState<string>('');
    const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
    const containerRef = useRef<HTMLDivElement>(null);

    const safePages = pagesHtml || [];
    const totalPages = safePages.length;

    useEffect(() => {
        if (isOpen) {
            setCurrentPage(0);
            // Default scale according to screen width
            if (window.innerWidth < 640) {
                setScale(0.45);
            } else if (window.innerWidth < 1024) {
                setScale(0.65);
            } else {
                setScale(0.85);
            }
        }
    }, [isOpen]);

    if (!isOpen || totalPages === 0) return null;

    const fullHtmlDocument = safePages.join('');

    const handlePrint = () => {
        setIsPrinting(true);
        setStatusMsg('Enviando a impresión...');
        try {
            printHtmlDocument(fullHtmlDocument, title);
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
            await downloadHtmlAsPdf(fullHtmlDocument, fileName, (msg) => setStatusMsg(msg));
            setStatusMsg('¡Descarga completada!');
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

    const handleZoomIn = () => setScale(prev => Math.min(1.4, prev + 0.1));
    const handleZoomOut = () => setScale(prev => Math.max(0.35, prev - 0.1));
    const handleResetZoom = () => {
        if (window.innerWidth < 640) setScale(0.45);
        else if (window.innerWidth < 1024) setScale(0.65);
        else setScale(0.85);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
                
                {/* Header Bar */}
                <div className="px-4 sm:px-6 py-3.5 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                            <Eye className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-sm sm:text-base text-white">{title}</h3>
                                {layoutLabel && (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold rounded-full">
                                        {layoutLabel}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-[280px] sm:max-w-md">
                                {subtitle || `Vista previa de impresión oficial (${totalPages} ${totalPages === 1 ? 'página' : 'páginas'})`}
                            </p>
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            disabled={isPrinting || isDownloading}
                            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Imprimir documento"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">Imprimir</span>
                        </button>

                        <button
                            onClick={handleDownload}
                            disabled={isPrinting || isDownloading}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-rose-600/30 active:scale-95 cursor-pointer border border-rose-500 disabled:opacity-50"
                            title="Descargar archivo PDF"
                        >
                            {isDownloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span>{isDownloading ? 'Generando...' : 'Descargar PDF'}</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700 ml-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Sub-toolbar: Pagination & Zoom Controls */}
                <div className="px-4 py-2 bg-slate-850 border-b border-slate-750 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                    {/* View mode & Page navigation */}
                    <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                            <button
                                onClick={() => setViewMode('single')}
                                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                                    viewMode === 'single' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Por Página
                            </button>
                            <button
                                onClick={() => setViewMode('all')}
                                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                                    viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Todas ({totalPages})
                            </button>
                        </div>

                        {viewMode === 'single' && totalPages > 1 && (
                            <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                    disabled={currentPage === 0}
                                    className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer"
                                    title="Página anterior"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="font-semibold text-slate-300 px-1">
                                    {currentPage + 1} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={currentPage === totalPages - 1}
                                    className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer"
                                    title="Página siguiente"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status feedback */}
                    {statusMsg && (
                        <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{statusMsg}</span>
                        </div>
                    )}

                    {/* Zoom tools */}
                    <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                        <button
                            onClick={handleZoomOut}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer"
                            title="Reducir zoom"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-slate-300 px-1 min-w-[42px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={handleZoomIn}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer"
                            title="Aumentar zoom"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-3.5 bg-slate-700 mx-0.5"></div>
                        <button
                            onClick={handleResetZoom}
                            className="p-1 text-slate-400 hover:text-white cursor-pointer"
                            title="Ajustar tamaño"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Main Preview Canvas Area */}
                <div 
                    ref={containerRef}
                    className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-950/70 flex flex-col items-center gap-8 custom-scrollbar"
                >
                    {viewMode === 'single' ? (
                        <div 
                            className="bg-white rounded-md shadow-2xl transition-transform origin-top select-text"
                            style={{
                                width: '794px',
                                minHeight: '1123px',
                                transform: `scale(${scale})`,
                                transformOrigin: 'top center',
                                marginBottom: `${(1123 * scale) - 1123}px` // Compensate container scroll height for transform
                            }}
                        >
                            <div 
                                dangerouslySetInnerHTML={{ __html: safePages[currentPage] || '' }}
                                className="text-black"
                            />
                        </div>
                    ) : (
                        safePages.map((pageHtml, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-2">
                                <span className="text-xs text-slate-400 font-bold tracking-wider">
                                    Página {idx + 1} de {totalPages}
                                </span>
                                <div 
                                    className="bg-white rounded-md shadow-2xl transition-transform origin-top select-text"
                                    style={{
                                        width: '794px',
                                        minHeight: '1123px',
                                        transform: `scale(${scale})`,
                                        transformOrigin: 'top center',
                                        marginBottom: `${(1123 * scale) - 1123}px`
                                    }}
                                >
                                    <div 
                                        dangerouslySetInnerHTML={{ __html: pageHtml }}
                                        className="text-black"
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Bar */}
                <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 shrink-0">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="truncate max-w-[280px] sm:max-w-md">{fileName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span>A4 Oficial (210 x 297 mm)</span>
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-colors cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
