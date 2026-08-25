
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { ProgramData, AssignmentHistory, ParticipantLists } from './types';
import { useCongregation } from './CongregationContext';

const managerConfig = [
    { type: 'presidentes', tableName: 'lista_encargados' },
    { type: 'consejeros', tableName: 'consejeros' },
    { type: 'oradores', tableName: 'oradores' },
    { type: 'discursantes', tableName: 'discursantes' },
    { type: 'lectores', tableName: 'lectores' },
    { type: 'lectores_libro', tableName: 'lectores_libro' },
    { type: 'publicadores', tableName: 'publicadores' },
    { type: 'maestros_discurso', tableName: 'maestros_discurso' }
];

// Helper to strip personal assignments but keep structure (themes, songs, times)
const cleanAssignments = (data: any) => {
    if (!data) return {};
    const clean = JSON.parse(JSON.stringify(data));
    
    // Clear singular assignments
    if (clean.presidentes) {
        clean.presidentes.principal = "";
        clean.presidentes.aux2 = "";
        clean.presidentes.aux3 = "";
    }
    if (clean.oracion) {
        clean.oracion.inicio = "";
        clean.oracion.final = "";
    }
    
    // Clear Tesoros assignments (keep titles)
    if (clean.tesoros) {
        if (clean.tesoros.p1) clean.tesoros.p1.main = "";
        if (clean.tesoros.p2) clean.tesoros.p2.main = "";
        if (clean.tesoros.p3) {
            clean.tesoros.p3.main = "";
            clean.tesoros.p3.aux2 = "";
            clean.tesoros.p3.aux3 = "";
        }
    }
    
    // Clear Maestros assignments (keep titles)
    if (clean.maestros && Array.isArray(clean.maestros)) {
        clean.maestros.forEach((m: any) => {
            m.main = "";
            m.aux2 = "";
            m.aux3 = "";
        });
    }
    
    // Clear Vida Cristiana assignments (keep titles)
    if (clean.vidaCristiana && Array.isArray(clean.vidaCristiana)) {
        clean.vidaCristiana.forEach((v: any) => {
            if (v.hasOwnProperty('conductor')) v.conductor = "";
            if (v.hasOwnProperty('lector')) v.lector = "";
            if (v.hasOwnProperty('discursante')) v.discursante = "";
        });
    }
    
    return clean;
};

// Helper to merge a base program (structure) with local program (assignments)
const mergePrograms = (baseProgram: any, localProgram: any) => {
    if (!baseProgram) return localProgram;
    if (!localProgram) return baseProgram;

    const merged = JSON.parse(JSON.stringify(localProgram));
    const base = baseProgram.data || {};
    
    // Ensure data object exists
    if (!merged.data) merged.data = {};

    // Copy structural fields from base if missing in local
    merged.data.titulo = merged.data.titulo || base.titulo;
    merged.data.canciones = { ...base.canciones, ...merged.data.canciones };
    // Merge oracion structure (but base is already cleaned of names in the calling function)
    merged.data.oracion = { ...base.oracion, ...merged.data.oracion }; 
    merged.data.sectionTitles = { ...base.sectionTitles, ...merged.data.sectionTitles };

    // Explicitly preserve config fields (Watermark & Blur)
    // Priority: Local > Base > Default
    merged.data.watermark = merged.data.watermark ?? base.watermark ?? 'PRELIMINAR';
    merged.data.isBlurred = merged.data.isBlurred ?? base.isBlurred ?? false;

    // Merge Tesoros (Structure vs Assignments)
    if (base.tesoros) {
        merged.data.tesoros = merged.data.tesoros || {};
        ['p1', 'p2', 'p3'].forEach(k => {
            if (base.tesoros[k]) {
                merged.data.tesoros[k] = { ...base.tesoros[k], ...merged.data.tesoros[k] };
                // Ensure title comes from base
                if (base.tesoros[k].title) merged.data.tesoros[k].title = base.tesoros[k].title;
            }
        });
    }

    // Merge Maestros (Array matching)
    if (base.maestros && Array.isArray(base.maestros)) {
        merged.data.maestros = merged.data.maestros || [];
        base.maestros.forEach((baseItem: any, index: number) => {
            if (!merged.data.maestros[index]) merged.data.maestros[index] = {};
            // Structure from base, assignments from local
            merged.data.maestros[index].title = baseItem.title;
            merged.data.maestros[index].time = baseItem.time;
        });
    }

    // Merge Vida Cristiana
    if (base.vidaCristiana && Array.isArray(base.vidaCristiana)) {
        merged.data.vidaCristiana = merged.data.vidaCristiana || [];
        base.vidaCristiana.forEach((baseItem: any, index: number) => {
            if (!merged.data.vidaCristiana[index]) merged.data.vidaCristiana[index] = {};
            merged.data.vidaCristiana[index].titulo = baseItem.titulo;
            merged.data.vidaCristiana[index].time = baseItem.time;
            merged.data.vidaCristiana[index].numero = baseItem.numero;
            // Preserves assignment properties (conductor, lector, discursante) if they exist in local
        });
    }

    return merged;
};

