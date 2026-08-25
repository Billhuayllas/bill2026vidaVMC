import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getFridayFromWeekId } from '../lib/utils';

type SyntheticEvent = {
    id: string;
    event_type: 'assignment_accepted' | 'assignment_rejected';
    details: {
        participant_name: string;
        role: string;
        week_id: string;
    };
};

const getDeepValue = (obj: any, path: string) => {
    if (!path) return undefined;
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
};

const EventIcon: React.FC<{ type: SyntheticEvent['event_type'] }> = ({ type }) => {
    switch (type) {
        case 'assignment_accepted':
            return <i className="fas fa-check-circle event-icon accepted"></i>;
        case 'assignment_rejected':
            return <i className="fas fa-times-circle event-icon rejected"></i>;
        default:
            return <i className="fas fa-info-circle event-icon"></i>;
    }
};

const EventDescription: React.FC<{ event: SyntheticEvent }> = ({ event }) => {
    const { event_type, details } = event;
    const weekDate = details.week_id ? getFridayFromWeekId(details.week_id, 'long') : 'una fecha desconocida';

    switch (event_type) {
        case 'assignment_accepted':
            return (
                <p>
                    <strong>{details.participant_name}</strong> aceptó la asignación de <strong>{details.role}</strong> para la semana del <strong>{weekDate}</strong>.
                </p>
            );
        case 'assignment_rejected':
            return (
                <p>
                    <strong>{details.participant_name}</strong> rechazó la asignación de <strong>{details.role}</strong> para la semana del <strong>{weekDate}</strong>.
                </p>
            );
        default:
            return <p>Evento desconocido.</p>;
    }
};

const HistorialEventos: React.FC = () => {
    const [events, setEvents] = useState<SyntheticEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndProcessStatuses = async () => {
            setLoading(true);
            setError(null);

            const { data: programs, error: dbError } = await supabase
                .from('programas')
                .select('week_id, data')
                .order('week_id', { ascending: false });

            if (dbError) {
                console.error('Error fetching programs for history:', dbError);
                setError("No se pudo cargar el historial de respuestas. Es posible que la base de datos no esté configurada correctamente.");
                setLoading(false);
                return;
            }

            if (!programs) {
                setEvents([]);
                setLoading(false);
                return;
            }

            const collectedEvents: SyntheticEvent[] = [];

            for (const prog of programs) {
                const { week_id, data } = prog;
                if (!data) continue;

                const extractStatuses = (assignmentStr: string | null | undefined, role: string, jsonPath: string) => {
                    if (!assignmentStr) return;
                    const statusPath = jsonPath + '_status';
                    const statusObj = getDeepValue(data, statusPath);
                    if (statusObj && typeof statusObj === 'object') {
                        for (const participantName in statusObj) {
                            const status = statusObj[participantName];
                            if (status === 'accepted' || status === 'rejected') {
                                collectedEvents.push({
                                    id: `${week_id}-${jsonPath}-${participantName}`,
                                    event_type: status === 'accepted' ? 'assignment_accepted' : 'assignment_rejected',
                                    details: {
                                        participant_name: participantName,
                                        role: role,
                                        week_id: week_id,
                                    }
                                });
                            }
                        }
                    }
                };
                
                extractStatuses(data.presidentes?.principal, "Presidente", "presidentes.principal");
                extractStatuses(data.presidentes?.aux2, "Consejero", "presidentes.aux2");
                extractStatuses(data.presidentes?.aux3, "Consejero", "presidentes.aux3");
                extractStatuses(data.oracion?.inicio, "Oración Inicio", "oracion.inicio");
                extractStatuses(data.oracion?.final, "Oración Final", "oracion.final");
                if (data.tesoros) {
                    extractStatuses(data.tesoros.p1?.main, data.tesoros.p1?.title || "Discurso (Tesoros)", "tesoros.p1.main");
                    extractStatuses(data.tesoros.p2?.main, data.tesoros.p2?.title || "Perlas Escondidas", "tesoros.p2.main");
                    if (data.tesoros.p3) {
                        extractStatuses(data.tesoros.p3.main, "Lectura de la Biblia", "tesoros.p3.main");
                        extractStatuses(data.tesoros.p3.aux2, "Lectura de la Biblia", "tesoros.p3.aux2");
                        extractStatuses(data.tesoros.p3.aux3, "Lectura de la Biblia", "tesoros.p3.aux3");
                    }
                }
                (data.maestros || []).forEach((m: any, i: number) => {
                    const role = m.title || "Asignación de Seamos Mejores Maestros";
                    extractStatuses(m.main, role, `maestros.${i}.main`);
                    extractStatuses(m.aux2, role, `maestros.${i}.aux2`);
                    extractStatuses(m.aux3, role, `maestros.${i}.aux3`);
                });
                (data.vidaCristiana || []).forEach((vc: any, i: number) => {
                    if (vc.hasOwnProperty("conductor")) extractStatuses(vc.conductor, "Libro de Congregación", `vidaCristiana.${i}.conductor`);
                    if (vc.lector) extractStatuses(vc.lector, "Lector del Libro", `vidaCristiana.${i}.lector`);
                    if (vc.hasOwnProperty("discursante")) {
                        const role = vc.titulo || (vc.titulo?.toLowerCase().includes('necesidades') ? "Necesidades de Cong." : "Discurso Vida Cr.");
                        extractStatuses(vc.discursante, role, `vidaCristiana.${i}.discursante`);
                    }
                });
            }

            setEvents(collectedEvents);
            setLoading(false);
        };

        fetchAndProcessStatuses();
    }, []);
    
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="page-title">Respuestas de Asignaciones</h1>
            {loading && <p>Cargando respuestas...</p>}
            {error && (
                <p style={{ color: 'var(--error-text)', backgroundColor: 'var(--error-bg)', padding: '1rem', borderRadius: '8px' }}>
                    {error}
                </p>
            )}
            {!loading && !error && events.length === 0 && (
                <p>Aún no hay respuestas de asignaciones registradas en los programas.</p>
            )}
            {!loading && !error && events.length > 0 && (
                <div className="history-feed">
                    {events.map(event => (
                        <div key={event.id} className={`history-event-card type-${event.event_type.split('_')[1]}`}>
                            <div className="history-event__icon">
                                <EventIcon type={event.event_type} />
                            </div>
                            <div className="history-event__content">
                                <div className="history-event__description">
                                    <EventDescription event={event} />
                                </div>
                                <div className="history-event__timestamp">
                                    Asignación para el {getFridayFromWeekId(event.details.week_id, 'long')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistorialEventos;