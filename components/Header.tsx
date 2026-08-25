
import React, { useState, useRef, useEffect } from 'react';
import { useCongregation } from '../lib/CongregationContext';
import { useDBStatus } from '../lib/supabase';

const DBStatusIndicator: React.FC = () => {
    const { activeWrites, lastWriteError, isOnline } = useDBStatus();

    let statusText = 'Sincronizado';
    let statusClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-550/10 dark:text-emerald-400 dark:border-emerald-555/20';
    let dotClass = 'bg-emerald-500';
    let isPulsing = false;

    if (!isOnline) {
        statusText = 'Modo sin conexión';
        statusClass = 'bg-slate-500/10 text-slate-500 border-slate-500/15 dark:bg-slate-500/10 dark:text-slate-450 dark:border-slate-500/15';
        dotClass = 'bg-slate-400';
    } else if (activeWrites > 0) {
        statusText = 'Guardando...';
        statusClass = 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
        dotClass = 'bg-amber-500';
        isPulsing = true;
    } else if (lastWriteError) {
        statusText = 'No se pudo guardar';
        statusClass = 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
        dotClass = 'bg-rose-500';
    }

    return (
        <div 
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${statusClass} transition-all duration-300 shadow-sm shrink-0`}
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
            <span className="relative flex h-2 w-2">
                {isPulsing && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`}></span>
            </span>
            <span className="tracking-tight hidden xs:inline">{statusText}</span>
            <span className="tracking-tight xs:hidden leading-none">
                {statusText === 'Modo sin conexión' ? 'Offline' : statusText === 'Guardando...' ? 'Sinc.' : 'Sinc.'}
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
    accessLabel?: string | null; // Nuevo prop para el nombre del usuario
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
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
            <button onClick={toggleViewMode} className="action-button" title={`Vista ${viewMode === 'desktop' ? 'Móvil' : 'Escritorio'}`}>
                <i className={`fas fa-${viewMode === 'desktop' ? 'mobile-alt' : 'desktop'}`}></i>
            </button>
            <button onClick={toggleTheme} className="action-button" title={`Tema ${theme === 'light' ? 'Oscuro' : 'Claro'}`}>
                <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'}`}></i>
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

            if (group === 'Inicio' || (items.length === 1 && items[0] === group)) {
                return (
                    <li key={group} style={{position: 'relative'}}>
                        <button
                            onClick={() => { setActiveTab(items[0]); setOpenDropdown(null); if(isMobile) setMobileMenuOpen(false); }}
                            className={`app-nav__button ${activeTab === items[0] ? 'app-nav__button--active' : ''}`}
                            style={isMobile ? { width: '100%', fontSize: '1.1rem', fontWeight: 'bold' } : {}}
                        >
                            {group}
                        </button>
                    </li>
                );
            }

            const isActiveGroup = items.includes(activeTab);

            return (
                <li key={group} style={isMobile ? { borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '10px' } : { position: 'relative' }}>
                    <button
                        onClick={() => {
                            if (isMobile) {
                                setOpenDropdown(openDropdown === group ? null : group);
                            } else {
                                setOpenDropdown(openDropdown === group ? null : group);
                            }
                        }}
                        className={`app-nav__button ${isActiveGroup && !isMobile ? 'app-nav__button--active' : ''}`}
                        style={isMobile ? { width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', padding: '10px' } : { display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                        {group} {isMobile && <i className={`fas fa-chevron-${openDropdown === group ? 'up' : 'down'}`} style={{fontSize: '0.8em'}}></i>}
                    </button>
                    
                    {openDropdown === group && (
                        <div style={isMobile ? {
                            paddingLeft: '15px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            marginTop: '10px',
                            borderLeft: '2px solid var(--primary-light)',
                            marginLeft: '10px'
                        } : {
                            position: 'absolute',
                            top: 'calc(100% + 10px)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: 'var(--card-bg-color)',
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            borderRadius: '12px',
                            padding: '8px',
                            minWidth: '240px',
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            animation: 'slideUp 0.2s ease-out'
                        }}>
                            {items.map(item => (
                                <button
                                    key={item}
                                    onClick={() => {
                                        setActiveTab(item);
                                        setOpenDropdown(null);
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    className={`app-nav__button ${activeTab === item ? 'app-nav__button--active' : ''}`}
                                    style={isMobile ? {
                                        fontSize: '0.90rem',
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        fontWeight: '500',
                                        color: activeTab === item ? 'var(--primary-color)' : 'var(--text-color)'
                                    } : {
                                        textAlign: 'left',
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        fontWeight: activeTab === item ? '600' : '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    {item}
                                    {activeTab === item && !isMobile && <i className="fas fa-check" style={{fontSize: '0.8rem', color: 'var(--primary-color)'}}></i>}
                                </button>
                            ))}
                        </div>
                    )}
                </li>
            );
        });
    };

    return (
        <header className="app-header" ref={headerRef}>
            <div className="app-header__container">
                <div className="app-header__inner">
                    <div 
                        className="app-header__branding" 
                        onClick={handleSecretLogoClick}
                        title="Cambiar Congregación (5 toques)"
                    >
                        <img 
                            className="app-header__logo" 
                            src="https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&q=80&w=150&h=150" 
                            alt="Logo"
                        />
                        <div>
                            <div className="app-header__title">{congregationName || 'Sistema VMT'}</div>
                            {congregationName && <div style={{fontSize:'0.75rem', color:'var(--text-color-light)', fontWeight:'500'}}>Congregación Activa</div>}
                            {/* Mostrar nombre de usuario aquí */}
                            {accessLabel && (
                                <div style={{
                                    fontSize:'0.7rem', 
                                    color:'var(--primary-color)', 
                                    fontWeight:'700', 
                                    marginTop:'2px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    <i className="fas fa-user-circle mr-1"></i>{accessLabel}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Desktop Nav */}
                    <nav className="app-nav--desktop" style={{flex: 1}}>
                        <ul className="app-nav__list" style={{gap: '5px', justifyContent: 'center'}}>
                            {renderNavItems(false)}
                        </ul>
                    </nav>

                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                         <DBStatusIndicator />
                         <div className="flex items-center gap-1.5 sm:gap-2">
                            {actionButtons}
                         </div>
 
                         {/* Mobile Menu Button */}
                        <div className="app-nav__mobile-toggle-wrapper">
                            <button
                                type="button"
                                className="app-nav__mobile-toggle"
                                aria-label="Toggle menu"
                                onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                <i className={`fas fa-${isMobileMenuOpen ? 'times' : 'bars'}`}></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                 {/* Mobile Nav */}
                {isMobileMenuOpen && (
                    <nav className="app-nav app-nav--mobile">
                        <ul className="app-nav__list app-nav__list--mobile" style={{alignItems: 'stretch', padding: '10px'}}>
                            {renderNavItems(true)}
                            <li style={{borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '12px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '10px'}}>
                                <button 
                                    onClick={toggleViewMode} 
                                    className="app-nav__button"
                                    style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: 'var(--text-color-light)', fontSize: '0.85rem', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)'}}
                                    title={`Vista ${viewMode === 'desktop' ? 'Móvil' : 'Escritorio'}`}
                                >
                                    <i className={`fas fa-${viewMode === 'desktop' ? 'mobile-alt' : 'desktop'}`}></i>
                                    <span>Vista {viewMode === 'desktop' ? 'Móvil' : 'Escritorio'}</span>
                                </button>
                                <button 
                                    onClick={toggleTheme} 
                                    className="app-nav__button"
                                    style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: 'var(--text-color-light)', fontSize: '0.85rem', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)'}}
                                    title={`Tema ${theme === 'light' ? 'Oscuro' : 'Claro'}`}
                                >
                                    <i className={`fas fa-${theme === 'light' ? 'moon' : 'sun'}`}></i>
                                    <span>Tema {theme === 'light' ? 'Oscuro' : 'Claro'}</span>
                                </button>
                            </li>
                        </ul>
                    </nav>
                )}
            </div>
        </header>
    );
};

export default Header;
