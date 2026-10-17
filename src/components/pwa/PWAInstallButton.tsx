import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { PWAInstallModal } from './PWAInstallModal.tsx';
import { Download, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'login' | 'banner' | 'compact' | 'mobile-menu';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const { isKhmer } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  // If already running inside standalone app mode, hide or don't show the prompt
  if (isInstalled && (variant === 'banner' || variant === 'login')) {
    return null;
  }

  const handleClick = async () => {
    window.dispatchEvent(new CustomEvent('edutrack:open-install-modal'));
    // If browser supports direct install prompt, try trigger it first, otherwise show the modal instructions
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
      {variant === 'header' && (
        <button
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-xs border-indigo-500 active:scale-95 cursor-pointer ${className}`}
          title={isKhmer ? 'ដំឡើង App លើអេក្រង់ទូរស័ព្ទ / កុំព្យូទ័រ (Install App)' : 'Install App to Home Screen / Desktop'}
        >
          <Download className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span className="hidden sm:inline">
            {isKhmer ? 'ដំឡើង App' : 'Install App'}
          </span>
          <span className="sm:hidden">
            {isKhmer ? 'ដំឡើង' : 'Install'}
          </span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer active:scale-95 ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
          <span>{isKhmer ? 'ដំឡើងលើអេក្រង់ដើម (Install App)' : 'Install App to Home Screen'}</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600/15 via-indigo-600/10 to-transparent text-indigo-200 border border-indigo-500/30 hover:border-indigo-400/60 hover:bg-indigo-600/25 transition-all text-left cursor-pointer active:scale-98 ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Download className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white leading-tight truncate">
                {isKhmer ? 'ដំឡើង App' : 'Install App'}
              </p>
              <p className="text-[10px] text-indigo-300 truncate">
                {isKhmer ? 'បន្ថែមលើ Home Screen' : 'Add to Home Screen'}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-white/15 text-white font-bold text-[10px] shrink-0 border border-white/20">
            {isKhmer ? 'ដំឡើង' : 'Install'}
          </span>
        </button>
      )}

      {variant === 'login' && (
        <button
          onClick={handleClick}
          type="button"
          className={`w-full flex items-center justify-center gap-2.5 px-4 py-2.5 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-indigo-200 hover:text-white text-xs font-bold transition-all shadow-sm backdrop-blur-md active:scale-[0.99] cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="truncate">
            {isKhmer ? '📱 ដំឡើងកម្មវិធីលើអេក្រង់ទូរស័ព្ទ (Install App)' : '📱 Install App to Mobile Home Screen'}
          </span>
        </button>
      )}

      {variant === 'banner' && (
        <div className={`p-3 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white shadow-lg flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">
                {isKhmer ? 'ដំឡើង EduTrack លើអេក្រង់ដើមទូរស័ព្ទ' : 'Install EduTrack to Home Screen'}
              </p>
              <p className="text-[11px] text-indigo-200/80 truncate">
                {isKhmer ? 'ស្កេនវត្តមានលឿនរហ័ស ពេញអេក្រង់' : 'Fast 1-tap full-screen check-in'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="px-3 py-1.5 rounded-xl bg-white text-indigo-900 font-bold text-xs shrink-0 shadow hover:bg-indigo-50 transition-colors cursor-pointer active:scale-95"
          >
            {isKhmer ? 'ដំឡើង' : 'Install'}
          </button>
        </div>
      )}

      {/* High-Contrast Mobile Menu Variant for BottomNavigation and Drawers */}
      {variant === 'mobile-menu' && (
        <button
          onClick={handleClick}
          type="button"
          className={`w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 text-white shadow-md shadow-indigo-600/30 active:scale-98 transition-all cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <Download className="w-5 h-5 animate-bounce" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold block leading-tight text-white truncate">
                {isKhmer ? '📱 ដំឡើងកម្មវិធីលើអេក្រង់ទូរស័ព្ទ (Install App)' : '📱 Install EduTrack to Home Screen'}
              </span>
              <span className="text-[10px] text-indigo-100 font-medium truncate block">
                {isKhmer ? 'ស្កេនវត្តមានលឿន ពេញអេក្រង់ គ្មានរបារ Browser' : 'Fast full-screen access & 1-tap check-in'}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-white text-indigo-900 font-extrabold text-[11px] shrink-0 shadow-xs">
            {isKhmer ? 'ដំឡើង' : 'Install'}
          </span>
        </button>
      )}

      {/* Interactive Modal */}
      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
