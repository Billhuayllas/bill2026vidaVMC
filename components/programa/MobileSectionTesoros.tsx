
import React from 'react';
import { AssignmentSelect, MobileAssignmentRow, MobilePartContainer } from './ProgramShared';
import { ParticipantLists, AssignmentHistory } from '../../lib/types';
import { useCongregation } from '../../lib/CongregationContext';

const MobileSectionTesoros: React.FC<{
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
    const RenderField = ({ path, listKey }: { path: string, listKey: keyof ParticipantLists }) => (
        <AssignmentSelect path={path} listKey={listKey} value={getValue(path)} onChange={val => handleDataChange(selectedWeek, path, val)} lists={lists} history={history} isReadOnly={isReadOnly} />
    );

    return (
        <div className="mobile-section-container">
            <MobilePartContainer title={getValue('tesoros.p1.title') || 'Discurso'} iconClass="fas fa-book-open">
                <RenderField path="tesoros.p1.main" listKey="discursantes" />
            </MobilePartContainer>

            <MobilePartContainer title={getValue('tesoros.p2.title') || 'Perlas Escondidas'} iconClass="fas fa-gem">
                <RenderField path="tesoros.p2.main" listKey="discursantes" />
            </MobilePartContainer>

            <MobilePartContainer title={getValue('tesoros.p3.title') || 'Lectura de la Biblia (3 min.)'} iconClass="fas fa-book-reader">
                <div style={{ display: 'grid', gap: '10px' }}>
                    {settings.main && (
                        <MobileAssignmentRow label="Principal">
                            <RenderField path="tesoros.p3.main" listKey="lectores" />
                        </MobileAssignmentRow>
                    )}
                    {settings.aux2 && (
                        <MobileAssignmentRow label="Sala 2">
                            <RenderField path="tesoros.p3.aux2" listKey="lectores" />
                        </MobileAssignmentRow>
                    )}
                    {settings.aux3 && (
                        <MobileAssignmentRow label="Sala 3">
                            <RenderField path="tesoros.p3.aux3" listKey="lectores" />
                        </MobileAssignmentRow>
                    )}
                </div>
            </MobilePartContainer>
        </div>
    );
};

export default MobileSectionTesoros;
