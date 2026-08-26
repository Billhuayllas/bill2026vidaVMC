
import React, { useState, useRef, useEffect } from 'react';
import { useCongregation } from '../lib/CongregationContext';
import { useDBStatus } from '../lib/supabase';
import { 
    Home, 
    BookOpen, 
    Users, 
    BarChart3, 
    Settings, 
    ChevronDown, 
    Check, 
    Smartphone, 
    Monitor, 
    Moon, 
    Sun,
    Menu,
    X,
    UserCheck,
    Shield,
    Calendar,
    Filter,
    CheckSquare,
    CalendarRange,
    ShieldCheck,
    FileText,
    User,
    PieChart,
    BookUser,
    CalendarDays,
    Bell,
    Database
} from 'lucide-react';

const DBStatusIndicator: React.FC = () => {
    const { activeWrites, lastWriteError, isOnline } = useDBStatus();

    let statusText = 'Sincronizado';
    let statusClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30';
    let dotClass = 'bg-emerald-500';
    let isPulsing = false;

    if (!isOnline) {
        statusText = 'Modo sin conexión';
        statusClass = 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-500/15 dark:text-slate-400 dark:border-slate-500/30';
        dotClass = 'bg-slate-400';
    } else if (activeWrites > 0) {
        statusText = 'Guardando...';
        statusClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30';
        dotClass = 'bg-amber-500';
        isPulsing = true;
    } else if (lastWriteError) {
        statusText = 'No se pudo guardar';
        statusClass = 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30';
        dotClass = 'bg-rose-500';
    }

    return (
        <div 
            className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-full text-[10px] sm:text-xs font-semibold border ${statusClass} backdrop-blur-sm transition-all duration-300 shadow-sm shrink-0`}
            title={
                !isOnline 
                ? 'Sin conexión a Internet. Los cambios se guardarán localmente.' 
                : activeWrites > 0 
                ? 'Sincronizando cambios en vivo con la base de datos...' 
                : lastWriteError 
                ? `Error de sincronización: ${lastWriteError.message || lastWriteError}` 
                : 'Conexión activa. Todos los cambios están guardados en la nube.'
            }
        >
            <span className="relative flex h-2 w-2 shrink-0">
                {isPulsing && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`}></span>
            </span>
            <span className="tracking-tight hidden sm:inline">{statusText}</span>
            <span className="tracking-tight sm:hidden leading-none font-bold">
                {statusText === 'Modo sin conexión' ? 'Off' : statusText === 'Guardando...' ? 'Sinc.' : 'Sinc.'}
            </span>
        </div>
    );
};

interface HeaderProps {
    navItems: string[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    viewMode: 'desktop' | 'mobile';
    toggleViewMode: () => void;
    congregationName?: string;
    accessLabel?: string | null;
}

type NavGroup = 'Inicio' | 'Vida y Ministerio Teocrático' | 'Informes de Predicación' | 'Asistencia' | 'Configuración';

const TABS_MAPPING: Record<string, NavGroup> = {
    "Inicio": "Inicio",
    "Programa": "Vida y Ministerio Teocrático",
    "Gestionar Participantes": "Vida y Ministerio Teocrático",
    "Filtros Avanzados": "Vida y Ministerio Teocrático",
    "Respuestas de Asignaciones": "Vida y Ministerio Teocrático",
    "Planificador": "Vida y Ministerio Teocrático",
    "Asignar Anc. y Min.": "Vida y Ministerio Teocrático",
    "Informes": "Vida y Ministerio Teocrático",
    "Asistencia": "Asistencia",
    "Grupo de Congregación": "Informes de Predicación",
    "↳ Mi Grupo": "Informes de Predicación",
    "↳ Resumen General": "Informes de Predicación",
    "↳ Lista de Publicadores": "Informes de Predicación",
    "Rol de Grupos": "Informes de Predicación",
    "Recordatorios": "Configuración",
    "Copias de Seguridad": "Configuración",
    "Configuración": "Configuración"
};

const GROUPS_ORDER: NavGroup[] = [
    'Inicio',
    'Vida y Ministerio Teocrático',
    'Informes de Predicación',
    'Asistencia',
    'Configuración'
];

const GROUP_ICONS: Record<NavGroup, React.FC<{ className?: string }>> = {
    'Inicio': Home,
    'Vida y Ministerio Teocrático': BookOpen,
    'Informes de Predicación': Users,
    'Asistencia': BarChart3,
    'Configuración': Settings
};

const TAB_ICONS: Record<string, React.FC<{ className?: string }>> = {
    "Inicio": Home,
    "Programa": Calendar,
    "Gestionar Participantes": UserCheck,
    "Filtros Avanzados": Filter,
    "Respuestas de Asignaciones": CheckSquare,
    "Planificador": CalendarRange,
    "Asignar Anc. y Min.": ShieldCheck,
    "Informes": FileText,
    "Asistencia": BarChart3,
    "Grupo de Congregación": Users,
    "↳ Mi Grupo": User,
    "↳ Resumen General": PieChart,
    "↳ Lista de Publicadores": BookUser,
    "↳ Directorio": BookUser,
    "↳ Tarjetas": BookUser,
    "Rol de Grupos": CalendarDays,
    "Recordatorios": Bell,
    "Copias de Seguridad": Database,
    "Configuración": Settings
};

const Header: React.FC<HeaderProps> = ({ navItems, activeTab, setActiveTab, theme, toggleTheme, viewMode, toggleViewMode, congregationName, accessLabel }) => {
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<NavGroup | null>(null);
    const { setCongregation } = useCongregation();
    
    // Secret tap logic state
    const [tapCount, setTapCount] = useState(0);
    const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const headerRef = useRef<HTMLElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSecretLogoClick = () => {
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
        }

        const newCount = tapCount + 1;
        setTapCount(newCount);

        if (newCount >= 5) {
            setCongregation(null);
            setTapCount(0);
        } else {
            tapTimeoutRef.current = setTimeout(() => {
                setTapCount(0);
            }, 800);
        }
    };

