
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCongregation } from '../lib/CongregationContext';

const managerConfig = [ 
    { type: 'presidentes', title: 'Presidentes', tableName: 'lista_encargados', singular: 'Presidente', placeholder: 'presidente' }, 
    { type: 'consejeros', title: 'Consejeros', tableName: 'consejeros', singular: 'Consejero', placeholder: 'consejero' }, 
    { type: 'oradores', title: 'Oración', tableName: 'oradores', singular: 'Orador', placeholder: 'orador' }, 
    { type: 'discursantes', title: 'Discursantes (Tesoros/VMT)', tableName: 'discursantes', singular: 'Discursante', placeholder: 'discursante' }, 
    { type: 'lectores', title: 'Lectores de Biblia', tableName: 'lectores', singular: 'Lector', placeholder: 'lector' }, 
    { type: 'lectores_libro', title: 'Lectores de Libro', tableName: 'lectores_libro', singular: 'Lector', placeholder: 'lector de libro' }, 
    { type: 'publicadores', title: 'Publicadores', tableName: 'publicadores', singular: 'Publicador', placeholder: 'publicador' }, 
    { type: 'maestros_discurso', title: 'Discurso (Maestros)', tableName: 'maestros_discurso', singular: 'Discursante', placeholder: 'discursante' } 
];

const getAvatarColor = (name: string) => {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const deepReplaceNameInObj = (obj: any, oldName: string, newName: string): any => {
    if (typeof obj === 'string') {
        const parts = obj.split('/').map(p => p.trim());
        const hasChange = parts.some(p => p === oldName);
        if (hasChange) {
            return parts.map(p => p === oldName ? newName : p).join(' / ');
        }
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map(item => deepReplaceNameInObj(item, oldName, newName));
    } else if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = deepReplaceNameInObj(obj[key], oldName, newName);
        }
        return newObj;
    }
    return obj;
};

const parseCSVLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i+1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
};

interface GestionarParticipantesProps {
    isReadOnly?: boolean;
}

