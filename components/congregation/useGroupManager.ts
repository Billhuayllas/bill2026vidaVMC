
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Group, GroupMember, Publisher, MinistryReport, VisitData, ReportsMap, VisitsMap, PublisherRole, AggregatedGroupStats, RoleStats, MonthlyChange } from './types';
import { useCongregation } from '../../lib/CongregationContext';
import { saveCompleteBackupToSupabase } from '../../lib/backupUtils';

export const useGroupManager = () => {
    const { currentCongregation } = useCongregation();
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [masterPublishers, setMasterPublishers] = useState<Publisher[]>([]);
    const [reports, setReportsState] = useState<ReportsMap>({});
    const reportsRef = useRef<ReportsMap>({});

    const setReports = (updater: ReportsMap | ((prev: ReportsMap) => ReportsMap)) => {
        if (typeof updater === 'function') {
            const next = updater(reportsRef.current);
            reportsRef.current = next;
            setReportsState(next);
        } else {
            reportsRef.current = updater;
            setReportsState(updater);
        }
    };
    const [visits, setVisitsState] = useState<VisitsMap>({});
    const visitsRef = useRef<VisitsMap>({});

    const setVisits = (updater: VisitsMap | ((prev: VisitsMap) => VisitsMap)) => {
        if (typeof updater === 'function') {
            const next = updater(visitsRef.current);
            visitsRef.current = next;
            setVisitsState(next);
        } else {
            visitsRef.current = updater;
            setVisitsState(updater);
        }
    };
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState<string>('');
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [missingColumns, setMissingColumns] = useState<string[]>([]);
    
    // New state for global summary
    const [globalStats, setGlobalStats] = useState<AggregatedGroupStats[]>([]);
    const [globalMembers, setGlobalMembers] = useState<GroupMember[]>([]);
    const [loadingGlobal, setLoadingGlobal] = useState(false);
    const [monthlyChanges, setMonthlyChanges] = useState<MonthlyChange[]>([]);

    // Initial Load
    useEffect(() => {
        const now = new Date();
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        const yyyy = prevMonthDate.getFullYear();
        const mm = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
        setCurrentMonth(`${yyyy}-${mm}`);
    }, []);

    useEffect(() => {
        if (currentCongregation) {
            fetchGroups();
            fetchMasterPublishers();
        }
    }, [currentCongregation]);

    // Load Data
    const fetchGroups = async () => {
        if (!currentCongregation) return;
        try {
            const { data, error } = await supabase.from('grupos')
                .select('*')
                .eq('congregation_id', currentCongregation.id)
                .order('nombre');
            
            if (error) throw error;
            if (data) {
                setGroups(data);
                if (data.length > 0) {
                    const defaultGroup = data.find(g => g.nombre.includes('5')) || data[0];
                    setSelectedGroupId(prev => prev ? prev : defaultGroup.id);
                } else if (data.length === 0) {
                    setSelectedGroupId(null);
                }
            }
        } catch (e: any) {
            console.error("Error fetching groups:", e);
            setStatusMessage({ text: `Error grupos: ${e.message || JSON.stringify(e)}`, type: 'error' });
        }
    };

    const fetchMasterPublishers = async () => {
        if (!currentCongregation) return;
        try {
            const { data, error } = await supabase.from('publicadores')
                .select('id, nombre, nombre_completo, direccion, contacto_emergencia, telefono_personal, genero, fecha_nacimiento, fecha_bautismo, esperanza, clasificacion_vmt, inicio_precursor_mes, fecha_nombramiento, rol')
                .eq('congregation_id', currentCongregation.id)
                .order('nombre');
            
            if (error) {
                if (error.message.includes('nombre_completo') || error.message.includes('direccion') || error.message.includes('contacto_emergencia') || error.message.includes('telefono_personal') || error.message.includes('fecha_nacimiento') || error.message.includes('esperanza') || error.message.includes('clasificacion_vmt') || error.message.includes('inicio_precursor_mes') || error.message.includes('fecha_nombramiento')) {
                    // Fallback to fetch without those new columns
                    const { data: fallbackData, error: fallbackError } = await supabase.from('publicadores')
                        .select('id, nombre')
                        .eq('congregation_id', currentCongregation.id)
                        .order('nombre');
                        
                    if (fallbackError) throw fallbackError;
                    if (fallbackData) setMasterPublishers(fallbackData);
                    
                    if (error.message.includes('nombre_completo')) registerMissingColumn('nombre_completo_publicadores');
                    if (error.message.includes('direccion')) registerMissingColumn('direccion_publicadores');
                    if (error.message.includes('contacto_emergencia')) registerMissingColumn('contacto_emergencia_publicadores');
                    if (error.message.includes('telefono_personal')) registerMissingColumn('telefono_personal_publicadores');
                    if (error.message.includes('fecha_nacimiento')) registerMissingColumn('fecha_nacimiento_publicadores');
                    if (error.message.includes('fecha_bautismo')) registerMissingColumn('fecha_bautismo_publicadores');
                    if (error.message.includes('esperanza')) registerMissingColumn('esperanza_publicadores');
                    if (error.message.includes('clasificacion_vmt')) registerMissingColumn('clasificacion_vmt_publicadores');
                    if (error.message.includes('inicio_precursor_mes')) registerMissingColumn('inicio_precursor_mes_publicadores');
                    if (error.message.includes('fecha_nombramiento')) registerMissingColumn('fecha_nombramiento_publicadores');
                    return;
                }
                throw error;
            }
            if (data) setMasterPublishers(data);
        } catch (e: any) {
            console.error("Error fetching publishers:", e);
        }
    };

    const fetchMembers = useCallback(async () => {
        if (!selectedGroupId || !currentCongregation || !currentMonth) return;
        setLoading(true);
        try {
            // 1. Fetch current database members for this group
            const { data: dbMembers, error: dbErr } = await supabase.from('miembros_grupo')
                .select('*')
                .eq('grupo_id', selectedGroupId)
                .order('publicador_nombre');
            
            if (dbErr) throw dbErr;
            
            // 2. Fetch all reports for this month and congregation
            const { data: monthReports, error: repErr } = await supabase.from('informes_ministerio')
                .select('*')
                .eq('mes', currentMonth)
                .eq('congregation_id', currentCongregation.id);
                
            if (repErr) throw repErr;

            let resolvedMembers: GroupMember[] = [];
            const resolvedNamesSet = new Set<string>();

            // Process dbMembers
            (dbMembers || []).forEach((m: any) => {
                // Check if created_at is in a future month relative to currentMonth
                if (m.created_at && m.created_at.length >= 7) {
                    try {
                        const memberMonth = m.created_at.substring(0, 7); // 'YYYY-MM'
                        const [year, month] = memberMonth.split('-').map(Number);
                        if (!isNaN(year) && !isNaN(month)) {
                            const prevMonthDate = new Date(year, month - 2, 1);
                            const memberPrevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
                            if (currentMonth < memberPrevMonth) {
                                // Exclude if currentMonth is older than the month before creation
                                return;
                            }
                        }
                    } catch (err) {
                        console.error("Error parsing member created_at:", err);
                    }
                }

                // Check if they have a report in this month
                const r = (monthReports || []).find((rep: any) => rep.publicador_nombre.trim().toLowerCase() === m.publicador_nombre.trim().toLowerCase());
                
                let resolvedGroupId = selectedGroupId;
                let resolvedRol = m.rol || 'Publicador';

                if (r && r.notas) {
                    // Extract group ID if explicitly tagged
                    const matchGroupId = r.notas.match(/\{\{grupo_id:(\d+)\}\}/);
                    if (matchGroupId) {
                        resolvedGroupId = parseInt(matchGroupId[1], 10);
                    }

                    // Extract role if explicitly tagged
                    const matchRol = r.notas.match(/\{\{rol:(.*?)\}\}/);
                    if (matchRol) {
                        resolvedRol = matchRol[1];
                    }
                }

                // If they still belong to this group in this month, add them
                if (resolvedGroupId === selectedGroupId) {
                    resolvedMembers.push({
                        id: m.id,
                        grupo_id: selectedGroupId,
                        publicador_nombre: m.publicador_nombre,
                        rol: resolvedRol as any,
                        created_at: m.created_at
                    });
                    resolvedNamesSet.add(m.publicador_nombre.trim().toLowerCase());
                }
            });

            // Now, find any reports that explicitly map to this group, but whose publishers are NOT currently in dbMembers
            (monthReports || []).forEach((r: any) => {
                const pnameLower = r.publicador_nombre.trim().toLowerCase();
                if (resolvedNamesSet.has(pnameLower)) return;

                const notes = r.notas || '';
                const matchGroupId = notes.match(/\{\{grupo_id:(\d+)\}\}/);
                if (matchGroupId) {
                    const resolvedGroupId = parseInt(matchGroupId[1], 10);
                    if (resolvedGroupId === selectedGroupId) {
                        let resolvedRol = 'Publicador';
                        const matchRol = notes.match(/\{\{rol:(.*?)\}\}/);
                        if (matchRol) {
                            resolvedRol = matchRol[1];
                        }

                        resolvedMembers.push({
                            id: r.id, // Fallback to report ID
                            grupo_id: selectedGroupId,
                            publicador_nombre: r.publicador_nombre,
                            rol: resolvedRol as any,
                        });
                        resolvedNamesSet.add(pnameLower);
                    }
                }
            });

            setMembers(resolvedMembers);
        } catch (e: any) {
            console.error("Error fetching members:", e);
            setStatusMessage({ text: `Error miembros: ${e.message || JSON.stringify(e)}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [selectedGroupId, currentCongregation, currentMonth]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const fetchReportData = useCallback(async () => {
        if (!currentMonth || members.length === 0 || !currentCongregation) return;
        
        try {
            const memberNames = members.map(m => m.publicador_nombre).filter(Boolean);
            if (memberNames.length === 0) return;

            // 1. REPORTS QUERY
            const { data: reportsData, error: reportsError } = await supabase
                .from('informes_ministerio')
                .select('*')
                .eq('mes', currentMonth)
                .eq('congregation_id', currentCongregation.id) // Ensure we only get reports for this cong
                .in('publicador_nombre', memberNames);
            
            if (reportsError) {
                console.error("[Supabase Reports Error]", reportsError);
                throw new Error(`DB Reports: ${reportsError.message}`);
            }

            const newReports: ReportsMap = {};
            if (reportsData) {
                reportsData.forEach((r: any) => { 
                    if (!r.publicador_nombre) return;
                    
                    let estudiosVal: number | '' = '';
                    let specialHoursVal: number | '' = '';
                    let notasVal = r.notas || '';
                    let participoVal = true; // Default to true if not specified
                    let lockedVal = false;
                    
                    const matchLocked = notasVal.match(/\{\{locked:(true|false)\}\}/);
                    if (matchLocked) {
                        lockedVal = matchLocked[1] === 'true';
                        notasVal = notasVal.replace(matchLocked[0], '').trim();
                    }

                    const matchPart = notasVal.match(/\{\{participo:(true|false)\}\}/);
                    if (matchPart) {
                        participoVal = matchPart[1] === 'true';
                        notasVal = notasVal.replace(matchPart[0], '').trim();
                    }

                    if (r.estudios !== undefined && r.estudios !== null) {
                        estudiosVal = r.estudios;
                    } else {
                        const match = notasVal.match(/\{\{estudios:(\d+)\}\}/);
                        if (match) {
                            estudiosVal = parseInt(match[1], 10);
                            notasVal = notasVal.replace(match[0], '').trim();
                        }
                    }

                    if (r.horas_especiales !== undefined && r.horas_especiales !== null) {
                        specialHoursVal = r.horas_especiales;
                    } else {
                        const match = notasVal.match(/\{\{he:(\d+(\.\d+)?)\}\}/);
                        if (match) {
                            specialHoursVal = parseFloat(match[1]);
                            notasVal = notasVal.replace(match[0], '').trim();
                        }
                    }

                    newReports[r.publicador_nombre] = { 
                        horas: (r.horas !== null && r.horas !== undefined) ? r.horas : '', 
                        horas_especiales: (specialHoursVal !== null && specialHoursVal !== undefined) ? specialHoursVal : '',
                        estudios: (estudiosVal !== null && estudiosVal !== undefined) ? estudiosVal : '',
                        participo: participoVal,
                        notas: notasVal,
                        locked: lockedVal
                    }; 
                });
            }
            
            setReports(prev => {
                const next = { ...prev };
                memberNames.forEach(name => {
                    if (newReports[name]) next[name] = newReports[name];
                    else delete next[name];
                });
                return next;
            });

            // 2. VISITS QUERY
            const { data: visitsData, error: visitsError } = await supabase
                .from('visitas_pastoral')
                .select('*')
                .in('publicador_nombre', memberNames);
            
            if (visitsError) throw new Error(`DB Visits: ${visitsError.message}`);

            const newVisits: VisitsMap = {};
            if (visitsData) {
                visitsData.forEach((v: any) => { 
                    if (v.publicador_nombre) {
                        newVisits[v.publicador_nombre] = { date: v.fecha_visita, notes: v.notas || '' }; 
                    }
                });
            }
            setVisits(newVisits);

        } catch (e: any) {
            console.error("CRITICAL FETCH ERROR:", e);
            setStatusMessage({ text: `Error carga: ${e.message}`, type: 'error' });
        }
    }, [currentMonth, members, currentCongregation]);

    useEffect(() => { fetchReportData(); }, [fetchReportData]);

    const registerMissingColumn = (col: string) => {
        setMissingColumns(prev => prev.includes(col) ? prev : [...prev, col]);
    };

    // --- NEW: FETCH GLOBAL STATS FOR ALL GROUPS ---
    const fetchGlobalCongregationData = useCallback(async () => {
        if (!currentMonth || !currentCongregation) return;
        setLoadingGlobal(true);
        try {
            // 1. Get all groups
            const { data: allGroups, error: groupsErr } = await supabase.from('grupos')
                .select('*')
                .eq('congregation_id', currentCongregation.id)
                .order('nombre');
            if (groupsErr) throw groupsErr;

            // 2. Get all members
            const groupIds = allGroups.map(g => g.id);
            const { data: allMembers, error: membersErr } = await supabase.from('miembros_grupo')
                .select('*')
                .in('grupo_id', groupIds);
            
            if (membersErr) throw membersErr;

            // 3. Get all reports for the month
            const { data: allReports, error: reportsErr } = await supabase.from('informes_ministerio')
                .select('*')
                .eq('mes', currentMonth)
                .eq('congregation_id', currentCongregation.id);
                
            if (reportsErr) throw reportsErr;

            // 3b. Get previous month's reports to calculate changes
            const [year, month] = currentMonth.split('-').map(Number);
            const prevMonthDate = new Date(year, month - 2, 1);
            const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
            
            const { data: prevReports } = await supabase.from('informes_ministerio')
                .select('*')
                .eq('mes', prevMonth)
                .eq('congregation_id', currentCongregation.id);

            // Resolve members and roles on a per-month basis
            const resolvedMembers: any[] = [];
            const resolvedNamesSet = new Set<string>();

            // Process allMembers
            (allMembers || []).forEach((m: any) => {
                // Check if created_at is in a future month relative to currentMonth
                if (m.created_at && m.created_at.length >= 7) {
                    try {
                        const memberMonth = m.created_at.substring(0, 7); // 'YYYY-MM'
                        const [year, month] = memberMonth.split('-').map(Number);
                        if (!isNaN(year) && !isNaN(month)) {
                            const prevMonthDate = new Date(year, month - 2, 1);
                            const memberPrevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
                            if (currentMonth < memberPrevMonth) {
                                // Exclude if currentMonth is older than the month before creation
                                return;
                            }
                        }
                    } catch (err) {
                        console.error("Error parsing member created_at:", err);
                    }
                }

                // Check if they have a report in this month
                const r = (allReports || []).find((rep: any) => rep.publicador_nombre.trim().toLowerCase() === m.publicador_nombre.trim().toLowerCase());
                
                let resolvedGroupId = m.grupo_id;
                let resolvedRol = m.rol || 'Publicador';

                if (r && r.notas) {
                    const matchGroupId = r.notas.match(/\{\{grupo_id:(\d+)\}\}/);
                    if (matchGroupId) {
                        resolvedGroupId = parseInt(matchGroupId[1], 10);
                    }

                    const matchRol = r.notas.match(/\{\{rol:(.*?)\}\}/);
                    if (matchRol) {
                        resolvedRol = matchRol[1];
                    }
                }

                resolvedMembers.push({
                    id: m.id,
                    grupo_id: resolvedGroupId,
                    publicador_nombre: m.publicador_nombre,
                    rol: resolvedRol,
                    created_at: m.created_at
                });
                resolvedNamesSet.add(m.publicador_nombre.trim().toLowerCase());
            });

            // Now, find any reports that explicitly map to a group, but whose publishers are NOT currently in allMembers
            (allReports || []).forEach((r: any) => {
                const pnameLower = r.publicador_nombre.trim().toLowerCase();
                if (resolvedNamesSet.has(pnameLower)) return;

                const notes = r.notas || '';
                const matchGroupId = notes.match(/\{\{grupo_id:(\d+)\}\}/);
                if (matchGroupId) {
                    const resolvedGroupId = parseInt(matchGroupId[1], 10);
                    if (groupIds.includes(resolvedGroupId)) {
                        let resolvedRol = 'Publicador';
                        const matchRol = notes.match(/\{\{rol:(.*?)\}\}/);
                        if (matchRol) {
                            resolvedRol = matchRol[1];
                        }

                        resolvedMembers.push({
                            id: r.id, // Fallback to report ID
                            grupo_id: resolvedGroupId,
                            publicador_nombre: r.publicador_nombre,
                            rol: resolvedRol,
                        });
                        resolvedNamesSet.add(pnameLower);
                    }
                }
            });

            setGlobalMembers(resolvedMembers);

            // Calculate changes compared to previous month
            const changesList: MonthlyChange[] = [];
            
            // Only compare changes if we have report data from the previous month.
            // If prevReports is empty, it means we don't have a reliable history to compare against,
            // preventing the spam of treating all established publishers as "new" during the initial setup month.
            if (prevReports && prevReports.length > 0) {
                resolvedMembers.forEach((m: any) => {
                    const currRol = m.rol;
                    const currGroupId = m.grupo_id;
                    
                    const rPrev = prevReports.find((rep: any) => rep.publicador_nombre.trim().toLowerCase() === m.publicador_nombre.trim().toLowerCase());
                    
                    // A member is newly added in the current month only if:
                    // 1. They don't have a report in the previous month (rPrev is undefined)
                    // 2. AND they were created in the database during the currentMonth
                    let isNew = false;
                    if (!rPrev && m.created_at && m.created_at.substring(0, 7) === currentMonth) {
                        isNew = true;
                    }
                    
                    if (isNew) {
                        changesList.push({
                            publisherName: m.publicador_nombre,
                            type: 'new',
                            toValue: currRol
                        });
                        return;
                    }
                    
                    // Otherwise resolve previous values
                    const dbMem = (allMembers || []).find((dm: any) => dm.publicador_nombre.trim().toLowerCase() === m.publicador_nombre.trim().toLowerCase());
                    let prevGroupId = dbMem ? dbMem.grupo_id : currGroupId;
                    let prevRol = dbMem ? (dbMem.rol || 'Publicador') : 'Publicador';
                    
                    if (rPrev && rPrev.notas) {
                        const matchGroupId = rPrev.notas.match(/\{\{grupo_id:(\d+)\}\}/);
                        if (matchGroupId) {
                            prevGroupId = parseInt(matchGroupId[1], 10);
                        }
                        const matchRol = rPrev.notas.match(/\{\{rol:(.*?)\}\}/);
                        if (matchRol) {
                            prevRol = matchRol[1];
                        }
                    }
                    
                    // Only track role and group changes if the publisher existed in the previous month
                    if (rPrev) {
                        if (prevRol !== currRol) {
                            changesList.push({
                                publisherName: m.publicador_nombre,
                                type: 'role',
                                fromValue: prevRol,
                                toValue: currRol
                            });
                        }
                        
                        if (prevGroupId !== currGroupId) {
                            const prevGroupName = allGroups.find(g => g.id === prevGroupId)?.nombre || `Grupo ${prevGroupId}`;
                            const currGroupName = allGroups.find(g => g.id === currGroupId)?.nombre || `Grupo ${currGroupId}`;
                            changesList.push({
                                publisherName: m.publicador_nombre,
                                type: 'group',
                                fromValue: prevGroupName,
                                toValue: currGroupName
                            });
                        }
                    }
                });
                
                // Detect removed publishers (only if they had a report in the previous month but not in this month)
                prevReports.forEach((pr: any) => {
                    const nameLower = pr.publicador_nombre.trim().toLowerCase();
                    const stillExists = resolvedMembers.some(rm => rm.publicador_nombre.trim().toLowerCase() === nameLower);
                    if (!stillExists) {
                        changesList.push({
                            publisherName: pr.publicador_nombre,
                            type: 'removed'
                        });
                    }
                });
            }

            setMonthlyChanges(changesList);

            // 4. Process data
            const statsByGroup: AggregatedGroupStats[] = allGroups.map(group => {
                const groupMembers = resolvedMembers.filter((m: any) => m.grupo_id === group.id);
                
                let totalHours = 0;
                let totalStudies = 0;
                let submittedCount = 0;
                
                const roleStats = {
                    pr: { count: 0, hours: 0, studies: 0 },
                    pa: { count: 0, hours: 0, studies: 0 },
                    pe: { count: 0, hours: 0, studies: 0 },
                    pub: { count: 0, hours: 0, studies: 0 }
                };

                let noStudiesCount = 0;

                groupMembers.forEach((m: any) => {
                    const rol = m.rol || 'Publicador';
                    let roleKey: 'pr' | 'pa' | 'pe' | 'pub' = 'pub';
                    
                    if (rol.includes('Precursor Regular')) roleKey = 'pr';
                    else if (rol.includes('Precursor Auxiliar')) roleKey = 'pa';
                    else if (rol.includes('Precursor Especial')) roleKey = 'pe';
                    
                    roleStats[roleKey].count++;

                    const r = (allReports || []).find((rep: any) => rep.publicador_nombre.trim().toLowerCase() === m.publicador_nombre.trim().toLowerCase());
                    if (r) {
                        submittedCount++;
                        let h = Number(r.horas || 0);
                        let he = Number(r.horas_especiales || 0);
                        let est = Number(r.estudios || 0);

                        const notes = r.notas || '';
                        if (r.estudios === null || r.estudios === undefined) {
                            const matchEst = notes.match(/\{\{estudios:(\d+)\}\}/);
                            if (matchEst) est = parseInt(matchEst[1], 10);
                        }
                        if (r.horas_especiales === null || r.horas_especiales === undefined) {
                            const matchHe = notes.match(/\{\{he:(\d+(\.\d+)?)\}\}/);
                            if (matchHe) he = parseFloat(matchHe[1]);
                        }

                        const memberHours = h + he;
                        
                        totalHours += memberHours;
                        totalStudies += est;
                        
                        roleStats[roleKey].hours += memberHours;
                        roleStats[roleKey].studies += est;

                        if (est === 0) noStudiesCount++;
                    } else {
                        noStudiesCount++; 
                    }
                });

                return {
                    groupId: group.id,
                    groupName: group.nombre,
                    stats: {
                        hours: totalHours,
                        studies: totalStudies,
                        submitted: submittedCount,
                        totalMembers: groupMembers.length,
                        noStudies: noStudiesCount,
                        roles: roleStats
                    }
                };
            });

            setGlobalStats(statsByGroup);

        } catch (e: any) {
            console.error("Error fetching global stats:", e);
            setStatusMessage({ text: `Error resumen: ${e.message}`, type: 'error' });
        } finally {
            setLoadingGlobal(false);
        }
    }, [currentMonth, currentCongregation]);


    // Actions
    const exportBackup = async () => {
        await saveCompleteBackupToSupabase(currentCongregation, setStatusMessage);
    };

    const createGroup = async (name: string) => {
        if (!name.trim() || !currentCongregation) return;
        const { data, error } = await supabase.from('grupos').insert([{ 
            nombre: name.trim(),
            congregation_id: currentCongregation.id
        }]).select();
        
        if (!error && data) {
            setGroups(prev => [...prev, data[0]].sort((a,b) => a.nombre.localeCompare(b.nombre)));
            setSelectedGroupId(data[0].id);
            return true;
        } else if (error) {
            setStatusMessage({ text: `Error crear grupo: ${error.message}`, type: 'error' });
        }
        return false;
    };

    const addMember = async (name: string) => {
        if (!selectedGroupId || !name.trim() || !currentCongregation) return;
        const pname = name.trim();
        
        const { error } = await supabase.from('miembros_grupo').insert([{ 
            grupo_id: selectedGroupId, 
            publicador_nombre: pname,
            rol: 'Publicador' 
        }]);

        if (error) {
            if (error.message.includes('rol') || error.code === 'PGRST204' || error.message.includes('schema cache')) {
                registerMissingColumn('rol');
                const { error: retryError } = await supabase.from('miembros_grupo').insert([{ 
                    grupo_id: selectedGroupId, 
                    publicador_nombre: pname
                }]);
                
                if (retryError) {
                    setStatusMessage({ text: `Error añadir: ${retryError.message}`, type: 'error' });
                } else {
                    // Create the independent month report entry
                    await supabase.from('informes_ministerio').insert([{
                        publicador_nombre: pname,
                        mes: currentMonth,
                        horas: 0,
                        horas_especiales: 0,
                        estudios: 0,
                        notas: `{{grupo_id:${selectedGroupId}}} {{rol:Publicador}}`,
                        congregation_id: currentCongregation.id
                    }]);

                    setStatusMessage({ 
                        text: `Se añadió a ${pname} al grupo para el mes ${currentMonth} de forma independiente.`, 
                        type: 'success' 
                    });
                    setTimeout(() => setStatusMessage(null), 7000);
                    fetchMembers();
                }
            } else {
                setStatusMessage({ text: `Error añadir: ${error.message}`, type: 'error' });
            }
        } else {
            // Create the independent month report entry
            await supabase.from('informes_ministerio').insert([{
                publicador_nombre: pname,
                mes: currentMonth,
                horas: 0,
                horas_especiales: 0,
                estudios: 0,
                notas: `{{grupo_id:${selectedGroupId}}} {{rol:Publicador}}`,
                congregation_id: currentCongregation.id
            }]);

            setStatusMessage({ 
                text: `Se añadió a ${pname} al grupo para el mes ${currentMonth} de forma independiente.`, 
                type: 'success' 
            });
            setTimeout(() => setStatusMessage(null), 7000);
            fetchMembers();
        }
    };

    const deleteMember = async (id: number) => {
        const member = members.find(m => m.id === id);
        const pname = member?.publicador_nombre;

        if (pname && currentCongregation) {
            // Fetch report and remove group mapping or delete if placeholder
            const { data: existingReport } = await supabase.from('informes_ministerio')
                .select('*')
                .eq('publicador_nombre', pname)
                .eq('mes', currentMonth)
                .eq('congregation_id', currentCongregation.id)
                .maybeSingle();

            if (existingReport) {
                let combinedNotas = existingReport.notas || '';
                combinedNotas = combinedNotas.replace(/\{\{grupo_id:.*?\}\}/g, '').trim();
                
                const isPlaceholder = existingReport.horas === 0 && 
                                      existingReport.horas_especiales === 0 && 
                                      existingReport.estudios === 0 && 
                                      (!combinedNotas || combinedNotas.replace(/\{\{rol:.*?\}\}/g, '').trim() === '');
                
                if (isPlaceholder) {
                    await supabase.from('informes_ministerio').delete().eq('id', existingReport.id);
                } else {
                    await supabase.from('informes_ministerio').update({ notas: combinedNotas }).eq('id', existingReport.id);
                }
            }
        }

        const { error } = await supabase.from('miembros_grupo').delete().eq('id', id);
        if (error) {
            setStatusMessage({ text: `Error borrar: ${error.message}`, type: 'error' });
        } else {
            if (pname) {
                setStatusMessage({ 
                    text: `Se removió a ${pname} de este grupo para el mes ${currentMonth} de forma independiente.`, 
                    type: 'success' 
                });
                setTimeout(() => setStatusMessage(null), 7000);
            }
            fetchMembers();
        }
    };

    const updateMemberRole = async (memberId: number, newRole: PublisherRole) => {
        const member = members.find(m => m.id === memberId);
        const oldRole = member ? member.rol : 'Publicador';
        const pname = member?.publicador_nombre;

        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, rol: newRole } : m));
        setGlobalMembers(prev => prev.map(m => m.id === memberId ? { ...m, rol: newRole } : m));
        
        let { error } = await supabase.from('miembros_grupo').update({ rol: newRole }).eq('id', memberId);
        
        if (error) {
            if (error.message.includes('rol') || error.code === 'PGRST204') {
                registerMissingColumn('rol');
            }
            if (pname && currentCongregation) {
                const { error: pubError } = await supabase.from('publicadores')
                    .update({ rol: newRole })
                    .eq('nombre', pname)
                    .eq('congregation_id', currentCongregation.id);
                
                if (pubError) {
                    if (pubError.message.includes('rol')) registerMissingColumn('rol_publicadores');
                    setStatusMessage({ text: `Error: La base de datos necesita actualización.`, type: 'error' });
                }
            } else {
                setStatusMessage({ text: `Error rol: ${error.message}`, type: 'error' });
                fetchMembers();
                return;
            }
        }

        // Now, persist the role change in the current month's report independently!
        if (pname && currentCongregation) {
            const { data: existingReport } = await supabase.from('informes_ministerio')
                .select('*')
                .eq('publicador_nombre', pname)
                .eq('mes', currentMonth)
                .eq('congregation_id', currentCongregation.id)
                .maybeSingle();

            if (existingReport) {
                let combinedNotas = existingReport.notas || '';
                combinedNotas = combinedNotas.replace(/\{\{rol:.*?\}\}/g, '').trim();
                combinedNotas = `${combinedNotas} {{rol:${newRole}}}`.trim();
                
                await supabase.from('informes_ministerio').update({ notas: combinedNotas }).eq('id', existingReport.id);
            } else {
                let combinedNotas = `{{rol:${newRole}}} {{grupo_id:${member?.grupo_id || selectedGroupId}}}`;
                await supabase.from('informes_ministerio').insert([{
                    publicador_nombre: pname,
                    mes: currentMonth,
                    horas: 0,
                    horas_especiales: 0,
                    estudios: 0,
                    notas: combinedNotas,
                    congregation_id: currentCongregation.id
                }]);
            }

            // Also, preserve the historical old role in the previous month's report
            // so that the change is correctly attributed starting only from the currentMonth!
            try {
                const [year, month] = currentMonth.split('-').map(Number);
                const prevMonthDate = new Date(year, month - 2, 1);
                const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

                const { data: prevReport } = await supabase.from('informes_ministerio')
                    .select('*')
                    .eq('publicador_nombre', pname)
                    .eq('mes', prevMonth)
                    .eq('congregation_id', currentCongregation.id)
                    .maybeSingle();

                if (prevReport) {
                    if (!prevReport.notas || !prevReport.notas.includes('{{rol:')) {
                        let combinedNotas = prevReport.notas || '';
                        combinedNotas = `${combinedNotas} {{rol:${oldRole}}}`.trim();
                        await supabase.from('informes_ministerio').update({ notas: combinedNotas }).eq('id', prevReport.id);
                    }
                } else {
                    let combinedNotas = `{{rol:${oldRole}}} {{grupo_id:${member?.grupo_id || selectedGroupId}}}`;
                    await supabase.from('informes_ministerio').insert([{
                        publicador_nombre: pname,
                        mes: prevMonth,
                        horas: 0,
                        horas_especiales: 0,
                        estudios: 0,
                        notas: combinedNotas,
                        congregation_id: currentCongregation.id
                    }]);
                }
            } catch (err) {
                console.error("Error keeping historical role for previous month:", err);
            }

            setStatusMessage({ 
                text: `El rol de ${pname} cambió de "${oldRole}" a "${newRole}" para el mes ${currentMonth} de forma independiente.`, 
                type: 'success' 
            });
            setTimeout(() => setStatusMessage(null), 7000);
            fetchMembers();
        }
    };

    const updatePublisherDetails = async (publisherName: string, direccion: string, contacto_emergencia: string, telefono_personal?: string, genero?: string, fecha_nacimiento?: string, fecha_bautismo?: string, esperanza?: string, inicio_precursor_mes?: string, fecha_nombramiento?: string, nombre_completo?: string) => {
        if (!currentCongregation) return;
        setStatusMessage({ text: 'Actualizando datos...', type: 'info' });
        
        let payload: any = { direccion, contacto_emergencia, telefono_personal: telefono_personal || null, genero, fecha_nacimiento, fecha_bautismo, esperanza, inicio_precursor_mes, fecha_nombramiento, nombre_completo: nombre_completo || null };
        
        const { data: pubExists, error: checkErr } = await supabase.from('publicadores')
            .select('id')
            .eq('nombre', publisherName)
            .eq('congregation_id', currentCongregation.id)
            .maybeSingle();

        if (checkErr) {
            console.error("Error checking publisher:", checkErr);
            setStatusMessage({ text: `Error al verificar publicador: ${checkErr.message}`, type: 'error' });
            return;
        }

        let error;

        if (pubExists) {
            const res = await supabase.from('publicadores')
                .update(payload)
                .eq('nombre', publisherName)
                .eq('congregation_id', currentCongregation.id);
            error = res.error;
        } else {
            const res = await supabase.from('publicadores')
                .insert([{
                    nombre: publisherName,
                    congregation_id: currentCongregation.id,
                    ...payload
                }]);
            error = res.error;
        }
            
        if (error) {
            // Check for missing columns
            if (error.message.includes('direccion') || error.message.includes('contacto_emergencia') || error.message.includes('telefono_personal') || error.message.includes('fecha_nacimiento') || error.message.includes('esperanza') || error.message.includes('inicio_precursor_mes') || error.message.includes('fecha_nombramiento') || error.message.includes('nombre_completo')) {
                if (error.message.includes('direccion')) registerMissingColumn('direccion_publicadores');
                if (error.message.includes('contacto_emergencia')) registerMissingColumn('contacto_emergencia_publicadores');
                if (error.message.includes('telefono_personal')) registerMissingColumn('telefono_personal_publicadores');
                if (error.message.includes('fecha_nacimiento')) registerMissingColumn('fecha_nacimiento_publicadores');
                if (error.message.includes('fecha_bautismo')) registerMissingColumn('fecha_bautismo_publicadores');
                if (error.message.includes('esperanza')) registerMissingColumn('esperanza_publicadores');
                if (error.message.includes('inicio_precursor_mes')) registerMissingColumn('inicio_precursor_mes_publicadores');
                if (error.message.includes('fecha_nombramiento')) registerMissingColumn('fecha_nombramiento_publicadores');
                if (error.message.includes('nombre_completo')) registerMissingColumn('nombre_completo_publicadores');
                
                // Fallback: don't fail the whole save, just don't save those columns
                setStatusMessage({ text: `La base de datos necesita actualización para guardar estos datos.`, type: 'error' });
                return;
            }
            console.error("Error updating publisher details:", error);
            setStatusMessage({ text: `Error al actualizar: ${error.message}`, type: 'error' });
        } else {
            setStatusMessage({ text: 'Datos actualizados con éxito', type: 'success' });
            fetchMasterPublishers();
        }
    };

    const saveRow = async (publisherName: string) => {
        if (!currentCongregation) return;
        setStatusMessage({ text: 'Guardando...', type: 'info' });
        try {
            const reportEntry = reportsRef.current[publisherName];
            
            const { data: existingReport, error: fetchError } = await supabase.from('informes_ministerio')
                .select('id')
                .eq('publicador_nombre', publisherName)
                .eq('mes', currentMonth)
                .eq('congregation_id', currentCongregation.id)
                .maybeSingle();
                
            if (fetchError) throw new Error(`FetchCheck: ${fetchError.message}`);

            if (reportEntry) {
                let combinedNotas = reportEntry.notas || '';
                
                // Clean any existing metadata tags from combinedNotas to avoid duplication
                combinedNotas = combinedNotas.replace(/\{\{locked:(true|false)\}\}/g, '').trim();
                combinedNotas = combinedNotas.replace(/\{\{participo:(true|false)\}\}/g, '').trim();
                combinedNotas = combinedNotas.replace(/\{\{rol:.*?\}\}/g, '').trim();
                combinedNotas = combinedNotas.replace(/\{\{grupo_id:.*?\}\}/g, '').trim();

                if (reportEntry.participo !== undefined) {
                    if (!reportEntry.participo) {
                        combinedNotas = `${combinedNotas} {{participo:false}}`.trim();
                    } else if (reportEntry.horas === 0 || reportEntry.horas === '') {
                        combinedNotas = `${combinedNotas} {{participo:true}}`.trim();
                    }
                }
                if (reportEntry.locked) {
                    combinedNotas = `${combinedNotas} {{locked:true}}`.trim();
                }

                // Find current group member info to get role and group_id
                const memberInfo = members.find(m => m.publicador_nombre === publisherName) || 
                                   globalMembers.find(m => m.publicador_nombre === publisherName);
                const currentRol = memberInfo ? memberInfo.rol : 'Publicador';
                const currentGroupId = memberInfo ? memberInfo.grupo_id : selectedGroupId;

                if (currentRol) {
                    combinedNotas = `${combinedNotas} {{rol:${currentRol}}}`.trim();
                }
                if (currentGroupId) {
                    combinedNotas = `${combinedNotas} {{grupo_id:${currentGroupId}}}`.trim();
                }

                const reportData = { 
                    publicador_nombre: publisherName, 
                    mes: currentMonth, 
                    horas: reportEntry.horas === '' ? 0 : reportEntry.horas,
                    horas_especiales: reportEntry.horas_especiales === '' ? 0 : reportEntry.horas_especiales, 
                    estudios: reportEntry.estudios === '' ? 0 : reportEntry.estudios,
                    notas: combinedNotas,
                    congregation_id: currentCongregation.id
                };

                let query = existingReport 
                    ? supabase.from('informes_ministerio').update(reportData).eq('id', existingReport.id).select()
                    : supabase.from('informes_ministerio').insert([reportData]).select();
                
                let { data: savedData, error } = await query;

                if (error) {
                    const missingEst = error.message.includes('estudios');
                    const missingHe = error.message.includes('horas_especiales');
                    
                    if (missingEst || missingHe) {
                        if (missingEst) registerMissingColumn('estudios');
                        if (missingHe) registerMissingColumn('horas_especiales');

                        let fallbackNotes = reportData.notas;
                        if (reportData.estudios > 0) fallbackNotes = `${fallbackNotes} {{estudios:${reportData.estudios}}}`.trim();
                        if (reportData.horas_especiales > 0) fallbackNotes = `${fallbackNotes} {{he:${reportData.horas_especiales}}}`.trim();

                        const fallbackData = { ...reportData, notas: fallbackNotes };
                        delete (fallbackData as any).estudios;
                        delete (fallbackData as any).horas_especiales;

                        query = existingReport 
                            ? supabase.from('informes_ministerio').update(fallbackData).eq('id', existingReport.id).select()
                            : supabase.from('informes_ministerio').insert([fallbackData]).select();
                        
                        const retry = await query;
                        savedData = retry.data;
                        error = retry.error;
                    }
                }

                if (error) throw new Error(`SaveReport: ${error.message}`);
                
                if (savedData && savedData.length > 0) {
                    let returnedNotes = savedData[0].notas || '';
                    const matchEst = returnedNotes.match(/\{\{estudios:(\d+)\}\}/);
                    if (matchEst) returnedNotes = returnedNotes.replace(matchEst[0], '').trim();
                    const matchHe = returnedNotes.match(/\{\{he:(\d+(\.\d+)?)\}\}/);
                    if (matchHe) returnedNotes = returnedNotes.replace(matchHe[0], '').trim();
                    
                    let returnedParticipo = true;
                    const matchPart = returnedNotes.match(/\{\{participo:(true|false)\}\}/);
                    if (matchPart) {
                        returnedParticipo = matchPart[1] === 'true';
                        returnedNotes = returnedNotes.replace(matchPart[0], '').trim();
                    }

                    setReports(prev => ({ 
                        ...prev, 
                        [publisherName]: { 
                            ...prev[publisherName], 
                            horas: savedData[0].horas,
                            horas_especiales: reportEntry.horas_especiales,
                            estudios: reportEntry.estudios,
                            participo: returnedParticipo,
                            notas: returnedNotes
                        } 
                    }));
                }
            } else if (existingReport) {
                const { error: delError } = await supabase.from('informes_ministerio').delete().eq('id', existingReport.id);
                if (delError) throw new Error(`DelReport: ${delError.message}`);
                setReports(prev => { const n = { ...prev }; delete n[publisherName]; return n; });
            }

            // Upsert Visit
            const visitData = visitsRef.current[publisherName];
            if (visitData && (visitData.date || visitData.notes)) {
                const { data: existingVisit, error: vCheckErr } = await supabase.from('visitas_pastoral').select('id').eq('publicador_nombre', publisherName).maybeSingle();
                if (vCheckErr) throw new Error(`CheckVisit: ${vCheckErr.message}`);

                const visitPayload = { publicador_nombre: publisherName, fecha_visita: visitData.date, notas: visitData.notes };
                let query = existingVisit
                    ? supabase.from('visitas_pastoral').update(visitPayload).eq('id', existingVisit.id)
                    : supabase.from('visitas_pastoral').insert([visitPayload]);
                
                let { error: vSaveErr } = await query;
                if (vSaveErr && vSaveErr.message && vSaveErr.message.includes('notas')) {
                     const fallbackPayload = { ...visitPayload }; delete (fallbackPayload as any).notas;
                     query = existingVisit ? supabase.from('visitas_pastoral').update(fallbackPayload).eq('id', existingVisit.id) : supabase.from('visitas_pastoral').insert([fallbackPayload]);
                     const retryResult = await query; vSaveErr = retryResult.error;
                }
                if (vSaveErr) throw new Error(`SaveVisit: ${vSaveErr.message}`);
            }

            setStatusMessage({ text: 'Guardado correctamente', type: 'success' });
            setTimeout(() => setStatusMessage(null), 2000);
        } catch (error: any) {
            console.error("Save Error Details:", error);
            setStatusMessage({ text: `Error al guardar: ${error.message}`, type: 'error' });
        }
    };

    const updateLocalReport = (name: string, field: keyof MinistryReport, value: string | number) => {
        setReports(prev => {
            const currentEntry = prev[name] || { horas: '', horas_especiales: '', estudios: '', notas: '' };
            const newValue = (field === 'horas' || field === 'estudios' || field === 'horas_especiales') ? (value === '' ? '' : Number(value)) : value;
            return { ...prev, [name]: { ...currentEntry, [field]: newValue } };
        });
    };

    const removeLocalReport = (name: string) => {
        setReports(prev => { const next = { ...prev }; delete next[name]; return next; });
    };

    const updateLocalVisit = (name: string, field: keyof VisitData, value: string) => {
        setVisits(prev => {
            const currentEntry = prev[name] || { date: '', notes: '' };
            return { ...prev, [name]: { ...currentEntry, [field]: value } };
        });
    };

    const toggleGroupMonthLock = async (isLocking: boolean, password?: string) => {
        if (!isLocking && password !== '9803') {
            alert('Clave incorrecta');
            return;
        }
        
        if (!currentCongregation) return;

        setStatusMessage({ text: isLocking ? 'Bloqueando mes...' : 'Desbloqueando mes...', type: 'info' });
        
        try {
            const nextReports = { ...reports };
            for (const m of members) {
                const pname = m.publicador_nombre;
                if (!nextReports[pname] && isLocking) {
                    nextReports[pname] = { horas: '', horas_especiales: '', estudios: '', participo: true, notas: '', locked: true };
                } else if (nextReports[pname]) {
                    nextReports[pname] = { ...nextReports[pname], locked: isLocking };
                }
            }
            setReports(nextReports);
            
            for (const m of members) {
                const pname = m.publicador_nombre;
                const r = nextReports[pname];
                if (!r) continue;
                
                let combinedNotas = r.notas || '';
                
                // Clean any existing metadata tags from combinedNotas to avoid duplication
                combinedNotas = combinedNotas.replace(/\{\{locked:(true|false)\}\}/g, '').trim();
                combinedNotas = combinedNotas.replace(/\{\{participo:(true|false)\}\}/g, '').trim();
                combinedNotas = combinedNotas.replace(/\{\{rol:.*?\}\}/g, '').trim();
                combinedNotas = combinedNotas.replace(/\{\{grupo_id:.*?\}\}/g, '').trim();

                if (r.participo !== undefined) {
                    if (!r.participo) {
                        combinedNotas = `${combinedNotas} {{participo:false}}`.trim();
                    } else if (r.horas === 0 || r.horas === '') {
                        combinedNotas = `${combinedNotas} {{participo:true}}`.trim();
                    }
                }
                if (r.locked) {
                    combinedNotas = `${combinedNotas} {{locked:true}}`.trim();
                }

                const currentRol = m.rol || 'Publicador';
                const currentGroupId = m.grupo_id || selectedGroupId;

                if (currentRol) {
                    combinedNotas = `${combinedNotas} {{rol:${currentRol}}}`.trim();
                }
                if (currentGroupId) {
                    combinedNotas = `${combinedNotas} {{grupo_id:${currentGroupId}}}`.trim();
                }

                const reportData = { 
                    publicador_nombre: pname, 
                    mes: currentMonth, 
                    horas: r.horas === '' ? 0 : r.horas,
                    horas_especiales: r.horas_especiales === '' ? 0 : r.horas_especiales, 
                    estudios: r.estudios === '' ? 0 : r.estudios,
                    notas: combinedNotas,
                    congregation_id: currentCongregation.id
                };
                
                const { data: existingReport } = await supabase.from('informes_ministerio')
                    .select('id').eq('publicador_nombre', pname).eq('mes', currentMonth).eq('congregation_id', currentCongregation.id).maybeSingle();
                
                if (existingReport) {
                    await supabase.from('informes_ministerio').update(reportData).eq('id', existingReport.id);
                } else {
                    await supabase.from('informes_ministerio').insert([reportData]);
                }
            }
            setStatusMessage({ text: isLocking ? 'Mes bloqueado correctamente' : 'Mes desbloqueado', type: 'success' });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch(e) {
            console.error(e);
            setStatusMessage({ text: 'Error al cambiar estado', type: 'error' });
        }
    };

    return {
        groups, selectedGroupId, setSelectedGroupId, createGroup, fetchGroups,
        members, masterPublishers, addMember, deleteMember,
        reports, visits, currentMonth, setCurrentMonth,
        loading, statusMessage,
        updateLocalReport, removeLocalReport, updateLocalVisit, saveRow,
        updateMemberRole, updatePublisherDetails,
        missingColumns, toggleGroupMonthLock,
        globalStats, globalMembers, fetchGlobalCongregationData, loadingGlobal, exportBackup, // Export new global features
        monthlyChanges
    };
};
