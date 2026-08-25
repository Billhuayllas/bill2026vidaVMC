
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useProgramData } from '../../lib/useProgramData';
import { useCongregation } from '../../lib/CongregationContext';

export const useProgramaLogic = (isReadOnly: boolean, isActive: boolean = false) => {
    const { programs, lists, history, loading, error, refetch } = useProgramData();
    const { currentCongregation } = useCongregation();
    const [selectedWeek, setSelectedWeek] = useState('');
    const [programData, setProgramData] = useState<any | null>(null);
    const [saveStatus, setSaveStatus] = useState<{ message: string, type: 'error' | 'success' | 'loading' } | null>(null);
    const [printStartWeek, setPrintStartWeek] = useState('');
    const [printEndWeek, setPrintEndWeek] = useState('');

    useEffect(() => {
        if (isActive) {
            refetch();
        }
    }, [isActive, refetch]);

    useEffect(() => {
        if (programs.length > 0 && !selectedWeek) {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now);
            monday.setDate(diff);
            
            const year = monday.getFullYear();
            const month = String(monday.getMonth() + 1).padStart(2, '0');
            const d = String(monday.getDate()).padStart(2, '0');
            const currentWeekId = `${year}-${month}-${d}`;

            let targetProgram = programs.find(p => p.week_id === currentWeekId);

            if (!targetProgram) {
                 const nowTime = now.getTime();
                 targetProgram = programs.reduce((prev: any, curr: any) => 
                    (Math.abs(new Date(curr.week_id).getTime() - nowTime) < Math.abs(new Date(prev.week_id).getTime() - nowTime) ? curr : prev)
                );
            }

            const initialWeek = targetProgram?.week_id || programs[0]?.week_id || '';
            setSelectedWeek(initialWeek);
            setPrintStartWeek(initialWeek);
            setPrintEndWeek(initialWeek);
        }
    }, [programs, selectedWeek]);

    useEffect(() => {
        if (selectedWeek && programs.length > 0) {
            const data = programs.find(p => p.week_id === selectedWeek)?.data;
            if (data) {
                setProgramData(JSON.parse(JSON.stringify(data)));
            }
        }
    }, [selectedWeek, programs]);

    const handleDataChange = useCallback((weekId: string, path: string, value: any) => {
        if (isReadOnly) return;
        if (!programData || weekId !== selectedWeek) return;
        setProgramData((prev: any) => {
            const newData = JSON.parse(JSON.stringify(prev));
            const keys = path.split('.');
            let current = newData;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!current[key]) current[key] = !isNaN(parseInt(keys[i+1], 10)) ? [] : {};
                current = current[key];
            }
            current[keys[keys.length - 1]] = value;
            return newData;
        });
    }, [isReadOnly, programData, selectedWeek]);

    const handleSave = async () => {
        if (isReadOnly || !currentCongregation) return;
        if (!programData || !selectedWeek) {
            setSaveStatus({ message: 'No hay datos para guardar', type: 'error' });
            return;
        }
        
        setSaveStatus({ message: 'Guardando...', type: 'loading' });
        
        try {
            const dbWeekId = currentCongregation.id === 1 ? selectedWeek : `${selectedWeek}-${currentCongregation.id}`;

            // 1. Check if the record already exists for this week and congregation
            const { data: existing, error: fetchError } = await supabase
                .from('programas')
                .select('week_id')
                .eq('week_id', dbWeekId)
                .eq('congregation_id', currentCongregation.id)
                .maybeSingle();

            if (fetchError) {
                throw fetchError;
            }

            let saveError = null;

            if (existing) {
                // Update existing record
                const { error: updateError } = await supabase
                    .from('programas')
                    .update({ data: programData })
                    .eq('week_id', dbWeekId)
                    .eq('congregation_id', currentCongregation.id);
                saveError = updateError;
            } else {
                // Insert new record
                const { error: insertError } = await supabase
                    .from('programas')
                    .insert([{ 
                        week_id: dbWeekId, 
                        data: programData, 
                        congregation_id: currentCongregation.id 
                    }]);
                saveError = insertError;
            }

            if (saveError) {
                console.error("Error saving program:", saveError);
                setSaveStatus({ message: `Error al guardar: ${saveError.message}`, type: 'error' });
            } else {
                setSaveStatus({ message: '¡Cambios guardados correctamente!', type: 'success' });
                await refetch();
            }
        } catch (err: any) {
            console.error("Unexpected error during save:", err);
            setSaveStatus({ message: `Error inesperado: ${err.message || 'Error desconocido'}`, type: 'error' });
        }
        
        const duration = saveStatus?.type === 'error' ? 6000 : 4000;
        setTimeout(() => setSaveStatus(null), duration);
    };

    const duplicatedParticipants = useMemo(() => {
        if (!programData) return [];
        
        const counts: Record<string, number> = {};
        const participants: string[] = [];

        const addNames = (val: any) => {
            if (!val || typeof val !== 'string') return;
            val.split('/').forEach(name => {
                const trimmed = name.trim();
                const lower = trimmed.toLowerCase();
                const isPlaceholder = lower === '-- asignar --' || 
                                     lower === 'sin participantes' || 
                                     lower === 'sin participante' || 
                                     lower === 'vacio' || 
                                     lower === 'vacío' ||
                                     lower === '';
                
                if (trimmed && !isPlaceholder) participants.push(trimmed);
            });
        };

        addNames(programData.presidentes?.principal);
        addNames(programData.presidentes?.aux2);
        addNames(programData.presidentes?.aux3);
        addNames(programData.oracion?.inicio);
        addNames(programData.oracion?.final);
        
        if (programData.tesoros) {
            addNames(programData.tesoros.p1?.main);
            addNames(programData.tesoros.p2?.main);
            addNames(programData.tesoros.p3?.main);
            addNames(programData.tesoros.p3?.aux2);
            addNames(programData.tesoros.p3?.aux3);
        }
        if (programData.maestros) {
            programData.maestros.forEach((m: any) => {
                addNames(m.main);
                addNames(m.aux2);
                addNames(m.aux3);
            });
        }
        if (programData.vidaCristiana) {
            programData.vidaCristiana.forEach((v: any) => {
                if (v.discursante) addNames(v.discursante);
                if (v.conductor) addNames(v.conductor);
                if (v.lector) addNames(v.lector);
            });
        }

        participants.forEach(p => counts[p] = (counts[p] || 0) + 1);
        return Object.entries(counts).filter(([_, count]) => count > 1).map(([name, _]) => name);
    }, [programData]);

    return {
        programs,
        lists,
        history,
        loading,
        error,
        selectedWeek,
        setSelectedWeek,
        programData,
        handleDataChange,
        handleSave,
        saveStatus,
        printStartWeek,
        setPrintStartWeek,
        printEndWeek,
        setPrintEndWeek,
        duplicatedParticipants,
        refetch
    };
};
