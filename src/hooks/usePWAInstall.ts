import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed & running full-screen)
    const checkIsStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      return isStandaloneMedia || isNavigatorStandalone;
    };

    setIsInstalled(checkIsStandalone());

    // Detect device operating system
    const userAgent = (window.navigator.userAgent || '').toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.maxTouchPoints > 1 && /macintosh/.test(userAgent));
    const isAndroidDevice = /android/.test(userAgent);
    const isMobileDevice = isIOSDevice || isAndroidDevice || /mobi|tablet|phone/.test(userAgent) || window.innerWidth < 768;

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsMobile(isMobileDevice);

    // Pick up prompt if captured early before React mount
    if ((window as any).__edutrack_pwa_prompt) {
      setDeferredPrompt((window as any).__edutrack_pwa_prompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      (window as any).__edutrack_pwa_prompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleEarlyCaptured = () => {
      if ((window as any).__edutrack_pwa_prompt) {
        setDeferredPrompt((window as any).__edutrack_pwa_prompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__edutrack_pwa_prompt = null;
      try {
        localStorage.setItem('edutrack_pwa_installed', 'true');
        localStorage.setItem('edutrack_pwa_dont_show_again', 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('edutrack:pwa-prompt-captured', handleEarlyCaptured);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('edutrack:pwa-prompt-captured', handleEarlyCaptured);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem('edutrack_pwa_installed', 'true');
          localStorage.setItem('edutrack_pwa_dont_show_again', 'true');
        } catch {}
        return true;
      }
      return false;
    } catch (err) {
      console.warn('PWA prompt error:', err);
      return false;
    }
  }, [deferredPrompt]);

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isMobile,
    isIframe,
    install,
    deferredPrompt,
  };
}
