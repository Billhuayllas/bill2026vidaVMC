
import React, { useState } from 'react';
import MobileSectionGeneral from './MobileSectionGeneral';
import MobileSectionTesoros from './MobileSectionTesoros';
import MobileSectionMaestros from './MobileSectionMaestros';
import MobileSectionVida from './MobileSectionVida';
import { ParticipantLists, AssignmentHistory } from '../../lib/types';
import { LayoutDashboard, Gem, GraduationCap, Sparkles } from 'lucide-react';

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
                <button 
                    onClick={() => setActiveTab('general')} 
                    className={`flex items-center justify-center gap-1.5 ${activeTab === 'general' ? 'active' : ''}`}
                >
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    <span>General</span>
                </button>
                <button 
                    onClick={() => setActiveTab('tesoros')} 
                    className={`flex items-center justify-center gap-1.5 ${activeTab === 'tesoros' ? 'active' : ''}`}
                >
                    <Gem className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>Tesoros</span>
                </button>
                <button 
                    onClick={() => setActiveTab('maestros')} 
                    className={`flex items-center justify-center gap-1.5 ${activeTab === 'maestros' ? 'active' : ''}`}
                >
                    <GraduationCap className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Maestros</span>
                </button>
                <button 
                    onClick={() => setActiveTab('vida')} 
                    className={`flex items-center justify-center gap-1.5 ${activeTab === 'vida' ? 'active' : ''}`}
                >
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Vida</span>
                </button>
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
