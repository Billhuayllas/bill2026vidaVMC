
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCongregation } from '../lib/CongregationContext';
import { 
    AttendanceAlarmConfig, 
    DEFAULT_ALARM_CONFIG, 
    DAYS_OF_WEEK, 
    playAttendanceAlarmSound, 
    requestAppNotificationPermission 
} from '../lib/attendanceAlarmService';

// Pestañas disponibles en el sistema
export const ALL_TABS = [
    "Inicio",
    "Recordatorios",
    "Programa",
    "Gestionar Participantes",
    "Grupo de Congregación",
    "↳ Mi Grupo",
    "↳ Resumen General",
    "↳ Lista de Publicadores",
    "Rol de Grupos",
    "Filtros Avanzados",
    "Respuestas de Asignaciones",
    "Informes",
    "Asistencia",
    "Planificador",
    "Asignar Anc. y Min.",
    "Copias de Seguridad",
    "Configuración"
];

type TabPermission = {
    name: string;
    access: 'view' | 'edit';
};

type AccessConfig = {
    id: string;
    label: string;
    responsible_name: string;
    visible_tabs: TabPermission[];
    access_token: string;
    restricted_group_id?: number | null;
    created_at: string;
    congregation_id?: number;
};

interface ConfiguracionAccesoProps {
    onSimulate?: (config: any) => void;
    isSuperAdmin?: boolean;
    isReadOnly?: boolean;
}

