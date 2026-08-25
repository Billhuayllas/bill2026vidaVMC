import React, { useState, useEffect, useRef } from 'react';
import DirectoryTemplate from './DirectoryTemplate';
import { GroupMember, Publisher } from './types';

declare const html2pdf: any;
declare const html2canvas: any;

interface DirectoryModalProps {
    onClose: () => void;
    groupName: string;
    col1: GroupMember[];
    col2: GroupMember[];
    masterPublishers: Publisher[];
}

const DirectoryModal: React.FC<DirectoryModalProps> = ({ onClose, groupName, col1, col2, masterPublishers }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [scale, setScale] = useState(1);
    const [contentHeight, setContentHeight] = useState(0);
    const [generatedFile, setGeneratedFile] = useState<File | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Dynamic rendering settings
    const [layoutMode, setLayoutMode] = useState<'table' | 'cards'>('table');
    const [monthsCount, setMonthsCount] = useState<number>(0);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
    const [compactness, setCompactness] = useState<'ultra' | 'compact' | 'normal'>('compact');
    const [localMembers, setLocalMembers] = useState<GroupMember[]>([]);

    // Order initial list by ANC (Ancianos) -> SM (Siervos Ministeriales) -> rest, then alphabetically
    useEffect(() => {
        const combined = [...col1, ...col2];
        const sorted = [...combined].sort((a, b) => {
            const getRolePriority = (roleStr: string) => {
                if (!roleStr) return 3;
                const r = roleStr.toLowerCase();
                if (r.includes('anciano') || r.includes('anc')) return 1;
                if (r.includes('siervo ministerial') || r.includes('sm') || r.includes('siervo')) return 2;
                return 3;
            };
            const p1 = getRolePriority(a.rol || '');
            const p2 = getRolePriority(b.rol || '');
            if (p1 !== p2) return p1 - p2;
            return (a.publicador_nombre || '').localeCompare(b.publicador_nombre || '');
        });
        setLocalMembers(sorted);
    }, [col1, col2]);

    // Handle manual line repositioning
    const handleMoveRowUp = (index: number) => {
        if (index <= 0) return;
        setLocalMembers(prev => {
            const copy = [...prev];
            const temp = copy[index - 1];
            copy[index - 1] = copy[index];
            copy[index] = temp;
            return copy;
        });
        setGeneratedFile(null); // Reset cached PDF file
    };

    const handleMoveRowDown = (index: number) => {
        if (index >= localMembers.length - 1) return;
        setLocalMembers(prev => {
            const copy = [...prev];
            const temp = copy[index + 1];
            copy[index + 1] = copy[index];
            copy[index] = temp;
            return copy;
        });
        setGeneratedFile(null); // Reset cached PDF file
    };

    // Calculate scale on mount, resize, or setting changes to fit screen preview
    useEffect(() => {
        const calculateScale = () => {
            if (scrollContainerRef.current && contentRef.current) {
                const containerWidth = scrollContainerRef.current.clientWidth;
                const availableWidth = containerWidth - 32; 
                const contentWidth = orientation === 'portrait' ? 794 : 1123; 
                const newScale = Math.min(1, availableWidth / contentWidth);
                setScale(newScale);
                setContentHeight(contentRef.current.offsetHeight);
            }
        };

        setTimeout(calculateScale, 100);
        
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [orientation, contentHeight, localMembers.length, layoutMode, compactness, monthsCount]);

    const handleDownloadPDF = () => {
        setIsProcessing(true);
        const element = document.getElementById('directory-preview-content');
        if (!element) {
            setIsProcessing(false);
            return;
        }

        const clone = element.cloneNode(true) as HTMLElement;
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        const targetWidth = orientation === 'portrait' ? '794px' : '1123px';
        container.style.width = targetWidth;

        // Apply single page height constraint to guarantee perfect fit if content fits on 1 sheet
        const pageLimit = orientation === 'portrait' ? 1123 : 794;
        if (contentHeight <= pageLimit + 20) {
            clone.style.height = `${pageLimit}px`;
            clone.style.overflow = 'hidden';
        }

        container.appendChild(clone);
        document.body.appendChild(container);

        const opt = { 
            margin: 0, 
            filename: `Grupo_Predicacion_${groupName.replace(/\s+/g, '_')}.pdf`, 
            image: { type: 'jpeg', quality: 1.0 }, 
            html2canvas: { 
                scale: 3, 
                useCORS: true, 
                letterRendering: true, 
                windowWidth: orientation === 'portrait' ? 794 : 1123,
                width: orientation === 'portrait' ? 794 : 1123,
                height: contentHeight <= pageLimit + 20 ? pageLimit : contentHeight
            }, 
            jsPDF: { unit: 'mm', format: 'a4', orientation: orientation, compress: true } 
        };
        
        html2pdf().from(clone).set(opt).save()
            .then(() => {
                document.body.removeChild(container);
                setIsProcessing(false);
            })
            .catch((err: any) => {
                console.error("PDF generation failed:", err);
                document.body.removeChild(container);
                setIsProcessing(false);
            });
    };

    const handleShare = async () => {
        if (generatedFile) {
            if (navigator.canShare && navigator.canShare({ files: [generatedFile] })) {
                try {
                    await navigator.share({
                        files: [generatedFile],
                        title: `Grupo de Predicación ${groupName}`,
                        text: `Grupo de Predicación - ${groupName}`
                    });
                } catch (error) {
                    console.error("Error sharing:", error);
                }
            } else {
                alert("La funcionalidad de compartir no está soportada o no tienes permisos.");
            }
            return;
        }

        setIsProcessing(true);
        const element = document.getElementById('directory-preview-content');
        if (!element) {
            setIsProcessing(false);
            return;
        }

        const clone = element.cloneNode(true) as HTMLElement;
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        const targetWidth = orientation === 'portrait' ? '794px' : '1123px';
        container.style.width = targetWidth;

        // Apply single page height constraint to guarantee perfect fit if content fits on 1 sheet
        const pageLimit = orientation === 'portrait' ? 1123 : 794;
        if (contentHeight <= pageLimit + 20) {
            clone.style.height = `${pageLimit}px`;
            clone.style.overflow = 'hidden';
        }

        container.appendChild(clone);
        document.body.appendChild(container);

        const opt = { 
            margin: 0, 
            filename: `Grupo_Predicacion_${groupName.replace(/\s+/g, '_')}.pdf`, 
            image: { type: 'jpeg', quality: 1.0 }, 
            html2canvas: { 
                scale: 3, 
                useCORS: true, 
                letterRendering: true, 
                windowWidth: orientation === 'portrait' ? 794 : 1123,
                width: orientation === 'portrait' ? 794 : 1123,
                height: contentHeight <= pageLimit + 20 ? pageLimit : contentHeight
            }, 
            jsPDF: { unit: 'mm', format: 'a4', orientation: orientation, compress: true } 
        };

        try {
            const pdf = await html2pdf().from(clone).set(opt).outputPdf('blob');
            const file = new File([pdf], `Grupo_Predicacion_${groupName.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
            setGeneratedFile(file);
            document.body.removeChild(container);
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Grupo de Predicación ${groupName}`,
                    text: `Grupo de Predicación - ${groupName}`
                });
            } else {
                alert("Archivo PDF generado con éxito. Por favor descarga con el botón de PDF para guardarlo en tu dispositivo.");
            }
        } catch (error) {
            console.error("Error generating/sharing PDF:", error);
            document.body.removeChild(container);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrint = () => {
        const element = document.getElementById('directory-preview-content');
        if (!element) return;
        
        // Construct sandbox iframe for clean isolated A4 print
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        
        const styleText = `
            @page {
                size: A4 ${orientation};
                margin: 0;
            }
            body {
                margin: 0;
                padding: 0;
                background-color: white;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            #directory-preview-content {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                transform: none !important;
            }
            [data-html2canvas-ignore="true"] {
                display: none !important;
            }
        `;
        
        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (iframeDoc) {
            iframeDoc.write('<html><head><title>Imprimir Registro - ' + groupName + '</title>');
            iframeDoc.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">');
            iframeDoc.write('<style>' + styleText + '</style>');
            iframeDoc.write('</head><body>');
            iframeDoc.write(element.outerHTML);
            iframeDoc.write('</body></html>');
            iframeDoc.close();
            
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 600);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(5px)' }}>
            
            <div style={{ margin: 'min(20px, env(safe-area-inset-top)) auto 0', width: '100%', maxWidth: orientation === 'portrait' ? '855px' : '1180px', backgroundColor: '#F2F2F7', borderRadius: '16px 16px 0 0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -10px 40px rgba(0,0,0,0.3)', transition: 'max-width 0.3s ease' }}>
                
                {/* Modal Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-users text-blue-600" style={{ fontSize: '18px' }}></i>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>Grupo de Predicación</h2>
                    </div>
                    <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', backgroundColor: '#E5E5EA', color: '#8E8E93', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', transition: 'background-color 0.2s' }} className="hover:bg-gray-300">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Settings toolbar */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #E5E5EA', backgroundColor: '#F8F9FA', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        
                        {/* Layout Select */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: '700', color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diseño</span>
                            <select 
                                value={layoutMode} 
                                onChange={(e) => {
                                    const val = e.target.value as 'table' | 'cards';
                                    setLayoutMode(val);
                                    if (val === 'cards') {
                                        setMonthsCount(0); // cards doesn't support future month columns
                                        setOrientation('portrait');
                                    } else {
                                        setOrientation('landscape'); // default table is beautiful landscape
                                    }
                                    setGeneratedFile(null);
                                }}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: '600', color: '#374151', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="table">📋 Tabla Compacta ("Rol de Grupos")</option>
                                <option value="cards">📇 Tarjetas Detalladas</option>
                            </select>
                        </div>

                        {/* Months Count Select (Only for Table Mode) */}
                        {layoutMode === 'table' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: '700', color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meses Futuros / Predicación</span>
                                <select 
                                    value={monthsCount} 
                                    onChange={(e) => {
                                        const count = Number(e.target.value);
                                        setMonthsCount(count);
                                        if (count > 0) {
                                            setOrientation('landscape'); // Automatically assist user with landscape for extra columns
                                        }
                                        setGeneratedFile(null);
                                    }}
                                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: '600', color: '#374151', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value={0}>Ninguno</option>
                                    <option value={1}>1 Mes Futuro</option>
                                    <option value={2}>2 Meses Futuros</option>
                                    <option value={3}>3 Meses Futuros</option>
                                    <option value={4}>4 Meses Futuros</option>
                                    <option value={5}>5 Meses Futuros</option>
                                    <option value={6}>6 Meses Futuros</option>
                                </select>
                            </div>
                        )}

                        {/* Orientation Select */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: '700', color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orientación de Impresión</span>
                            <select 
                                value={orientation} 
                                onChange={(e) => {
                                    setOrientation(e.target.value as 'portrait' | 'landscape');
                                    setGeneratedFile(null);
                                }}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: '600', color: '#374151', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="portrait">📄 Vertical (A4 Portrait)</option>
                                <option value="landscape">📑 Horizontal (A4 Landscape)</option>
                            </select>
                        </div>

                        {/* Compactness Select */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: '700', color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tamaño de Letra / Compacto</span>
                            <select 
                                value={compactness} 
                                onChange={(e) => {
                                    setCompactness(e.target.value as 'ultra' | 'compact' | 'normal');
                                    setGeneratedFile(null);
                                }}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: '600', color: '#374151', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="ultra">🤏 Súper Compacto (Recomendado para 1 hoja)</option>
                                <option value="compact">🧼 Compacto</option>
                                <option value="normal">📏 Normal</option>
                            </select>
                        </div>

                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }} className="hidden md:block">
                        💡 Reordena las filas con las fechas <i className="fas fa-chevron-up"></i> <i className="fas fa-chevron-down"></i> para prioridades.
                    </div>
                </div>

                {/* Scrollable Content */}
                <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 10px' }} className="scrollbar-thin">
                    
                    {/* Visual Page Fit Status Alert */}
                    <div style={{ 
                        width: '100%', 
                        maxWidth: orientation === 'portrait' ? '794px' : '1123px', 
                        marginBottom: '14px',
                        padding: '0 10px',
                        boxSizing: 'border-box'
                    }}>
                        {contentHeight > 0 && (
                            contentHeight <= (orientation === 'portrait' ? 1123 : 794) + 15 ? (
                                <div style={{ 
                                    padding: '10px 16px', 
                                    borderRadius: '10px', 
                                    backgroundColor: '#dcfce7', 
                                    border: '1px solid #86efac', 
                                    color: '#15803d', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    gap: '8px', 
                                    fontSize: '13px', 
                                    fontWeight: '600' 
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="fas fa-check-circle" style={{ fontSize: '15px' }}></i>
                                        ¡Excelente! Cabe perfecto en 1 hoja de impresión A4 ({Math.round((contentHeight / (orientation === 'portrait' ? 1123 : 794)) * 100)}% de ocupación).
                                    </span>
                                    <span style={{ fontSize: '11px', opacity: 0.8, backgroundColor: '#bbf7d0', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                                        1 Página
                                    </span>
                                </div>
                            ) : (
                                <div style={{ 
                                    padding: '10px 16px', 
                                    borderRadius: '10px', 
                                    backgroundColor: '#fef3c7', 
                                    border: '1px solid #fcd34d', 
                                    color: '#b45309', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    gap: '4px', 
                                    fontSize: '13px', 
                                    fontWeight: '600' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <i className="fas fa-exclamation-triangle" style={{ fontSize: '15px', color: '#d97706' }}></i>
                                            El contenido excede 1 hoja de impresión A4 ({Math.round((contentHeight / (orientation === 'portrait' ? 1123 : 794)) * 100)}% de ocupación).
                                        </span>
                                        <span style={{ fontSize: '11px', color: 'white', backgroundColor: '#d97706', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                                            Multi-Páginas
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '11.5px', fontWeight: '500', marginLeft: '23px', opacity: 0.9 }}>
                                        💡 Tip: Selecciona <b>"Letra Súper Compacto (1 hoja)"</b> o reduce los meses de predicación para forzar que quepa todo en una sola hoja.
                                    </span>
                                </div>
                            )
                        )}
                    </div>

                    <div style={{ 
                        height: contentHeight > 0 ? `${contentHeight * scale}px` : 'auto', 
                        width: '100%',
                        display: 'flex', 
                        justifyContent: 'center',
                        transition: 'height 0.2s ease',
                        marginTop: '10px',
                        marginBottom: '40px'
                    }}>
                        <div ref={contentRef} style={{ 
                            transform: `scale(${scale})`, 
                            transformOrigin: 'top center',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
                            backgroundColor: 'white',
                            position: 'relative'
                        }}>
                            <DirectoryTemplate 
                                elementId="directory-preview-content"
                                groupName={groupName}  
                                col1={col1} 
                                col2={col2}  
                                masterPublishers={masterPublishers}
                                layoutMode={layoutMode}
                                monthsCount={monthsCount}
                                orientation={orientation}
                                compactness={compactness}
                                localMembersList={localMembers}
                                onMoveUp={handleMoveRowUp}
                                onMoveDown={handleMoveRowDown}
                            />

                            {/* Page Limit Indicators of A4 height */}
                            {contentHeight > (orientation === 'portrait' ? 1123 : 794) + 15 && (
                                <div style={{
                                    position: 'absolute',
                                    top: `${orientation === 'portrait' ? 1123 : 794}px`,
                                    left: 0,
                                    right: 0,
                                    borderTop: '2px dashed #ef4444',
                                    zIndex: 99999,
                                    pointerEvents: 'none',
                                    display: 'flex',
                                    justifyContent: 'center'
                                }} data-html2canvas-ignore="true">
                                    <span style={{ 
                                        backgroundColor: '#ef4444', 
                                        color: '#ffffff', 
                                        fontSize: '9px', 
                                        fontWeight: '800', 
                                        padding: '2px 10px', 
                                        borderRadius: '12px', 
                                        transform: 'translateY(-50%)',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                        letterSpacing: '0.5px'
                                    }}>
                                        ⚠️ LÍMITE DE PÁGINA 1 DE IMPRESIÓN (A4)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '12px 16px', backgroundColor: 'white', borderTop: '1px solid #E5E5EA', display: 'flex', gap: '12px', justifyContent: 'center', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                    <button 
                        onClick={handleDownloadPDF} 
                        disabled={isProcessing}
                        className="hover:bg-blue-50 active:scale-[0.98] transition-all"
                        style={{ flex: 1, maxWidth: '200px', padding: '12px', borderRadius: '12px', border: '1.5px solid #2563eb', backgroundColor: 'white', color: '#2563eb', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
                        Descargar PDF
                    </button>
                    <button 
                        onClick={handlePrint} 
                        disabled={isProcessing}
                        className="hover:bg-slate-550 hover:bg-slate-800 bg-slate-700 text-white font-semibold active:scale-[0.98] transition-all"
                        style={{ flex: 1, maxWidth: '200px', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <i className="fas fa-print"></i>
                        Imprimir
                    </button>
                    <button 
                        onClick={handleShare} 
                        disabled={isProcessing}
                        className="hover:bg-blue-700 active:scale-[0.98] transition-all text-white font-semibold bg-blue-600"
                        style={{ flex: 1, maxWidth: '200px', padding: '12px', borderRadius: '12px', border: 'none', color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-share-nodes"></i>}
                        Compartir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DirectoryModal;
