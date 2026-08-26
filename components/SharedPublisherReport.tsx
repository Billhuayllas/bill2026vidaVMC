import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllMinistryReports } from '../lib/supabasePagination';
import { cleanNotes, isReportAuxiliar } from './congregation/utils';
import { 
  Users, 
  Calendar, 
  Search, 
  ArrowLeft, 
  Phone, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  AlertCircle, 
  Share2, 
  Sliders, 
  Download,
  Info
} from 'lucide-react';

interface SharedPublisherReportProps {
    congregationId: number;
}

const SharedPublisherReport: React.FC<SharedPublisherReportProps> = ({ congregationId }) => {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [congregation, setCongregation] = useState<any>(null);
    const [masterPublishers, setMasterPublishers] = useState<any[]>([]);
    const [globalMembers, setGlobalMembers] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [serviceYearReports, setServiceYearReports] = useState<any[]>([]);
    
    // UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('todos'); // 'todos', 'precursor regular', 'precursor especial'
    
    // Card Selection
    const [selectedPublisher, setSelectedPublisher] = useState<string>('');
    const [selectedServiceYear, setSelectedServiceYear] = useState<number>(new Date().getFullYear());
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const [serviceYears, setServiceYears] = useState<number[]>([]);

    useEffect(() => {
        const currentYear = new Date().getFullYear();
        setServiceYears([currentYear + 1, currentYear, currentYear - 1, currentYear - 2]);
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            // 1. Fetch Congregation
            const { data: cong, error: congErr } = await supabase
                .from('congregations')
                .select('*')
                .eq('id', congregationId)
                .single();
            if (congErr || !cong) throw new Error('No se pudo encontrar la congregación.');
            setCongregation(cong);

            // 2. Fetch Publicadores
            const { data: pubs, error: pubsErr } = await supabase
                .from('publicadores')
                .select('*')
                .eq('congregation_id', congregationId)
                .order('nombre');
            if (pubsErr) throw pubsErr;
            setMasterPublishers(pubs || []);

            // 3. Fetch Grupos
            const { data: grps, error: grpsErr } = await supabase
                .from('grupos')
                .select('*')
                .eq('congregation_id', congregationId)
                .order('nombre');
            if (grpsErr) throw grpsErr;
            setGroups(grps || []);

            // 4. Fetch Miembros de Grupo
            const { data: membs, error: membsErr } = await supabase
                .from('miembros_grupo')
                .select('*');
            if (membsErr) throw membsErr;

            // Filter members that belong to the groups of this congregation
            const validGroupIds = (grps || []).map(g => g.id);
            const filteredMembs = (membs || []).filter(m => validGroupIds.includes(m.grupo_id));
            setGlobalMembers(filteredMembs);

            // 5. Fetch Service Month Reports
            const currentDate = new Date();
            const curM = currentDate.getMonth() + 1;
            const curY = currentDate.getFullYear();
            const serviceYear = curM >= 9 ? curY + 1 : curY;

            const startMonth = `${serviceYear - 1}-09`;
            const endMonth = `${serviceYear}-08`;

            const reps = await fetchAllMinistryReports(congregationId, startMonth, endMonth);
            setServiceYearReports(reps || []);

            // Automatically select first publisher for the Card View if available
            if (pubs && pubs.length > 0) {
                setSelectedPublisher(pubs[0].nombre);
            }
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'Error al conectar con la base de datos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (congregationId) {
            fetchAllData();
        }
    }, [congregationId]);

    // Pioneer Hour Calculation Logic
    const getPioneerStats = (publisherName: string, role: string, startMonthRaw?: string) => {
        const isRegularPioneer = role.toLowerCase().includes('precursor regular');
        const isSpecialPioneer = role.toLowerCase().includes('precursor especial');
        const isExempt = role.toLowerCase().includes('eximido de meta');
        
        if (!isRegularPioneer && !isSpecialPioneer) return null;

        const monthlyGoal = isSpecialPioneer ? 130 : 50;

        // Current service year boundaries
        const currentDate = new Date();
        const curM = currentDate.getMonth() + 1;
        const curY = currentDate.getFullYear();
        const serviceYear = curM >= 9 ? curY + 1 : curY;

        let startYm = '';
        if (startMonthRaw) {
            const cleanStr = startMonthRaw.trim().toLowerCase();
            if (/^\d{4}-\d{2}$/.test(cleanStr)) {
                startYm = cleanStr;
            } else {
                const parts = cleanStr.split('-');
                if (parts.length === 3 && parts[0].length === 4) {
                    startYm = `${parts[0]}-${parts[1].padStart(2, '0')}`;
                } else {
                    const dma = cleanStr.split('/');
                    if (dma.length === 3 && dma[2].length === 4) {
                        startYm = `${dma[2]}-${dma[1].padStart(2, '0')}`;
                    } else if (dma.length === 2 && dma[1].length === 4) {
                        startYm = `${dma[1]}-${dma[0].padStart(2, '0')}`;
                    }
                }
            }
        }
        
        if (!startYm) {
            startYm = `${serviceYear - 1}-09`; // Fallback to beginning of service year
        }

        // Target months sequence logically
        const months = [];
        for (let m = 9; m <= 12; m++) months.push(`${serviceYear - 1}-${m.toString().padStart(2, '0')}`);
        for (let m = 1; m <= 8; m++) months.push(`${serviceYear}-${m.toString().padStart(2, '0')}`);

        // Current month marker
        const targetCurrentMonthStr = `${curY}-${curM.toString().padStart(2, '0')}`;
        
        let countOfPioneerMonths = 0;
        let actualPioneerHours = 0;

        const pubReports = serviceYearReports.filter(r => r.publicador_name ? r.publicador_name.trim().toLowerCase() === publisherName.trim().toLowerCase() : r.publicador_nombre.trim().toLowerCase() === publisherName.trim().toLowerCase());

        // Find latest month with data for this publisher
        let latestIndexWithData = -1;
        for (let i = months.length - 1; i >= 0; i--) {
            const monthStr = months[i];
            const r = pubReports.find(x => x.mes === monthStr);
            if (r) {
                latestIndexWithData = i;
                break;
            }
        }

        let latestIndex = latestIndexWithData;
        if (latestIndex === -1) {
            for (let i = 0; i < months.length; i++) {
                if (months[i] <= targetCurrentMonthStr) {
                    latestIndex = i;
                }
            }
            if (latestIndex === -1) latestIndex = 11;
        }

        for (let idx = 0; idx <= latestIndex; idx++) {
            const monthStr = months[idx];
            const r = pubReports.find(x => x.mes === monthStr);
            const isAux = isReportAuxiliar(r);
            const isPioneerMonth = monthStr >= startYm && !isAux;

            if (isPioneerMonth) {
                countOfPioneerMonths++;
                if (r) {
                    // Extract special hours if any
                    let he = Number(r.horas_especiales) || 0;
                    if (r.notas) {
                        const matchHe = r.notas.match(/\{\{horas_especiales:(\d+)\}\}/);
                        if (matchHe) he = he || parseInt(matchHe[1], 10);
                        const matchHe2 = r.notas.match(/\{\{he:(\d+)\}\}/);
                        if (matchHe2) he = he || parseInt(matchHe2[1], 10);
                    }
                    actualPioneerHours += (Number(r.horas) || 0) + he;
                }
            }
        }

        const expectedTotalHours = countOfPioneerMonths * monthlyGoal;
        const diff = actualPioneerHours - expectedTotalHours;
        
        return {
            actual: actualPioneerHours,
            expected: expectedTotalHours,
            diff: diff,
            isExempt: isExempt,
            monthlyGoal: monthlyGoal
        };
    };

    // Filter, Sort and Maple Pioneers Report
    const pioneersData = useMemo(() => {
        return masterPublishers.map(pub => {
            const memberEntry = globalMembers.find(m => m.publicador_nombre.trim().toLowerCase() === pub.nombre.trim().toLowerCase());
            return {
                publisher: pub,
                role: memberEntry?.rol || 'Publicador'
            };
        }).filter(item => {
            const lowerRol = (item.role || '').toLowerCase();
            const matchesRole = lowerRol.includes('precursor regular') || lowerRol.includes('precursor especial');
            if (!matchesRole) return false;
            
            if (filterType === 'precursor regular') return lowerRol.includes('precursor regular');
            if (filterType === 'precursor especial') return lowerRol.includes('precursor especial');
            return true;
        }).filter(item => {
            const searchable = (item.publisher.nombre + ' ' + (item.publisher.nombre_completo || '')).toLowerCase();
            return searchable.includes(searchTerm.toLowerCase());
        }).map(item => {
            const stats = getPioneerStats(item.publisher.nombre, item.role, item.publisher.inicio_precursor_mes);
            return {
                ...item,
                stats
            };
        }).sort((a, b) => {
            const statsA = a.stats;
            const statsB = b.stats;
            
            const isExemptA = statsA?.isExempt ? 1 : 0;
            const isExemptB = statsB?.isExempt ? 1 : 0;
            
            // Exempt always go to the bottom
            if (isExemptA !== isExemptB) {
                return isExemptA - isExemptB;
            }
            
            const diffA = statsA ? statsA.diff : 0;
            const diffB = statsB ? statsB.diff : 0;
            return diffA - diffB;
        });
    }, [masterPublishers, globalMembers, serviceYearReports, filterType, searchTerm]);

    // Service Year Months sequence helper for S-21 Card View
    const months = [
        { key: '09', name: 'septiembre' },
        { key: '10', name: 'octubre' },
        { key: '11', name: 'noviembre' },
        { key: '12', name: 'diciembre' },
        { key: '01', name: 'enero' },
        { key: '02', name: 'febrero' },
        { key: '03', name: 'marzo' },
        { key: '04', name: 'abril' },
        { key: '05', name: 'mayo' },
        { key: '06', name: 'junio' },
        { key: '07', name: 'julio' },
        { key: '08', name: 'agosto' },
    ];

    const currentPublisherDetails = useMemo(() => {
        if (!selectedPublisher) return null;
        return masterPublishers.find(p => p.nombre.trim() === selectedPublisher.trim());
    }, [selectedPublisher, masterPublishers]);

    const currentPublisherRole = useMemo(() => {
        if (!selectedPublisher) return 'Publicador';
        const member = globalMembers.find(m => m.publicador_nombre.trim() === selectedPublisher.trim());
        return member?.rol || 'Publicador';
    }, [selectedPublisher, globalMembers]);

    // Calculate age helper
    const calculateAge = (birthDateStr?: string) => {
        if (!birthDateStr) return '---';
        const birth = new Date(birthDateStr);
        if (isNaN(birth.getTime())) return '---';
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `${age} años`;
    };

    // Calculate baptism years helper
    const calculateBaptismYears = (baptismDateStr?: string) => {
        if (!baptismDateStr) return '---';
        const baptism = new Date(baptismDateStr);
        if (isNaN(baptism.getTime())) return '---';
        const today = new Date();
        let yrs = today.getFullYear() - baptism.getFullYear();
        const mDiff = today.getMonth() - baptism.getMonth();
        if (mDiff < 0 || (mDiff === 0 && today.getDate() < baptism.getDate())) {
            yrs--;
        }
        return `${yrs} años`;
    };

    // Format S-21 specific date
    const formatMonthDisplay = (monthCode: string, year: number) => {
        const monthsList = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const monthIndex = parseInt(monthCode, 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
            return `${monthsList[monthIndex]} ${year}`;
        }
        return monthCode;
    };

    const handleExitShared = () => {
        window.location.href = window.location.origin + window.location.pathname;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-600 gap-3">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-sm font-semibold">Cargando reporte compartido...</span>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 p-6 text-center">
                <AlertCircle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
                <h3 className="text-lg font-bold">Error de Acceso</h3>
                <p className="text-slate-500 max-w-md mt-2 mb-6">{errorMsg}</p>
                <button 
                    onClick={handleExitShared}
                    className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow hover:bg-slate-900 transition-all"
                >
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 text-slate-800 pb-12 font-sans" id="shared_report_box">
            {/* STICKY ACCENT TOP NAV */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-150">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-md sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-1.5 leading-tight">
                            {congregation?.name}
                        </h1>
                        <p className="text-[10px] sm:text-xs text-indigo-600 font-bold uppercase tracking-wider">
                            Reporte Compartido de Precursores
                        </p>
                    </div>
                </div>
            </header>

            {/* MAIN CONTAINER */}
            <div className="max-w-6xl mx-auto px-4 mt-6">
                {/* PIONEER HOURS GAP REPORT PANEL */}
                <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200/90 shadow-md space-y-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Corte de Horas de los Precursores</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Ordenado por urgencia de horas requeridas</p>
                        </div>
                        
                        {/* MINI FILTER CONTROLS */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={() => setFilterType('todos')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                    filterType === 'todos' 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                Todos
                            </button>
                            <button 
                                onClick={() => setFilterType('precursor regular')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                    filterType === 'precursor regular' 
                                    ? 'bg-indigo-650 border-indigo-650 bg-indigo-600 text-white shadow-sm' 
                                    : 'bg-indigo-50/50 border-indigo-150 text-indigo-700 hover:bg-indigo-50'
                                }`}
                            >
                                Precursor Reg.
                            </button>
                            <button 
                                onClick={() => setFilterType('precursor especial')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                    filterType === 'precursor especial' 
                                    ? 'bg-indigo-650 border-indigo-650 bg-indigo-600 text-white shadow-sm' 
                                    : 'bg-purple-50/50 border-purple-150 text-purple-700 hover:bg-purple-50'
                                }`}
                            >
                                Precursor Esp.
                            </button>
                        </div>
                    </div>

                    {/* SEARCH FIELD */}
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                        <input 
                            type="text"
                            placeholder="Buscar precursor..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm font-semibold placeholder-slate-400"
                        />
                    </div>

                    {/* TABLA ESTILO LIMPIO Y SUAVE */}
                    <div className="w-full overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm mt-4">
                        <table className="w-full min-w-[700px] border-collapse text-xs sm:text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-4 text-left font-bold text-slate-500 uppercase text-[10px] sm:text-[11px] tracking-wider w-[25%]">NOMBRE</th>
                                    <th className="p-4 text-center font-bold text-slate-500 uppercase text-[10px] sm:text-[11px] tracking-wider w-[15%]">ROL</th>
                                    <th className="p-4 text-right font-bold text-slate-500 uppercase text-[10px] sm:text-[11px] tracking-wider w-[15%]">HRS. HECHAS</th>
                                    <th className="p-4 text-right font-bold text-slate-500 uppercase text-[10px] sm:text-[11px] tracking-wider w-[15%]">HRS. FALTA</th>
                                    <th className="p-4 text-center font-bold text-slate-500 uppercase text-[10px] sm:text-[11px] tracking-wider w-[15%]">ESTADO</th>
                                    <th className="p-4 text-center font-bold text-slate-500 uppercase text-[10px] sm:text-[11px] tracking-wider w-[15%]">ACCIÓN</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {pioneersData.map((row, idx) => {
                                    const stats = row.stats;
                                    if (!stats) return null;
                                    const isLate = !stats.isExempt && stats.diff < 0;
                                    const missingHrs = isLate ? Math.abs(stats.diff).toFixed(1) : '0.0';
                                    
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 align-middle font-bold text-slate-800 text-[11px] sm:text-xs border-b border-slate-200">
                                                {row.publisher.nombre_completo || row.publisher.nombre}
                                            </td>
                                            <td className="p-4 align-middle text-center border-b border-slate-200">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${row.role.toLowerCase().includes('especial') ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                                                    {row.role.toLowerCase().includes('especial') ? 'Esp.' : 'Reg.'}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle text-right font-mono font-bold text-slate-800 border-b border-slate-200">
                                                {stats.actual.toFixed(1)}
                                            </td>
                                            <td className={`p-4 align-middle text-right font-mono font-bold border-b border-slate-200 ${stats.isExempt ? 'text-teal-600' : isLate ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {stats.isExempt ? 'Exim.' : isLate ? missingHrs : '0.0'}
                                            </td>
                                            <td className="p-4 align-middle text-center border-b border-slate-200">
                                                {stats.isExempt ? (
                                                    <span className="inline-flex items-center bg-teal-50 text-teal-700 px-2 py-1 rounded text-[10px] font-bold border border-teal-200">Eximido</span>
                                                ) : isLate ? (
                                                    <span className="inline-flex items-center bg-rose-50 text-rose-700 px-2 py-1 rounded text-[10px] font-bold border border-rose-200">Falta</span>
                                                ) : (
                                                    <span className="inline-flex items-center bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold border border-emerald-200">Al día</span>
                                                )}
                                            </td>
                                            <td className="p-4 align-middle text-center border-b border-slate-200">
                                                <button
                                                    onClick={() => {
                                                        setSelectedPublisher(row.publisher.nombre);
                                                        setIsCardModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded font-bold text-[10px] sm:text-[11px] transition-colors w-full sm:w-auto"
                                                >
                                                    <FileText className="w-3 h-3" /> PDF
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                
                                {pioneersData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                            <div className="flex flex-col gap-2 items-center">
                                                <AlertCircle className="w-8 h-8 text-slate-300" />
                                                <span className="font-semibold text-sm">No se encontraron precursores con los criterios especificados.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

            {/* FULLY RESPONSIVE S-21 CARD MODAL DIALOG - ZERO SIDE SCROLLING */}
            {isCardModalOpen && selectedPublisher && currentPublisherDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-700 shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">Ficha Registro S-21</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCardModalOpen(false)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95"
                            >
                                Cerrar [✕]
                            </button>
                        </div>
                        
                        {/* Modal Scrollable Body */}
                        <div className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-6">
                            
                            {/* Selector controls in Modal */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                                 <div className="flex flex-col gap-0.5 text-left">
                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hermano Seleccionado</span>
                                      <span className="font-extrabold text-slate-800 text-sm sm:text-base">
                                          {currentPublisherDetails.nombre_completo || currentPublisherDetails.nombre}
                                      </span>
                                 </div>
                                 
                                 <div className="flex items-center gap-2">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Año de Servicio:</label>
                                      <select 
                                          value={selectedServiceYear}
                                          onChange={e => setSelectedServiceYear(Number(e.target.value))}
                                          className="bg-white border border-slate-250 hover:border-slate-350 px-3 py-1.5 rounded-xl outline-none font-extrabold text-xs transition-all focus:border-indigo-500"
                                      >
                                          {serviceYears.map((y, idx) => (
                                              <option key={idx} value={y}>
                                                  Año {y}
                                              </option>
                                          ))}
                                      </select>
                                 </div>
                            </div>
                            
                            {/* THE S-21 SHEET DISPLAY */}
                            <div className="border border-slate-300 rounded bg-slate-200 p-2 sm:p-4 overflow-auto touch-pan-x touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', maxHeight: '70vh' }}>
                                 <div 
                                     ref={cardRef} 
                                     className="bg-white text-black p-4 sm:p-8 border-2 border-black mx-auto shadow-sm" 
                                     style={{ fontFamily: 'system-ui, -apple-system, sans-serif', width: '100%', minWidth: '320px', maxWidth: '850px', minHeight: '800px' }}
                                 >
                                     <h2 className="text-center text-[11px] sm:text-lg font-black tracking-widest border-b-2 border-black pb-2 uppercase text-slate-900 leading-tight">
                                         REGISTRO DE PUBLICADOR DE LA CONGREGACIÓN
                                     </h2>
                                     
                                     {/* HEADER INFO S-21 FIELDS */}
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4 text-xs mt-4 pb-4 border-b border-black text-left">
                                         <div className="flex items-center gap-2">
                                             <span className="font-bold whitespace-nowrap text-slate-700">Nombre:</span>
                                             <span className="border-b border-black flex-grow pb-0.5 font-bold px-2 text-slate-900">{currentPublisherDetails.nombre_completo || currentPublisherDetails.nombre}</span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <span className="font-bold whitespace-nowrap text-slate-700">Fecha de nacimiento:</span>
                                             <span className="border-b border-black flex-grow pb-0.5 px-2 text-slate-900">{currentPublisherDetails.fecha_nacimiento || '---'}</span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <span className="font-bold whitespace-nowrap text-slate-700">Dirección:</span>
                                             <span className="border-b border-black flex-grow pb-0.5 px-2 text-slate-900 text-ellipsis overflow-hidden">{currentPublisherDetails.direccion || '---'}</span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <span className="font-bold whitespace-nowrap text-slate-700">Edad:</span>
                                             <span className="border-b border-black flex-grow pb-0.5 px-2 text-slate-900">{calculateAge(currentPublisherDetails.fecha_nacimiento)}</span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <span className="font-bold whitespace-nowrap text-slate-700">Teléfono:</span>
                                             <span className="border-b border-black flex-grow pb-0.5 px-2 text-slate-900">{currentPublisherDetails.telefono_personal || 'Sin registrar'}</span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <span className="font-bold whitespace-nowrap text-slate-700">Fecha de bautismo:</span>
                                             <span className="border-b border-black flex-grow pb-0.5 px-2 text-slate-900">{currentPublisherDetails.fecha_bautismo || '---'}</span>
                                         </div>
                                     </div>
                                     
                                     {/* PRIVILEGES */}
                                     <div className="flex flex-wrap items-center mt-3 gap-y-2 gap-x-6 text-[11px] font-bold pb-3 border-b-2 border-black bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                         <div className="flex items-center gap-1.5">
                                             <span className="font-extrabold uppercase text-slate-500">Nombramiento:</span>
                                             <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] border border-slate-300 font-extrabold">
                                                 {currentPublisherRole}
                                             </span>
                                         </div>
                                         {currentPublisherDetails.otras_ovejas && (
                                             <div className="flex items-center gap-1 text-slate-600">
                                                 <span>✓ Otras Ovejas</span>
                                             </div>
                                         )}
                                     </div>
                                     
                                     {/* DESKTOP HIGH FIDELITY TABLE (NOW VISIBLE AND COMPACT ON MOBILE) */}
                                     <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                                         <table className="w-full min-w-[500px] mt-4 border-collapse" style={{ border: '1.5px solid #000' }}>
                                             <thead>
                                                 <tr className="bg-slate-100 font-bold" style={{ borderBottom: '1.5px solid #000' }}>
                                                     <th className="p-2 text-left text-xs uppercase" style={{ borderRight: '1.5px solid #000' }}>Año {selectedServiceYear}</th>
                                                     <th className="p-2 text-center text-[10px] uppercase" style={{ borderRight: '1.5px solid #000' }}>Participó</th>
                                                     <th className="p-2 text-center text-[10px] uppercase" style={{ borderRight: '1.5px solid #000' }}>Estudios</th>
                                                     <th className="p-2 text-center text-[10px] uppercase" style={{ borderRight: '1.5px solid #000' }}>Auxiliar o Especial</th>
                                                     <th className="p-2 text-center text-[10px] uppercase w-[60px]" style={{ borderRight: '1.5px solid #000' }}>Horas</th>
                                                     <th className="p-2 text-left text-[10px] uppercase">Notas</th>
                                                 </tr>
                                             </thead>
                                             <tbody>
                                                 {months.map(m => {
                                                     const targetMonthString = m.key === '09' || m.key === '10' || m.key === '11' || m.key === '12' 
                                                         ? `${selectedServiceYear - 1}-${m.key}` 
                                                         : `${selectedServiceYear}-${m.key}`;

                                                     const r = serviceYearReports.find(report => {
                                                         const matchesMonth = report.mes?.trim() === targetMonthString;
                                                         const matchesName = report.publicador_nombre 
                                                             ? report.publicador_nombre.trim().toLowerCase() === selectedPublisher.trim().toLowerCase()
                                                             : false;
                                                         return matchesMonth && matchesName;
                                                     });

                                                     let participo = true;
                                                     let notes = '';
                                                     let totalHours = '';
                                                     let studies = '';
                                                     let hasAuxPrecursor = false;

                                                     if (r) {
                                                         if (r.participo !== undefined) {
                                                             participo = r.participo;
                                                         } else if (r.notas) {
                                                             const matchPart = r.notas.match(/\{\{participo:(true|false)\}\}/);
                                                             if (matchPart) {
                                                                 participo = matchPart[1] === 'true';
                                                             }
                                                         }

                                                         hasAuxPrecursor = isReportAuxiliar(r);
                                                         let rawNotes = r.notas || '';
                                                         let he = Number(r.horas_especiales) || 0;
                                                         const matchHe = rawNotes.match(/\{\{horas_especiales:(\d+)\}\}/);
                                                         if (matchHe) {
                                                             he = he || parseInt(matchHe[1], 10);
                                                         }
                                                         const matchHe2 = rawNotes.match(/\{\{he:(\d+)\}\}/);
                                                         if (matchHe2) {
                                                             he = he || parseInt(matchHe2[1], 10);
                                                         }
                                                         notes = cleanNotes(rawNotes);
                                                         if (!notes) {
                                                             notes = '-';
                                                         }

                                                         const h = (Number(r.horas) || 0) + he;
                                                         if (h > 0) totalHours = String(h);

                                                         const s = Number(r.estudios) || 0;
                                                         if (s > 0) studies = String(s);
                                                     } else {
                                                         participo = false;
                                                     }

                                                     return (
                                                         <tr key={m.key} style={{ borderBottom: '1px solid #000' }}>
                                                             <td className="py-1.5 px-2 text-left font-bold capitalize bg-slate-50 text-xs" style={{ borderRight: '1.5px solid #000' }}>{m.name}</td>
                                                             <td className="py-1.5 px-2 text-center" style={{ borderRight: '1.5px solid #000' }}>
                                                                 <input type="checkbox" readOnly checked={participo} className="w-3.5 h-3.5 accent-slate-800" />
                                                             </td>
                                                             <td className="py-1.5 px-2 text-center font-extrabold font-mono text-slate-900 text-xs" style={{ borderRight: '1.5px solid #000' }}>
                                                                 {studies}
                                                             </td>
                                                             <td className="py-1.5 px-2 text-center" style={{ borderRight: '1.5px solid #000' }}>
                                                                 <input type="checkbox" readOnly checked={hasAuxPrecursor || currentPublisherRole.toLowerCase().includes('especial')} className="w-3.5 h-3.5 accent-slate-800" />
                                                             </td>
                                                             <td className="py-1.5 px-2 text-center font-extrabold font-mono text-indigo-700 text-xs" style={{ borderRight: '1.5px solid #000' }}>
                                                                 {totalHours}
                                                             </td>
                                                             <td className="py-1.5 px-2 text-left text-[10px] text-slate-600">
                                                                 {notes}
                                                             </td>
                                                         </tr>
                                                     );
                                                 })}
                                             </tbody>
                                         </table>
                                     </div>
                                     
                                     <div className="mt-5 text-[10px] text-slate-400 font-bold font-mono py-1.5 border-t border-black uppercase tracking-wider flex items-center justify-between">
                                         <span>S-21 - Tarjeta Oficial de Registro</span>
                                     </div>
                                 </div>
                            </div>
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                            <button
                                onClick={() => setIsCardModalOpen(false)}
                                className="bg-indigo-655 hover:bg-indigo-755 bg-indigo-600 text-white font-extrabold px-6 py-2.5 rounded-xl text-sm transition-all shadow hover:shadow-indigo-150 active:scale-95"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* FOOTER */}
            <footer className="mt-12 text-center text-slate-400 text-[11px] max-w-md mx-auto px-6 border-t border-slate-200/60 pt-6">
                <p className="font-semibold">{congregation?.name} - Sistema VMT</p>
                <p className="mt-0.5">Publicación de horas y tarjetas analíticas optimizada de forma segura.</p>
            </footer>
        </div>
    );
};

export default SharedPublisherReport;
