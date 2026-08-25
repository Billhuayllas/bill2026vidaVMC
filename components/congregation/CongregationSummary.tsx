
import React, { useMemo, useState } from 'react';
import { AggregatedGroupStats, RoleStats, MonthlyChange } from './types';
import { formatRoleForChanges } from './utils';
import StatCards from './StatCards';

interface CongregationSummaryProps {
    data: AggregatedGroupStats[];
    month: string;
    loading: boolean;
    monthlyChanges?: MonthlyChange[];
}

const CongregationSummary: React.FC<CongregationSummaryProps> = ({ data, month, loading, monthlyChanges = [] }) => {
    const [showChangesModal, setShowChangesModal] = useState(false);
    
    const grandTotal = useMemo(() => {
        const total = {
            hours: 0,
            studies: 0,
            submitted: 0,
            totalMembers: 0,
            noStudies: 0,
            roles: {
                pr: { count: 0, hours: 0, studies: 0 },
                pa: { count: 0, hours: 0, studies: 0 },
                pe: { count: 0, hours: 0, studies: 0 },
                pub: { count: 0, hours: 0, studies: 0 }
            }
        };

        data.forEach(g => {
            total.hours += g.stats.hours;
            total.studies += g.stats.studies;
            total.submitted += g.stats.submitted;
            total.totalMembers += g.stats.totalMembers;
            total.noStudies += g.stats.noStudies;

            total.roles.pr.count += g.stats.roles.pr.count;
            total.roles.pr.hours += g.stats.roles.pr.hours;
            total.roles.pr.studies += g.stats.roles.pr.studies;

            total.roles.pa.count += g.stats.roles.pa.count;
            total.roles.pa.hours += g.stats.roles.pa.hours;
            total.roles.pa.studies += g.stats.roles.pa.studies;

            total.roles.pe.count += g.stats.roles.pe.count;
            total.roles.pe.hours += g.stats.roles.pe.hours;
            total.roles.pe.studies += g.stats.roles.pe.studies;

            total.roles.pub.count += g.stats.roles.pub.count;
            total.roles.pub.hours += g.stats.roles.pub.hours;
            total.roles.pub.studies += g.stats.roles.pub.studies;
        });

        return total;
    }, [data]);

    const renderRoleCell = (stats: RoleStats, color: string) => (
        <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid var(--border-color)', color: stats.count > 0 ? color : 'var(--text-color-light)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>{stats.count}</span>
                {stats.count > 0 && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        {stats.hours.toLocaleString()}h | {stats.studies}e
                    </span>
                )}
            </div>
        </td>
    );

    const renderCombinedPRCell = (pr: RoleStats, pe: RoleStats, isTotal: boolean = false) => {
        const totalCount = pr.count + pe.count;
        const totalHours = pr.hours + pe.hours;
        const totalStudies = pr.studies + pe.studies;

        return (
            <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid var(--border-color)', color: totalCount > 0 ? (isTotal ? '#1e3a8a' : '#2563eb') : 'var(--text-color-light)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>{pr.count}</span>
                        {pe.count > 0 && (
                            <span style={{ fontSize: '0.7rem', color: isTotal ? '#1e3a8a' : '#7c3aed', fontWeight: 'bold' }}>
                                + {pe.count} Esp
                            </span>
                        )}
                    </div>
                    {totalCount > 0 && (
                        <span style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>
                            {totalHours.toLocaleString()}h | {totalStudies}e
                        </span>
                    )}
                </div>
            </td>
        );
    };

    if (loading) return <div style={{textAlign:'center', padding:'3rem', color:'var(--text-color-light)'}}>Calculando totales...</div>;

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ marginBottom: '25px', textAlign: 'center' }}>
                <h2 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.4rem' }}>Resumen Congregación</h2>
                <div style={{ color: 'var(--primary-color)', fontWeight: 'bold', textTransform: 'capitalize' }}>{month}</div>
                
                {/* Monthly Changes Button */}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                    <button 
                        onClick={() => setShowChangesModal(true)}
                        className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
                        style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)' }}
                    >
                        <span className="text-amber-500">🔔</span>
                        <span>Cambios del Mes</span>
                        {monthlyChanges && monthlyChanges.length > 0 ? (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                                {monthlyChanges.length}
                            </span>
                        ) : (
                            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--light-gray)', color: 'var(--text-color-light)' }}>
                                0
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Grand Total Cards */}
            <div style={{ marginBottom: '30px' }}>
                <StatCards stats={grandTotal} />
            </div>

            {/* Detailed Table */}
            <div style={{ overflowX: 'auto', backgroundColor: 'var(--card-bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '900px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--light-gray)', color: 'var(--text-color-light)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', borderBottom: '2px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>Grupo</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', borderBottom: '2px solid var(--border-color)', borderRight: '1px solid var(--border-color)', color: '#2563eb' }}>Pre. Regulares y Especiales<br/><span style={{fontSize:'0.65rem', fontWeight:'500'}}>(Cant | Hrs | Est)</span></th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', borderBottom: '2px solid var(--border-color)', borderRight: '1px solid var(--border-color)', color: '#f59e0b' }}>Pre. Auxiliares<br/><span style={{fontSize:'0.65rem', fontWeight:'500'}}>(Cant | Hrs | Est)</span></th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', borderBottom: '2px solid var(--border-color)', borderRight: '1px solid var(--border-color)', color: '#4b5563' }}>Publicadores<br/><span style={{fontSize:'0.65rem', fontWeight:'500'}}>(Cant | Hrs | Est)</span></th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', borderBottom: '2px solid var(--border-color)', backgroundColor:'#f0f9ff', color:'#1e3a8a' }}>TOTAL GRUPO<br/><span style={{fontSize:'0.65rem', fontWeight:'500'}}>(Pubs | Hrs | Est)</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((g, idx) => {
                            return (
                            <tr key={g.groupId} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                                <td style={{ padding: '12px', fontWeight: '600', color: 'var(--text-color)', borderRight: '1px solid var(--border-color)' }}>
                                    {g.groupName}
                                    <div style={{fontSize: '0.75rem', fontWeight: '400', color: 'var(--text-color-light)', marginTop: '2px'}}>
                                        {Math.round((g.stats.submitted / (g.stats.totalMembers || 1)) * 100)}% informes
                                    </div>
                                </td>
                                {renderCombinedPRCell(g.stats.roles.pr, g.stats.roles.pe)}
                                {renderRoleCell(g.stats.roles.pa, '#f59e0b')}
                                {renderRoleCell(g.stats.roles.pub, 'var(--text-color)')}
                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700', backgroundColor: '#f0f9ff' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1rem', fontWeight:'800', color: '#1e3a8a' }}>{g.stats.totalMembers} Pubs.</span>
                                        <div style={{ fontSize: '0.85rem', color: '#1e40af', marginTop:'2px', display:'flex', gap:'8px' }}>
                                            <span>{g.stats.hours.toLocaleString()}h</span>
                                            <span style={{ color:'#7c3aed' }}>{g.stats.studies}e</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )})}
                        <tr style={{ backgroundColor: '#eff6ff', borderTop: '2px solid #bfdbfe' }}>
                            <td style={{ padding: '12px', fontWeight: '800', color: '#1e3a8a', borderRight: '1px solid #bfdbfe' }}>GRAN TOTAL</td>
                            {renderCombinedPRCell(grandTotal.roles.pr, grandTotal.roles.pe, true)}
                            {renderRoleCell(grandTotal.roles.pa, '#1e3a8a')}
                            {renderRoleCell(grandTotal.roles.pub, '#1e3a8a')}
                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: '800', backgroundColor: '#dbeafe', borderLeft:'2px solid #bfdbfe' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.2rem', color: '#1e3a8a' }}>{grandTotal.totalMembers} Pubs.</span>
                                    <div style={{ fontSize: '0.9rem', color: '#1e40af', marginTop:'2px', display:'flex', gap:'8px' }}>
                                        <span>{grandTotal.hours.toLocaleString()}h</span>
                                        <span style={{ color:'#6b21a8' }}>{grandTotal.studies}e</span>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Changes Modal */}
            {showChangesModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        backgroundColor: 'var(--card-bg-color, #ffffff)',
                        borderRadius: '16px',
                        maxWidth: '500px',
                        width: '100%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        overflow: 'hidden',
                        animation: 'scaleIn 0.2s ease-out'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border-color, #e2e8f0)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.2rem' }}>🔔</span>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-color, #1e293b)' }}>
                                    Cambios del Mes ({month})
                                </h3>
                            </div>
                            <button 
                                onClick={() => setShowChangesModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: 'var(--text-color-light, #64748b)',
                                    lineHeight: 1
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-color-light, #64748b)' }}>
                                A continuación se muestran los cambios de rol, grupo o nuevos ingresos en comparación con el mes anterior.
                            </p>

                            {(!monthlyChanges || monthlyChanges.length === 0) ? (
                                <div style={{
                                    padding: '30px 20px',
                                    textAlign: 'center',
                                    color: 'var(--text-color-light, #64748b)',
                                    backgroundColor: 'rgba(0,0,0,0.01)',
                                    borderRadius: '12px',
                                    border: '1px dashed var(--border-color, #e2e8f0)'
                                }}>
                                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>✨</span>
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>No se detectaron cambios este mes.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {monthlyChanges.map((change, idx) => {
                                        let bg = 'rgba(59, 130, 246, 0.05)';
                                        let border = '1px solid rgba(59, 130, 246, 0.15)';
                                        let icon = '👤';
                                        let desc = '';

                                        if (change.type === 'role') {
                                            bg = 'rgba(59, 130, 246, 0.05)';
                                            border = '1px solid rgba(59, 130, 246, 0.15)';
                                            icon = '👤';
                                            desc = `Cambió de rol: ${formatRoleForChanges(change.fromValue || '')} ➔ ${formatRoleForChanges(change.toValue || '')}`;
                                        } else if (change.type === 'group') {
                                            bg = 'rgba(139, 92, 246, 0.05)';
                                            border = '1px solid rgba(139, 92, 246, 0.15)';
                                            icon = '👥';
                                            desc = `Cambió de grupo: ${change.fromValue} ➔ ${change.toValue}`;
                                        } else if (change.type === 'new') {
                                            bg = 'rgba(16, 185, 129, 0.05)';
                                            border = '1px solid rgba(16, 185, 129, 0.15)';
                                            icon = '✨';
                                            desc = `Se unió como: ${formatRoleForChanges(change.toValue || 'Publicador')}`;
                                        } else if (change.type === 'removed') {
                                            bg = 'rgba(239, 68, 68, 0.05)';
                                            border = '1px solid rgba(239, 68, 68, 0.15)';
                                            icon = '❌';
                                            desc = `No tiene informe este mes (inactivo o dado de baja)`;
                                        }

                                        return (
                                            <div 
                                                key={idx} 
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'start',
                                                    gap: '12px',
                                                    padding: '12px',
                                                    borderRadius: '12px',
                                                    backgroundColor: bg,
                                                    border: border
                                                }}
                                            >
                                                <span style={{ fontSize: '1.2rem', marginTop: '1px' }}>{icon}</span>
                                                <div>
                                                    <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-color, #1e293b)' }}>
                                                        {change.publisherName}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-color-light, #64748b)', marginTop: '2px' }}>
                                                        {desc}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '12px 20px',
                            borderTop: '1px solid var(--border-color, #e2e8f0)',
                            display: 'flex',
                            justifyContent: 'end',
                            backgroundColor: 'rgba(0,0,0,0.02)'
                        }}>
                            <button 
                                onClick={() => setShowChangesModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color, #e2e8f0)',
                                    backgroundColor: 'var(--card-bg-color, #ffffff)',
                                    color: 'var(--text-color, #1e293b)',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CongregationSummary;
