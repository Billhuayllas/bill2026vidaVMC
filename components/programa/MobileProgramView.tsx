
import React, { useState } from 'react';
import MobileSectionGeneral from './MobileSectionGeneral';
import MobileSectionTesoros from './MobileSectionTesoros';
import MobileSectionMaestros from './MobileSectionMaestros';
import MobileSectionVida from './MobileSectionVida';
import { ParticipantLists, AssignmentHistory } from '../../lib/types';

interface MobileViewProps {
    programData: any;
    handleDataChange: (weekId: string, path: string, value: string | boolean) => void;
    lists: ParticipantLists;
    history: AssignmentHistory;
    selectedWeek: string;
    isReadOnly: boolean;
}

const MobileProgramView: React.FC<MobileViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState('general');

    if (!props.programData) return null;

    const renderContent = () => {
        switch (activeTab) {
            case 'general': return <MobileSectionGeneral {...props} />;
            case 'tesoros': return <MobileSectionTesoros {...props} />;
            case 'maestros': return <MobileSectionMaestros {...props} />;
            case 'vida': return <MobileSectionVida {...props} />;
            default: return null;
        }
    };

    return (
        <div className="programa-mobile-view">
             <nav className="mobile-tabs-nav">
                <button onClick={() => setActiveTab('general')} className={activeTab === 'general' ? 'active' : ''}>General</button>
                <button onClick={() => setActiveTab('tesoros')} className={activeTab === 'tesoros' ? 'active' : ''}>Tesoros</button>
                <button onClick={() => setActiveTab('maestros')} className={activeTab === 'maestros' ? 'active' : ''}>Maestros</button>
                <button onClick={() => setActiveTab('vida')} className={activeTab === 'vida' ? 'active' : ''}>Vida</button>
            </nav>
            
            <div className="mobile-tab-content-wrapper" style={{ paddingBottom: '20px', minHeight: '300px' }}>
                <style>{`
                    .mobile-tab-content-wrapper {
                        animation: fadeIn 0.3s ease-out;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(5px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
                {renderContent()}
            </div>
        </div>
    );
};

export default MobileProgramView;
