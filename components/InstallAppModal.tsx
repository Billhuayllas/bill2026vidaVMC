import React, { useState, useEffect } from 'react';
import { 
    Download, 
    Smartphone, 
    Apple, 
    Share2, 
    Check, 
    Copy, 
    ExternalLink, 
    X, 
    Sparkles, 
    ArrowRight, 
    ShieldCheck, 
    Zap, 
    WifiOff, 
    ChevronRight,
    MessageCircle,
    Info
} from 'lucide-react';
import { PWAInstallState } from '../lib/usePWAInstall';
import { VMCLogo } from './VMCLogo';

interface InstallAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    pwaState: PWAInstallState;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose, pwaState }) => {
    const { isInstallable, isInstalled, isIOS, isAndroid, isSafari, isInAppBrowser, triggerInstall } = pwaState;

    // Default tab based on user's device
    const [selectedTab, setSelectedTab] = useState<'android' | 'ios' | 'share'>('android');
    const [copied, setCopied] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [installSuccess, setInstallSuccess] = useState(false);

    useEffect(() => {
        if (isIOS) {
            setSelectedTab('ios');
        } else {
            setSelectedTab('android');
        }
    }, [isIOS, isAndroid]);

    if (!isOpen) return null;

    const currentUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';

    const handleDirectInstall = async () => {
        setIsInstalling(true);
        try {
            const accepted = await triggerInstall();
            if (accepted) {
                setInstallSuccess(true);
            }
        } finally {
            setIsInstalling(false);
        }
    };

