
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, LayoutDashboard, FolderArchive, ShieldAlert } from 'lucide-react';
import { useGroupManager } from './congregation/useGroupManager';
import { GroupMember, MinistryReport } from './congregation/types';
import StatCards from './congregation/StatCards';
import ControlPanel from './congregation/ControlPanel';
import ActionButtons from './congregation/ActionButtons';
import AddMemberInput from './congregation/AddMemberInput';
import MemberItem from './congregation/MemberItem';
import EditMemberModal from './congregation/EditMemberModal';
import PreviewModal from './congregation/PreviewModal';
import DirectoryModal from './congregation/DirectoryModal';
import SummaryModal from './congregation/SummaryModal';
import CongregationSummary from './congregation/CongregationSummary';
import GlobalDirectory from './congregation/GlobalDirectory';
import GlobalPublishersList from './congregation/GlobalPublishersList';
import PublisherCards from './congregation/PublisherCards';

interface GrupoCongregacionProps {
    isReadOnly?: boolean;
    restrictedGroupId?: number | null;
    navItems?: string[];
    activeTab?: string;
}

const GrupoCongregacion: React.FC<GrupoCongregacionProps> = ({ isReadOnly = false, restrictedGroupId, navItems = [], activeTab }) => {
    // Logic extraction
    const { 
        groups, selectedGroupId, setSelectedGroupId, createGroup, fetchGroups,
        members, masterPublishers, addMember, deleteMember,
        reports, visits, currentMonth, setCurrentMonth,
        loading, statusMessage, updateLocalReport, removeLocalReport, updateLocalVisit, saveRow,
        updateMemberRole, updatePublisherDetails,
        missingColumns,
        globalStats, globalMembers, fetchGlobalCongregationData, loadingGlobal, exportBackup, toggleGroupMonthLock,
        monthlyChanges
    } = useGroupManager();

    // UI Local State
    const [viewMode, setViewMode] = useState<'single' | 'global' | 'publishers' | 'directory' | 'cards'>('single');
    const [showPublishersMenu, setShowPublishersMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [showDirectory, setShowDirectory] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
    const [showSqlHelp, setShowSqlHelp] = useState(true);

    const suggestionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (restrictedGroupId) {
            setSelectedGroupId(restrictedGroupId);
            // Default to 'single' if nothing else is specified or if they only have group access
            if (!navItems.some(n => n.startsWith('↳'))) {
                setViewMode('single'); 
            }
        }
    }, [restrictedGroupId, setSelectedGroupId, navItems]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) setShowSuggestions(false);
            
            // Allow menu toggle button to handle its own click without instantly closing it
            const target = event.target as Element;
            if (!target.closest?.('.publishers-menu-container')) {
                setShowPublishersMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter global data if restricted
    const filteredGlobalMembers = useMemo(() => {
        if (!restrictedGroupId) return globalMembers;
        return globalMembers.filter(m => m.grupo_id === restrictedGroupId);
    }, [globalMembers, restrictedGroupId]);

    const filteredMasterPublishers = useMemo(() => {
        if (!restrictedGroupId) return masterPublishers;
        return masterPublishers.filter(p => filteredGlobalMembers.some(m => m.publicador_nombre === p.nombre));
    }, [masterPublishers, filteredGlobalMembers, restrictedGroupId]);

    // Fetch global data when switching to global, directory, publishers, or cards view
    useEffect(() => {
        if (viewMode === 'global' || viewMode === 'directory' || viewMode === 'publishers' || viewMode === 'cards') {
            fetchGlobalCongregationData();
        }
    }, [viewMode, currentMonth, fetchGlobalCongregationData]);

    useEffect(() => {
        if (activeTab === '↳ Mi Grupo') setViewMode('single');
        else if (activeTab === '↳ Resumen General') setViewMode('global');
        else if (activeTab === '↳ Lista de Publicadores') setViewMode('cards');
        else if (activeTab === '↳ Directorio') setViewMode('directory');
        else if (activeTab === '↳ Tarjetas') setViewMode('cards');
    }, [activeTab]);

    const handleCreateGroup = async () => {
        if (isReadOnly || restrictedGroupId) return;
        if (await createGroup(newGroupName)) {
            setIsCreatingGroup(false);
            setNewGroupName('');
        }
    };

    const handleAddMember = (name: string) => {
        if (isReadOnly) return;
        addMember(name);
        setSearchTerm('');
    };

    const handleDeleteMember = (id: number, name: string) => {
        if (isReadOnly) return;
        deleteMember(id);
        if(editingMember?.id === id) setEditingMember(null);
    };

    // Filter Logic
    const filteredMembers = useMemo(() => members.filter(m => m.publicador_nombre && m.publicador_nombre.toLowerCase().includes(searchTerm.toLowerCase())), [members, searchTerm]);
    const filteredSuggestions = useMemo(() => masterPublishers.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && !members.some(m => m.publicador_nombre === p.nombre)).slice(0, 6), [masterPublishers, searchTerm, members]);

    // --- CALCULATIONS ---
    const noStudiesCount = useMemo(() => members.filter(m => {
        const r = reports[m.publicador_nombre];
        if (!r) return true;
        // Check if estudios is 0 or empty string. Since the type is number | '', we simply check truthiness of !r.estudios
        // or explicitly check against 0 and '' to avoid type overlap errors with strict comparison.
        return !r.estudios; 
    }).length, [members, reports]);

    const stats = useMemo(() => {
        let totalHours = 0;
        let totalStudies = 0;
        let submittedCount = 0;
        
        const roleStats = {
            pr: { count: 0, hours: 0, studies: 0 },
            pa: { count: 0, hours: 0, studies: 0 },
            pe: { count: 0, hours: 0, studies: 0 },
            pub: { count: 0, hours: 0, studies: 0 }
        };

        // Calculate Activity (Hours & Studies) from Reports
        members.forEach(m => {
            // Determine Role Key
            let roleKey: 'pr' | 'pa' | 'pe' | 'pub' = 'pub';
            switch (m.rol) {
                case 'Precursor Regular': roleKey = 'pr'; break;
                case 'Precursor Auxiliar': roleKey = 'pa'; break;
                case 'Precursor Especial': roleKey = 'pe'; break;
                default: roleKey = 'pub'; break;
            }
            
            // Increment Count
            roleStats[roleKey].count++;

            const r = reports[m.publicador_nombre];
            if (r) {
                submittedCount++;
                const h = (Number(r.horas) || 0) + (Number(r.horas_especiales) || 0);
                const s = (Number(r.estudios) || 0);
                
                totalHours += h;
                totalStudies += s;
                
                roleStats[roleKey].hours += h;
                roleStats[roleKey].studies += s;
            }
        });

        return {
            hours: totalHours,
            studies: totalStudies,
            submitted: submittedCount,
            totalMembers: members.length,
            noStudies: noStudiesCount,
            roles: roleStats
        };
    }, [members, reports, noStudiesCount]);

    // Open Preview
    const handleOpenPreview = () => {
        setShowPreview(true);
    };

    // Columns for PDF
    const midPoint = Math.ceil(members.length / 2);

    const isMonthLocked = members.length > 0 && members.every(m => reports[m.publicador_nombre]?.locked);

    return (
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 relative min-h-[calc(100vh-80px)] transition-all">
            {/* Top Navigation / Section Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Gestión de Grupo y Congregación
                        </h1>
                        {isReadOnly && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                Solo Lectura
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Registro mensual de actividad, informes ministeriales y fichas de servicio
                    </p>
                </div>

                {/* Segmented View Switcher */}
                <div className="inline-flex items-center bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                    {(navItems.includes('Grupo de Congregación') || navItems.includes('↳ Mi Grupo') || restrictedGroupId) && (
                        <button 
                            onClick={() => setViewMode('single')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                viewMode === 'single' 
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            <span>Mi Grupo</span>
                        </button>
                    )}
                    {(navItems.includes('Grupo de Congregación') || navItems.includes('↳ Resumen General')) && !restrictedGroupId && (
                        <button 
                            onClick={() => setViewMode('global')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                viewMode === 'global' 
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Resumen General</span>
                        </button>
                    )}
                    
                    {(navItems.includes('Grupo de Congregación') || navItems.includes('↳ Lista de Publicadores')) && (
                        <button 
                            onClick={() => setViewMode('cards')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                                ['publishers', 'cards'].includes(viewMode) 
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <FolderArchive className="w-4 h-4" />
                            <span>Publicadores / Fichas</span>
                        </button>
                    )}
                </div>
            </div>

            {/* SQL Migration Help Alert - Only show if editing is allowed to not confuse view-only users */}
            {missingColumns.length > 0 && showSqlHelp && !isReadOnly && (
                <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '16px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                            <i className="fas fa-database"></i> Actualización Requerida
                        </h3>
                        <button onClick={() => setShowSqlHelp(false)} style={{ background: 'none', border: 'none', color: '#9a3412', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#9a3412' }}>
                        Se han detectado campos nuevos en el sistema que no existen en tu base de datos Supabase. Por favor ve al <b>SQL Editor</b> en Supabase y ejecuta este código:
                    </p>
                    <div style={{ position: 'relative' }}>
                        <pre style={{ margin: 0, padding: '12px', backgroundColor: '#292524', color: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                            {`-- Ejecuta esto en el SQL Editor de Supabase
ALTER TABLE publicadores
ADD COLUMN IF NOT EXISTS nombre_completo TEXT,
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS contacto_emergencia TEXT,
ADD COLUMN IF NOT EXISTS telefono_personal TEXT,
ADD COLUMN IF NOT EXISTS genero TEXT,
ADD COLUMN IF NOT EXISTS fecha_nacimiento TEXT,
ADD COLUMN IF NOT EXISTS fecha_bautismo TEXT,
ADD COLUMN IF NOT EXISTS esperanza TEXT,
ADD COLUMN IF NOT EXISTS clasificacion_vmt TEXT,
ADD COLUMN IF NOT EXISTS inicio_precursor_mes TEXT,
ADD COLUMN IF NOT EXISTS fecha_nombramiento TEXT;
`}
                        </pre>
                    </div>
                </div>
            )}

            {/* --- VIEW: GLOBAL SUMMARY --- */}
            {viewMode === 'global' && !restrictedGroupId && (
                <CongregationSummary data={globalStats} month={currentMonth} loading={loadingGlobal} monthlyChanges={monthlyChanges} />
            )}

            {/* --- VIEW: PUBLISHERS LIST --- */}
            {viewMode === 'publishers' && (
                <GlobalPublishersList 
                    groups={groups} 
                    globalMembers={filteredGlobalMembers} 
                    masterPublishers={filteredMasterPublishers} 
                    onRefresh={async () => {
                        await fetchGlobalCongregationData();
                        await fetchGroups();
                    }}
                    isReadOnly={isReadOnly}
                />
            )}

            {/* --- VIEW: DIRECTORY --- */}
            {viewMode === 'directory' && (
                <GlobalDirectory 
                    groups={groups} 
                    globalMembers={filteredGlobalMembers} 
                    masterPublishers={filteredMasterPublishers} 
                />
            )}

            {/* --- VIEW: CARDS --- */}
            {viewMode === 'cards' && (
                <PublisherCards 
                    globalMembers={filteredGlobalMembers} 
                    masterPublishers={filteredMasterPublishers} 
                    updatePublisherDetails={updatePublisherDetails}
                    updateMemberRole={updateMemberRole}
                    groups={groups}
                    onRefresh={fetchGlobalCongregationData}
                    isReadOnly={isReadOnly}
                />
            )}

            {/* --- VIEW: SINGLE GROUP --- */}
            {viewMode === 'single' && (
                <>
                    {/* Modal handles its own read-only state based on props passed */}
                    {editingMember && (
                        <EditMemberModal 
                            member={editingMember}
                            publisherDetails={masterPublishers.find(p => p.nombre === editingMember.publicador_nombre)}
                            reportEntry={reports[editingMember.publicador_nombre]}
                            visitData={visits[editingMember.publicador_nombre] || { date: '', notes: '' }}
                            onClose={() => setEditingMember(null)}
                            onReportChange={isReadOnly ? () => {} : updateLocalReport}
                            onVisitChange={isReadOnly ? () => {} : updateLocalVisit}
                            onUpdateRole={isReadOnly ? () => {} : updateMemberRole}
                            onUpdatePublisherDetails={isReadOnly ? () => {} : updatePublisherDetails}
                            onSave={isReadOnly ? () => {} : saveRow}
                            onDelete={isReadOnly ? () => {} : handleDeleteMember}
                            onRemoveReport={isReadOnly ? () => {} : removeLocalReport}
                            isReadOnly={isReadOnly}
                        />
                    )}

                    {showPreview && (
                        <PreviewModal 
                            onClose={() => setShowPreview(false)}
                            groupName={groups.find(g => g.id === selectedGroupId)?.nombre || ''}
                            month={currentMonth}
                            stats={stats}
                            col1={members.slice(0, midPoint)} 
                            col2={members.slice(midPoint)} 
                            reports={reports}
                        />
                    )}

                    {showDirectory && (
                        <DirectoryModal 
                            onClose={() => setShowDirectory(false)}
                            groupName={groups.find(g => g.id === selectedGroupId)?.nombre || ''}
                            col1={members.slice(0, midPoint)} 
                            col2={members.slice(midPoint)} 
                            masterPublishers={masterPublishers}
                        />
                    )}

                    {showSummary && (
                        <SummaryModal
                            onClose={() => setShowSummary(false)}
                            members={members}
                            reports={reports}
                            groupName={groups.find(g => g.id === selectedGroupId)?.nombre || 'Grupo'}
                            month={currentMonth}
                        />
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px' }}>
                        <ControlPanel 
                            groups={groups} selectedGroupId={selectedGroupId} onGroupChange={setSelectedGroupId}
                            currentMonth={currentMonth} onMonthChange={setCurrentMonth}
                            isCreating={isCreatingGroup} setIsCreating={setIsCreatingGroup}
                            newGroupName={newGroupName} setNewGroupName={setNewGroupName} onCreateGroup={handleCreateGroup}
                            isReadOnly={isReadOnly}
                            disableGroupSelect={!!restrictedGroupId}
                            isMonthLocked={isMonthLocked}
                            onToggleLock={(isLocking) => {
                                if (isLocking) {
                                    if (window.confirm('¿Cerrar y bloquear mes para este grupo?')) toggleGroupMonthLock(true);
                                } else {
                                    const pwd = window.prompt("Ingrese clave para desbloquear el mes (Grupo):");
                                    if (pwd) toggleGroupMonthLock(false, pwd);
                                }
                            }}
                        />
                        {selectedGroupId && <ActionButtons onSharePDF={() => setShowPreview(true)} onShowDirectory={() => setShowDirectory(true)} onShowSummary={() => setShowSummary(true)} isSharing={false} />}
                        {selectedGroupId && !isReadOnly && (
                            <AddMemberInput 
                                searchTerm={searchTerm} onSearchChange={setSearchTerm} 
                                showSuggestions={showSuggestions} setShowSuggestions={setShowSuggestions}
                                filteredSuggestions={filteredSuggestions} onAdd={handleAddMember}
                                filteredMembersCount={filteredMembers.length}
                            />
                        )}
                    </div>

                    {loading ? <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-color-light)' }}>Cargando...</div> : (
                        <div className="rounded-2xl shadow-sm overflow-hidden border border-[var(--border-color)] bg-[var(--card-bg-color)]">
                            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center lg:hidden bg-[var(--card-bg-color)]">
                                <h3 className="font-bold text-[var(--text-color)]" style={{ fontSize: '1.2rem', marginBottom: 0 }}>Listado ({filteredMembers.length})</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {filteredMembers.map(m => {
                                    const pub = masterPublishers.find(p => p.nombre.trim().toLowerCase() === m.publicador_nombre.trim().toLowerCase());
                                    const enrichedMember = {
                                        ...m,
                                        publicador_nombre: pub?.nombre_completo || m.publicador_nombre
                                    };
                                    return <MemberItem key={m.id} member={enrichedMember} report={reports[m.publicador_nombre]} onClick={() => setEditingMember(m)} />;
                                })}
                            </div>
                            {filteredMembers.length === 0 && <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-color-light)' }}>
                                <i className="fas fa-users" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
                                <p>No se encontraron publicadores.</p>
                            </div>}
                        </div>
                    )}
                </>
            )}

            {statusMessage && (
                <div style={{ 
                    position: 'fixed', 
                    bottom: '20px', 
                    right: '20px', 
                    left: '20px', 
                    backgroundColor: statusMessage.type === 'error' ? '#ef4444' : (statusMessage.type === 'info' ? '#3b82f6' : '#10b981'), 
                    color: 'white', 
                    padding: '16px 20px', 
                    borderRadius: '12px', 
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', 
                    fontWeight: 'bold', 
                    zIndex: 1000,
                    maxWidth: '400px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    textAlign: 'center',
                    wordBreak: 'break-word',
                    fontSize: '0.9rem'
                }}>
                    {statusMessage.text}
                </div>
            )}
        </div>
    );
};

export default GrupoCongregacion;
