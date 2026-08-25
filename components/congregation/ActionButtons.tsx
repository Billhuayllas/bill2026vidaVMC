
import React from 'react';

interface ActionButtonsProps {
    onSharePDF: () => void;
    onShowDirectory: () => void;
    onShowSummary: () => void;
    isSharing: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onSharePDF, onShowDirectory, onShowSummary, isSharing }) => (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button 
            onClick={onSharePDF} 
            disabled={isSharing} 
            style={{ 
                flex: '1 1 auto', 
                backgroundColor: 'white', 
                color: '#ef4444', 
                padding: '8px 16px', 
                borderRadius: '20px', 
                border: '1px solid #ef4444', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px', 
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
            }}
        >
            {isSharing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
            <span>{isSharing ? 'Generando...' : 'PDF A4'}</span>
        </button>
        <button 
            onClick={onShowSummary} 
            style={{ 
                flex: '1 1 auto', 
                backgroundColor: 'white', 
                color: '#10b981', 
                padding: '8px 16px', 
                borderRadius: '20px', 
                border: '1px solid #10b981', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px', 
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
            }}
        >
            <i className="fas fa-chart-pie"></i>
            <span>Resumen</span>
        </button>
        <button 
            onClick={onShowDirectory} 
            style={{ 
                flex: '1 1 auto', 
                backgroundColor: 'white', 
                color: '#3b82f6', 
                padding: '8px 16px', 
                borderRadius: '20px', 
                border: '1px solid #3b82f6', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px', 
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
            }}
        >
            <i className="fas fa-address-book"></i>
            <span>Directorio</span>
        </button>
    </div>
);

export default ActionButtons;
