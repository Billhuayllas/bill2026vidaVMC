import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from './CustomSelect';
import PairAssignmentModal from './PairAssignmentModal';
import { getFridayFromWeekId, getShortDate } from '../lib/utils';
import { useProgramData } from '../lib/useProgramData';
import { useProgramEditor } from '../lib/useProgramEditor';
import { useCongregation } from '../lib/CongregationContext';
import { exportCompleteBackup } from '../lib/backupUtils';

const roomMap: { [key: string]: string } = {
    main: 'Principal',
    aux2: 'Sala 2',
    aux3: 'Sala 3'
};

const MobilePlanificadorView: React.FC<{
    monthlyPrograms: any[];
    getProgramValue: (weekId: string, path: string) => any;
    handleAssignmentChange: (weekId: string, path: string, value: string) => void;
    lists: any;
    history: any;
    isReadOnly: boolean;
    enabledRooms: { main: boolean; aux2: boolean; aux3: boolean };
    openPairModal: (weekId: string, path: string, enc: string, ayu: string, title: string) => void;
    refetch: () => void;
}> = ({ monthlyPrograms, getProgramValue, handleAssignmentChange, lists, history, isReadOnly, enabledRooms, openPairModal, refetch }) => {
    const [activeMobileTab, setActiveMobileTab] = useState('smm');

    const RenderField = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
        if (isReadOnly) return <span style={{fontWeight:'500'}}>{value || '-'}</span>;
        return <CustomSelect options={lists['publicadores'] || []} value={value} onChange={onChange} historyProvider={history} />;
    };

    const activeRoomKeys = (['main', 'aux2', 'aux3'] as const).filter(key => enabledRooms[key]);

    const renderSMMTab = () => (
        <div className="planificador-mobile-content">
            {monthlyPrograms.map(prog => (
                <div key={`${prog.week_id}-smm`} className="planificador-mobile-card">
                    <div className="planificador-mobile-card__header">{getFridayFromWeekId(prog.week_id, 'long')}</div>
                    <div className="planificador-mobile-card__body">
                        {(getProgramValue(prog.week_id, 'maestros') || []).map((part: any, i: number) => {
                            const isDiscurso = part.title?.toLowerCase().includes('discurso');
                            return (
                                <div className="planificador-mobile-card__group" key={`smm-mob-${i}`}>
                                    <h4 className="planificador-mobile-card__group-title">{part.title}</h4>
                                    {activeRoomKeys.map(room => {
                                        const assignmentValue = getProgramValue(prog.week_id, `maestros.${i}.${room}`) || '';
                                        const [enc, ayu] = assignmentValue.split('/').map((s: string) => s.trim());
                                        return (
                                            <div className="planificador-mobile-card__room" key={room}>
                                                <div className="planificador-mobile-card__room-label">{roomMap[room]}</div>
                                                {isDiscurso ? (
                                                    isReadOnly ? <span style={{fontWeight:'500'}}>{assignmentValue || '-'}</span> :
                                                    <CustomSelect options={lists['maestros_discurso'] || []} value={assignmentValue} onChange={val => handleAssignmentChange(prog.week_id, `maestros.${i}.${room}`, val)} historyProvider={history} tableName="maestros_discurso" onParticipantUpdated={refetch} />
                                                ) : (
                                                    <div className="planificador-mobile-card__pair">
                                                        {isReadOnly ? (
                                                            <>
                                                                <div className="participant-entry">
                                                                    <span className="participant-label">E:</span>
                                                                    <span style={{fontWeight:'500'}}>{enc || '-'}</span>
                                                                </div>
                                                                <div className="participant-entry">
                                                                    <span className="participant-label">A:</span>
                                                                    <span style={{fontWeight:'500'}}>{ayu || '-'}</span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <button 
                                                                onClick={() => openPairModal(prog.week_id, `maestros.${i}.${room}`, enc || '', ayu || '', `${part.title} - ${roomMap[room]}`)}
                                                                style={{ width: '100%', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}
                                                            >
                                                                <div className="participant-entry"><span className="participant-label" style={{fontWeight:'bold', marginRight:'5px', fontSize:'0.8rem'}}>E:</span><span style={{color: enc ? '#1f2937' : '#94a3b8'}}>{enc || 'Asignar Encargado...'}</span></div>
                                                                <div className="participant-entry"><span className="participant-label" style={{fontWeight:'bold', marginRight:'5px', fontSize:'0.8rem'}}>A:</span><span style={{color: ayu ? '#1f2937' : '#94a3b8'}}>{ayu || 'Asignar Ayudante...'}</span></div>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderLecturaBibliaTab = () => (
        <div className="planificador-mobile-content">
            {monthlyPrograms.map(prog => (
                 <div key={`${prog.week_id}-lectura`} className="planificador-mobile-card">
                    <div className="planificador-mobile-card__header">{getFridayFromWeekId(prog.week_id, 'long')}</div>
                    <div className="planificador-mobile-card__body">
                         {activeRoomKeys.map(room => (
                             <div className="planificador-mobile-card__row" key={room}>
                                 <label>{roomMap[room]}</label>
                                 {isReadOnly ? <span>{getProgramValue(prog.week_id, `tesoros.p3.${room}`) || '-'}</span> :
                                 <CustomSelect options={lists['lectores'] || []} value={getProgramValue(prog.week_id, `tesoros.p3.${room}`) || ''} onChange={val => handleAssignmentChange(prog.week_id, `tesoros.p3.${room}`, val)} historyProvider={history} tableName="lectores" onParticipantUpdated={refetch} />}
                             </div>
                         ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderLibroLectorTab = () => (
         <div className="planificador-mobile-content">
            {monthlyPrograms.map(prog => {
                const vidaCristiana = getProgramValue(prog.week_id, 'vidaCristiana') || [];
                const libroPartIndex = vidaCristiana.findIndex((p: any) => p.hasOwnProperty('lector'));
                
                return (
                     <div key={`${prog.week_id}-libro`} className="planificador-mobile-card">
                        <div className="planificador-mobile-card__header">{getFridayFromWeekId(prog.week_id, 'long')}</div>
                        <div className="planificador-mobile-card__body">
                            {libroPartIndex === -1 ? (
                                <span className="not-applicable">N/A</span>
                            ) : (
                                 <div className="planificador-mobile-card__row">
                                     <label>Lector Asignado</label>
                                     {isReadOnly ? <span>{getProgramValue(prog.week_id, `vidaCristiana.${libroPartIndex}.lector`) || '-'}</span> :
                                     <CustomSelect options={lists['lectores_libro'] || []} value={getProgramValue(prog.week_id, `vidaCristiana.${libroPartIndex}.lector`) || ''} onChange={val => handleAssignmentChange(prog.week_id, `vidaCristiana.${libroPartIndex}.lector`, val)} historyProvider={history} tableName="lectores_libro" onParticipantUpdated={refetch} />}
                                 </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
    
    return (
        <div className="planificador-mobile-view">
            <nav className="mobile-tabs-nav">
                <button onClick={() => setActiveMobileTab('smm')} className={activeMobileTab === 'smm' ? 'active' : ''}>Maestros</button>
                <button onClick={() => setActiveMobileTab('biblia')} className={activeMobileTab === 'biblia' ? 'active' : ''}>Lectura</button>
                <button onClick={() => setActiveMobileTab('libro')} className={activeMobileTab === 'libro' ? 'active' : ''}>Libro</button>
            </nav>
            <div className="mobile-tabs-content">
                {activeMobileTab === 'smm' && renderSMMTab()}
                {activeMobileTab === 'biblia' && renderLecturaBibliaTab()}
                {activeMobileTab === 'libro' && renderLibroLectorTab()}
            </div>
        </div>
    );
};

// Helper to check for unassigned participants in the Monthly Planner view
const getPlannerUnassignedList = (
    monthlyPrograms: any[], 
    getProgramValue: (weekId: string, path: string) => any, 
    settings: any
) => {
    const unassigned: { weekId: string; label: string; item: string }[] = [];
    const rooms = (['main', 'aux2', 'aux3'] as const).filter(key => settings[key]);

    const getWeekLabel = (weekId: string, data: any) => {
        let label = '';
        if (data?.titulo) {
            label = data.titulo.split('|')[0].trim();
        } else {
            const d = new Date(weekId + 'T12:00:00');
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            label = `Semana del ${d.getDate()} de ${monthNames[d.getMonth()]}`;
        }
        return label;
    };

    const isPlaceholder = (val: string) => {
        const lower = (val || '').trim().toLowerCase();
        return lower === '' || lower === '-- asignar --' || lower === 'sin participantes' || lower === 'sin participante' || lower === 'vacio' || lower === 'vacío';
    };

    monthlyPrograms.forEach(prog => {
        const weekData = prog.data;
        const weekLabel = getWeekLabel(prog.week_id, weekData);

        // 1. Maestros (SMM)
        const maestros = getProgramValue(prog.week_id, 'maestros') || [];
        maestros.forEach((part: any, i: number) => {
            const isDiscurso = part.title?.toLowerCase().includes('discurso');
            rooms.forEach(room => {
                const roomLabel = room === 'main' ? 'Ppal' : (room === 'aux2' ? 'S2' : 'S3');
                const path = `maestros.${i}.${room}`;
                const val = getProgramValue(prog.week_id, path) || '';
                
                if (isDiscurso) {
                    if (isPlaceholder(val)) {
                        unassigned.push({
                            weekId: prog.week_id,
                            label: weekLabel,
                            item: `${part.title || `Maestros Parte ${i+1}`} (${roomLabel})`
                        });
                    }
                } else {
                    const [enc, ayu] = val.split('/').map((s: string) => s.trim());
                    const isEncEmpty = isPlaceholder(enc);
                    const isAyuEmpty = isPlaceholder(ayu);

                    if (isEncEmpty) {
                        unassigned.push({
                            weekId: prog.week_id,
                            label: weekLabel,
                            item: `${part.title || `Parte ${i+1}`} - Encargado (${roomLabel})`
                        });
                    }
                    if (isAyuEmpty) {
                        unassigned.push({
                            weekId: prog.week_id,
                            label: weekLabel,
                            item: `${part.title || `Parte ${i+1}`} - Ayudante (${roomLabel})`
                        });
                    }
                }
            });
        });

        // 2. Lectura de la Biblia (Tesoros p3)
        rooms.forEach(room => {
            const roomLabel = room === 'main' ? 'Ppal' : (room === 'aux2' ? 'S2' : 'S3');
            const path = `tesoros.p3.${room}`;
            const val = getProgramValue(prog.week_id, path) || '';
            if (isPlaceholder(val)) {
                unassigned.push({
                    weekId: prog.week_id,
                    label: weekLabel,
                    item: `Lectura de la Biblia (${roomLabel})`
                });
            }
        });

        // 3. Lector del Libro (Estudio bíblico)
        const vidaCristiana = getProgramValue(prog.week_id, 'vidaCristiana') || [];
        const libroPartIndex = vidaCristiana.findIndex((p: any) => p.hasOwnProperty('lector'));
        if (libroPartIndex !== -1) {
            const path = `vidaCristiana.${libroPartIndex}.lector`;
            const val = getProgramValue(prog.week_id, path) || '';
            if (isPlaceholder(val)) {
                unassigned.push({
                    weekId: prog.week_id,
                    label: weekLabel,
                    item: `Estudio Bíblico - Lector`
                });
            }
        }
    });

    return unassigned;
};

interface PlanificadorProps {
    isReadOnly?: boolean;
    isActive?: boolean;
}

const Planificador: React.FC<PlanificadorProps> = ({ isReadOnly = false, isActive = false }) => {
    const { currentCongregation } = useCongregation();
    const programDataSource = useProgramData();
    const { loading, error, programs, lists, history, refetch } = programDataSource;

    useEffect(() => {
        if (isActive) {
            refetch();
        }
    }, [isActive, refetch]);

    const {
        selectedMonth,
        handleMonthChange,
        availableMonths,
        changes,
        handleAssignmentChange,
        handleSaveChanges,
        saveStatus,
        getProgramValue,
        handleBackup
    } = useProgramEditor(programDataSource);

    const settings = currentCongregation?.settings?.enabled_rooms_per_month?.[selectedMonth] || currentCongregation?.settings?.enabled_rooms || { main: true, aux2: true, aux3: true };
    const activeRoomKeys = (['main', 'aux2', 'aux3'] as const).filter(key => settings[key]);

    const [activeTab, setActiveTab] = useState('smm');
    const [showMissingAlertModal, setShowMissingAlertModal] = useState(false);
    const [unassignedList, setUnassignedList] = useState<{ weekId: string; label: string; item: string }[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);

    const effectiveIsReadOnly = isReadOnly || !isEditMode;

    const monthlyPrograms = programs.filter(p => p.week_id.startsWith(selectedMonth)).sort((a, b) => a.week_id.localeCompare(b.week_id));

    const onSaveClick = () => {
        const unassigned = getPlannerUnassignedList(monthlyPrograms, getProgramValue, settings);
        if (unassigned.length > 0) {
            setUnassignedList(unassigned);
            setShowMissingAlertModal(true);
        } else {
            handleSaveChanges();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 's')) {
                e.preventDefault();
                if (!effectiveIsReadOnly && Object.keys(changes).length > 0) {
                    onSaveClick();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [effectiveIsReadOnly, changes, monthlyPrograms, getProgramValue, settings]);

    
    const [pairModalState, setPairModalState] = useState<{
        isOpen: boolean;
        weekId: string;
        path: string;
        encargado: string;
        ayudante: string;
        title: string;
    }>({ isOpen: false, weekId: '', path: '', encargado: '', ayudante: '', title: '' });

    const openPairModal = (weekId: string, path: string, enc: string, ayu: string, title: string) => {
        setPairModalState({
            isOpen: true,
            weekId,
            path,
            encargado: enc,
            ayudante: ayu,
            title
        });
    };

    const handlePairSave = (encargado: string, ayudante: string) => {
        const newValue = `${encargado || ''} / ${ayudante || ''}`.trim();
        // If both are empty, we might want to just save empty string instead of " / "
        const finalValue = (encargado || ayudante) ? newValue : '';
        handleAssignmentChange(pairModalState.weekId, pairModalState.path, finalValue);
    };

    const currentMonthUnassigned = useMemo(() => {
        return getPlannerUnassignedList(monthlyPrograms, getProgramValue, settings);
    }, [monthlyPrograms, getProgramValue, settings]);

    const renderSMMTab = () => (
        <div className="planificador-table-container">
            <table className="planificador-table smm-table">
                <thead>
                    <tr>
                        <th>Asignación</th>
                        {activeRoomKeys.map(key => <th key={key}>{roomMap[key]}</th>)}
                    </tr>
                </thead>
                 <tbody>
                    {monthlyPrograms.map((prog, idx) => (
                        <React.Fragment key={`${prog.week_id}-${idx}`}>
                            <tr className="week-separator-row">
                                <td colSpan={1 + activeRoomKeys.length} style={{backgroundColor:'var(--input-bg)', padding:'10px'}}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                        <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem' }}>{getFridayFromWeekId(prog.week_id, 'long')}</span>
                                        {!effectiveIsReadOnly && (
                                            <button
                                                onClick={onSaveClick}
                                                disabled={Object.keys(changes).length === 0 || saveStatus?.type === 'loading'}
                                                style={{
                                                    position: 'absolute',
                                                    right: '10px',
                                                    background: Object.keys(changes).length === 0 ? '#f1f5f9' : '#10b981',
                                                    border: 'none',
                                                    color: Object.keys(changes).length === 0 ? '#94a3b8' : 'white',
                                                    cursor: Object.keys(changes).length === 0 ? 'default' : 'pointer',
                                                    padding: '4px 12px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s',
                                                    boxShadow: Object.keys(changes).length === 0 ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
                                                }}
                                                title="Guardar Cambios (Ctrl+G)"
                                            >
                                                <i className="fas fa-save"></i>
                                                <span>Guardar</span>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            {(getProgramValue(prog.week_id, 'maestros') || []).map((part: any, i: number) => {
                                const isDiscurso = part.title?.toLowerCase().includes('discurso');
                                return (
                                    <tr key={`smm-desk-${i}`}>
                                        <td className="assignment-title-cell">{part.title}</td>
                                        {activeRoomKeys.map(room => {
                                            const assignmentValue = getProgramValue(prog.week_id, `maestros.${i}.${room}`) || '';
                                            const [enc, ayu] = assignmentValue.split('/').map((s:string) => s.trim());
                                            
                                            if (effectiveIsReadOnly) {
                                                return (
                                                    <td key={room}>
                                                        {isDiscurso ? <span>{assignmentValue || '-'}</span> : 
                                                            <div className="participant-pair">
                                                                <div className="participant-entry"><span className="participant-label">E:</span><span>{enc || '-'}</span></div>
                                                                <div className="participant-entry"><span className="participant-label">A:</span><span>{ayu || '-'}</span></div>
                                                            </div>
                                                        }
                                                    </td>
                                                )
                                            }

                                            return (
                                                <td key={room}>
                                                    {isDiscurso ? (
                                                        <CustomSelect options={lists['maestros_discurso'] || []} value={assignmentValue} onChange={val => handleAssignmentChange(prog.week_id, `maestros.${i}.${room}`, val)} historyProvider={history} tableName="maestros_discurso" onParticipantUpdated={programDataSource.refetch} />
                                                    ) : (
                                                        <button 
                                                            onClick={() => openPairModal(prog.week_id, `maestros.${i}.${room}`, enc || '', ayu || '', `${part.title} - ${roomMap[room]}`)}
                                                            style={{ width: '100%', padding: '8px', textAlign: 'left', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', transition: 'background-color 0.2s' }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                        >
                                                            <div className="participant-entry"><span className="participant-label" style={{fontWeight:'bold', marginRight:'5px', fontSize:'0.8rem'}}>E:</span><span style={{color: enc ? '#1f2937' : '#94a3b8'}}>{enc || 'Asignar...'}</span></div>
                                                            <div className="participant-entry" style={{marginTop:'2px'}}><span className="participant-label" style={{fontWeight:'bold', marginRight:'5px', fontSize:'0.8rem'}}>A:</span><span style={{color: ayu ? '#1f2937' : '#94a3b8'}}>{ayu || 'Asignar...'}</span></div>
                                                        </button>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                )
                            })}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
    
    const renderLecturaBibliaTab = () => (
        <div className="planificador-table-container">
            <table className="planificador-table">
                <thead>
                    <tr>
                        <th>FECHA</th>
                        {activeRoomKeys.map(key => <th key={key}>{roomMap[key]}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {monthlyPrograms.map((prog, idx) => (
                        <tr key={`${prog.week_id}-${idx}`}>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <span style={{ fontWeight: 'bold' }}>{getFridayFromWeekId(prog.week_id, 'long')}</span>
                                    {!effectiveIsReadOnly && (
                                        <button
                                            onClick={onSaveClick}
                                            disabled={Object.keys(changes).length === 0 || saveStatus?.type === 'loading'}
                                            style={{
                                                background: Object.keys(changes).length === 0 ? '#f1f5f9' : '#10b981',
                                                border: 'none',
                                                color: Object.keys(changes).length === 0 ? '#94a3b8' : 'white',
                                                cursor: Object.keys(changes).length === 0 ? 'default' : 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                transition: 'all 0.2s',
                                                boxShadow: Object.keys(changes).length === 0 ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
                                            }}
                                            title="Guardar Cambios (Ctrl+G)"
                                        >
                                            <i className="fas fa-save"></i>
                                            <span>Guardar</span>
                                        </button>
                                    )}
                                </div>
                            </td>
                            {activeRoomKeys.map(room => (
                                <td key={room}>
                                    {effectiveIsReadOnly ? 
                                        (getProgramValue(prog.week_id, `tesoros.p3.${room}`) || '-') : 
                                        <CustomSelect options={lists['lectores'] || []} value={getProgramValue(prog.week_id, `tesoros.p3.${room}`) || ''} onChange={val => handleAssignmentChange(prog.week_id, `tesoros.p3.${room}`, val)} historyProvider={history} tableName="lectores" onParticipantUpdated={programDataSource.refetch} />
                                    }
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderLibroLectorTab = () => {
        return (
            <div className="planificador-table-container">
                <table className="planificador-table">
                    <thead>
                        <tr>
                            <th>FECHA</th>
                            <th>LECTOR ASIGNADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {monthlyPrograms.map((prog, idx) => {
                            const vidaCristiana = getProgramValue(prog.week_id, 'vidaCristiana') || [];
                            const libroPartIndex = vidaCristiana.findIndex((p: any) => p.hasOwnProperty('lector'));

                            if (libroPartIndex === -1) {
                                return (
                                    <tr key={`${prog.week_id}-${idx}`}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                <span style={{ fontWeight: 'bold' }}>{getFridayFromWeekId(prog.week_id, 'long')}</span>
                                                {!effectiveIsReadOnly && (
                                                    <button
                                                        onClick={onSaveClick}
                                                        disabled={Object.keys(changes).length === 0 || saveStatus?.type === 'loading'}
                                                        style={{
                                                            background: Object.keys(changes).length === 0 ? '#f1f5f9' : '#10b981',
                                                            border: 'none',
                                                            color: Object.keys(changes).length === 0 ? '#94a3b8' : 'white',
                                                            cursor: Object.keys(changes).length === 0 ? 'default' : 'pointer',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.2s',
                                                            boxShadow: Object.keys(changes).length === 0 ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
                                                        }}
                                                        title="Guardar Cambios (Ctrl+G)"
                                                    >
                                                        <i className="fas fa-save"></i>
                                                        <span>Guardar</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td><span className="not-applicable">N/A</span></td>
                                    </tr>
                                );
                            }
                            
                            const path = `vidaCristiana.${libroPartIndex}.lector`;
                            const currentValue = getProgramValue(prog.week_id, path) || '';

                            return (
                                <tr key={`${prog.week_id}-${idx}`}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                            <span style={{ fontWeight: 'bold' }}>{getFridayFromWeekId(prog.week_id, 'long')}</span>
                                            {!effectiveIsReadOnly && (
                                                <button
                                                    onClick={onSaveClick}
                                                    disabled={Object.keys(changes).length === 0 || saveStatus?.type === 'loading'}
                                                    style={{
                                                        background: Object.keys(changes).length === 0 ? '#f1f5f9' : '#10b981',
                                                        border: 'none',
                                                        color: Object.keys(changes).length === 0 ? '#94a3b8' : 'white',
                                                        cursor: Object.keys(changes).length === 0 ? 'default' : 'pointer',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        transition: 'all 0.2s',
                                                        boxShadow: Object.keys(changes).length === 0 ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
                                                    }}
                                                    title="Guardar Cambios (Ctrl+G)"
                                                >
                                                    <i className="fas fa-save"></i>
                                                    <span>Guardar</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {effectiveIsReadOnly ? 
                                            <span>{currentValue || '-'}</span> : 
                                            <CustomSelect options={lists['lectores_libro'] || []} value={currentValue} onChange={val => handleAssignmentChange(prog.week_id, path, val)} historyProvider={history} tableName="lectores_libro" onParticipantUpdated={programDataSource.refetch} />
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center">Cargando datos...</div>;
    if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

    return (
        <div className="container mx-auto px-4 py-8 planificador-page">
            {saveStatus && (
                <div className={`text-center font-semibold p-4 mb-4 rounded-lg ${
                    saveStatus.type === 'error' ? 'bg-red-100 text-red-800' : 
                    saveStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                 }`}>{saveStatus.message}</div>
            )}

            {currentMonthUnassigned.length > 0 && !effectiveIsReadOnly && (
                <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-4 mb-6 rounded shadow-sm flex items-start gap-3">
                    <i className="fas fa-exclamation-triangle mt-1 text-amber-600"></i>
                    <div>
                        <p className="font-bold">Asignaciones pendientes en el mes</p>
                        <p className="text-sm">
                            Faltan asignar participantes en {currentMonthUnassigned.length === 1 ? '1 sección' : `${currentMonthUnassigned.length} secciones`} de este mes.
                        </p>
                    </div>
                </div>
            )}
            
            <div className="planificador-header">
                <h1 className="page-title">
                    Planificador
                </h1>
                <div className="planificador-controls">
                    <select id="month-selector" value={selectedMonth} onChange={handleMonthChange}>
                        {availableMonths.map((month, idx) => {
                            const [year, monthNum] = month.split('-');
                            const date = new Date(Number(year), Number(monthNum) - 1);
                            return <option key={`plan-month-${month}-${idx}`} value={month}>{date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</option>
                        })}
                    </select>
                    {isReadOnly ? (
                        <span style={{fontSize:'0.8rem', verticalAlign:'middle', backgroundColor:'#ef4444', color:'white', padding:'4px 8px', borderRadius:'4px', marginLeft:'8px'}}>Solo Lectura</span>
                    ) : (
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            style={{
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                color: isEditMode ? 'white' : '#475569',
                                backgroundColor: isEditMode ? '#10b981' : '#f1f5f9',
                                border: `1px solid ${isEditMode ? '#059669' : '#cbd5e1'}`,
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                marginLeft: '8px'
                            }}
                        >
                            <i className={`fas ${isEditMode ? 'fa-unlock' : 'fa-lock'}`}></i>
                            {isEditMode ? 'Edición Activa' : 'Modo Edición'}
                        </button>
                    )}
                    {!effectiveIsReadOnly && (
                        <>
                            <button 
                                onClick={handleBackup}
                                style={{ 
                                    padding: '8px 16px', 
                                    borderRadius: '8px', 
                                    border: '1px solid var(--border-color)', 
                                    backgroundColor: 'white',
                                    color: '#10b981',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <i className="fas fa-download"></i> Respaldar
                            </button>
                            <button id="save-changes-btn" onClick={onSaveClick} disabled={Object.keys(changes).length === 0}>Guardar Cambios</button>
                        </>
                    )}
                </div>
            </div>

            <div className="planificador-desktop-view">
                <div className="planificador-main-view">
                    <div className="tabs-navigation">
                        <button onClick={() => setActiveTab('smm')} className={`tab-link ${activeTab === 'smm' ? 'active' : ''}`}>Seamos Mejores Maestros</button>
                        <button onClick={() => setActiveTab('biblia')} className={`tab-link ${activeTab === 'biblia' ? 'active' : ''}`}>Lectura Biblia</button>
                        <button onClick={() => setActiveTab('libro')} className={`tab-link ${activeTab === 'libro' ? 'active' : ''}`}>Libro (Lector)</button>
                    </div>

                    <div className="tabs-content-area">
                        {activeTab === 'smm' && renderSMMTab()}
                        {activeTab === 'biblia' && renderLecturaBibliaTab()}
                        {activeTab === 'libro' && renderLibroLectorTab()}
                    </div>
                </div>
            </div>

            <MobilePlanificadorView 
                monthlyPrograms={monthlyPrograms}
                getProgramValue={getProgramValue}
                handleAssignmentChange={handleAssignmentChange}
                lists={lists}
                history={history}
                isReadOnly={effectiveIsReadOnly}
                enabledRooms={settings}
                openPairModal={openPairModal}
                refetch={refetch}
            />

            {/* Mobile Sticky Footer */}
            {!isReadOnly && (
                <div className="program-controls-footer mobile-only">
                    <div className="footer-actions">
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)} 
                            style={{ 
                                backgroundColor: isEditMode ? 'var(--positive-color)' : 'var(--input-bg)',
                                color: isEditMode ? 'white' : 'var(--text-color)',
                                flex: 1,
                                fontSize: '0.9rem'
                            }}
                        >
                            <i className={`fas ${isEditMode ? 'fa-unlock' : 'fa-lock'}`}></i>
                            {isEditMode ? 'Edición Activa' : 'Activar Edición'}
                        </button>
                        {isEditMode && (
                            <button 
                                onClick={onSaveClick} 
                                className="button-save"
                                disabled={Object.keys(changes).length === 0 || saveStatus?.type === 'loading'}
                                style={{ flex: 1 }}
                            >
                                <i className="fas fa-save"></i> Guardar ({Object.keys(changes).length})
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <div className="program-footer-spacer mobile-only"></div>
            
            <PairAssignmentModal 
                isOpen={pairModalState.isOpen}
                onClose={() => setPairModalState(prev => ({ ...prev, isOpen: false }))}
                onSave={handlePairSave}
                initialEncargado={pairModalState.encargado}
                initialAyudante={pairModalState.ayudante}
                options={lists['publicadores'] || []}
                historyProvider={history}
                title={pairModalState.title}
                tableName="publicadores"
                onParticipantUpdated={programDataSource.refetch}
            />

            {/* Modal de Advertencia de Participantes Faltantes en el Planificador */}
            {showMissingAlertModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        maxWidth: '520px',
                        width: '100%',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#d97706', marginBottom: '16px' }}>
                                <span style={{ padding: '8px', backgroundColor: '#fef3c7', borderRadius: '9999px', display: 'inline-flex' }}>
                                    <svg style={{ width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </span>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Asignaciones sin rellenar en el mes</h3>
                            </div>
                            
                            <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.5', marginBottom: '12px' }}>
                                Las siguientes asignaciones para el mes seleccionado aún no tienen un participante asignado:
                            </p>
                            
                            <div style={{
                                maxHeight: '240px',
                                overflowY: 'auto',
                                marginBottom: '24px',
                                backgroundColor: '#f9fafb',
                                border: '1px solid #f3f4f6',
                                borderRadius: '8px',
                                padding: '12px',
                                fontSize: '0.8rem',
                                color: '#374151'
                            }}>
                                {unassignedList.map((item, index) => (
                                    <div key={index} style={{
                                        padding: '8px 0',
                                        borderBottom: index < unassignedList.length - 1 ? '1px solid #f3f4f6' : 'none',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#f59e0b', flexShrink: 0 }} />
                                            <span style={{ fontWeight: 'bold', color: '#111827' }}>{item.label}</span>
                                        </div>
                                        <div style={{ paddingLeft: '12px', color: '#4b5563' }}>{item.item}</div>
                                    </div>
                                ))}
                            </div>
                            
                            <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500', marginBottom: '24px' }}>
                                ¿Deseas guardar los cambios de todos modos o prefieres completarlos ahora?
                            </p>
                            
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setShowMissingAlertModal(false)}
                                    style={{
                                        padding: '10px 16px',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: '#374151',
                                        backgroundColor: '#f3f4f6',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                >
                                    Completar ahora
                                </button>
                                <button
                                    onClick={() => {
                                        setShowMissingAlertModal(false);
                                        handleSaveChanges();
                                    }}
                                    className="button-save"
                                    style={{
                                        padding: '10px 16px',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: '#fff',
                                        backgroundColor: '#d97706',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.4)'
                                    }}
                                >
                                    Guardar de todos modos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Planificador;
