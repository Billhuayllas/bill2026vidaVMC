import React from 'react';
import { GroupMember, Publisher } from './types';

interface DirectoryTemplateProps {
    groupName: string;
    col1: GroupMember[];
    col2: GroupMember[];
    masterPublishers: Publisher[];
    elementId?: string;
    layoutMode?: 'table' | 'cards';
    monthsCount?: number;
    orientation?: 'portrait' | 'landscape';
    compactness?: 'ultra' | 'compact' | 'normal';
    localMembersList?: GroupMember[];
    onMoveUp?: (index: number) => void;
    onMoveDown?: (index: number) => void;
}

const getAbbreviatedRole = (roleStr: string): string => {
    if (!roleStr) return "";
    const roles = roleStr.split(',').map(r => r.trim());
    const outputRoles: string[] = [];
    
    for (let r of roles) {
        const lowerR = r.toLowerCase();
        if (
            lowerR === "eximido de meta" ||
            lowerR === "eximido de metas" ||
            lowerR === "eximido de horas" ||
            lowerR === "eximido de hora" ||
            lowerR === "eximida de meta" ||
            lowerR === "eximida de metas" ||
            lowerR === "eximida de horas" ||
            lowerR === "eximida de hora"
        ) {
            continue;
        }
        
        if (lowerR === "publicador") {
            outputRoles.push("PUB");
        } else if (lowerR === "precursor regular" || lowerR === "p. regular" || lowerR === "pr") {
            outputRoles.push("PR");
        } else if (lowerR === "precursor auxiliar" || lowerR === "p. auxiliar" || lowerR === "pa") {
            outputRoles.push("PA");
        } else if (lowerR === "precursor especial" || lowerR === "p. especial" || lowerR === "pe") {
            outputRoles.push("PE");
        } else if (lowerR === "anciano" || lowerR === "anc") {
            outputRoles.push("ANC");
        } else if (lowerR === "siervo ministerial" || lowerR === "siervo de ministerio" || lowerR === "sm" || lowerR === "siervo") {
            outputRoles.push("SM");
        } else {
            let replaced = r
                .replace(/Precursor Regular/gi, "PR")
                .replace(/P\.\s*Regular/gi, "PR")
                .replace(/Precursor Auxiliar/gi, "PA")
                .replace(/P\.\s*Auxiliar/gi, "PA")
                .replace(/Precursor Especial/gi, "PE")
                .replace(/P\.\s*Especial/gi, "PE")
                .replace(/Anciano/gi, "ANC")
                .replace(/Siervo Ministerial/gi, "SM")
                .replace(/Siervo ministerial/gi, "SM");
            outputRoles.push(replaced);
        }
    }
    
    if (outputRoles.length === 0) return "PUB";
    return outputRoles.join(', ');
};

const formatAddress = (addressStr: string | undefined): string => {
    if (!addressStr) return "";
    let dirStr = addressStr;
    let parts: string[] = [];
    
    const zonaMatch = dirStr.match(/\{\{zona:(.*?)\}\}/);
    if (zonaMatch) {
         parts.push(`Z. ${zonaMatch[1]}`);
         dirStr = dirStr.replace(zonaMatch[0], '');
    }
    const ucvMatch = dirStr.match(/\{\{ucv:(.*?)\}\}/);
    if (ucvMatch) {
         parts.push(`UCV ${ucvMatch[1]}`);
         dirStr = dirStr.replace(ucvMatch[0], '');
    }
    dirStr = dirStr.trim();
    
    let tagPrefix = parts.length > 0 ? `(${parts.join(' - ')}) ` : '';
    return `${tagPrefix}${dirStr}`;
};

const getZone = (addressStr: string | undefined): string => {
    if (!addressStr) return "";
    const match = addressStr.match(/\{\{zona:(.*?)\}\}/);
    return match ? match[1] : "";
};

const getUpcomingMonths = (count: number): string[] => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentMonthIndex = new Date().getMonth();
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
        const idx = (currentMonthIndex + i) % 12;
        result.push(months[idx]);
    }
    return result;
};

