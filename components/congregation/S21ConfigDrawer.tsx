import React from 'react';
import { 
    X, 
    RotateCcw, 
    Sliders, 
    Type, 
    Maximize, 
    Minimize, 
    Layers, 
    Check, 
    Sparkles,
    MoveVertical,
    MoveHorizontal,
    Plus,
    Minus,
    Grid,
    CheckSquare
} from 'lucide-react';
import { S21Config } from './s21CardGenerator';

interface S21ConfigDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    config: S21Config;
    isTwoInOne: boolean;
    onChangeConfig: (newConfig: S21Config) => void;
    onResetDefaults: () => void;
}

export const S21ConfigDrawer: React.FC<S21ConfigDrawerProps> = ({
    isOpen,
    onClose,
    config,
    isTwoInOne,
    onChangeConfig,
    onResetDefaults
}) => {
    if (!isOpen) return null;

    const updateField = (key: keyof S21Config, val: number) => {
        const updated = {
            ...config,
            [key]: val
        };
        onChangeConfig(updated);
    };

    // Quick bulk adjustments
    const adjustAllFontSizes = (delta: number) => {
        const updated: S21Config = {
            ...config,
            titleFontSize: Math.max(7, Math.round((config.titleFontSize + delta) * 10) / 10),
            headerFontSize: Math.max(5.5, Math.round((config.headerFontSize + delta) * 10) / 10),
            privFontSize: Math.max(5, Math.round((config.privFontSize + delta) * 10) / 10),
            tableFontSize: Math.max(4.5, Math.round((config.tableFontSize + delta) * 10) / 10),
            noteFontSize: Math.max(4.5, Math.round((config.noteFontSize + delta) * 10) / 10),
        };
        onChangeConfig(updated);
    };

    const adjustRowHeights = (delta: number) => {
        const updated: S21Config = {
            ...config,
            rowHeight: Math.max(9, Math.round((config.rowHeight + delta) * 10) / 10),
            footerHeight: Math.max(9, Math.round((config.footerHeight + delta) * 10) / 10),
            thHeadHeight: Math.max(15, Math.round((config.thHeadHeight + (delta * 1.5)) * 10) / 10),
        };
        onChangeConfig(updated);
    };

    const adjustScale = (delta: number) => {
        const updated: S21Config = {
            ...config,
            tableScale: Math.max(75, Math.min(125, config.tableScale + delta))
        };
        onChangeConfig(updated);
    };

    return (
        <div 
            className="fixed inset-0 z-[100000] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border-l border-slate-750 w-full max-w-md h-full flex flex-col text-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 sm:px-5 py-3.5 bg-slate-850 border-b border-slate-750 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                            <Sliders className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-2">
                                <span>Parámetros de Diseño S-21</span>
                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold rounded-md uppercase">
                                    {isTwoInOne ? '2 en 1' : '1 en 1'}
                                </span>
                            </h3>
                            <p className="text-[11px] text-slate-400 truncate">
                                Ajuste manual de alturas, texto y márgenes
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700 shrink-0"
                        title="Cerrar ajustes"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Quick Action Buttons */}
                <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
                    <div className="flex items-center gap-1.5 w-full">
                        <button
                            type="button"
                            onClick={() => adjustAllFontSizes(0.4)}
                            className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-blue-600/30 active:bg-blue-600/50 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                            title="Agrandar todas las letras un paso"
                        >
                            <Type className="w-3.5 h-3.5" />
                            <Plus className="w-3 h-3" />
                            <span>Letra +</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => adjustAllFontSizes(-0.4)}
                            className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-blue-600/30 active:bg-blue-600/50 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                            title="Achicar todas las letras un paso"
                        >
                            <Type className="w-3.5 h-3.5" />
                            <Minus className="w-3 h-3" />
                            <span>Letra -</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => adjustRowHeights(1)}
                            className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-amber-600/30 active:bg-amber-600/50 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                            title="Aumentar altura de filas"
                        >
                            <Grid className="w-3.5 h-3.5" />
                            <Plus className="w-3 h-3" />
                            <span>Filas +</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => adjustRowHeights(-1)}
                            className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-amber-600/30 active:bg-amber-600/50 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                            title="Reducir altura de filas"
                        >
                            <Grid className="w-3.5 h-3.5" />
                            <Minus className="w-3 h-3" />
                            <span>Filas -</span>
                        </button>
                    </div>
                </div>

                {/* Main Scrollable Settings Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 custom-scrollbar">

                    {/* Section 1: Cuadrícula y Recuadros (Alto / Bajo / Ancho) */}
                    <div className="space-y-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                            <Grid className="w-3.5 h-3.5" />
                            <span>Alto y Bajo de Recuadros (Cuadrícula)</span>
                        </div>

                        {/* Control: Altura de filas mensuales */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Altura de filas mensuales:</span>
                                <span className="font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.rowHeight} px
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('rowHeight', Math.max(9, Math.round((config.rowHeight - 0.5) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="9"
                                    max="26"
                                    step="0.5"
                                    value={config.rowHeight}
                                    onChange={e => updateField('rowHeight', parseFloat(e.target.value))}
                                    className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('rowHeight', Math.min(28, Math.round((config.rowHeight + 0.5) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Control: Altura de cabecera de la tabla */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Altura de cabecera de tabla:</span>
                                <span className="font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.thHeadHeight} px
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('thHeadHeight', Math.max(15, config.thHeadHeight - 1))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="15"
                                    max="45"
                                    step="1"
                                    value={config.thHeadHeight}
                                    onChange={e => updateField('thHeadHeight', parseInt(e.target.value, 10))}
                                    className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('thHeadHeight', Math.min(50, config.thHeadHeight + 1))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Control: Altura fila Total */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Altura fila de Total:</span>
                                <span className="font-mono font-bold text-amber-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.footerHeight} px
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('footerHeight', Math.max(9, config.footerHeight - 1))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="9"
                                    max="30"
                                    step="1"
                                    value={config.footerHeight}
                                    onChange={e => updateField('footerHeight', parseInt(e.target.value, 10))}
                                    className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('footerHeight', Math.min(35, config.footerHeight + 1))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Control: Escala general del cuadro */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Escala de recuadros (zoom interior):</span>
                                <span className="font-mono font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.tableScale}%
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => adjustScale(-2)}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="75"
                                    max="125"
                                    step="1"
                                    value={config.tableScale}
                                    onChange={e => updateField('tableScale', parseInt(e.target.value, 10))}
                                    className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => adjustScale(2)}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Tamaño de Letra (Agrandar / Achicar) */}
                    <div className="space-y-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                            <Type className="w-3.5 h-3.5" />
                            <span>Tamaño de Letra (Tipografía)</span>
                        </div>

                        {/* Control: Letra del Título */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Título principal:</span>
                                <span className="font-mono font-bold text-blue-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.titleFontSize} pt
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('titleFontSize', Math.max(7, Math.round((config.titleFontSize - 0.5) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="7"
                                    max="18"
                                    step="0.5"
                                    value={config.titleFontSize}
                                    onChange={e => updateField('titleFontSize', parseFloat(e.target.value))}
                                    className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('titleFontSize', Math.min(22, Math.round((config.titleFontSize + 0.5) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Control: Letra de Nombre y Fechas */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Datos (Nombre, Fechas, Género):</span>
                                <span className="font-mono font-bold text-blue-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.headerFontSize} pt
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('headerFontSize', Math.max(6, Math.round((config.headerFontSize - 0.5) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="6"
                                    max="14"
                                    step="0.5"
                                    value={config.headerFontSize}
                                    onChange={e => updateField('headerFontSize', parseFloat(e.target.value))}
                                    className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('headerFontSize', Math.min(16, Math.round((config.headerFontSize + 0.5) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Control: Letra de Privilegios */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Privilegios y Cargos:</span>
                                <span className="font-mono font-bold text-blue-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.privFontSize} pt
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('privFontSize', Math.max(5.5, Math.round((config.privFontSize - 0.5) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="5.5"
                                    max="13"
                                    step="0.5"
                                    value={config.privFontSize}
                                    onChange={e => updateField('privFontSize', parseFloat(e.target.value))}
                                    className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('privFontSize', Math.min(14, Math.round((config.privFontSize + 0.5) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Control: Letra de Tabla y Meses */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Tabla de meses y números:</span>
                                <span className="font-mono font-bold text-blue-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.tableFontSize} pt
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('tableFontSize', Math.max(4.5, Math.round((config.tableFontSize - 0.3) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="4.5"
                                    max="12"
                                    step="0.2"
                                    value={config.tableFontSize}
                                    onChange={e => updateField('tableFontSize', parseFloat(e.target.value))}
                                    className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('tableFontSize', Math.min(14, Math.round((config.tableFontSize + 0.3) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Control: Letra de Notas */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Columna de Notas:</span>
                                <span className="font-mono font-bold text-blue-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.noteFontSize} pt
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('noteFontSize', Math.max(4.5, Math.round((config.noteFontSize - 0.3) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="4.5"
                                    max="12"
                                    step="0.2"
                                    value={config.noteFontSize}
                                    onChange={e => updateField('noteFontSize', parseFloat(e.target.value))}
                                    className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('noteFontSize', Math.min(14, Math.round((config.noteFontSize + 0.3) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Márgenes y Dimensiones (Arriba, Abajo y Ancho) */}
                    <div className="space-y-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            <Maximize className="w-3.5 h-3.5" />
                            <span>Márgenes y Ancho de la Hoja</span>
                        </div>

                        {/* Control: Margen Superior / Inferior (Alto y Bajo de página) */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Margen vertical (arriba y abajo):</span>
                                <span className="font-mono font-bold text-emerald-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.cardPaddingY} px
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('cardPaddingY', Math.max(4, config.cardPaddingY - 1))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="4"
                                    max="36"
                                    step="1"
                                    value={config.cardPaddingY}
                                    onChange={e => updateField('cardPaddingY', parseInt(e.target.value, 10))}
                                    className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('cardPaddingY', Math.min(45, config.cardPaddingY + 1))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Control: Margen Lateral (Ancho de la hoja) */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Margen lateral (ancho de tarjeta):</span>
                                <span className="font-mono font-bold text-emerald-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.cardPaddingX} px
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('cardPaddingX', Math.max(10, config.cardPaddingX - 1))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="10"
                                    max="50"
                                    step="1"
                                    value={config.cardPaddingX}
                                    onChange={e => updateField('cardPaddingX', parseInt(e.target.value, 10))}
                                    className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('cardPaddingX', Math.min(60, config.cardPaddingX + 1))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Control: Tamaño de casillas [✓] */}
                        <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-200">Tamaño de casillas [ ✓ ]:</span>
                                <span className="font-mono font-bold text-emerald-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                                    {config.tableCheckSize} px
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => updateField('tableCheckSize', Math.max(5, Math.round((config.tableCheckSize - 0.5) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    -
                                </button>
                                <input
                                    type="range"
                                    min="5"
                                    max="14"
                                    step="0.5"
                                    value={config.tableCheckSize}
                                    onChange={e => updateField('tableCheckSize', parseFloat(e.target.value))}
                                    className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-750 rounded-lg appearance-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateField('tableCheckSize', Math.min(16, Math.round((config.tableCheckSize + 0.5) * 10) / 10))}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-xs border border-slate-700 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Auto-save notification note */}
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Los cambios se guardan automáticamente y se aplicarán a todas las descargas PDF e impresiones.</span>
                    </div>

                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-850 border-t border-slate-750 flex items-center justify-between gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={onResetDefaults}
                        className="px-3 py-2 bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Restablecer valores predeterminados"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restablecer</span>
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Check className="w-4 h-4" />
                        <span>Listo / Guardar</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