const GestionarParticipantes: React.FC<GestionarParticipantesProps> = ({ isReadOnly = false }) => {
    const { currentCongregation } = useCongregation();
    const [activeManager, setActiveManager] = useState(managerConfig[0]);
    const [participants, setParticipants] = useState<{ id: number; nombre: string; nombre_completo?: string | null; genero?: string | null; direccion?: string | null; fecha_nacimiento?: string | null; fecha_bautismo?: string | null }[]>([]);
    const [newName, setNewName] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for gender and bulk editing
    const [editingGenero, setEditingGenero] = useState<string>('');
    const [newGenero, setNewGenero] = useState<string>('Hombre');
    const [selectedParticipants, setSelectedParticipants] = useState<Set<number>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
    const [hideMenuOpenName, setHideMenuOpenName] = useState<string | null>(null);

    // States for groups and VMT school enrollment
    const [groups, setGroups] = useState<{ id: number; nombre: string }[]>([]);
    const [isEnrolledVMT, setIsEnrolledVMT] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');

    useEffect(() => {
        const fetchGroups = async () => {
            if (!currentCongregation) return;
            const { data, error } = await supabase
                .from('grupos')
                .select('id, nombre')
                .eq('congregation_id', currentCongregation.id)
                .order('nombre');
            if (!error && data) {
                setGroups(data);
            }
        };
        fetchGroups();
    }, [currentCongregation]);

    const loadManagerData = useCallback(async () => {
        if (!currentCongregation) return;
        setLoading(true);
        setStatus('Cargando...');
        
        let query: any = supabase.from(activeManager.tableName).select(activeManager.type === 'publicadores' ? "id, nombre, nombre_completo, genero, direccion, fecha_nacimiento, fecha_bautismo" : "id, nombre").eq('congregation_id', currentCongregation.id);
        
        let { data, error } = await query.order("nombre", { ascending: true });
        
        if (error) {
            if (activeManager.type === 'publicadores' && error.message.includes('nombre_completo')) {
                const fallbackQuery = supabase.from(activeManager.tableName).select("id, nombre, genero, direccion, fecha_nacimiento, fecha_bautismo").eq('congregation_id', currentCongregation.id);
                const res = await fallbackQuery.order("nombre", { ascending: true });
                data = res.data;
                error = res.error;
            }
        }
        
        if (error) {
            setStatus('Error al cargar.');
            console.error(error);
        } else {
            setParticipants(data || []);
            setStatus('');
        }
        setLoading(false);
    }, [activeManager, currentCongregation]);

    useEffect(() => {
        loadManagerData();
        setSearchTerm(''); // Reset search when changing tabs
        setSelectedParticipants(new Set()); // Reset selection when changing tabs
    }, [loadManagerData]);

    useEffect(() => {
        if (editingId !== null && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    const handleAdd = async () => {
        if (!currentCongregation) return;
        if (!newName.trim()) {
            alert('Por favor, ingrese un nombre.');
            return;
        }
        setStatus('Agregando...');
        
        const payload: { nombre: string; genero?: string; congregation_id: number; clasificacion_vmt?: string | null } = { 
            nombre: newName.trim(),
            congregation_id: currentCongregation.id
        };
        if (activeManager.type === 'publicadores') {
            payload.genero = newGenero;
            payload.clasificacion_vmt = isEnrolledVMT ? 'estudiante_vmt' : null;
        }

        const { error } = await supabase.from(activeManager.tableName).insert(payload);
        if (error) {
            setStatus('Error al agregar.');
        } else {
            if (activeManager.type === 'publicadores' && selectedGroupId) {
                const numGroupId = parseInt(selectedGroupId, 10);
                if (!isNaN(numGroupId)) {
                    const { error: groupError } = await supabase.from('miembros_grupo').insert([{
                        publicador_nombre: newName.trim(),
                        grupo_id: numGroupId,
                        rol: 'Publicador'
                    }]);
                    if (groupError) {
                        console.error('Error al agregar miembro al grupo:', groupError);
                    }
                }
            }
            setNewName('');
            setIsEnrolledVMT(false);
            setSelectedGroupId('');
            await loadManagerData();
        }
    };

    const handleStartEdit = (participant: { id: number; nombre: string; genero?: string | null }) => {
        setSelectedParticipants(new Set()); // Clear bulk selection
        setEditingId(participant.id);
        setEditingName(participant.nombre);
        if (activeManager.type === 'publicadores') {
            setEditingGenero(participant.genero || '');
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
        setEditingGenero('');
    };

    const handleUpdate = async () => {
        if (!editingId || !editingName.trim()) {
            handleCancelEdit();
            return;
        }
        setStatus('Actualizando...');
        const newName = editingName.trim();
        const payload: { nombre: string; genero?: string | null } = { nombre: newName };
        if (activeManager.type === 'publicadores') {
            payload.genero = editingGenero === '' ? null : editingGenero;
        }

        // Find old name
        const participantToEdit = participants.find(p => p.id === editingId);
        const oldName = participantToEdit ? participantToEdit.nombre : '';

        const { error } = await supabase.from(activeManager.tableName).update(payload).eq('id', editingId);
        
        if (error) {
            setStatus('Error al actualizar.');
            console.error(error);
        } else {
            // CASCADING UPDATE
            if (activeManager.type === 'publicadores' && oldName && oldName !== newName && currentCongregation) {
                setStatus('Actualizando en otras listas...');
                try {
                    // Update in other managers
                    for (const config of managerConfig) {
                        if (config.type === 'publicadores') continue;
                        await supabase
                            .from(config.tableName)
                            .update({ nombre: newName })
                            .eq('nombre', oldName)
                            .eq('congregation_id', currentCongregation.id);
                    }

                    // Replace in Programas settings format
                    const { data: programs } = await supabase.from('programas').select('week_id, data').eq('congregation_id', currentCongregation.id);
                    if (programs) {
                        for (const prog of programs) {
                            const newData = deepReplaceNameInObj(prog.data, oldName, newName);
                            if (JSON.stringify(newData) !== JSON.stringify(prog.data)) {
                                await supabase.from('programas').update({ data: newData }).eq('week_id', prog.week_id).eq('congregation_id', currentCongregation.id);
                            }
                        }
                    }

                    // Update in miembros_grupo
                    // Find all groups for this congregation
                    const { data: allGroups } = await supabase.from('grupos').select('id').eq('congregation_id', currentCongregation.id);
                    if (allGroups && allGroups.length > 0) {
                        const groupIds = allGroups.map(g => g.id);
                        await supabase.from('miembros_grupo')
                            .update({ publicador_nombre: newName })
                            .eq('publicador_nombre', oldName)
                            .in('grupo_id', groupIds);
                    }

                    // Update in informes_ministerio
                    await supabase.from('informes_ministerio')
                        .update({ publicador_nombre: newName })
                        .eq('publicador_nombre', oldName)
                        .eq('congregation_id', currentCongregation.id);

                    // Update in visitas_pastoral
                    await supabase.from('visitas_pastoral')
                        .update({ publicador_nombre: newName })
                        .eq('publicador_nombre', oldName);
                        
                    // Also update hidden participants if they are hidden
                    if (currentCongregation.settings?.hidden_participants?.[oldName]) {
                        const newHidden = { ...currentCongregation.settings.hidden_participants };
                        newHidden[newName] = newHidden[oldName];
                        delete newHidden[oldName];
                        
                        await supabase.from('congregations').update({ settings: { ...currentCongregation.settings, hidden_participants: newHidden } }).eq('id', currentCongregation.id);
                    }
                } catch (err) {
                    console.error("Cascade update error: ", err);
                }
            }

            setStatus('¡Actualización completada!');
            handleCancelEdit();
            await loadManagerData();
            setTimeout(() => setStatus(''), 3000);
        }
    };

    const handleDelete = (id: number, name: string) => {
        setConfirmDelete({ id, name });
    };

    const confirmAndDelete = async () => {
        if (!confirmDelete) return;
        setStatus('Eliminando...');
        const { error } = await supabase.from(activeManager.tableName).delete().eq('id', confirmDelete.id);
        
        if (error) {
            setStatus('Error al eliminar.');
            console.error(error);
        } else {
            await loadManagerData();
        }
        setConfirmDelete(null);
    };

    const handleHideParticipant = async (name: string, months: number | null) => {
        if (!currentCongregation || isReadOnly) return;
        
        setStatus('Actualizando...');
        const newSettings = { ...currentCongregation.settings, hidden_participants: { ...(currentCongregation.settings?.hidden_participants || {}) } };
        
        if (months === null) {
            // Unhide
            delete newSettings.hidden_participants[name];
        } else {
            // Hide for X months
            const hideUntil = new Date();
            hideUntil.setMonth(hideUntil.getMonth() + months);
            newSettings.hidden_participants[name] = hideUntil.toISOString();
        }

        const { error } = await supabase.from('congregations').update({ settings: newSettings }).eq('id', currentCongregation.id);
        if (error) {
            setStatus('Error al ocultar.');
            console.error(error);
        } else {
            setStatus('¡Lista actualizada!');
            // It will update in context once we reload or by itself, but we should probably reload the app's context to reflect across.
            // Since we can't easily force-refresh from here, we can rely on next render.
            // But wait, congregation context is fetched once unless we call refresh.
            // We should use setStatus to clear it.
            setHideMenuOpenName(null);
            setTimeout(() => setStatus(''), 2000);
            
            // To update immediately in local state we would need Context's refresh mechanism or a page reload
            window.location.reload(); 
        }
    };

    const isHidden = (name: string) => {
        if (!currentCongregation?.settings?.hidden_participants) return false;
        const hideUntilStr = currentCongregation.settings.hidden_participants[name];
        if (!hideUntilStr) return false;
        
        const hideUntil = new Date(hideUntilStr);
        return hideUntil > new Date();
    };

    const getHiddenText = (name: string) => {
        if (!isHidden(name)) return '';
        const hideUntilStr = currentCongregation!.settings!.hidden_participants![name];
        const date = new Date(hideUntilStr);
        return `Oculto hasta ${date.toLocaleDateString()}`;
    };

    const filteredParticipants = participants.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleToggleSelect = (id: number) => {
        if (isReadOnly) return;
        setSelectedParticipants(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };
    
    const handleToggleSelectAll = () => {
        if (isReadOnly) return;
        if (selectedParticipants.size === filteredParticipants.length) {
            setSelectedParticipants(new Set());
        } else {
            const allIds = new Set(filteredParticipants.map(p => p.id));
            setSelectedParticipants(allIds);
        }
    };

    const handleBulkUpdateGender = async (genero: 'Hombre' | 'Mujer') => {
        if (activeManager.type !== 'publicadores' || selectedParticipants.size === 0) return;
        setStatus(`Actualizando ${selectedParticipants.size} participante(s)...`);
        const idsToUpdate = Array.from(selectedParticipants);
        const { error } = await supabase.from('publicadores').update({ genero }).in('id', idsToUpdate);
        if (error) {
            setStatus('Error al actualizar en grupo.');
            console.error(error);
        } else {
            setStatus('¡Actualización completada!');
            setSelectedParticipants(new Set());
            await loadManagerData();
            setTimeout(() => setStatus(''), 3000);
        }
    };

    const handleExport = () => {
        if (!participants.length) {
            alert('No hay datos para exportar.');
            return;
        }

        let csvContent = "";
        
        if (activeManager.type === 'publicadores') {
            csvContent += "Nombre,Nombre Completo,Genero,Fecha de Nacimiento,Fecha de Bautismo,Direccion,Lote (UCV),Zona\n";
            participants.forEach(p => {
                const nombre = p.nombre.replace(/"/g, '""');
                const nombre_completo = (p.nombre_completo || '').replace(/"/g, '""');
                const genero = p.genero || '';
                const fecha_nacimiento = p.fecha_nacimiento || '';
                const fecha_bautismo = p.fecha_bautismo || '';
                
                // Parse dirección to extract ucv and zona
                let rawDir = p.direccion || '';
                let ucvVal = '';
                let zonaVal = '';
                
                const ucvMatch = rawDir.match(/\{\{ucv:(.*?)\}\}/);
                if (ucvMatch) {
                    ucvVal = ucvMatch[1];
                    rawDir = rawDir.replace(ucvMatch[0], '');
                }
                const zonaMatch = rawDir.match(/\{\{zona:(.*?)\}\}/);
                if (zonaMatch) {
                    zonaVal = zonaMatch[1];
                    rawDir = rawDir.replace(zonaMatch[0], '');
                }
                
                const direccion = rawDir.trim().replace(/"/g, '""');
                const ucv = ucvVal.trim().replace(/"/g, '""');
                const zona = zonaVal.trim().replace(/"/g, '""');
                
                csvContent += `"${nombre}","${nombre_completo}","${genero}","${fecha_nacimiento}","${fecha_bautismo}","${direccion}","${ucv}","${zona}"\n`;
            });
        } else {
            csvContent += "Nombre\n";
            participants.forEach(p => {
                const nombre = p.nombre.replace(/"/g, '""');
                csvContent += `"${nombre}"\n`;
            });
        }

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${activeManager.tableName}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentCongregation) return;

        setStatus('Importando...');
        setLoading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length <= 1) {
                    setStatus('El archivo está vacío o no tiene formato válido.');
                    setLoading(false);
                    return;
                }

                // Detect indices based on headers
                let nameIdx = 0;
                let fullNameIdx = -1;
                let genderIdx = 1;
                let birthIdx = 2;
                let baptismIdx = 3;
                let addressIdx = 4;
                let ucvIdx = 5;
                let zonaIdx = 6;

                if (lines[0]) {
                    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
                    const nHead = headers.findIndex(h => h.includes('nombre') || h.includes('name'));
                    if (nHead !== -1) nameIdx = nHead;
                    
                    const fnHead = headers.findIndex(h => h === 'nombre completo' || h === 'nombre_completo' || h.includes('completo'));
                    if (fnHead !== -1) fullNameIdx = fnHead;
                    
                    const gHead = headers.findIndex(h => h.includes('genero') || h.includes('género') || h.includes('gender'));
                    if (gHead !== -1) genderIdx = gHead;
                    
                    const birthHead = headers.findIndex(h => h.includes('nacimiento') || h.includes('birth') || h.includes('fecha_nacimiento'));
                    if (birthHead !== -1) birthIdx = birthHead;
                    
                    const baptismHead = headers.findIndex(h => h.includes('bautismo') || h.includes('baptism') || h.includes('fecha_bautismo'));
                    if (baptismHead !== -1) baptismIdx = baptismHead;
                    
                    const addrHead = headers.findIndex(h => h.includes('direccion') || h.includes('dirección') || h.includes('address'));
                    if (addrHead !== -1) addressIdx = addrHead;
                    
                    const ucvHead = headers.findIndex(h => h.includes('lote') || h.includes('ucv') || h.includes('mza') || h.includes('manzana') || h.includes('block'));
                    if (ucvHead !== -1) ucvIdx = ucvHead;
                    
                    const zHead = headers.findIndex(h => h.includes('zona') || h.includes('zone'));
                    if (zHead !== -1) zonaIdx = zHead;
                }

                const dataToInsert = [];
                for (let i = 1; i < lines.length; i++) {
                    const parsed = parseCSVLine(lines[i]);
                    const nombre = parsed[nameIdx]?.trim();
                    if (!nombre) continue;

                    const payload: any = {
                        nombre,
                        congregation_id: currentCongregation.id
                    };

                    if (activeManager.type === 'publicadores') {
                        if (fullNameIdx !== -1 && parsed[fullNameIdx]) {
                            payload.nombre_completo = parsed[fullNameIdx].trim() || null;
                        }

                        const genero = parsed[genderIdx]?.trim();
                        if (genero === 'Hombre' || genero === 'Mujer') {
                            payload.genero = genero;
                        } else {
                            payload.genero = null;
                        }

                        const fecha_nacimiento = parsed[birthIdx]?.trim();
                        payload.fecha_nacimiento = fecha_nacimiento || null;

                        const fecha_bautismo = parsed[baptismIdx]?.trim();
                        payload.fecha_bautismo = fecha_bautismo || null;

                        const addressStr = parsed[addressIdx]?.trim() || '';
                        const ucvVal = parsed[ucvIdx]?.trim() || '';
                        const zonaVal = parsed[zonaIdx]?.trim() || '';

                        let combinedDir = addressStr;
                        if (ucvVal) combinedDir = `{{ucv:${ucvVal}}}` + combinedDir;
                        if (zonaVal) combinedDir = `{{zona:${zonaVal}}}` + combinedDir;

                        payload.direccion = combinedDir || null;
                    }
                    dataToInsert.push(payload);
                }

                if (dataToInsert.length > 0) {
                    const { data: existingRows, error: fetchErr } = await supabase
                        .from(activeManager.tableName)
                        .select('id, nombre')
                        .eq('congregation_id', currentCongregation.id);
                    
                    if (fetchErr) throw fetchErr;
                    
                    const existingMap = new Map();
                    if (existingRows) {
                        existingRows.forEach(r => {
                            existingMap.set(r.nombre.trim().toLowerCase(), r);
                        });
                    }
                    
                    let insertedCount = 0;
                    let updatedCount = 0;
                    
                    for (const payload of dataToInsert) {
                        const normalizedNombre = payload.nombre.trim().toLowerCase();
                        const existing = existingMap.get(normalizedNombre);
                        
                        if (existing) {
                            const { error: updErr } = await supabase
                                .from(activeManager.tableName)
                                .update(payload)
                                .eq('id', existing.id);
                            if (!updErr) updatedCount++;
                        } else {
                            const { error: insErr } = await supabase
                                .from(activeManager.tableName)
                                .insert([payload]);
                            if (!insErr) insertedCount++;
                        }
                    }

                    setStatus(`¡Importación completada! Registrados: ${insertedCount}, Actualizados: ${updatedCount}.`);
                    await loadManagerData();
                    setTimeout(() => setStatus(''), 4000);
                } else {
                    setStatus('No se encontraron datos válidos para importar.');
                }
            } catch (err: any) {
                console.error(err);
                setStatus(`Error al procesar el archivo: ${err.message}`);
            } finally {
                setLoading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <div id="managers-container" className="managers-container">
            <style>{`
                .gp-card-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 16px;
                    margin-top: 20px;
                }
                .gp-card {
                    background-color: var(--card-bg-color);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    position: relative;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .gp-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.08);
                    border-color: var(--primary-color);
                }
                .gp-card.selected {
                    background-color: var(--info-bg);
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 1px var(--primary-color);
                }
                .gp-avatar {
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 1.2rem;
                    flex-shrink: 0;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .gp-info {
                    flex: 1;
                    min-width: 0; /* Enable text truncation */
                }
                .gp-name {
                    font-weight: 600;
                    color: var(--text-color);
                    font-size: 1rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 2px;
                }
                .gp-meta {
                    font-size: 0.8rem;
                    color: var(--text-color-light);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .gp-checkbox {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    accent-color: var(--primary-color);
                    border-radius: 4px;
                }
                .gp-actions {
                    display: flex;
                    gap: 5px;
                    margin-left: auto;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .gp-card:hover .gp-actions {
                    opacity: 1;
                }
                .gp-btn-icon {
                    width: 30px;
                    height: 30px;
                    border-radius: 6px;
                    border: none;
                    background-color: transparent;
                    color: var(--text-color-light);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .gp-btn-icon:hover {
                    background-color: var(--light-gray);
                    color: var(--primary-color);
                }
                .gp-btn-icon.delete:hover {
                    background-color: #fef2f2;
                    color: var(--destructive-color);
                }
                .hover-bg-gray:hover {
                    background-color: #f1f5f9 !important;
                }
                /* Edit Mode Styling inside card */
                .gp-edit-form {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .gp-edit-input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--primary-color);
                    border-radius: 6px;
                    font-size: 0.95rem;
                    box-sizing: border-box;
                }
                .gp-edit-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }
                @media (max-width: 768px) {
                    .gp-actions { opacity: 1; }
                }
            `}</style>

            <div className="sub-nav-menu">
                {managerConfig.map(m => (
                    <button 
                        key={m.type}
                        className={`sub-nav-button ${activeManager.type === m.type ? 'active' : ''}`} 
                        onClick={() => setActiveManager(m)}
                    >
                        {m.title}
                    </button>
                ))}
            </div>

            <div className="manager-panel" style={{ backgroundColor: 'var(--card-bg-color)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginBottom: '24px' }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px', marginBottom:'1.5rem', borderBottom:'1px solid var(--border-color)', paddingBottom:'16px'}}>
                    <div>
                        <h2 className="page-title" style={{margin:0, borderBottom:'none', paddingBottom:0, fontSize:'1.4rem', fontWeight:'700', color:'var(--text-color)', display:'flex', alignItems:'center', gap:'8px'}}>
                            <i className="fas fa-users-cog text-indigo-500"></i>
                            Gestionar {activeManager.title}
                            {isReadOnly && <span style={{fontSize:'0.5em', verticalAlign:'middle', backgroundColor:'#ef4444', color:'white', padding:'2px 6px', borderRadius:'4px', marginLeft:'8px'}}>Solo Lectura</span>}
                        </h2>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-color-light)', fontSize: '0.85rem' }}>
                            Agrega, edita e importa participantes e integrantes de forma ágil.
                        </p>
                    </div>
                    
                    {!isReadOnly && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input 
                                type="file" 
                                accept=".csv" 
                                style={{ display: 'none' }} 
                                ref={fileInputRef}
                                onChange={handleImportFile}
                            />
                            <button onClick={handleImportClick} className="button" style={{ backgroundColor: '#10b981', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600' }}>
                                <i className="fas fa-file-import"></i> Importar CSV
                            </button>
                            <button onClick={handleExport} className="button" style={{ backgroundColor: '#3b82f6', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600' }}>
                                <i className="fas fa-file-export"></i> Exportar CSV
                            </button>
                        </div>
                    )}
                </div>

                {status && (
                    <div style={{ backgroundColor: 'var(--info-bg)', border: '1px solid var(--primary-color)', color: 'var(--text-color)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-info-circle text-indigo-500"></i>
                        <span>{status}</span>
                    </div>
                )}
                
                {!isReadOnly && (
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{
                            backgroundColor: 'var(--light-gray)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '14px', 
                            padding: '20px', 
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
                        }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fas fa-plus-circle text-indigo-500"></i>
                                Nuevo(a) {activeManager.placeholder}:
                            </h3>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: activeManager.type === 'publicadores' ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr',
                                gap: '16px',
                                alignItems: 'end'
                            }}>
                                {/* Quick Add Placeholder */}
                                <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
                                    <button 
                                        onClick={() => setNewName('Sin participantes')}
                                        style={{
                                            fontSize: '0.75rem',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            color: '#64748b',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <i className="fas fa-magic mr-1"></i> Usar "Sin participantes"
                                    </button>
                                </div>

                                {/* Name Input Field */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color-light)' }}>
                                        Nombre Completo:
                                    </label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <i className="fas fa-user" style={{ position: 'absolute', left: '12px', color: 'var(--text-color-light)', fontSize: '0.9rem' }}></i>
                                        <input 
                                            type="text" 
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder={`Nombre del nuevo ${activeManager.placeholder}`}
                                            style={{
                                                width: '100%',
                                                padding: '10px 10px 10px 34px',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                backgroundColor: 'var(--bg-color)',
                                                color: 'var(--text-color)',
                                                outline: 'none',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                            }}
                                        />
                                    </div>
                                </div>

                                {activeManager.type === 'publicadores' && (
                                    <>
                                        {/* Gender Choice Segmented Control */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color-light)' }}>
                                                Género:
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewGenero('Hombre')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        border: newGenero === 'Hombre' ? '2.5px solid #3b82f6' : '1px solid var(--border-color)',
                                                        backgroundColor: newGenero === 'Hombre' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-color)',
                                                        color: newGenero === 'Hombre' ? '#2563eb' : 'var(--text-color)',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <i className="fas fa-mars" style={{ color: '#3b82f6' }}></i>
                                                    Hombre
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewGenero('Mujer')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        border: newGenero === 'Mujer' ? '2.5px solid #ec4899' : '1px solid var(--border-color)',
                                                        backgroundColor: newGenero === 'Mujer' ? 'rgba(236, 72, 153, 0.1)' : 'var(--bg-color)',
                                                        color: newGenero === 'Mujer' ? '#db2777' : 'var(--text-color)',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <i className="fas fa-venus" style={{ color: '#ec4899' }}></i>
                                                    Mujer
                                                </button>
                                            </div>
                                        </div>

                                        {/* VMT School Enrollment YES / NO Question Option */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color-light)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                <span>¿Aprobado(a) para Escuela VMT?</span>
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEnrolledVMT(true)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        border: isEnrolledVMT ? '2.5px solid #06b6d4' : '1px solid var(--border-color)',
                                                        backgroundColor: isEnrolledVMT ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-color)',
                                                        color: isEnrolledVMT ? '#0891b2' : 'var(--text-color)',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <i className="fas fa-check-circle" style={{ color: isEnrolledVMT ? '#06b6d4' : 'var(--text-color-light)' }}></i>
                                                    SÍ (Aprobado)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEnrolledVMT(false)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        border: !isEnrolledVMT ? '2.5px solid #64748b' : '1px solid var(--border-color)',
                                                        backgroundColor: !isEnrolledVMT ? 'rgba(100, 116, 139, 0.1)' : 'var(--bg-color)',
                                                        color: !isEnrolledVMT ? '#475569' : 'var(--text-color)',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <i className="fas fa-times-circle" style={{ color: !isEnrolledVMT ? '#64748b' : 'var(--text-color-light)' }}></i>
                                                    NO (No aprobado)
                                                </button>
                                            </div>
                                        </div>

                                        {/* Assign Predication Group Selector */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color-light)' }}>
                                                Asignar a Grupo de Predicación:
                                            </label>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <i className="fas fa-users-class" style={{ position: 'absolute', left: '12px', color: 'var(--text-color-light)', fontSize: '0.9rem' }}></i>
                                                <select 
                                                    value={selectedGroupId} 
                                                    onChange={e => setSelectedGroupId(e.target.value)} 
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 10px 10px 34px',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '8px',
                                                        backgroundColor: 'var(--bg-color)',
                                                        color: 'var(--text-color)',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        outline: 'none',
                                                        transition: 'all 0.2s',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                        cursor: 'pointer',
                                                        height: '41px'
                                                    }}
                                                >
                                                    <option value="">-- Sin grupo (Sin asignar) --</option>
                                                    {groups.map(g => (
                                                        <option key={g.id} value={g.id.toString()}>{g.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Submit Add Button */}
                                <div style={{ display: 'flex', width: '100%' }}>
                                    <button 
                                        onClick={handleAdd} 
                                        className="button" 
                                        style={{
                                            width: '100%',
                                            padding: '11px 18px',
                                            borderRadius: '8px',
                                            backgroundColor: 'var(--primary-color)',
                                            color: 'white',
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s',
                                            border: 'none',
                                            cursor: 'pointer',
                                            height: '41px'
                                        }}
                                    >
                                        <i className="fas fa-plus"></i> Registrar {activeManager.placeholder.charAt(0).toUpperCase() + activeManager.placeholder.slice(1)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeManager.type === 'publicadores' && selectedParticipants.size > 0 && !isReadOnly && (
                    <div className="bulk-actions-panel" style={{animation:'fadeIn 0.3s'}}>
                        <span>{selectedParticipants.size} seleccionado(s)</span>
                        <div className="bulk-actions-buttons">
                            <button className="button" onClick={() => handleBulkUpdateGender('Hombre')}>Asignar Hombre</button>
                            <button className="button" onClick={() => handleBulkUpdateGender('Mujer')}>Asignar Mujer</button>
                            <button className="button-clear" onClick={() => setSelectedParticipants(new Set())}>Cancelar</button>
                        </div>
                    </div>
                )}
                
                <div className="search-box" style={{maxWidth:'100%', marginBottom:'10px'}}>
                     <i className="fas fa-search search-icon" style={{display:'none'}}></i>
                     <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={`Buscar en ${activeManager.title}...`}
                        className="search-input"
                        style={{paddingLeft: '12.5px'}}
                    />
                </div>

                {activeManager.type === 'publicadores' && !loading && participants.length > 0 && !isReadOnly && (
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'10px', padding:'0 5px'}}>
                        <input
                            type="checkbox"
                            className="gp-checkbox"
                            style={{position:'static'}}
                            checked={filteredParticipants.length > 0 && selectedParticipants.size === filteredParticipants.length}
                            onChange={handleToggleSelectAll}
                            id="select-all-participants"
                        />
                        <label htmlFor="select-all-participants" style={{fontSize:'0.9rem', fontWeight:'600', color:'var(--text-color-light)', cursor:'pointer'}}>Seleccionar Todos</label>
                    </div>
                )}

                {loading ? (
                    <div style={{padding:'40px', textAlign:'center', color:'var(--text-color-light)'}}>Cargando participantes...</div>
                ) : filteredParticipants.length === 0 ? (
                    <div style={{padding:'40px', textAlign:'center', color:'var(--text-color-light)', border:'2px dashed var(--border-color)', borderRadius:'12px', marginTop:'20px'}}>
                        {searchTerm ? 'No se encontraron resultados.' : `No hay ${activeManager.singular.toLowerCase()}s registrados.`}
                    </div>
                ) : (
                    <div className="gp-card-grid">
                        {filteredParticipants.map(p => {
                            const isEditing = editingId === p.id;
                            const isSelected = selectedParticipants.has(p.id);
                            
                            return (
                                <div key={p.id} className={`gp-card ${isSelected ? 'selected' : ''}`}>
                                    {isEditing && !isReadOnly ? (
                                        <div className="gp-edit-form">
                                            <input 
                                                ref={editInputRef}
                                                type="text"
                                                value={editingName}
                                                onChange={e => setEditingName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleUpdate();
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                                className="gp-edit-input"
                                                placeholder="Nombre"
                                            />
                                            {activeManager.type === 'publicadores' && (
                                                <select 
                                                    value={editingGenero} 
                                                    onChange={e => setEditingGenero(e.target.value)}
                                                    className="gp-edit-input"
                                                >
                                                    <option value="">Sin asignar</option>
                                                    <option value="Hombre">Hombre</option>
                                                    <option value="Mujer">Mujer</option>
                                                </select>
                                            )}
                                            <div className="gp-edit-actions">
                                                <button onClick={handleUpdate} className="button" style={{padding:'6px 12px', fontSize:'0.8rem'}}>Guardar</button>
                                                <button onClick={handleCancelEdit} className="button-clear" style={{padding:'6px 12px', fontSize:'0.8rem'}}>Cancelar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {activeManager.type === 'publicadores' && !isReadOnly && (
                                                <input
                                                    type="checkbox"
                                                    className="gp-checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(p.id)}
                                                />
                                            )}
                                            <div className="gp-avatar" style={{backgroundColor: getAvatarColor(p.nombre)}}>
                                                {p.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="gp-info">
                                                <div className="gp-name" title={p.nombre}>{p.nombre}</div>
                                                {activeManager.type === 'publicadores' && p.genero && (
                                                    <div className="gp-meta">
                                                        <i className={`fas ${p.genero === 'Hombre' ? 'fa-male' : 'fa-female'}`} style={{color: p.genero === 'Hombre' ? '#3b82f6' : '#ec4899'}}></i>
                                                        {p.genero}
                                                    </div>
                                                )}
                                                {isHidden(p.nombre) && (
                                                    <div className="gp-meta" style={{color: '#ef4444', fontWeight: 'bold', fontSize: '0.75rem', marginTop: '2px'}}>
                                                        <i className="fas fa-eye-slash"></i> {getHiddenText(p.nombre)}
                                                    </div>
                                                )}
                                            </div>
                                            {!isReadOnly && (
                                                <div className="gp-actions">
                                                    <div style={{position: 'relative'}}>
                                                        <button className="gp-btn-icon" onClick={() => setHideMenuOpenName(hideMenuOpenName === p.nombre ? null : p.nombre)} title="Ocultar de Listas">
                                                            <i className={isHidden(p.nombre) ? "fas fa-eye" : "fas fa-eye-slash"}></i>
                                                        </button>
                                                        {hideMenuOpenName === p.nombre && (
                                                            <div style={{
                                                                position: 'absolute', right: 0, bottom: '100%', marginBottom: '5px',
                                                                backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '5px', zIndex: 10,
                                                                minWidth: '150px', display: 'flex', flexDirection: 'column'
                                                            }} onMouseLeave={() => setHideMenuOpenName(null)}>
                                                                <button onClick={() => handleHideParticipant(p.nombre, 6)} style={{textAlign:'left', padding:'8px 12px', background:'transparent', border:'none', cursor:'pointer', fontSize:'0.85rem', whiteSpace: 'nowrap'}} className="hover-bg-gray">Ocultar 6 meses</button>
                                                                <button onClick={() => handleHideParticipant(p.nombre, 12)} style={{textAlign:'left', padding:'8px 12px', background:'transparent', border:'none', cursor:'pointer', fontSize:'0.85rem', whiteSpace: 'nowrap'}} className="hover-bg-gray">Ocultar 12 meses</button>
                                                                <button onClick={() => handleHideParticipant(p.nombre, null)} style={{textAlign:'left', padding:'8px 12px', background:'transparent', border:'none', cursor:'pointer', fontSize:'0.85rem', whiteSpace: 'nowrap', color:'#10b981'}} className="hover-bg-gray">Quitar Ocultar</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button className="gp-btn-icon" onClick={() => handleStartEdit(p)} title="Editar">
                                                        <i className="fas fa-pencil-alt"></i>
                                                    </button>
                                                    <button className="gp-btn-icon delete" onClick={() => handleDelete(p.id, p.nombre)} title="Eliminar">
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {confirmDelete && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 10007
                }} onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}>
                    <div style={{
                        backgroundColor: 'white', padding: '20px', borderRadius: '8px',
                        maxWidth: '300px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }} onClick={e => e.stopPropagation()}>
                        <h4 style={{ marginTop: 0, color: '#1e293b' }}>Confirmar Eliminación</h4>
                        <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '20px' }}>
                            ¿Seguro que desea eliminar a <strong>{confirmDelete.name}</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button 
                                onClick={() => setConfirmDelete(null)}
                                style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmAndDelete}
                                style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionarParticipantes;
