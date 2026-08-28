import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Group, GroupMember, Publisher } from './types';
import { supabase } from '../../lib/supabase';
import { fetchAllMinistryReports } from '../../lib/supabasePagination';
import { useCongregation } from '../../lib/CongregationContext';
import { isReportAuxiliar } from './utils';
import { BulkCardsModal } from './BulkCardsModal';
import { DocumentPreviewModal, DocumentPreviewVariant } from './DocumentPreviewModal';
import { printHtmlDocument, downloadHtmlAsPdf } from './printUtils';
import { generateCardPagesArray, fetchReportsForServiceYear } from './s21CardGenerator';
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
    const [isLoadingCardsPreview, setIsLoadingCardsPreview] = useState<boolean>(false);
    const [previewModalData, setPreviewModalData] = useState<{
        isOpen: boolean;
        pages: string[];
        title: string;
        fileName: string;
        layoutLabel?: string;
        variants?: DocumentPreviewVariant[];
        activeVariantId?: string;
    } | null>(null);


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

                const data = await fetchAllMinistryReports(currentCongregation.id, startMonth, endMonth);
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

    const buildListDocumentData = () => {
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
            <div class="s21-card-page" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 20px 24px; background: #ffffff; width: 794px; min-height: 1100px; box-sizing: border-box; margin: 0 auto;">
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

        const congSlug = congName.replace(/\s+/g, '_');
        const fileName = `Lista_${filterSlug}_${congSlug}_${serviceYear}.pdf`;

        return { tableHtml, fileName, title, serviceYear };
    };

    const loadReportsIfNeeded = async (sYear: number) => {
        if (serviceYearReports && serviceYearReports.length > 0) {
            return serviceYearReports;
        }
        try {
            const reports = await fetchReportsForServiceYear(sYear, currentCongregation?.id);
            setServiceYearReports(reports);
            return reports;
        } catch (e) {
            console.error("Error fetching reports for S-21:", e);
            return [];
        }
    };

    const handlePreviewCardsPdf = async () => {
        if (!data || data.length === 0) {
            alert('No hay publicadores en el filtro actual para generar tarjetas.');
            return;
        }
        if (isLoadingCardsPreview) return;
        setIsLoadingCardsPreview(true);

        try {
            const currentDate = new Date();
            const curM = currentDate.getMonth() + 1;
            const curY = currentDate.getFullYear();
            const serviceYear = curM >= 9 ? curY + 1 : curY;
            const congName = currentCongregation?.name || 'Congregación';

            const filteredPubs = data.map(d => d.publisher);
            const reports = await loadReportsIfNeeded(serviceYear);

            // Generate S-21 Card Pages (2 in 1 A4)
            const cardPages = generateCardPagesArray(filteredPubs, reports, globalMembers, '2', serviceYear);
            
            // Build list data for variant toggle
            const { tableHtml, fileName: listFileName, title: listTitle } = buildListDocumentData();

            let filterSlug = 'Publicadores';
            if (filterType === 'precursor regular') filterSlug = 'Precursores_Regulares';
            else if (filterType === 'precursor especial') filterSlug = 'Precursores_Especiales';
            else if (filterType === 'anciano') filterSlug = 'Ancianos';
            else if (filterType === 'siervo') filterSlug = 'Siervos';
            else if (filterType === 'inactivo') filterSlug = 'Inactivos';
            else if (filterType.startsWith('grupo:')) {
                const gid = filterType.replace('grupo:', '');
                const gName = gid === 'unassigned' ? 'Sin_Grupo' : gid === 'estudiante_vmt' ? 'Escuela_VMT' : groups.find(g => String(g.id) === gid)?.nombre?.replace(/\s+/g, '_') || 'Grupo';
                filterSlug = `Grupo_${gName}`;
            }

            const congSlug = congName.replace(/\s+/g, '_');
            const cardsTitle = `TARJETAS S-21 - ${congName.toUpperCase()}`;
            const cardsFileName = `Tarjetas_S21_${filterSlug}_${congSlug}_${serviceYear}.pdf`;

            const variants: DocumentPreviewVariant[] = [
                {
                    id: 'cards',
                    label: `Tarjetas S-21 (${filteredPubs.length})`,
                    icon: 'cards',
                    title: cardsTitle,
                    fileName: cardsFileName,
                    pages: cardPages,
                    layoutLabel: '2 en 1 (A4)',
                    subtitle: `Tarjetas S-21 de Registro de Publicador (${cardPages.length} páginas para ${filteredPubs.length} publicadores)`
                },
                {
                    id: 'list',
                    label: `Padrón / Lista (${filteredPubs.length})`,
                    icon: 'table',
                    title: listTitle,
                    fileName: listFileName,
                    pages: [tableHtml],
                    layoutLabel: 'Padrón Oficial',
                    subtitle: `Listado oficial de la congregación (${filteredPubs.length} registros)`
                }
            ];

            setPreviewModalData({
                isOpen: true,
                pages: cardPages,
                title: cardsTitle,
                fileName: cardsFileName,
                layoutLabel: '2 en 1 (A4)',
                variants,
                activeVariantId: 'cards'
            });
        } catch (err) {
            console.error("Error generating cards preview:", err);
            alert("Hubo un error al generar la vista previa de las tarjetas S-21.");
        } finally {
            setIsLoadingCardsPreview(false);
        }
    };

    const handlePreviewListPdf = async () => {
        if (!data || data.length === 0) {
            alert('No hay publicadores en el filtro actual para visualizar.');
            return;
        }

        const currentDate = new Date();
        const curM = currentDate.getMonth() + 1;
        const curY = currentDate.getFullYear();
        const serviceYear = curM >= 9 ? curY + 1 : curY;
        const congName = currentCongregation?.name || 'Congregación';

        const { tableHtml, fileName, title } = buildListDocumentData();
        const filteredPubs = data.map(d => d.publisher);

        let filterSlug = 'Publicadores';
        if (filterType === 'precursor regular') filterSlug = 'Precursores_Regulares';
        else if (filterType === 'precursor especial') filterSlug = 'Precursores_Especiales';
        else if (filterType === 'anciano') filterSlug = 'Ancianos';
        else if (filterType === 'siervo') filterSlug = 'Siervos';
        else if (filterType === 'inactivo') filterSlug = 'Inactivos';
        else if (filterType.startsWith('grupo:')) {
            const gid = filterType.replace('grupo:', '');
            const gName = gid === 'unassigned' ? 'Sin_Grupo' : gid === 'estudiante_vmt' ? 'Escuela_VMT' : groups.find(g => String(g.id) === gid)?.nombre?.replace(/\s+/g, '_') || 'Grupo';
            filterSlug = `Grupo_${gName}`;
        }
        const congSlug = congName.replace(/\s+/g, '_');
        const cardsTitle = `TARJETAS S-21 - ${congName.toUpperCase()}`;
        const cardsFileName = `Tarjetas_S21_${filterSlug}_${congSlug}_${serviceYear}.pdf`;

        // Pre-generate cards if reports are loaded or on the fly
        let cardPages: string[] = [];
        try {
            const reports = await loadReportsIfNeeded(serviceYear);
            cardPages = generateCardPagesArray(filteredPubs, reports, globalMembers, '2', serviceYear);
        } catch (e) {
            console.error("Non-fatal cards pre-generation error", e);
        }

        const variants: DocumentPreviewVariant[] = [
            {
                id: 'list',
                label: `Padrón / Lista (${filteredPubs.length})`,
                icon: 'table',
                title,
                fileName,
                pages: [tableHtml],
                layoutLabel: 'Padrón Oficial',
                subtitle: `Listado oficial de la congregación (${filteredPubs.length} registros)`
            }
        ];

        if (cardPages.length > 0) {
            variants.push({
                id: 'cards',
                label: `Tarjetas S-21 (${filteredPubs.length})`,
                icon: 'cards',
                title: cardsTitle,
                fileName: cardsFileName,
                pages: cardPages,
                layoutLabel: '2 en 1 (A4)',
                subtitle: `Tarjetas S-21 de Registro de Publicador (${cardPages.length} páginas para ${filteredPubs.length} publicadores)`
            });
        }

        setPreviewModalData({
            isOpen: true,
            pages: [tableHtml],
            title,
            fileName,
            layoutLabel: 'Padrón Oficial',
            variants,
            activeVariantId: 'list'
        });
    };

    const handleDownloadFilteredListPdf = async () => {
        if (!data || data.length === 0) {
            alert('No hay publicadores en el filtro actual para descargar.');
            return;
        }

        if (isGeneratingPdf) return;
        setIsGeneratingPdf(true);

        try {
            const { tableHtml, fileName } = buildListDocumentData();
            await downloadHtmlAsPdf(tableHtml, fileName);
        } catch (err) {
            console.error("Error saving PDF:", err);
            alert("Hubo un error al generar el archivo PDF. Por favor verifique e intente nuevamente.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

      return (
        <div 
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-4 sm:p-7 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800/80 max-w-[1100px] mx-auto transition-all"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
        >
            <div className="flex flex-col gap-5 mb-6">
                {/* Header title & Main Action Toolbar - iOS Style */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
                            <Users className="w-6 h-6" strokeWidth={2.2} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Publicadores
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shadow-xs">
                                    {baseData.length} Total
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                Padrón general, nombramientos y registro de actividad
                            </p>
                        </div>
                    </div>
                    
                    {/* Action buttons toolbar - Clean management group */}
                    <div className="w-full lg:w-auto flex flex-wrap items-center gap-2">
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
                                className={`w-full sm:w-auto px-3.5 py-2.5 rounded-xl font-extrabold text-xs border transition-all duration-150 flex items-center justify-center gap-2 shadow-xs active:scale-95 cursor-pointer text-center ${
                                    copiedShare
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/30'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-700 shadow-indigo-600/25'
                                }`}
                                title="Compartir padrón de precursores y fichas S-21"
                            >
                                {copiedShare ? <CheckCircle2 className="w-4 h-4 text-white shrink-0" /> : <Share2 className="w-4 h-4 text-white shrink-0" strokeWidth={2.2} />}
                                <span className="truncate">{copiedShare ? '¡Copiado!' : 'Compartir'}</span>
                            </button>
                        )}

                        {!isReadOnly && (
                            <button
                                onClick={handleToggleEditMode}
                                className={`w-full sm:w-auto px-3.5 py-2.5 rounded-xl cursor-pointer font-extrabold text-xs border transition-all duration-150 flex items-center justify-center gap-2 shadow-xs active:scale-95 text-center ${
                                    isEditMode 
                                    ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-emerald-600/30' 
                                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 shadow-amber-500/25'
                                }`}
                            >
                                {isEditMode ? <Unlock className="w-4 h-4 shrink-0" strokeWidth={2.4} /> : <Lock className="w-4 h-4 shrink-0" strokeWidth={2.4} />}
                                <span className="truncate">{isEditMode ? 'Edición Activa' : 'Modo Edición'}</span>
                            </button>
                        )}

                        {isEditMode && (
                            <button
                                onClick={() => setShowGroupModal(true)}
                                className="col-span-2 sm:col-span-1 w-full sm:w-auto px-3.5 py-2.5 rounded-xl cursor-pointer font-extrabold text-xs bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-all duration-150 flex items-center justify-center gap-2 shadow-sm active:scale-95 text-center border border-slate-950 dark:border-white"
                            >
                                <Layers className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                                <span className="truncate">Gestionar Grupos</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Single Unified Search & Filter Toolbar - iOS Input Style */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" strokeWidth={2.2} />
                        <input 
                            type="text" 
                            placeholder="Buscar publicador por nombre..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Single Unified Filter Dropdown */}
                    <div className="relative sm:w-80 shrink-0">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 pointer-events-none flex items-center">
                            <Filter className="w-4 h-4" strokeWidth={2.2} />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-slate-800 dark:text-slate-200 cursor-pointer appearance-none"
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
                            <ChevronDown className="w-4 h-4" strokeWidth={2.2} />
                        </div>
                    </div>
                </div>

                {/* Active Filter Ribbon */}
                {(filterType !== 'todos' || searchTerm.trim() !== '') && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/50 dark:to-slate-900/70 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl shadow-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                            {filterType !== 'todos' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold shadow-xs">
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

                        {/* Divider on mobile */}
                        <div className="block sm:hidden w-full h-px bg-blue-200/70 dark:bg-blue-900/60 my-0.5"></div>

                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                            {/* Previsualizar Tarjetas S-21 button */}
                            <button
                                onClick={handlePreviewCardsPdf}
                                disabled={isLoadingCardsPreview}
                                className="w-full sm:w-auto text-xs font-extrabold px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border border-blue-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 text-center"
                                title="Previsualizar tarjetas de registro S-21 de los publicadores filtrados"
                            >
                                {isLoadingCardsPreview ? (
                                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                                ) : (
                                    <Eye className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                                )}
                                <span className="truncate">
                                    {isLoadingCardsPreview ? 'Generando...' : `Previsualizar Tarjetas S-21 (${data.length})`}
                                </span>
                            </button>

                            {/* Previsualizar Lista button */}
                            <button
                                onClick={handlePreviewListPdf}
                                className="w-full sm:w-auto text-xs font-extrabold px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white border border-indigo-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center"
                                title="Previsualizar padrón/lista oficial antes de imprimir o descargar"
                            >
                                <Eye className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                                <span className="truncate">Previsualizar Lista ({data.length})</span>
                            </button>

                            {/* Descargar Lista PDF button */}
                            <button
                                onClick={handleDownloadFilteredListPdf}
                                disabled={isGeneratingPdf}
                                className="w-full sm:w-auto text-xs font-extrabold px-3 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-center"
                                title="Descargar listado filtrado en PDF"
                            >
                                {isGeneratingPdf ? (
                                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
                                ) : (
                                    <FileText className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={2.4} />
                                )}
                                <span className="truncate">{isGeneratingPdf ? 'Generando...' : `Lista PDF (${data.length})`}</span>
                            </button>

                            {/* Opciones Lote S-21 button */}
                            <button
                                onClick={() => setShowBulkCardsModal(true)}
                                className="w-full sm:w-auto text-xs font-extrabold px-3 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-800 active:bg-slate-900 border border-slate-600 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center"
                                title="Configurar opciones avanzadas de descarga en lote de tarjetas S-21"
                            >
                                <IdCard className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                                <span className="truncate">Opciones S-21</span>
                            </button>

                            {/* Limpiar filtros */}
                            <button
                                onClick={() => { setFilterType('todos'); setSearchTerm(''); }}
                                className="col-span-2 sm:col-span-1 w-full sm:w-auto text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 text-center"
                                title="Quitar todos los filtros"
                            >
                                <X className="w-3.5 h-3.5 shrink-0" />
                                <span>Limpiar Filtros</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* DESKTOP TABLE VIEW - iOS Style */}
            <div className="hidden md:block w-full overflow-hidden mt-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <th className="py-3.5 px-5 text-left w-[38%] border-r border-slate-200/60 dark:border-slate-800/60">
                                Nombre & Nombramiento
                            </th>
                            <th className="py-3.5 px-5 text-left border-r border-slate-200/60 dark:border-slate-800/60">
                                Información (Precursores)
                            </th>
                            <th className="py-3.5 px-5 text-center w-[22%]">
                                Grupo
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                        {data.map((row, idx) => {
                            const pStats = row.pStats;
                            const role = row.role || 'Publicador';
                            
                            // iOS Role badge styling
                            const getRoleBadge = (r: string) => {
                                if (r === 'Anciano') {
                                    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
                                }
                                if (r === 'Siervo ministerial') {
                                    return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60';
                                }
                                if (r === 'Precursor Regular') {
                                    return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
                                }
                                if (r === 'Precursor Especial') {
                                    return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60';
                                }
                                if (r === 'Precursor Auxiliar') {
                                    return 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60';
                                }
                                if (r === 'Inactivo') {
                                    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
                                }
                                return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
                            };
                            
                            return (
                                <tr key={idx} className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${updating === row.publisher.nombre ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}`}>
                                    <td 
                                        className={`py-3.5 px-5 align-middle border-r border-slate-100 dark:border-slate-800/60 ${(!isEditMode && onSelectPublisher) ? 'text-blue-600 cursor-pointer' : 'text-slate-800 dark:text-slate-200 cursor-default'}`}
                                        onClick={() => !isEditMode && onSelectPublisher && onSelectPublisher(row.publisher.nombre)}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 flex-wrap font-bold text-[13.5px]">
                                                {isEditMode ? (
                                                    editingPubId === row.publisher.id ? (
                                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                            <input 
                                                                type="text" 
                                                                value={editingPubValue} 
                                                                onChange={(e) => setEditingPubValue(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSavePublisherNameCompleto(row.publisher.id, row.publisher.nombre);
                                                                    else if (e.key === 'Escape') setEditingPubId(null);
                                                                }}
                                                                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-900 bg-white"
                                                                autoFocus
                                                            />
                                                            <button 
                                                                onClick={() => handleSavePublisherNameCompleto(row.publisher.id, row.publisher.nombre)}
                                                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                                                title="Guardar nombre"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => setEditingPubId(null)}
                                                                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                title="Cancelar"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 group">
                                                            <span className="text-slate-900 dark:text-white font-bold">{row.publisher.nombre_completo || row.publisher.nombre}</span>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingPubId(row.publisher.id);
                                                                    setEditingPubValue(row.publisher.nombre_completo || row.publisher.nombre || '');
                                                                }}
                                                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md transition-colors opacity-75 group-hover:opacity-100 cursor-pointer"
                                                                title="Editar Nombre Completo"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                                        {row.publisher.nombre_completo || row.publisher.nombre}
                                                        {onSelectPublisher && (
                                                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
                                                        )}
                                                    </span>
                                                )}
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
                                                                className="px-2 py-1 text-[11px] rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold text-slate-700 bg-white cursor-pointer"
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
                                                                className="px-2 py-1 text-[11px] rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-800 w-32"
                                                                autoFocus
                                                            />
                                                        )}
                                                        <button 
                                                            onClick={() => handleSavePublisherRole(row, editingRoleValue)}
                                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                                            title="Guardar nombramiento"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                        </button>
                                                        {isCustomRole && (
                                                            <button 
                                                                onClick={() => {
                                                                    setIsCustomRole(false);
                                                                    setEditingRoleValue('Publicador');
                                                                }}
                                                                className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                                                title="Volver a lista"
                                                            >
                                                                <Layers className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => setEditingRolePubId(null)}
                                                            className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                                            title="Cancelar"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getRoleBadge(row.role || 'Publicador')}`}>
                                                            {row.role || 'Publicador'}
                                                        </span>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingRolePubId(row.publisher.id);
                                                                setEditingRoleValue(row.role || 'Publicador');
                                                                setIsCustomRole(!['Publicador', 'Anciano', 'Siervo ministerial', 'Precursor Regular', 'Precursor Especial', 'Precursor Auxiliar', 'Inactivo'].includes(row.role || 'Publicador'));
                              }}
                                                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                                            title="Editar Nombramiento o Estado"
                                                        >
                                                            <Edit2 className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getRoleBadge(role)}`}>
                                                        {role}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-5 text-slate-800 dark:text-slate-200 align-middle border-r border-slate-100 dark:border-slate-800/60">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex text-xs text-slate-600 dark:text-slate-400 font-semibold gap-2 items-center shrink-0">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                    <Phone className="w-3 h-3" />
                                                </div>
                                                <span>{row.publisher.telefono_personal || row.publisher.contacto_emergencia || '--'}</span>
                                            </div>
                                            
                                            {pStats && (
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${(pStats.diff >= 0 || pStats.isExempt) ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60' : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'}`}>
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider hidden sm:inline">HORAS:</span>
                                                    <span className="font-mono text-xs">{pStats.actual.toFixed(1)} {pStats.isExempt ? '' : `/ ${pStats.expected.toFixed(1)}`}</span>
                                                    {pStats.isExempt ? (
                                                        <span className="font-bold text-emerald-600 flex items-center gap-1">Eximido <CheckCircle2 className="w-3 h-3 inline" /></span>
                                                    ) : pStats.diff < 0 ? (
                                                        <span className="font-bold text-rose-600 flex items-center gap-0.5" title={`Faltan ${Math.abs(pStats.diff).toFixed(1)} horas según la meta acumulada actual`}>
                                                            (-{Math.abs(pStats.diff).toFixed(1)}) <ArrowDown className="w-3 h-3 inline stroke-[2.5]" />
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                                                            ({pStats.diff > 0 ? '+' : ''}{pStats.diff.toFixed(1)}) <ArrowUp className="w-3 h-3 inline stroke-[2.5]" />
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-5 align-middle text-center">
                                        <div className="flex gap-2 items-center justify-center">
                                            {isEditMode ? (
                                                <>
                                                    <select 
                                                        value={row.currentGroupId}
                                                        onChange={(e) => handleGroupChange(row.publisher.id, row.publisher.nombre, row.memberId, e.target.value)}
                                                        disabled={updating === row.publisher.nombre}
                                                        className={`px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs cursor-pointer focus:ring-2 focus:ring-blue-500/20 font-bold max-w-[130px] sm:max-w-none ${row.currentGroupId === 'unassigned' ? 'bg-rose-50 text-rose-800' : row.currentGroupId === 'estudiante_vmt' ? 'bg-sky-50 text-sky-800' : 'bg-white text-slate-800'}`}
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
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
                                                        style={{ opacity: updating === row.publisher.nombre ? 0.5 : 1 }}
                                                        title="Eliminar publicador"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${row.currentGroupId === 'unassigned' ? 'bg-rose-50 border-rose-200 text-rose-700' : row.currentGroupId === 'estudiante_vmt' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-slate-100 border-slate-200/90 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}>
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
                                        <Search className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                                        <span className="text-sm font-medium">No se encontraron publicadores con ese criterio.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MOBILE CARD VIEW - iOS Style */}
            <div className="md:hidden mt-6 flex flex-col gap-3.5">
                {data.map((row, idx) => {
                    const pStats = row.pStats;
                    const role = row.role || 'Publicador';
                    
                    return (
                        <div key={idx} className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 overflow-hidden ${updating === row.publisher.nombre ? 'ring-2 ring-amber-400 bg-amber-50/50' : ''}`}>
                            <div 
                                className={`p-4 border-b border-slate-100 dark:border-slate-800/80 ${(!isEditMode && onSelectPublisher) ? 'cursor-pointer' : ''}`}
                                onClick={() => !isEditMode && onSelectPublisher && onSelectPublisher(row.publisher.nombre)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                            <span>{row.publisher.nombre_completo || row.publisher.nombre}</span>
                                            {!isEditMode && onSelectPublisher && <ExternalLink className="w-3 h-3 text-slate-400" />}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mt-0.5">
                                            {role}
                                        </div>
                                    </div>
                                    {isEditMode && (
                                        <div className="flex items-center gap-1.5 shrink-0 ml-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingPubId(row.publisher.id);
                                                    setEditingPubValue(row.publisher.nombre_completo || row.publisher.nombre || '');
                                                    const newName = window.prompt("Editar Nombre Completo:", row.publisher.nombre_completo || row.publisher.nombre || '');
                                                    if (newName !== null && newName.trim() !== '') {
                                                        handleSavePublisherNameCompleto(row.publisher.id, newName);
                                                    }
                                                }}
                                                className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                                                title="Editar Nombre"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <div className="w-px h-5 bg-slate-300 dark:bg-slate-600"></div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newRole = window.prompt("Editar Nombramiento (Publicador, Anciano, Siervo ministerial, Precursor Regular...):", row.role || 'Publicador');
                                                    if (newRole !== null && newRole.trim() !== '') {
                                                        handleSavePublisherRole(row, newRole);
                                                    }
                                                }}
                                                className="w-8 h-8 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                                                title="Editar Nombramiento / Rol"
                                            >
                                                <Award className="w-4 h-4" />
                                            </button>
                                            <div className="w-px h-5 bg-slate-300 dark:bg-slate-600"></div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePublisher(row.publisher.id, row.publisher.nombre);
                                                }}
                                                disabled={updating === row.publisher.nombre}
                                                className="w-8 h-8 flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                                                title="Eliminar Publicador"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" /> 
                                    <span>{row.publisher.telefono_personal || row.publisher.contacto_emergencia || '--'}</span>
                                </div>

                                {pStats && (
                                    <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${(pStats.diff >= 0 || pStats.isExempt) ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">HORAS:</span>
                                        <span className="font-mono">{pStats.actual.toFixed(1)} {pStats.isExempt ? '' : `/ ${pStats.expected.toFixed(1)}`}</span>
                                        {pStats.isExempt ? (
                                            <span className="font-bold text-emerald-600 ml-1">Eximido <CheckCircle2 className="w-3 h-3 inline" /></span>
                                        ) : pStats.diff < 0 ? (
                                            <span className="font-bold text-rose-600 ml-1">(-{Math.abs(pStats.diff).toFixed(1)}) <ArrowDown className="w-3 h-3 inline" /></span>
                                        ) : (
                                            <span className="font-bold text-emerald-600 ml-1">({pStats.diff > 0 ? '+' : ''}{pStats.diff.toFixed(1)}) <ArrowUp className="w-3 h-3 inline" /></span>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grupo</span>
                                {isEditMode ? (
                                    <select 
                                        value={row.currentGroupId}
                                        onChange={(e) => handleGroupChange(row.publisher.id, row.publisher.nombre, row.memberId, e.target.value)}
                                        disabled={updating === row.publisher.nombre}
                                        className={`px-2 py-1 rounded-xl border border-slate-300 text-xs cursor-pointer focus:ring-2 focus:ring-blue-500/20 font-bold max-w-[150px] ${row.currentGroupId === 'unassigned' ? 'bg-rose-50 text-rose-800' : row.currentGroupId === 'estudiante_vmt' ? 'bg-sky-50 text-sky-800' : 'bg-white text-slate-800'}`}
                                    >
                                        <option value="unassigned">-- Sin Grupo --</option>
                                        <option value="estudiante_vmt">-- Escuela --</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.nombre}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${row.currentGroupId === 'unassigned' ? 'bg-rose-50 border-rose-200 text-rose-700' : row.currentGroupId === 'estudiante_vmt' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-slate-200 text-slate-700 shadow-2xs'}`}>
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
                    <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-xs">
                        <div className="flex flex-col items-center gap-3">
                            <Search className="w-8 h-8 text-slate-300" />
                            <span className="text-sm font-medium">No se encontraron publicadores con ese criterio.</span>
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

            {previewModalData && (
                <DocumentPreviewModal
                    isOpen={previewModalData.isOpen}
                    onClose={() => setPreviewModalData(null)}
                    title={previewModalData.title}
                    fileName={previewModalData.fileName}
                    pagesHtml={previewModalData.pages || []}
                    layoutLabel={previewModalData.layoutLabel}
                    variants={previewModalData.variants}
                    activeVariantId={previewModalData.activeVariantId}
                />
            )}
        </div>
    );
};

export default GlobalPublishersList;
