
import React, { useState, useMemo, useEffect } from 'react';
import { useProgramaLogic } from './programa/useProgramaLogic';
import DesktopProgramView from './programa/DesktopProgramView';
import MobileProgramView from './programa/MobileProgramView';
import { handleOpenPrintPreview } from './programa/printUtils';
import { useCongregation } from '../lib/CongregationContext';

interface ProgramaProps {
    isReadOnly?: boolean;
    isActive?: boolean;
}

// Helper to check for unassigned participants
const getUnassignedList = (data: any, enabledRooms: any) => {
    const unassigned: string[] = [];
    if (!data) return unassigned;

    const rooms = [];
    if (enabledRooms?.aux3) rooms.push({ id: 'aux3', name: 'Sala 3' });
    if (enabledRooms?.aux2) rooms.push({ id: 'aux2', name: 'Sala 2' });
    if (enabledRooms?.main) rooms.push({ id: 'main', name: 'Sala Principal' });

    // 1. Presidentes
    rooms.forEach(r => {
        const val = r.id === 'main' ? data.presidentes?.principal : data.presidentes?.[r.id];
        if (!val || val.trim() === '' || val.trim() === '-- Asignar --') {
            unassigned.push(`Presidente (${r.name})`);
        }
    });

    // 2. Oración inicio (Main only)
    if (enabledRooms?.main) {
        const val = data.oracion?.inicio;
        if (!val || val.trim() === '' || val.trim() === '-- Asignar --') {
            unassigned.push('Oración de Inicio');
        }
    }

    // 3. Tesoros
    if (enabledRooms?.main) {
        // p1
        const p1 = data.tesoros?.p1?.main;
        if (!p1 || p1.trim() === '' || p1.trim() === '-- Asignar --') {
            const title = data.tesoros?.p1?.title || 'Tesoros Parte 1';
            unassigned.push(title);
        }
        // p2
        const p2 = data.tesoros?.p2?.main;
        if (!p2 || p2.trim() === '' || p2.trim() === '-- Asignar --') {
            const title = data.tesoros?.p2?.title || 'Tesoros Parte 2';
            unassigned.push(title);
        }
    }
    // p3 (Lectura de la Biblia) - each enabled room
    rooms.forEach(r => {
        const val = data.tesoros?.p3?.[r.id];
        if (!val || val.trim() === '' || val.trim() === '-- Asignar --') {
            unassigned.push(`Lectura de la Biblia (${r.name})`);
        }
    });

    // 4. Seamos Mejores Maestros (maestros)
    if (data.maestros && Array.isArray(data.maestros)) {
        data.maestros.forEach((part: any, i: number) => {
            const isDiscurso = part.title?.toLowerCase().includes('discurso');
            rooms.forEach(r => {
                const val = part[r.id];
                if (isDiscurso) {
                    if (!val || val.trim() === '' || val.trim() === '-- Asignar --') {
                        unassigned.push(`${part.title || `Maestros Parte ${i + 1}`} (${r.name})`);
                    }
                } else {
                    const [enc, ayu] = (val || '').split('/').map((s: string) => s.trim());
                    const isEncEmpty = !enc || enc === '' || enc === '-- Asignar --';
                    const isAyuEmpty = !ayu || ayu === '' || ayu === '-- Asignar --';
                    if (isEncEmpty) {
                        unassigned.push(`${part.title || `Maestros Parte ${i + 1}`} - Buscar Encargado (${r.name})`);
                    }
                    if (isAyuEmpty) {
                        unassigned.push(`${part.title || `Maestros Parte ${i + 1}`} - Buscar Ayudante (${r.name})`);
                    }
                }
            });
        });
    }

    // 5. Nuestra Vida Cristiana (vidaCristiana)
    if (data.vidaCristiana && Array.isArray(data.vidaCristiana)) {
        data.vidaCristiana.forEach((part: any, i: number) => {
            if (part.hasOwnProperty('discursante')) {
                const val = part.discursante;
                if (!val || val.trim() === '' || val.trim() === '-- Asignar --') {
                    unassigned.push(`${part.titulo || `Vida Cristiana ${i + 1}`} (Discursante)`);
                }
            }
            if (part.hasOwnProperty('conductor')) {
                const val = part.conductor;
                if (!val || val.trim() === '' || val.trim() === '-- Asignar --') {
                    unassigned.push(`${part.titulo || `Vida Cristiana ${i + 1}`} (Conductor)`);
                }
            }
            if (part.hasOwnProperty('lector')) {
                const val = part.lector;
                if (!val || val.trim() === '' || val.trim() === '-- Asignar --') {
                    unassigned.push(`${part.titulo || `Vida Cristiana ${i + 1}`} (Lector)`);
                }
            }
        });
    }

    // 6. Oración Final (Main only)
    if (enabledRooms?.main) {
        const val = data.oracion?.final;
        if (!val || val.trim() === '' || val.trim() === '-- Asignar --') {
            unassigned.push('Oración Final');
        }
    }

    return unassigned;
};

