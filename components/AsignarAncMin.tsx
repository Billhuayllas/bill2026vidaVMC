
import React from 'react';
import CustomSelect from './CustomSelect';
import { getFridayFromWeekId } from '../lib/utils';
import { useProgramData } from '../lib/useProgramData';
import { useProgramEditor } from '../lib/useProgramEditor';
import { useCongregation } from '../lib/CongregationContext';

interface AsignarAncMinProps {
    isReadOnly?: boolean;
}

const AsignarAncMin: React.FC<AsignarAncMinProps> = ({ isReadOnly = false }) => {
    const { currentCongregation } = useCongregation();
    const programDataSource = useProgramData();
    const {
        loading,
        error,
        programs,
        lists,
        history: assignmentHistory
    } = programDataSource;
    
    const {
        selectedMonth,
        handleMonthChange,
        availableMonths,
        changes,
        handleAssignmentChange,
        handleSaveChanges,
        saveStatus,
        getProgramValue,
    } = useProgramEditor(programDataSource);

    const settings = currentCongregation?.settings?.enabled_rooms_per_month?.[selectedMonth] || currentCongregation?.settings?.enabled_rooms || { main: true, aux2: true, aux3: true };

    const programsForMonth = programs.filter(p => p.week_id.startsWith(selectedMonth));
    
    const assignmentMeta: { [key: string]: { list: keyof typeof lists, label: string } } = {
        'presidentes.principal': { list: 'presidentes', label: 'Presidente' },
        'presidentes.aux2': { list: 'consejeros', label: 'Consejero Sala 2' },
        'presidentes.aux3': { list: 'consejeros', label: 'Consejero Sala 3' },
        'tesoros.p1.main': { list: 'discursantes', label: 'Tesoros (10 min)' },
        'tesoros.p2.main': { list: 'discursantes', label: 'Perlas Escondidas' },
        'discursoVidaCr': { list: 'discursantes', label: 'Discurso Vida Cr.' },
        'necesidadesCong': { list: 'discursantes', label: 'Necesidades' },
        'libroCongregacion': { list: 'discursantes', label: 'Estudio del Libro' },
    };

    const [isEditMode, setIsEditMode] = React.useState(false);
    const effectiveIsReadOnly = isReadOnly || !isEditMode;

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 's')) {
                e.preventDefault();
                if (!effectiveIsReadOnly && Object.keys(changes).length > 0 && saveStatus?.type !== 'loading') {
                    handleSaveChanges();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [effectiveIsReadOnly, changes, saveStatus]);

    const renderAssignment = (weekId: string, path: string | null, listKey: string) => {
        if (!path) return <span className="not-applicable" style={{fontSize:'0.85rem', color:'#9ca3af', fontStyle:'italic'}}>No aplica esta semana</span>;
        const value = getProgramValue(weekId, path) || '';
        if (effectiveIsReadOnly) {
            return <div style={{fontWeight:'600', padding:'8px 0', color:'var(--text-color)'}}>{value || '-'}</div>;
        }
        return (
            <CustomSelect 
                options={lists[listKey] || []} 
                value={value} 
                onChange={val => handleAssignmentChange(weekId, path, val)} 
                historyProvider={assignmentHistory} 
            />
        );
    };

    if (loading) return <div className="p-8 text-center">Cargando datos...</div>;
    if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

    return (
        <div className="container mx-auto px-4 py-8 asignar-anc-min-page">
            <div className="page-header-container">
                <h1 className="page-title">
                    Asignaciones: Ancianos y S. Ministeriales
                </h1>
                <div className="controls-container">
                    <div className="month-selector-wrapper">
                        <i className="fas fa-calendar-alt"></i>
                        <select id="month-selector" value={selectedMonth} onChange={handleMonthChange}>
                            {availableMonths.map((key, idx) => {
                                const [year, month] = key.split('-');
                                const date = new Date(Number(year), Number(month) - 1);
                                return <option key={`anc-month-${key}-${idx}`} value={key}>{date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</option>
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
                    </div>
                    {!effectiveIsReadOnly && (
                        <button 
                            onClick={handleSaveChanges} 
                            disabled={Object.keys(changes).length === 0 || saveStatus?.type === 'loading'}
                            className="save-changes-button"
                        >
                            {saveStatus?.type === 'loading' ? (
                                <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
                            ) : (
                                <><i className="fas fa-save"></i> Guardar Cambios</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {saveStatus && saveStatus.type !== 'loading' && (
                <div className={`feedback-message type--${saveStatus.type}`}>
                    {saveStatus.message}
                </div>
            )}
            
            <div className="assignments-content">
                <div className="assignment-main-view">
                     <div className="assignment-table-container">
                        <table className="assignment-table">
                            <thead>
                                <tr>
                                    <th>Fecha (Viernes)</th>
                                    <th>Presidente</th>
                                    {settings.aux2 && <th>Sala Auxiliar 2</th>}
                                    {settings.aux3 && <th>Sala Auxiliar 3</th>}
                                    <th>Tesoros-Punto 1</th>
                                    <th>Perlas Escondidas</th>
                                    <th>Discurso Vida Cr.</th>
                                    <th>Necesidades de Cong.</th>
                                    <th>Libro de Congregación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {programsForMonth.map((prog, idx) => {
                                    const vidaCristiana = getProgramValue(prog.week_id, 'vidaCristiana') || [];
                        
                                    const discursoPart = vidaCristiana.find((p: any) => p.hasOwnProperty('discursante') && !p.titulo?.toLowerCase().includes('necesidades'));
                                    const discursoPath = discursoPart ? `vidaCristiana.${vidaCristiana.indexOf(discursoPart)}.discursante` : null;

                                    const necesidadesPart = vidaCristiana.find((p: any) => p.titulo?.toLowerCase().includes('necesidades'));
                                    const necesidadesPath = necesidadesPart ? `vidaCristiana.${vidaCristiana.indexOf(necesidadesPart)}.discursante` : null;

                                    const libroPart = vidaCristiana.find((p: any) => p.hasOwnProperty('conductor'));
                                    const libroPath = libroPart ? `vidaCristiana.${vidaCristiana.indexOf(libroPart)}.conductor` : null;

                                    return (
                                        <tr key={`${prog.week_id}-${idx}`}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                    <span style={{ fontWeight: 'bold' }}>{getFridayFromWeekId(prog.week_id, 'short')}</span>
                                                    {!effectiveIsReadOnly && (
                                                        <button
                                                            onClick={handleSaveChanges}
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
                                            <td>{renderAssignment(prog.week_id, 'presidentes.principal', 'presidentes')}</td>
                                            {settings.aux2 && <td>{renderAssignment(prog.week_id, 'presidentes.aux2', 'consejeros')}</td>}
                                            {settings.aux3 && <td>{renderAssignment(prog.week_id, 'presidentes.aux3', 'consejeros')}</td>}
                                            <td>{renderAssignment(prog.week_id, 'tesoros.p1.main', 'discursantes')}</td>
                                            <td>{renderAssignment(prog.week_id, 'tesoros.p2.main', 'discursantes')}</td>
                                            <td>{renderAssignment(prog.week_id, discursoPath, 'discursantes')}</td>
                                            <td>{renderAssignment(prog.week_id, necesidadesPath, 'discursantes')}</td>
                                            <td>{renderAssignment(prog.week_id, libroPath, 'discursantes')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AsignarAncMin;
