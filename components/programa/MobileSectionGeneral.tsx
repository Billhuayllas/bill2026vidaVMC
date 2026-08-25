
import React from 'react';
import { AssignmentSelect, MobileAssignmentRow, MobilePartContainer } from './ProgramShared';
import { ParticipantLists, AssignmentHistory } from '../../lib/types';
import { useCongregation } from '../../lib/CongregationContext';

const MobileSectionGeneral: React.FC<{
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
    
    const RenderField = ({ path, listKey }: { path: string, listKey: keyof ParticipantLists }) => {
        const value = path.split('.').reduce((o, key) => o?.[key], programData) || '';
        return <AssignmentSelect path={path} listKey={listKey} value={value} onChange={val => handleDataChange(selectedWeek, path, val)} lists={lists} history={history} isReadOnly={isReadOnly} />;
    };

    return (
        <div className="mobile-section-container">
            <MobilePartContainer title="Presidencia" iconClass="fas fa-user-tie">
                {settings.main && (
                    <MobileAssignmentRow label="Principal">
                        <RenderField path="presidentes.principal" listKey="presidentes" />
                    </MobileAssignmentRow>
                )}
                {settings.aux2 && (
                    <MobileAssignmentRow label="Sala 2">
                        <RenderField path="presidentes.aux2" listKey="consejeros" />
                    </MobileAssignmentRow>
                )}
                {settings.aux3 && (
                    <MobileAssignmentRow label="Sala 3">
                        <RenderField path="presidentes.aux3" listKey="consejeros" />
                    </MobileAssignmentRow>
                )}
            </MobilePartContainer>

            <MobilePartContainer title="Oraciones" iconClass="fas fa-praying-hands">
                <MobileAssignmentRow label="Inicio">
                    <RenderField path="oracion.inicio" listKey="oradores" />
                </MobileAssignmentRow>
                <MobileAssignmentRow label="Final">
                    <RenderField path="oracion.final" listKey="oradores" />
                </MobileAssignmentRow>
            </MobilePartContainer>
        </div>
    );
};

export default MobileSectionGeneral;
