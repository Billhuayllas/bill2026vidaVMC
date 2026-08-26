import { supabase } from './supabase';
import { saveBackupToTurso } from './turso';
import { fetchAllRows } from './supabasePagination';

export const saveCompleteBackupToSupabase = async (congregation: any, setStatusMessage: (msg: { text: string, type: 'info'|'success'|'error'}|null) => void) => {
    if (!congregation) return;
    setStatusMessage({ text: 'Preparando copia de seguridad y espejo...', type: 'info' });
    try {
        const { data: allPublishers, error: pubErr } = await supabase.from('publicadores').select('*').eq('congregation_id', congregation.id);
        if (pubErr) throw pubErr;
        const { data: allGroups, error: grpErr } = await supabase.from('grupos').select('*').eq('congregation_id', congregation.id);
        if (grpErr) throw grpErr;
        const { data: allMembers, error: memErr } = await supabase.from('miembros_grupo').select('*').in('grupo_id', allGroups.map(g => g.id));
        if (memErr) throw memErr;
        const allReports = await fetchAllRows(async (start, end) => {
            return await supabase.from('informes_ministerio').select('*').eq('congregation_id', congregation.id).order('id').range(start, end);
        });
        const { data: allVisits, error: visErr } = await supabase.from('visitas_pastoral').select('*').in('publicador_nombre', allPublishers.map(p => p.nombre));
        if (visErr) throw visErr;
        const { data: allPrograms, error: progErr } = await supabase.from('programas').select('*').eq('congregation_id', congregation.id);
        if (progErr) throw progErr;

        const backupData = {
            timestamp: new Date().toISOString(),
            congregation: congregation,
            publicadores: allPublishers,
            grupos: allGroups,
            miembros_grupo: allMembers,
            informes_ministerio: allReports,
            visitas_pastoral: allVisits,
            programas: allPrograms
        };

        const backupId = crypto.randomUUID();
        const backupTimestamp = new Date().toISOString();
        const description = `Respaldo manual - ${new Date().toLocaleString()}`;

        // 1. Guardar primero en Turso de forma obligatoria y robusta (nuestra base de datos estrella)
        let tursoSuccess = false;
        try {
            tursoSuccess = await saveBackupToTurso(backupId, congregation.id, description, backupData, backupTimestamp);
        } catch (tErr) {
            console.error("Turso backup error:", tErr);
        }

        // 2. Intentar guardar en Supabase (opcional - mejor esfuerzo)
        let supabaseSuccess = false;
        let supabaseErrorMsg = "";
        try {
            const { error: insertErr } = await supabase.from('respaldos').insert([{
                id: backupId,
                congregation_id: congregation.id,
                description,
                data: backupData,
                created_at: backupTimestamp
            }]);
            
            if (!insertErr) {
                supabaseSuccess = true;
            } else {
                supabaseErrorMsg = insertErr.message;
            }
        } catch (sErr: any) {
            console.error("Supabase insert backup error:", sErr);
            supabaseErrorMsg = sErr?.message || String(sErr);
        }

        if (tursoSuccess) {
            if (supabaseSuccess) {
                setStatusMessage({ 
                    text: '¡Copia de seguridad guardada con éxito en Supabase y replicada en espejo (Turso)!', 
                    type: 'success' 
                });
            } else {
                setStatusMessage({ 
                    text: '¡Copia de seguridad guardada con éxito en Turso LibSQL! (Omitido Supabase por problemas de tabla/conexión, tus datos están 100% seguros).', 
                    type: 'success' 
                });
            }
            setTimeout(() => setStatusMessage(null), 5000);
            return true;
        } else {
            // Ambos fallaron catastróficamente o Turso no pudo escribir
            setStatusMessage({ 
                text: `Error al crear la copia de seguridad: no se pudo guardar en Turso ni en Supabase. Error de Supabase: ${supabaseErrorMsg || 'ninguna tabla'}`, 
                type: 'error' 
            });
            return false;
        }
    } catch (error: any) {
        console.error("Backup error:", error);
        setStatusMessage({ text: `Error al crear backup: ${error.message}`, type: 'error' });
    }
    return false;
};

