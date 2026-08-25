import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Group, GroupMember, Publisher } from './types';
import GlobalDirectoryTemplate from './GlobalDirectoryTemplate';

declare const html2pdf: any;
declare const html2canvas: any;

interface GlobalDirectoryProps {
    groups: Group[];
    globalMembers: GroupMember[];
    masterPublishers: Publisher[];
}

const GlobalDirectory: React.FC<GlobalDirectoryProps> = ({ groups, globalMembers, masterPublishers }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Group members by Group
    const { groupGroups, unassigned } = useMemo(() => {
        const groupMap: { [groupId: number]: { group: Group, entries: { member: GroupMember, publisher: Publisher }[] } } = {};
        const unassignedList: { member: GroupMember, publisher: Publisher }[] = [];

        globalMembers.forEach(member => {
            const pub = masterPublishers.find(p => p.nombre.trim().toLowerCase() === member.publicador_nombre.trim().toLowerCase());
            if (!pub) return;

            const grp = groups.find(g => g.id === member.grupo_id);
            const entry = { member, publisher: pub };

            if (grp) {
                if (!groupMap[grp.id]) {
                    groupMap[grp.id] = { group: grp, entries: [] };
                }
                groupMap[grp.id].entries.push(entry);
            } else {
                unassignedList.push(entry);
            }
        });

        // Sort each group's members alphabetically
        for (const gId in groupMap) {
            groupMap[gId].entries.sort((a, b) => a.member.publicador_nombre.localeCompare(b.member.publicador_nombre));
        }
        unassignedList.sort((a, b) => a.member.publicador_nombre.localeCompare(b.member.publicador_nombre));

        // Sort groups numerically/alphabetically by group name
        const sortedGroups = Object.values(groupMap).sort((a, b) => a.group.nombre.localeCompare(b.group.nombre, 'es', { numeric: true }));

        return { 
            groupGroups: sortedGroups, 
            unassigned: unassignedList 
        };
    }, [globalMembers, masterPublishers, groups]);

    const handleDownloadPDF = () => {
        setIsProcessing(true);
        const element = document.getElementById('global-directory-content');
        if (!element) {
            setIsProcessing(false);
            return;
        }

        const clone = element.cloneNode(true) as HTMLElement;
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '794px';
        container.appendChild(clone);
        document.body.appendChild(container);

        const opt = { 
            margin: 10, 
            filename: `Directorio_Agrupado_Grupos.pdf`, 
            image: { type: 'jpeg', quality: 1.0 }, 
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 794 }, 
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

    const handleDownloadPNG = async () => {
        setIsProcessing(true);
        const element = document.getElementById('global-directory-content');
        if (!element) {
            setIsProcessing(false);
            return;
        }

        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const dataUrl = canvas.toDataURL("image/png");
            
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `Directorio_Grupos.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("PNG Error", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrint = () => {
        setIsProcessing(true);
        const element = document.getElementById('global-directory-content');
        if (!element) {
            setIsProcessing(false);
            return;
        }
    
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Imprimir Directorio</title>
                    <style>
                        @media print {
                            @page { size: auto; margin: 10mm; }
                            body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                        }
                    </style>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
                </head>
                <body>
                    ${element.outerHTML}
                </body>
                </html>
            `);
            printWindow.document.close();
            // Allow time for styles and icons to load
            setTimeout(() => {
                printWindow.print();
                setIsProcessing(false);
            }, 500);
        } else {
             setIsProcessing(false);
        }
    };

    const handleDownloadExcel = () => {
        import('xlsx').then((XLSX) => {
            const wb = XLSX.utils.book_new();
            
            const data: any[] = [];
            
            // Add Headers
            data.push(['Grupo', 'Nombre', 'Rol', 'Dirección', 'Teléfono', 'Emergencia']);
            
            groupGroups.forEach(groupDesc => {
                groupDesc.entries.forEach(entry => {
                    const pub = entry.publisher;
                    let dirStr = pub.direccion || '';
                    const zonaMatch = dirStr.match(/\{\{zona:(.*?)\}\}/);
                    if (zonaMatch) dirStr = dirStr.replace(zonaMatch[0], '');
                    const ucvMatch = dirStr.match(/\{\{ucv:(.*?)\}\}/);
                    let tagPrefix = '';
                    if (ucvMatch) {
                        tagPrefix = `(UCV ${ucvMatch[1]}) `;
                        dirStr = dirStr.replace(ucvMatch[0], '');
                    }
                    dirStr = dirStr.trim();
                    const finalDir = tagPrefix + dirStr;

                    data.push([
                        groupDesc.group.nombre,
                        pub.nombre,
                        entry.member.rol || 'Publicador',
                        finalDir,
                        pub.telefono_personal || '',
                        pub.contacto_emergencia || ''
                    ]);
                });
            });

            unassigned.forEach(entry => {
                const pub = entry.publisher;
                let dirStr = pub.direccion || '';
                const ucvMatch = dirStr.match(/\{\{ucv:(.*?)\}\}/);
                let tagPrefix = '';
                if (ucvMatch) {
                    tagPrefix = `(UCV ${ucvMatch[1]}) `;
                    dirStr = dirStr.replace(ucvMatch[0], '');
                }
                dirStr = dirStr.trim();
                const finalDir = tagPrefix + dirStr;
                
                data.push([
                    'Sin Grupo',
                    pub.nombre,
                    entry.member.rol || 'Publicador',
                    finalDir,
                    pub.telefono_personal || '',
                    pub.contacto_emergencia || ''
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, "Directorio");
            XLSX.writeFile(wb, "Directorio_Grupos.xlsx");
        }).catch(err => {
            console.error("Error cargando xlsx", err);
        });
    };

    const [compactView, setCompactView] = useState(true);
    const [showAddresses, setShowAddresses] = useState(false);

    if (groupGroups.length === 0 && unassigned.length === 0) {
        return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No hay datos para mostrar en el directorio.</div>;
    }

    return (
        <div style={{ padding: '0', animation: 'fadeIn 0.3s' }}>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600' }}>
                    <input 
                        type="checkbox" 
                        checked={compactView} 
                        onChange={(e) => setCompactView(e.target.checked)} 
                        style={{ accentColor: '#059669', width: '16px', height: '16px' }}
                    />
                    Vista Compacta (2 Columnas)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600' }}>
                    <input 
                        type="checkbox" 
                        checked={showAddresses} 
                        onChange={(e) => setShowAddresses(e.target.checked)} 
                        style={{ accentColor: '#059669', width: '16px', height: '16px' }}
                    />
                    Mostrar Direcciones
                </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
                <button 
                    onClick={handleDownloadPDF} 

                    disabled={isProcessing}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#e0e7ff', color: '#4338ca', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
                    PDF
                </button>
                <button 
                    onClick={handleDownloadExcel} 
                    disabled={isProcessing}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <i className="fas fa-file-excel"></i>
                    Excel
                </button>
                <button 
                    onClick={handleDownloadPNG} 
                    disabled={isProcessing}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#ccfbf1', color: '#0f766e', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-image"></i>}
                    PNG
                </button>
                <button 
                    onClick={handlePrint} 
                    disabled={isProcessing}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-print"></i>}
                    Imprimir
                </button>
            </div>

            <div style={{ width: '100%', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                <div style={{ 
                    // Make it look like a physical paper page on screen
                    width: '794px', 
                    backgroundColor: 'white', 
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
                    padding: '20px', 
                    marginBottom: '40px' 
                }}>
                    <GlobalDirectoryTemplate 
                        elementId="global-directory-content"
                        groupGroups={groupGroups}
                        unassigned={unassigned}
                        compact={compactView}
                        showAddresses={showAddresses}
                    />
                </div>
            </div>
        </div>
    );
};

export default GlobalDirectory;
