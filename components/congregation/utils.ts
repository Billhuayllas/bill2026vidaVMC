
export const getAvatarColor = (name: string) => {
    if (!name) return '#9ca3af'; // Fallback color
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export const formatMonth = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length < 2) return dateStr;
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        if (isNaN(year) || isNaN(month)) return dateStr;
        
        const date = new Date(year, month - 1);
        if (isNaN(date.getTime())) return dateStr;
        
        // Capitalize first letter
        const formatted = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch (e) {
        return dateStr;
    }
};

export const cleanNotes = (rawNotes: string): string => {
    return (rawNotes || '')
        .replace(/\{\{locked:(true|false)\}\}/g, '')
        .replace(/\{\{participo:(true|false)\}\}/g, '')
        .replace(/\{\{precursor_auxiliar:(true|false)\}\}/g, '')
        .replace(/\{\{horas_especiales:\d+\}\}/g, '')
        .replace(/\{\{he:\d+\}\}/g, '')
        .replace(/\{\{rol:.*?\}\}/g, '')
        .replace(/\{\{grupo_id:.*?\}\}/g, '')
        .replace(/\{\{.*?\}\}/g, '')
        .trim();
};

export const isReportAuxiliar = (r: any): boolean => {
    if (!r) return false;
    const raw = r.notas || '';
    if (raw.includes('{{precursor_auxiliar:true}}')) return true;
    const matchRol = raw.match(/\{\{rol:(.*?)\}\}/i);
    if (matchRol) {
        const rolVal = matchRol[1].toLowerCase();
        if (rolVal.includes('auxiliar')) return true;
    }
    if (r.rol && typeof r.rol === 'string' && r.rol.toLowerCase().includes('auxiliar')) {
        return true;
    }
    return false;
};

export const formatRoleForChanges = (role: string): string => {
    if (!role) return 'Publicador';
    const parts = role.split(',').map(p => p.trim());
    
    const isAnciano = parts.includes('Anciano');
    const isSiervo = parts.includes('Siervo ministerial');
    const isAuxiliar = parts.includes('Precursor Auxiliar');
    const isRegular = parts.includes('Precursor Regular');
    const isEspecial = parts.includes('Precursor Especial');
    const isMisionero = parts.includes('Misionero');

    const standard = ['Anciano', 'Siervo ministerial', 'Precursor Auxiliar', 'Precursor Regular', 'Precursor Especial', 'Misionero', 'Publicador'];
    const customs = parts.filter(p => !standard.includes(p));

    let displayRole = '';

    if (isAnciano) {
        if (isAuxiliar) displayRole = 'Auxiliar Anciano';
        else if (isRegular) displayRole = 'Precursor Regular y Anciano';
        else if (isEspecial) displayRole = 'Precursor Especial y Anciano';
        else displayRole = 'Publicador Anciano';
    } else if (isSiervo) {
        if (isAuxiliar) displayRole = 'Auxiliar Siervo Ministerial';
        else if (isRegular) displayRole = 'Precursor Regular y Siervo Ministerial';
        else if (isEspecial) displayRole = 'Precursor Especial y Siervo Ministerial';
        else displayRole = 'Publicador Siervo Ministerial';
    } else {
        if (isAuxiliar) displayRole = 'Precursor Auxiliar';
        else if (isRegular) displayRole = 'Precursor Regular';
        else if (isEspecial) displayRole = 'Precursor Especial';
        else displayRole = 'Publicador';
    }

    if (isMisionero) {
        displayRole += ' (Misionero)';
    }

    if (customs.length > 0) {
        displayRole += ` (${customs.join(', ')})`;
    }

    return displayRole;
};
