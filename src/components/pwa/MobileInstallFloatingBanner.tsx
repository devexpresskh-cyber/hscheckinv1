import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { PWAInstallModal } from './PWAInstallModal.tsx';
import { Download, Smartphone, X, Sparkles } from 'lucide-react';

export const MobileInstallFloatingBanner: React.FC = () => {
  const { isInstalled, isInstallable, install, isMobile } = usePWAInstall();
  const { isKhmer } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('edutrack_pwa_floating_banner_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  // If already installed (standalone mode or recorded) or clicked don't show again, don't show
  const isPermanentlyOptedOut =
    typeof window !== 'undefined' &&
    (localStorage.getItem('edutrack_pwa_installed') === 'true' ||
      localStorage.getItem('edutrack_pwa_dont_show_again') === 'true' ||
      localStorage.getItem('edutrack_pwa_first_access_prompt_dismissed') === 'true');

  if (isInstalled || isPermanentlyOptedOut || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('edutrack_pwa_floating_banner_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-3 shadow-2xl border border-indigo-500/40 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-white truncate">
                  {isKhmer ? 'ដំឡើង EduTrack App' : 'Install EduTrack App'}
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 shrink-0">
                  {isKhmer ? 'លឿន' : 'Fast'}
                </span>
              </div>
              <p className="text-[10px] text-indigo-200/90 truncate font-khmer">
                {isKhmer ? 'ស្កេនវត្តមានពេញអេក្រង់ គ្មានរបារ Browser' : '1-Tap Fullscreen check-in'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-indigo-600/40 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'ដំឡើង' : 'Install'}</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