    const handleCopyLink = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(currentUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleShareWhatsApp = () => {
        const text = `*Congregación 15 de Julio - Aplicación Móvil*\n\nHermano(a), puedes instalar la app de la congregación en tu teléfono (Android o iPhone) siguiendo este enlace:\n${currentUrl}\n\n*Instrucciones de instalación:*\n📱 *Android:* Abre en Chrome, toca los tres puntos (⋮) y selecciona "Instalar aplicación".\n🍏 *iPhone:* Abre en Safari, toca "Compartir" (cuadro con flecha) y selecciona "Agregar al inicio".`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                {/* MODAL HEADER */}
                <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 text-white p-5 sm:p-6 flex items-start justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <VMCLogo size={52} rounded="2xl" showBorder={true} className="shrink-0 shadow-lg" />
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] sm:text-xs font-bold tracking-wider uppercase text-blue-100">
                                    App Web Progresiva
                                </span>
                                {isInstalled && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/80 text-[10px] sm:text-xs font-bold text-white flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Instalada
                                    </span>
                                )}
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-white mt-1 leading-tight">
                                Instalar en tu Celular
                            </h2>
                            <p className="text-xs text-blue-100/90 font-medium">
                                Descarga la app en Android y iPhone en segundos
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                        title="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* PLATFORM SELECTOR TABS */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1.5 gap-1.5 text-xs sm:text-sm font-bold">
                    <button
                        onClick={() => setSelectedTab('android')}
                        className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            selectedTab === 'android' 
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Smartphone className="w-4 h-4 text-emerald-500" />
                        <span>Android</span>
                        {isAndroid && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        )}
                    </button>

                    <button
                        onClick={() => setSelectedTab('ios')}
                        className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            selectedTab === 'ios' 
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Apple className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                        <span>iPhone / iOS</span>
                        {isIOS && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        )}
                    </button>

                    <button
                        onClick={() => setSelectedTab('share')}
                        className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            selectedTab === 'share' 
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Share2 className="w-4 h-4 text-indigo-500" />
                        <span>Compartir</span>
                    </button>
                </div>

                {/* MODAL BODY (SCROLLABLE) */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-700 dark:text-slate-300 text-sm">
                    
                    {/* ALREADY INSTALLED BANNER */}
                    {isInstalled && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                <Check className="w-5 h-5" />
                            </div>
                            <div className="text-xs">
                                <div className="font-bold text-emerald-800 dark:text-emerald-300">
                                    ¡Aplicación ya instalada!
                                </div>
                                <div className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                                    Ya estás usando la versión independiente en tu dispositivo.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- ANDROID TAB CONTENT --- */}
                    {selectedTab === 'android' && (
                        <div className="space-y-4">
                            {/* Direct Prompt Button if supported by Chrome */}
                            {isInstallable && (
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-2 border-blue-500/30 text-center space-y-3">
                                    <div className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center justify-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                        <span>Instalación Automática Detectada</span>
                                    </div>
                                    <button
                                        onClick={handleDirectInstall}
                                        disabled={isInstalling || installSuccess}
                                        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 text-white font-black text-sm sm:text-base shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                                    >
                                        <Download className="w-5 h-5 animate-bounce" />
                                        <span>{isInstalling ? 'Instalando...' : installSuccess ? '¡Instalado con éxito!' : 'Instalar en Android Ahora (1 Toque)'}</span>
                                    </button>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        Se creará un acceso directo directo en tu pantalla con icono oficial.
                                    </p>
                                </div>
                            )}

                            {/* In-App Browser Warning (WhatsApp / Facebook) */}
                            {isInAppBrowser && (
                                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                    <div>
                                        <strong>Estás navegando dentro de WhatsApp o redes sociales.</strong>
                                        <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                                            Para instalar la app, toca los 3 puntos arriba a la derecha y selecciona <strong>"Abrir en Chrome"</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step-by-Step Instructions */}
                            <div className="space-y-3">
                                <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <span>Pasos para instalar en Google Chrome o Samsung Internet:</span>
                                </h3>

                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            1
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-bold text-slate-800 dark:text-white">Abre el menú de Chrome:</span>
                                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                                Toca los tres puntos verticales <strong className="font-mono font-bold text-slate-900 dark:text-white px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">⋮</strong> en la esquina superior derecha del navegador.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            2
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-bold text-slate-800 dark:text-white">Selecciona "Instalar aplicación":</span>
                                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                                En el menú desplegable, toca en <strong className="text-blue-600 dark:text-blue-400">"Instalar aplicación"</strong> o <strong className="text-blue-600 dark:text-blue-400">"Agregar a la pantalla principal"</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            3
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-bold text-slate-800 dark:text-white">Confirma la instalación:</span>
                                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                                Toca <strong>"Instalar"</strong> en el mensaje emergente. ¡Listo! La app aparecerá en tu menú de aplicaciones y en tu pantalla de inicio como una aplicación nativa.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- IOS TAB CONTENT --- */}
                    {selectedTab === 'ios' && (
                        <div className="space-y-4">
                            {/* Safari Requirement Notice */}
                            {!isSafari && isIOS && (
                                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                    <div>
                                        <strong>Debes usar el navegador Safari en iPhone/iPad.</strong>
                                        <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                                            Apple solo permite instalar aplicaciones web desde su navegador oficial <strong>Safari</strong>.
                                        </p>
                                        <button
                                            onClick={handleCopyLink}
                                            className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <Copy className="w-3 h-3" />
                                            <span>{copied ? '¡Enlace copiado! Pégalo en Safari' : 'Copiar enlace para abrir en Safari'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step-by-Step Instructions for iOS */}
                            <div className="space-y-3">
                                <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                                    Pasos para instalar en iPhone y iPad (Safari):
                                </h3>

                                <div className="space-y-2.5">
                                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                                        <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            1
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-bold text-slate-800 dark:text-white">Toca el botón Compartir en Safari:</span>
                                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                                En la barra de navegación inferior de Safari, toca el botón <strong>Compartir</strong> (el ícono de un cuadrado con una flecha hacia arriba <span className="inline-block px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px] font-bold">⎋</span>).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                                        <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            2
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-bold text-slate-800 dark:text-white">Selecciona "Agregar al inicio":</span>
                                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                                Desliza el menú hacia abajo y busca la opción <strong className="text-blue-600 dark:text-blue-400">"Agregar al inicio"</strong> (o <em>"Añadir a pantalla de inicio"</em> con el símbolo <span className="inline-block px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs">➕</span>).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                                        <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            3
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-bold text-slate-800 dark:text-white">Confirma tocando "Agregar":</span>
                                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                                En la esquina superior derecha, toca <strong>"Agregar"</strong>. ¡Listo! El icono de la Congregación se colocará en tu pantalla como cualquier app de la App Store.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- SHARE TAB CONTENT --- */}
                    {selectedTab === 'share' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
                                <div className="text-xs font-bold text-slate-800 dark:text-white">
                                    Enlace directo de la aplicación:
                                </div>
                                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300 break-all select-all">
                                    <span className="flex-1 truncate">{currentUrl}</span>
                                    <button
                                        onClick={handleCopyLink}
                                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 transition-all cursor-pointer"
                                        title="Copiar Enlace"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                    <button
                                        onClick={handleCopyLink}
                                        className="py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                        <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
                                    </button>

                                    <button
                                        onClick={handleShareWhatsApp}
                                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        <span>Enviar por WhatsApp</span>
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Al compartir por WhatsApp, el mensaje incluye automáticamente el enlace directo y los pasos de instalación para Android y iPhone.
                            </p>
                        </div>
                    )}

                    {/* VENTAJAS DE LA APP WEB */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400">
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <Zap className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                                <span className="font-bold block text-slate-800 dark:text-white">Rápida y Ligera</span>
                                <span>No ocupa memoria</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <ShieldCheck className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                                <span className="font-bold block text-slate-800 dark:text-white">100% Segura</span>
                                <span>Sin descargas APK</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <Sparkles className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                                <span className="font-bold block text-slate-800 dark:text-white">Auto-Actualizable</span>
                                <span>Siempre al día</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* MODAL FOOTER */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <button
                        onClick={handleShareWhatsApp}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Compartir con hermanos</span>
                        <span className="sm:hidden">WhatsApp</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {!isInstalled && (
                            <button
                                onClick={() => {
                                    pwaState.markAsInstalled();
                                    onClose();
                                }}
                                className="py-2 px-3 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="No volver a mostrar este aviso en este celular"
                            >
                                Ya la tengo instalada
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="py-2 px-5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallAppModal;
