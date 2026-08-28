
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getFridayFromWeekId, getStartOfWeek } from '../lib/utils';

type AssignmentStatus = 'pending' | 'accepted' | 'rejected';

type Assignment = {
  id: string;
  weekId: string;
  date: string;
  role: string;
  room: string;
  subRole: string | null;
  jsonPath: string;
  statusPath: string;
  currentStatus: AssignmentStatus;
};

const getDeepValue = (obj: any, path: string) => {
    if (!path) return undefined;
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
}

const setDeepValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const nextKeyIsNumber = !isNaN(parseInt(keys[i+1], 10));
        if (!current[key]) {
            current[key] = nextKeyIsNumber ? [] : {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
};


const AcceptAssignments: React.FC<{ participant: string }> = ({ participant }) => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statuses, setStatuses] = useState<Record<string, 'accepted' | 'rejected'>>({});
    const [saveStatus, setSaveStatus] = useState<{ message: string, type: 'success' | 'error' | 'loading' } | null>(null);

    const parseAssignments = useCallback((programs: any[]) => {
        const collectedAssignments: Assignment[] = [];
        const startOfThisWeek = getStartOfWeek(new Date());
        const futurePrograms = programs.filter(p => new Date(p.week_id) >= startOfThisWeek);

        futurePrograms.forEach(prog => {
            const { week_id, data } = prog;
            if (!data) return;

            const checkAndAdd = (role: string, assignmentStr: string | null | undefined, room: string, jsonPath: string) => {
                if (!assignmentStr || !assignmentStr.includes(participant)) return;
                
                const people = assignmentStr.split("/").map(p => p.trim());
                const personIndex = people.findIndex(p => p === participant);
                if (personIndex === -1) return;

                const subRole = people.length > 1 ? (personIndex === 0 ? "E" : "A") : null;
                const statusPath = jsonPath + '_status';
                const statusObj = getDeepValue(data, statusPath);
                const currentStatus = (statusObj && statusObj[participant]) ? statusObj[participant] : 'pending';
                const id = `${week_id}-${jsonPath}-${participant}`;
                
                collectedAssignments.push({
                    id,
                    weekId: week_id,
                    date: getFridayFromWeekId(week_id, 'long'),
                    role,
                    room,
                    subRole,
                    jsonPath,
                    statusPath,
                    currentStatus
                });
            };

            checkAndAdd("Presidente", data.presidentes?.principal, "Principal", "presidentes.principal");
            checkAndAdd("Consejero", data.presidentes?.aux2, "Sala 2", "presidentes.aux2");
            checkAndAdd("Consejero", data.presidentes?.aux3, "Sala 3", "presidentes.aux3");
            checkAndAdd("Oración Inicio", data.oracion?.inicio, "Principal", "oracion.inicio");
            checkAndAdd("Oración Final", data.oracion?.final, "Principal", "oracion.final");
            if (data.tesoros) {
                checkAndAdd(data.tesoros.p1?.title || "Discurso (Tesoros)", data.tesoros.p1?.main, "Principal", "tesoros.p1.main");
                checkAndAdd(data.tesoros.p2?.title || "Perlas Escondidas", data.tesoros.p2?.main, "Principal", "tesoros.p2.main");
                if (data.tesoros.p3) {
                    checkAndAdd("Lectura de la Biblia", data.tesoros.p3.main, "Principal", "tesoros.p3.main");
                    checkAndAdd("Lectura de la Biblia", data.tesoros.p3.aux2, "Sala 2", "tesoros.p3.aux2");
                    checkAndAdd("Lectura de la Biblia", data.tesoros.p3.aux3, "Sala 3", "tesoros.p3.aux3");
                }
            }
            (data.maestros || []).forEach((m: any, i: number) => {
                const role = m.title || (m.title.toLowerCase().includes("discurso") ? "Discurso (Maestros)" : "Demostración (Maestros)");
                checkAndAdd(role, m.main, "Principal", `maestros.${i}.main`);
                checkAndAdd(role, m.aux2, "Sala 2", `maestros.${i}.aux2`);
                checkAndAdd(role, m.aux3, "Sala 3", `maestros.${i}.aux3`);
            });
            (data.vidaCristiana || []).forEach((vc: any, i: number) => {
                if (vc.hasOwnProperty("conductor")) checkAndAdd("Libro de Congregación", vc.conductor, "Principal", `vidaCristiana.${i}.conductor`);
                if (vc.lector) checkAndAdd("Lector del Libro", vc.lector, "Principal", `vidaCristiana.${i}.lector`);
                if (vc.hasOwnProperty("discursante")) {
                    const role = vc.titulo || (vc.titulo?.toLowerCase().includes('necesidades') ? "Necesidades de Cong." : "Discurso Vida Cr.");
                    checkAndAdd(role, vc.discursante, "Principal", `vidaCristiana.${i}.discursante`);
                }
            });
        });
        
        collectedAssignments.sort((a,b) => a.weekId.localeCompare(b.weekId));
        setAssignments(collectedAssignments);
    }, [participant]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data, error } = await supabase.from("programas").select("week_id, data").order("week_id");
            if (error || !data) {
                console.error("Error fetching assignments for participant", error);
            } else {
                parseAssignments(data);
            }
            setLoading(false);
        };
        fetchData();
    }, [parseAssignments]);

    const handleStatusChange = (assignmentId: string, newStatus: 'accepted' | 'rejected') => {
        setStatuses(prev => ({ ...prev, [assignmentId]: newStatus }));
    };

    const handleSaveChanges = async () => {
        setSaveStatus({ message: 'Guardando...', type: 'loading' });
        const updatesByWeek: Record<string, any> = {};

        for (const assignmentId of Object.keys(statuses)) {
            const assignment = assignments.find(a => a.id === assignmentId);
            if (!assignment) continue;
            
            const { weekId, statusPath } = assignment;
            if (!updatesByWeek[weekId]) {
                const { data: program, error } = await supabase.from('programas').select('data').eq('week_id', weekId).single();
                if (error || !program) {
                    setSaveStatus({ message: `Error al obtener datos para la semana ${weekId}.`, type: 'error' });
                    return;
                }
                updatesByWeek[weekId] = JSON.parse(JSON.stringify(program.data));
            }
            
            const newStatusValue = statuses[assignmentId];
            let statusObj = getDeepValue(updatesByWeek[weekId], statusPath) || {};
            statusObj[participant] = newStatusValue;
            setDeepValue(updatesByWeek[weekId], statusPath, statusObj);
        }
      
        const updatePromises = Object.keys(updatesByWeek).map(weekId => 
            supabase.from('programas').update({ data: updatesByWeek[weekId] }).eq('week_id', weekId)
        );

        try {
            const results = await Promise.all(updatePromises);
            const dbError = results.find(res => res.error);
            if (dbError) throw dbError.error;

            setSaveStatus({ message: '¡Respuestas guardadas con éxito!', type: 'success' });
            setStatuses({});
            // Refetch assignments to show updated status
            const { data, error } = await supabase.from("programas").select("week_id, data").order("week_id");
            if (!error && data) {
                 parseAssignments(data);
            }
        } catch(err: any) {
            setSaveStatus({ message: `Error al guardar: ${err.message}`, type: 'error' });
        }
    };
    
    return (
        <div className="accept-assignments-container">
            <style>{`
                .accept-assignments-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                    padding-bottom: 100px; /* Space for fixed footer */
                }
                .accept-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .accept-header h1 {
                    font-size: 1.2rem;
                    color: var(--text-color-light);
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 700;
                }
                .accept-header h2 {
                    font-size: 2.2rem;
                    color: var(--primary-color);
                    margin: 5px 0 0;
                    font-weight: 900;
                }
                
                /* Horizontal Scroll Slider Styles */
                .assignments-list {
                    display: flex;
                    gap: 20px;
                    overflow-x: auto;
                    padding: 10px 5px 25px 5px;
                    scroll-snap-type: x mandatory;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: thin;
                }
                
                .assignments-list::-webkit-scrollbar {
                    height: 8px;
                }
                .assignments-list::-webkit-scrollbar-track {
                    background: var(--bg-color);
                    border-radius: 4px;
                }
                .assignments-list::-webkit-scrollbar-thumb {
                    background: var(--border-color);
                    border-radius: 4px;
                }
                .assignments-list::-webkit-scrollbar-thumb:hover {
                    background: var(--text-color-light);
                }

                .assignment-card-public {
                    flex: 0 0 320px; /* Fixed width for desktop */
                    scroll-snap-align: center;
                    background-color: var(--card-bg-color);
                    border-radius: 16px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                .assignment-card-public:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
                    border-color: var(--primary-color);
                }

                /* Mobile Adjustment */
                @media (max-width: 640px) {
                    .assignment-card-public {
                        flex: 0 0 85%; /* Hint at next card */
                        min-width: 280px;
                    }
                }

                .assignment-card-public__header {
                    padding: 15px 20px;
                    background-color: var(--bg-color);
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .assignment-card-public__date {
                    font-weight: 800;
                    color: var(--text-color);
                    font-size: 0.9rem;
                    text-transform: uppercase;
                }
                .assignment-card-public__status {
                    font-size: 0.7rem;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                /* Use opacity or variables for adaptable colors */
                .status-badge--pending { 
                    background-color: var(--light-gray); 
                    color: var(--text-color-light); 
                }
                .status-badge--accepted { 
                    background-color: rgba(34, 197, 94, 0.15); 
                    color: var(--positive-color); 
                }
                .status-badge--rejected { 
                    background-color: rgba(239, 68, 68, 0.15); 
                    color: var(--destructive-color); 
                }

                .assignment-card-public__body {
                    padding: 20px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .assignment-card-public__role {
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: var(--text-color);
                    margin-bottom: 10px;
                    line-height: 1.2;
                }
                .assignment-card-public__details {
                    color: var(--text-color); /* Ensure visible text */
                    font-size: 0.95rem;
                    background-color: var(--bg-color);
                    padding: 8px 12px;
                    border-radius: 8px;
                    display: inline-block;
                    align-self: flex-start;
                    border: 1px solid var(--primary-color); /* Add visible border as requested */
                    opacity: 0.9;
                }

                .assignment-card-public__actions {
                    padding: 15px 20px;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    gap: 10px;
                    background-color: var(--card-bg-color);
                }
                .action-btn {
                    flex: 1;
                    padding: 10px;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                    border: 1px solid transparent;
                }
                
                .accept-btn {
                    background-color: rgba(34, 197, 94, 0.1);
                    color: var(--positive-color);
                    border: 1px solid transparent;
                }
                .accept-btn:hover { 
                    background-color: rgba(34, 197, 94, 0.2); 
                }
                .accept-btn.selected { 
                    background-color: var(--positive-color);
                    color: white; 
                    box-shadow: 0 4px 6px -1px rgba(22, 101, 52, 0.3);
                }

                .reject-btn {
                    background-color: rgba(239, 68, 68, 0.1);
                    color: var(--destructive-color);
                    border: 1px solid transparent;
                }
                .reject-btn:hover { 
                    background-color: rgba(239, 68, 68, 0.2);
                }
                .reject-btn.selected { 
                    background-color: var(--destructive-color); 
                    color: white; 
                    box-shadow: 0 4px 6px -1px rgba(185, 28, 28, 0.3);
                }

                .accept-footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background-color: var(--card-bg-color);
                    padding: 15px 20px;
                    box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 20px;
                    z-index: 45;
                    border-top: 1px solid var(--border-color);
                }
                .save-status-message { font-weight: 600; font-size: 0.9rem; }
                .save-status-message.type--success { color: var(--positive-color); }
                .save-status-message.type--error { color: var(--destructive-color); }
                
                .save-all-btn {
                    background-color: var(--primary-color);
                    color: white;
                    padding: 12px 30px;
                    border-radius: 30px;
                    font-weight: 700;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    transition: all 0.2s;
                    font-size: 1rem;
                }
                .save-all-btn:hover { 
                    background-color: var(--primary-color-hover);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
                }
                .save-all-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
                
                .no-assignments-message {
                    text-align: center;
                    padding: 40px;
                    background-color: var(--bg-color);
                    border-radius: 16px;
                    color: var(--text-color-light);
                    font-size: 1.1rem;
                    border: 2px dashed var(--border-color);
                }
            `}</style>

            <header className="accept-header">
                <h1>Asignaciones para</h1>
                <h2>{participant}</h2>
            </header>
            
            {loading && <div style={{textAlign:'center', padding:'40px', color:'var(--text-color-light)'}}>Cargando asignaciones...</div>}

            {!loading && assignments.length === 0 && (
                <p className="no-assignments-message">No tienes asignaciones futuras pendientes.</p>
            )}
            
            {!loading && assignments.length > 0 && (
                <div className="assignments-list">
                    {assignments.map(assign => {
                        const userResponse = statuses[assign.id];
                        const finalStatus = userResponse || assign.currentStatus;
                        
                        return (
                            <div key={assign.id} className={`assignment-card-public`}>
                                <div className="assignment-card-public__header">
                                    <div className="assignment-card-public__date">{assign.date}</div>
                                    <div className={`assignment-card-public__status status-badge--${finalStatus}`}>
                                        {finalStatus === 'accepted' ? 'Aceptada' : (finalStatus === 'rejected' ? 'Rechazada' : 'Pendiente')}
                                    </div>
                                </div>
                                <div className="assignment-card-public__body">
                                    <div className="assignment-card-public__role">{assign.role}</div>
                                    <div className="assignment-card-public__details">
                                        <i className="fas fa-map-marker-alt mr-1"></i> {assign.room}
                                        {assign.subRole && ` • ${assign.subRole === 'E' ? 'Encargado' : 'Ayudante'}`}
                                    </div>
                                </div>
                                <div className="assignment-card-public__actions">
                                    <button 
                                        onClick={() => handleStatusChange(assign.id, 'accepted')} 
                                        className={`action-btn accept-btn ${userResponse === 'accepted' ? 'selected' : ''}`}
                                    >
                                        <i className="fas fa-check"></i> Aceptar
                                    </button>
                                    <button 
                                        onClick={() => handleStatusChange(assign.id, 'rejected')}
                                        className={`action-btn reject-btn ${userResponse === 'rejected' ? 'selected' : ''}`}
                                    >
                                        <i className="fas fa-times"></i> Rechazar
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            
            {Object.keys(statuses).length > 0 && (
                <footer className="accept-footer">
                    {saveStatus && <div className={`save-status-message type--${saveStatus.type}`}>{saveStatus.message}</div>}
                    <button onClick={handleSaveChanges} className="save-all-btn" disabled={saveStatus?.type === 'loading'}>
                        {saveStatus?.type === 'loading' ? <><i className="fas fa-spinner fa-spin mr-2"></i> Guardando...</> : 'Guardar Respuestas'}
                    </button>
                </footer>
            )}
        </div>
    );
};

export default AcceptAssignments;
