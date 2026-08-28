
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCongregation } from '../lib/CongregationContext';
import { useProgramData } from '../lib/useProgramData';
import { handleOpenPrintPreview } from './programa/printUtils';
import { 
    Calendar, 
    Printer, 
    BookOpen, 
    Users, 
    BarChart3, 
    Clock, 
    Sparkles, 
    ArrowRight, 
    CheckCircle2, 
    Bell, 
    ShieldCheck, 
    Layers,
    CalendarCheck2,
    Flame,
    Smartphone,
    Download
} from 'lucide-react';

interface InicioProps {
    accessLabel: string | null;
    onNavigate?: (tab: string) => void;
    onOpenInstallModal?: () => void;
    isInstalled?: boolean;
}

type Reminder = {
    id: string;
    event_date: string;
    title: string;
    description: string;
    target_group: string | null;
};

const Inicio: React.FC<InicioProps> = ({ accessLabel, onNavigate, onOpenInstallModal, isInstalled }) => {
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
                        generalList.push(r);
                    } else if (isForMyGroup) {
                        if (r.event_date >= mondayStr && r.event_date <= sundayStr) {
                            weekList.push(r);
                        } else {
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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    };

    const todayFormatted = new Intl.DateTimeFormat('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    }).format(new Date());

    const welcomeTitle = accessLabel ? `${getGreeting()}, ${accessLabel}` : `${getGreeting()}, Administrador`;

    const quickModules = [
        {
            title: 'Vida y Ministerio',
            desc: 'Programa semanal, asignaciones y gestión de participantes.',
            icon: BookOpen,
            tab: 'Programa',
            color: 'from-blue-600 to-indigo-600',
            badge: 'Reunión Semanal'
        },
        {
            title: 'Informes de Predicación',
            desc: 'Gestión de grupos, registro mensual y lista de publicadores.',
            icon: Users,
            tab: 'Grupo de Congregación',
            color: 'from-amber-500 to-orange-600',
            badge: 'Servicio'
        },
        {
            title: 'Control de Asistencia',
            desc: 'Registro de asistencia semanal y estadísticas por reunión.',
            icon: BarChart3,
            tab: 'Asistencia',
            color: 'from-emerald-500 to-teal-600',
            badge: 'Métricas'
        },
        {
            title: 'Planificador & Roles',
            desc: 'Planificación de asignaciones para ancianos y siervos.',
            icon: CalendarCheck2,
            tab: 'Planificador',
            color: 'from-purple-600 to-violet-700',
            badge: 'Organización'
        }
    ];

    return (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in">
            
            {/* HERO DASHBOARD BANNER */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white shadow-xl p-6 sm:p-8 md:p-10 border border-white/10">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide text-blue-100 border border-white/10">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                            <span className="capitalize">{todayFormatted}</span>
                        </div>
                        
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
                            {welcomeTitle}
                        </h1>
                        
                        <p className="text-sm sm:text-base text-blue-100/90 font-medium max-w-xl flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                            {currentCongregation ? currentCongregation.name : 'Panel de Control Teocrático'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {onOpenInstallModal && !isInstalled && (
                            <button
                                onClick={onOpenInstallModal}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold shadow-md hover:shadow-lg shadow-emerald-500/25 transition-all duration-200 cursor-pointer active:scale-95"
                                title="Descargar / Instalar en tu teléfono"
                            >
                                <Smartphone className="w-4 h-4" />
                                <span>Descargar App Móvil</span>
                            </button>
                        )}
                        {onNavigate && (
                            <button
                                onClick={() => onNavigate('Programa')}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-blue-50 text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
                            >
                                <BookOpen className="w-4 h-4 text-blue-600" />
                                <span>Ver Programa</span>
                            </button>
                        )}
                        {targetProgram && (
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md text-sm font-bold border border-white/20 transition-all duration-200 cursor-pointer active:scale-95"
                            >
                                <Printer className="w-4 h-4 text-white" />
                                <span>Imprimir</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* PROMOTIONAL APP INSTALL BANNER - ONLY WHEN NOT INSTALLED */}
            {onOpenInstallModal && !isInstalled && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-teal-600/10 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-teal-900/30 border border-blue-200/80 dark:border-blue-800/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                                    Disponible para Celulares
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Android y iPhone</span>
                            </div>
                            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                                Instala la aplicación en tu teléfono
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-xl">
                                Accede en pantalla completa, más rápido y disponible sin conexión. Sin necesidad de descargar archivos pesados.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onOpenInstallModal}
                        className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                    >
                        <Download className="w-4 h-4" />
                        <span>Instalar en mi Celular</span>
                    </button>
                </div>
            )}

            {/* KPI STATS ROW */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Programa Activo</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate">
                        {targetProgram ? `Semana ${targetProgram.week_id}` : 'Al día'}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3" /> Disponible para impresión
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Asignaciones</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 font-black text-slate-800 dark:text-white text-xl sm:text-2xl">
                        {weeklyTasks.length}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Programadas esta semana
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avisos & Eventos</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Bell className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 font-black text-slate-800 dark:text-white text-xl sm:text-2xl">
                        {generalEvents.length}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Próximas actividades
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Seguridad & Red</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate">
                        {accessLabel ? accessLabel : 'Super Admin'}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Base de datos en línea
                    </div>
                </div>
            </div>

            {/* SECCIÓN PRINCIPAL: PROGRAMA HERO CARD */}
            {targetProgram && (
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-2 border-blue-500/20 dark:border-blue-400/20 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500"></div>
                    
                    <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
                                    <Calendar className="w-3.5 h-3.5" /> Programa de la Semana Actual
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                                    Semana {targetProgram.week_id}
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                {targetProgram.data?.titulo || `Semana del ${targetProgram.week_id}`}
                            </h2>

                            {targetProgram.data?.lecturaBiblica && (
                                <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    <span>Lectura bíblica: {targetProgram.data.lecturaBiblica}</span>
                                </div>
                            )}

                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                                Consulta la asignación de partes, salas auxiliares, discursos, tesoros y vida cristiana para la reunión de esta semana.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                            {onNavigate && (
                                <button
                                    onClick={() => onNavigate('Programa')}
                                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-sm font-bold transition-all duration-200 cursor-pointer active:scale-95"
                                >
                                    <span>Ver Detalles</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                            
                            <button
                                onClick={handlePrint}
                                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md hover:shadow-lg shadow-blue-500/20 transition-all duration-200 cursor-pointer active:scale-95"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Imprimir / PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN DE ACCESOS RÁPIDOS (DASHBOARD GRID) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span>Módulos de Gestión</span>
                    </h2>
                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">Selecciona una sección para acceder</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickModules.map((mod, idx) => {
                        const IconComp = mod.icon;
                        return (
                            <div
                                key={idx}
                                onClick={() => onNavigate && onNavigate(mod.tab)}
                                className="group relative overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.color} text-white flex items-center justify-center shadow-md shadow-blue-500/10 group-hover:scale-110 transition-transform`}>
                                            <IconComp className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                            {mod.badge}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {mod.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {mod.desc}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                                    <span>Acceder</span>
                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* SECCIÓN DE TAREAS Y ASIGNACIONES */}
            {loading ? (
                <div className="text-center py-12 text-slate-400">
                    <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    <p className="mt-2 text-sm">Cargando datos del panel...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* TAREAS DE LA SEMANA */}
                    {weeklyTasks.length > 0 && (
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                                <h2 className="text-lg sm:text-xl font-extrabold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-blue-600" />
                                    <span>Asignaciones de esta Semana</span>
                                </h2>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                    {weeklyTasks.length} pendiente{weeklyTasks.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {weeklyTasks.map(r => {
                                    const { dayName, dayNum, monthName } = formatDate(r.event_date);
                                    return (
                                        <div 
                                            key={r.id}
                                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border-l-4 border-blue-600 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
                                        >
                                            <div>
                                                <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                                                    {dayName}, {dayNum} de {monthName}
                                                </div>
                                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                                    {r.title}
                                                </h3>
                                                {r.description && (
                                                    <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                                        {r.description}
                                                    </p>
                                                )}
                                            </div>

                                            {!accessLabel && r.target_group && (
                                                <div className="self-start mt-2 text-[10px] font-bold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                                    Grupo: {r.target_group}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ANUNCIOS Y EVENTOS GENERALES */}
                    {generalEvents.length > 0 && (
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                                <h2 className="text-lg sm:text-xl font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-amber-500" />
                                    <span>Anuncios y Próximos Eventos</span>
                                </h2>
                                <span className="text-xs font-semibold text-slate-500">
                                    {generalEvents.length} programado{generalEvents.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {generalEvents.map(r => {
                                    const { dayName, dayNum, monthName } = formatDate(r.event_date);
                                    const isGlobal = !r.target_group;
                                    
                                    return (
                                        <div 
                                            key={r.id}
                                            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all flex flex-col"
                                        >
                                            <div className={`px-4 py-2.5 text-white text-xs font-bold flex items-center justify-between ${isGlobal ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-slate-700'}`}>
                                                <span className="capitalize">{dayNum} de {monthName} ({dayName})</span>
                                                {isGlobal && (
                                                    <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded font-extrabold tracking-wider">GLOBAL</span>
                                                )}
                                            </div>

                                            <div className="p-4 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                                        {r.title}
                                                    </h3>
                                                    {r.description && (
                                                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                                                            {r.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {!isGlobal && !accessLabel && r.target_group && (
                                                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 font-medium">
                                                        Grupo asignado: <span className="font-bold text-slate-700 dark:text-slate-300">{r.target_group}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Inicio;

