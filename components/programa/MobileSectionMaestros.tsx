
import React from 'react';
import { AssignmentSelect, MobileParticipantPair, MobilePartContainer } from './ProgramShared';
import { ParticipantLists, AssignmentHistory } from '../../lib/types';
import { useCongregation } from '../../lib/CongregationContext';

const MobileSectionMaestros: React.FC<{
    programData: any;
    handleDataChange: (weekId: string, path: string, value: string) => void;
    lists: ParticipantLists;
    history: AssignmentHistory;
    selectedWeek: string;
    isReadOnly: boolean;
}> = ({ programData, handleDataChange, lists, history, selectedWeek, isReadOnly }) => {
    const { currentCongregation } = useCongregation();
    const monthKey = selectedWeek.substring(0, 7);
    const settings = currentCongregation?.settings?.enabled_rooms_per_month?.[monthKey] || currentCongregation?.settings?.enabled_rooms || { main: true, aux2: true, aux3: true };

    const getValue = (path: string) => path.split('.').reduce((o, key) => o?.[key], programData) || '';

    const renderRoom = (partIndex: number, room: string, isDiscurso: boolean) => {
        // Skip if room is disabled
        if (room === 'aux2' && !settings.aux2) return null;
        if (room === 'aux3' && !settings.aux3) return null;
        // Main should typically always show, but we can respect the setting if someone oddly disables it
        if (room === 'main' && !settings.main) return null;

        const path = `maestros.${partIndex}.${room}`;
        const assignmentValue = getValue(path);
        const label = room === 'main' ? 'Principal' : (room === 'aux2' ? 'Sala 2' : 'Sala 3');
        const badgeColor = room === 'main' ? '#dbeafe' : (room === 'aux2' ? '#dcfce7' : '#fef3c7');
        const badgeText = room === 'main' ? '#1e40af' : (room === 'aux2' ? '#166534' : '#92400e');

        return (
            <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px' }}>
                    <span style={{ 
                        backgroundColor: badgeColor, 
                        color: badgeText, 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '0.75rem', 
                        fontWeight: '700',
                        textTransform: 'uppercase'
                    }}>
                        {label}
                    </span>
                </div>
                {isDiscurso ? (
                    <AssignmentSelect path={path} listKey="maestros_discurso" value={assignmentValue} onChange={val => handleDataChange(selectedWeek, path, val)} lists={lists} history={history} isReadOnly={isReadOnly} />
                ) : (
                    (() => {
                        const [enc, ayu] = assignmentValue.split('/').map((s: string) => s.trim());
                        return (
                            <MobileParticipantPair 
                                enc={enc || ''} 
                                ayu={ayu || ''}
                                onEncChange={(v) => handleDataChange(selectedWeek, path, `${v} / ${ayu || ''}`.trim())}
                                onAyuChange={(v) => handleDataChange(selectedWeek, path, `${enc || ''} / ${v}`.trim())}
                                lists={lists} history={history} isReadOnly={isReadOnly}
                            />
                        );
                    })()
                )}
            </div>
        );
    };

    return (
        <div className="mobile-section-container">
            {(programData.maestros || []).map((part: any, i: number) => {
                const isDiscurso = part.title?.toLowerCase().includes('discurso');
                return (
                    <MobilePartContainer key={i} title={part.title} iconClass="fas fa-comments">
                        {renderRoom(i, 'main', isDiscurso)}
                        {renderRoom(i, 'aux2', isDiscurso)}
                        {renderRoom(i, 'aux3', isDiscurso)}
                    </MobilePartContainer>
                );
            })}
        </div>
    );
};

export default MobileSectionMaestros;
