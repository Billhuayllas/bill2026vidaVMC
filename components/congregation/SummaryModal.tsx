
import React, { useMemo } from 'react';
import { GroupMember, ReportsMap } from './types';

interface SummaryModalProps {
    onClose: () => void;
    members: GroupMember[];
    reports: ReportsMap;
    groupName: string;
    month: string;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ onClose, members, reports, groupName, month }) => {
    
    const summary = useMemo(() => {
        const data = {
            'Precursor Especial': { count: 0, hours: 0, studies: 0, color: '#7c3aed', bg: '#f3e8ff' },
            'Precursor Regular': { count: 0, hours: 0, studies: 0, color: '#2563eb', bg: '#dbeafe' },
            'Precursor Auxiliar': { count: 0, hours: 0, studies: 0, color: '#d97706', bg: '#fef3c7' },
            'Publicador': { count: 0, hours: 0, studies: 0, color: '#4b5563', bg: '#f3f4f6' },
        };

        let totalPubs = 0;
        let totalHours = 0;
        let totalStudies = 0;

        members.forEach(m => {
            let role = m.rol || 'Publicador';
            let matchedRole = 'Publicador';
            
            if (role.includes('Precursor Especial')) matchedRole = 'Precursor Especial';
            else if (role.includes('Precursor Regular')) matchedRole = 'Precursor Regular';
            else if (role.includes('Precursor Auxiliar')) matchedRole = 'Precursor Auxiliar';

            const r = reports[m.publicador_nombre];
            
            // Increment count for this role
            if (data[matchedRole]) {
                data[matchedRole].count++;
                totalPubs++;

                if (r) {
                    const h = (Number(r.horas) || 0) + (Number(r.horas_especiales) || 0);
                    const s = Number(r.estudios) || 0;
                    
                    data[matchedRole].hours += h;
                    data[matchedRole].studies += s;
                    
                    totalHours += h;
                    totalStudies += s;
                }
            }
        });

        // Filter out roles with 0 publishers to keep the table clean, but always keep Publicador if empty for structure
        const rows = Object.entries(data).filter(([_, stats]) => stats.count > 0 || _ === 'Publicador');

        return { rows, totals: { count: totalPubs, hours: totalHours, studies: totalStudies } };
    }, [members, reports]);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease-out' }}>
                
                {/* Header */}
                <div style={{ backgroundColor: '#1e3a8a', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>Resumen Total</h2>
                        <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>{groupName} • {month}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>&times;</button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '0 10px', color: '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase' }}>Categoría</th>
                                <th style={{ textAlign: 'center', padding: '0 10px', color: '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase' }}>Cant.</th>
                                <th style={{ textAlign: 'center', padding: '0 10px', color: '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase' }}>Horas</th>
                                <th style={{ textAlign: 'center', padding: '0 10px', color: '#6b7280', fontSize: '0.8rem', textTransform: 'uppercase' }}>Est.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.rows.map(([role, stats]) => (
                                <tr key={role} style={{ backgroundColor: stats.bg }}>
                                    <td style={{ padding: '12px 10px', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', fontWeight: '600', color: stats.color }}>{role}</td>
                                    <td style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '700', color: '#1f2937' }}>{stats.count}</td>
                                    <td style={{ textAlign: 'center', padding: '12px 10px', fontWeight: '700', color: '#1f2937' }}>{stats.hours.toLocaleString()}</td>
                                    <td style={{ textAlign: 'center', padding: '12px 10px', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', fontWeight: '700', color: '#1f2937' }}>{stats.studies}</td>
                                </tr>
                            ))}
                            
                            {/* Totals Row */}
                            <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                                <td style={{ padding: '15px 10px 0', fontWeight: '800', fontSize: '1.1rem', color: '#111827' }}>TOTALES</td>
                                <td style={{ textAlign: 'center', padding: '15px 10px 0', fontWeight: '800', fontSize: '1.1rem', color: '#111827' }}>{summary.totals.count}</td>
                                <td style={{ textAlign: 'center', padding: '15px 10px 0', fontWeight: '800', fontSize: '1.1rem', color: '#2563eb' }}>{summary.totals.hours.toLocaleString()}</td>
                                <td style={{ textAlign: 'center', padding: '15px 10px 0', fontWeight: '800', fontSize: '1.1rem', color: '#7c3aed' }}>{summary.totals.studies}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Actions */}
                <div style={{ padding: '15px 20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', textAlign: 'center' }}>
                    <button onClick={onClose} style={{ padding: '10px 25px', backgroundColor: '#1f2937', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                        Cerrar
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default SummaryModal;
