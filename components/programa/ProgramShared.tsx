
import React from 'react';
import CustomSelect from '../CustomSelect';
import { ParticipantLists, AssignmentHistory } from '../../lib/types';

interface AssignmentSelectProps {
    path: string;
    listKey: keyof ParticipantLists;
    value: string;
    onChange: (val: string) => void;
    lists: ParticipantLists;
    history: AssignmentHistory;
    isReadOnly: boolean;
}

interface MobilePartContainerProps {
    title?: string;
    children?: React.ReactNode;
    iconClass?: string;
}

// Styled components for Mobile - Modern Clean Look
const MobilePartContainer: React.FC<MobilePartContainerProps> = ({ title, children, iconClass }) => (
    <div style={{ 
        backgroundColor: 'var(--card-bg-color)', 
        padding: '20px', 
        marginBottom: '16px', 
        borderRadius: '16px',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-color)',
        transition: 'transform 0.2s',
    }}>
        {title && (
            <div style={{ 
                fontSize: '1.05rem', 
                fontWeight: '700', 
                color: 'var(--text-color)', 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                lineHeight: 1.3,
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '12px'
            }}>
                {iconClass && (
                    <div style={{ 
                        backgroundColor: 'var(--input-bg)', 
                        padding: '8px', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--primary-color)'
                    }}>
                        <i className={`${iconClass}`} style={{ fontSize:'1rem' }}></i>
                    </div>
                )}
                <span>{title}</span>
            </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {children}
        </div>
    </div>
);

export const ReadOnlyAssignment = ({ value, label }: { value?: string, label?: string }) => (
    <div style={{ 
        backgroundColor: 'var(--bg-color)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '10px', 
        padding: '10px 14px', 
        width: '100%', 
        boxSizing: 'border-box' 
    }}>
        {label && <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-color-light)', fontWeight: '700', marginBottom: '4px', letterSpacing:'0.5px' }}>{label}</div>}
        <div style={{ fontSize: '1rem', fontWeight: '500', color: value ? 'var(--text-color)' : 'var(--text-color-light)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {value || '-'}
        </div>
    </div>
);

export const AssignmentSelect: React.FC<AssignmentSelectProps> = ({ value, onChange, lists, listKey, history, isReadOnly }) => {
    if (isReadOnly) return <ReadOnlyAssignment value={value} />;
    return <CustomSelect options={lists[listKey] || []} value={value} onChange={onChange} historyProvider={history} />;
};

export const MobileAssignmentRow: React.FC<{ label?: string; subLabel?: string; children: React.ReactNode; isSubItem?: boolean }> = ({ label, subLabel, children, isSubItem }) => (
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px', 
        paddingLeft: isSubItem ? '12px' : '0',
        borderLeft: isSubItem ? '2px solid var(--border-color)' : 'none'
    }}>
        {(label || subLabel) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                {label && <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-color-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>}
                {subLabel && <div style={{ fontSize: '0.8rem', color: 'var(--text-color-light)', fontStyle: 'italic' }}>{subLabel}</div>}
            </div>
        )}
        <div style={{ width: '100%' }}>{children}</div>
    </div>
);

export const MobileParticipantPair: React.FC<{ 
    enc: string, ayu: string, 
    onEncChange: (v: string) => void, 
    onAyuChange: (v: string) => void,
    lists: ParticipantLists, history: AssignmentHistory, isReadOnly: boolean 
}> = ({ enc, ayu, onEncChange, onAyuChange, lists, history, isReadOnly }) => {
    if (isReadOnly) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <ReadOnlyAssignment value={enc} label="Estudiante" />
                <ReadOnlyAssignment value={ayu} label="Ayudante" />
            </div>
        );
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-color)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-color-light)', display: 'block', marginBottom: '6px', textTransform:'uppercase' }}>Estudiante</span>
                <CustomSelect options={lists['publicadores'] || []} value={enc} onChange={onEncChange} historyProvider={history} />
            </div>
            <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-color-light)', display: 'block', marginBottom: '6px', textTransform:'uppercase' }}>Ayudante</span>
                <CustomSelect options={lists['publicadores'] || []} value={ayu} onChange={onAyuChange} historyProvider={history} />
            </div>
        </div>
    );
};

export { MobilePartContainer };
