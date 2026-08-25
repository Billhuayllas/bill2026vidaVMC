import React, { useState, useEffect } from 'react';
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
  FileSpreadsheet
} from 'lucide-react';

interface AsistenciaProps {
    isReadOnly?: boolean;
}

interface MonthlyAttendance {
    weeks: {
        week1: { midweek: string; weekend: string; };
        week2: { midweek: string; weekend: string; };
        week3: { midweek: string; weekend: string; };
        week4: { midweek: string; weekend: string; };
        week5: { midweek: string; weekend: string; };
    }
}

const Asistencia: React.FC<AsistenciaProps> = ({ isReadOnly = false }) => {
    const { currentCongregation, refreshCongregations } = useCongregation();
    const currentDate = new Date();
    
    // Ensure month string format is like '2026-06'
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

    const MONTH_NAMES = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    useEffect(() => {
        if (currentCongregation) {
            loadAttendanceData(selectedMonthStr);
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

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 animate-fade-in" id="asistencia_container">
            
            {/* CONTAINER BANNER */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 sm:p-8 space-y-6 md:space-y-8">
                
                {/* HEADER SECTION WITH MODERN S-3-S BADGE */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-5 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-55 bg-indigo-50 text-indigo-600 p-2.5 rounded-xl border border-indigo-100">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="text-center sm:text-left">
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                                INFORME DE ASISTENCIA A LAS REUNIONES
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Registro de reuniones semanales
                            </p>
                        </div>
                    </div>
                    
                    <span className="bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 text-xs px-3 py-1.5 rounded-lg border border-slate-200 font-mono font-bold tracking-wider select-none shrink-0" title="Código oficial del formulario">
                        FORMULARIO S-3-S
                    </span>
                </div>

                {/* INFO CALLOUT CARD */}
                <div className="flex gap-3 bg-blue-50/75 border border-blue-100 p-4 rounded-xl text-blue-800 text-xs sm:text-sm shadow-sm transition-all hover:bg-blue-50">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-semibold">Instrucción oficial:</span> La asistencia se contará una sola vez a mitad de cada reunión. Recuerden contar también a las personas aisladas o confinadas en casa que estén conectadas.
                    </div>
                </div>

                {/* FORM INPUTS HEADER - DESIGNED TO LOOK PREMIUM */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CONGREGATION DISPLAY */}
                    <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl hover:border-slate-300 transition-colors">
                        <div className="bg-slate-200/75 p-2 rounded-lg text-slate-600">
                            <Building className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Congregación activa</p>
                            <p className="text-sm font-semibold text-slate-700 truncate">
                                {currentCongregation?.name || 'Cargando congregación...'}
                            </p>
                        </div>
                    </div>
                    
                    {/* MONTH PICKER & SWITCHER */}
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl hover:border-slate-300 transition-colors">
                        <button 
                            onClick={handlePrevMonth}
                            className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300 p-2 rounded-lg transition-all active:scale-95"
                            title="Mes anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <div className="flex items-center gap-2 flex-grow justify-center px-2">
                            <Calendar className="w-4 h-4 text-indigo-500 hidden sm:block" />
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
                                    className="cursor-pointer text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors flex flex-col items-center select-none"
                                >
                                    <span className="text-xs font-normal text-slate-400">Ver periodo</span>
                                    <span>{displayMonth ? `${displayMonth} ${displayYear}` : 'Seleccionar Mes'}</span>
                                </label>
                            </div>
                        </div>

                        <button 
                            onClick={handleNextMonth}
                            className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300 p-2 rounded-lg transition-all active:scale-95"
                            title="Siguiente mes"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* BENTO STATS SUMMARY PANELS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/40 p-3 rounded-2xl border border-slate-200/50">
                    <div className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Entre Semana</p>
                        <p className="text-xl md:text-2xl font-black text-indigo-600 mt-1">
                            {midweekStats.total > 0 ? midweekStats.total : '--'}
                        </p>
                    </div>
                    <div className="bg-white border border-indigo-50 p-3.5 rounded-xl shadow-sm text-center">
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Promedio Entre Semana</p>
                        <p className="text-xl md:text-2xl font-black text-indigo-700 mt-1 flex items-center justify-center gap-1">
                            {midweekStats.promedio > 0 ? midweekStats.promedio : '--'}
                            {midweekStats.promedio > 0 && <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />}
                        </p>
                    </div>
                    <div className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Fin de Semana</p>
                        <p className="text-xl md:text-2xl font-black text-emerald-600 mt-1">
                            {weekendStats.total > 0 ? weekendStats.total : '--'}
                        </p>
                    </div>
                    <div className="bg-white border border-emerald-50 p-3.5 rounded-xl shadow-sm text-center">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Promedio Fin de Semana</p>
                        <p className="text-xl md:text-2xl font-black text-emerald-700 mt-1 flex items-center justify-center gap-1">
                            {weekendStats.promedio > 0 ? weekendStats.promedio : '--'}
                            {weekendStats.promedio > 0 && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                        </p>
                    </div>
                </div>

                {/* TABLE CARD CONTAINER (WITH SMOOTH LATERAL SWIPE NOTIFICATION FOR PHONES) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" /> Formato de cuadrícula mensual
                        </span>
                        <span className="text-[10px] text-indigo-500 font-bold sm:hidden animate-pulse">
                            ← Desliza tabla hacia los lados →
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-sm bg-white">
                        <table className="w-full border-collapse text-center min-w-[640px]">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="p-3 text-left font-bold text-xs text-slate-400 uppercase tracking-wider bg-slate-50/75 border-r border-slate-200 w-[22%]">
                                        Reuniones
                                    </th>
                                    {(['week1', 'week2', 'week3', 'week4', 'week5'] as const).map((wk, idx) => (
                                        <th key={wk} className="p-3 font-bold text-xs text-slate-500 uppercase tracking-tight bg-slate-50/75 border-r border-slate-200 w-[11%]">
                                            <span className="hidden sm:inline">Semana {idx + 1}</span>
                                            <span className="inline sm:hidden">Sem 0{idx + 1}</span>
                                        </th>
                                    ))}
                                    <th className="p-3 font-bold text-xs text-indigo-600 uppercase tracking-wider bg-slate-100/50 border-r border-slate-200 w-[11%]">
                                        Total
                                    </th>
                                    <th className="p-3 font-bold text-xs text-indigo-700 uppercase tracking-wider bg-indigo-50/25 w-[11%]">
                                        Promedio
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                                {/* ENTRE SEMANA ROW */}
                                <tr>
                                    <td className="p-3.5 text-left font-bold text-xs sm:text-sm text-slate-700 bg-slate-50/50 border-r border-slate-200 font-sans tracking-tight">
                                        <div className="text-slate-800">Reunión de</div>
                                        <div className="text-indigo-600 text-[11px] sm:text-xs">Entre Semana</div>
                                    </td>
                                    {(['week1', 'week2', 'week3', 'week4', 'week5'] as const).map(wk => (
                                        <td key={wk} className="p-0 border-r border-slate-200 relative group focus-within:bg-indigo-50/15 transition-all">
                                            <input 
                                                type="text" 
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                placeholder="..."
                                                value={attendanceData.weeks[wk].midweek}
                                                onChange={e => handleInputChange(wk, 'midweek', e.target.value)}
                                                readOnly={isReadOnly}
                                                className="w-full h-16 min-h-[64px] border-none text-center text-lg sm:text-xl font-bold text-indigo-600 hover:text-indigo-700 bg-transparent outline-none focus:ring-0 placeholder-slate-200 transition-all select-all font-mono"
                                            />
                                        </td>
                                    ))}
                                    {/* Midweek Total */}
                                    <td className="p-3 bg-slate-50 border-r border-slate-200 text-lg font-black text-slate-700 font-mono">
                                        {midweekStats.total > 0 ? midweekStats.total : '--'}
                                    </td>
                                    {/* Midweek Avg */}
                                    <td className="p-3 bg-indigo-50/20 text-lg font-black text-indigo-800 font-mono">
                                        {midweekStats.promedio > 0 ? midweekStats.promedio : '--'}
                                    </td>
                                </tr>
                                
                                {/* FIN DE SEMANA ROW */}
                                <tr>
                                    <td className="p-3.5 text-left font-bold text-xs sm:text-sm text-slate-700 bg-slate-50/50 border-r border-slate-200 font-sans tracking-tight">
                                        <div className="text-slate-800">Reunión del</div>
                                        <div className="text-emerald-600 text-[11px] sm:text-xs">Fin de Semana</div>
                                    </td>
                                    {(['week1', 'week2', 'week3', 'week4', 'week5'] as const).map(wk => (
                                        <td key={wk} className="p-0 border-r border-slate-200 relative focus-within:bg-emerald-50/15 transition-all">
                                            <input 
                                                type="text" 
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                placeholder="..."
                                                value={attendanceData.weeks[wk].weekend}
                                                onChange={e => handleInputChange(wk, 'weekend', e.target.value)}
                                                readOnly={isReadOnly}
                                                className="w-full h-16 min-h-[64px] border-none text-center text-lg sm:text-xl font-bold text-emerald-600 hover:text-emerald-700 bg-transparent outline-none focus:ring-0 placeholder-slate-200 transition-all select-all font-mono"
                                            />
                                        </td>
                                    ))}
                                    {/* Weekend Total */}
                                    <td className="p-3 bg-slate-50 border-r border-slate-200 text-lg font-black text-slate-700 font-mono">
                                        {weekendStats.total > 0 ? weekendStats.total : '--'}
                                    </td>
                                    {/* Weekend Avg */}
                                    <td className="p-3 bg-emerald-50/15 text-lg font-black text-emerald-800 font-mono">
                                        {weekendStats.promedio > 0 ? weekendStats.promedio : '--'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* BOTTOM SAVING FOOTER ACTION BAR */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-5 gap-4">
                    <div className="flex items-center gap-2">
                        {saveStatus === 'con-cambios' && (
                            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Cambios sin guardar
                            </div>
                        )}
                        {saveStatus === 'guardado' && (
                            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all animate-bounce">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
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
                            style={{ transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
                            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 border text-sm active:scale-95 ${
                                saveStatus === 'con-cambios'
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-indigo-100 hover:shadow-md'
                                : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-800 hover:shadow-md'
                            } cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                            id="btn_guardar_asistencia"
                        >
                            <Save className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Procesando...' : 'Guardar informe'}
                        </button>
                    )}
                </div>
            </div>

            {/* S-3-S REPORT CODE TEXT IN BG WITH SHUMAN SENSE */}
            <div className="mt-5 text-[11px] text-slate-400 font-medium font-sans flex items-center justify-between px-1">
                <p>Publicación autorizada para la congregación activa</p>
                <p className="font-mono">S-3-S 10/15</p>
            </div>
        </div>
    );
};

export default Asistencia;