const createUnifiedHistory = (programs: any[]): AssignmentHistory => {
    const history: AssignmentHistory = new Map();
    const addHistoryEntry = (name: string | null | undefined, date: string, description: string) => {
        if (!name || name.trim() === '') return;
        const names = name.split('/').map(n => n.trim()).filter(Boolean);
        names.forEach((p, index) => {
            const roleSuffix = names.length > 1 ? (index === 0 ? ' (Enc.)' : ' (Ayu.)') : '';
            if (!history.has(p)) {
                history.set(p, { mostRecent: '0000-00-00', assignments: [] });
            }
            const personHistory = history.get(p)!;
            if (!personHistory.assignments.some(a => a.date === date && a.description === (description + roleSuffix))) {
                personHistory.assignments.push({ date, description: description + roleSuffix });
            }
            if (date > personHistory.mostRecent) {
                personHistory.mostRecent = date;
            }
        });
    };

    programs.forEach(prog => {
        const data = prog.data || {};
        const week_id = prog.week_id;

        addHistoryEntry(data.presidentes?.principal, week_id, "Presidente");
        addHistoryEntry(data.presidentes?.aux2, week_id, "Consejero");
        addHistoryEntry(data.presidentes?.aux3, week_id, "Consejero");
        addHistoryEntry(data.oracion?.inicio, week_id, "Oración Inicio");
        addHistoryEntry(data.oracion?.final, week_id, "Oración Final");
        if(data.tesoros?.p1) addHistoryEntry(data.tesoros.p1.main, week_id, data.tesoros.p1.title);
        if(data.tesoros?.p2) addHistoryEntry(data.tesoros.p2.main, week_id, data.tesoros.p2.title);
        if(data.tesoros?.p3) {
             ['main', 'aux2', 'aux3'].forEach(room => {
                addHistoryEntry(data.tesoros.p3[room], week_id, `Lectura Biblia`);
            });
        }
        (data.maestros || []).forEach((part: any) => {
            const cleanTitle = part.title ? part.title.replace(/\s*\(\d+\s*min(s)?\.?\)/i, '').trim() : `SMM`;
            ['main', 'aux2', 'aux3'].forEach(room => {
                addHistoryEntry(part[room], week_id, cleanTitle);
            });
        });
        (data.vidaCristiana || []).forEach((part: any) => {
            if (part.hasOwnProperty('conductor')) {
                addHistoryEntry(part.conductor, week_id, "Libro de Congregación");
            }
            if (part.hasOwnProperty('lector')) {
                addHistoryEntry(part.lector, week_id, "Lector del Libro");
            }
            if (part.hasOwnProperty('discursante')) {
                if (part.titulo?.toLowerCase().includes('necesidades')) {
                    addHistoryEntry(part.discursante, week_id, "Necesidades de Cong.");
                } else {
                    addHistoryEntry(part.discursante, week_id, "Discurso Vida Cr.");
                }
            }
        });
    });

    for (let personHistory of history.values()) {
        personHistory.assignments.sort((a, b) => b.date.localeCompare(a.date));
    }
    return history;
};


let globalDataCache: { [congId: number]: { data: ProgramData, timestamp: number } } = {};
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

