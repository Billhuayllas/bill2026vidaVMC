
import React from 'react';
import { AssignmentSelect, MobileAssignmentRow, MobilePartContainer } from './ProgramShared';
import { ParticipantLists, AssignmentHistory } from '../../lib/types';

const MobileSectionVida: React.FC<{
    programData: any;
    handleDataChange: (weekId: string, path: string, value: string) => void;
    lists: ParticipantLists;
    history: AssignmentHistory;
    selectedWeek: string;
    isReadOnly: boolean;
}> = ({ programData, handleDataChange, lists, history, selectedWeek, isReadOnly }) => {

    const getValue = (path: string) => path.split('.').reduce((o, key) => o?.[key], programData) || '';
    const RenderField = ({ path, listKey }: { path: string, listKey: keyof ParticipantLists }) => (
        <AssignmentSelect path={path} listKey={listKey} value={getValue(path)} onChange={val => handleDataChange(selectedWeek, path, val)} lists={lists} history={history} isReadOnly={isReadOnly} />
    );

    return (
        <div className="mobile-section-container">
            {(programData.vidaCristiana || []).map((part: any, i: number) => (
                <div key={i}>
                    {part.hasOwnProperty('conductor') ? (
                        <MobilePartContainer title={part.titulo} iconClass="fas fa-book">
                            <MobileAssignmentRow label="Conductor">
                                <RenderField path={`vidaCristiana.${i}.conductor`} listKey="discursantes" />
                            </MobileAssignmentRow>
                            {part.hasOwnProperty('lector') && (
                                <MobileAssignmentRow label="Lector">
                                    <RenderField path={`vidaCristiana.${i}.lector`} listKey="lectores_libro" />
                                </MobileAssignmentRow>
                            )}
                        </MobilePartContainer>
                    ) : part.hasOwnProperty('discursante') ? (
                        <MobilePartContainer title={part.titulo} iconClass="fas fa-microphone-alt">
                            <MobileAssignmentRow label="Discursante">
                                <RenderField path={`vidaCristiana.${i}.discursante`} listKey="discursantes" />
                            </MobileAssignmentRow>
                        </MobilePartContainer>
                    ) : null}
                </div>
            ))}
        </div>
    );
};

export default MobileSectionVida;
