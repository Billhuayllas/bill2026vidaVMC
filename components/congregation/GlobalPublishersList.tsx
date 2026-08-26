import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Group, GroupMember, Publisher } from './types';
import { supabase } from '../../lib/supabase';
import { useCongregation } from '../../lib/CongregationContext';
import { isReportAuxiliar } from './utils';
import { BulkCardsModal } from './BulkCardsModal';
import html2pdf from 'html2pdf.js';
import { 
    Users, 
    ShieldCheck, 
    Award, 
    Compass, 
    Star, 
    UserX, 
    Search, 
    X, 
    FileText, 
    IdCard, 
    Share2, 
    Lock, 
    Unlock, 
    Layers, 
    Phone, 
    ExternalLink, 
    Edit2, 
    Trash2, 
    Check, 
    Filter, 
    ArrowUp, 
    ArrowDown, 
    Plus, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle,
    Download,
    Eye,
    ChevronDown,
    Loader2
} from 'lucide-react';

interface GlobalPublishersListProps {
    groups: Group[];
    globalMembers: GroupMember[];
    masterPublishers: Publisher[];
    onRefresh: () => void;
    onSelectPublisher?: (name: string) => void;
    isReadOnly?: boolean;
}

const GlobalPublishersList: React.FC<GlobalPublishersListProps> = ({ groups, globalMembers, masterPublishers, onRefresh, onSelectPublisher, isReadOnly = false }) => {
    const { currentCongregation } = useCongregation();
    const [searchTerm, setSearchTerm] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);
    const [serviceYearReports, setServiceYearReports] = useState<any[]>([]);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [filterType, setFilterType] = useState<string>('todos');
    const [showBulkCardsModal, setShowBulkCardsModal] = useState<boolean>(false);
    const [copiedShare, setCopiedShare] = useState<boolean>(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

    // State for group management
    const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
    const [newGroupName, setNewGroupName] = useState<string>('');
    const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
    const [editingGroupNameValue, setEditingGroupNameValue] = useState<string>('');

    // State for publisher name editing
    const [editingPubId, setEditingPubId] = useState<number | null>(null);
    const [editingPubValue, setEditingPubValue] = useState<string>('');

    // State for publisher role/nombramiento/concept editing
    const [editingRolePubId, setEditingRolePubId] = useState<number | null>(null);
    const [editingRoleValue, setEditingRoleValue] = useState<string>('');
    const [isCustomRole, setIsCustomRole] = useState<boolean>(false);

    const handleCreateGroupInline = async () => {
        if (!newGroupName.trim() || !currentCongregation) return;
        try {
            const { error } = await supabase.from('grupos').insert([{ 
                nombre: newGroupName.trim(),
                congregation_id: currentCongregation.id
            }]);
            
            if (error) throw error;
            setNewGroupName('');
            onRefresh();
        } catch (err: any) {
            console.error("Error creating group:", err);
            alert("Error al crear el grupo: " + err.message);
        }
    };

    const handleEditGroupInline = async (groupId: number) => {
        if (!editingGroupNameValue.trim()) return;
        try {
            const { error } = await supabase.from('grupos')
                .update({ nombre: editingGroupNameValue.trim() })
                .eq('id', groupId);
            
            if (error) throw error;
            setEditingGroupId(null);
            setEditingGroupNameValue('');
            onRefresh();
        } catch (err: any) {
            console.error("Error editing group name:", err);
            alert("Error al editar el grupo: " + err.message);
        }
    };

    const handleDeleteGroupInline = async (groupId: number, nameOfGroup: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el grupo "${nameOfGroup}"? Los publicadores asignados a este grupo quedarán sin grupo asignado.`)) return;
        try {
            await supabase.from('miembros_grupo').delete().eq('grupo_id', groupId);
            const { error } = await supabase.from('grupos').delete().eq('id', groupId);
            if (error) throw error;
            onRefresh();
        } catch (err: any) {
            console.error("Error deleting group:", err);
            alert("Error al eliminar el grupo: " + err.message);
        }
    };

    const handleSavePublisherNameCompleto = async (publisherId: number, originalName: string) => {
        if (!editingPubValue.trim()) return;
        setUpdating(originalName);
        try {
            const { error } = await supabase.from('publicadores')
                .update({ nombre_completo: editingPubValue.trim() })
                .eq('id', publisherId);
            
            if (error) throw error;
            setEditingPubId(null);
            onRefresh();
        } catch (err: any) {
            console.error("Error editing publisher name:", err);
            alert("Error al editar el nombre: " + err.message);
        } finally {
            setUpdating(null);
        }
    };

    const handleSavePublisherRole = async (row: any, newRol: string) => {
        const cleanRol = newRol.trim();
        setUpdating(row.publisher.nombre);
        try {
            // Update role in 'publicadores' table
            const { error: errorPub } = await supabase.from('publicadores')
                .update({ rol: cleanRol })
                .eq('id', row.publisher.id);
            
            if (errorPub) throw errorPub;

            // Also update role in 'miembros_grupo' table if they are assigned to a group (have entry)
            if (row.memberId) {
                const { error: errorMem } = await supabase.from('miembros_grupo')
                    .update({ rol: cleanRol })
                    .eq('id', row.memberId);
                if (errorMem) throw errorMem;
            } else {
                // If not assigned to a group but matching entry exists, update it
                await supabase.from('miembros_grupo')
                    .update({ rol: cleanRol })
                    .eq('publicador_nombre', row.publisher.nombre);
            }

            setEditingRolePubId(null);
            onRefresh();
        } catch (err: any) {
            console.error("Error editing publisher role:", err);
            alert("Error al guardar el nombramiento o estado: " + err.message);
        } finally {
            setUpdating(null);
        }
    };

    const handleToggleEditMode = () => {
        if (isEditMode) {
            setIsEditMode(false);
        } else {
            const code = prompt('Ingrese la contraseña para edición (9803):');
            if (code === '9803') {
                setIsEditMode(true);
            } else if (code !== null) {
                alert('Contraseña incorrecta');
            }
        }
    };

    useEffect(() => {
        const fetchServiceYearData = async () => {
            if (!currentCongregation) return;
            try {
                // Calcular año de servicio actual
                const currentDate = new Date();
                // We use UTC date to avoid timezone issues giving wrong months, but fine for now
                const currentMonth = currentDate.getMonth() + 1;
                const currentYear = currentDate.getFullYear();
                const serviceYear = currentMonth >= 9 ? currentYear + 1 : currentYear;

                const startMonth = `${serviceYear - 1}-09`;
                const endMonth = `${serviceYear}-08`;

                const { data, error } = await supabase
                    .from('informes_ministerio')
                    .select('*')
                    .eq('congregation_id', currentCongregation.id)
                    .gte('mes', startMonth)
                    .lte('mes', endMonth);
                
                if (error) throw error;
                setServiceYearReports(data || []);
            } catch (err) {
                console.error("Error fetching service year reports:", err);
            }
        };

        fetchServiceYearData();
    }, [currentCongregation]);

    const baseData = useMemo(() => {
        return masterPublishers.map(pub => {
            const memberEntry = globalMembers.find(m => m.publicador_nombre.trim().toLowerCase() === pub.nombre.trim().toLowerCase());
            const currentGroup = memberEntry ? groups.find(g => g.id === memberEntry.grupo_id) : null;
            let currentGroupId: any = currentGroup?.id || 'unassigned';
            if (currentGroupId === 'unassigned' && pub.clasificacion_vmt === 'estudiante_vmt') {
                currentGroupId = 'estudiante_vmt';
            }
            
            return {
                publisher: pub,
                memberId: memberEntry?.id,
                currentGroupId: currentGroupId,
                role: memberEntry?.rol || pub.rol || 'Publicador'
            };
        }).filter(item => {
            const searchable = (item.publisher.nombre + ' ' + (item.publisher.nombre_completo || '')).toLowerCase();
            return searchable.includes(searchTerm.toLowerCase());
        })
          .sort((a, b) => {
              const nameA = a.publisher.nombre_completo || a.publisher.nombre;
              const nameB = b.publisher.nombre_completo || b.publisher.nombre;
              return nameA.localeCompare(nameB);
          });
    }, [masterPublishers, globalMembers, groups, searchTerm]);

    // Calcular estadísticas de nombramientos
    const stats = useMemo(() => {
        let ancianos = 0;
        let siervos = 0;
        let precursoresRegulares = 0;
        let precursoresEspeciales = 0;
        let inactivos = 0;
        
        baseData.forEach(row => {
            const lowerRol = (row.role || '').toLowerCase();
            if (lowerRol.includes('anciano')) ancianos++;
            if (lowerRol.includes('siervo ministerial')) siervos++;
            if (lowerRol.includes('precursor regular')) precursoresRegulares++;
            if (lowerRol.includes('precursor especial')) precursoresEspeciales++;
            if (lowerRol.includes('inactivo')) inactivos++;
        });

        return { ancianos, siervos, precursoresRegulares, precursoresEspeciales, inactivos };
    }, [baseData]);

    // Contadores por grupo
    const groupCounts = useMemo(() => {
        const counts: Record<string, number> = {
            unassigned: 0,
            estudiante_vmt: 0
        };
        groups.forEach(g => {
            counts[String(g.id)] = 0;
        });
        baseData.forEach(row => {
            const gid = String(row.currentGroupId);
            if (counts[gid] !== undefined) {
                counts[gid]++;
            } else if (gid === 'unassigned') {
                counts.unassigned++;
            } else if (gid === 'estudiante_vmt') {
                counts.estudiante_vmt++;
            }
        });
        return counts;
    }, [baseData, groups]);

    const serviceYearReportsByPublisher = useMemo(() => {
        const dict: Record<string, any[]> = {};
        serviceYearReports.forEach(r => {
            const name = (r.publicador_nombre || '').trim().toLowerCase();
            if (!dict[name]) dict[name] = [];
            dict[name].push(r);
        });
        return dict;
    }, [serviceYearReports]);

    // Función para calcular horas del precursor (similar a PublisherCards)
    const getPioneerStats = useCallback((publisherName: string, role: string, startMonthRaw?: string) => {
        const isRegularPioneer = role.includes('Precursor Regular');
        const isSpecialPioneer = role.includes('Precursor Especial');
        const isExempt = role.includes('Eximido de meta');
        
        if (!isRegularPioneer && !isSpecialPioneer) return null;

        const monthlyGoal = isSpecialPioneer ? 130 : 50;

        // Determine current service year boundaries
        const currentDate = new Date();
        const curM = currentDate.getMonth() + 1;
        const curY = currentDate.getFullYear();
        const serviceYear = curM >= 9 ? curY + 1 : curY;

        let startYm = startMonthRaw;
        // Basic YYYY-MM conversion if needed
        if (startYm && startYm.trim().length > 0) {
            const parts = startYm.trim().split('-');
            if (parts.length === 2 && parts[0].length === 4) {
               // Assuming it's already YYYY-MM
            }
        }
        
        if (!startYm || !startYm.match(/^\d{4}-\d{2}$/)) {
            startYm = `${serviceYear - 1}-09`; // Fallback to beginning of service year
        }

        // Target months sequence logically
        const months = [];
        for (let m = 9; m <= 12; m++) months.push(`${serviceYear - 1}-${m.toString().padStart(2, '0')}`);
        for (let m = 1; m <= 8; m++) months.push(`${serviceYear}-${m.toString().padStart(2, '0')}`);

        // Current month marker - don't expect hours for future months
        const targetCurrentMonthStr = `${curY}-${curM.toString().padStart(2, '0')}`;
        
        let countOfPioneerMonths = 0;
        let actualPioneerHours = 0;

        const pubReports = serviceYearReportsByPublisher[publisherName.trim().toLowerCase()] || [];

        // Find latest month with data for this publisher
        let latestIndexWithData = -1;
        for (let i = months.length - 1; i >= 0; i--) {
            const monthStr = months[i];
            const r = pubReports.find(x => x.mes === monthStr);
            if (r) { // Any report counts as data
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
            isExempt: isExempt
        };
    }, [serviceYearReportsByPublisher]);

    const data = useMemo(() => {
        const filtered = baseData.filter(item => {
            if (filterType === 'todos') return true;

            // Filtros de Grupo
            if (filterType === 'grupo:unassigned') return item.currentGroupId === 'unassigned';
            if (filterType === 'grupo:estudiante_vmt') return item.currentGroupId === 'estudiante_vmt';
            if (filterType.startsWith('grupo:')) {
                const targetGid = filterType.replace('grupo:', '');
                return String(item.currentGroupId) === String(targetGid);
            }

            // Filtros de Nombramiento / Rol
            const lowerRol = (item.role || '').toLowerCase();
            if (filterType === 'anciano') return lowerRol.includes('anciano');
            if (filterType === 'siervo') return lowerRol.includes('siervo ministerial');
            if (filterType === 'precursor regular') return lowerRol.includes('precursor regular');
            if (filterType === 'precursor especial') return lowerRol.includes('precursor especial');
            if (filterType === 'inactivo') return lowerRol.includes('inactivo');
            return true;
        }).map(item => ({
            ...item,
            pStats: getPioneerStats(item.publisher.nombre, item.role, item.publisher.inicio_precursor_mes)
        }));

        if (filterType === 'precursor regular' || filterType === 'precursor especial') {
            return filtered.sort((a, b) => {
                const diffA = a.pStats ? (a.pStats.isExempt ? 999999 : a.pStats.diff) : 0;
                const diffB = b.pStats ? (b.pStats.isExempt ? 999999 : b.pStats.diff) : 0;
                return diffA - diffB;
            });
        }
        return filtered;
    }, [baseData, filterType, getPioneerStats]);

    const handleGroupChange = async (publisherId: number, publisherName: string, memberId: number | undefined, newGroupId: string) => {
        setUpdating(publisherName);
        try {
            if (newGroupId === 'unassigned' || newGroupId === 'estudiante_vmt') {
                // Remove from members
                if (memberId) {
                    await supabase.from('miembros_grupo').delete().eq('id', memberId);
                }
                const clasif = newGroupId === 'estudiante_vmt' ? 'estudiante_vmt' : null;
                await supabase.from('publicadores').update({ clasificacion_vmt: clasif }).eq('id', publisherId);
            } else {
                const numGroupId = parseInt(newGroupId, 10);
                if (memberId) {
                    // Update existing
                    await supabase.from('miembros_grupo').update({ grupo_id: numGroupId }).eq('id', memberId);
                } else {
                    // Insert new
                    await supabase.from('miembros_grupo').insert([{
                        publicador_nombre: publisherName,
                        grupo_id: numGroupId,
                        rol: 'Publicador'
                    }]);
                }
                await supabase.from('publicadores').update({ clasificacion_vmt: null }).eq('id', publisherId);
            }
            onRefresh();
        } catch (err) {
            console.error('Error changing group', err);
            alert('Hubo un error al cambiar el grupo.');
        } finally {
            setUpdating(null);
        }
    };

    const handleDeletePublisher = async (publisherId: number, publisherName: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente a "${publisherName}"?`)) return;
        setUpdating(publisherName);
        try {
            await supabase.from('miembros_grupo').delete().eq('publicador_nombre', publisherName);
            await supabase.from('informes_ministerio').delete().eq('publicador_nombre', publisherName);
            await supabase.from('access_configs').delete().eq('label', publisherName); // Revoke access link if exists
            const { error } = await supabase.from('publicadores').delete().eq('id', publisherId);
            if (error) throw error;
            onRefresh();
        } catch (err) {
            console.error('Error al eliminar publicador', err);
            alert('Hubo un error al eliminar el publicador.');
        } finally {
            setUpdating(null);
        }
    };

    const handleDownloadFilteredListPdf = async () => {
        if (!data || data.length === 0) {
            alert('No hay publicadores en el filtro actual para descargar.');
            return;
        }

        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);

        const currentDate = new Date();
        const curM = currentDate.getMonth() + 1;
        const curY = currentDate.getFullYear();
        const serviceYear = curM >= 9 ? curY + 1 : curY;
        const congName = currentCongregation?.name || 'Congregación';
        
        let title = 'PADRÓN GENERAL DE PUBLICADORES';
        let filterSlug = 'Publicadores';
        if (filterType === 'precursor regular') {
            title = 'PADRÓN OFICIAL DE PRECURSORES REGULARES';
            filterSlug = 'Precursores_Regulares';
        } else if (filterType === 'precursor especial') {
            title = 'PADRÓN OFICIAL DE PRECURSORES ESPECIALES';
            filterSlug = 'Precursores_Especiales';
        } else if (filterType === 'anciano') {
            title = 'CUERPO DE ANCIANOS';
            filterSlug = 'Ancianos';
        } else if (filterType === 'siervo') {
            title = 'SIERVOS MINISTERIALES';
            filterSlug = 'Siervos_Ministeriales';
        } else if (filterType === 'inactivo') {
            title = 'REGISTRO DE PUBLICADORES INACTIVOS';
            filterSlug = 'Inactivos';
        } else if (filterType.startsWith('grupo:')) {
            const gid = filterType.replace('grupo:', '');
            const gName = gid === 'unassigned' ? 'Sin Grupo' : gid === 'estudiante_vmt' ? 'Escuela VMT' : groups.find(g => String(g.id) === gid)?.nombre || 'Grupo';
            title = `PADRÓN DE PUBLICADORES - ${gName.toUpperCase()}`;
            filterSlug = `Grupo_${gName.replace(/\s+/g, '_')}`;
        }

        if (searchTerm) {
            title += ` (Búsqueda: "${searchTerm}")`;
        }

        const isPioneerList = filterType === 'precursor regular' || filterType === 'precursor especial';
        
        let totalPioneerHours = 0;
        let totalExpectedHours = 0;
        let onTrackCount = 0;
        let deficitCount = 0;
        let exemptCount = 0;

        if (isPioneerList) {
            data.forEach(item => {
                if (item.pStats) {
                    totalPioneerHours += item.pStats.actual;
                    totalExpectedHours += item.pStats.expected;
                    if (item.pStats.isExempt) {
                        exemptCount++;
                    } else if (item.pStats.diff >= 0) {
                        onTrackCount++;
                    } else {
                        deficitCount++;
                    }
                }
            });
        }

        const todayStr = new Date().toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
        });

        const rowsHtml = data.map((row, index) => {
            const groupObj = groups.find(g => g.id === row.currentGroupId);
            const groupName = row.currentGroupId === 'unassigned' ? 'Sin Grupo' : 
                             row.currentGroupId === 'estudiante_vmt' ? 'Escuela VMT' : 
                             groupObj?.nombre || 'Grupo';
            
            const phone = row.publisher.telefono_personal || row.publisher.contacto_emergencia || '--';
            const name = row.publisher.nombre_completo || row.publisher.nombre;
            const pStats = row.pStats;

            return `
                <tr style="border-bottom: 1px solid #e2e8f0; height: 26px; ${index % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                    <td style="padding: 4px 6px; text-align: center; font-size: 8.5pt; color: #475569; font-weight: bold; border-right: 1px solid #cbd5e1;">${index + 1}</td>
                    <td style="padding: 4px 8px; font-size: 9pt; color: #0f172a; font-weight: bold; border-right: 1px solid #cbd5e1;">${name}</td>
                    <td style="padding: 4px 8px; font-size: 8.5pt; color: #334155; border-right: 1px solid #cbd5e1;">${row.role || 'Publicador'}</td>
                    <td style="padding: 4px 6px; text-align: center; font-size: 8.5pt; color: #334155; border-right: 1px solid #cbd5e1;">${groupName}</td>
                    <td style="padding: 4px 6px; text-align: center; font-size: 8.5pt; color: #475569; border-right: ${isPioneerList ? '1px solid #cbd5e1;' : 'none;'}">${phone}</td>
                    ${isPioneerList ? `
                        <td style="padding: 4px 6px; text-align: center; font-size: 9pt; font-weight: bold; color: #0f172a; border-right: 1px solid #cbd5e1;">
                            ${pStats ? pStats.actual.toFixed(1) : '--'}
                        </td>
                        <td style="padding: 4px 6px; text-align: center; font-size: 8.5pt; color: #64748b; border-right: 1px solid #cbd5e1;">
                            ${pStats && !pStats.isExempt ? pStats.expected.toFixed(1) : '--'}
                        </td>
                        <td style="padding: 4px 6px; text-align: center; font-size: 8.5pt; font-weight: bold; color: ${pStats?.isExempt ? '#059669' : (pStats?.diff || 0) >= 0 ? '#059669' : '#dc2626'}; border-right: 1px solid #cbd5e1;">
                            ${pStats ? (pStats.isExempt ? 'Eximido' : (pStats.diff >= 0 ? `+${pStats.diff.toFixed(1)}` : pStats.diff.toFixed(1))) : '--'}
                        </td>
                        <td style="padding: 4px 6px; text-align: center; font-size: 8pt; font-weight: bold; color: ${pStats?.isExempt ? '#059669' : (pStats?.diff || 0) >= 0 ? '#059669' : '#dc2626'};">
                            ${pStats ? (pStats.isExempt ? 'Eximido' : (pStats.diff >= 0 ? 'Cumpliendo' : `Faltan ${Math.abs(pStats.diff).toFixed(1)}h`)) : '--'}
                        </td>
                    ` : ''}
                </tr>
            `;
        }).join('');

        const tableHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 15px 20px; background: #ffffff;">
                <!-- Header -->
                <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <div style="font-size: 14pt; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #0f172a;">${congName}</div>
                        <div style="font-size: 11.5pt; font-weight: bold; color: #4338ca; margin-top: 2px;">${title}</div>
                        <div style="font-size: 8.5pt; color: #64748b; margin-top: 3px;">Año de Servicio ${serviceYear} &bull; Emitido: ${todayStr}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 9.5pt; font-weight: bold; color: #0f172a;">
                            Total: ${data.length} publicadores
                        </div>
                    </div>
                </div>

                ${isPioneerList ? `
                    <!-- Pioneer Summary Banner -->
                    <div style="display: flex; gap: 10px; margin-bottom: 14px;">
                        <div style="flex: 1; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; text-align: center;">
                            <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Horas Acumuladas</div>
                            <div style="font-size: 13pt; font-weight: 900; color: #0f172a; margin-top: 2px;">${totalPioneerHours.toFixed(1)} hrs</div>
                        </div>
                        <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 10px; text-align: center;">
                            <div style="font-size: 7.5pt; font-weight: bold; color: #166534; text-transform: uppercase;">Cumpliendo Meta</div>
                            <div style="font-size: 13pt; font-weight: 900; color: #15803d; margin-top: 2px;">${onTrackCount} precursores</div>
                        </div>
                        <div style="flex: 1; background: ${deficitCount > 0 ? '#fff1f2' : '#f8fafc'}; border: 1px solid ${deficitCount > 0 ? '#fecdd3' : '#cbd5e1'}; border-radius: 6px; padding: 8px 10px; text-align: center;">
                            <div style="font-size: 7.5pt; font-weight: bold; color: ${deficitCount > 0 ? '#9f1239' : '#64748b'}; text-transform: uppercase;">Con Déficit</div>
                            <div style="font-size: 13pt; font-weight: 900; color: ${deficitCount > 0 ? '#be123c' : '#475569'}; margin-top: 2px;">${deficitCount} precursores</div>
                        </div>
                        ${exemptCount > 0 ? `
                            <div style="flex: 1; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; text-align: center;">
                                <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Eximidos</div>
                                <div style="font-size: 13pt; font-weight: 900; color: #475569; margin-top: 2px;">${exemptCount}</div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Data Table -->
                <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; table-layout: fixed; margin-top: 6px;">
                    <thead>
                        <tr style="background-color: #0f172a; color: #ffffff; height: 30px;">
                            <th style="padding: 5px 4px; font-size: 8pt; font-weight: bold; width: 32px; text-align: center; border-right: 1px solid #334155;">#</th>
                            <th style="padding: 5px 8px; font-size: 8.5pt; font-weight: bold; text-align: left; border-right: 1px solid #334155;">Publicador / Nombre</th>
                            <th style="padding: 5px 8px; font-size: 8.5pt; font-weight: bold; width: ${isPioneerList ? '110px' : '150px'}; text-align: left; border-right: 1px solid #334155;">Nombramiento</th>
                            <th style="padding: 5px 6px; font-size: 8.5pt; font-weight: bold; width: ${isPioneerList ? '90px' : '120px'}; text-align: center; border-right: 1px solid #334155;">Grupo</th>
                            <th style="padding: 5px 6px; font-size: 8.5pt; font-weight: bold; width: ${isPioneerList ? '95px' : '120px'}; text-align: center; border-right: ${isPioneerList ? '1px solid #334155;' : 'none;'}">Teléfono</th>
                            ${isPioneerList ? `
                                <th style="padding: 5px 4px; font-size: 8pt; font-weight: bold; width: 65px; text-align: center; border-right: 1px solid #334155;">Horas</th>
                                <th style="padding: 5px 4px; font-size: 8pt; font-weight: bold; width: 55px; text-align: center; border-right: 1px solid #334155;">Meta</th>
                                <th style="padding: 5px 4px; font-size: 8pt; font-weight: bold; width: 60px; text-align: center; border-right: 1px solid #334155;">Dif.</th>
                                <th style="padding: 5px 4px; font-size: 8pt; font-weight: bold; width: 90px; text-align: center;">Estado</th>
                            ` : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    ${isPioneerList ? `
                        <tfoot>
                            <tr style="background-color: #f1f5f9; border-top: 1.5px solid #0f172a; height: 28px;">
                                <td colspan="5" style="padding: 5px 8px; text-align: right; font-weight: 900; font-size: 8.5pt; color: #0f172a; border-right: 1px solid #cbd5e1;">
                                    TOTALES:
                                </td>
                                <td style="padding: 5px 4px; text-align: center; font-weight: 900; font-size: 9pt; color: #0f172a; border-right: 1px solid #cbd5e1;">
                                    ${totalPioneerHours.toFixed(1)}
                                </td>
                                <td style="padding: 5px 4px; text-align: center; font-weight: bold; font-size: 8.5pt; color: #64748b; border-right: 1px solid #cbd5e1;">
                                    ${totalExpectedHours.toFixed(1)}
                                </td>
                                <td style="padding: 5px 4px; text-align: center; font-weight: 900; font-size: 8.5pt; color: ${totalPioneerHours >= totalExpectedHours ? '#059669' : '#dc2626'}; border-right: 1px solid #cbd5e1;">
                                    ${(totalPioneerHours - totalExpectedHours) >= 0 ? `+${(totalPioneerHours - totalExpectedHours).toFixed(1)}` : (totalPioneerHours - totalExpectedHours).toFixed(1)}
                                </td>
                                <td style="padding: 5px 4px; text-align: center; font-size: 8pt; font-weight: bold; color: #475569;">
                                    ${onTrackCount}/${data.length} al día
                                </td>
                            </tr>
                        </tfoot>
                    ` : ''}
                </table>

                <!-- Footer notes -->
                <div style="margin-top: 15px; font-size: 7.5pt; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    <div>Documento generado para uso interno de la congregación &bull; Registro confidencial</div>
                    <div>Total registros: ${data.length}</div>
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '794px';
        container.style.backgroundColor = '#ffffff';
        container.style.color = '#0f172a';
        container.innerHTML = tableHtml;
        document.body.appendChild(container);

        try {
            // Small pause to guarantee full layout calculation
            await new Promise(resolve => setTimeout(resolve, 80));

            const congSlug = congName.replace(/\s+/g, '_');
            const fileName = `Lista_${filterSlug}_${congSlug}_${serviceYear}.pdf`;
            const opt = {
                margin: [8, 8, 8, 8],
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    backgroundColor: '#ffffff',
                    windowWidth: 794
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            };

            const pdfFn = (html2pdf as any) || (window as any).html2pdf;
            if (typeof pdfFn === 'function') {
                await pdfFn().set(opt).from(container).save();
            } else {
                const mod = await import('html2pdf.js');
                const h2p = (mod as any).default || mod;
                await h2p().set(opt).from(container).save();
            }
        } catch (err) {
            console.error("Error saving PDF:", err);
            alert("Hubo un error al generar el archivo PDF. Por favor verifique e intente nuevamente.");
        } finally {
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
            setIsGeneratingPdf(false);
        }
    };

      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-4 sm:p-7 shadow-xl border border-slate-200/80 dark:border-slate-800/80 max-w-[1100px] mx-auto transition-all">
            <div className="flex flex-col gap-5 mb-6">
                {/* Header title & Main Action Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Publicadores</h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                                    {baseData.length} Total
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Padrón general, nombramientos y registro de actividad</p>
                        </div>
                    </div>
                    
                    {/* Action buttons toolbar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={handleDownloadFilteredListPdf}
                            disabled={isGeneratingPdf}
                            className="px-3.5 py-2 rounded-xl cursor-pointer font-bold text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Descargar lista filtrada en formato PDF"
                        >
                            {isGeneratingPdf ? (
                                <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                            ) : (
                                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            )}
                            <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar Lista (PDF)'}</span>
                        </button>

                        <button
                            onClick={() => setShowBulkCardsModal(true)}
                            className="px-3.5 py-2 rounded-xl cursor-pointer font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600 transition-all duration-200 flex items-center gap-2 shadow-sm shadow-indigo-600/20 hover:shadow active:scale-95"
                            title="Descargar tarjetas S-21 masivas en PDF"
                        >
                            <IdCard className="w-4 h-4" />
                            <span>Tarjetas S-21 (PDF)</span>
                        </button>

                        {currentCongregation && (
                            <button
                                onClick={() => {
                                    const shareUrl = `${window.location.origin}${window.location.pathname}?view=publisher_report&congregation_id=${currentCongregation.id}`;
                                    navigator.clipboard.writeText(shareUrl).then(() => {
                                        setCopiedShare(true);
                                        setTimeout(() => setCopiedShare(false), 2500);
                                    }).catch(() => {
                                        alert('Enlace: ' + shareUrl);
                                    });
                                }}
                                className={`px-3 py-2 rounded-xl font-bold text-xs border transition-all duration-200 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                    copiedShare
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                }`}
                                title="Compartir padrón de precursores y fichas S-21"
                            >
                                {copiedShare ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4 text-slate-500" />}
                                <span>{copiedShare ? '¡Copiado!' : 'Compartir'}</span>
                            </button>
                        )}

                        {!isReadOnly && (
                            <button
                                onClick={handleToggleEditMode}
                                className={`px-3 py-2 rounded-xl cursor-pointer font-bold text-xs border transition-all duration-200 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                    isEditMode 
                                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                            >
                                {isEditMode ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                <span>{isEditMode ? 'Edición Activa' : 'Modo Edición'}</span>
                            </button>
                        )}

                        {isEditMode && (
                            <button
                                onClick={() => setShowGroupModal(true)}
                                className="px-3.5 py-2 rounded-xl cursor-pointer font-bold text-xs bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-all duration-200 flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Gestionar Grupos</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Single Unified Search & Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input 
                            type="text" 
                            placeholder="Buscar publicador por nombre..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 dark:text-white placeholder:text-slate-400 shadow-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Single Unified Filter Dropdown */}
                    <div className="relative sm:w-80 shrink-0">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 pointer-events-none flex items-center">
                            <Filter className="w-4 h-4" />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm appearance-none"
                        >
                            <option value="todos">Todos los Publicadores ({baseData.length})</option>
                            
                            <optgroup label="── NOMBRAMIENTO / ESTADO ──">
                                <option value="anciano">Ancianos ({stats.ancianos})</option>
                                <option value="siervo">Siervos Ministeriales ({stats.siervos})</option>
                                <option value="precursor regular">Precursores Regulares ({stats.precursoresRegulares})</option>
                                <option value="precursor especial">Precursores Especiales ({stats.precursoresEspeciales})</option>
                                <option value="inactivo">Inactivos ({stats.inactivos})</option>
                            </optgroup>

                            <optgroup label="── GRUPOS DE PREDICACIÓN ──">
                                {groups.map(g => (
                                    <option key={g.id} value={`grupo:${g.id}`}>
                                        {g.nombre} ({groupCounts[String(g.id)] || 0})
                                    </option>
                                ))}
                                <option value="grupo:estudiante_vmt">Escuela VMT ({groupCounts['estudiante_vmt'] || 0})</option>
                                <option value="grupo:unassigned">Sin Grupo Asignado ({groupCounts['unassigned'] || 0})</option>
                            </optgroup>
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                {/* Active Filter Ribbon */}
                {(filterType !== 'todos' || searchTerm.trim() !== '') && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-slate-900/60 border border-indigo-100 dark:border-indigo-900/60 rounded-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                            {filterType !== 'todos' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm">
                                    <Filter className="w-3.5 h-3.5" />
                                    {filterType === 'precursor regular' ? 'Precursores Regulares' :
                                     filterType === 'precursor especial' ? 'Precursores Especiales' :
                                     filterType === 'anciano' ? 'Ancianos' :
                                     filterType === 'siervo' ? 'Siervos Ministeriales' :
                                     filterType === 'inactivo' ? 'Inactivos' :
                                     filterType === 'grupo:unassigned' ? 'Sin Grupo Asignado' :
                                     filterType === 'grupo:estudiante_vmt' ? 'Escuela VMT' :
                                     filterType.startsWith('grupo:') ? (groups.find(g => String(g.id) === filterType.replace('grupo:', ''))?.nombre || 'Grupo') : 'Filtro Activo'}
                                </span>
                            )}

                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {data.length} {data.length === 1 ? 'publicador encontrado' : 'publicadores encontrados'}
                            </span>
                            {searchTerm && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                                    (búsqueda: "{searchTerm}")
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={handleDownloadFilteredListPdf}
                                disabled={isGeneratingPdf}
                                className="text-xs font-bold px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Descargar listado filtrado en PDF"
                            >
                                {isGeneratingPdf ? (
                                    <Loader2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                                ) : (
                                    <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                )}
                                <span>{isGeneratingPdf ? 'Generando...' : `Lista PDF (${data.length})`}</span>
                            </button>
                            <button
                                onClick={() => setShowBulkCardsModal(true)}
                                className="text-xs font-bold px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                title="Descargar tarjetas S-21 de los publicadores filtrados"
                            >
                                <IdCard className="w-3.5 h-3.5" />
                                <span>{data.length} Tarjetas S-21</span>
                            </button>
                            <button
                                onClick={() => { setFilterType('todos'); setSearchTerm(''); }}
                                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                                title="Quitar todos los filtros"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Limpiar Filtros</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block w-full overflow-x-auto mt-6 bg-white rounded-lg shadow-sm border border-slate-200">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-left font-bold text-slate-500 uppercase text-[11px] tracking-wider w-1/3 border-r border-slate-200">NOMBRE</th>
                            <th className="p-4 text-left font-bold text-slate-500 uppercase text-[11px] tracking-wider border-r border-slate-200">INFORMACIÓN (PRECURSORES)</th>
                            <th className="p-4 text-center font-bold text-slate-500 uppercase text-[11px] tracking-wider w-1/4">GRUPO</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {data.map((row, idx) => {
                            const pStats = row.pStats;
                            
                            return (
                                <tr key={idx} className={`hover:bg-slate-50 transition-colors ${updating === row.publisher.nombre ? 'bg-amber-50' : ''}`}>
                                    <td 
                                        className={`p-4 align-middle border-b border-r border-slate-200 ${(!isEditMode && onSelectPublisher) ? 'text-blue-600 cursor-pointer' : 'text-slate-800 cursor-default'}`}
                                        onClick={() => !isEditMode && onSelectPublisher && onSelectPublisher(row.publisher.nombre)}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 flex-wrap font-semibold">
                                                {isEditMode ? (
                                                    editingPubId === row.publisher.id ? (
                                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <input 
                                                                type="text" 
                                                                value={editingPubValue} 
                                                                onChange={(e) => setEditingPubValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSavePublisherNameCompleto(row.publisher.id, row.publisher.nombre);
                                                                    else if (e.key === 'Escape') setEditingPubId(null);
                                                                }}
                                                                className="p-1 text-xs rounded border border-slate-200 outline-none focus:ring-1 focus:ring-indigo-400 font-medium text-slate-800"
                                                                autoFocus
                                                            />
                                                            <button 
                                                                onClick={() => handleSavePublisherNameCompleto(row.publisher.id, row.publisher.nombre)}
                                                                className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors"
                                                                title="Guardar nombre"
                                                            >
                                                                <i className="fas fa-check text-xs"></i>
                                                            </button>
                                                            <button 
                                                                onClick={() => setEditingPubId(null)}
                                                                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                                                title="Cancelar"
                                                            >
                                                                <i className="fas fa-times text-xs"></i>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{row.publisher.nombre_completo || row.publisher.nombre}</span>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingPubId(row.publisher.id);
                                                                    setEditingPubValue(row.publisher.nombre_completo || row.publisher.nombre || '');
                                                                }}
                                                                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-slate-100 rounded transition-colors"
                                                                title="Editar Nombre Completo"
                                                            >
                                                                <i className="fas fa-pen text-[10px]"></i>
                                                            </button>
                                                        </div>
                                                    )
                                                ) : (
                                                    <span>{row.publisher.nombre_completo || row.publisher.nombre}</span>
                                                )}
                                                {!isEditMode && onSelectPublisher && <i className="fas fa-external-link-alt text-[0.7rem] text-slate-400"></i>}
                                            </div>
                                            {isEditMode ? (
                                                editingRolePubId === row.publisher.id ? (
                                                    <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                                                        {!isCustomRole ? (
                                                            <select
                                                                value={['Publicador', 'Anciano', 'Siervo ministerial', 'Precursor Regular', 'Precursor Especial', 'Precursor Auxiliar', 'Inactivo'].includes(editingRoleValue) ? editingRoleValue : 'custom_role'}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === 'custom_role') {
                                                                        setIsCustomRole(true);
                                                                    } else {
                                                                        setEditingRoleValue(val);
                                                                    }
                                                                }}
                                                                className="p-1 text-[11px] rounded border border-slate-300 outline-none focus:ring-1 focus:ring-indigo-400 font-semibold text-slate-700 bg-white cursor-pointer"
                                                            >
                                                                <option value="Publicador">Publicador</option>
                                                                <option value="Anciano">Anciano</option>
                                                                <option value="Siervo ministerial">Siervo ministerial</option>
                                                                <option value="Precursor Regular">Precursor Regular</option>
                                                                <option value="Precursor Especial">Precursor Especial</option>
                                                                <option value="Precursor Auxiliar">Precursor Auxiliar</option>
                                                                <option value="Inactivo">Inactivo</option>
                                                                <option value="custom_role">Otro (Escribir...)</option>
                                                            </select>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                value={editingRoleValue} 
                                                                onChange={(e) => setEditingRoleValue(e.target.value)}
                                                                placeholder="Nombramiento o concepto..."
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSavePublisherRole(row, editingRoleValue);
                                                                    else if (e.key === 'Escape') setEditingRolePubId(null);
                                                                }}
                                                                className="p-1 text-[11px] rounded border border-slate-300 outline-none focus:ring-1 focus:ring-indigo-400 font-medium text-slate-800 w-32"
                                                                autoFocus
                                                            />
                                                        )}
                                                        <button 
                                                            onClick={() => handleSavePublisherRole(row, editingRoleValue)}
                                                            className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                                                            title="Guardar nombramiento"
                                                        >
                                                            <i className="fas fa-check text-xs"></i>
                                                        </button>
                                                        {isCustomRole && (
                                                            <button 
                                                                onClick={() => {
                                                                    setIsCustomRole(false);
                                                                    setEditingRoleValue('Publicador');
                                                                }}
                                                                className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                                                title="Volver a lista"
                                                            >
                                                                <i className="fas fa-list text-xs"></i>
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => setEditingRolePubId(null)}
                                                            className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                                            title="Cancelar"
                                                        >
                                                            <i className="fas fa-times text-xs"></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{row.role}</span>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingRolePubId(row.publisher.id);
                                                                setEditingRoleValue(row.role || 'Publicador');
                                                                setIsCustomRole(!['Publicador', 'Anciano', 'Siervo ministerial', 'Precursor Regular', 'Precursor Especial', 'Precursor Auxiliar', 'Inactivo'].includes(row.role || 'Publicador'));
                                                            }}
                                                            className="p-1 text-indigo-500 hover:text-indigo-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                            title="Editar Nombramiento o Estado"
                                                        >
                                                            <i className="fas fa-pen text-[9px]"></i>
                                                        </button>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{row.role}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-800 align-middle border-b border-r border-slate-200">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex text-[11px] sm:text-xs text-slate-600 font-medium gap-2 items-center shrink-0">
                                                <i className="fas fa-phone-alt text-slate-400"></i> 
                                                <span>{row.publisher.telefono_personal || row.publisher.contacto_emergencia || '--'}</span>
                                            </div>
                                            
                                            {pStats && (
                                                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] border ${(pStats.diff >= 0 || pStats.isExempt) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                    <span className="font-bold text-slate-600 uppercase tracking-wide hidden sm:inline">Horas:</span>
                                                    <span className="font-bold font-mono text-[11px] sm:text-[12px]">{pStats.actual.toFixed(1)} {pStats.isExempt ? '' : `/ ${pStats.expected.toFixed(1)}`}</span>
                                                    {pStats.isExempt ? (
                                                        <span className="font-bold text-emerald-600">Eximido <i className="fas fa-check-circle"></i></span>
                                                    ) : pStats.diff < 0 ? (
                                                        <span className="font-bold text-rose-600" title={`Faltan ${Math.abs(pStats.diff).toFixed(1)} horas según la meta acumulada actual`}>(-{Math.abs(pStats.diff).toFixed(1)}) <i className="fas fa-arrow-down"></i></span>
                                                    ) : (
                                                        <span className="font-bold text-emerald-600">({pStats.diff > 0 ? '+' : ''}{pStats.diff.toFixed(1)}) <i className="fas fa-arrow-up"></i></span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle text-center border-b border-slate-200">
                                        <div className="flex gap-2 items-center justify-center">
                                            {isEditMode ? (
                                                <>
                                                    <select 
                                                        value={row.currentGroupId}
                                                        onChange={(e) => handleGroupChange(row.publisher.id, row.publisher.nombre, row.memberId, e.target.value)}
                                                        disabled={updating === row.publisher.nombre}
                                                        className={`p-1.5 rounded-md border border-slate-300 text-[10px] sm:text-xs cursor-pointer focus:ring-1 focus:ring-indigo-400 font-semibold max-w-[120px] sm:max-w-none ${row.currentGroupId === 'unassigned' ? 'bg-red-50 text-red-800' : row.currentGroupId === 'estudiante_vmt' ? 'bg-sky-50 text-sky-800' : 'bg-white text-slate-700'}`}
                                                    >
                                                        <option value="unassigned">-- Sin Grupo --</option>
                                                        <option value="estudiante_vmt">-- Escuela VMT --</option>
                                                        {groups.map(g => (
                                                            <option key={g.id} value={g.id}>{g.nombre}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => handleDeletePublisher(row.publisher.id, row.publisher.nombre)}
                                                        disabled={updating === row.publisher.nombre}
                                                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 border border-transparent hover:border-red-200 hover:bg-red-50 transition-all shrink-0"
                                                        style={{ opacity: updating === row.publisher.nombre ? 0.5 : 1 }}
                                                        title="Eliminar publicador"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-[10px] sm:text-[11px] font-bold border ${row.currentGroupId === 'unassigned' ? 'bg-red-50 border-red-200 text-red-700' : row.currentGroupId === 'estudiante_vmt' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                                                    {row.currentGroupId === 'unassigned' ? 'Sin Grupo' : 
                                                     row.currentGroupId === 'estudiante_vmt' ? 'Escuela VMT' : 
                                                     groups.find(g => g.id === row.currentGroupId)?.nombre || 'Desconocido'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
        {data.length === 0 && (
            <tr>
                <td colSpan={3} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                        <i className="fas fa-search text-3xl text-slate-300"></i>
                        <span>No se encontraron publicadores con ese nombre.</span>
                    </div>
                </td>
            </tr>
        )}
    </tbody>
</table>
</div>

{/* MOBILE CARD VIEW */}
<div className="md:hidden mt-6 flex flex-col gap-4">
    {data.map((row, idx) => {
        const pStats = row.pStats;
        
        return (
            <div key={idx} className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${updating === row.publisher.nombre ? 'ring-2 ring-amber-400 bg-amber-50' : ''}`}>
                <div 
                    className={`p-4 border-b border-slate-100 ${(!isEditMode && onSelectPublisher) ? 'cursor-pointer' : ''}`}
                    onClick={() => !isEditMode && onSelectPublisher && onSelectPublisher(row.publisher.nombre)}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap font-bold text-base text-slate-800">
                                <span>{row.publisher.nombre_completo || row.publisher.nombre}</span>
                                {!isEditMode && onSelectPublisher && <i className="fas fa-external-link-alt text-[0.7rem] text-slate-400"></i>}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-1">{row.role}</div>
                        </div>
                        {isEditMode && (
                            <div className="flex gap-1 shrink-0 ml-2">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingPubId(row.publisher.id);
                                        setEditingPubValue(row.publisher.nombre_completo || row.publisher.nombre || '');
                                        // A simple prompt is easier on mobile than complex inline inputs
                                        const newName = window.prompt("Editar Nombre Completo:", row.publisher.nombre_completo || row.publisher.nombre || '');
                                        if (newName !== null && newName.trim() !== '') {
                                            handleSavePublisherNameCompleto(row.publisher.id, newName);
                                        }
                                    }}
                                    className="w-7 h-7 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                >
                                    <i className="fas fa-pen text-[10px]"></i>
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newRole = window.prompt("Editar Nombramiento (Publicador, Anciano, Siervo ministerial, Precursor Regular...):", row.role || 'Publicador');
                                        if (newRole !== null && newRole.trim() !== '') {
                                            handleSavePublisherRole(row, newRole);
                                        }
                                    }}
                                    className="w-7 h-7 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                >
                                    <i className="fas fa-id-badge text-[10px]"></i>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePublisher(row.publisher.id, row.publisher.nombre);
                                    }}
                                    disabled={updating === row.publisher.nombre}
                                    className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                    <i className="fas fa-trash text-[10px]"></i>
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                        <i className="fas fa-phone-alt text-slate-400"></i> 
                        <span>{row.publisher.telefono_personal || row.publisher.contacto_emergencia || '--'}</span>
                    </div>

                    {pStats && (
                        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${(pStats.diff >= 0 || pStats.isExempt) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            <span className="font-bold text-slate-600 uppercase tracking-wide">Horas:</span>
                            <span className="font-bold font-mono">{pStats.actual.toFixed(1)} {pStats.isExempt ? '' : `/ ${pStats.expected.toFixed(1)}`}</span>
                            {pStats.isExempt ? (
                                <span className="font-bold text-emerald-600 ml-1">Eximido <i className="fas fa-check-circle"></i></span>
                            ) : pStats.diff < 0 ? (
                                <span className="font-bold text-rose-600 ml-1">(-{Math.abs(pStats.diff).toFixed(1)}) <i className="fas fa-arrow-down"></i></span>
                            ) : (
                                <span className="font-bold text-emerald-600 ml-1">({pStats.diff > 0 ? '+' : ''}{pStats.diff.toFixed(1)}) <i className="fas fa-arrow-up"></i></span>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="p-3 bg-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Grupo / Clasificación</span>
                    {isEditMode ? (
                        <select 
                            value={row.currentGroupId}
                            onChange={(e) => handleGroupChange(row.publisher.id, row.publisher.nombre, row.memberId, e.target.value)}
                            disabled={updating === row.publisher.nombre}
                            className={`p-1.5 rounded-md border border-slate-300 text-xs cursor-pointer focus:ring-1 focus:ring-indigo-400 font-bold max-w-[150px] ${row.currentGroupId === 'unassigned' ? 'bg-red-50 text-red-800' : row.currentGroupId === 'estudiante_vmt' ? 'bg-sky-50 text-sky-800' : 'bg-white text-slate-700'}`}
                        >
                            <option value="unassigned">-- Sin Grupo --</option>
                            <option value="estudiante_vmt">-- Escuela --</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.nombre}</option>
                            ))}
                        </select>
                    ) : (
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${row.currentGroupId === 'unassigned' ? 'bg-red-50 border-red-200 text-red-700' : row.currentGroupId === 'estudiante_vmt' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-slate-300 text-slate-700 shadow-sm'}`}>
                            {row.currentGroupId === 'unassigned' ? 'Sin Grupo' : 
                             row.currentGroupId === 'estudiante_vmt' ? 'Escuela VMT' : 
                             groups.find(g => g.id === row.currentGroupId)?.nombre || 'Desconocido'}
                        </span>
                    )}
                </div>
            </div>
        );
    })}

    {data.length === 0 && (
        <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col items-center gap-3">
                <i className="fas fa-search text-3xl text-slate-300"></i>
                <span className="text-sm">No se encontraron publicadores con ese nombre.</span>
            </div>
        </div>
    )}
</div>

            {/* INLINE GROUPS MANAGEMENT MODAL */}
            {showGroupModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col p-6 relative">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <i className="fas fa-layer-group text-indigo-600"></i>
                                <span>Gestionar Grupos</span>
                            </h3>
                            <button 
                                onClick={() => {
                                    setShowGroupModal(false);
                                    setEditingGroupId(null);
                                    setNewGroupName('');
                                }} 
                                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xl"
                            >
                                &times;
                            </button>
                        </div>

                        {/* ADD GROUP FORM */}
                        <div className="py-4 border-b border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Crear Nuevo Grupo</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Nombre del nuevo grupo..." 
                                    value={newGroupName} 
                                    onChange={(e) => setNewGroupName(e.target.value)} 
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateGroupInline();
                                    }}
                                    className="flex-1 p-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                />
                                <button 
                                    onClick={handleCreateGroupInline}
                                    style={{ backgroundColor: '#4f46e5' }}
                                    className="px-4 py-2 text-white hover:bg-opacity-90 rounded-lg text-sm font-bold flex items-center gap-1 transition-all"
                                >
                                    <i className="fas fa-plus"></i>
                                    <span>Agregar</span>
                                </button>
                            </div>
                        </div>

                        {/* LIST OF GROUPS TO EDIT/DELETE */}
                        <div className="py-4 flex-1 overflow-y-auto max-h-[300px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Grupos Existentes</label>
                            <div className="flex flex-col gap-2">
                                {groups.map((group) => (
                                    <div 
                                        key={group.id} 
                                        className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        {editingGroupId === group.id ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <input 
                                                    type="text" 
                                                    value={editingGroupNameValue} 
                                                    onChange={(e) => setEditingGroupNameValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleEditGroupInline(group.id);
                                                        else if (e.key === 'Escape') setEditingGroupId(null);
                                                    }}
                                                    className="flex-1 p-1 rounded border border-slate-200 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={() => handleEditGroupInline(group.id)}
                                                    className="p-1 text-green-600 hover:text-green-800 transition-colors"
                                                    title="Guardar nombre"
                                                >
                                                    <i className="fas fa-check text-sm"></i>
                                                </button>
                                                <button 
                                                    onClick={() => setEditingGroupId(null)}
                                                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <i className="fas fa-times text-sm"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-sm font-medium text-slate-700">{group.nombre}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingGroupId(group.id);
                                                            setEditingGroupNameValue(group.nombre);
                                                        }}
                                                        className="p-1.5 rounded text-blue-500 hover:bg-blue-50 transition-colors"
                                                        title="Editar nombre de grupo"
                                                    >
                                                        <i className="fas fa-edit text-xs"></i>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteGroupInline(group.id, group.nombre)}
                                                        className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Eliminar grupo"
                                                    >
                                                        <i className="fas fa-trash text-xs"></i>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {groups.length === 0 && (
                                    <div className="text-center py-4 text-xs text-slate-400">
                                        No hay grupos de predicación creados.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CLOSE BUTTON */}
                        <div className="pt-3 border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => {
                                    setShowGroupModal(false);
                                    setEditingGroupId(null);
                                    setNewGroupName('');
                                }} 
                                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all font-semibold text-sm cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BulkCardsModal
                isOpen={showBulkCardsModal}
                onClose={() => setShowBulkCardsModal(false)}
                groups={groups}
                masterPublishers={masterPublishers}
                globalMembers={globalMembers}
                defaultServiceYear={new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear()}
                initialRoleFilter={filterType}
                filteredPublisherNames={data.map(d => d.publisher.nombre)}
            />
        </div>
    );
};

export default GlobalPublishersList;
