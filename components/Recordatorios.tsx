
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCongregation } from '../lib/CongregationContext';

type Reminder = {
    id: string;
    event_date: string;
    title: string;
    description: string;
    target_group: string | null; // Null means "Everyone", otherwise string label
    created_at: string;
};

type AccessGroup = {
    label: string;
};

interface RecordatoriosProps {
    isReadOnly?: boolean;
}

const Recordatorios: React.FC<RecordatoriosProps> = ({ isReadOnly = false }) => {
    const { currentCongregation } = useCongregation();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [accessGroups, setAccessGroups] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSqlHelp, setShowSqlHelp] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Form State
    const [date, setDate] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetGroup, setTargetGroup] = useState<string>('all'); // 'all' or specific label

    useEffect(() => {
        fetchData();
    }, [currentCongregation]);

    const fetchData = async () => {
        if (!currentCongregation) return;
        setLoading(true);
        
        // Fetch Reminders
        const { data: reminderData, error: reminderError } = await supabase
            .from('reminders')
            .select('*')
            .eq('congregation_id', currentCongregation.id)
            .order('event_date', { ascending: true });

        if (reminderError) {
            console.error(reminderError);
            if (reminderError.code === '42P01' || reminderError.message.includes('congregation_id')) setShowSqlHelp(true);
        } else {
            setReminders(reminderData || []);
        }

        // Fetch Groups (from access_configs labels) to populate the dropdown
        // Only fetch configs for this congregation
        const { data: groupData } = await supabase
            .from('access_configs')
            .select('label')
            .eq('congregation_id', currentCongregation.id)
            .order('label');
        
        if (groupData) {
            // Unique labels
            const labels = Array.from(new Set(groupData.map((g: any) => g.label))) as string[];
            setAccessGroups(labels);
        }

        setLoading(false);
    };

    const handleCreate = async () => {
        if (!currentCongregation) return;
        if (!date || !title) {
            setStatusMessage({ text: 'La fecha y el título son obligatorios.', type: 'error' });
            return;
        }

        const newReminder = {
            event_date: date,
            title: title.trim(),
            description: description.trim(),
            target_group: targetGroup === 'all' ? null : targetGroup,
            congregation_id: currentCongregation.id
        };

        const { error } = await supabase.from('reminders').insert([newReminder]);

        if (error) {
            setStatusMessage({ text: `Error: ${error.message}`, type: 'error' });
        } else {
            setStatusMessage({ text: 'Recordatorio creado.', type: 'success' });
            setTitle('');
            setDescription('');
            // Keep date or clear? Let's clear.
            setDate('');
            fetchData();
        }
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Eliminar este recordatorio?')) return;
        const { error } = await supabase.from('reminders').delete().eq('id', id);
        if (!error) fetchData();
    };

    if (isReadOnly) {
        return <div className="container mx-auto px-4 py-8 text-center">No tiene permisos para gestionar recordatorios.</div>;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="page-title"><i className="fas fa-bell mr-2"></i>Gestión de Recordatorios</h1>

            {showSqlHelp && (
                <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#c2410c' }}>Configuración DB Requerida</h3>
                    <p style={{ fontSize: '0.9rem', color: '#9a3412', marginBottom: '10px' }}>
                        Falta la columna congregation_id en la tabla reminders.
                    </p>
                    <pre style={{ backgroundColor: '#1e293b', color: '#e2e8f0', padding: '12px', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem' }}>
{`alter table reminders add column if not exists congregation_id bigint default 1;`}
                    </pre>
                </div>
            )}

            {/* Create Form */}
            <div style={{ backgroundColor: 'var(--card-bg-color)', padding: '24px', borderRadius: '12px', boxShadow: 'var(--shadow)', marginBottom: '30px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--primary-color)' }}>Nuevo Recordatorio</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: 'var(--text-color-light)' }}>Fecha</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                        />
                    </div>
                    <div style={{ flex: 2 }}>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: 'var(--text-color-light)' }}>Título (Ej: Limpieza)</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            placeholder="Título del evento"
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: 'var(--text-color-light)' }}>Asignado a:</label>
                        <select 
                            value={targetGroup} 
                            onChange={e => setTargetGroup(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                        >
                            <option value="all">-- Toda la Congregación --</option>
                            {accessGroups.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: 'var(--text-color-light)' }}>Descripción (Opcional)</label>
                    <input 
                        type="text" 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        placeholder="Detalles adicionales..."
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                    />
                </div>

                <button 
                    onClick={handleCreate} 
                    style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <i className="fas fa-plus"></i> Guardar Recordatorio
                </button>
            </div>

            {/* List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {loading ? <p>Cargando...</p> : reminders.map(r => {
                    const eventDate = new Date(r.event_date);
                    const isPast = eventDate < new Date(new Date().setHours(0,0,0,0));
                    
                    return (
                        <div key={r.id} style={{ 
                            backgroundColor: 'var(--card-bg-color)', 
                            borderRadius: '12px', 
                            padding: '20px', 
                            boxShadow: 'var(--shadow)', 
                            border: '1px solid var(--border-color)', 
                            opacity: isPast ? 0.7 : 1,
                            position: 'relative'
                        }}>
                            <button 
                                onClick={() => handleDelete(r.id)}
                                style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--destructive-color)', cursor: 'pointer' }}
                            >
                                <i className="fas fa-trash"></i>
                            </button>

                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: isPast ? 'var(--text-color-light)' : 'var(--primary-color)', textTransform: 'uppercase', marginBottom: '5px' }}>
                                {eventDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                            
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-color)' }}>{r.title}</h3>
                            
                            {r.description && <p style={{ margin: '0 0 15px 0', color: 'var(--text-color-light)', fontSize: '0.95rem' }}>{r.description}</p>}
                            
                            <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', backgroundColor: 'var(--light-gray)', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-color-light)' }}>
                                <i className="fas fa-users mr-2"></i>
                                {r.target_group ? r.target_group : 'Todos'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {statusMessage && (
                <div style={{ 
                    position: 'fixed', bottom: '20px', right: '20px', left: '20px', margin: 'auto', maxWidth: '400px',
                    backgroundColor: statusMessage.type === 'success' ? '#10b981' : '#ef4444', 
                    color: 'white', padding: '16px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', 
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 2000, animation: 'slideUp 0.3s'
                }}>
                    {statusMessage.text}
                </div>
            )}
        </div>
    );
};

export default Recordatorios;