const ConfiguracionAcceso: React.FC<ConfiguracionAccesoProps> = ({ onSimulate, isSuperAdmin = false, isReadOnly = false }) => {
    const { currentCongregation, refreshCongregations } = useCongregation();
    const [configs, setConfigs] = useState<AccessConfig[]>([]);
    const [groups, setGroups] = useState<{id: number, nombre: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    
    // Configuración General (Salas)
    const [enabledRooms, setEnabledRooms] = useState({ main: true, aux2: true, aux3: true });
    const [loadingSettings, setLoadingSettings] = useState(false);

    // Configuración de Alarmas de Asistencia
    const [attendanceAlarms, setAttendanceAlarms] = useState<AttendanceAlarmConfig>(DEFAULT_ALARM_CONFIG);
    const [loadingAlarmSettings, setLoadingAlarmSettings] = useState(false);

    // Estado del Formulario
    const [label, setLabel] = useState('');
    const [responsible, setResponsible] = useState('');
    const [password, setPassword] = useState(''); 
    const [showPasswordInput, setShowPasswordInput] = useState(false); // Toggle visibility in form
    const [restrictedGroupId, setRestrictedGroupId] = useState<string>('');
    const [selectedTabs, setSelectedTabs] = useState<TabPermission[]>([
        { name: "Inicio", access: "view" },
        { name: "Programa", access: "view" }
    ]);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Estado para Auto-Save
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const isFirstRun = useRef(true);

    // Estado para Verificación de Acceso (Modal)
    const [verifyConfig, setVerifyConfig] = useState<AccessConfig | null>(null);
    const [verifyInput, setVerifyInput] = useState('');
    const [verifyError, setVerifyError] = useState('');

    // Configuración General (Conceptos)
    const [conceptInput, setConceptInput] = useState('');
    const [editingConceptIndex, setEditingConceptIndex] = useState<number | null>(null);
    const [editingConceptValue, setEditingConceptValue] = useState('');
    const [savingConcepts, setSavingConcepts] = useState(false);

    const handleAddConcept = async () => {
        if (!currentCongregation || isReadOnly || !conceptInput.trim()) return;
        const newConcept = conceptInput.trim();
        const settings = currentCongregation.settings || {};
        const currentConcepts = settings.custom_concepts || ['Inactivo', 'No bautizado', 'Otras ovejas', 'Ungido', 'Apoyo'];
        if (currentConcepts.includes(newConcept)) {
            setStatusMessage({ text: 'El concepto ya existe.', type: 'error' });
            setTimeout(() => setStatusMessage(null), 3000);
            return;
        }
        setSavingConcepts(true);
        const nextConcepts = [...currentConcepts, newConcept];
        const { error } = await supabase.from('congregations')
            .update({ settings: { ...currentCongregation.settings, custom_concepts: nextConcepts } })
            .eq('id', currentCongregation.id);
        if (!error) {
            setStatusMessage({ text: 'Concepto agregado correctamente', type: 'success' });
            setConceptInput('');
            await refreshCongregations();
        } else {
            setStatusMessage({ text: `Error: ${error.message}`, type: 'error' });
        }
        setSavingConcepts(false);
        setTimeout(() => setStatusMessage(null), 3500);
    };

    const handleEditConcept = async (index: number) => {
        if (!currentCongregation || isReadOnly || !editingConceptValue.trim()) return;
        const newVal = editingConceptValue.trim();
        const settings = currentCongregation.settings || {};
        const currentConcepts = [...(settings.custom_concepts || ['Inactivo', 'No bautizado', 'Otras ovejas', 'Ungido', 'Apoyo'])];
        const oldVal = currentConcepts[index];
        if (oldVal === newVal) {
            setEditingConceptIndex(null);
            return;
        }
        if (currentConcepts.includes(newVal) && currentConcepts.indexOf(newVal) !== index) {
            setStatusMessage({ text: 'El concepto ya existe en la lista.', type: 'error' });
            setTimeout(() => setStatusMessage(null), 3000);
            return;
        }
        setSavingConcepts(true);
        currentConcepts[index] = newVal;

        // Optionally migrate matching labels in database
        let renameResult = '';
        try {
            const { data: pubs, error: fetchErr } = await supabase.from('publicadores')
                .select('id, nombre, rol')
                .eq('congregation_id', currentCongregation.id);
            if (!fetchErr && pubs) {
                let count = 0;
                for (const pub of pubs) {
                    if (pub.rol && pub.rol.includes(oldVal)) {
                        const updatedParts = pub.rol.split(',').map((p: string) => {
                            const trimmed = p.trim();
                            return trimmed === oldVal ? newVal : trimmed;
                        });
                        const newRol = updatedParts.filter(Boolean).join(', ');
                        await supabase.from('publicadores').update({ rol: newRol }).eq('id', pub.id);
                        await supabase.from('miembros_grupo').update({ rol: newRol }).eq('publicador_nombre', pub.nombre);
                        count++;
                    }
                }
                if (count > 0) {
                    renameResult = ` (y actualizado en ${count} miembros)`;
                }
            }
        } catch (e) {
            console.error("Error migrating roles", e);
        }

        const { error } = await supabase.from('congregations')
            .update({ settings: { ...currentCongregation.settings, custom_concepts: currentConcepts } })
            .eq('id', currentCongregation.id);
        if (!error) {
            setStatusMessage({ text: `Concepto renombrado correctamente${renameResult}`, type: 'success' });
            setEditingConceptIndex(null);
            await refreshCongregations();
        } else {
            setStatusMessage({ text: `Error: ${error.message}`, type: 'error' });
        }
        setSavingConcepts(false);
        setTimeout(() => setStatusMessage(null), 3500);
    };

    const handleDeleteConcept = async (index: number) => {
        if (!currentCongregation || isReadOnly) return;
        const settings = currentCongregation.settings || {};
        const currentConcepts = settings.custom_concepts || ['Inactivo', 'No bautizado', 'Otras ovejas', 'Ungido', 'Apoyo'];
        const conceptToDelete = currentConcepts[index];
        if (!window.confirm(`¿Seguro que deseas eliminar el concepto "${conceptToDelete}"? Esto lo quitará de la lista de sugerencias.`)) {
            return;
        }
        setSavingConcepts(true);
        const nextConcepts = currentConcepts.filter((_, i) => i !== index);

        // Remove from database as well to keep data clean!
        let cleanResult = '';
        try {
            const { data: pubs, error: fetchErr } = await supabase.from('publicadores')
                .select('id, nombre, rol')
                .eq('congregation_id', currentCongregation.id);
            if (!fetchErr && pubs) {
                let count = 0;
                for (const pub of pubs) {
                    if (pub.rol && pub.rol.includes(conceptToDelete)) {
                        const parts = pub.rol.split(',').map((p: string) => p.trim());
                        const filtered = parts.filter((p: string) => p !== conceptToDelete);
                        let nextRol = filtered.join(', ');
                        if (!nextRol) nextRol = 'Publicador';
                        await supabase.from('publicadores').update({ rol: nextRol }).eq('id', pub.id);
                        await supabase.from('miembros_grupo').update({ rol: nextRol }).eq('publicador_nombre', pub.nombre);
                        count++;
                    }
                }
                if (count > 0) {
                    cleanResult = ` (y removido de ${count} miembros)`;
                }
            }
        } catch (e) {
            console.error("Error cleaning roles", e);
        }

        const { error } = await supabase.from('congregations')
            .update({ settings: { ...currentCongregation.settings, custom_concepts: nextConcepts } })
            .eq('id', currentCongregation.id);
        if (!error) {
            setStatusMessage({ text: `Concepto eliminado correctamente${cleanResult}`, type: 'success' });
            await refreshCongregations();
        } else {
            setStatusMessage({ text: `Error: ${error.message}`, type: 'error' });
        }
        setSavingConcepts(false);
        setTimeout(() => setStatusMessage(null), 3500);
    };

    const [roomsMonth, setRoomsMonth] = useState('');

    useEffect(() => {
        if (currentCongregation) {
            fetchConfigs();
            fetchGroups();
            if (roomsMonth) {
                const perMonth = currentCongregation.settings?.enabled_rooms_per_month?.[roomsMonth];
                setEnabledRooms(perMonth || currentCongregation.settings?.enabled_rooms || { main: true, aux2: true, aux3: true });
            } else if (currentCongregation.settings?.enabled_rooms) {
                setEnabledRooms(currentCongregation.settings.enabled_rooms);
            }

            if (currentCongregation.settings?.attendance_alarms) {
                setAttendanceAlarms({
                    ...DEFAULT_ALARM_CONFIG,
                    ...currentCongregation.settings.attendance_alarms
                });
            }
        }
    }, [currentCongregation, roomsMonth]);

    // --- AUTO SAVE EFFECT ---
    useEffect(() => {
        // Solo ejecutar autoguardado si estamos editando, no es solo lectura, y no es la carga inicial del form
        if (!editingId || isReadOnly || isFirstRun.current) {
            return;
        }

        const timeoutId = setTimeout(async () => {
            setAutoSaveStatus('saving');
            
            const payload: any = {
                label: label.trim(),
                responsible_name: responsible.trim(),
                visible_tabs: selectedTabs,
                restricted_group_id: restrictedGroupId ? parseInt(restrictedGroupId) : null,
                congregation_id: currentCongregation?.id
            };

            // Solo actualizar la contraseña si el campo no está vacío
            if (password.trim()) {
                // Chequeo de duplicados rápido
                const duplicate = configs.find(c => c.access_token === password.trim() && c.id !== editingId);
                if (duplicate) {
                    setAutoSaveStatus('error');
                    setStatusMessage({ text: 'Error al guardar: Contraseña duplicada', type: 'error' });
                    return;
                }
                payload.access_token = password.trim();
            }

            const { error } = await supabase
                .from('access_configs')
                .update(payload)
                .eq('id', editingId);

            if (error) {
                console.error("Auto-save error", error);
                setAutoSaveStatus('error');
            } else {
                setAutoSaveStatus('saved');
                // Actualizar la lista local silenciosamente
                fetchConfigs(true); 
                setTimeout(() => setAutoSaveStatus('idle'), 2000);
            }
        }, 800); // 800ms debounce

        return () => clearTimeout(timeoutId);
    }, [label, responsible, password, restrictedGroupId, selectedTabs, editingId, isReadOnly]);

    // Reset isFirstRun when editingId changes
    useEffect(() => {
        isFirstRun.current = true;
        if (editingId) {
            // Give a small buffer before allowing autosave to trigger on initial state set
            setTimeout(() => { isFirstRun.current = false; }, 500);
        }
    }, [editingId]);


    const fetchGroups = async () => {
        if (!currentCongregation) return;
        const { data } = await supabase.from('grupos')
            .select('id, nombre')
            .eq('congregation_id', currentCongregation.id)
            .order('nombre');
        if (data) setGroups(data);
    };

    const fetchConfigs = async (silent = false) => {
        if (!currentCongregation) return;
        if (!silent) setLoading(true);
        const { data, error } = await supabase.from('access_configs')
            .select('*')
            .eq('congregation_id', currentCongregation.id)
            .order('created_at', { ascending: false });
        
        if (!error) {
            const normalizedData = (data || []).map(config => ({
                ...config,
                visible_tabs: Array.isArray(config.visible_tabs) 
                    ? config.visible_tabs.map((t: any) => typeof t === 'string' ? { name: t, access: 'view' } : t)
                    : []
            }));
            setConfigs(normalizedData);
        }
        if (!silent) setLoading(false);
    };

    // Manual Save (Only used for Creation now)
    const handleCreateAccess = async () => {
        if (!currentCongregation || isReadOnly) return;
        
        if (!label.trim() || !responsible.trim() || selectedTabs.length === 0) {
            setStatusMessage({ text: 'Faltan campos obligatorios.', type: 'error' });
            return;
        }
        
        let finalPassword = password.trim();
        if (!finalPassword) {
            finalPassword = 'tk_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        }

        const duplicate = configs.find(c => c.access_token === finalPassword);
        if (duplicate) {
            setStatusMessage({ text: 'Esta contraseña ya está en uso.', type: 'error' });
            return;
        }

        const payload = {
            label: label.trim(),
            responsible_name: responsible.trim(),
            access_token: finalPassword,
            visible_tabs: selectedTabs,
            restricted_group_id: restrictedGroupId ? parseInt(restrictedGroupId) : null,
            congregation_id: currentCongregation.id
        };

        const { error } = await supabase.from('access_configs').insert([payload]);

        if (error) {
            setStatusMessage({ text: `Error: ${error.message}`, type: 'error' });
        } else {
            setStatusMessage({ text: 'Acceso creado correctamente', type: 'success' });
            resetForm();
            fetchConfigs();
        }
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const toggleTab = (tabName: string) => {
        if (isReadOnly) return;
        setSelectedTabs(prev => {
            const index = prev.findIndex(t => t.name === tabName);
            let nextAccess: 'view' | 'edit' | 'none' = 'view';
            
            if (index === -1) {
                nextAccess = 'view';
            } else if (prev[index].access === 'view') {
                nextAccess = 'edit';
            } else {
                nextAccess = 'none';
            }

            let newTabs = [...prev];
            if (nextAccess === 'none') {
                newTabs = newTabs.filter(t => t.name !== tabName);
            } else if (index === -1) {
                newTabs.push({ name: tabName, access: nextAccess });
            } else {
                newTabs[index] = { ...newTabs[index], access: nextAccess };
            }

            // If toggling 'Grupo de Congregación', also update related subtabs
            if (tabName === 'Grupo de Congregación') {
                const subTabs = ["↳ Mi Grupo", "↳ Resumen General", "↳ Lista de Publicadores", "Rol de Grupos"];
                subTabs.forEach(sub => {
                    const subIndex = newTabs.findIndex(t => t.name === sub);
                    if (nextAccess === 'none') {
                        newTabs = newTabs.filter(t => t.name !== sub);
                    } else if (subIndex === -1) {
                        newTabs.push({ name: sub, access: nextAccess });
                    } else {
                        newTabs[subIndex] = { ...newTabs[subIndex], access: nextAccess };
                    }
                });
            }

            return newTabs;
        });
    };

    const resetForm = () => {
        setLabel('');
        setResponsible('');
        setPassword('');
        setShowPasswordInput(false);
        setRestrictedGroupId('');
        setSelectedTabs([{ name: "Inicio", access: "view" }, { name: "Programa", access: "view" }]);
        setEditingId(null);
        setAutoSaveStatus('idle');
    };

    const handleEditClick = (config: AccessConfig) => {
        setEditingId(config.id);
        setLabel(config.label);
        setResponsible(config.responsible_name);
        setPassword(config.access_token.startsWith('tk_') ? '' : config.access_token); 
        setShowPasswordInput(false);
        setSelectedTabs(config.visible_tabs);
        setRestrictedGroupId(config.restricted_group_id ? String(config.restricted_group_id) : '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (isReadOnly) return;
        if (!window.confirm('¿Eliminar este acceso?')) return;
        const { error } = await supabase.from('access_configs').delete().eq('id', id);
        if (!error) {
            if (editingId === id) resetForm();
            fetchConfigs();
        }
    };

    const saveGeneralSettings = async () => {
        if (!currentCongregation || isReadOnly) return;
        setLoadingSettings(true);
        
        let newSettings = { ...currentCongregation.settings };
        if (roomsMonth) {
            newSettings.enabled_rooms_per_month = {
                ...(newSettings.enabled_rooms_per_month || {}),
                [roomsMonth]: enabledRooms
            };
        } else {
            newSettings.enabled_rooms = enabledRooms;
        }

        const { error } = await supabase.from('congregations')
            .update({ settings: newSettings })
            .eq('id', currentCongregation.id);
        
        if (!error) {
            setStatusMessage({ text: 'Configuración de salas guardada', type: 'success' });
            await refreshCongregations();
        }
        setLoadingSettings(false);
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const saveAttendanceAlarmSettings = async () => {
        if (!currentCongregation || isReadOnly) return;
        setLoadingAlarmSettings(true);
        
        const newSettings = {
            ...currentCongregation.settings,
            attendance_alarms: attendanceAlarms
        };

        const { error } = await supabase.from('congregations')
            .update({ settings: newSettings })
            .eq('id', currentCongregation.id);
        
        if (!error) {
            setStatusMessage({ text: 'Configuración de alarmas de asistencia guardada correctamente', type: 'success' });
            await refreshCongregations();
        } else {
            setStatusMessage({ text: `Error: ${error.message}`, type: 'error' });
        }
        setLoadingAlarmSettings(false);
        setTimeout(() => setStatusMessage(null), 3500);
    };

    const handleTestClick = (config: AccessConfig) => {
        setVerifyConfig(config);
        setVerifyInput('');
        setVerifyError('');
    };

    const handleVerifySubmit = () => {
        if (!verifyConfig) return;
        if (verifyInput === verifyConfig.access_token) {
            if (onSimulate) onSimulate(verifyConfig);
            setVerifyConfig(null);
        } else {
            setVerifyError('Contraseña incorrecta');
        }
    };

    // Helper for status badge
    const getStatusBadge = () => {
        switch(autoSaveStatus) {
            case 'saving': return <span style={{color: '#d97706', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'5px'}}><i className="fas fa-spinner fa-spin"></i> Guardando...</span>;
            case 'saved': return <span style={{color: '#059669', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'5px'}}><i className="fas fa-check"></i> Guardado</span>;
            case 'error': return <span style={{color: '#dc2626', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'5px'}}><i className="fas fa-exclamation-circle"></i> Error al guardar</span>;
            default: return null;
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 box-border overflow-x-hidden">
            <div style={{marginBottom: '16px', padding: '12px 14px', backgroundColor: '#f0f9ff', borderLeft: '4px solid #3b82f6', borderRadius: '8px'}}>
                <h2 style={{margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '800', color: '#1e3a8a'}}>
                    {isSuperAdmin ? 'Administrador Global' : `Administración Local: ${currentCongregation?.name || ''}`}
                </h2>
                <p style={{margin: 0, fontSize: '0.8rem', color: '#4b5563'}}>
                    {isReadOnly 
                        ? 'Estás en modo de solo lectura. No puedes crear ni modificar usuarios.' 
                        : 'Puedes crear y gestionar contraseñas de acceso para esta congregación.'}
                </p>
            </div>

            {/* Configuración de Salas */}
            {!isReadOnly && (
                <div style={{ backgroundColor: 'var(--card-bg-color)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '16px', boxShadow: 'var(--shadow-md)', boxSizing: 'border-box', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                        <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-door-open"></i> Salas Activas de la Congregación
                        </h3>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontWeight: '600', fontSize: '0.8rem', color: 'var(--text-color-light)' }}>Configurar para:</label>
                            <input 
                                type="month" 
                                value={roomsMonth}
                                onChange={(e) => setRoomsMonth(e.target.value)}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.8rem', outline: 'none', maxWidth: '100%' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-color-light)', fontStyle: 'italic', width: '100%' }}>
                                {roomsMonth ? 'Configuración específica para este mes' : 'Configuración global por defecto'}
                            </span>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {Object.entries({ main: "Auditorio Principal", aux2: "Sala 2", aux3: "Sala 3" }).map(([key, label]) => (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                                <input 
                                    type="checkbox" 
                                    checked={enabledRooms[key as keyof typeof enabledRooms]} 
                                    onChange={e => setEnabledRooms(prev => ({ ...prev, [key]: e.target.checked }))}
                                    disabled={key === 'main' || isReadOnly}
                                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }}
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                    <button onClick={saveGeneralSettings} disabled={loadingSettings || isReadOnly} className="button-save" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', padding: '10px 16px', width: '100%', maxWidth: '280px' }}>
                        {loadingSettings ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                        Guardar Configuración de Salas
                    </button>
                </div>
            )}

            {/* Alarmas y Recordatorios de Asistencia (Android, iOS y Web) */}
            {!isReadOnly && (
                <div style={{ backgroundColor: 'var(--card-bg-color)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '16px', boxShadow: 'var(--shadow-md)', boxSizing: 'border-box', width: '100%' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, color: '#4f46e5', fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-bell"></i> Alarmas de Asistencia (Móvil y Web)
                        </h3>
                        <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: '700', 
                            padding: '3px 8px', 
                            borderRadius: '16px', 
                            whiteSpace: 'nowrap',
                            backgroundColor: attendanceAlarms.enabled ? '#dcfce7' : '#fee2e2', 
                            color: attendanceAlarms.enabled ? '#166534' : '#991b1b' 
                        }}>
                            {attendanceAlarms.enabled ? '● Alarmas activadas' : '○ Desactivadas'}
                        </span>
                    </div>

                    <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: 'var(--text-color-light)', lineHeight: '1.4' }}>
                        Si en la semana actual no hay registro de asistencia, la app alertará en los días y horas indicados.
                    </p>

                    {/* Activar / Desactivar Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', padding: '10px 12px', backgroundColor: 'var(--bg-color)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <input 
                            type="checkbox"
                            id="enable_attendance_alarms_check"
                            checked={attendanceAlarms.enabled}
                            onChange={e => setAttendanceAlarms(prev => ({ ...prev, enabled: e.target.checked }))}
                            style={{ width: '16px', height: '16px', accentColor: '#4f46e5', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <label htmlFor="enable_attendance_alarms_check" style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-color)' }}>
                            Activar notificaciones y alarmas automáticas
                        </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                        {/* Configuración Entre Semana */}
                        <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}>
                            <div style={{ fontWeight: '800', fontSize: '0.82rem', color: '#4f46e5', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <i className="fas fa-calendar-day"></i> Recordatorio Entre Semana
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color-light)', display: 'block', marginBottom: '3px' }}>
                                        Día de recordatorio:
                                    </label>
                                    <select
                                        value={attendanceAlarms.midweek_day}
                                        onChange={e => setAttendanceAlarms(prev => ({ ...prev, midweek_day: Number(e.target.value) }))}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)', fontSize: '0.8rem', fontWeight: '600' }}
                                    >
                                        {DAYS_OF_WEEK.map(d => (
                                            <option key={d.value} value={d.value}>{d.label} {d.value === 5 ? '(Predeterminado)' : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color-light)', display: 'block', marginBottom: '3px' }}>
                                        Hora (Predeterminada 9:00 PM):
                                    </label>
                                    <input 
                                        type="time"
                                        value={attendanceAlarms.midweek_time}
                                        onChange={e => setAttendanceAlarms(prev => ({ ...prev, midweek_time: e.target.value }))}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)', fontSize: '0.8rem', fontWeight: '600' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Configuración Fin de Semana */}
                        <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}>
                            <div style={{ fontWeight: '800', fontSize: '0.82rem', color: '#059669', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <i className="fas fa-calendar-check"></i> Recordatorio Fin de Semana
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color-light)', display: 'block', marginBottom: '3px' }}>
                                        Día de recordatorio:
                                    </label>
                                    <select
                                        value={attendanceAlarms.weekend_day}
                                        onChange={e => setAttendanceAlarms(prev => ({ ...prev, weekend_day: Number(e.target.value) }))}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)', fontSize: '0.8rem', fontWeight: '600' }}
                                    >
                                        {DAYS_OF_WEEK.map(d => (
                                            <option key={d.value} value={d.value}>{d.label} {d.value === 0 ? '(Predeterminado)' : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color-light)', display: 'block', marginBottom: '3px' }}>
                                        Hora (Predeterminada 8:30 PM):
                                    </label>
                                    <input 
                                        type="time"
                                        value={attendanceAlarms.weekend_time}
                                        onChange={e => setAttendanceAlarms(prev => ({ ...prev, weekend_time: e.target.value }))}
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)', fontSize: '0.8rem', fontWeight: '600' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', width: '100%' }}>
                            <button
                                type="button"
                                onClick={() => playAttendanceAlarmSound()}
                                style={{ flex: '1 1 auto', minWidth: '130px', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <i className="fas fa-volume-up text-indigo-500"></i> Probar Sonido
                            </button>

                            <button
                                type="button"
                                onClick={async () => {
                                    const granted = await requestAppNotificationPermission();
                                    if (granted) {
                                        alert('¡Permiso de notificaciones activado!');
                                    } else {
                                        alert('Permisos no habilitados.');
                                    }
                                }}
                                style={{ flex: '1 1 auto', minWidth: '130px', padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <i className="fas fa-mobile-alt text-indigo-500"></i> Permiso Celular
                            </button>
                        </div>

                        <button 
                            onClick={saveAttendanceAlarmSettings} 
                            disabled={loadingAlarmSettings || isReadOnly} 
                            className="button-save" 
                            style={{ width: '100%', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#4f46e5', fontSize: '0.82rem', padding: '9px 14px' }}
                        >
                            {loadingAlarmSettings ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                            Guardar Horarios de Alarmas
                        </button>
                    </div>
                </div>
            )}

            {/* Conceptos y Estados personalizados */}
            {!isReadOnly && (
                <div style={{ backgroundColor: 'var(--card-bg-color)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '16px', boxShadow: 'var(--shadow-md)', boxSizing: 'border-box', width: '100%' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '6px', color: '#a855f7', fontSize: '0.95rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-tags"></i> Conceptos y Estados de Grupo
                    </h3>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: 'var(--text-color-light)', lineHeight: '1.4' }}>
                        Administra las etiquetas de los publicadores. Al editar o eliminar una etiqueta, se actualizará en todos los miembros.
                    </p>

                    {/* Agregar nuevo concepto */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                        <input
                            type="text"
                            value={conceptInput}
                            onChange={e => setConceptInput(e.target.value)}
                            placeholder="Nuevo concepto (ej. No bautizado)..."
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddConcept();
                                }
                            }}
                            style={{
                                flex: '1 1 180px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-color)',
                                color: 'var(--text-color)',
                                fontSize: '0.82rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                             }}
                        />
                        <button
                            onClick={handleAddConcept}
                            disabled={savingConcepts || !conceptInput.trim()}
                            style={{
                                padding: '8px 14px',
                                backgroundColor: '#a855f7',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '0.82rem',
                                cursor: !conceptInput.trim() || savingConcepts ? 'not-allowed' : 'pointer',
                                opacity: !conceptInput.trim() || savingConcepts ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                flexShrink: 0
                            }}
                        >
                            {savingConcepts ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>}
                            Agregar
                        </button>
                    </div>

                    {/* Listado de conceptos */}
                    <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-color-light)', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Etiquetas activas
                        </span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(currentCongregation?.settings?.custom_concepts || ['Inactivo', 'No bautizado', 'Otras ovejas', 'Ungido', 'Apoyo']).map((concept, index) => {
                                const isEditing = editingConceptIndex === index;
                                return (
                                    <div
                                        key={`${concept}-${index}`}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: 'var(--bg-color)',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            gap: '8px'
                                        }}
                                    >
                                        {isEditing ? (
                                            <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={editingConceptValue}
                                                    onChange={e => setEditingConceptValue(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleEditConcept(index);
                                                        } else if (e.key === 'Escape') {
                                                            setEditingConceptIndex(null);
                                                        }
                                                    }}
                                                    autoFocus
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #c084fc',
                                                        backgroundColor: 'var(--card-bg-color)',
                                                        color: 'var(--text-color)',
                                                        outline: 'none',
                                                        fontSize: '0.8rem'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleEditConcept(index)}
                                                    style={{ border: 'none', background: '#10b981', color: 'white', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                                                >
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={() => setEditingConceptIndex(null)}
                                                    style={{ border: 'none', background: '#64748b', color: 'white', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-color)', wordBreak: 'break-word' }}>
                                                    {concept}
                                                </span>
                                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                                    <button
                                                        onClick={() => {
                                                            setEditingConceptIndex(index);
                                                            setEditingConceptValue(concept);
                                                        }}
                                                        style={{
                                                            border: 'none',
                                                            background: '#faf5ff',
                                                            color: '#a855f7',
                                                            padding: '5px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px'
                                                        }}
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteConcept(index)}
                                                        style={{
                                                            border: 'none',
                                                            background: '#fff5f5',
                                                            color: '#e53e3e',
                                                            padding: '5px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px'
                                                        }}
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Formulario de Llaves/Contraseñas */}
            {!isReadOnly && (
                <div style={{ backgroundColor: 'var(--card-bg-color)', padding: '16px', borderRadius: '16px', border: editingId ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', marginBottom: '20px', boxShadow: 'var(--shadow-md)', boxSizing: 'border-box', width: '100%' }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px'}}>
                        <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '0.95rem', fontWeight: '800' }}>
                            {editingId ? <><i className="fas fa-edit mr-1"></i>Editar Acceso</> : <><i className="fas fa-key mr-1"></i>Crear Nuevo Acceso</>}
                        </h3>
                        {editingId && getStatusBadge()}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-color-light)', textTransform: 'uppercase' }}>Nombre del Perfil</label>
                            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej: Grupo 1, Ancianos..." style={{ fontSize: '0.82rem', padding: '8px 10px', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-color-light)', textTransform: 'uppercase' }}>Responsable</label>
                            <input type="text" value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Ej: Hno. Pérez" style={{ fontSize: '0.82rem', padding: '8px 10px', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-color-light)', textTransform: 'uppercase' }}>Contraseña (Opcional)</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type={showPasswordInput ? "text" : "password"} 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    placeholder="En blanco = auto" 
                                    style={{ fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '1px', fontWeight: 'bold', width: '100%', padding: '8px 36px 8px 10px', boxSizing: 'border-box' }}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPasswordInput(!showPasswordInput)}
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <i className={`fas ${showPasswordInput ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px', fontSize: '0.75rem', color: 'var(--text-color-light)', textTransform: 'uppercase' }}>Restringir a Grupo (Opcional)</label>
                            <select value={restrictedGroupId} onChange={e => setRestrictedGroupId(e.target.value)} style={{ fontSize: '0.82rem', padding: '8px 10px', width: '100%', boxSizing: 'border-box' }}>
                                <option value="">-- Sin restricción (Todos) --</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-color-light)', textTransform: 'uppercase' }}>
                            Permisos (<i className="fas fa-eye text-blue-500"></i> Ver → <i className="fas fa-edit text-green-500"></i> Edición → Quitar)
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {ALL_TABS.map(tab => {
                                const perm = selectedTabs.find(t => t.name === tab);
                                const isActive = !!perm;
                                const isEdit = perm?.access === 'edit';

                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => toggleTab(tab)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            border: isActive ? (isEdit ? '1.5px solid #10b981' : '1.5px solid #3b82f6') : '1px solid var(--border-color)',
                                            backgroundColor: isActive ? (isEdit ? '#dcfce7' : '#dbeafe') : 'transparent',
                                            color: isActive ? (isEdit ? '#065f46' : '#1e40af') : 'var(--text-color-light)',
                                            fontWeight: isActive ? '800' : '500',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {isActive && <i className={`fas ${isEdit ? 'fa-edit' : 'fa-eye'}`} style={{ fontSize: '0.7rem' }}></i>}
                                        <span>{tab}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        {!editingId && (
                            <button onClick={handleCreateAccess} className="button-save" style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}>
                                <i className="fas fa-plus mr-1"></i> Crear Acceso
                            </button>
                        )}
                        {editingId && (
                            <button onClick={resetForm} className="button" style={{ background: '#64748b', color: 'white', flex: 1, padding: '10px', fontSize: '0.85rem' }}>
                                <i className="fas fa-check mr-1"></i> Terminar Edición
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Listado de Llaves */}
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-users-cog color-primary"></i>Accesos Generados
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                {loading ? <p style={{ fontSize: '0.85rem' }}>Cargando...</p> : configs.map(config => (
                    <div key={config.id} style={{ backgroundColor: 'var(--card-bg-color)', borderRadius: '14px', padding: '14px', border: editingId === config.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', position: 'relative', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-color)', wordBreak: 'break-word' }}>{config.label}</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-color-light)', fontWeight: '600' }}>
                                    <i className="fas fa-user-circle mr-1"></i>{config.responsible_name}
                                </p>
                            </div>
                            {!isReadOnly && (
                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                    <button onClick={() => handleEditClick(config)} style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}><i className="fas fa-pen"></i></button>
                                    <button onClick={() => handleDelete(config.id)} style={{ border: 'none', background: '#fef2f2', color: '#ef4444', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}><i className="fas fa-trash"></i></button>
                                </div>
                            )}
                        </div>

                        <div style={{ backgroundColor: '#f0f9ff', padding: '8px 10px', borderRadius: '10px', margin: '0 0 10px 0', border: '1px solid #bae6fd', textAlign:'center' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', marginBottom: '2px' }}>
                                {config.access_token.startsWith('tk_') ? 'ENLACE DIRECTO' : 'CONTRASEÑA'}
                            </div>
                            
                            {config.access_token.startsWith('tk_') ? (
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}${window.location.pathname}?token=${config.access_token}&congregation_id=${currentCongregation?.id}`;
                                        navigator.clipboard.writeText(url);
                                        setStatusMessage({ text: 'Enlace copiado al portapapeles', type: 'success' });
                                        setTimeout(() => setStatusMessage(null), 2000);
                                    }}
                                    style={{
                                        border: 'none', background: '#0284c7', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <i className="fas fa-link"></i> Copiar Enlace
                                </button>
                            ) : (
                                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#0c4a6e', fontFamily:'monospace', letterSpacing:'3px' }}>
                                    {isSuperAdmin ? config.access_token : '••••••'}
                                </div>
                            )}
                        </div>

                        <div style={{ backgroundColor: 'var(--bg-color)', padding: '10px', borderRadius: '10px', marginBottom: '10px', flex: 1 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--text-color-light)', textTransform: 'uppercase', marginBottom: '6px' }}>Pestañas:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {config.visible_tabs.map(t => (
                                    <span key={t.name} style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '5px', backgroundColor: t.access === 'edit' ? '#dcfce7' : '#f1f5f9', color: t.access === 'edit' ? '#059669' : '#64748b', border: `1px solid ${t.access === 'edit' ? '#10b981' : '#e2e8f0'}`, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <i className={`fas ${t.access === 'edit' ? 'fa-pen' : 'fa-eye'}`} style={{ fontSize: '0.55rem' }}></i> {t.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                onClick={() => handleTestClick(config)}
                                style={{ flex: 1, backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', padding: '9px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <i className="fas fa-sign-in-alt"></i> Probar Acceso
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL DE VERIFICACIÓN DE CONTRASEÑA */}
            {verifyConfig && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                                <i className="fas fa-lock" style={{ fontSize: '1.5rem' }}></i>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1e3a8a', fontWeight: '800' }}>Verificar Acceso</h3>
                            <p style={{ margin: '8px 0 0', color: '#64748b' }}>
                                Ingrese la contraseña de <strong>{verifyConfig.label}</strong> para continuar.
                            </p>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <input 
                                type="password" 
                                autoFocus
                                value={verifyInput} 
                                onChange={e => { setVerifyInput(e.target.value); setVerifyError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handleVerifySubmit()}
                                placeholder="Contraseña del usuario..." 
                                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `2px solid ${verifyError ? '#ef4444' : '#e2e8f0'}`, fontSize: '1.1rem', textAlign: 'center', letterSpacing: '2px', outline: 'none' }}
                            />
                            {verifyError && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '8px', fontSize: '0.9rem', fontWeight: '600' }}>{verifyError}</p>}
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={() => setVerifyConfig(null)} 
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleVerifySubmit} 
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Entrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {statusMessage && (
                <div style={{ 
                    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', 
                    backgroundColor: statusMessage.type === 'error' ? '#ef4444' : (statusMessage.type === 'success' ? '#10b981' : '#3b82f6'), 
                    color: 'white', padding: '12px 24px', borderRadius: '30px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', 
                    zIndex: 9999, fontWeight: 'bold', animation: 'fadeIn 0.3s ease-out' 
                }}>
                    {statusMessage.text}
                </div>
            )}
        </div>
    );
};

export default ConfiguracionAcceso;