// Also keep the old one for downloading if they still want it
export const shareCompleteBackup = async (congregation: any, setStatusMessage: (msg: { text: string, type: 'info'|'success'|'error'}|null) => void) => {
    if (!congregation) return;
    setStatusMessage({ text: 'Preparando datos para compartir...', type: 'info' });
    try {
        const { data: allPublishers } = await supabase.from('publicadores').select('*').eq('congregation_id', congregation.id);
        const { data: allGroups } = await supabase.from('grupos').select('*').eq('congregation_id', congregation.id);
        const { data: allMembers } = await supabase.from('miembros_grupo').select('*').in('grupo_id', (allGroups||[]).map(g => g.id));
        const allReports = await fetchAllRows(async (start, end) => {
            return await supabase.from('informes_ministerio').select('*').eq('congregation_id', congregation.id).order('id').range(start, end);
        });
        const { data: allVisits } = await supabase.from('visitas_pastoral').select('*').in('publicador_nombre', (allPublishers||[]).map(p => p.nombre));
        const { data: allPrograms } = await supabase.from('programas').select('*').eq('congregation_id', congregation.id);

        const backupData = {
            timestamp: new Date().toISOString(),
            congregation: congregation,
            publicadores: allPublishers,
            grupos: allGroups,
            miembros_grupo: allMembers,
            informes_ministerio: allReports,
            visitas_pastoral: allVisits,
            programas: allPrograms
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const fileName = `respaldo_vmt_${new Date().toISOString().slice(0,10)}.json`;
        const file = new File([blob], fileName, { type: 'application/json' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Copia de Seguridad VMT',
                text: 'Adjunto la copia de seguridad de la base de datos de la congregación.',
                files: [file]
            });
            setStatusMessage({ text: 'Compartido con éxito.', type: 'success' });
        } else {
            setStatusMessage({ text: 'Tu navegador no permite compartir archivos directamente. Descargando en tu equipo...', type: 'info' });
            
            // Fallback: descargar
            const dataStr = URL.createObjectURL(blob);
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", fileName);
            document.body.appendChild(dlAnchorElem);
            dlAnchorElem.click();
            document.body.removeChild(dlAnchorElem);
            URL.revokeObjectURL(dataStr);
            
            setStatusMessage({ text: 'Archivo descargado. Súbelo manualmente a Drive o adjúntalo en un correo.', type: 'info' });
        }
        setTimeout(() => setStatusMessage(null), 5000);
    } catch (error: any) {
        if (error.name === 'AbortError') {
            setStatusMessage(null); // Canceló la acción de compartir
        } else {
            console.error("Share error:", error);
            setStatusMessage({ text: `Error al compartir: ${error.message}`, type: 'error' });
        }
    }
};
export const exportCompleteBackup = async (congregation: any, setStatusMessage: (msg: { text: string, type: 'info'|'success'|'error'}|null) => void) => {
    // ... we can just reuse the gathering logic, but for now let's just copy it to be safe
    if (!congregation) return;
    setStatusMessage({ text: 'Preparando copia de seguridad...', type: 'info' });
    try {
        const { data: allPublishers } = await supabase.from('publicadores').select('*').eq('congregation_id', congregation.id);
        const { data: allGroups } = await supabase.from('grupos').select('*').eq('congregation_id', congregation.id);
        const { data: allMembers } = await supabase.from('miembros_grupo').select('*').in('grupo_id', (allGroups||[]).map(g => g.id));
        const allReports = await fetchAllRows(async (start, end) => {
            return await supabase.from('informes_ministerio').select('*').eq('congregation_id', congregation.id).order('id').range(start, end);
        });
        const { data: allVisits } = await supabase.from('visitas_pastoral').select('*').in('publicador_nombre', (allPublishers||[]).map(p => p.nombre));
        const { data: allPrograms } = await supabase.from('programas').select('*').eq('congregation_id', congregation.id);

        const backupData = {
            timestamp: new Date().toISOString(),
            congregation: congregation,
            publicadores: allPublishers,
            grupos: allGroups,
            miembros_grupo: allMembers,
            informes_ministerio: allReports,
            visitas_pastoral: allVisits,
            programas: allPrograms
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `backup_completo_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
        document.body.removeChild(dlAnchorElem);

        setStatusMessage({ text: 'Copia de seguridad descargada.', type: 'success' });
        setTimeout(() => setStatusMessage(null), 3000);
    } catch (error: any) {
        console.error("Backup error:", error);
        setStatusMessage({ text: `Error al crear backup: ${error.message}`, type: 'error' });
    }
};