export const useProgramData = () => {
    const { currentCongregation } = useCongregation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<ProgramData>({ programs: [], lists: {}, history: new Map(), rawLocalPrograms: [] });

    const fetchData = useCallback(async (forceFetch = false) => {
        if (!currentCongregation) return;
        
        const congId = currentCongregation.id;
        if (!forceFetch && globalDataCache[congId]) {
            const cached = globalDataCache[congId];
            if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
                setData(cached.data);
                setLoading(false);
                return; // Return cached data quickly
            }
        }
        
        // Only trigger loading state if we have no programs to display yet
        // to prevent full-screen flashing during background refetches
        if (data.programs.length === 0) {
            setLoading(true);
        }
        setError(null);

        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                const selectPromises = managerConfig.map(m => 
                    supabase.from(m.tableName)
                        .select(m.type === 'publicadores' ? "id, nombre, genero" : "id, nombre")
                        .eq('congregation_id', currentCongregation.id)
                        .order("nombre")
                );
                
                // 1. Fetch Local Programs (Assignments specifically for this congregation)
                const localProgramPromise = supabase
                    .from("programas")
                    .select("week_id, data")
                    .eq('congregation_id', currentCongregation.id)
                    .order("week_id", { ascending: false });

                // 2. Fetch Base Programs (Source of Truth for structure, e.g. from Congregation ID 1)
                const baseProgramPromise = supabase
                    .from("programas")
                    .select("week_id, data")
                    .eq('congregation_id', 1) 
                    .order("week_id", { ascending: false });
                
                // Use Promise.allSettled to handle potential failures in base program fetch
                const results = await Promise.allSettled([
                    localProgramPromise, 
                    baseProgramPromise, 
                    ...selectPromises
                ]);

                // Check Local Program Result
                const localRes = results[0].status === 'fulfilled' ? results[0].value : { data: [], error: results[0].reason };
                if (localRes.error) throw localRes.error;

                // Check Base Program Result (Soft Fail)
                const baseRes = results[1].status === 'fulfilled' ? results[1].value : { data: [], error: null }; 

                const lists: ParticipantLists = {};
                const now = new Date().toISOString();
                const hiddenSettings = currentCongregation?.settings?.hidden_participants || {};

                // Process Lists
                results.slice(2).forEach((res, index) => {
                    if (res.status === 'fulfilled') {
                        const rawData = (res.value.data as any) || [];
                        // Filter out hidden participants
                        lists[managerConfig[index].type] = rawData.filter((p: any) => {
                            const hideUntil = hiddenSettings[p.nombre];
                            if (hideUntil && hideUntil > now) {
                                return false; // Name is hidden
                            }
                            return true;
                        });
                    } else {
                        // Soft fail for individual lists
                        console.warn(`Error loading ${managerConfig[index].type}:`, res.reason);
                        lists[managerConfig[index].type] = [];
                    }
                });
                
                const localProgramsRaw = localRes.data || [];
                const localPrograms = localProgramsRaw.map((p: any) => {
                    if (currentCongregation.id === 1) return p;
                    const suffix = `-${currentCongregation.id}`;
                    if (p.week_id.endsWith(suffix)) {
                        return {
                            ...p,
                            week_id: p.week_id.slice(0, -suffix.length)
                        };
                    }
                    return p;
                });
                const basePrograms = baseRes.data || [];

                // 3. Merge Logic
                const allWeekIds = new Set([...localPrograms.map((p: any) => p.week_id), ...basePrograms.map((p: any) => p.week_id)]);
                
                const mergedPrograms = Array.from(allWeekIds).map(weekId => {
                    const local = localPrograms.find((p: any) => p.week_id === weekId);
                    const base = basePrograms.find((p: any) => p.week_id === weekId);
                    
                    // CRITICAL: Clean the base data to ensure no assignments from the source congregation leak into this one
                    const baseCleanData = base ? cleanAssignments(base.data) : null;
                    const baseCleanProgram = base ? { ...base, data: baseCleanData } : null;

                    if (local && baseCleanProgram) {
                        return { week_id: weekId, data: mergePrograms(baseCleanProgram, local).data, dbId: local.week_id };
                    } else if (local) {
                        return { ...local, dbId: local.week_id };
                    } else if (baseCleanProgram) {
                        return { week_id: weekId, data: baseCleanProgram.data, dbId: null }; 
                    }
                    return null;
                }).filter(Boolean).sort((a: any, b: any) => b.week_id.localeCompare(a.week_id));

                const history = createUnifiedHistory(mergedPrograms);
                
                const newData = { programs: mergedPrograms, lists, history, rawLocalPrograms: localPrograms };
                globalDataCache[currentCongregation.id] = { data: newData, timestamp: Date.now() };

                setData(newData);
                
                // Emitting an event so other components that didn't call refetch
                // but are mounted (like display: none tabs) get the fresh data.
                window.dispatchEvent(new CustomEvent('programDataUpdated', { detail: { congId: currentCongregation.id, data: newData } }));
                
                // If successful, break retry loop
                break; 

            } catch (err: any) {
                attempts++;
                console.warn(`Attempt ${attempts} failed:`, err);
                
                if (attempts >= maxAttempts) {
                    const msg = (err.message && err.message.includes('Failed to fetch')) 
                        ? 'Problema de conexión. Verifique su internet.' 
                        : (err.message || 'Error desconocido al cargar datos.');
                    setError(msg);
                } else {
                    // Backoff: 500ms, 1000ms...
                    await new Promise(resolve => setTimeout(resolve, 500 * attempts));
                }
            }
        }
        setLoading(false);
    }, [currentCongregation]);

    useEffect(() => {
        // Reset data when congregation changes to prevent showing old data or old loading state
        setData({ programs: [], lists: {}, history: new Map(), rawLocalPrograms: [] });
    }, [currentCongregation]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const handleDataUpdated = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (currentCongregation && customEvent.detail.congId === currentCongregation.id) {
                setData(customEvent.detail.data);
            }
        };
        
        window.addEventListener('programDataUpdated', handleDataUpdated);
        return () => window.removeEventListener('programDataUpdated', handleDataUpdated);
    }, [currentCongregation]);

    const refetch = useCallback(() => {
        fetchData(true);
    }, [fetchData]);

    return { ...data, loading, error, refetch };
};
