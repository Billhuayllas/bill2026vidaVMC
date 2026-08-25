
import React from 'react';
import { AssignmentSelect, ReadOnlyAssignment } from './ProgramShared';
import CustomSelect from '../CustomSelect';
import { ParticipantLists, AssignmentHistory } from '../../lib/types';
import { useCongregation } from '../../lib/CongregationContext';

const DesktopProgramView: React.FC<{
    programData: any;
    handleDataChange: (weekId: string, path: string, value: string | boolean) => void;
    lists: ParticipantLists;
    history: AssignmentHistory;
    selectedWeek: string;
    isReadOnly: boolean;
}> = ({ programData, handleDataChange, lists, history, selectedWeek, isReadOnly }) => {
    const { currentCongregation } = useCongregation();
    const monthKey = selectedWeek.substring(0, 7);
    const settings = currentCongregation?.settings?.enabled_rooms_per_month?.[monthKey] || currentCongregation?.settings?.enabled_rooms || { main: true, aux2: true, aux3: true };

    if (!programData) return null;

    const getValue = (path: string) => path.split('.').reduce((o, key) => o?.[key], programData) || '';

    const RenderField = ({ path, listKey }: { path: string, listKey: keyof ParticipantLists }) => (
        <AssignmentSelect path={path} listKey={listKey} value={getValue(path)} onChange={val => handleDataChange(selectedWeek, path, val)} lists={lists} history={history} isReadOnly={isReadOnly} />
    );

    // Filter rooms to display based on settings
    const availableRooms = [];
    if (settings.aux3) availableRooms.push({ id: 'aux3', label: 'Sala Auxiliar N°3' });
    if (settings.aux2) availableRooms.push({ id: 'aux2', label: 'Sala Auxiliar N°2' });
    if (settings.main) availableRooms.push({ id: 'main', label: 'Auditorio Principal' }); // Usually last in the UI structure

    // Special order for president row (Aux3, Aux2, Main) match order of rendering 
    // actually in the original table it was Aux3, Aux2, Main (columns 2, 3, 4)
    // We should keep the column count dynamic.
    const colCount = availableRooms.length + 1; // +1 for label column

    return (
        <div className="programa-main-view">
             <table className="main-program-table">
                <colgroup>
                    <col style={{width: '28%'}} />
                    {availableRooms.map(r => <col key={r.id} style={{width: `${72/availableRooms.length}%`}} />)}
                </colgroup>
                <thead>
                    <tr>
                        <th></th>
                        {availableRooms.map(r => (
                            <th key={r.id}>{r.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr><td><strong>Presidente:</strong></td>
                        {availableRooms.map(r => {
                            const path = r.id === 'main' ? 'presidentes.principal' : `presidentes.${r.id}`;
                            const list = r.id === 'main' ? 'presidentes' : 'consejeros';
                            return <td key={r.id}><RenderField path={path} listKey={list} /></td>
                        })}
                    </tr>
                    <tr><td><strong>Oración de Inicio:</strong></td>
                        {availableRooms.map((r, i) => (
                            <td key={r.id}>
                                {r.id === 'main' ? <RenderField path="oracion.inicio" listKey="oradores" /> : null}
                            </td>
                        ))}
                    </tr>
                    
                    <tr className="section tesoros"><td colSpan={colCount} className="section-header">Tesoros de la Biblia</td></tr>
                    <tr><td>{getValue('tesoros.p1.title')}</td>
                        {availableRooms.map(r => <td key={r.id}>{r.id === 'main' ? <RenderField path="tesoros.p1.main" listKey="discursantes" /> : null}</td>)}
                    </tr>
                    <tr><td>{getValue('tesoros.p2.title')}</td>
                        {availableRooms.map(r => <td key={r.id}>{r.id === 'main' ? <RenderField path="tesoros.p2.main" listKey="discursantes" /> : null}</td>)}
                    </tr>
                    <tr><td>{getValue('tesoros.p3.title') || '3. Lectura de la Biblia (3 min.)'}</td>
                        {availableRooms.map(r => <td key={r.id}><RenderField path={`tesoros.p3.${r.id}`} listKey="lectores" /></td>)}
                    </tr>
                    
                    <tr className="section maestros"><td colSpan={colCount} className="section-header">Seamos Mejores Maestros</td></tr>
                     {(programData.maestros || []).map((part: any, i: number) => {
                         const isDiscurso = part.title?.toLowerCase().includes('discurso');
                         return (
                            <tr key={`maestros-desk-${i}`}>
                                <td>{part.title}</td>
                                 {availableRooms.map(r => {
                                    const room = r.id;
                                    const path = `maestros.${i}.${room}`;
                                    const assignmentValue = getValue(path);
                                    
                                    if(isDiscurso) return <td key={room}><RenderField path={path} listKey="maestros_discurso" /></td>
                                    
                                    const [enc, ayu] = assignmentValue.split('/').map((s: string) => s.trim());
                                    if (isReadOnly) {
                                        return <td key={room}><div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><ReadOnlyAssignment value={enc} label="Enc" /><ReadOnlyAssignment value={ayu} label="Ayu" /></div></td>;
                                    }
                                    return (
                                        <td key={room}>
                                            <div className="role-participant-box"><div className="role-label">Enc:</div><CustomSelect options={lists['publicadores'] || []} value={enc || ''} onChange={val => handleDataChange(selectedWeek, path, `${val} / ${ayu||''}`.trim())} historyProvider={history} /></div>
                                             <div className="role-participant-box" style={{marginTop: '8px'}}><div className="role-label">Ayu:</div><CustomSelect options={lists['publicadores'] || []} value={ayu || ''} onChange={val => handleDataChange(selectedWeek, path, `${enc||''} / ${val}`.trim())} historyProvider={history} /></div>
                                        </td>
                                    )
                                 })}
                            </tr>
                         )
                     })}

                    <tr className="section vida-cristiana"><td colSpan={colCount} className="section-header">Nuestra Vida Cristiana</td></tr>
                    {(programData.vidaCristiana || []).map((part: any, i: number) => {
                         const pathPrefix = `vidaCristiana.${i}`;
                         if (part.hasOwnProperty('discursante')) {
                            return (<tr key={pathPrefix}><td>{part.titulo}</td>
                                {availableRooms.map(r => <td key={r.id}>{r.id === 'main' ? <RenderField path={`${pathPrefix}.discursante`} listKey="discursantes" /> : null}</td>)}
                            </tr>);
                        }
                        if (part.hasOwnProperty('conductor')) {
                             return (
                                <tr key={pathPrefix}><td>{part.titulo}</td>
                                    {availableRooms.map(r => (
                                        <td key={r.id}>
                                            {r.id === 'main' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {isReadOnly ? (
                                                        <><ReadOnlyAssignment value={getValue(`${pathPrefix}.conductor`)} label="Conductor" />
                                                        {part.hasOwnProperty('lector') && <ReadOnlyAssignment value={getValue(`${pathPrefix}.lector`)} label="Lector" />}</>
                                                    ) : (
                                                        <><div className="role-participant-box"><div className="role-label">Conductor:</div><RenderField path={`${pathPrefix}.conductor`} listKey="discursantes" /></div>
                                                        {part.hasOwnProperty('lector') && (<div className="role-participant-box" style={{marginTop: '8px'}}><div className="role-label">Lector:</div><RenderField path={`${pathPrefix}.lector`} listKey="lectores_libro" /></div>)}</>
                                                    )}
                                                </div>
                                            ) : null}
                                        </td>
                                    ))}
                                </tr>
                            );
                        }
                        return <tr key={pathPrefix}><td>{part.titulo}</td><td colSpan={availableRooms.length}></td></tr>;
                    })}
                     <tr><td><strong>Oración Final:</strong></td>
                        {availableRooms.map(r => <td key={r.id}>{r.id === 'main' ? <RenderField path="oracion.final" listKey="oradores" /> : null}</td>)}
                     </tr>
                </tbody>
            </table>
        </div>
    );
};

export default DesktopProgramView;