const Programa: React.FC<ProgramaProps> = ({ isReadOnly = false, isActive = false }) => {
    const { currentCongregation } = useCongregation();
    const {
        programs,
        lists,
        history,
        loading,
        error,
        selectedWeek,
        setSelectedWeek,
        programData,
        handleDataChange,
        handleSave,
        saveStatus,
        printStartWeek,
        setPrintStartWeek,
        printEndWeek,
        setPrintEndWeek,
        duplicatedParticipants
    } = useProgramaLogic(isReadOnly, isActive);

    const monthKey = selectedWeek ? selectedWeek.substring(0, 7) : '';
    const settings = currentCongregation?.settings?.enabled_rooms_per_month?.[monthKey] || currentCongregation?.settings?.enabled_rooms || { main: true, aux2: true, aux3: true };

    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showMissingAlertModal, setShowMissingAlertModal] = useState(false);
    const [unassignedList, setUnassignedList] = useState<string[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);

    const effectiveIsReadOnly = isReadOnly || !isEditMode;

    const currentWeekUnassigned = useMemo(() => {
        return getUnassignedList(programData, settings);
    }, [programData, settings]);

    const onSaveClick = () => {
        const unassigned = getUnassignedList(programData, settings);
        if (unassigned.length > 0 || duplicatedParticipants.length > 0) {
            setUnassignedList(unassigned);
            setShowMissingAlertModal(true);
        } else {
            handleSave();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 's')) {
                e.preventDefault();
                if (!effectiveIsReadOnly) {
                    onSaveClick();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [effectiveIsReadOnly, programData, settings, duplicatedParticipants]);

    if (loading) return <div className="p-10 text-center">Cargando programa...</div>;
    if (error) return <div className="p-10 text-center text-red-600">Error al cargar: {error}</div>;

    const handlePrintClick = () => {
        // Ensure defaults are set when opening modal
        if (!printStartWeek) setPrintStartWeek(selectedWeek);
        if (!printEndWeek) setPrintEndWeek(selectedWeek);
        setShowPrintModal(true);
    };

    const confirmPrint = () => {
        handleOpenPrintPreview(programs, printStartWeek, printEndWeek, selectedWeek, programData, settings);
        setShowPrintModal(false);
    };

    const formatWeekLabel = (title: string, w: string) => {
        if (!title) return w;
        let label = title.split('|')[0].trim().toLowerCase();
        label = label.charAt(0).toUpperCase() + label.slice(1);
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        months.forEach(m => {
            label = label.replace(new RegExp(m, 'g'), m.charAt(0).toUpperCase() + m.slice(1));
        });
        return label;
    };

    const getFilteredAndGroupedPrograms = () => {
        const now = new Date();
        const currentMonthString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        
        const filteredPrograms = programs
            .filter(p => p.week_id >= currentMonthString)
            .sort((a, b) => a.week_id.localeCompare(b.week_id));

        return filteredPrograms;
    };

    const renderGroupedWeekOptions = (progs: any[]) => {
        const renderedGroups: React.ReactNode[] = [];
        let currentMonth = '';
        let currentOptions: React.ReactNode[] = [];

        progs.forEach((p, idx) => {
            const date = new Date(p.week_id + 'T12:00:00');
            const monthStr = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            const monthCapitalized = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
            
            if (monthCapitalized !== currentMonth) {
                if (currentMonth !== '') {
                    renderedGroups.push(
                        <optgroup key={currentMonth} label={currentMonth}>
                            {currentOptions}
                        </optgroup>
                    );
                }
                currentMonth = monthCapitalized;
                currentOptions = [];
            }
            
            currentOptions.push(
                <option key={`prog-sel-${p.week_id}-${idx}`} value={p.week_id}>
                    {formatWeekLabel(p.data?.titulo, p.week_id)}
                </option>
            );
        });

        if (currentMonth !== '') {
            renderedGroups.push(
                <optgroup key={`last-${currentMonth}`} label={currentMonth}>
                    {currentOptions}
                </optgroup>
            );
        }

        return renderedGroups;
    };

    const filteredAndSortedPrograms = getFilteredAndGroupedPrograms();

    return (
        <div className="container mx-auto px-4 py-8 programa-page relative">
            <div className="programa-controls-box">
                <label htmlFor="week-selector">Seleccione Semana:</label>
                <select id="week-selector" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                    {renderGroupedWeekOptions(filteredAndSortedPrograms)}
                </select>
                {isReadOnly ? (
                    <span style={{marginLeft:'10px', fontSize:'0.8rem', color:'#666', backgroundColor:'#eee', padding:'4px 8px', borderRadius:'4px'}}>Modo Lectura</span>
                ) : (
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        style={{
                            marginLeft: '10px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            color: isEditMode ? 'white' : '#475569',
                            backgroundColor: isEditMode ? '#10b981' : '#f1f5f9',
                            border: `1px solid ${isEditMode ? '#059669' : '#cbd5e1'}`,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className={`fas ${isEditMode ? 'fa-unlock' : 'fa-lock'}`}></i>
                        {isEditMode ? 'Edición Activa' : 'Modo Edición'}
                    </button>
                )}
            </div>

            {!effectiveIsReadOnly && programData && (
                <>
                    {/* Advertencia de Duplicación */}
                    {duplicatedParticipants.length > 0 && (
                        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 mb-4 rounded shadow-sm flex items-start gap-3 animate-pulse-subtle">
                            <i className="fas fa-exclamation-triangle mt-1 text-amber-600"></i>
                            <div>
                                <p className="font-bold">Advertencia de Duplicación</p>
                                <p className="text-sm">
                                    Los siguientes participantes tienen más de una asignación esta semana: 
                                    <span className="font-semibold ml-1">{duplicatedParticipants.join(', ')}</span>.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Advertencia de Participantes Faltantes / Campos Vacíos */}
                    {currentWeekUnassigned.length > 0 ? (
                        <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-4 mb-4 rounded shadow-sm flex items-start gap-3">
                            <i className="fas fa-user-plus mt-1 text-amber-600"></i>
                            <div>
                                <p className="font-bold">Falta asignar participante</p>
                                <p className="text-sm">
                                    Falta rellenar un participante en {currentWeekUnassigned.length === 1 ? 'este campo' : 'estos campos'}:{' '}
                                    <span className="font-semibold">{currentWeekUnassigned.join(', ')}</span>.
                                </p>
                            </div>
                        </div>
                    ) : (
                        // If no unassigned AND no duplicates, show success
                        duplicatedParticipants.length === 0 && (
                            <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-4 mb-4 rounded shadow-sm flex items-start gap-3">
                                <i className="fas fa-check-circle mt-1 text-green-600"></i>
                                <div>
                                    <p className="font-bold">¡Todo completo!</p>
                                    <p className="text-sm">
                                        No hay participantes repetidos y todas las asignaciones están completas esta semana.
                                    </p>
                                </div>
                            </div>
                        )
                    )}

                    {/* If all is assigned but duplicates exist */}
                    {duplicatedParticipants.length > 0 && currentWeekUnassigned.length === 0 && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 mb-4 rounded shadow-sm flex items-start gap-3">
                            <i className="fas fa-check mt-1 text-blue-600"></i>
                            <div>
                                <p className="font-bold">Asignaciones completadas</p>
                                <p className="text-sm">
                                    Todas las partes de la semana tienen un participante asignado.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="programa-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 className="page-title" style={{ margin: 0 }}>Programa Semanal</h1>
                
                <div className="desktop-only" style={{ gap: '10px' }}>
                     {!isReadOnly && (
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)} 
                            style={{ 
                                backgroundColor: isEditMode ? '#10b981' : '#f1f5f9',
                                color: isEditMode ? 'white' : '#475569',
                                border: `1px solid ${isEditMode ? '#059669' : '#cbd5e1'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <i className={`fas ${isEditMode ? 'fa-unlock' : 'fa-lock'}`}></i>
                            {isEditMode ? 'Edición Activa' : 'Modo Edición'}
                        </button>
                    )}
                    {isEditMode && (
                        <button onClick={onSaveClick} className="button-save" disabled={saveStatus?.type === 'loading'}>
                            <i className="fas fa-save"></i> Guardar
                        </button>
                    )}
                </div>
            </div>

            {saveStatus && <div className={`text-center font-semibold p-4 mb-4 rounded-lg bg-${saveStatus.type === 'error' ? 'red-100 text-red-800' : saveStatus.type === 'success' ? 'green-100 text-green-800' : 'blue-100 text-blue-800'}`}>{saveStatus.message}</div>}
            
            <div className="programa-desktop-view">
                <DesktopProgramView 
                    programData={programData} 
                    handleDataChange={handleDataChange} 
                    lists={lists} 
                    history={history} 
                    selectedWeek={selectedWeek} 
                    isReadOnly={effectiveIsReadOnly} 
                />
            </div>

            <MobileProgramView 
                programData={programData} 
                handleDataChange={handleDataChange} 
                lists={lists} 
                history={history} 
                selectedWeek={selectedWeek} 
                isReadOnly={effectiveIsReadOnly} 
            />
            
             <div className="program-controls-footer">
                 <div className="footer-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button onClick={handlePrintClick} className="button-print" style={{ flex: 1, justifyContent: 'center' }}>
                        <i className="fas fa-eye"></i> Vista Previa
                    </button>
                    
                    {!isReadOnly && (
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)} 
                            style={{ 
                                backgroundColor: isEditMode ? 'var(--positive-color)' : 'var(--input-bg)',
                                color: isEditMode ? 'white' : 'var(--text-color)',
                                flex: 1,
                                justifyContent: 'center'
                            }}
                        >
                            <i className={`fas ${isEditMode ? 'fa-unlock' : 'fa-lock'}`}></i>
                            {isEditMode ? 'Editando' : 'Editar'}
                        </button>
                    )}

                    {isEditMode && (
                        <button onClick={onSaveClick} className="button-save" style={{ flex: 1, justifyContent: 'center' }} disabled={saveStatus?.type === 'loading'}>
                            <i className="fas fa-save"></i> Guardar
                        </button>
                    )}
                </div>
            </div>
            
            <div className="program-footer-spacer mobile-only"></div>
            
            {/* Modal de Opciones de Impresión */}
            {showPrintModal && (
                <div className="print-modal-overlay">
                    <div className="print-modal">
                        <div className="print-modal-header">
                            <h3>Opciones de Vista Previa</h3>
                            <button onClick={() => setShowPrintModal(false)} className="close-btn">&times;</button>
                        </div>
                        <div className="print-modal-body">
                            <div className="form-group">
                                <label>Desde:</label>
                                <select 
                                    value={printStartWeek} 
                                    onChange={e => {
                                        const newStart = e.target.value;
                                        setPrintStartWeek(newStart);
                                        if (printEndWeek < newStart) setPrintEndWeek(newStart);
                                    }}
                                >
                                    {programs.map((p, idx) => <option key={`print-opt-start-${p.week_id}-${idx}`} value={p.week_id}>{p.data?.titulo || p.week_id}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Hasta:</label>
                                <select 
                                    value={printEndWeek} 
                                    onChange={e => setPrintEndWeek(e.target.value)}
                                >
                                    {programs.filter(p => p.week_id >= printStartWeek).map((p, idx) => <option key={`print-opt-end-${p.week_id}-${idx}`} value={p.week_id}>{p.data?.titulo || p.week_id}</option>)}
                                </select>
                            </div>
                            
                            {!effectiveIsReadOnly && (
                                <div style={{ borderTop: '1px solid #eee', marginTop: '15px', paddingTop: '15px' }}>
                                    <div style={{fontSize:'0.9rem', fontWeight:'bold', color:'#333', marginBottom:'10px'}}>Configuración de Visualización</div>
                                    
                                    <div style={{backgroundColor: '#eef2ff', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: '#3730a3', marginBottom: '15px', border: '1px solid #c7d2fe'}}>
                                        <i className="fas fa-info-circle mr-1"></i>
                                        Editando opciones para la semana:<br/>
                                        <strong style={{fontSize:'0.95rem', display:'block', marginTop:'4px'}}>{programData?.titulo || selectedWeek}</strong>
                                    </div>
 
                                    <div className="form-group">
                                        <label>Marca de agua:</label>
                                        <input 
                                            type="text" 
                                            value={programData?.watermark ?? 'PRELIMINAR'} 
                                            onChange={e => handleDataChange(selectedWeek, 'watermark', e.target.value)} 
                                        />
                                    </div>
                                    <div className="form-group checkbox-group" style={{ marginBottom: '15px' }}>
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={programData?.isBlurred ?? false} 
                                                onChange={e => handleDataChange(selectedWeek, 'isBlurred', e.target.checked)} 
                                            />
                                            Difuminar contenido (Privacidad)
                                        </label>
                                    </div>
                                    <button 
                                        onClick={onSaveClick} 
                                        className="button-save"
                                        style={{ width: '100%', fontSize: '0.9rem', padding: '10px' }}
                                        disabled={saveStatus?.type === 'loading'}
                                    >
                                        {saveStatus?.type === 'loading' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save mr-2"></i>} 
                                        Guardar Configuración
                                    </button>
                                    {saveStatus && <div style={{marginTop:'8px', fontSize:'0.85rem', color: saveStatus.type === 'success' ? 'green' : 'red', textAlign:'center', fontWeight:'600'}}>{saveStatus.message}</div>}
                                </div>
                            )}
                        </div>
                        <div className="print-modal-footer">
                            <button onClick={() => setShowPrintModal(false)} className="cancel-btn">Cancelar</button>
                            <button onClick={confirmPrint} className="confirm-btn">
                                <i className="fas fa-print mr-2"></i> Generar
                            </button>
                        </div>
                    </div>
                </div>
            )}
 
            {/* Modal de Advertencia de Participantes Faltantes */}
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
                        maxWidth: '450px',
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
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Hay observaciones</h3>
                            </div>
                            
                            <p style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.5', marginBottom: '16px' }}>
                                Por favor revisa lo siguiente para la semana <strong>{formatWeekLabel(programData?.titulo, selectedWeek)}</strong> antes de guardar:
                            </p>
                            
                            <div style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                marginBottom: '24px',
                                backgroundColor: '#f9fafb',
                                border: '1px solid #f3f4f6',
                                borderRadius: '8px',
                                padding: '12px',
                                fontSize: '0.8rem',
                                color: '#374151'
                            }}>
                                {unassignedList.length > 0 && (
                                    <>
                                        <strong style={{display: 'block', marginBottom: '8px', color: '#d97706'}}>Falta asignar:</strong>
                                        {unassignedList.map((item, index) => (
                                            <div key={index} style={{
                                                padding: '6px 0',
                                                borderBottom: index < unassignedList.length - 1 ? '1px solid #e5e7eb' : 'none',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '8px'
                                            }}>
                                                <span style={{ color: '#9ca3af', marginTop: '2px' }}>•</span>
                                                <span style={{flex: 1}}>{item}</span>
                                            </div>
                                        ))}
                                    </>
                                )}
                                
                                {duplicatedParticipants.length > 0 && (
                                    <>
                                        <strong style={{display: 'block', marginTop: unassignedList.length > 0 ? '16px' : '0', marginBottom: '8px', color: '#dc2626'}}>Participantes asignados varias veces:</strong>
                                        {duplicatedParticipants.map((item, index) => (
                                            <div key={index} style={{
                                                padding: '6px 0',
                                                borderBottom: index < duplicatedParticipants.length - 1 ? '1px solid #e5e7eb' : 'none',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '8px'
                                            }}>
                                                <span style={{ color: '#9ca3af', marginTop: '2px' }}>•</span>
                                                <span style={{flex: 1}}>{item}</span>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                            
                            <p style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500', marginBottom: '24px' }}>
                                ¿Deseas guardar el programa de todos modos o prefieres completarlo ahora?
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
                                        handleSave();
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

            {/* Spacer for mobile sticky footer */}
            <div className="program-footer-spacer"></div>
        </div>
    );
};

export default Programa;
