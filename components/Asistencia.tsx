import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useCongregation } from '../lib/CongregationContext';
import { 
  Save, 
  Calendar, 
  Users, 
  Building, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  HelpCircle,
  FileSpreadsheet,
  Bell,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Volume2,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { 
  AttendanceAlarmConfig, 
  DEFAULT_ALARM_CONFIG, 
  getMonthWeeksInfo, 
  checkAttendanceAlarmStatus,
  playAttendanceAlarmSound,
  requestAppNotificationPermission,
  DAYS_OF_WEEK
} from '../lib/attendanceAlarmService';

interface AsistenciaProps {
    isReadOnly?: boolean;
    onNavigateToConfig?: () => void;
}

export interface MonthlyAttendance {
    weeks: {
        week1: { midweek: string; weekend: string; };
        week2: { midweek: string; weekend: string; };
        week3: { midweek: string; weekend: string; };
        week4: { midweek: string; weekend: string; };
        week5: { midweek: string; weekend: string; };
    }
}

const Asistencia: React.FC<AsistenciaProps> = ({ isReadOnly = false, onNavigateToConfig }) => {
    const { currentCongregation, refreshCongregations } = useCongregation();
    const currentDate = new Date();
    
    // Ensure month string format is like '2026-08'
    const [selectedMonthStr, setSelectedMonthStr] = useState<string>(
        `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`
    );
    
    const [attendanceData, setAttendanceData] = useState<MonthlyAttendance>({
        weeks: {
            week1: { midweek: '', weekend: '' },
            week2: { midweek: '', weekend: '' },
            week3: { midweek: '', weekend: '' },
            week4: { midweek: '', weekend: '' },
            week5: { midweek: '', weekend: '' },
        }
    });

    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string>('');
    const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');
    
    // Expanded state for cards (by default, completed weeks can be collapsed, pending remain expanded)
    const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});
    
    // Alarm settings modal state
    const [showAlarmModal, setShowAlarmModal] = useState(false);
    const [alarmConfig, setAlarmConfig] = useState<AttendanceAlarmConfig>(DEFAULT_ALARM_CONFIG);
    const [savingAlarms, setSavingAlarms] = useState(false);
    const [alarmSaveSuccess, setAlarmSaveSuccess] = useState(false);

    const MONTH_NAMES = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    // Load Congregation Attendance and Alarm Settings
    useEffect(() => {
        if (currentCongregation) {
            loadAttendanceData(selectedMonthStr);
            
            const settings = currentCongregation?.settings || {};
            if (settings.attendance_alarms) {
                setAlarmConfig({
                    ...DEFAULT_ALARM_CONFIG,
                    ...settings.attendance_alarms
                });
            }
        }
    }, [currentCongregation, selectedMonthStr]);

    const loadAttendanceData = (monthKey: string) => {
        const settings = currentCongregation?.settings || {};
        const allAttendance = settings.attendance || {};
        const monthData = allAttendance[monthKey] || {
            week1: { midweek: '', weekend: '' },
            week2: { midweek: '', weekend: '' },
            week3: { midweek: '', weekend: '' },
            week4: { midweek: '', weekend: '' },
            week5: { midweek: '', weekend: '' },
        };
        
        // Ensure 5 weeks exist
        const weeks = {
            week1: { midweek: '', weekend: '', ...monthData.week1 },
            week2: { midweek: '', weekend: '', ...monthData.week2 },
            week3: { midweek: '', weekend: '', ...monthData.week3 },
            week4: { midweek: '', weekend: '', ...monthData.week4 },
            week5: { midweek: '', weekend: '', ...monthData.week5 },
        };
        
        setAttendanceData({ weeks });
        setSaveStatus('');
    };

    // Calculate Week Details (dates, completion status, current week)
    const weeksInfo = useMemo(() => {
        return getMonthWeeksInfo(selectedMonthStr, attendanceData.weeks);
    }, [selectedMonthStr, attendanceData]);

    // Check alarm status for the congregation
    const alarmStatus = useMemo(() => {
        const settings = currentCongregation?.settings || {};
        return checkAttendanceAlarmStatus(alarmConfig, settings.attendance || {});
    }, [alarmConfig, currentCongregation]);

    // Handle Month Navigation
    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedMonthStr(e.target.value);
    };

    const handlePrevMonth = () => {
        if (!selectedMonthStr) return;
        const [year, month] = selectedMonthStr.split('-').map(Number);
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = year - 1;
        }
        setSelectedMonthStr(`${prevYear}-${prevMonth.toString().padStart(2, '0')}`);
    };

    const handleNextMonth = () => {
        if (!selectedMonthStr) return;
        const [year, month] = selectedMonthStr.split('-').map(Number);
        let nextMonth = month + 1;
        let nextYear = year;
        if (nextMonth === 13) {
            nextMonth = 1;
            nextYear = year + 1;
        }
        setSelectedMonthStr(`${nextYear}-${nextMonth.toString().padStart(2, '0')}`);
    };

    const handleInputChange = (week: keyof MonthlyAttendance['weeks'], type: 'midweek' | 'weekend', value: string) => {
        if (isReadOnly) return;
        // Allows only numbers
        if (value !== '' && !/^\d+$/.test(value)) return;
        
        setAttendanceData(prev => ({
            ...prev,
            weeks: {
                ...prev.weeks,
                [week]: {
                    ...prev.weeks[week],
                    [type]: value,
                }
            }
        }));
        setSaveStatus('con-cambios');
    };

    const toggleWeekExpansion = (weekKey: string) => {
        setExpandedWeeks(prev => ({
            ...prev,
            [weekKey]: prev[weekKey] === undefined ? true : !prev[weekKey]
        }));
    };

    const saveAttendance = async () => {
        if (!currentCongregation || isReadOnly) return;
        setLoading(true);
        setSaveStatus('guardando');

        const currentSettings = currentCongregation.settings || {};
        const allAttendance = currentSettings.attendance || {};
        
        const newSettings = {
            ...currentSettings,
            attendance: {
                ...allAttendance,
                [selectedMonthStr]: attendanceData.weeks
            }
        };

        const { error } = await supabase
            .from('congregations')
            .update({ settings: newSettings })
            .eq('id', currentCongregation.id);

        if (error) {
            console.error(error);
            setSaveStatus('error');
        } else {
            await refreshCongregations();
            setSaveStatus('guardado');
            setTimeout(() => setSaveStatus(''), 3000);
        }
        setLoading(false);
    };

    const saveAlarmSettings = async () => {
        if (!currentCongregation || isReadOnly) return;
        setSavingAlarms(true);
        const currentSettings = currentCongregation.settings || {};
        const newSettings = {
            ...currentSettings,
            attendance_alarms: alarmConfig
        };

        const { error } = await supabase
            .from('congregations')
            .update({ settings: newSettings })
            .eq('id', currentCongregation.id);

        if (!error) {
            await refreshCongregations();
            setAlarmSaveSuccess(true);
            setTimeout(() => {
                setAlarmSaveSuccess(false);
                setShowAlarmModal(false);
            }, 1500);
        }
        setSavingAlarms(false);
    };

    const calculateStats = (type: 'midweek' | 'weekend') => {
        let total = 0;
        let count = 0;
        const weekKeys: (keyof MonthlyAttendance['weeks'])[] = ['week1', 'week2', 'week3', 'week4', 'week5'];
        
        weekKeys.forEach(wk => {
            const valStr = attendanceData.weeks[wk][type];
            if (valStr.trim() !== '') {
                total += parseInt(valStr, 10);
                count++;
            }
        });
        
        const promedio = count > 0 ? Math.round(total / count) : 0;
        return { total, promedio, count };
    };

    const midweekStats = calculateStats('midweek');
    const weekendStats = calculateStats('weekend');
    
    // Extract month name and year for display
    let displayMonth = "";
    let displayYear = "";
    if (selectedMonthStr) {
        const parts = selectedMonthStr.split('-');
        if (parts.length === 2) {
            const y = parts[0];
            const m = parseInt(parts[1], 10);
            if (m >= 1 && m <= 12) {
                displayMonth = MONTH_NAMES[m - 1];
                displayYear = y;
            }
        }
    }

    const pendingWeeksCount = weeksInfo.filter(w => !w.isComplete && !w.isFuture).length;

    return (
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 md:py-8 animate-fade-in" id="asistencia_container">
            
            {/* IN-APP ATTENDANCE ALARM BANNER (ANDROID, IOS, WEB) */}
            {alarmStatus.hasAlarm && (
                <div className="mb-5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 p-[1.5px] rounded-2xl shadow-lg animate-pulse">
                    <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 sm:p-4.5 rounded-[15px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 mt-0.5 sm:mt-0">
                                <BellRing className="w-5 h-5 animate-bounce" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                                        Alarma de Asistencia
                                    </span>
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Recordatorio activo
                                    </span>
                                </div>
                                <p className="text-sm font-bold text-white mt-1 leading-snug">
                                    {alarmStatus.message}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                            <button
                                onClick={() => {
                                    playAttendanceAlarmSound();
                                    // Make sure current week is expanded
                                    const currentWk = weeksInfo.find(w => w.isCurrent);
                                    if (currentWk) {
                                        setExpandedWeeks(prev => ({ ...prev, [currentWk.key]: true }));
                                    }
                                }}
                                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Registrar ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CARD CONTAINER */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-4 sm:p-7 space-y-5 md:space-y-7">
                
                {/* HEADER SECTION WITH S-3-S BADGE & ALARM SHORTCUT */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white tracking-tight">
                                REGISTRO DE ASISTENCIA
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Control de asistencia a reuniones semanales
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                        <button
                            onClick={() => setShowAlarmModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            title="Configurar alarmas y recordatorios"
                        >
                            <Bell className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Alarmas</span>
                            {alarmConfig.enabled && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            )}
                        </button>

                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono font-bold tracking-wider select-none shrink-0" title="Código oficial del formulario">
                            S-3-S
                        </span>
                    </div>
                </div>

                {/* MONTH PICKER & SUMMARY BAR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* CONGREGATION DISPLAY */}
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 p-3 rounded-xl">
                        <div className="bg-slate-200/80 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-slate-300">
                            <Building className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Congregación activa</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {currentCongregation?.name || 'Cargando congregación...'}
                            </p>
                        </div>
                    </div>
                    
                    {/* MONTH PICKER & SWITCHER */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 p-2 rounded-xl">
                        <button 
                            onClick={handlePrevMonth}
                            className="bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 p-2 rounded-lg transition-all active:scale-95 cursor-pointer"
                            title="Mes anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <div className="flex items-center gap-2 flex-grow justify-center px-2">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            <div className="relative">
                                <input 
                                    type="month" 
                                    value={selectedMonthStr}
                                    onChange={handleMonthChange}
                                    className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                                    id="month-hidden-picker"
                                />
                                <label 
                                    htmlFor="month-hidden-picker" 
                                    className="cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex flex-col items-center select-none"
                                >
                                    <span className="text-[10px] font-normal text-slate-400">Cambiar periodo</span>
                                    <span>{displayMonth ? `${displayMonth} ${displayYear}` : 'Seleccionar Mes'}</span>
                                </label>
                            </div>
                        </div>

                        <button 
                            onClick={handleNextMonth}
                            className="bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 p-2 rounded-lg transition-all active:scale-95 cursor-pointer"
                            title="Siguiente mes"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* BENTO STATS SUMMARY PANELS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    <div className="bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700 p-3 rounded-xl shadow-xs text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Entre Semana</p>
                        <p className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {midweekStats.total > 0 ? midweekStats.total : '--'}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/90 border border-indigo-50 dark:border-slate-700 p-3 rounded-xl shadow-xs text-center">
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Promedio E.S.</p>
                        <p className="text-lg sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5 flex items-center justify-center gap-1">
                            {midweekStats.promedio > 0 ? midweekStats.promedio : '--'}
                            {midweekStats.promedio > 0 && <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-700 p-3 rounded-xl shadow-xs text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Fin de Semana</p>
                        <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {weekendStats.total > 0 ? weekendStats.total : '--'}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/90 border border-emerald-50 dark:border-slate-700 p-3 rounded-xl shadow-xs text-center">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Promedio F.S.</p>
                        <p className="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 flex items-center justify-center gap-1">
                            {weekendStats.promedio > 0 ? weekendStats.promedio : '--'}
                            {weekendStats.promedio > 0 && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                        </p>
                    </div>
                </div>

                {/* VIEW LAYOUT SELECTOR (SMART CARDS VS FULL S-3-S TABLE) */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                            <Smartphone className="w-4 h-4 text-indigo-500 shrink-0" />
                            Vista Móvil
                        </span>
                        {pendingWeeksCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold whitespace-nowrap">
                                {pendingWeeksCount} por completar
                            </span>
                        )}
                    </div>

                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                        <button
                            onClick={() => setViewLayout('cards')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                viewLayout === 'cards'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                            }`}
                        >
                            Tarjetas
                        </button>
                        <button
                            onClick={() => setViewLayout('table')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                viewLayout === 'table'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                            }`}
                        >
                            Tabla S-3-S
                        </button>
                    </div>
                </div>

                {/* --- MODE 1: SMART CARDS (OPTIMIZED FOR MOBILE WITH PRIORITY TO PENDING) --- */}
                {viewLayout === 'cards' && (
                    <div className="space-y-3">
                        {weeksInfo.map((week) => {
                            const isWeekComplete = week.isComplete;
                            const isUserExplicitlyExpanded = expandedWeeks[week.key];
                            // Priority logic: Pending or current weeks are expanded by default; complete weeks show summary row
                            const isExpanded = isUserExplicitlyExpanded !== undefined 
                                ? isUserExplicitlyExpanded 
                                : (!isWeekComplete || week.isCurrent);

                            const midVal = attendanceData.weeks[week.key].midweek;
                            const weekVal = attendanceData.weeks[week.key].weekend;

                            return (
                                <div 
                                    key={week.key}
                                    className={`rounded-2xl border transition-all ${
                                        week.isCurrent
                                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 shadow-sm'
                                            : isWeekComplete
                                            ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                                            : 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50'
                                    }`}
                                >
                                    {/* CARD HEADER / SUMMARY ROW */}
                                    <div 
                                        onClick={() => toggleWeekExpansion(week.key)}
                                        className="p-3.5 sm:p-4 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                                isWeekComplete
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                                    : week.isCurrent
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                                                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                                            }`}>
                                                {week.index}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-sm text-slate-800 dark:text-white">
                                                        {week.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-medium">
                                                        ({week.dateRangeStr})
                                                    </span>
                                                    {week.isCurrent && (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider">
                                                            Actual
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Compact Summary for Completed Weeks */}
                                                {isWeekComplete && !isExpanded && (
                                                    <div className="flex items-center gap-3 text-xs mt-1 text-slate-600 dark:text-slate-300 font-medium">
                                                        <span>E.S.: <strong className="text-indigo-600 dark:text-indigo-400">{midVal}</strong></span>
                                                        <span>•</span>
                                                        <span>F.S.: <strong className="text-emerald-600 dark:text-emerald-400">{weekVal}</strong></span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 text-[11px]">
                                                            <CheckCircle2 className="w-3 h-3" /> Completo
                                                        </span>
                                                    </div>
                                                )}

                                                {!isWeekComplete && !isExpanded && (
                                                    <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                                        <AlertTriangle className="w-3 h-3" /> Falta registrar asistencia
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {isWeekComplete && !isExpanded && (
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                                    <Edit3 className="w-3 h-3" /> Editar
                                                </span>
                                            )}
                                            <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* EXPANDED EDITING SECTION (PRIORITY FOCUS) */}
                                    {isExpanded && (
                                        <div className="p-3.5 sm:p-4 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* ENTRE SEMANA INPUT CARD */}
                                            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider block">Reunión de</span>
                                                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">Entre Semana</span>
                                                    </div>
                                                    {midVal !== '' && (
                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md">
                                                            {midVal} pers.
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        placeholder="0"
                                                        value={midVal}
                                                        onChange={e => handleInputChange(week.key, 'midweek', e.target.value)}
                                                        readOnly={isReadOnly}
                                                        className="w-full h-12 px-4 border-2 border-indigo-100 dark:border-indigo-900/60 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl text-center text-xl font-black text-indigo-600 dark:text-indigo-300 bg-indigo-50/20 dark:bg-slate-900 outline-none transition-all placeholder-slate-300 dark:placeholder-slate-600"
                                                    />
                                                    {midVal !== '' && !isReadOnly && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleInputChange(week.key, 'midweek', '')}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                                                            title="Vaciar casilla"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* FIN DE SEMANA INPUT CARD */}
                                            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider block">Reunión del</span>
                                                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">Fin de Semana</span>
                                                    </div>
                                                    {weekVal !== '' && (
                                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                                                            {weekVal} pers.
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        placeholder="0"
                                                        value={weekVal}
                                                        onChange={e => handleInputChange(week.key, 'weekend', e.target.value)}
                                                        readOnly={isReadOnly}
                                                        className="w-full h-12 px-4 border-2 border-emerald-100 dark:border-emerald-900/60 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-xl text-center text-xl font-black text-emerald-600 dark:text-emerald-300 bg-emerald-50/20 dark:bg-slate-900 outline-none transition-all placeholder-slate-300 dark:placeholder-slate-600"
                                                    />
                                                    {weekVal !== '' && !isReadOnly && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleInputChange(week.key, 'weekend', '')}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                                                            title="Vaciar casilla"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- MODE 2: TRADITIONAL S-3-S TABLE GRID --- */}
                {viewLayout === 'table' && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" /> Cuadrícula completa S-3-S
                            </span>
                            <span className="text-[10px] text-indigo-500 font-bold sm:hidden animate-pulse">
                                ← Desliza tabla hacia los lados →
                            </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
                            <table className="w-full border-collapse text-center min-w-[640px]">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800">
                                        <th className="p-3 text-left font-bold text-xs text-slate-400 uppercase tracking-wider bg-slate-50/75 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 w-[22%]">
                                            Reuniones
                                        </th>
                                        {(['week1', 'week2', 'week3', 'week4', 'week5'] as const).map((wk, idx) => (
                                            <th key={wk} className="p-3 font-bold text-xs text-slate-500 uppercase tracking-tight bg-slate-50/75 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 w-[11%]">
                                                <span>Sem 0{idx + 1}</span>
                                            </th>
                                        ))}
                                        <th className="p-3 font-bold text-xs text-indigo-600 uppercase tracking-wider bg-slate-100/50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-800 w-[11%]">
                                            Total
                                        </th>
                                        <th className="p-3 font-bold text-xs text-indigo-700 uppercase tracking-wider bg-indigo-50/25 dark:bg-indigo-950/40 w-[11%]">
                                            Promedio
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                                    {/* ENTRE SEMANA ROW */}
                                    <tr>
                                        <td className="p-3.5 text-left font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/30 border-r border-slate-200 dark:border-slate-800">
                                            <div className="text-slate-800 dark:text-white">Reunión de</div>
                                            <div className="text-indigo-600 dark:text-indigo-400 text-[11px] sm:text-xs">Entre Semana</div>
                                        </td>
                                        {(['week1', 'week2', 'week3', 'week4', 'week5'] as const).map(wk => (
                                            <td key={wk} className="p-0 border-r border-slate-200 dark:border-slate-800 relative focus-within:bg-indigo-50/15">
                                                <input 
                                                    type="text" 
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    placeholder="..."
                                                    value={attendanceData.weeks[wk].midweek}
                                                    onChange={e => handleInputChange(wk, 'midweek', e.target.value)}
                                                    readOnly={isReadOnly}
                                                    className="w-full h-14 min-h-[56px] border-none text-center text-lg font-bold text-indigo-600 dark:text-indigo-400 bg-transparent outline-none select-all font-mono"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-3 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 text-lg font-black text-slate-700 dark:text-slate-200 font-mono">
                                            {midweekStats.total > 0 ? midweekStats.total : '--'}
                                        </td>
                                        <td className="p-3 bg-indigo-50/20 dark:bg-indigo-950/20 text-lg font-black text-indigo-800 dark:text-indigo-300 font-mono">
                                            {midweekStats.promedio > 0 ? midweekStats.promedio : '--'}
                                        </td>
                                    </tr>
                                    
                                    {/* FIN DE SEMANA ROW */}
                                    <tr>
                                        <td className="p-3.5 text-left font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-800/30 border-r border-slate-200 dark:border-slate-800">
                                            <div className="text-slate-800 dark:text-white">Reunión del</div>
                                            <div className="text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs">Fin de Semana</div>
                                        </td>
                                        {(['week1', 'week2', 'week3', 'week4', 'week5'] as const).map(wk => (
                                            <td key={wk} className="p-0 border-r border-slate-200 dark:border-slate-800 relative focus-within:bg-emerald-50/15">
                                                <input 
                                                    type="text" 
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    placeholder="..."
                                                    value={attendanceData.weeks[wk].weekend}
                                                    onChange={e => handleInputChange(wk, 'weekend', e.target.value)}
                                                    readOnly={isReadOnly}
                                                    className="w-full h-14 min-h-[56px] border-none text-center text-lg font-bold text-emerald-600 dark:text-emerald-400 bg-transparent outline-none select-all font-mono"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-3 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 text-lg font-black text-slate-700 dark:text-slate-200 font-mono">
                                            {weekendStats.total > 0 ? weekendStats.total : '--'}
                                        </td>
                                        <td className="p-3 bg-emerald-50/15 dark:bg-emerald-950/20 text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono">
                                            {weekendStats.promedio > 0 ? weekendStats.promedio : '--'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* BOTTOM SAVING FOOTER ACTION BAR */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 gap-3">
                    <div className="flex items-center gap-2">
                        {saveStatus === 'con-cambios' && (
                            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Cambios sin guardar
                            </div>
                        )}
                        {saveStatus === 'guardado' && (
                            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all animate-bounce">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                ¡Datos guardados con éxito! ✓
                            </div>
                        )}
                        {saveStatus === 'error' && (
                            <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold">
                                Error al procesar guardado
                            </div>
                        )}
                        {!saveStatus && (
                            <p className="text-xs text-slate-400 flex items-center gap-1" id="auto-save-label">
                                <HelpCircle className="w-3.5 h-3.5 text-slate-300" /> Los cambios se guardan al presionar el botón
                            </p>
                        )}
                    </div>
                    
                    {!isReadOnly && (
                        <button 
                            onClick={saveAttendance}
                            disabled={loading || !currentCongregation}
                            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 border text-sm active:scale-95 transition-all ${
                                saveStatus === 'con-cambios'
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-indigo-100'
                                : 'bg-slate-900 hover:bg-black text-white border-slate-900'
                            } cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                            id="btn_guardar_asistencia"
                        >
                            <Save className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Procesando...' : 'Guardar informe'}
                        </button>
                    )}
                </div>
            </div>

            {/* S-3-S INSTRUCTION OFFICIAL NOTE */}
            <div className="mt-4 flex items-center gap-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/80 dark:border-blue-900/40 p-3 rounded-xl text-blue-900 dark:text-blue-200 text-xs">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                    <strong>Instrucción oficial S-3-S:</strong> Contar la asistencia a mitad de cada reunión. Incluir a quienes estén conectados virtualmente.
                </span>
            </div>

            {/* --- ALARM & REMINDERS CONFIGURATION MODAL --- */}
            {showAlarmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
                        {/* MODAL HEADER */}
                        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-white/15 border border-white/20">
                                    <BellRing className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-base">Alarmas y Recordatorios</h3>
                                    <p className="text-xs text-blue-100">Configuración para Android, iOS y Web</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowAlarmModal(false)}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs cursor-pointer transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* MODAL BODY */}
                        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* ENABLE TOGGLE */}
                            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-white block">
                                        Activar alarmas de asistencia
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        Muestra aviso si falta asistencia en la semana
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={alarmConfig.enabled}
                                    onChange={e => setAlarmConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                                    className="w-5 h-5 accent-indigo-600 rounded-md cursor-pointer"
                                />
                            </div>

                            {/* MIDWEEK ALARM SETTINGS */}
                            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-600" />
                                    <span className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300">
                                        Recordatorio Reunión de Entre Semana
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                            Día de recordatorio:
                                        </label>
                                        <select
                                            value={alarmConfig.midweek_day}
                                            onChange={e => setAlarmConfig(prev => ({ ...prev, midweek_day: Number(e.target.value) }))}
                                            className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white outline-none"
                                        >
                                            {DAYS_OF_WEEK.map(d => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                            Hora (predeterminada 9:00 PM):
                                        </label>
                                        <input
                                            type="time"
                                            value={alarmConfig.midweek_time}
                                            onChange={e => setAlarmConfig(prev => ({ ...prev, midweek_time: e.target.value }))}
                                            className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* WEEKEND ALARM SETTINGS */}
                            <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                                        Recordatorio Reunión de Fin de Semana
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                            Día de recordatorio:
                                        </label>
                                        <select
                                            value={alarmConfig.weekend_day}
                                            onChange={e => setAlarmConfig(prev => ({ ...prev, weekend_day: Number(e.target.value) }))}
                                            className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white outline-none"
                                        >
                                            {DAYS_OF_WEEK.map(d => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                            Hora (predeterminada 8:30 PM):
                                        </label>
                                        <input
                                            type="time"
                                            value={alarmConfig.weekend_time}
                                            onChange={e => setAlarmConfig(prev => ({ ...prev, weekend_time: e.target.value }))}
                                            className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SOUND & PUSH TEST CONTROLS */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-2">
                                <button
                                    type="button"
                                    onClick={() => playAttendanceAlarmSound()}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                >
                                    <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                                    Probar Sonido
                                </button>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        const granted = await requestAppNotificationPermission();
                                        if (granted) {
                                            alert('¡Permiso de notificaciones activado en tu dispositivo!');
                                        } else {
                                            alert('Permisos de notificaciones no habilitados por el navegador o dispositivo.');
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                >
                                    <Smartphone className="w-3.5 h-3.5" />
                                    Permisos Dispositivo
                                </button>
                            </div>
                        </div>

                        {/* MODAL FOOTER */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowAlarmModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={saveAlarmSettings}
                                disabled={savingAlarms || isReadOnly}
                                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {savingAlarms ? 'Guardando...' : alarmSaveSuccess ? '¡Guardado! ✓' : 'Guardar Horarios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Asistencia;
