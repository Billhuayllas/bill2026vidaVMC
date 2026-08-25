
import React, { useState, useEffect, useRef } from 'react';
import PrintTemplate from './PrintTemplate';
import { GroupMember, ReportsMap, GroupStats } from './types';

declare const html2pdf: any;
declare const html2canvas: any;

interface PreviewModalProps {
    onClose: () => void;
    groupName: string;
    month: string;
    stats: GroupStats;
    col1: GroupMember[];
    col2: GroupMember[];
    reports: ReportsMap;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ onClose, groupName, month, stats, col1, col2, reports }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [scale, setScale] = useState(1);
    const [contentHeight, setContentHeight] = useState(0);
    const [generatedFile, setGeneratedFile] = useState<File | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Calculate scale on mount and resize to fit mobile screens
    useEffect(() => {
        const calculateScale = () => {
            if (scrollContainerRef.current && contentRef.current) {
                // A4 width in px (approx at 96 DPI is 794px for 210mm)
                // We add some margin (e.g. 16px on each side = 32px total)
                const containerWidth = scrollContainerRef.current.clientWidth;
                const availableWidth = containerWidth - 32; 
                const contentWidth = 794; 
                
                // If screen is smaller than content, scale down. Max scale 1.
                const newScale = Math.min(1, availableWidth / contentWidth);
                setScale(newScale);
                
                // Capture height to adjust wrapper and prevent huge whitespace below transformed element
                setContentHeight(contentRef.current.offsetHeight);
            }
        };

        // Initial calculation with a small delay to ensure DOM render
        setTimeout(calculateScale, 100);
        
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, []);

    const handleDownloadPDF = () => {
        setIsProcessing(true);
        const element = document.getElementById('print-preview-content');
        if (!element) return;

        // Clone to ensure we capture full size without scaling transforms affecting PDF
        const clone = element.cloneNode(true) as HTMLElement;
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '794px'; // Ensure A4 width context
        container.appendChild(clone);
        document.body.appendChild(container);

        const opt = { 
            margin: 0, 
            filename: `Informe_${groupName.replace(/\s+/g, '_')}_${month}.pdf`, 
            image: { type: 'jpeg', quality: 1.0 }, 
            html2canvas: { scale: 3, useCORS: true, letterRendering: true, windowWidth: 794 }, 
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true } 
        };
        
        html2pdf().from(clone).set(opt).save()
            .then(() => {
                document.body.removeChild(container);
                setIsProcessing(false);
            })
            .catch(() => {
                document.body.removeChild(container);
                setIsProcessing(false);
            });
    };

    const handleShareWhatsApp = async () => {
        // 1. If file is already generated, share immediately (User Gesture guaranteed here)
        if (generatedFile) {
            if (navigator.canShare && navigator.canShare({ files: [generatedFile] })) {
                try {
                    await navigator.share({
                        files: [generatedFile],
                        title: `Informe ${groupName}`,
                        text: `Resumen de actividad - ${month}`
                    });
                } catch (error) {
                    console.error("Error sharing:", error);
                }
            } else {
                const link = document.createElement('a');
                link.download = generatedFile.name;
                link.href = URL.createObjectURL(generatedFile);
                link.click();
            }
            return;
        }

        // 2. Otherwise, generate the file
        setIsProcessing(true);
        const element = document.getElementById('print-preview-content');
        if (!element || typeof html2canvas === 'undefined') {
            alert('Error: Librerías no cargadas.');
            setIsProcessing(false);
            return;
        }

        try {
            const clone = element.cloneNode(true) as HTMLElement;
            const container = document.createElement('div');
            
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.width = '794px';
            container.style.zIndex = '-1000';
            container.style.backgroundColor = '#ffffff';
            
            container.appendChild(clone);
            document.body.appendChild(container);

            const canvas = await html2canvas(clone, { 
                scale: 3, 
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 794 // Increased for better rendering of desktop-like layout
            });

            document.body.removeChild(container);

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

            if (!blob) {
                setIsProcessing(false);
                return;
            }

            const file = new File([blob], `Informe_${month}.png`, { type: 'image/png' });
            setGeneratedFile(file);
            setIsProcessing(false);

            // 3. Try to share immediately. 
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `Informe ${groupName}`,
                        text: `Resumen de actividad - ${month}`
                    });
                } catch (error) {
                    console.log("Auto-share attempt finished.");
                }
            } else {
                const link = document.createElement('a');
                link.download = file.name;
                link.href = URL.createObjectURL(file);
                link.click();
                alert("Tu dispositivo no soporta compartir directamente. Se ha descargado la imagen.");
            }

        } catch (error) {
            console.error("Error generating image:", error);
            setIsProcessing(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
            
            {/* Modal Sheet - iOS Style */}
            <div 
                onClick={(e) => e.stopPropagation()} 
                style={{ 
                    width: '100%', 
                    height: '92%', 
                    maxWidth: '600px',
                    backgroundColor: '#F2F2F7', 
                    borderTopLeftRadius: '16px', 
                    borderTopRightRadius: '16px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header */}
                <div style={{ padding: '12px 16px', backgroundColor: 'white', borderBottom: '1px solid #E5E5EA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: '32px' }}></div> {/* Spacer for center alignment */}
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '600', color: '#000000' }}>Vista Previa</h2>
                    <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', backgroundColor: '#E5E5EA', color: '#8E8E93', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px' }}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                    
                    {/* Document Container */}
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
                            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                            backgroundColor: 'white' 
                        }}>
                            <PrintTemplate 
                                elementId="print-preview-content"
                                groupName={groupName} 
                                month={month} 
                                stats={stats} 
                                col1={col1} 
                                col2={col2} 
                                reports={reports} 
                            />
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '12px 16px', backgroundColor: 'white', borderTop: '1px solid #E5E5EA', display: 'flex', gap: '12px', justifyContent: 'center', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                    <button 
                        onClick={handleDownloadPDF} 
                        disabled={isProcessing}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #FF3B30', backgroundColor: 'white', color: '#FF3B30', fontWeight: '600', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
                        PDF
                    </button>
                    <button 
                        onClick={handleShareWhatsApp} 
                        disabled={isProcessing}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#34C759', color: 'white', fontWeight: '600', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(52, 199, 89, 0.3)' }}
                    >
                        {isProcessing 
                            ? <><i className="fas fa-spinner fa-spin"></i> Generando...</>
                            : generatedFile 
                                ? <><i className="fas fa-paper-plane"></i> Enviar</>
                                : <><i className="fab fa-whatsapp"></i> WhatsApp</>
                        }
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default PreviewModal;
