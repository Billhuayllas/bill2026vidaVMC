
import React from 'react';
import { GroupMember, ReportsMap, GroupStats } from './types';
import { formatMonth, cleanNotes } from './utils';

interface PrintTemplateProps {
    groupName: string;
    month: string;
    stats: GroupStats;
    col1: GroupMember[];
    col2: GroupMember[];
    reports: ReportsMap;
    elementId?: string;
}

const PrintTemplate: React.FC<PrintTemplateProps> = ({ groupName, month, stats, col1, col2, reports, elementId }) => (
    <div id={elementId} style={{ width: '794px', minHeight: '1123px', padding: '30px', backgroundColor: '#ffffff', color: '#1f2937', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', boxSizing: 'border-box', position: 'relative' }}>
        
        {/* Header */}
        <div style={{ borderBottom: '4px solid #2563eb', paddingBottom: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '20pt', color: '#1e3a8a', fontWeight: '900', letterSpacing: '-0.5px', lineHeight: '1' }}>INFORME DE ACTIVIDAD</h1>
                <p style={{ margin: '4px 0 0 0', fontSize: '13pt', color: '#4b5563', fontWeight: '700' }}>{groupName} • Congregación 15 de Julio</p>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ padding: '6px 15px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '2px solid #bfdbfe' }}>
                    <p style={{ margin: 0, fontSize: '14pt', fontWeight: '900', textTransform: 'capitalize', color: '#1e40af' }}>{formatMonth(month)}</p>
                </div>
            </div>
        </div>

        {/* Stats Detailed Summary */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {/* Box 1: Publicadores y Roles */}
            <div style={{ flex: 1.2, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', backgroundColor: '#f9fafb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{color:'#4b5563', fontSize:'8pt', fontWeight:'800', textTransform:'uppercase', letterSpacing:'0.7px'}}>Total Publicadores</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop:'4px' }}>
                    <span style={{fontSize:'20pt', fontWeight:'900', color:'#1f2937', lineHeight:'1'}}>{stats.totalMembers}</span>
                    <div style={{fontSize:'8pt', color:'#6b7280', display:'flex', gap:'6px', fontWeight:'600', flexWrap: 'wrap'}}>
                        {stats.roles.pe.count > 0 && <span style={{backgroundColor:'#f3e8ff', color:'#6b21a8', padding:'2px 6px', borderRadius:'4px'}}>Esp: <b>{stats.roles.pe.count}</b></span>}
                        <span style={{backgroundColor:'#dbeafe', color:'#1e40af', padding:'2px 6px', borderRadius:'4px'}}>Reg: <b>{stats.roles.pr.count}</b></span>
                        <span style={{backgroundColor:'#fef3c7', color:'#92400e', padding:'2px 6px', borderRadius:'4px'}}>Aux: <b>{stats.roles.pa.count}</b></span>
                        <span>Pub: <b>{stats.roles.pub.count}</b></span>
                    </div>
                </div>
            </div>

            {/* Box 2: Horas */}
            <div style={{ flex: 0.8, border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px', backgroundColor: '#eff6ff' }}>
                <div style={{color:'#1e40af', fontSize:'8pt', fontWeight:'800', textTransform:'uppercase', letterSpacing:'0.7px'}}>Total Horas</div>
                <div style={{fontSize:'20pt', fontWeight:'900', color:'#1e3a8a', lineHeight:'1', marginTop:'4px'}}>{stats.hours.toLocaleString()}</div>
            </div>

            {/* Box 3: Estudios */}
            <div style={{ flex: 1, border: '1px solid #e9d5ff', borderRadius: '8px', padding: '10px', backgroundColor: '#faf5ff' }}>
                <div style={{color:'#7e22ce', fontSize:'8pt', fontWeight:'800', textTransform:'uppercase', letterSpacing:'0.7px'}}>Estudios Bíblicos</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop:'4px' }}>
                    <span style={{fontSize:'20pt', fontWeight:'900', color:'#6b21a8', lineHeight:'1'}}>{stats.studies}</span>
                    <span style={{fontSize:'8pt', color:'#dc2626', fontWeight:'700'}}>({stats.noStudies} sin est.)</span>
                </div>
            </div>

            {/* Box 4: Informes */}
            <div style={{ flex: 1, border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px', backgroundColor: '#f0fdf4' }}>
                <div style={{color:'#15803d', fontSize:'8pt', fontWeight:'800', textTransform:'uppercase', letterSpacing:'0.7px'}}>Informes Entregados</div>
                <div style={{fontSize:'20pt', fontWeight:'900', color:'#14532d', lineHeight:'1', marginTop:'4px'}}>
                    {stats.submitted} <span style={{fontSize:'12pt', fontWeight:'700', color:'#16a34a', marginLeft:'2px'}}>/ {stats.totalMembers}</span>
                </div>
            </div>
        </div>

        {/* Tables Container */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {[col1, col2].map((colMembers, colIndex) => (
                <div key={colIndex} style={{ flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', fontSize: '10pt' }}>
                        <thead>
                            <tr>
                                <th style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid #3b82f6', color: '#1e3a8a', padding: '6px 4px', textAlign: 'left', fontWeight: '800', fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.6px', width: '45%' }}>Nombre</th>
                                <th style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid #3b82f6', color: '#1e3a8a', padding: '6px 2px', textAlign: 'center', fontWeight: '800', fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.6px', width: '12%' }}>Horas</th>
                                <th style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid #3b82f6', color: '#1e3a8a', padding: '6px 2px', textAlign: 'center', fontWeight: '800', fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.6px', width: '10%' }}>Est.</th>
                                <th style={{ backgroundColor: '#f1f5f9', borderBottom: '3px solid #3b82f6', color: '#1e3a8a', padding: '6px 4px', textAlign: 'left', fontWeight: '800', fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.6px', width: '33%' }}>Notas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {colMembers.map((m, idx) => {
                                const r = reports[m.publicador_nombre];
                                const isOdd = idx % 2 !== 0;
                                const hasReport = r !== undefined;
                                
                                const totalHours = r ? (Number(r.horas || 0) + Number(r.horas_especiales || 0)) : 0;
                                const hasHours = totalHours > 0;
                                
                                const displayBg = isOdd ? '#f8fafc' : '#ffffff';
                                const rowColor = '#1f2937';
                                
                                return (
                                    <tr key={m.id} style={{ backgroundColor: displayBg }}>
                                        <td style={{ padding: '4px 4px', fontWeight: '700', color: rowColor, borderBottom: '1px solid #e2e8f0', fontSize: '9pt' }}>
                                            {m.publicador_nombre}
                                            {m.rol && m.rol !== 'Publicador' && (
                                                <span style={{ fontSize: '0.75em', fontWeight:'800', marginLeft: '4px', color: m.rol.includes('Precursor Regular') ? '#2563eb' : (m.rol.includes('Precursor Auxiliar') ? '#d97706' : (m.rol.includes('Precursor Especial') ? '#7c3aed' : '#475569')) }}>
                                                    {m.rol.includes('Precursor Regular') ? 'PR' : (m.rol.includes('Precursor Auxiliar') ? 'PA' : (m.rol.includes('Precursor Especial') ? 'PE' : (m.rol.includes('Anciano') ? 'A' : (m.rol.includes('Siervo ministerial') ? 'SM' : 'P'))))}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '4px 2px', textAlign: 'center', color: hasReport ? (r?.participo === false ? '#ef4444' : (hasHours ? '#111827' : '#16a34a')) : '#cbd5e1', fontWeight: '800', borderBottom: '1px solid #e2e8f0', fontSize: hasHours ? '10pt' : '11pt' }}>
                                            {hasReport ? (r?.participo === false ? '❌' : (hasHours ? totalHours : '✔')) : '•'}
                                        </td>
                                        <td style={{ padding: '4px 2px', textAlign: 'center', color: rowColor, fontWeight: '800', borderBottom: '1px solid #e2e8f0', fontSize: '9pt' }}>{r?.estudios || ''}</td>
                                        <td style={{ padding: '4px 4px', fontSize: '8pt', color: '#4b5563', borderBottom: '1px solid #e2e8f0', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '0' }}>{cleanNotes(r?.notas || '')}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '20px', left: '30px', right: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af' }}>
            <span>Generado automáticamente</span>
            <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
    </div>
);

export default PrintTemplate;
