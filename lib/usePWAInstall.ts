import { useState, useEffect, useCallback } from 'react';

export interface PWAInstallState {
    isInstallable: boolean;
    isInstalled: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isStandalone: boolean;
    isSafari: boolean;
    isInAppBrowser: boolean;
    triggerInstall: () => Promise<boolean>;
    markAsInstalled: () => void;
}

function checkIsRunningStandalone(): boolean {
    if (typeof window === 'undefined') return false;

    // 1. iOS Safari standalone mode (Add to Home Screen)
    if ((window.navigator as any).standalone === true) {
        return true;
    }

    // 2. CSS Media queries for standalone / fullscreen / minimal-ui
    if (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches
    ) {
        return true;
    }

    // 3. Query string from PWA manifest start_url (?source=pwa or ?mode=standalone)
    if (
        window.location.search.includes('source=pwa') || 
        window.location.search.includes('mode=standalone')
    ) {
        return true;
    }

    // 4. Android WebAPK launch referrer
    if (typeof document !== 'undefined' && document.referrer && document.referrer.startsWith('android-app://')) {
        return true;
    }

    return false;
}

function checkInitialInstalled(): boolean {
    if (typeof window === 'undefined') return false;

    // A. Check if running inside installed standalone app right now
    if (checkIsRunningStandalone()) {
        try {
            localStorage.setItem('pwa_installed', 'true');
        } catch (_) {}
        return true;
    }

    // B. Check if previously installed and saved in local storage on this phone
    try {
        if (localStorage.getItem('pwa_installed') === 'true') {
            return true;
        }
    } catch (_) {}

    return false;
}

export function usePWAInstall(): PWAInstallState {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState<boolean>(checkInitialInstalled);

    // Device detection
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [isStandalone, setIsStandalone] = useState<boolean>(checkIsRunningStandalone);
    const [isSafari, setIsSafari] = useState(false);
    const [isInAppBrowser, setIsInAppBrowser] = useState(false);

    const markAsInstalled = useCallback(() => {
        setIsInstalled(true);
        setIsInstallable(false);
        try {
            localStorage.setItem('pwa_installed', 'true');
        } catch (_) {}
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const ua = window.navigator.userAgent || '';
        const ios = /iPad|iPhone|iPod/.test(ua) || (window.navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
        const android = /Android/i.test(ua);
        const safari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|OPiOS|mercury/i.test(ua);
        const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line|Twitter/i.test(ua);
        const standalone = checkIsRunningStandalone();

        setIsIOS(ios);
        setIsAndroid(android);
        setIsSafari(safari);
        setIsInAppBrowser(inApp);
        setIsStandalone(standalone);

        if (standalone) {
            setIsInstalled(true);
            try {
                localStorage.setItem('pwa_installed', 'true');
            } catch (_) {}
        }

        // Check navigator.getInstalledRelatedApps (Chrome 80+ on Android)
        if ('getInstalledRelatedApps' in window.navigator) {
            (window.navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
                if (Array.isArray(relatedApps) && relatedApps.length > 0) {
                    setIsInstalled(true);
                    setIsInstallable(false);
                    try {
                        localStorage.setItem('pwa_installed', 'true');
                    } catch (_) {}
                }
            }).catch(() => {});
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            // If already installed, don't show prompt
            if (checkInitialInstalled()) {
                return;
            }
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
            try {
                localStorage.setItem('pwa_installed', 'true');
            } catch (_) {}
            console.log('PWA ha sido instalada exitosamente en el dispositivo');
        };

        // Listen for display mode media query changes
        const mqlStandalone = window.matchMedia('(display-mode: standalone)');
        const handleDisplayModeChange = (e: MediaQueryListEvent) => {
            if (e.matches) {
                setIsStandalone(true);
                setIsInstalled(true);
                try {
                    localStorage.setItem('pwa_installed', 'true');
                } catch (_) {}
            }
        };

        if (mqlStandalone.addEventListener) {
            mqlStandalone.addEventListener('change', handleDisplayModeChange);
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            if (mqlStandalone.removeEventListener) {
                mqlStandalone.removeEventListener('change', handleDisplayModeChange);
            }
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const triggerInstall = useCallback(async (): Promise<boolean> => {
        if (!deferredPrompt) {
            return false;
        }

        try {
            deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            if (choiceResult.outcome === 'accepted') {
                markAsInstalled();
                setDeferredPrompt(null);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al solicitar instalación PWA:', error);
            return false;
        }
    }, [deferredPrompt, markAsInstalled]);

    return {
        isInstallable,
        isInstalled,
        isIOS,
        isAndroid,
        isStandalone,
        isSafari,
        isInAppBrowser,
        triggerInstall,
        markAsInstalled
    };
}

