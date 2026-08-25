
import React from 'react';
import { Publisher } from './types';
import { getAvatarColor } from './utils';

interface AddMemberInputProps {
    searchTerm: string;
    onSearchChange: (v: string) => void;
    showSuggestions: boolean;
    filteredSuggestions: Publisher[];
    onAdd: (name: string) => void;
    setShowSuggestions: (v: boolean) => void;
    filteredMembersCount: number;
}

const AddMemberInput: React.FC<AddMemberInputProps> = ({ searchTerm, onSearchChange, showSuggestions, filteredSuggestions, onAdd, setShowSuggestions, filteredMembersCount }) => {
    // Only show suggestions when there is text, suggestions exist, and we've reached 0 filtered members (or user wants to add anyway, but strictly the rule is "si no encuentra recien salga")
    const shouldShowSuggestions = showSuggestions && searchTerm && filteredSuggestions.length > 0 && filteredMembersCount === 0;

    return (
        <div style={{ backgroundColor: 'var(--card-bg-color)', padding: '5px', borderRadius: '12px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '10px', color: 'var(--text-color-light)' }}><i className="fas fa-search"></i></div>
            <div style={{ flex: 1, position: 'relative' }}>
                <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => { onSearchChange(e.target.value); setShowSuggestions(true); }} 
                    placeholder="Buscar en el grupo..." 
                    style={{ width: '100%', padding: '10px 0', backgroundColor: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none', fontWeight: '500', fontSize: '1rem' }} 
                />
                {shouldShowSuggestions && (
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                        backgroundColor: 'var(--card-bg-color)', border: '1px solid var(--border-color)',
                        borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 100,
                        overflow: 'hidden', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: '12px 16px', backgroundColor: 'var(--light-gray)', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-color-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Agregar a grupo
                        </div>
                        {filteredSuggestions.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => { onAdd(p.nombre); setShowSuggestions(false); }} 
                                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background-color 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{ backgroundColor: getAvatarColor(p.nombre), width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>
                                    {p.nombre.charAt(0)}
                                </div>
                                <span style={{ fontWeight: '600', color: 'var(--text-color)', flex: 1 }}>{p.nombre}</span>
                                <span style={{ fontSize: '0.75rem', color: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' }}>
                                    <i className="fas fa-plus"></i> Añadir
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddMemberInput;
