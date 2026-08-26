
import React from 'react';
import { FileText, PieChart, Contact, Loader2 } from 'lucide-react';

interface ActionButtonsProps {
    onSharePDF: () => void;
    onShowDirectory: () => void;
    onShowSummary: () => void;
    isSharing: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onSharePDF, onShowDirectory, onShowSummary, isSharing }) => (
    <div className="flex gap-2.5 justify-center flex-wrap">
        <button 
            onClick={onSharePDF} 
            disabled={isSharing} 
            className="flex-1 min-w-[130px] bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-xs shadow-sm hover:shadow transition-all duration-200 active:scale-95 disabled:opacity-50"
        >
            {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>{isSharing ? 'Generando...' : 'Reporte PDF (A4)'}</span>
        </button>
        <button 
            onClick={onShowSummary} 
            className="flex-1 min-w-[130px] bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-xs shadow-sm hover:shadow transition-all duration-200 active:scale-95"
        >
            <PieChart className="w-4 h-4" />
            <span>Resumen del Grupo</span>
        </button>
        <button 
            onClick={onShowDirectory} 
            className="flex-1 min-w-[130px] bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-xs shadow-sm hover:shadow transition-all duration-200 active:scale-95"
        >
            <Contact className="w-4 h-4" />
            <span>Directorio Telefónico</span>
        </button>
    </div>
);

export default ActionButtons;

