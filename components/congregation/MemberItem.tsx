
import React from 'react';
import { GroupMember, MinistryReport } from './types';
import { getAvatarColor } from './utils';

interface MemberItemProps {
    member: GroupMember;
    report: MinistryReport | undefined;
    onClick: () => void;
}

const MemberItem: React.FC<MemberItemProps> = ({ member, report, onClick }) => {
    const hasReport = report !== undefined;
    const name = member.publicador_nombre || 'Desconocido';
    
    // Role Badges
    const getRoleBadge = () => {
        const badges: React.ReactNode[] = [];
        const rolStr = member.rol || '';
        
        if (rolStr.includes('Anciano')) {
            badges.push(<span key="anciano" style={{fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', backgroundColor:'#eff6ff', color:'#1d4ed8', border: '1px solid #bfdbfe', fontWeight:'600'}}>Anciano</span>);
        }
        if (rolStr.includes('Siervo ministerial')) {
            badges.push(<span key="sm" style={{fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', backgroundColor:'#f0fdf4', color:'#16a34a', border: '1px solid #bbf7d0', fontWeight:'600'}}>Siervo M.</span>);
        }
        if (rolStr.includes('Precursor Regular')) {
            badges.push(<span key="pr" style={{fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', backgroundColor:'#edf2f7', color:'#4b5563', border: '1px solid #cbd5e1', fontWeight:'600'}}>PR</span>);
        }
        if (rolStr.includes('Precursor Auxiliar')) {
            badges.push(<span key="pa" style={{fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', backgroundColor:'#edf2f7', color:'#4b5563', border: '1px solid #cbd5e1', fontWeight:'600'}}>PA</span>);
        }
        if (rolStr.includes('Precursor Especial')) {
            badges.push(<span key="pe" style={{fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', backgroundColor:'#edf2f7', color:'#4b5563', border: '1px solid #cbd5e1', fontWeight:'600'}}>PE</span>);
        }
        
        // Extract custom concepts to render as custom badges!
        const standardParts = ['Anciano', 'Siervo ministerial', 'Precursor Especial', 'Precursor Regular', 'Precursor Auxiliar', 'Misionero', 'Publicador', 'Ninguno'];
        const customParts = rolStr.split(',').map(p => p.trim()).filter(p => p && !standardParts.includes(p));
        
        customParts.forEach((part, index) => {
            badges.push(
                <span key={`custom-${index}`} style={{fontSize:'0.65rem', padding:'2px 6px', borderRadius:'4px', backgroundColor:'#faf5ff', color:'#a855f7', border: '1px solid #e9d5ff', fontWeight:'600'}}>
                    {part}
                </span>
            );
        });

        if (badges.length === 0) return null;
        return <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>{badges}</div>;
    };

    // Total Hours Calculation
    const totalHours = report ? (Number(report.horas || 0) + Number(report.horas_especiales || 0)) : 0;
    const hasActivity = report && (totalHours > 0 || (report.estudios && Number(report.estudios) > 0));

    return (
        <div 
            onClick={onClick} 
            className="group"
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '16px 20px', 
                borderBottom: '1px solid var(--border-color)', 
                cursor: 'pointer', 
                backgroundColor: 'var(--card-bg-color)', 
                transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--light-gray)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--card-bg-color)'}
        >
            <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                backgroundColor: 'var(--bg-color)', 
                color: 'var(--text-color)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontWeight: '600', fontSize: '0.9rem', marginRight: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
                {name.charAt(0)}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-color)', fontSize: '0.95rem', display:'flex', alignItems:'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span>{name}</span>
                    {getRoleBadge()}
                </div>
                
                {hasReport ? (
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-color-light)', fontWeight: '500' }}>
                        <i className="fas fa-check" style={{ color: '#10b981' }}></i> Entregado
                    </span>
                    {report.participo === false ? (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                            No participó
                        </span>
                    ) : (hasActivity || (report.estudios && Number(report.estudios) > 0) || !hasActivity) && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-color-light)', fontWeight: '400', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--border-color)' }}></span>
                            {hasActivity ? `${totalHours} hrs` : 'Participó'} 
                            {(hasActivity && report.estudios && Number(report.estudios) > 0) ? ' • ' : ''}
                            {report.estudios && Number(report.estudios) > 0 ? `${report.estudios} curs.` : ''}
                        </span>
                    )}
                </div>
                ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-color-light)', fontWeight: '500' }}>
                        <i className="far fa-clock" style={{ color: '#f59e0b' }}></i> Pendiente
                    </span>
                </div>
                )}
            </div>
            
            <div style={{ 
                color: 'var(--text-color-light)', transition: 'all 0.2s', marginLeft: '10px', opacity: 0.4
            }} className="group-hover:opacity-100 group-hover:translate-x-1">
                <i className="fas fa-chevron-right" style={{ fontSize: '0.9rem' }}></i>
            </div>
        </div>
    );
};

export default MemberItem;
