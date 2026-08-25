
import React from 'react';
import { GroupStats, RoleStats } from './types';

interface StatCardsProps {
    stats: GroupStats;
}

const RoleCard = ({ label, stats, color, bg }: { label: string, stats: RoleStats, color: string, bg?: string }) => (
    <div style={{ 
        backgroundColor: bg || 'var(--card-bg-color)', 
        border: `1px solid ${bg ? 'transparent' : 'var(--border-color)'}`, 
        borderRadius: '12px', 
        padding: '12px 6px', 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        minHeight: '80px'
    }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: color, lineHeight: 1, marginBottom: '2px' }}>{stats.count}</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-color-light)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>{label}</div>
        {stats.count > 0 ? (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-color)', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.04)', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                <span>{Number(stats.hours).toLocaleString()}h</span>
                <span style={{width: '1px', height: '10px', backgroundColor: '#d1d5db'}}></span>
                <span>{stats.studies}e</span>
            </div>
        ) : <div style={{ height: '22px' }}></div>}
    </div>
);

const StatCards: React.FC<StatCardsProps> = ({ stats }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Row 1: Activity Totals (Main) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
            <div style={{ backgroundColor: '#2563eb', borderRadius: '12px', padding: '15px', color: 'white', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.9, fontWeight: '700' }}><i className="fas fa-clock"></i> Horas Totales</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '900', lineHeight: 1, marginTop: '5px' }}>{stats.hours.toLocaleString()}</div>
            </div>
            <div style={{ backgroundColor: '#059669', borderRadius: '12px', padding: '15px', color: 'white', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.9, fontWeight: '700' }}><i className="fas fa-file-alt"></i> Informes</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '900', lineHeight: 1, marginTop: '5px' }}>{stats.submitted}<span style={{fontSize: '1rem', opacity: 0.8, fontWeight: '600'}}>/{stats.totalMembers}</span></div>
            </div>
            <div style={{ backgroundColor: '#7c3aed', borderRadius: '12px', padding: '15px', color: 'white', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.9, fontWeight: '700' }}><i className="fas fa-book-open"></i> Estudios Totales</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '900', lineHeight: 1, marginTop: '5px' }}>{stats.studies}</div>
            </div>
        </div>
    </div>
);

export default StatCards;
