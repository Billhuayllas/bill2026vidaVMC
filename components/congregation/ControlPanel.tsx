
import React from 'react';
import { Group } from './types';

interface ControlPanelProps {
    groups: Group[];
    selectedGroupId: number | null;
    onGroupChange: (id: number) => void;
    currentMonth: string;
    onMonthChange: (val: string) => void;
    isCreating: boolean;
    setIsCreating: (v: boolean) => void;
    newGroupName: string;
    setNewGroupName: (v: string) => void;
    onCreateGroup: () => void;
    isReadOnly?: boolean;
    disableGroupSelect?: boolean;
    isMonthLocked?: boolean;
    onToggleLock?: (isLocking: boolean) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
    groups, 
    selectedGroupId, 
    onGroupChange, 
    currentMonth, 
    onMonthChange, 
    isCreating, 
    setIsCreating, 
    newGroupName, 
    setNewGroupName, 
    onCreateGroup, 
    isReadOnly = false, 
    disableGroupSelect = false,
    isMonthLocked = false,
    onToggleLock
}) => {
    const selectedGroup = groups.find(g => g.id === selectedGroupId);

    const monthOptions = React.useMemo(() => {
        const options = [];
        const currentDate = new Date();
        currentDate.setDate(1); // Mismo día primero para evitar saltos
        currentDate.setMonth(currentDate.getMonth() + 2);
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        for (let i = 0; i < 24; i++) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const value = `${year}-${month}`;
            const label = `${monthNames[currentDate.getMonth()]} ${year}`;
            options.push({ value, label });
            currentDate.setMonth(currentDate.getMonth() - 1);
        }
        
        if (currentMonth && !options.some(o => o.value === currentMonth)) {
            const [y, m] = currentMonth.split('-');
            const monthIdx = parseInt(m, 10) - 1;
            const label = `${monthNames[monthIdx]} ${y}`;
            options.push({ value: currentMonth, label });
            options.sort((a, b) => b.value.localeCompare(a.value));
        }
        
        return options;
    }, [currentMonth]);

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Group Selector / Display */}
                <div style={{ 
                    backgroundColor: disableGroupSelect ? '#fef3c7' : 'var(--card-bg-color)', 
                    borderRadius: '12px', 
                    border: disableGroupSelect ? '1px solid #fde68a' : '1px solid var(--border-color)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ 
                            display: 'block', 
                            fontSize: '0.75rem', 
                            fontWeight: '800', 
                            color: disableGroupSelect ? '#d97706' : 'var(--text-color-light)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px' 
                        }}>
                            {disableGroupSelect ? <><i className="fas fa-lock mr-2"></i>GRUPO ASIGNADO</> : 'GRUPO DE PREDICACIÓN'}
                        </label>
                        {!isReadOnly && !disableGroupSelect && (
                            <button 
                                onClick={() => setIsCreating(!isCreating)} 
                                style={{ 
                                    color: 'var(--primary-color)', 
                                    background: 'var(--light-gray)', 
                                    border: 'none', 
                                    borderRadius: '50%', 
                                    width: '28px', 
                                    height: '28px', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                title="Crear nuevo grupo"
                            >
                                <i className={`fas ${isCreating ? 'fa-minus' : 'fa-plus'}`}></i>
                            </button>
                        )}
                    </div>

                    {disableGroupSelect ? (
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-color)', display: 'flex', alignItems: 'center' }}>
                            {selectedGroup?.nombre || 'Cargando...'}
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <select 
                                value={selectedGroupId || ''} 
                                onChange={(e) => onGroupChange(Number(e.target.value))} 
                                style={{ 
                                    width: '100%', 
                                    fontSize: '1.2rem', 
                                    fontWeight: '700', 
                                    color: 'var(--text-color)', 
                                    background: 'transparent', 
                                    border: 'none', 
                                    outline: 'none', 
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    paddingRight: '30px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                <option value="" disabled>Seleccione un grupo...</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                            </select>
                            <div style={{ 
                                position: 'absolute', 
                                right: '0', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                background: 'var(--light-gray)',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none'
                            }}>
                                <i className="fas fa-chevron-down" style={{ fontSize: '0.8rem', color: 'var(--text-color)' }}></i>
                            </div>
                        </div>
                    )}
                </div>

                {/* Month Selector */}
                <div style={{ 
                    backgroundColor: 'var(--card-bg-color)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-color)',
                    padding: '16px', 
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ 
                            display: 'block', 
                            fontSize: '0.75rem', 
                            fontWeight: '800', 
                            color: 'var(--text-color-light)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px' 
                        }}>
                            MES DE INFORME
                        </label>
                        {!isReadOnly && onToggleLock && selectedGroupId && (
                            <button
                                onClick={() => onToggleLock(!isMonthLocked)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.4, padding: '0 5px', color: 'var(--text-color)' }}
                                title={isMonthLocked ? "Desbloquear mes" : "Bloquear mes"}
                            >
                                <i className={`fas ${isMonthLocked ? 'fa-lock' : 'fa-unlock'}`} style={{ fontSize: '1rem' }}></i>
                            </button>
                        )}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <select 
                            value={currentMonth} 
                            onChange={(e) => onMonthChange(e.target.value)} 
                            style={{ 
                                width: '100%', 
                                fontSize: '1.2rem', 
                                fontWeight: '700', 
                                color: 'var(--text-color)', 
                                background: 'transparent', 
                                border: 'none', 
                                outline: 'none',
                                fontFamily: 'inherit',
                                appearance: 'none',
                                cursor: 'pointer',
                                paddingRight: '30px'
                            }} 
                        >
                            {monthOptions.map((m, idx) => (
                                <option key={`${m.value}-${idx}`} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                        <div style={{ 
                            position: 'absolute', 
                            right: '0', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            background: 'var(--light-gray)',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none'
                        }}>
                            <i className="fas fa-calendar-alt" style={{ fontSize: '0.8rem', color: 'var(--text-color)' }}></i>
                        </div>
                    </div>
                </div>
            </div>

            {isCreating && !isReadOnly && !disableGroupSelect && (
                <div className="animate-fadeIn p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6 flex gap-3 shadow-inner">
                    <input 
                        autoFocus 
                        type="text" 
                        placeholder="Nombre del nuevo grupo..." 
                        value={newGroupName} 
                        onChange={(e) => setNewGroupName(e.target.value)} 
                        className="flex-1 p-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400" 
                        style={{ fontSize: '1rem' }}
                    />
                    <button 
                        onClick={onCreateGroup} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-bold shadow-md transition-colors"
                    >
                        Crear
                    </button>
                </div>
            )}
        </>
    );
};

export default ControlPanel;
