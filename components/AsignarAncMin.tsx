
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
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 asignar-anc-min-page">
            <div className="page-header-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="page-title text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
                        Asignaciones: Ancianos y S. Ministeriales
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Programa mensual para presidentes, consejeros, discursantes y conductores.
                    </p>
                </div>

                <div className="controls-container flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <div className="month-selector-wrapper flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm flex-1 sm:flex-initial">
                        <i className="fas fa-calendar-alt text-indigo-500 text-sm"></i>
                        <select 
                            id="month-selector" 
                            value={selectedMonth} 
                            onChange={handleMonthChange}
                            className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer flex-1"
                        >
                            {availableMonths.map((key, idx) => {
                                const [year, month] = key.split('-');
                                const date = new Date(Number(year), Number(month) - 1);
                                return <option key={`anc-month-${key}-${idx}`} value={key} className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">{date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</option>
                            })}
                        </select>
                    </div>

                    {isReadOnly ? (
                        <span className="text-xs font-bold bg-rose-500 text-white px-2.5 py-1.5 rounded-xl shadow-sm">Solo Lectura</span>
                    ) : (
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`text-xs font-bold px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                                isEditMode 
                                    ? 'bg-emerald-600 border-emerald-700 text-white' 
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <i className={`fas ${isEditMode ? 'fa-unlock' : 'fa-lock'}`}></i>
                            <span>{isEditMode ? 'Edición Activa' : 'Modo Edición'}</span>
                        </button>
                    )}

                    {!effectiveIsReadOnly && (
                        <button 
                            onClick={handleSaveChanges} 
                            disabled={Object.keys(changes).length === 0 || saveStatus?.type === 'loading'}
                            className="save-changes-button bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
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
                <div className={`feedback-message type--${saveStatus.type} mb-4 p-3 rounded-xl text-xs sm:text-sm font-semibold`}>
                    {saveStatus.message}
                </div>
            )}
            
            <div className="assignments-content">
                {/* --- MOBILE VIEW: RESPONSIVE CARDS PER WEEK --- */}
                <div className="block lg:hidden space-y-4">
                    {programsForMonth.map((prog, idx) => {
                        const vidaCristiana = getProgramValue(prog.week_id, 'vidaCristiana') || [];
                        const discursoPart = vidaCristiana.find((p: any) => p.hasOwnProperty('discursante') && !p.titulo?.toLowerCase().includes('necesidades'));
                        const discursoPath = discursoPart ? `vidaCristiana.${vidaCristiana.indexOf(discursoPart)}.discursante` : null;

                        const necesidadesPart = vidaCristiana.find((p: any) => p.titulo?.toLowerCase().includes('necesidades'));
                        const necesidadesPath = necesidadesPart ? `vidaCristiana.${vidaCristiana.indexOf(necesidadesPart)}.discursante` : null;

                        const libroPart = vidaCristiana.find((p: any) => p.hasOwnProperty('conductor'));
                        const libroPath = libroPart ? `vidaCristiana.${vidaCristiana.indexOf(libroPart)}.conductor` : null;

                        return (
                            <div key={`mob-anc-${prog.week_id}-${idx}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                        <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                                            {getFridayFromWeekId(prog.week_id, 'long')}
                                        </h3>
                                    </div>
                                    {!effectiveIsReadOnly && (
                                        <button
                                            onClick={handleSaveChanges}
                                            disabled={Object.keys(changes).length === 0 || saveStatus?.type === 'loading'}
                                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                                                Object.keys(changes).length === 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-emerald-600 text-white shadow-sm'
                                            }`}
                                        >
                                            <i className="fas fa-save"></i> Guardar
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">Presidente:</span>
                                        {renderAssignment(prog.week_id, 'presidentes.principal', 'presidentes')}
                                    </div>

                                    {settings.aux2 && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">Consejero Sala 2:</span>
                                            {renderAssignment(prog.week_id, 'presidentes.aux2', 'consejeros')}
                                        </div>
                                    )}

                                    {settings.aux3 && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">Consejero Sala 3:</span>
                                            {renderAssignment(prog.week_id, 'presidentes.aux3', 'consejeros')}
                                        </div>
                                    )}

                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tesoros (Punto 1):</span>
                                        {renderAssignment(prog.week_id, 'tesoros.p1.main', 'discursantes')}
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Perlas Escondidas:</span>
                                        {renderAssignment(prog.week_id, 'tesoros.p2.main', 'discursantes')}
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Discurso Vida Cr.:</span>
                                        {renderAssignment(prog.week_id, discursoPath, 'discursantes')}
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Necesidades Cong.:</span>
                                        {renderAssignment(prog.week_id, necesidadesPath, 'discursantes')}
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Estudio del Libro:</span>
                                        {renderAssignment(prog.week_id, libroPath, 'discursantes')}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* --- DESKTOP VIEW: FULL TABLE --- */}
                <div className="hidden lg:block assignment-main-view">
                     <div className="assignment-table-container overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                        <table className="assignment-table w-full">
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
