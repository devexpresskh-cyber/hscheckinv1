import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { PWAInstallModal } from './PWAInstallModal.tsx';
import { Download, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'login' | 'banner' | 'compact';
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
  if (isInstalled && variant === 'banner') {
    return null;
  }

  const handleClick = async () => {
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
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-xs border-indigo-600 active:scale-95 ${className}`}
          title={isKhmer ? 'ដំឡើង App លើអេក្រង់ទូរស័ព្ទ (Install to Home Screen)' : 'Install App to Mobile Home Screen'}
        >
          <Download className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span className="hidden sm:inline">
            {isKhmer ? 'ដំឡើង App' : 'Install App'}
          </span>
          <span className="sm:hidden">
            {isKhmer ? 'App' : 'App'}
          </span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
          <span>{isKhmer ? 'ដំឡើងលើអេក្រង់ដើម' : 'Install to Home Screen'}</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          onClick={() => setShowModal(true)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600/10 via-indigo-600/5 to-transparent text-indigo-900 border border-indigo-200/60 hover:bg-indigo-600/15 transition-all text-left ${className}`}
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Download className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-indigo-950 leading-tight">
              {isKhmer ? 'ដំឡើង App លើទូរស័ព្ទ' : 'Install Mobile App'}
            </p>
            <p className="text-[10px] text-indigo-700/80 truncate">
              {isKhmer ? 'បន្ថែមលើ Home Screen' : 'Add to Home Screen'}
            </p>
          </div>
        </button>
      )}

      {variant === 'login' && (
        <button
          onClick={() => setShowModal(true)}
          type="button"
          className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-900 text-xs font-bold transition-all shadow-xs active:scale-[0.99] ${className}`}
        >
          <Smartphone className="w-4 h-4 text-indigo-600" />
          <span>
            {isKhmer ? '📱 ដំឡើងកម្មវិធីលើអេក្រង់ទូរស័ព្ទ (Install to Home Screen)' : '📱 Install App to Mobile Home Screen'}
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
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white text-indigo-900 font-bold text-xs shrink-0 shadow hover:bg-indigo-50 transition-colors"
          >
            {isKhmer ? 'ដំឡើង' : 'Install'}
          </button>
        </div>
      )}

      {/* Interactive Modal */}
      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
