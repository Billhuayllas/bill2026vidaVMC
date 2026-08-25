import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getFridayFromWeekId } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useCongregation } from '../lib/CongregationContext';

type Option = {
    id?: number;
    nombre: string;
    genero?: string;
};

type HistoryEntry = {
    date: string;
    description: string;
};

type PersonHistory = {
    mostRecent: string;
    assignments: HistoryEntry[];
};

type AssignmentHistory = Map<string, PersonHistory>;

interface CustomSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    historyProvider?: AssignmentHistory;
    tableName?: string;
    onParticipantUpdated?: () => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, historyProvider, tableName, onParticipantUpdated }) => {
    const { currentCongregation } = useCongregation();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilter, setGenderFilter] = useState<'Todos' | 'Hombre' | 'Mujer'>(
        (localStorage.getItem('customSelectGenderFilter') as 'Todos' | 'Hombre' | 'Mujer') || 'Todos'
    );
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, option: Option } | null>(null);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const [confirmDelete, setConfirmDelete] = useState<Option | null>(null);

    useEffect(() => {
        localStorage.setItem('customSelectGenderFilter', genderFilter);
    }, [genderFilter]);

    const sortedOptions = useMemo(() => {
        if (!historyProvider) {
            return [...options].sort((a, b) => a.nombre.localeCompare(b.nombre));
        }
        return [...options].sort((a, b) => {
            const historyA = historyProvider.get(a.nombre);
            const dateA = historyA ? historyA.mostRecent : '0000-00-00';
            const historyB = historyProvider.get(b.nombre);
            const dateB = historyB ? historyB.mostRecent : '0000-00-00';
            
            const dateComparison = dateA.localeCompare(dateB);
            if (dateComparison !== 0) {
                return dateComparison; // oldest first
            }
            return a.nombre.localeCompare(b.nombre);
        });
    }, [options, historyProvider]);
    
    const filteredOptions = useMemo(() => {
        let filtered = sortedOptions;
        
        if (genderFilter !== 'Todos') {
            filtered = filtered.filter(opt => opt.genero === genderFilter);
        }
        
        if (searchTerm) {
            filtered = filtered.filter(opt => opt.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        
        return filtered;
    }, [sortedOptions, searchTerm, genderFilter]);

    const allOptionsWithPlaceholder = useMemo(() => [{ nombre: '-- Asignar --' }, ...filteredOptions], [filteredOptions]);

    useEffect(() => {
        if (isOpen) {
            setHighlightedIndex(0); 
            setTimeout(() => searchInputRef.current?.focus(), 50);
        } else {
            setSearchTerm('');
            setContextMenu(null);
            setIsMultiSelectMode(false);
            setSelectedIds(new Set());
        }
    }, [isOpen]);

    useEffect(() => {
        if (highlightedIndex < 0 || !listRef.current) return;
        const optionElement = listRef.current.querySelector(`li:nth-child(${highlightedIndex + 1})`) as HTMLLIElement;
        if (optionElement) {
            optionElement.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'Escape':
                e.stopPropagation();
                setIsOpen(false);
                break;
            case 'Enter':
                e.preventDefault();
                e.stopPropagation();
                if (highlightedIndex >= 0 && highlightedIndex < allOptionsWithPlaceholder.length) {
                    selectOption(allOptionsWithPlaceholder[highlightedIndex]);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                e.stopPropagation();
                setHighlightedIndex(prev => (prev + 1) % allOptionsWithPlaceholder.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                e.stopPropagation();
                setHighlightedIndex(prev => (prev - 1 + allOptionsWithPlaceholder.length) % allOptionsWithPlaceholder.length);
                break;
        }
    };
    
    const selectOption = (option: { nombre: string }) => {
        const newValue = option.nombre === '-- Asignar --' ? '' : option.nombre;
        onChange(newValue);
        setIsOpen(false);
    };

    const handleContextMenu = (e: React.MouseEvent, option: Option) => {
        if (option.nombre === '-- Asignar --' || !tableName) return;
        e.preventDefault();
        console.log("Context menu opened for:", option);
        setContextMenu({ x: e.clientX, y: e.clientY, option });
    };

    const handleUpdateGender = async (option: Option, newGender: string) => {
        if (!tableName || !option.id) return;
        const { error } = await supabase.from(tableName).update({ genero: newGender }).eq('id', option.id);
        if (!error) {
            if (onParticipantUpdated) onParticipantUpdated();
        }
        setContextMenu(null);
    };

    const handleDeleteParticipant = (option: Option) => {
        if (!tableName || !option.id) return;
        setConfirmDelete(option);
        setContextMenu(null);
    };

    const confirmAndDelete = async () => {
        if (!tableName || !confirmDelete?.id) return;
        const { error } = await supabase.from(tableName).delete().eq('id', confirmDelete.id);
        if (!error) {
            if (onParticipantUpdated) onParticipantUpdated();
        } else {
            console.error("Error deleting participant:", error);
        }
        setConfirmDelete(null);
    };

    const modalContent = isOpen ? (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 10005,
            padding: '20px'
        }} onClick={() => setIsOpen(false)}>
            <div style={{
                backgroundColor: 'white', borderRadius: '12px', padding: '20px',
                width: '100%', maxWidth: '500px', maxHeight: '85vh',
                display: 'flex', flexDirection: 'column', gap: '15px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }} onClick={e => { e.stopPropagation(); setContextMenu(null); }} role="dialog">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Seleccionar Participante</h3>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar participante..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            style={{ 
                                width: '100%', padding: '12px 35px 12px 12px', 
                                borderRadius: '8px', border: '1px solid #cbd5e1', 
                                fontSize: '1rem', outline: 'none' 
                            }}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                style={{ 
                                    position: 'absolute', right: '10px', top: '50%', 
                                    transform: 'translateY(-50%)', background: 'none', 
                                    border: 'none', fontSize: '1.2rem', color: '#94a3b8', 
                                    cursor: 'pointer' 
                                }}
                            >
                                &times;
                            </button>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={() => setGenderFilter('Todos')}
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: genderFilter === 'Todos' ? '#e2e8f0' : 'white', cursor: 'pointer', fontWeight: genderFilter === 'Todos' ? 'bold' : 'normal' }}
                        >
                            Todos
                        </button>
                        <button 
                            onClick={() => setGenderFilter('Hombre')}
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: genderFilter === 'Hombre' ? '#e2e8f0' : 'white', cursor: 'pointer', fontWeight: genderFilter === 'Hombre' ? 'bold' : 'normal' }}
                        >
                            Hombres
                        </button>
                        <button 
                            onClick={() => setGenderFilter('Mujer')}
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: genderFilter === 'Mujer' ? '#e2e8f0' : 'white', cursor: 'pointer', fontWeight: genderFilter === 'Mujer' ? 'bold' : 'normal' }}
                        >
                            Mujeres
                        </button>
                    </div>
                </div>
                
                <ul ref={listRef} style={{ 
                    flex: 1, overflowY: 'auto', padding: 0, margin: 0, 
                    border: '1px solid #e2e8f0', borderRadius: '8px', listStyle: 'none' 
                }}>
                    {searchTerm && !filteredOptions.some(o => o.nombre.toLowerCase() === searchTerm.toLowerCase()) && (
                        <li
                            onClick={() => {
                                onChange(searchTerm.trim());
                                setIsOpen(false);
                            }}
                            style={{ 
                                padding: '12px 16px', 
                                borderBottom: '1px solid #f1f5f9', 
                                cursor: 'pointer',
                                backgroundColor: highlightedIndex === -1 ? '#f1f5f9' : 'transparent',
                                color: 'var(--primary-color)',
                                fontWeight: 'bold'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fas fa-keyboard"></i>
                                <span style={{ flex: 1 }}>Usar manual: "{searchTerm}"</span>
                                {tableName && currentCongregation && (
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const { error } = await supabase.from(tableName).insert([{ 
                                                nombre: searchTerm.trim(), 
                                                congregation_id: currentCongregation.id 
                                            }]);
                                            if (!error) {
                                                if (onParticipantUpdated) onParticipantUpdated();
                                                onChange(searchTerm.trim());
                                                setIsOpen(false);
                                            }
                                        }}
                                        style={{ backgroundColor: 'var(--positive-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Registrar
                                    </button>
                                )}
                            </div>
                        </li>
                    )}

                    {allOptionsWithPlaceholder.map((opt, index) => {
                        const isPlaceholder = opt.nombre === '-- Asignar --';
                        const history = isPlaceholder ? null : historyProvider?.get(opt.nombre);
                        const lastAssignment = history?.assignments?.[0];
                        const historyText = lastAssignment ? `Última: ${getFridayFromWeekId(lastAssignment.date, 'short')} - ${lastAssignment.description}` : '';

                        return (
                            <li
                                key={isPlaceholder ? 'placeholder' : `${opt.id || opt.nombre}-${index}`}
                                onClick={() => {
                                    if (isMultiSelectMode && !isPlaceholder && opt.id) {
                                        setSelectedIds(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(opt.id!)) newSet.delete(opt.id!);
                                            else newSet.add(opt.id!);
                                            return newSet;
                                        });
                                    } else if (!isMultiSelectMode) {
                                        selectOption(opt);
                                    }
                                }}
                                onContextMenu={(e) => handleContextMenu(e, opt as Option)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                style={{ 
                                    padding: '12px 16px', 
                                    borderBottom: '1px solid #f1f5f9', 
                                    cursor: 'pointer',
                                    backgroundColor: (isMultiSelectMode && opt.id && selectedIds.has(opt.id)) ? '#e0e7ff' : (highlightedIndex === index ? '#f1f5f9' : 'transparent'),
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {isMultiSelectMode && !isPlaceholder && (
                                        <input type="checkbox" checked={opt.id ? selectedIds.has(opt.id) : false} readOnly />
                                    )}
                                    <div>
                                        <span style={{ fontWeight: isPlaceholder ? 'bold' : '500', color: '#1e293b' }}>{opt.nombre}</span>
                                        {historyText && <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{historyText}</span>}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
                
                {contextMenu && (
                    <div 
                        onClick={e => e.stopPropagation()}
                        style={{
                        position: 'fixed',
                        top: `${contextMenu.y}px`,
                        left: `${contextMenu.x}px`,
                        backgroundColor: 'white',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        borderRadius: '8px',
                        padding: '8px 0',
                        zIndex: 10006,
                        minWidth: '200px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>
                            {contextMenu.option.nombre}
                        </div>
                        {tableName === 'publicadores' && (
                            <>
                                <button 
                                    onClick={() => handleUpdateGender(contextMenu.option, 'Hombre')}
                                    style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <span style={{ color: contextMenu.option.genero === 'Hombre' ? '#3b82f6' : 'transparent' }}>✓</span> Cambiar a Hombre
                                </button>
                                <button 
                                    onClick={() => handleUpdateGender(contextMenu.option, 'Mujer')}
                                    style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <span style={{ color: contextMenu.option.genero === 'Mujer' ? '#ec4899' : 'transparent' }}>✓</span> Cambiar a Mujer
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsMultiSelectMode(true);
                                        setSelectedIds(new Set(contextMenu.option.id ? [contextMenu.option.id] : []));
                                        setContextMenu(null);
                                    }}
                                    style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    Seleccionar varios...
                                </button>
                                <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }}></div>
                            </>
                        )}
                        <button 
                            onClick={() => handleDeleteParticipant(contextMenu.option)}
                            style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#ef4444' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            Dar de baja por inactividad
                        </button>
                    </div>
                )}
                
                {isMultiSelectMode && (
                    <div style={{ display: 'flex', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                        <button 
                            onClick={async () => {
                                if (selectedIds.size === 0) return;
                                const { error } = await supabase.from(tableName!).update({ genero: 'Mujer' }).in('id', Array.from(selectedIds));
                                if (!error && onParticipantUpdated) onParticipantUpdated();
                                setIsMultiSelectMode(false);
                                setSelectedIds(new Set());
                            }}
                            style={{ flex: 1, padding: '8px', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Convertir a Mujeres
                        </button>
                        <button 
                            onClick={async () => {
                                if (selectedIds.size === 0) return;
                                const { error } = await supabase.from(tableName!).update({ genero: 'Hombre' }).in('id', Array.from(selectedIds));
                                if (!error && onParticipantUpdated) onParticipantUpdated();
                                setIsMultiSelectMode(false);
                                setSelectedIds(new Set());
                            }}
                            style={{ flex: 1, padding: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Convertir a Hombres
                        </button>
                        <button 
                            onClick={() => {
                                setIsMultiSelectMode(false);
                                setSelectedIds(new Set());
                            }}
                            style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Cancelar
                        </button>
                    </div>
                )}

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
                            <h4 style={{ marginTop: 0, color: '#1e293b' }}>Confirmar Baja</h4>
                            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '20px' }}>
                                ¿Seguro que desea dar de baja por inactividad a <strong>{confirmDelete.nombre}</strong>?
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
                                    Dar de baja
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    return (
        <div className={`custom-select-container ${isOpen ? 'open' : ''}`} onKeyDown={handleKeyDown}>
            <button
                type="button"
                className="custom-select-trigger"
                onClick={() => setIsOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <span>{value || '-- Asignar --'}</span>
                <span>▼</span>
            </button>
            {isOpen && createPortal(modalContent, document.body)}
        </div>
    );
};

export default CustomSelect;
