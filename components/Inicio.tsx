
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCongregation } from '../lib/CongregationContext';
import { useProgramData } from '../lib/useProgramData';
import { handleOpenPrintPreview } from './programa/printUtils';

interface InicioProps {
    accessLabel: string | null;
}

type Reminder = {
    id: string;
    event_date: string;
    title: string;
    description: string;
    target_group: string | null;
};

const Inicio: React.FC<InicioProps> = ({ accessLabel }) => {
    const { currentCongregation } = useCongregation();
    const [weeklyTasks, setWeeklyTasks] = useState<Reminder[]>([]);
    const [generalEvents, setGeneralEvents] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);

    const { programs, loading: loadingPrograms } = useProgramData();

    useEffect(() => {
        // Reset state immediately when congregation changes
        setWeeklyTasks([]);
        setGeneralEvents([]);
        
        const fetchReminders = async () => {
            if (!currentCongregation) return;
            
            setLoading(true);
            const today = new Date();
            // Normalizar today a string YYYY-MM-DD para comparaciones de BD
            const todayStr = today.toISOString().split('T')[0];

            // Calcular inicio (Lunes) y fin (Domingo) de la semana actual
            const currentDay = today.getDay(); // 0 dom, 1 lun...
            const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
            
            const mondayDate = new Date(today);
            mondayDate.setDate(today.getDate() + diffToMonday);
            mondayDate.setHours(0,0,0,0);
            const mondayStr = mondayDate.toISOString().split('T')[0];

            const sundayDate = new Date(mondayDate);
            sundayDate.setDate(mondayDate.getDate() + 6);
            sundayDate.setHours(23,59,59,999);
            const sundayStr = sundayDate.toISOString().split('T')[0];
            
            // Query: Traer todo lo futuro o de hoy FILTRADO POR CONGREGACION
            let query = supabase
                .from('reminders')
                .select('*')
                .eq('congregation_id', currentCongregation.id)
                .gte('event_date', todayStr) 
                .order('event_date', { ascending: true });

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching reminders:", error);
            } else if (data) {
                const weekList: Reminder[] = [];
                const generalList: Reminder[] = [];

                data.forEach(r => {
                    const isGlobal = !r.target_group; // Si es null, es para todos
                    const isForMyGroup = accessLabel ? r.target_group === accessLabel : true; // Si soy admin, veo todo
                    
                    // Lógica de separación
                    if (isGlobal) {
                        // Los globales siempre van abajo
                        generalList.push(r);
                    } else if (isForMyGroup) {
                        // Es para mi grupo (o soy admin)
                        // ¿Cae en esta semana?
                        if (r.event_date >= mondayStr && r.event_date <= sundayStr) {
                            weekList.push(r);
                        } else {
                            // Si es de mi grupo pero es futuro lejano, lo ponemos en generales/futuros
                            generalList.push(r);
                        }
                    }
                });

                setWeeklyTasks(weekList);
                setGeneralEvents(generalList);
            }
            setLoading(false);
        };

        fetchReminders();
    }, [accessLabel, currentCongregation]);

    const getMondayOfCurrentWeek = () => {
        const today = new Date();
        const currentDay = today.getDay();
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const mondayDate = new Date(today);
        mondayDate.setDate(today.getDate() + diffToMonday);
        
        const year = mondayDate.getFullYear();
        const month = String(mondayDate.getMonth() + 1).padStart(2, '0');
        const day = String(mondayDate.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    };

    const currentWeekId = getMondayOfCurrentWeek();
    
    // Find closest program if current week not found
    let targetProgram = programs.find(p => p.week_id === currentWeekId);
    if (!targetProgram && programs.length > 0) {
        const nowTime = new Date().getTime();
        targetProgram = programs.reduce((prev: any, curr: any) => 
            (Math.abs(new Date(curr.week_id).getTime() - nowTime) < Math.abs(new Date(prev.week_id).getTime() - nowTime) ? curr : prev)
        );
    }

    const handlePrint = () => {
        if (!targetProgram) return;
        const monthKey = targetProgram.week_id.substring(0, 7);
        const roomsConfig = currentCongregation?.settings?.enabled_rooms_per_month?.[monthKey] || currentCongregation?.settings?.enabled_rooms || { main: true, aux2: true, aux3: true };
        handleOpenPrintPreview(
            programs, 
            targetProgram.week_id, 
            targetProgram.week_id, 
            targetProgram.week_id, 
            targetProgram.data, 
            roomsConfig
        );
    };

    const formatDate = (dateStr: string) => {
        const dateObj = new Date(dateStr);
        const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(dateObj.getTime() + userTimezoneOffset);
        
        return {
            dayName: adjustedDate.toLocaleDateString('es-ES', { weekday: 'long' }),
            dayNum: adjustedDate.getDate(),
            monthName: adjustedDate.toLocaleDateString('es-ES', { month: 'long' })
        };
    };

    const welcomeTitle = accessLabel ? `Bienvenido ${accessLabel}` : "Bienvenido Administrador";

    return (
        <main className="mt-6 mx-auto max-w-5xl px-4 sm:mt-10 sm:px-6 md:mt-12 lg:mt-16 lg:px-8 xl:mt-20">
            <div className="text-center mb-10">
                {/* Removed text-gray-900 to ensure dark mode variable takes effect */}
                <h1 className="text-4xl tracking-tight font-extrabold sm:text-5xl md:text-6xl" style={{ color: 'var(--text-color)' }}>
                    <span className="block xl:inline">{welcomeTitle}</span>
                </h1>
                
                {/* Removed text-gray-500 to ensure dark mode variable takes effect */}
                <p className="mt-3 max-w-md mx-auto text-base sm:text-lg md:mt-5 md:text-xl md:max-w-3xl" style={{ color: 'var(--text-color-light)' }}>
                    {currentCongregation ? currentCongregation.name : 'Cargando congregación...'}
                </p>
            </div>

            {loading || loadingPrograms ? (
                <div style={{ textAlign: 'center', color: 'var(--text-color-light)', padding: '40px' }}>
                    <i className="fas fa-spinner fa-spin fa-2x"></i>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-10">
                    
                    {/* SECCIÓN 0: PROGRAMA DE LA SEMANA */}
                    {targetProgram && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 border-slate-900 dark:border-slate-700 overflow-hidden mb-8 transition-transform hover:scale-[1.01] animate-fade-in-up">
                            <div className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex-1 text-left">
                                    <span className="text-xs uppercase tracking-wider font-extrabold text-blue-600 dark:text-blue-400">
                                        <i className="fas fa-calendar-day mr-1"></i> Programa de la Semana Actual
                                    </span>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-1 leading-tight">
                                        {targetProgram.data?.titulo || `Semana del ${targetProgram.week_id}`}
                                    </h3>
                                </div>
                                
                                <div className="flex items-center gap-3 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                                    <button
                                        onClick={handlePrint}
                                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm cursor-pointer transition-colors"
                                    >
                                        <i className="fas fa-print text-xs"></i> Imprimir / PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* SECCIÓN 1: TAREAS DE ESTA SEMANA (ESPECÍFICAS) */}
                    {weeklyTasks.length > 0 && (
                        <div className="animate-fade-in-up">
                            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e40af', marginBottom: '15px', display:'flex', alignItems:'center', gap:'10px' }}>
                                <i className="fas fa-calendar-week text-blue-600"></i> Asignaciones de esta Semana
                            </h2>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                {weeklyTasks.map(r => {
                                    const { dayName, dayNum, monthName } = formatDate(r.event_date);
                                    return (
                                        <div key={r.id} style={{ 
                                            background: 'linear-gradient(to right, #eff6ff, #ffffff)', 
                                            borderLeft: '5px solid #2563eb', 
                                            borderRadius: '8px', 
                                            padding: '20px', 
                                            boxShadow: '0 4px 6px rgba(37, 99, 235, 0.1)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                        }}>
                                            <div style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: '#2563eb', fontWeight: '700', marginBottom: '5px' }}>
                                                {dayName}, {dayNum} de {monthName}
                                            </div>
                                            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#1e3a8a' }}>
                                                {r.title}
                                            </h3>
                                            {r.description && (
                                                <p style={{ margin: '8px 0 0 0', color: '#4b5563', fontSize: '1.1rem' }}>{r.description}</p>
                                            )}
                                            {!accessLabel && r.target_group && (
                                                <span style={{ marginTop: '10px', alignSelf: 'flex-start', fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px' }}>
                                                    Para: {r.target_group}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 2: ANUNCIOS GENERALES Y FUTUROS */}
                    {generalEvents.length > 0 && (
                        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#4b5563', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>
                                <i className="fas fa-bullhorn text-gray-500 mr-2"></i> Anuncios y Próximos Eventos
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {generalEvents.map(r => {
                                    const { dayName, dayNum, monthName } = formatDate(r.event_date);
                                    const isGlobal = !r.target_group;
                                    
                                    return (
                                        <div key={r.id} style={{ 
                                            backgroundColor: 'var(--card-bg-color)', 
                                            borderRadius: '12px', 
                                            overflow: 'hidden', 
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)', 
                                            border: '1px solid var(--border-color)', 
                                            display: 'flex', 
                                            flexDirection: 'column' 
                                        }}>
                                            <div style={{ 
                                                backgroundColor: isGlobal ? 'var(--secondary-color)' : '#64748b', 
                                                color: 'white', 
                                                padding: '8px 15px', 
                                                fontWeight: 'bold', 
                                                textTransform: 'capitalize', 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center',
                                                fontSize: '0.9rem'
                                            }}>
                                                <span>{dayNum} de {monthName}</span>
                                                {isGlobal && <span style={{ fontSize: '0.7rem', background:'rgba(0,0,0,0.2)', padding:'2px 6px', borderRadius:'4px' }}>GLOBAL</span>}
                                            </div>
                                            <div style={{ padding: '15px', flex: 1 }}>
                                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--text-color)', fontWeight: '700' }}>{r.title}</h3>
                                                {r.description && <p style={{ margin: 0, color: 'var(--text-color-light)', fontSize: '0.9rem', lineHeight: '1.4' }}>{r.description}</p>}
                                            </div>
                                            {!isGlobal && !accessLabel && r.target_group && (
                                                <div style={{ padding: '5px 15px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-color-light)', backgroundColor: 'var(--light-gray)' }}>
                                                    Grupo: {r.target_group}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {weeklyTasks.length === 0 && generalEvents.length === 0 && !targetProgram && (
                        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--light-gray)', borderRadius: '12px', margin: '0 auto', maxWidth: '600px' }}>
                            <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: 'var(--positive-color)', marginBottom: '15px' }}></i>
                            <p style={{ color: 'var(--text-color-light)', fontSize: '1.1rem' }}>No hay recordatorios pendientes por el momento.</p>
                        </div>
                    )}
                </div>
            )}

        </main>
    );
};

export default Inicio;
