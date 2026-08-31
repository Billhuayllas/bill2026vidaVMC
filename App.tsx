
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import Inicio from './components/Inicio';
import Programa from './components/Programa';
import GestionarParticipantes from './components/GestionarParticipantes';
import FiltrosAvanzados from './components/FiltrosAvanzados';
import Informes from './components/Informes';
import Asistencia from './components/Asistencia';
import Planificador from './components/Planificador';
import AsignarAncMin from './components/AsignarAncMin';
import AcceptAssignments from './components/AcceptAssignments';
import HistorialEventos from './components/HistorialEventos';
import GrupoCongregacion from './components/GrupoCongregacion';
import RolGrupos from './components/RolGrupos';
import CopiasSeguridad from './components/CopiasSeguridad';
import Recordatorios from './components/Recordatorios';
import SharedPublisherReport from './components/SharedPublisherReport';
import ConfiguracionAcceso, { ALL_TABS } from './components/ConfiguracionAcceso'; 
import { supabase } from './lib/supabase';
import { CongregationProvider, useCongregation } from './lib/CongregationContext';
import { usePWAInstall } from './lib/usePWAInstall';
import InstallAppModal from './components/InstallAppModal';
import { VMCLogo } from './components/VMCLogo';

// --- CONGREGATION SELECTOR COMPONENT ---
interface CongregationSelectorProps {
    onTokenSuccess: (data: any, saveToken?: boolean) => void;
    onSetSuperAdmin: (status: boolean) => void;
    onOpenInstallModal?: () => void;
    isInstalled?: boolean;
}

