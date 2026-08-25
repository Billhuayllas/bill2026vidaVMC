
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getFridayFromWeekId } from '../lib/utils';
import { useCongregation } from '../lib/CongregationContext';

declare const html2pdf: any;

type AssignmentStatus = 'pending' | 'accepted' | 'rejected';
type Assignment = { date: string; room: string; subRole: string | null; status: AssignmentStatus; partner: string | null; };
type PersonAssignment = { date: string; room: string; subRole: string | null; role: string; status: AssignmentStatus; partner: string | null; };
type AssignmentsByRole = { [role: string]: { [person: string]: Assignment[] } };
type AssignmentsByPerson = { [person: string]: PersonAssignment[] };

const getDeepValue = (obj: any, path: string) => {
    if (!path) return undefined;
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
}

const FiltrosAvanzados: React.FC = () => {
    const { currentCongregation } = useCongregation();
    const [assignmentsByRole, setAssignmentsByRole] = useState<AssignmentsByRole>({});
    const [assignmentsByPerson, setAssignmentsByPerson] = useState<AssignmentsByPerson>({});
    const [allParticipants, setAllParticipants] = useState<string[]>([]);
    
    // Search State
    const [searchTerm, setSearchTerm] = useState<string>('');

    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    // Calculate current week Monday for filtering
    const currentWeekStart = useMemo(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
        const monday = new Date(now.setDate(diff));
        return monday.toISOString().split('T')[0];
    }, []);

    useEffect(() => {
        const fetchAndProcessData = async () => {
            if (!currentCongregation) return;
            setLoading(true);
            
            const { data: programs, error } = await supabase
                .from("programas")
                .select("week_id, data")
                .eq('congregation_id', currentCongregation.id)
                .order("week_id", { ascending: false });
                
            const { data: publishers } = await supabase
                .from("publicadores")
                .select("nombre")
                .eq('congregation_id', currentCongregation.id);
            
            if (error || !programs) {
                console.error("Error fetching programs", error);
                setLoading(false);
                return;
            }

            const collectedAssignmentsByRole: AssignmentsByRole = {};
            const addAssignment = (role: string, person: string | null | undefined, week_id: string, room: string, jsonPath: string, programData: any) => {
                if (!person || !person.trim()) return;
                const people = person.split("/").map(p => p.trim()).filter(Boolean);
                
                people.forEach((p, index) => {
                    const subRole = people.length > 1 ? (index === 0 ? "E" : "A") : null;
                    const partner = people.length > 1 ? people[1 - index] : null;

                    let status: AssignmentStatus = 'pending';
                    const statusPath = jsonPath + '_status';
                    const statusObj = getDeepValue(programData, statusPath);
                    if (statusObj && statusObj[p]) {
                        status = statusObj[p];
                    }

                    if (!collectedAssignmentsByRole[role]) collectedAssignmentsByRole[role] = {};
                    if (!collectedAssignmentsByRole[role][p]) collectedAssignmentsByRole[role][p] = [];
                    if (!collectedAssignmentsByRole[role][p].some(a => a.date === week_id && a.room === room)) {
                        collectedAssignmentsByRole[role][p].push({ date: week_id, room, subRole, status, partner });
                    }
                });
            };

            programs.forEach(prog => {
                const { week_id, data } = prog;
                if (!data) return;

                addAssignment("Presidente", data.presidentes?.principal, week_id, "main", "presidentes.principal", data);
                addAssignment("Consejero", data.presidentes?.aux2, week_id, "aux2", "presidentes.aux2", data);
                addAssignment("Consejero", data.presidentes?.aux3, week_id, "aux3", "presidentes.aux3", data);
                addAssignment("Oración Inicio", data.oracion?.inicio, week_id, "main", "oracion.inicio", data);
                addAssignment("Oración Final", data.oracion?.final, week_id, "main", "oracion.final", data);
                addAssignment("Discurso (Tesoros)", data.tesoros?.p1?.main, week_id, "main", "tesoros.p1.main", data);
                addAssignment("Perlas Escondidas", data.tesoros?.p2?.main, week_id, "main", "tesoros.p2.main", data);
                addAssignment("Lectura de la Biblia", data.tesoros?.p3?.main, week_id, "main", "tesoros.p3.main", data);
                addAssignment("Lectura de la Biblia", data.tesoros?.p3?.aux2, week_id, "aux2", "tesoros.p3.aux2", data);
                addAssignment("Lectura de la Biblia", data.tesoros?.p3?.aux3, week_id, "aux3", "tesoros.p3.aux3", data);
                (data.maestros || []).forEach((m: any, i: number) => {
                    const role = (m.title || '').toLowerCase().includes("discurso") ? "Discurso (Maestros)" : "Demostración (Maestros)";
                    addAssignment(role, m.main, week_id, "main", `maestros.${i}.main`, data);
                    addAssignment(role, m.aux2, week_id, "aux2", `maestros.${i}.aux2`, data);
                    addAssignment(role, m.aux3, week_id, "aux3", `maestros.${i}.aux3`, data);
                });
                (data.vidaCristiana || []).forEach((vc: any, i: number) => {
                    if (vc.hasOwnProperty("conductor")) {
                        addAssignment("Libro de Congregación", vc.conductor, week_id, "main", `vidaCristiana.${i}.conductor`, data);
                        if (vc.lector) {
                            addAssignment("Lector del Libro", vc.lector, week_id, "main", `vidaCristiana.${i}.lector`, data);
                        }
                    }
                    if (vc.hasOwnProperty("discursante")) {
                        if ((vc.titulo || '').toLowerCase().includes('necesidades')) {
                            addAssignment("Necesidades de Cong.", vc.discursante, week_id, "main", `vidaCristiana.${i}.discursante`, data);
                        } else {
                            addAssignment("Discurso Vida Cr.", vc.discursante, week_id, "main", `vidaCristiana.${i}.discursante`, data);
                        }
                    }
                });
            });
            
            setAssignmentsByRole(collectedAssignmentsByRole);

            const collectedAssignmentsByPerson: AssignmentsByPerson = {};
            Object.entries(collectedAssignmentsByRole).forEach(([role, persons]) => {
                Object.entries(persons).forEach(([personName, assignments]) => {
                    if (!collectedAssignmentsByPerson[personName]) {
                        collectedAssignmentsByPerson[personName] = [];
                    }
                    assignments.forEach(assignment => {
                        collectedAssignmentsByPerson[personName].push({ ...assignment, role });
                    });
                });
            });
            Object.values(collectedAssignmentsByPerson).forEach(assignments => {
                assignments.sort((a, b) => a.date.localeCompare(b.date));
            });
            setAssignmentsByPerson(collectedAssignmentsByPerson);

            const publisherNames = publishers ? publishers.map(p => p.nombre) : [];
            const assignmentNames = Object.keys(collectedAssignmentsByPerson);
            const allNames = [...new Set([...publisherNames, ...assignmentNames])].sort();
            setAllParticipants(allNames);
            
            setLoading(false);
        };

        fetchAndProcessData();
    }, [currentCongregation]);

    const handleDownloadPDF = () => {
        if (typeof html2pdf === 'undefined') {
            alert('La función de descarga no está disponible. Por favor, recargue la página.');
            return;
        }
        const element = document.getElementById('future-agenda-container');
        if (!element) return;
        setIsDownloading(true);
        const opt = { margin: 0.5, filename: 'agenda_futura_vmt.pdf', image: { type: 'jpeg', quality: 1.0 }, html2canvas: { scale: 5, useCORS: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
        html2pdf().from(element).set(opt).save().then(() => setIsDownloading(false)).catch(() => setIsDownloading(false));
    };

    const handleSendLink = async (participantName: string) => {
        const encodedName = encodeURIComponent(participantName);
        const url = `${window.location.origin}${window.location.pathname}?view=assignments&participant=${encodedName}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Tus Asignaciones VMT',
                    text: `Hola ${participantName}, por favor revisa y confirma tus asignaciones aquí:`,
                    url: url,
                });
            } else {
                await navigator.clipboard.writeText(url);
                alert('Enlace copiado al portapapeles.');
            }
        } catch (error) {
            console.error('Error al compartir el enlace:', error);
            alert('No se pudo compartir o copiar el enlace.');
        }
    };

    const StatusIcon: React.FC<{status: AssignmentStatus}> = ({ status }) => {
        switch (status) {
            case 'accepted': return <i className="fas fa-check-circle status-icon status-accepted" title="Aceptada" style={{color:'#10b981'}}></i>;
            case 'rejected': return <i className="fas fa-times-circle status-icon status-rejected" title="Rechazada" style={{color:'#ef4444'}}></i>;
            default: return <i className="fas fa-question-circle status-icon status-pending" title="Pendiente" style={{color:'#cbd5e1'}}></i>;
        }
    };

    const roomMapFull: { [key: string]: string } = { main: "Principal", aux2: "Sala 2", aux3: "Sala 3" };

    // --- LOGIC TO FILTER PARTICIPANTS WITH FUTURE ASSIGNMENTS ---
    const participantsWithFutureAssignments = useMemo(() => {
        return allParticipants
            .filter(person => {
                // Must match search term
                if (searchTerm && !person.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false;
                }
                // Must have at least one future assignment
                const assignments = assignmentsByPerson[person] || [];
                return assignments.some(a => a.date >= currentWeekStart);
            });
    }, [allParticipants, assignmentsByPerson, currentWeekStart, searchTerm]);

    // Helper component for future assignments agenda
    const FutureAssignmentList: React.FC<{ assignments: PersonAssignment[] }> = ({ assignments }) => {
        // Filter for future dates
        const futureAssignments = assignments.filter(a => a.date >= currentWeekStart);
        
        if (futureAssignments.length === 0) return null;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {futureAssignments.map((a, idx) => (
                    <div key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '10px 16px', 
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-bg-color)'
                    }}>
                        <div style={{ width: '60px', textAlign: 'center', marginRight: '15px' }}>
                            <div style={{ fontWeight: '800', fontSize: '0.85rem', color: 'var(--text-color)', lineHeight: 1.1 }}>{getFridayFromWeekId(a.date, 'short')}</div>
                            <div style={{ marginTop: '4px' }}><StatusIcon status={a.status} /></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-color)', fontSize: '0.95rem' }}>{a.role}</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                <span style={{ 
                                    fontSize: '0.75rem', 
                                    color: 'white', 
                                    padding: '2px 6px', 
                                    borderRadius: '4px',
                                    fontWeight: '700',
                                    backgroundColor: a.room === 'main' ? '#3b82f6' : (a.room === 'aux2' ? '#10b981' : '#f59e0b')
                                }}>
                                    {roomMapFull[a.room]}
                                </span>
                                {a.subRole && (
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        padding: '2px 6px', 
                                        borderRadius: '4px', 
                                        backgroundColor: 'var(--bg-color)', 
                                        border: '1px solid var(--border-color)',
                                        fontWeight: '600',
                                        color: 'var(--text-color-light)'
                                    }}>
                                        {a.subRole === 'E' ? 'Encargado' : 'Ayudante'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div id="filters-container" className="container mx-auto px-4 py-8">
            <h2 className="page-title">Agenda Futura</h2>
            <p style={{marginBottom: '20px', color: 'var(--text-color-light)'}}>
                Mostrando asignaciones desde la semana actual en adelante.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
                    <input 
                        type="text" 
                        placeholder="Buscar participante..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            paddingLeft: '40px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--input-bg)',
                            fontSize: '1rem'
                        }}
                    />
                    <i className="fas fa-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-color-light)' }}></i>
                </div>
                {participantsWithFutureAssignments.length > 0 && (
                    <button 
                        onClick={handleDownloadPDF} 
                        disabled={isDownloading}
                        className="button"
                        style={{ backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                    >
                        <i className={`fas ${isDownloading ? 'fa-spinner fa-spin' : 'fa-file-pdf'} mr-2`}></i> 
                        {isDownloading ? 'Generando...' : 'Descargar PDF'}
                    </button>
                )}
            </div>
            
            {loading ? (
                <div style={{textAlign:'center', padding:'40px', color:'var(--text-color-light)'}}>Cargando agenda...</div>
            ) : participantsWithFutureAssignments.length > 0 ? (
                <div id="future-agenda-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {participantsWithFutureAssignments.map(person => (
                        <div key={person} className="participant-card" style={{ backgroundColor: 'var(--card-bg-color)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                            <div className="participant-card__header" style={{ padding: '16px', backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="participant-name" style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-color)' }}>{person}</span>
                                <button className="participant-share-btn" onClick={() => handleSendLink(person)} style={{ background: 'white', border: '1px solid var(--border-color)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                                    <i className="fas fa-share-alt"></i>
                                </button>
                            </div>
                            <FutureAssignmentList assignments={assignmentsByPerson[person] || []} />
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--card-bg-color)', borderRadius: '12px', border: '2px dashed var(--border-color)' }}>
                    <i className="fas fa-calendar-check" style={{ fontSize: '2rem', color: 'var(--text-color-light)', marginBottom: '10px' }}></i>
                    <p style={{ color: 'var(--text-color-light)' }}>
                        {searchTerm ? 'No se encontraron participantes con ese nombre.' : 'No hay asignaciones futuras pendientes.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default FiltrosAvanzados;