const DirectoryTemplate: React.FC<DirectoryTemplateProps> = ({ 
    groupName, 
    col1, 
    col2, 
    masterPublishers, 
    elementId,
    layoutMode = 'table',
    monthsCount = 0,
    orientation = 'portrait',
    compactness = 'compact',
    localMembersList = [],
    onMoveUp,
    onMoveDown
}) => {
    const isLandscape = orientation === 'landscape';
    const paperWidth = isLandscape ? '1123px' : '794px';
    const paperMinHeight = isLandscape ? '794px' : '1123px';
    
    // Determine list to use (supports drag/drop sort state)
    const membersToRender = localMembersList.length > 0 ? localMembersList : [...col1, ...col2];
    const upcomingMonths = getUpcomingMonths(monthsCount);
    
    // Choose font sizing, padding, and column widths based on compactness setting
    let fontSize = '9pt';
    let nameFontSize = '11.5pt';
    let paddingY = '4px';
    let titleFontSize = '20pt';
    let subTitleFontSize = '13pt';
    
    let colNameWidth = '190px';
    let colTelWidth = '120px';
    let colDirWidth = '140px';
    let monthColWidth = '165px'; // Much wider for more writing space
    
    let writeBoxHeight = '24px';
    let pBoxWidth = '22px';
    let hBoxWidth = '32px';
    let eBoxWidth = '32px';
    
    // Z column and Teléfono column are hidden when monthsCount > 0 to save space for physical handwritten logs
    const showZColumn = monthsCount === 0;
    const showTelColumn = monthsCount === 0;
    
    if (compactness === 'ultra') {
        fontSize = '7.5pt';
        nameFontSize = '10pt';
        paddingY = '2px';
        titleFontSize = '15pt';
        subTitleFontSize = '10pt';
        colNameWidth = monthsCount > 0 ? '160px' : '130px';
        colTelWidth = '85px';
        colDirWidth = monthsCount > 0 ? '110px' : '150px';
        monthColWidth = '145px';
        writeBoxHeight = '19px';
        pBoxWidth = '19px';
        hBoxWidth = '27px';
        eBoxWidth = '27px';
    } else if (compactness === 'compact') {
        fontSize = '8.5pt';
        nameFontSize = '12pt';
        paddingY = '3px';
        titleFontSize = '18pt';
        subTitleFontSize = '12pt';
        colNameWidth = monthsCount > 0 ? '180px' : '170px';
        colTelWidth = '110px';
        colDirWidth = monthsCount > 0 ? '125px' : '190px';
        monthColWidth = '165px';
        writeBoxHeight = '23px';
        pBoxWidth = '21px';
        hBoxWidth = '31px';
        eBoxWidth = '31px';
    } else if (compactness === 'normal') {
        fontSize = '10pt';
        nameFontSize = '14.5pt';
        paddingY = '6.5px';
        titleFontSize = '22pt';
        subTitleFontSize = '14pt';
        colNameWidth = monthsCount > 0 ? '240px' : '220px';
        colTelWidth = '130px';
        colDirWidth = monthsCount > 0 ? '150px' : '260px';
        monthColWidth = '185px';
        writeBoxHeight = '28px';
        pBoxWidth = '24px';
        hBoxWidth = '38px';
        eBoxWidth = '38px';
    }

    return (
        <div id={elementId} style={{ 
            width: paperWidth, 
            minHeight: paperMinHeight, 
            padding: compactness === 'ultra' ? '15px 25px' : '30px', 
            backgroundColor: '#ffffff', 
            color: '#1f2937', 
            fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', 
            boxSizing: 'border-box', 
            position: 'relative' 
        }}>
            
            {/* Header */}
            <div style={{ 
                borderBottom: '4px solid #2563eb', 
                paddingBottom: '8px', 
                marginBottom: compactness === 'ultra' ? '10px' : '20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-end' 
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: titleFontSize, color: '#1e3a8a', fontWeight: '900', letterSpacing: '-0.5px', lineHeight: '1' }}>
                        GRUPO DE PREDICACIÓN
                    </h1>
                    <p style={{ margin: '4px 0 0 0', fontSize: subTitleFontSize, color: '#4b5563', fontWeight: '700' }}>
                        {groupName} • {monthsCount > 0 ? 'Registro de Predicación' : 'Información de Contacto'}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <i className="fas fa-users" style={{ fontSize: compactness === 'ultra' ? '18pt' : '24pt', color: '#1e40af' }}></i>
                </div>
            </div>

            {layoutMode === 'cards' ? (
                /* Original side-by-side cards display */
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    {[col1, col2].map((colMembers, colIndex) => (
                        <div key={colIndex} style={{ flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', fontSize: fontSize }}>
                                <thead>
                                    <tr>
                                        <th style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid #3b82f6', color: '#1e3a8a', padding: '4px 4px', textAlign: 'left', fontWeight: '800', fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.6px', width: '45%' }}>Nombre</th>
                                        <th style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid #3b82f6', color: '#1e3a8a', padding: '4px 4px', textAlign: 'left', fontWeight: '800', fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.6px', width: '55%' }}>Datos Personales</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {colMembers.map((m, idx) => {
                                        const isOdd = idx % 2 !== 0;
                                        const displayBg = isOdd ? '#f8fafc' : '#ffffff';
                                        const rowColor = '#1f2937';
                                        const pubDetails = masterPublishers?.find(p => p.nombre.trim().toLowerCase() === m.publicador_nombre.trim().toLowerCase());
                                        const abbreviatedRole = getAbbreviatedRole(m.rol || '');
                                        
                                        return (
                                            <tr key={m.id} style={{ backgroundColor: displayBg }}>
                                                <td style={{ padding: `${paddingY} 4px`, fontWeight: '700', color: rowColor, borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                                                    <div style={{ fontSize: nameFontSize }}>{m.publicador_nombre}</div>
                                                    {abbreviatedRole && abbreviatedRole !== 'PUB' && (
                                                        <div style={{ fontSize: '6.5pt', fontWeight:'800', marginTop: '1px', color: abbreviatedRole.includes('PR') ? '#2563eb' : (abbreviatedRole.includes('PA') ? '#d97706' : '#7c3aed') }}>
                                                            {abbreviatedRole}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: `${paddingY} 4px`, fontSize: '7.5pt', color: '#4b5563', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' }}>
                                                    {!pubDetails?.direccion && !pubDetails?.contacto_emergencia && !pubDetails?.telefono_personal && (
                                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin datos</span>
                                                    )}
                                                    {(() => {
                                                        if (!pubDetails?.direccion) return null;
                                                        let dirStr = pubDetails.direccion;
                                                        let parts = [];
                                                        
                                                        const zonaMatch = dirStr.match(/\{\{zona:(.*?)\}\}/);
                                                        if (zonaMatch) {
                                                            parts.push(`Zona ${zonaMatch[1]}`);
                                                            dirStr = dirStr.replace(zonaMatch[0], '');
                                                        }
                                                        const ucvMatch = dirStr.match(/\{\{ucv:(.*?)\}\}/);
                                                        if (ucvMatch) {
                                                            parts.push(`UCV ${ucvMatch[1]}`);
                                                            dirStr = dirStr.replace(ucvMatch[0], '');
                                                        }
                                                        dirStr = dirStr.trim();
                                                        
                                                        let tagPrefix = parts.length > 0 ? `(${parts.join(' - ')}) ` : '';
                                                        
                                                        if (dirStr || parts.length > 0) {
                                                            return (
                                                                <div style={{ marginBottom: '4px' }}>
                                                                    <i className="fas fa-home" style={{ color: '#64748b', marginRight: '4px', width: '12px', textAlign: 'center' }}></i>
                                                                    <span style={{ fontWeight: parts.length > 0 ? '600' : 'normal', color: parts.length > 0 ? '#3b82f6' : 'inherit' }}>{tagPrefix}</span>
                                                                    {dirStr}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                    {pubDetails?.telefono_personal && (
                                                        <div style={{ marginBottom: pubDetails?.contacto_emergencia ? '4px' : '0' }}>
                                                            <i className="fas fa-mobile-alt" style={{ color: '#64748b', marginRight: '4px', width: '12px', textAlign: 'center' }}></i>
                                                            {pubDetails.telefono_personal} 
                                                        </div>
                                                    )}
                                                    {pubDetails?.contacto_emergencia && (
                                                        <div>
                                                            <i className="fas fa-phone" style={{ color: '#64748b', marginRight: '4px', width: '12px', textAlign: 'center' }}></i>
                                                            <span style={{ fontSize: '0.85em', color: '#94a3b8', fontStyle: 'italic', marginRight: '2px' }}>Emerg.:</span>
                                                            {pubDetails.contacto_emergencia}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            ) : (
                /* Redesigned Compact Grid Table (Identical in clean visual language to "Rol de Grupos") */
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse', 
                        fontSize: fontSize, 
                        border: '1.5px solid #475569' 
                    }}>
                        <thead>
                            <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                                <th style={{ border: '1px solid #475569', padding: `${paddingY} 4px`, textAlign: 'center', width: '35px', fontWeight: '800' }}>N°</th>
                                {showZColumn && <th style={{ border: '1px solid #475569', padding: `${paddingY} 4px`, textAlign: 'center', width: '35px', fontWeight: '800' }}>Z</th>}
                                <th style={{ border: '1px solid #475569', padding: `${paddingY} 6px`, textAlign: 'left', fontWeight: '800', width: colNameWidth }}>Nombre</th>
                                <th style={{ border: '1px solid #475569', padding: `${paddingY} 4px`, textAlign: 'center', width: '60px', fontWeight: '800' }}>Desig.</th>
                                {showTelColumn && <th style={{ border: '1px solid #475569', padding: `${paddingY} 6px`, textAlign: 'left', fontWeight: '800', width: colTelWidth }}>Teléfono</th>}
                                <th style={{ border: '1px solid #475569', padding: `${paddingY} 6px`, textAlign: 'left', fontWeight: '800', width: colDirWidth }}>Dirección</th>
                                
                                {upcomingMonths.map((mHead, mIdx) => (
                                    <th key={mIdx} style={{ 
                                        border: '1px solid #475569', 
                                        padding: '10px 4px', 
                                        textAlign: 'center', 
                                        width: monthColWidth, 
                                        fontWeight: '800',
                                        backgroundColor: '#172554',
                                        color: '#ffffff',
                                        fontSize: '9.5pt',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {mHead}
                                    </th>
                                ))}
                                
                                <th data-html2canvas-ignore="true" style={{ border: '1px solid #475569', padding: `${paddingY} 4px`, textAlign: 'center', width: '65px', fontWeight: '800', backgroundColor: '#334155' }}>Orden</th>
                            </tr>
                        </thead>
                        <tbody>
                            {membersToRender.map((m, idx) => {
                                const isOdd = idx % 2 !== 0;
                                const displayBg = isOdd ? '#f8fafc' : '#ffffff';
                                const pubDetails = masterPublishers?.find(p => p.nombre.trim().toLowerCase() === m.publicador_nombre.trim().toLowerCase());
                                const abbreviatedRole = getAbbreviatedRole(m.rol || '');
                                const zone = getZone(pubDetails?.direccion);
                                const phone = pubDetails?.telefono_personal || "";
                                const formattedAddr = formatAddress(pubDetails?.direccion);
                                
                                // Specific background for special assignments
                                let roleBadgeBg = '#f1f5f9';
                                let roleBadgeColor = '#475569';
                                if (abbreviatedRole.includes('ANC')) { roleBadgeBg = '#fee2e2'; roleBadgeColor = '#b91c1c'; }
                                else if (abbreviatedRole.includes('SM')) { roleBadgeBg = '#fef3c7'; roleBadgeColor = '#b45309'; }
                                else if (abbreviatedRole.includes('PR')) { roleBadgeBg = '#dbeafe'; roleBadgeColor = '#1d4ed8'; }
                                else if (abbreviatedRole.includes('PE')) { roleBadgeBg = '#e0f2fe'; roleBadgeColor = '#0369a1'; }
                                else if (abbreviatedRole.includes('PA')) { roleBadgeBg = '#f3e8ff'; roleBadgeColor = '#6b21a8'; }

                                return (
                                    <tr key={idx} style={{ 
                                        backgroundColor: displayBg, 
                                        color: '#1f2937'
                                    }}>
                                        <td style={{ border: '1px solid #94a3b8', padding: `${paddingY} 4px`, textAlign: 'center', fontWeight: '700', fontSize: '8.5pt' }}>
                                            {idx + 1}
                                        </td>
                                        {showZColumn && (
                                            <td style={{ border: '1px solid #94a3b8', padding: `${paddingY} 4px`, textAlign: 'center', fontWeight: '700', color: '#2563eb', fontSize: '8.5pt' }}>
                                                {zone}
                                            </td>
                                        )}
                                        <td style={{ border: '1px solid #94a3b8', padding: `${paddingY} 6px`, fontWeight: '700', fontSize: nameFontSize }}>
                                            {m.publicador_nombre}
                                        </td>
                                        <td style={{ border: '1px solid #94a3b8', padding: `${paddingY} 4.5px`, textAlign: 'center' }}>
                                            <span style={{ 
                                                backgroundColor: roleBadgeBg, 
                                                color: roleBadgeColor, 
                                                fontSize: '7pt', 
                                                fontWeight: '900', 
                                                padding: '2px 5px', 
                                                borderRadius: '4px',
                                                display: 'inline-block',
                                                border: `1px solid ${roleBadgeColor}20`
                                            }}>
                                                {abbreviatedRole || 'PUB'}
                                            </span>
                                        </td>
                                        {showTelColumn && (
                                            <td style={{ border: '1px solid #94a3b8', padding: `${paddingY} 6px`, color: '#334155', fontWeight: '600', fontSize: '8.5pt' }}>
                                                {phone || <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontWeight: 'normal' }}>—</span>}
                                            </td>
                                        )}
                                        <td style={{ 
                                            border: '1px solid #94a3b8', 
                                            padding: `${paddingY} 5px`, 
                                            color: '#4b5563', 
                                            fontSize: compactness === 'ultra' ? '6.5pt' : (compactness === 'compact' ? '7.5pt' : '8pt'),
                                            lineHeight: '1.2',
                                            wordBreak: 'break-word',
                                            overflowWrap: 'anywhere'
                                        }}>
                                            {formattedAddr || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Sin dirección registrada</span>}
                                        </td>
                                        
                                        {/* Blank month checklist boxes for recording hours, studies, status manually */}
                                        {upcomingMonths.map((_, mIdx) => (
                                            <td key={mIdx} style={{ border: '1px solid #94a3b8', padding: '6px 5px', verticalAlign: 'top', textAlign: 'left' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4.5px' }}>
                                                    {/* Checkbox row */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <div style={{ 
                                                            width: '12px', 
                                                            height: '12px', 
                                                            border: '1.2px solid #475569', 
                                                            borderRadius: '2px', 
                                                            backgroundColor: '#ffffff',
                                                            flexShrink: 0
                                                        }}></div>
                                                        <span style={{ fontSize: '7pt', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap' }}>Sí Predicó</span>
                                                    </div>
                                                    
                                                    {/* Horas row */}
                                                    <div style={{ fontSize: '7pt', color: '#4b5563', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', fontWeight: '600' }}>
                                                        Horas: <span style={{ display: 'inline-block', flex: 1, minWidth: '24px', borderBottom: '1px dotted #94a3b8', marginLeft: '3px', height: '11px' }}></span>
                                                    </div>
                                                    
                                                    {/* Estudios row */}
                                                    <div style={{ fontSize: '7pt', color: '#4b5563', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', fontWeight: '600' }}>
                                                        Estudios: <span style={{ display: 'inline-block', flex: 1, minWidth: '20px', borderBottom: '1px dotted #94a3b8', marginLeft: '3px', height: '11px' }}></span>
                                                    </div>
                                                </div>
                                            </td>
                                        ))}
                                        
                                        {/* Row Ordering operations */}
                                        <td data-html2canvas-ignore="true" style={{ 
                                            border: '1px solid #94a3b8', 
                                            padding: '2px 4px', 
                                            textAlign: 'center',
                                            verticalAlign: 'middle'
                                        }}>
                                            <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                                <button 
                                                    type="button"
                                                    onClick={() => onMoveUp && onMoveUp(idx)}
                                                    disabled={idx === 0}
                                                    style={{ 
                                                        padding: '4px 6px', 
                                                        fontSize: '8pt', 
                                                        borderRadius: '4px', 
                                                        border: '1px solid #cbd5e1', 
                                                        backgroundColor: idx === 0 ? '#f1f5f9' : '#ffffff', 
                                                        color: idx === 0 ? '#cbd5e1' : '#475569', 
                                                        cursor: idx === 0 ? 'not-allowed' : 'pointer' 
                                                    }}
                                                    title="Subir"
                                                >
                                                    <i className="fas fa-chevron-up"></i>
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => onMoveDown && onMoveDown(idx)}
                                                    disabled={idx === membersToRender.length - 1}
                                                    style={{ 
                                                        padding: '4px 6px', 
                                                        fontSize: '8pt', 
                                                        borderRadius: '4px', 
                                                        border: '1px solid #cbd5e1', 
                                                        backgroundColor: idx === membersToRender.length - 1 ? '#f1f5f9' : '#ffffff', 
                                                        color: idx === membersToRender.length - 1 ? '#cbd5e1' : '#475569', 
                                                        cursor: idx === membersToRender.length - 1 ? 'not-allowed' : 'pointer' 
                                                    }}
                                                    title="Bajar"
                                                >
                                                    <i className="fas fa-chevron-down"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer */}
            <div style={{ 
                position: 'absolute', 
                bottom: compactness === 'ultra' ? '12px' : '20px', 
                left: compactness === 'ultra' ? '25px' : '30px', 
                right: compactness === 'ultra' ? '25px' : '30px', 
                borderTop: '1px solid #e2e8f0', 
                paddingTop: '8px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '9px', 
                color: '#9ca3af' 
            }}>
                <span>Generado automáticamente • Registro de Grupo</span>
                <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
        </div>
    );
};

export default DirectoryTemplate;