const CongregationSelector: React.FC<CongregationSelectorProps> = ({ onTokenSuccess, onSetSuperAdmin, onOpenInstallModal, isInstalled }) => {
    const { setCongregation, refreshCongregations } = useCongregation();
    
    // Views: 'login' (default key input), 'admin_login' (password), 'admin_dashboard' (list)
    const [view, setView] = useState<'login' | 'admin_login' | 'admin_dashboard'>('login');
    
    // Data States
    const [creatorCongregations, setCreatorCongregations] = useState<{id: number, name: string}[]>([]);
    
    // Form States
    const [accessKeyInput, setAccessKeyInput] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [newCongName, setNewCongName] = useState('');
    
    // UI States
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // --- LOGIC: KEY ACCESS (Standard User) ---
    const handleKeySubmit = async () => {
        if (!accessKeyInput.trim()) return;
        setLoading(true);
        setErrorMsg('');
        
        try {
            const { data, error } = await supabase
                .from('access_configs')
                .select('access_token, visible_tabs, label, restricted_group_id, congregation_id')
                .eq('access_token', accessKeyInput.trim())
                .single();

            if (error || !data) {
                setErrorMsg('Contraseña no válida.');
            } else {
                onSetSuperAdmin(false); // User logged in via key, NOT super admin
                // Success: Pass true to save to localStorage
                onTokenSuccess(data, true);
            }
        } catch (e) {
            setErrorMsg('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIC: SUPER ADMIN ---
    const handleAdminLogin = async () => {
        if (adminPassword === '980392925') {
            setLoading(true);
            await fetchCreatorList();
            setView('admin_dashboard');
            setAdminPassword('');
            setLoading(false);
        } else {
            setErrorMsg('Contraseña incorrecta');
        }
    };

    const fetchCreatorList = async () => {
        const { data, error } = await supabase.from('congregations').select('id, name').order('name');
        if (error) {
            alert('Error al cargar lista: ' + error.message);
        } else {
            setCreatorCongregations(data || []);
        }
    };

    const handleSelectCongregation = (c: {id: number, name: string}) => {
        // IMPORTANT: Clear any user token so next reload doesn't force user mode
        localStorage.removeItem('vmt_auto_token'); 
        onSetSuperAdmin(true); // User logged in via admin dashboard, IS super admin
        setCongregation(c);
        // Admin selects manually, no token needed, permissions set by AppContent default
    };

    const handleCreateCongregation = async () => {
        if (!newCongName.trim()) return;
        setLoading(true);
        const { data, error } = await supabase.from('congregations').insert([{ name: newCongName.trim() }]).select();
        if (!error && data) {
            await fetchCreatorList();
            await refreshCongregations();
            setNewCongName('');
            setIsCreating(false);
        } else {
            alert('Error: ' + (error?.message || 'Desconocido'));
        }
        setLoading(false);
    };

    // --- RENDERS ---

    const renderLogin = () => (
        <div style={{ animation: 'fadeIn 0.3s' }}>
            <h2 style={{fontSize:'1.5rem', fontWeight:'800', color:'#1e293b', textAlign:'center', marginBottom:'10px'}}>Bienvenido</h2>
            <p style={{fontSize:'0.95rem', color:'#64748b', textAlign:'center', marginBottom:'30px'}}>
                Ingresa tu contraseña para acceder a la congregación.
            </p>
            
            <div style={{ marginBottom:'25px' }}>
                <input 
                    type="password" 
                    autoFocus 
                    value={accessKeyInput} 
                    onChange={e => setAccessKeyInput(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleKeySubmit()} 
                    placeholder="Contraseña..." 
                    style={{ 
                        width: '100%', 
                        padding: '16px', 
                        borderRadius: '12px', 
                        border: `2px solid ${errorMsg ? '#ef4444' : '#cbd5e1'}`, 
                        fontSize: '1.1rem', 
                        textAlign: 'center', 
                        letterSpacing:'2px', 
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        fontFamily: 'monospace'
                    }} 
                />
                {errorMsg && <p style={{color:'#ef4444', fontSize:'0.85rem', textAlign:'center', marginTop:'8px', fontWeight:'600'}}>{errorMsg}</p>}
            </div>

            <button 
                onClick={handleKeySubmit} 
                disabled={loading} 
                style={{ 
                    width: '100%', 
                    padding: '16px', 
                    backgroundColor: '#3b82f6', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontWeight: 'bold', 
                    fontSize: '1.1rem', 
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)',
                    transition: 'transform 0.1s'
                }}
            >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Ingresar'}
            </button>

            <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                {onOpenInstallModal && !isInstalled && (
                    <button 
                        onClick={onOpenInstallModal} 
                        style={{ 
                            background: '#f0fdf4', 
                            border: '1px solid #bbf7d0', 
                            color: '#166534', 
                            fontSize: '0.85rem', 
                            cursor: 'pointer', 
                            fontWeight: '700', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '10px'
                        }}
                    >
                        <i className="fas fa-mobile-screen-button text-emerald-600"></i> Instalar App en Celular (Android & iOS)
                    </button>
                )}
                <button 
                    onClick={() => { setView('admin_login'); setErrorMsg(''); }} 
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'none', fontWeight: '500' }}
                >
                    <i className="fas fa-user-shield mr-1"></i> Soy Súper Administrador
                </button>
            </div>
        </div>
    );

    const renderAdminLogin = () => (
        <div style={{ animation: 'fadeIn 0.3s' }}>
            <h3 style={{fontSize:'1.2rem', marginBottom:'20px', color:'#334155', textAlign:'center'}}>Acceso Súper Administrador</h3>
            <input 
                type="password" 
                autoFocus 
                value={adminPassword} 
                onChange={e => setAdminPassword(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} 
                placeholder="Contraseña Maestra..." 
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '1rem', marginBottom: '10px', textAlign: 'center' }} 
            />
            {errorMsg && <p style={{color:'#ef4444', fontSize:'0.85rem', textAlign:'center', marginBottom:'15px'}}>{errorMsg}</p>}
            
            <div style={{ display: 'flex', gap: '10px', marginTop:'20px' }}>
                <button onClick={() => { setView('login'); setAdminPassword(''); setErrorMsg(''); }} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Volver</button>
                <button onClick={handleAdminLogin} style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Entrar</button>
            </div>
        </div>
    );

    const renderAdminDashboard = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.3s' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                <h3 style={{fontSize:'1.1rem', margin:0, color:'#334155'}}>Panel de Control</h3>
                <button onClick={fetchCreatorList} style={{background:'none', border:'none', cursor:'pointer', color:'#3b82f6'}} title="Actualizar">
                    <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                </button>
            </div>
            
            <div style={{maxHeight:'300px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px'}}>
                {creatorCongregations.length === 0 && !loading && <p style={{textAlign:'center', color:'#94a3b8', padding:'10px'}}>No hay congregaciones.</p>}
                {creatorCongregations.map(c => (
                    <button key={c.id} onClick={() => handleSelectCongregation(c)} style={{ padding: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#334155', fontWeight: '600', fontSize: '0.95rem' }}>
                        {c.name}
                        <i className="fas fa-chevron-right" style={{ color: '#cbd5e1' }}></i>
                    </button>
                ))}
            </div>
            
            <div style={{ borderTop: '1px solid #e2e8f0', margin: '10px 0' }}></div>
            
            {isCreating ? (
                <div style={{ animation: 'fadeIn 0.3s' }}>
                    <input type="text" autoFocus value={newCongName} onChange={e => setNewCongName(e.target.value)} placeholder="Nombre congregación..." style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '10px' }} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setIsCreating(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={handleCreateCongregation} disabled={loading} style={{ flex: 1, padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Crear</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setIsCreating(true)} style={{ width: '100%', padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}><i className="fas fa-plus mr-2"></i> Nueva Congregación</button>
            )}
            
            <button onClick={() => setView('login')} style={{ width: '100%', padding: '12px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop:'10px' }}>Cerrar Sesión</button>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b', padding: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '40px 32px', borderRadius: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)', maxWidth: '440px', width: '100%', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                    <VMCLogo 
                        size={88} 
                        rounded="2xl" 
                        className="shadow-xl" 
                    />
                </div>
                {view === 'login' && renderLogin()}
                {view === 'admin_login' && renderAdminLogin()}
                {view === 'admin_dashboard' && renderAdminDashboard()}
            </div>
        </div>
    );
};

// --- MAIN APP CONTENT ---
const AppContent: React.FC = () => {
    const { currentCongregation, setCongregation, loading } = useCongregation();
    const pwaState = usePWAInstall();
    const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
    const [dismissFloatingBanner, setDismissFloatingBanner] = useState(false);
    
    // Default tabs for Admin (Everything is editable by default for admin)
    const defaultNavItems = [
        ...ALL_TABS
    ];

    const [navItems, setNavItems] = useState<string[]>(defaultNavItems);
    const [tabPermissions, setTabPermissions] = useState<{name: string, access: 'view' | 'edit'}[]>([]); 
    
    // --- History API managed activeTab ---
    const [activeTab, setActiveTabState] = useState<string>("Inicio");
    
    const setActiveTab = useCallback((newTab: string) => {
        if (newTab === activeTab) return;
        setActiveTabState(newTab);
        const url = new URL(window.location.href);
        url.hash = newTab.replace(/\s+/g, '-').toLowerCase();
        window.history.pushState({ tab: newTab }, '', url.toString());
    }, [activeTab]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.tab) {
                setActiveTabState(event.state.tab);
            } else {
                const hash = window.location.hash.replace('#', '').replace(/-/g, ' ').toLowerCase();
                // We'll let a separate effect sync the hash if needed, or simply fallback
                if (hash) {
                    const matchedTab = navItems.find(t => t.toLowerCase() === hash);
                    if (matchedTab) {
                        setActiveTabState(matchedTab);
                    }
                } else {
                    setActiveTabState("Inicio");
                }
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [navItems]);
    // -------------------------------------

    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
        if (typeof window !== 'undefined') {
            const manual = sessionStorage.getItem('vmt_manual_view');
            if (manual === 'desktop' || manual === 'mobile') return manual;
            const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(window.navigator.userAgent) || window.innerWidth < 1024;
            return isMobileDevice ? 'mobile' : 'desktop';
        }
        return 'desktop';
    });

    useEffect(() => {
        const handleResize = () => {
            const manual = sessionStorage.getItem('vmt_manual_view');
            if (!manual && typeof window !== 'undefined') {
                const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(window.navigator.userAgent) || window.innerWidth < 1024;
                setViewMode(isMobileDevice ? 'mobile' : 'desktop');
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [specialView, setSpecialView] = useState<{view: string; participant?: string; congregationId?: number} | null>(null);
    const [isLoadingAccess, setIsLoadingAccess] = useState(true); // Start loading true to check persistent token
    const [accessLabel, setAccessLabel] = useState<string | null>(null);
    const [restrictedGroupId, setRestrictedGroupId] = useState<number | null>(null);
    
    // State to track if current session is super admin
    // Initialize from session storage to persist across reloads
    const [isSuperAdmin, setIsSuperAdmin] = useState(() => {
        return sessionStorage.getItem('vmt_is_super_admin') === 'true';
    });

    useEffect(() => {
        sessionStorage.setItem('vmt_is_super_admin', String(isSuperAdmin));
        
        // If becoming super admin, force full access and clear view label
        if (isSuperAdmin) {
            setNavItems(defaultNavItems);
            // Crucial: Clear the "View: ..." banner
            setAccessLabel(null);
            setRestrictedGroupId(null);
            setTabPermissions(defaultNavItems.map(t => ({ name: t, access: 'edit' })));

            const initialHash = window.location.hash.replace('#', '').replace(/-/g, ' ').toLowerCase();
            if (initialHash) {
                const matchedTab = defaultNavItems.find(t => t.toLowerCase() === initialHash);
                if (matchedTab) {
                    setActiveTabState(matchedTab);
                    window.history.replaceState({ tab: matchedTab }, '', window.location.href);
                } else {
                    setActiveTabState("Inicio");
                    window.history.replaceState({ tab: 'Inicio' }, '', window.location.href);
                }
            } else {
                setActiveTabState("Inicio");
                window.history.replaceState({ tab: 'Inicio' }, '', window.location.href);
            }
        }
    }, [isSuperAdmin]);

    // Apply Access Configuration Logic (Reused for URL token and Manual Token Entry)
    const applyAccessConfig = useCallback(async (data: any, saveToken?: boolean) => {
        if (!data) return;
        
        if (saveToken && data.access_token) {
            localStorage.setItem('vmt_auto_token', data.access_token);
        }

        setAccessLabel(data.label);
        if (data.restricted_group_id) {
            setRestrictedGroupId(data.restricted_group_id);
        }
        
        // When applying a token config, it's never a Super Admin session
        setIsSuperAdmin(false);

        // Ensure Congregation Context is set
        if (data.congregation_id) {
            const { data: congData } = await supabase
                .from('congregations')
                .select('*')
                .eq('id', data.congregation_id)
                .single();
            
            if (congData) {
                setCongregation(congData);
            }
        }

        // Parse permissions
        let rawTabs = data.visible_tabs;
        let permissions: any[] = [];
        let names: string[] = [];
        let hasEditAccess = false; // Track if user has ANY edit permission

        if (Array.isArray(rawTabs)) {
            rawTabs.forEach((t: any) => {
                let nameToAdd = '';
                let accessToAdd = 'view';
                
                if (typeof t === 'string') {
                    nameToAdd = t;
                } else if (t && typeof t === 'object' && t.name) {
                    nameToAdd = t.name;
                    accessToAdd = t.access || 'view';
                }
                
                if (nameToAdd) {
                    if (!names.includes(nameToAdd)) {
                        names.push(nameToAdd);
                        permissions.push({ name: nameToAdd, access: accessToAdd });
                        if (accessToAdd === 'edit') hasEditAccess = true;
                    } else {
                        // Upgrade access if already exists
                        if (accessToAdd === 'edit') {
                            const existingPerm = permissions.find(p => p.name === nameToAdd);
                            if (existingPerm && existingPerm.access !== 'edit') {
                                existingPerm.access = 'edit';
                            }
                            hasEditAccess = true;
                        }
                    }
                }
            });
        }

        // Subtabs synchronization: If user has 'Grupo de Congregación', make sure all sub-tabs are available
        if (names.includes('Grupo de Congregación')) {
            const grupoPerm = permissions.find(p => p.name === 'Grupo de Congregación')?.access || 'view';
            const subTabs = ["↳ Mi Grupo", "↳ Resumen General", "↳ Lista de Publicadores", "Rol de Grupos"];
            
            subTabs.forEach(sub => {
                if (!names.includes(sub)) {
                    names.push(sub);
                    permissions.push({ name: sub, access: grupoPerm });
                }
            });
        }

        setNavItems(names);
        setTabPermissions(permissions);

        const initialHash = window.location.hash.replace('#', '').replace(/-/g, ' ').toLowerCase();
        if (initialHash) {
            const matchedTab = names.find(t => t.toLowerCase() === initialHash);
            if (matchedTab) {
                setActiveTabState(matchedTab);
                window.history.replaceState({ tab: matchedTab }, '', window.location.href);
            } else if (!names.includes("Inicio")) {
                setActiveTabState(names[0] || "");
            }
        } else if (!names.includes("Inicio")) {
            setActiveTabState(names[0] || "");
        } else {
            // Push state for default 'Inicio' on first load if there is no hash
            window.history.replaceState({ tab: 'Inicio' }, '', window.location.href);
        }
        
        // Reset view to top if simulating
        window.scrollTo(0,0);
    }, [setCongregation]);

    // Handle exiting simulation/logout
    const handleExit = () => {
        localStorage.removeItem('vmt_auto_token'); // Clear persistent token
        sessionStorage.removeItem('vmt_is_super_admin'); // Clear session
        window.location.href = window.location.origin + window.location.pathname; // Hard reload
    };

    useEffect(() => {
        const checkAccess = async () => {
            setIsLoadingAccess(true);
            
            // Priority: If session says we are Super Admin, trust it and skip token logic
            if (isSuperAdmin) {
                setIsLoadingAccess(false);
                return;
            }

            const urlParams = new URLSearchParams(window.location.search);
            const view = urlParams.get('view');
            const participant = urlParams.get('participant');
            const token = urlParams.get('token');
            const urlCongregationId = urlParams.get('congregation_id');
            const savedAutoToken = localStorage.getItem('vmt_auto_token');

            if (view === 'assignments' && participant) {
                setSpecialView({ view, participant: decodeURIComponent(participant) });
                setIsLoadingAccess(false);
                return;
            }

            if (view === 'publisher_report' && urlCongregationId) {
                const { data: congData } = await supabase
                    .from('congregations')
                    .select('*')
                    .eq('id', parseInt(urlCongregationId))
                    .single();
                if (congData) {
                    setCongregation(congData);
                    setSpecialView({ view, congregationId: parseInt(urlCongregationId) });
                    setIsLoadingAccess(false);
                    return;
                }
            }

            // Theme and View Mode logic
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
            
            // View Mode logic: respect manual session preference or current screen width
            const manualView = typeof window !== 'undefined' ? sessionStorage.getItem('vmt_manual_view') : null;
            if (manualView === 'desktop' || manualView === 'mobile') {
                setViewMode(manualView);
            } else {
                const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(window.navigator.userAgent) || window.innerWidth < 1024;
                setViewMode(isMobileDevice ? 'mobile' : 'desktop');
            }

            // --- 1. DIRECT LINK HANDLING (Token URL) ---
            if (token) {
                try {
                    const { data, error } = await supabase
                        .from('access_configs')
                        .select('access_token, visible_tabs, label, restricted_group_id, congregation_id')
                        .eq('access_token', token)
                        .single();

                    if (data && !error) {
                        await applyAccessConfig(data, true); // Auto-save token from URL
                    }
                } catch (e) {
                    console.error("Error fetching access config", e);
                }
            } 
            // --- 2. AUTO LOGIN (Persistent Token) ---
            else if (savedAutoToken) {
                try {
                    const { data, error } = await supabase
                        .from('access_configs')
                        .select('access_token, visible_tabs, label, restricted_group_id, congregation_id')
                        .eq('access_token', savedAutoToken)
                        .single();

                    if (data && !error) {
                        await applyAccessConfig(data, false);
                    } else {
                        // Token invalid/expired
                        localStorage.removeItem('vmt_auto_token');
                    }
                } catch (e) {
                    console.error("Error with auto-token", e);
                }
            }
            // --- 3. CONGREGATION LINK (No token, public access to ID) ---
            else if (urlCongregationId) {
                const { data: congData } = await supabase
                    .from('congregations')
                    .select('*')
                    .eq('id', parseInt(urlCongregationId))
                    .single();
                
                if (congData) {
                    setCongregation(congData);
                    // Default admin perms if no token provided in URL
                    const adminPerms = defaultNavItems.map(t => ({ name: t, access: 'edit' as const }));
                    setTabPermissions(adminPerms);
                    // Direct link access is NOT super admin unless they log in
                    setIsSuperAdmin(false);

                    const initialHash = window.location.hash.replace('#', '').replace(/-/g, ' ').toLowerCase();
                    if (initialHash) {
                        const matchedTab = defaultNavItems.find(t => t.toLowerCase() === initialHash);
                        if (matchedTab) {
                            setActiveTabState(matchedTab);
                            window.history.replaceState({ tab: matchedTab }, '', window.location.href);
                        } else {
                            setActiveTabState("Inicio");
                            window.history.replaceState({ tab: 'Inicio' }, '', window.location.href);
                        }
                    } else {
                        setActiveTabState("Inicio");
                        window.history.replaceState({ tab: 'Inicio' }, '', window.location.href);
                    }
                }
            }
            // --- 4. DEFAULT ADMIN ---
            else {
                // No token found, user will see selector.
                // We set default perms in case they pick a congregation manually from list
                const adminPerms = defaultNavItems.map(t => ({ name: t, access: 'edit' as const }));
                setTabPermissions(adminPerms);
            }
            
            setIsLoadingAccess(false);
        };

        checkAccess();
    }, [applyAccessConfig]); // Safe dependency array now that applyAccessConfig is stable via Context fix. Removed isSuperAdmin to prevent redundant checks on logout.

    const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    const toggleViewMode = () => {
        setViewMode(prevMode => {
            const next = prevMode === 'desktop' ? 'mobile' : 'desktop';
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('vmt_manual_view', next);
                localStorage.removeItem('vmt_view_mode'); // Clear legacy persistent item
            }
            return next;
        });
    };

    const isReadOnly = useMemo(() => {
        if (isSuperAdmin) return false; // Super admin always edits
        if (!accessLabel) return false;
        const perm = tabPermissions.find(p => p.name === activeTab);
        return perm ? perm.access === 'view' : true;
    }, [accessLabel, activeTab, tabPermissions, isSuperAdmin]);

    const appClassName = `theme-${theme} view-${viewMode}`;

    if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh', background:'var(--bg-color)', color:'var(--text-color)'}}>Cargando...</div>;
    if (isLoadingAccess) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>Verificando credenciales...</div>;

    // If no congregation is selected and we are NOT in a specific token view (admin mode without token), show selector
    if (!currentCongregation && !specialView) {
        return (
            <>
                <CongregationSelector 
                    onTokenSuccess={applyAccessConfig} 
                    onSetSuperAdmin={setIsSuperAdmin} 
                    onOpenInstallModal={() => setIsInstallModalOpen(true)} 
                    isInstalled={pwaState.isInstalled}
                />
                <InstallAppModal 
                    isOpen={isInstallModalOpen} 
                    onClose={() => setIsInstallModalOpen(false)} 
                    pwaState={pwaState} 
                />
            </>
        );
    }

    if (specialView?.view === 'assignments') {
        return <div className={`app-container ${appClassName}`}><AcceptAssignments participant={specialView.participant!} /></div>;
    }

    if (specialView?.view === 'publisher_report') {
        return <div className={`app-container ${appClassName}`}><SharedPublisherReport congregationId={specialView.congregationId!} /></div>;
    }

    return (
        <div className={`app-container ${appClassName}`}>
            <Header
                navItems={navItems}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                theme={theme}
                toggleTheme={toggleTheme}
                viewMode={viewMode}
                toggleViewMode={toggleViewMode}
                congregationName={currentCongregation?.name}
                accessLabel={isSuperAdmin ? "Super Admin" : accessLabel}
                onOpenInstallModal={() => setIsInstallModalOpen(true)}
                isInstalled={pwaState.isInstalled}
            />
            {/* The banner "Vista: ..." has been removed as requested */}
            
            {/* Super Admin specific logout bar (discreet) - kept separate for admin tasks */}
            {isSuperAdmin && (
                <div className="bg-slate-900 text-slate-300 border-b border-slate-800 text-xs px-4 py-1.5 flex justify-end items-center gap-3 select-none">
                    <span className="flex items-center gap-1.5 opacity-80 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Administrador Global
                    </span>
                    <button 
                        onClick={handleExit} 
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            )}
            <main>
                <div style={{ display: activeTab === 'Inicio' ? 'block' : 'none' }}>
                    <Inicio 
                        accessLabel={isSuperAdmin ? null : accessLabel} 
                        onNavigate={setActiveTab} 
                        onOpenInstallModal={() => setIsInstallModalOpen(true)} 
                        isInstalled={pwaState.isInstalled}
                    />
                </div>
                
                {navItems.includes('Recordatorios') && (
                    <div style={{ display: activeTab === 'Recordatorios' ? 'block' : 'none' }}>
                        <Recordatorios isReadOnly={isReadOnly} />
                    </div>
                )}

                {navItems.includes('Programa') && (
                    <div style={{ display: activeTab === 'Programa' ? 'block' : 'none' }}>
                        <Programa isReadOnly={isReadOnly} isActive={activeTab === 'Programa'} />
                    </div>
                )}
                
                {navItems.includes('Gestionar Participantes') && (
                    <div style={{ display: activeTab === 'Gestionar Participantes' ? 'block' : 'none' }}>
                        <GestionarParticipantes isReadOnly={isReadOnly} /> 
                    </div>
                )}
                
                {(navItems.includes('Grupo de Congregación') || navItems.includes('↳ Mi Grupo') || navItems.includes('↳ Resumen General') || navItems.includes('↳ Lista de Publicadores')) && (
                    <div style={{ display: ['Grupo de Congregación', '↳ Mi Grupo', '↳ Resumen General', '↳ Lista de Publicadores'].includes(activeTab) ? 'block' : 'none' }}>
                        <GrupoCongregacion 
                            isReadOnly={isReadOnly} 
                            restrictedGroupId={isSuperAdmin ? null : restrictedGroupId} 
                            navItems={navItems}
                            activeTab={activeTab}
                        />
                    </div>
                )}
                
                {navItems.includes('Rol de Grupos') && (
                    <div style={{ display: activeTab === 'Rol de Grupos' ? 'block' : 'none' }}>
                        <RolGrupos isReadOnly={isReadOnly} />
                    </div>
                )}
                
                {navItems.includes('Filtros Avanzados') && (
                    <div style={{ display: activeTab === 'Filtros Avanzados' ? 'block' : 'none' }}>
                        <FiltrosAvanzados />
                    </div>
                )}
                
                {navItems.includes('Respuestas de Asignaciones') && (
                    <div style={{ display: activeTab === 'Respuestas de Asignaciones' ? 'block' : 'none' }}>
                        <HistorialEventos />
                    </div>
                )}
                
                {navItems.includes('Informes') && (
                    <div style={{ display: activeTab === 'Informes' ? 'block' : 'none' }}>
                        <Informes restrictedGroupId={null} />
                    </div>
                )}
                
                {navItems.includes('Asistencia') && (
                    <div style={{ display: activeTab === 'Asistencia' ? 'block' : 'none' }}>
                        <Asistencia isReadOnly={isReadOnly} />
                    </div>
                )}
                
                {navItems.includes('Planificador') && (
                    <div style={{ display: activeTab === 'Planificador' ? 'block' : 'none' }}>
                        <Planificador isReadOnly={isReadOnly} isActive={activeTab === 'Planificador'} />
                    </div>
                )}
                
                {navItems.includes('Asignar Anc. y Min.') && (
                    <div style={{ display: activeTab === 'Asignar Anc. y Min.' ? 'block' : 'none' }}>
                        <AsignarAncMin isReadOnly={isReadOnly} />
                    </div>
                )}
                
                {navItems.includes('Copias de Seguridad') && (
                    <div style={{ display: activeTab === 'Copias de Seguridad' ? 'block' : 'none' }}>
                        <CopiasSeguridad isReadOnly={isReadOnly} />
                    </div>
                )}
                
                {navItems.includes('Configuración') && (
                    <div style={{ display: activeTab === 'Configuración' ? 'block' : 'none' }}>
                        <ConfiguracionAcceso 
                            onSimulate={applyAccessConfig} 
                            isSuperAdmin={isSuperAdmin} 
                            isReadOnly={isReadOnly} 
                        />
                    </div>
                )}
            </main>

            <InstallAppModal 
                isOpen={isInstallModalOpen} 
                onClose={() => setIsInstallModalOpen(false)} 
                pwaState={pwaState} 
            />

            {/* Mobile / PWA floating install trigger pill - ONLY when NOT installed and NOT standalone */}
            {!pwaState.isStandalone && !pwaState.isInstalled && !dismissFloatingBanner && (
                <aside aria-label="Aviso de instalación móvil" className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-xs z-40">
                    <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white p-2.5 sm:p-3 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                <i className="fas fa-mobile-screen-button text-white text-xs"></i>
                            </div>
                            <div className="text-xs truncate">
                                <span className="font-bold block text-white leading-tight">Instalar en tu Celular</span>
                                <span className="text-[10px] text-slate-300">Android & iPhone</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => setIsInstallModalOpen(true)}
                                className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                            >
                                Instalar
                            </button>
                            <button
                                onClick={() => setDismissFloatingBanner(true)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Cerrar aviso"
                            >
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <CongregationProvider>
            <AppContent />
        </CongregationProvider>
    );
};

export default App;
