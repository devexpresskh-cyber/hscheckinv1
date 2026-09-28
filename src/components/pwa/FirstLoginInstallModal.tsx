import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  Download,
  Share2,
  PlusSquare,
  Sparkles,
  Smartphone,
  CheckCircle2,
  X,
  Bell,
  Clock,
  WifiOff,
  Zap,
  ArrowRight
} from 'lucide-react';

const STORAGE_KEY = 'edutrack_pwa_first_login_prompt_dismissed';

export const FirstLoginInstallModal: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const { isKhmer } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'ios' | 'android'>(() => {
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'guide';
  });

  useEffect(() => {
    // If running in standalone PWA, never show install prompt
    if (isInstalled) {
      return;
    }

    // Check if user previously dismissed or opted out
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') {
      return;
    }

    // Wait a brief moment after login to let the home screen render smoothly before presenting the popup
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  if (!isOpen || isInstalled) {
    return null;
  }

  const handleDismiss = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setIsOpen(false);
  };

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      if (isInstallable) {
        const accepted = await install();
        if (accepted) {
          localStorage.setItem(STORAGE_KEY, 'true');
          setIsOpen(false);
          return;
        }
      }
      // If prompt not supported directly (e.g. Safari on iOS), switch to OS guide
      if (isIOS) {
        setActiveTab('ios');
      } else {
        setActiveTab('android');
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 px-6 pt-7 pb-6 text-white text-center">
          <button
            onClick={() => handleDismiss(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* App Logo */}
          <div className="mx-auto w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white p-2 shadow-xl shadow-indigo-950/30 flex items-center justify-center mb-3">
            <img
              src="/pwa-192x192.png"
              alt="EduTrack App"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon.svg';
              }}
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold text-indigo-100 mb-2 border border-white/25">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isKhmer ? 'តំឡើងលើទូរស័ព្ទដៃ' : 'Install to Mobile Home Screen'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {isKhmer ? 'ស្វាគមន៍មកកាន់ EduTrack!' : 'Welcome to EduTrack!'}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-indigo-100/90 font-medium max-w-sm mx-auto">
            {isKhmer
              ? 'តំឡើងកម្មវិធីលើអេក្រង់ដើមទូរស័ព្ទ ដើម្បីទទួលបានការដាស់តឿនម៉ោងបង្រៀន និងស្កេនវត្តមានរហ័ស'
              : 'Add EduTrack directly to your phone for instant timetable access & class reminders'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Key Advantages Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100/80">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-xs">
                <Bell className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-indigo-950">
                {isKhmer ? 'ដាស់តឿនម៉ោងបង្រៀន' : 'Schedule Alerts'}
              </p>
              <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                {isKhmer ? 'រោទ៍មុនពេលចូល និងចេញ' : 'Audio chime before class'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100/80">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs">
                <Zap className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-emerald-950">
                {isKhmer ? 'ចូលភ្លាមៗ ១ ចុច' : 'Instant 1-Tap Access'}
              </p>
              <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                {isKhmer ? 'គ្មានរបារ Browser រំខាន' : 'Full-screen app view'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100/80">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-blue-950">
                {isKhmer ? 'ស្កេនវត្តមានងាយស្រួល' : 'Fast Kiosk Check-in'}
              </p>
              <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                {isKhmer ? 'ស្កេន QR និងផ្ទៀងផ្ទាត់ GPS' : 'Quick GPS QR scanning'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100/80">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-2 shadow-xs">
                <WifiOff className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-amber-950">
                {isKhmer ? 'ដំណើរការ Offline' : 'Offline Ready'}
              </p>
              <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                {isKhmer ? 'មើលកាលវិភាគគ្មានអ៊ីនធឺណិត' : 'Saved timetable cached'}
              </p>
            </div>
          </div>

          {/* OS Platform Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'guide'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isKhmer ? 'ទូទៅ' : 'Quick Install'}
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'ios'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🍏 iOS (iPhone / iPad)
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'android'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🤖 Android / Chrome
            </button>
          </div>

          {/* Content for Quick Install / Direct Button */}
          {activeTab === 'guide' && (
            <div className="space-y-3">
              {isInstallable ? (
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
                >
                  <Download className="w-5 h-5" />
                  <span>
                    {isInstalling
                      ? (isKhmer ? 'កំពុងដំណើរការ...' : 'Installing...')
                      : (isKhmer ? 'តំឡើងលើអេក្រង់ដើមឥឡូវនេះ (Install Now)' : 'Install App to Home Screen Now')}
                  </span>
                </button>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                  <p className="font-semibold text-slate-900">
                    {isKhmer ? 'វិធីតំឡើងកម្មវិធីងាយៗ៖' : 'Simple installation instructions:'}
                  </p>
                  <p>
                    {isIOS
                      ? (isKhmer
                          ? 'សូមចុចប៊ូតុង Share (⎋) នៅលើ Safari រួចជ្រើសរើស "Add to Home Screen"'
                          : 'Tap the Share icon (⎋) at the bottom of Safari, then choose "Add to Home Screen".')
                      : (isKhmer
                          ? 'សូមចុចសញ្ញាចុច ៣ (⋮) នៅជ្រុងខាងលើ Chrome រួចជ្រើសរើស "Install App"'
                          : 'Tap the menu (⋮) in Chrome and select "Install app" or "Add to Home Screen".')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* iOS Safari Guide */}
          {activeTab === 'ios' && (
            <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {isKhmer ? 'ចុចប៊ូតុង Share លើ Safari' : 'Tap the Share Button in Safari'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {isKhmer ? 'ស្ថិតនៅរបារខាងក្រោមនៃ Safari (រូបសញ្ញាប្រអប់មានសញ្ញាព្រួញឡើងលើ ⎋)' : 'Located in the bottom toolbar of Safari (box with upward arrow)'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {isKhmer ? 'ជ្រើសរើស "Add to Home Screen"' : 'Select "Add to Home Screen"'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {isKhmer ? 'រំកិលចុះក្រោមបន្តិច រួចចុច "Add to Home Screen" (បន្ថែមទៅអេក្រង់ដើម)' : 'Scroll down the share sheet and tap "Add to Home Screen"'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {isKhmer ? 'ចុចប៊ូតុង "Add" នៅជ្រុងខាងស្តាំលើ' : 'Tap "Add" in Top-Right Corner'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {isKhmer ? 'Icon កម្មវិធី EduTrack នឹងបង្ហាញលើ Home Screen ភ្លាមៗ' : 'EduTrack will instantly appear on your home screen like a native app'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Android Chrome Guide */}
          {activeTab === 'android' && (
            <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {isKhmer ? 'ចុចសញ្ញាចុច ៣ (⋮)' : 'Tap the Menu Button (⋮)'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {isKhmer ? 'ស្ថិតនៅជ្រុងខាងស្តាំខាងលើនៃកម្មវិធី Chrome' : 'Located at top-right corner of Google Chrome'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {isKhmer ? 'ជ្រើសរើស "Install app" ឬ "Add to Home screen"' : 'Select "Install app" or "Add to Home screen"'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {isKhmer ? 'ចុច "Install" ដើម្បីបញ្ជាក់ការដំឡើង' : 'Confirm by tapping "Install"'}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={() => handleDismiss(true)}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium py-1 px-2"
          >
            {isKhmer ? 'កុំបង្ហាញម្តងទៀត (Don\'t show again)' : 'Don\'t show again'}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleDismiss(false)}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors"
            >
              {isKhmer ? 'រំលឹកពេលក្រោយ' : 'Remind Later'}
            </button>

            {isInstallable && (
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isKhmer ? 'តំឡើងឥឡូវនេះ' : 'Install Now'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