    const actionButtons = (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} className="shrink-0">
            <button 
                onClick={toggleViewMode} 
                className="action-button hover:scale-105 active:scale-95 transition-transform" 
                title={`Cambiar a vista ${viewMode === 'desktop' ? 'Móvil' : 'Escritorio'}`}
                style={{
                    backgroundColor: 'var(--card-bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px'
                }}
            >
                <i 
                    className={`fas fa-${viewMode === 'desktop' ? 'mobile-alt' : 'desktop'}`} 
                    style={{ color: '#3b82f6', fontSize: '15px' }}
                ></i>
            </button>
            <button 
                onClick={toggleTheme} 
                className="action-button hover:scale-105 active:scale-95 transition-transform" 
                title={`Cambiar a tema ${theme === 'light' ? 'Oscuro' : 'Claro'}`}
                style={{
                    backgroundColor: 'var(--card-bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px'
                }}
            >
                <i 
                    className={`fas fa-${theme === 'light' ? 'moon' : 'sun'}`} 
                    style={{ color: theme === 'light' ? '#6366f1' : '#f59e0b', fontSize: '15px' }}
                ></i>
            </button>
        </div>
    );

    // Group navItems
    const navGroups: Record<NavGroup, string[]> = {
        'Inicio': [],
        'Vida y Ministerio Teocrático': [],
        'Informes de Predicación': [],
        'Asistencia': [],
        'Configuración': []
    };

    navItems.forEach(item => {
        const group = TABS_MAPPING[item];
        if (group && navGroups[group]) {
            navGroups[group].push(item);
        }
    });

    const renderNavItems = (isMobile: boolean) => {
        return GROUPS_ORDER.map(group => {
            const items = navGroups[group];
            if (items.length === 0) return null;
            const IconComp = GROUP_ICONS[group];

            if (group === 'Inicio' || (items.length === 1 && items[0] === group)) {
                const isActive = activeTab === items[0];
                return (
                    <li key={group} className="list-none m-0 p-0 relative">
                        <button
                            onClick={() => { setActiveTab(items[0]); setOpenDropdown(null); if(isMobile) setMobileMenuOpen(false); }}
                            className={`flex items-center gap-2 font-bold transition-all duration-200 cursor-pointer select-none ${
                                isMobile 
                                    ? `w-full px-4 py-3 rounded-xl text-sm ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                                    : `px-3.5 py-1.5 rounded-xl text-xs xl:text-sm ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30 font-extrabold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/80 font-semibold'}`
                            }`}
                        >
                            <IconComp className="w-4 h-4 shrink-0" />
                            <span className="whitespace-nowrap">{group}</span>
                        </button>
                    </li>
                );
            }

            const isActiveGroup = items.includes(activeTab);

            return (
                <li key={group} className={isMobile ? "list-none m-0 p-0 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2" : "list-none m-0 p-0 relative"}>
                    <button
                        onClick={() => {
                            setOpenDropdown(openDropdown === group ? null : group);
                        }}
                        className={`flex items-center gap-2 font-semibold transition-all duration-200 cursor-pointer select-none ${
                            isMobile 
                                ? `w-full px-4 py-3 rounded-xl text-sm justify-between ${isActiveGroup ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`
                                : `px-3.5 py-1.5 rounded-xl text-xs xl:text-sm ${isActiveGroup ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30 font-extrabold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/80 font-semibold'}`
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <IconComp className="w-4 h-4 shrink-0" />
                            <span className="whitespace-nowrap">{group}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === group ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {openDropdown === group && (
                        <div 
                            className="animate-fade-in-up"
                            style={isMobile ? {
                                paddingLeft: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                marginTop: '6px',
                                borderLeft: '2px solid #3b82f6',
                                marginLeft: '12px'
                            } : {
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: 'var(--card-bg-color)',
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.15)',
                                borderRadius: '16px',
                                padding: '8px',
                                minWidth: '250px',
                                zIndex: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                backdropFilter: 'blur(16px)'
                            }}
                        >
                            {items.map(item => {
                                const ItemIcon = TAB_ICONS[item] || (group ? GROUP_ICONS[group] : BookOpen);
                                const isActive = activeTab === item;
                                return (
                                    <button
                                        key={item}
                                        onClick={() => {
                                            setActiveTab(item);
                                            setOpenDropdown(null);
                                            if (isMobile) setMobileMenuOpen(false);
                                        }}
                                        className={`text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer gap-2 ${
                                            isActive 
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-sm' 
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <ItemIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
                                            <span className="truncate">{item}</span>
                                        </div>
                                        {isActive && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </li>
            );
        });
    };

    return (
        <header className="app-header bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/90 dark:border-slate-800/90 shadow-sm sticky top-0 z-50 py-1.5 sm:py-2" ref={headerRef}>
            <div className="max-w-7xl mx-auto px-3 sm:px-6">
                <div className="flex items-center justify-between gap-3 min-h-[50px] sm:min-h-[58px]">
                    <div 
                        className="flex items-center gap-2.5 sm:gap-3 select-none cursor-pointer min-w-0" 
                        onClick={handleSecretLogoClick}
                        title="Cambiar Congregación (5 toques)"
                    >
                        <div className="relative shrink-0">
                            <img 
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-sm border-2 border-indigo-500/20 dark:border-indigo-500/40" 
                                src="https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&q=80&w=150&h=150" 
                                alt="Logo"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></div>
                        </div>
                        <div className="min-w-0">
                            <div className="font-black text-slate-900 dark:text-white tracking-tight leading-tight text-sm sm:text-base truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none">
                                {congregationName || 'Sistema VMT'}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-none hidden xs:inline">
                                    Congregación Activa
                                </span>
                                {accessLabel && (
                                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 border border-blue-200/80 dark:border-blue-800/60 px-2 py-0.5 rounded-full leading-tight">
                                        <Shield className="w-2.5 h-2.5" />
                                        <span>{accessLabel}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Desktop Segmented Navigation Bar */}
                    <nav className="hidden lg:flex items-center justify-center flex-1 px-3">
                        <ul className="list-none m-0 p-1 flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
                            {renderNavItems(false)}
                        </ul>
                    </nav>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <DBStatusIndicator />
                        {actionButtons}

                        {/* Mobile Menu Button */}
                        <div className="lg:hidden shrink-0">
                            <button
                                type="button"
                                className="action-button app-nav__mobile-toggle hover:scale-105 active:scale-95 transition-transform"
                                aria-label="Toggle menu"
                                onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
                                style={{
                                    backgroundColor: 'var(--card-bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px'
                                }}
                            >
                                <i 
                                    className={`fas fa-${isMobileMenuOpen ? 'times' : 'bars'}`} 
                                    style={{ color: 'var(--text-color)', fontSize: '15px' }}
                                ></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Mobile Nav Drawer */}
                {isMobileMenuOpen && (
                    <nav className="lg:hidden mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 animate-fade-in-down">
                        <ul className="list-none m-0 p-0 space-y-1 py-2">
                            {renderNavItems(true)}
                        </ul>
                    </nav>
                )}
            </div>
        </header>
    );
};

export default Header;
