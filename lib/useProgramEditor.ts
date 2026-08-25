// Fix: Import React to provide the React namespace for types like React.ChangeEvent.
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { ProgramData } from './types';
import { saveCompleteBackupToSupabase } from './backupUtils';
import { useCongregation } from './CongregationContext';
import { isEqual } from './utils';

export const useProgramEditor = (programDataSource: ProgramData & { refetch: () => void }) => {
    const { programs, refetch } = programDataSource;
    const { currentCongregation } = useCongregation();

    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [changes, setChanges] = useState<any>({});
    const [saveStatus, setSaveStatus] = useState<{ message: string, type: 'error' | 'success' | 'loading' } | null>(null);

    useEffect(() => {
        if (programs.length > 0) {
            const months = Array.from(new Set(programs.map((p: any) => (p.week_id || '').substring(0, 7).trim()))).filter(Boolean).sort((a, b) => b.localeCompare(a)) as string[];
            setAvailableMonths(months);

            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            setSelectedMonth(prev => {
                if (months.includes(prev)) return prev;
                return months.includes(currentMonthKey) ? currentMonthKey : (months.length > 0 ? months[0] : '');
            });
        }
    }, [programs]);

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMonth(e.target.value);
    };

    const handleAssignmentChange = (weekId: string, path: string, value: string) => {
        setChanges(prev => {
            const newChanges = JSON.parse(JSON.stringify(prev));
            if (!newChanges[weekId]) {
                const originalProgram = programs.find(p => p.week_id === weekId);
                newChanges[weekId] = JSON.parse(JSON.stringify(originalProgram?.data || {}));
            }
            
            const setDeepValue = (obj: any, p: string, v: any) => {
                const keys = p.split('.');
                let current = obj;
                for (let i = 0; i < keys.length - 1; i++) {
                    const key = keys[i];
                    const nextKeyIsNumber = !isNaN(parseInt(keys[i+1], 10));
                    if (!current[key]) {
                        current[key] = nextKeyIsNumber ? [] : {};
                    }
                    current = current[key];
                }
                current[keys[keys.length - 1]] = v;
            };

            setDeepValue(newChanges[weekId], path, value);
            return newChanges;
        });
    };

    const handleSaveChanges = async () => {
        if (!currentCongregation) {
            setSaveStatus({ message: 'Error: No hay congregación seleccionada', type: 'error' });
            return;
        }
        
        const weekIdsToSave = Object.keys(changes);
        if (weekIdsToSave.length === 0) return;
        
        setSaveStatus({ message: 'Guardando...', type: 'loading' });

        try {
            const getDbWeekId = (wId: string) => {
                if (currentCongregation.id === 1) return wId;
                return `${wId}-${currentCongregation.id}`;
            };

            const dbWeekIdsToSave = weekIdsToSave.map(getDbWeekId);

            // Check existence for all weeks we want to save
            const { data: existingRecords, error: fetchErr } = await supabase
                .from('programas')
                .select('week_id')
                .in('week_id', dbWeekIdsToSave)
                .eq('congregation_id', currentCongregation.id);

            if (fetchErr) {
                console.error("Fetch error during save check:", fetchErr);
            }

            let saveError = null;

            // Sequential updates/inserts (or we could batch if we were sure of constraints, 
            // but for safety we do individual or handled batch)
            // To be fast, let's use the list of existingRecords to decide insert vs update
            const operations = weekIdsToSave.map(weekId => {
                const dbWeekId = getDbWeekId(weekId);
                const existing = existingRecords?.find(r => r.week_id === dbWeekId);
                const payload = {
                    week_id: dbWeekId,
                    data: changes[weekId],
                    congregation_id: currentCongregation.id
                };

                if (existing) {
                    return supabase
                        .from('programas')
                        .update({ data: changes[weekId] })
                        .eq('week_id', dbWeekId)
                        .eq('congregation_id', currentCongregation.id);
                } else {
                    return supabase
                        .from('programas')
                        .insert([payload]);
                }
            });

            const results = await Promise.all(operations);
            const firstError = results.find(r => r.error);

            if (firstError) {
                console.error("Save error:", firstError.error);
                setSaveStatus({ message: `Error al guardar: ${firstError.error?.message}`, type: 'error' });
            } else {
                setSaveStatus({ message: '¡Cambios guardados con éxito!', type: 'success' });
                setChanges({});
                await refetch();
            }
        } catch (err: any) {
            console.error("Unexpected error in handleSaveChanges:", err);
            setSaveStatus({ message: `Error inesperado: ${err.message || 'Error desconocido'}`, type: 'error' });
        }
        
        const duration = saveStatus?.type === 'error' ? 6000 : 4000;
        setTimeout(() => setSaveStatus(null), duration);
    };

    const getProgramValue = (weekId: string, path: string) => {
        const changedData = changes[weekId];
        if (changedData) {
            const value = path.split('.').reduce((o: any, key: string) => o?.[key], changedData);
            if (value !== undefined) return value;
        }
        const originalProgram = programs.find(p => p.week_id === weekId);
        return path.split('.').reduce((o: any, key: string) => o?.[key], originalProgram?.data);
    };

    const handleBackup = async () => {
        await saveCompleteBackupToSupabase(currentCongregation, (msg) => {
            // Re-use saveStatus to show backup status
            if (msg) {
                setSaveStatus({ message: msg.text, type: msg.type === 'error' ? 'error' : 'success' });
            } else {
                setSaveStatus(null);
            }
        });
    };

    return {
        selectedMonth,
        handleMonthChange,
        availableMonths,
        changes,
        handleAssignmentChange,
        handleSaveChanges,
        saveStatus,
        getProgramValue,
        handleBackup
    };
};
