import React from 'react';
import { Group, GroupMember, Publisher } from './types';

interface GlobalDirectoryTemplateProps {
    elementId?: string;
    groupGroups: { group: Group; entries: { member: GroupMember, publisher: Publisher }[] }[];
    unassigned: { member: GroupMember, publisher: Publisher }[];
    compact?: boolean;
    showAddresses?: boolean;
}

const GlobalDirectoryTemplate: React.FC<GlobalDirectoryTemplateProps> = ({ elementId, groupGroups, unassigned, compact = false, showAddresses = true }) => {
    
    const renderEntry = (entry: { member: GroupMember, publisher: Publisher }, groupName: string, idx: number) => {
        const { member, publisher } = entry;
        const isOdd = idx % 2 !== 0;
        const displayBg = isOdd ? '#f8fafc' : '#ffffff';
        
        let dirStr = publisher.direccion || '';
        let parts = [];
        const zonaMatch = dirStr.match(/\{\{zona:(.*?)\}\}/);
        if (zonaMatch) dirStr = dirStr.replace(zonaMatch[0], '');
        const ucvMatch = dirStr.match(/\{\{ucv:(.*?)\}\}/);
        if (ucvMatch) {
            parts.push(`UCV ${ucvMatch[1]}`);
            dirStr = dirStr.replace(ucvMatch[0], '');
        }
        dirStr = dirStr.trim();
        const tagPrefix = parts.length > 0 ? `(${parts.join(' - ')}) ` : '';

        return (
            <tr key={member.id} style={{ backgroundColor: displayBg }}>
                <td style={{ padding: compact ? '1px 2px' : '2px 4px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top', width: compact ? '40%' : '35%' }}>
                    <div style={{ fontWeight: '700', color: '#1f2937', fontSize: compact ? '7.5pt' : '8.5pt' }}>{member.publicador_nombre}</div>
                    <div style={{ fontSize: compact ? '6pt' : '7pt', color: '#64748b', marginTop: '1px', fontWeight: '600' }}>{groupName}</div>
                    {member.rol && member.rol !== 'Publicador' && (
                        <div style={{ fontSize: compact ? '5.5pt' : '6.5pt', fontWeight:'800', marginTop: '1px', color: member.rol.includes('Precursor Regular') ? '#2563eb' : (member.rol.includes('Precursor Auxiliar') ? '#d97706' : '#7c3aed') }}>
                            {member.rol}
                        </div>
                    )}
                </td>
                <td style={{ padding: compact ? '1px 2px' : '2px 4px', fontSize: compact ? '6.5pt' : '7.5pt', color: '#4b5563', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top', width: compact ? '60%' : '65%' }}>
                    {!publisher.direccion && !publisher.contacto_emergencia && !publisher.telefono_personal && (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin datos</span>
                    )}
                    {showAddresses && (dirStr || parts.length > 0) && (
                        <div style={{ marginBottom: '1px' }}>
                            <i className="fas fa-home" style={{ color: '#64748b', marginRight: '4px', width: '10px', textAlign: 'center' }}></i>
                            <span style={{ fontWeight: parts.length > 0 ? '600' : 'normal', color: parts.length > 0 ? '#3b82f6' : 'inherit' }}>{tagPrefix}</span>
                            {dirStr}
                        </div>
                    )}
                    {publisher.telefono_personal && (
                        <div style={{ marginBottom: publisher.contacto_emergencia ? '1px' : '0' }}>
                            <i className="fas fa-mobile-alt" style={{ color: '#64748b', marginRight: '4px', width: '10px', textAlign: 'center' }}></i>
                            {publisher.telefono_personal} 
                        </div>
                    )}
                    {publisher.contacto_emergencia && (
                        <div>
                            <i className="fas fa-phone" style={{ color: '#64748b', marginRight: '4px', width: '10px', textAlign: 'center' }}></i>
                            <span style={{ fontSize: '0.85em', color: '#94a3b8', fontStyle: 'italic', marginRight: '2px' }}>Emerg.:</span>
                            {publisher.contacto_emergencia}
                        </div>
                    )}
                </td>
            </tr>
        );
    };

    return (
        <div id={elementId} style={{ 
            width: '100%', 
            minHeight: '1123px', // A4 min height
            backgroundColor: '#ffffff', 
            color: '#1f2937', 
            fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', 
            boxSizing: 'border-box'
        }}>
            {/* Header */}
            <div style={{ borderBottom: '3px solid #10b981', paddingBottom: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '20px 30px 10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '18pt', color: '#065f46', fontWeight: '900', letterSpacing: '-0.5px', lineHeight: '1' }}>DIRECTORIO GENERAL</h1>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11pt', color: '#4b5563', fontWeight: '700' }}>Ordenado por Grupos</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <i className="fas fa-users" style={{ fontSize: '20pt', color: '#059669' }}></i>
                </div>
            </div>

            <div style={{ padding: compact ? '0 15px 15px' : '0 30px 20px', columnCount: compact ? (showAddresses ? 2 : 3) : 1, columnGap: compact ? '20px' : '0' }}>
                {groupGroups.map((groupDesc, idx) => (
                    <div key={idx} style={{ marginBottom: compact ? '10px' : '15px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <h2 style={{ 
                            fontSize: compact ? '10pt' : '12pt', 
                            color: '#ffffff', 
                            backgroundColor: '#059669', 
                            padding: compact ? '2px 8px' : '4px 10px', 
                            margin: '0 0 6px 0',
                            borderRadius: '4px',
                            display: 'inline-block',
                            fontWeight: '800'
                        }}>
                            {groupDesc.group.nombre}
                        </h2>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', fontSize: compact ? '7.5pt' : '9pt', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
                            <tbody>
                                {groupDesc.entries.map((entry, i) => renderEntry(entry, groupDesc.group.nombre, i))}
                            </tbody>
                        </table>
                    </div>
                ))}

                {unassigned.length > 0 && (
                    <div style={{ marginBottom: compact ? '10px' : '15px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                         <h2 style={{ 
                            fontSize: compact ? '10pt' : '12pt', 
                            color: '#475569', 
                            backgroundColor: '#e2e8f0', 
                            padding: compact ? '2px 8px' : '4px 10px', 
                            margin: '0 0 6px 0',
                            borderRadius: '4px',
                            display: 'inline-block',
                            fontWeight: '800'
                        }}>
                            Sin Grupo Asignado
                        </h2>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', fontSize: compact ? '7.5pt' : '9pt', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
                            <tbody>
                                {unassigned.map((entry, i) => renderEntry(entry, "Sin Grupo", i))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalDirectoryTemplate;
