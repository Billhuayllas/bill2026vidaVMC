import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';

interface PairAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (encargado: string, ayudante: string) => void;
    initialEncargado: string;
    initialAyudante: string;
    options: any[];
    historyProvider: any;
    title?: string;
    tableName?: string;
    onParticipantUpdated?: () => void;
}

const PairAssignmentModal: React.FC<PairAssignmentModalProps> = ({
    isOpen, onClose, onSave, initialEncargado, initialAyudante, options, historyProvider, title = "Asignar Participantes", tableName, onParticipantUpdated
}) => {
    const [encargado, setEncargado] = useState(initialEncargado);
    const [ayudante, setAyudante] = useState(initialAyudante);

    useEffect(() => {
        if (isOpen) {
            setEncargado(initialEncargado);
            setAyudante(initialAyudante);
        }
    }, [isOpen, initialEncargado, initialAyudante]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 10000,
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white', borderRadius: '12px', padding: '24px',
                width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                display: 'flex', flexDirection: 'column', gap: '20px'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Encargado:</label>
                        <CustomSelect 
                            options={options} 
                            value={encargado} 
                            onChange={setEncargado} 
                            historyProvider={historyProvider} 
                            tableName={tableName}
                            onParticipantUpdated={onParticipantUpdated}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Ayudante:</label>
                        <CustomSelect 
                            options={options} 
                            value={ayudante} 
                            onChange={setAyudante} 
                            historyProvider={historyProvider} 
                            tableName={tableName}
                            onParticipantUpdated={onParticipantUpdated}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button 
                        onClick={onClose}
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => {
                            onSave(encargado, ayudante);
                            onClose();
                        }}
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PairAssignmentModal;
