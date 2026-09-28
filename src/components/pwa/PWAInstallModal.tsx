import React, { useState } from 'react';
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
  ExternalLink,
  Copy,
  Check,
  Zap,
  WifiOff,
  ShieldCheck,
  MoreVertical
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const { isKhmer } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'auto' | 'ios' | 'android'>(() => {
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'auto';
  });

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const accepted = await install();
      if (accepted) {
        onClose();
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative Top Gradient Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 px-6 pt-7 pb-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* App Icon with Glow */}
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shadow-xl shadow-indigo-950/30 flex items-center justify-center mb-3">
            <img
              src="/pwa-192x192.png"
              alt="EduTrack App"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                // Fallback to svg if png fails
                (e.target as HTMLImageElement).src = '/icon.svg';
              }}
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold text-indigo-100 mb-2 border border-white/25">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isKhmer ? 'កម្មវិធីទូរស័ព្ទផ្លូវការ' : 'Official Progressive Web App'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {isKhmer ? 'ដំឡើង EduTrack លើអេក្រង់ទូរស័ព្ទ' : 'Install EduTrack App'}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-indigo-100/90 font-medium max-w-sm mx-auto">
            {isKhmer
              ? 'ប្រើប្រាស់ដូចកម្មវិធីទូរស័ព្ទពិតប្រាកដ ដោយមិនចាំបាច់ចូល App Store ឬ Play Store'
              : 'Add EduTrack directly to your phone home screen for instant full-screen access'}
          </p>
        </div>

        {/* Device selector tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/80 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab(isIOS ? 'ios' : 'auto')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all ${
              activeTab === 'auto' || (activeTab === 'ios' && isIOS) || (activeTab === 'android' && isAndroid)
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{isKhmer ? 'ឧបករណ៍របស់អ្នក' : 'Your Device'}</span>
          </button>

          <button
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all ${
              activeTab === 'ios' && !isIOS
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>iPhone / iPad (iOS)</span>
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all ${
              activeTab === 'android' && !isAndroid
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Android / Chrome</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Status if already installed */}
          {isInstalled && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold">
                  {isKhmer ? 'កម្មវិធីត្រូវបានដំឡើងរួចរាល់!' : 'EduTrack is already installed!'}
                </p>
                <p className="text-emerald-700">
                  {isKhmer
                    ? 'អ្នកកំពុងប្រើប្រាស់ក្នុងទម្រង់ Standalone រួចជាស្រេច។'
                    : 'You are currently running the app in standalone mode from your home screen.'}
                </p>
              </div>
            </div>
          )}

          {/* Direct 1-Click Install Button when browser supports beforeinstallprompt */}
          {isInstallable && !isInstalled && (
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex flex-col items-center text-center gap-3">
              <div className="text-xs text-indigo-900 font-semibold">
                {isKhmer
                  ? 'កម្មវិធីរុករករបស់អ្នកគាំទ្រការដំឡើងដោយស្វ័យប្រវត្ត ១ ចុច'
                  : '1-Click Direct Installation is supported on your browser!'}
              </div>
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4 animate-bounce" />
                <span>
                  {isInstalling
                    ? isKhmer ? 'កំពុងដំឡើង...' : 'Installing...'
                    : isKhmer ? 'ដំឡើងលើអេក្រង់ដើមឥឡូវនេះ (Install)' : 'Install to Home Screen Now'}
                </span>
              </button>
            </div>
          )}

          {/* iOS Safari Instructions */}
          {(activeTab === 'ios' || (activeTab === 'auto' && isIOS)) && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {isKhmer ? 'ជំហានដំឡើងលើ iPhone / iPad (Safari)' : 'iPhone / iPad Installation Steps (Safari)'}
                </h3>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  iOS Safari
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {isKhmer ? 'ចុចលើប៊ូតុង Share (ចែករំលែក)' : 'Tap the Share Button'}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {isKhmer
                        ? 'ចុចរូបសញ្ញាចែករំលែក (ប្រអប់មានព្រួញឡើងលើ) នៅរបារខាងក្រោមនៃ Safari។'
                        : 'Tap the share icon (square with upward arrow) in the bottom toolbar of Safari.'}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {isKhmer ? 'រំកិលចុះក្រោម ហើយចុច "Add to Home Screen"' : 'Scroll and Tap "Add to Home Screen"'}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {isKhmer
                        ? 'ជ្រើសរើស "បន្ថែមទៅអេក្រង់ដើម" (Add to Home Screen) ដែលមានរូបសញ្ញា (+)'
                        : 'Select "Add to Home Screen" with the square plus (+) icon.'}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {isKhmer ? 'ចុច "Add" (បន្ថែម) នៅជ្រុងខាងស្តាំលើ' : 'Tap "Add" in Top-Right Corner'}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {isKhmer
                        ? 'ចុចប៊ូតុង Add ដើម្បីបញ្ចប់។ រូបតំណាង EduTrack នឹងបង្ហាញលើអេក្រង់ទូរស័ព្ទរបស់អ្នកភ្លាមៗ!'
                        : 'Tap Add to finish. EduTrack will appear immediately on your home screen!'}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android / Chrome Instructions */}
          {(activeTab === 'android' || (activeTab === 'auto' && !isIOS && !isInstallable)) && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {isKhmer ? 'ជំហានដំឡើងលើ Android (Chrome / Samsung)' : 'Android / Chrome Installation'}
                </h3>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Android Browser
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {isKhmer ? 'ចុចលើសញ្ញា ចុចបី (⋮) នៅជ្រុងស្តាំលើ' : 'Tap the Three Dots Menu (⋮)'}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {isKhmer
                        ? 'បើកម៉ឺនុយជម្រើសរបស់កម្មវិធីរុករក Chrome ឬ Samsung Internet'
                        : 'Open the browser menu in the top right corner of Chrome.'}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {isKhmer ? 'ចុចលើ "Install app" ឬ "Add to Home screen"' : 'Tap "Install app" or "Add to Home screen"'}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {isKhmer
                        ? 'ជ្រើសយក "ដំឡើងកម្មវិធី" ឬ "បន្ថែមទៅអេក្រង់ដើម"'
                        : 'Choose "Install application" or "Add to Home screen" from the menu.'}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {isKhmer ? 'ចុច "Install" ដើម្បីបញ្ជាក់' : 'Confirm "Install"'}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {isKhmer
                        ? 'ប្រព័ន្ធនឹងបង្កើតរូបតំណាង App លើអេក្រង់ដើមទូរស័ព្ទរបស់អ្នកដោយស្វ័យប្រវត្ត។'
                        : 'The app icon will be automatically pinned to your mobile home screen.'}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PWA Features Highlights Grid */}
          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              {isKhmer ? 'គុណសម្បត្តិនៃការដំឡើង PWA' : 'Why Install to Home Screen?'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center sm:flex-col sm:items-start sm:text-left gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {isKhmer ? 'បើកលឿនរហ័ស' : 'Instant Launch'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isKhmer ? 'ពេញអេក្រង់ គ្មានរបារ URL' : 'Fullscreen native feel'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center sm:flex-col sm:items-start sm:text-left gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <WifiOff className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {isKhmer ? 'ដំណើរការ Offline' : 'Offline Ready'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isKhmer ? 'ផ្ទុកទិន្នន័យបានទោះគ្មានសេវា' : 'Works even with low network'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center sm:flex-col sm:items-start sm:text-left gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {isKhmer ? 'ទំហំតូច សន្សំទំហំ' : 'Ultra Lightweight'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isKhmer ? 'ក្រោម 2MB គ្មានផ្ទុកធ្ងន់' : 'Under 2MB, no app store wait'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Copy Direct Link (Helpful if user opened in Telegram / Messenger in-app webview) */}
          <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0 truncate">
              <span className="text-slate-500 block text-[11px]">
                {isKhmer ? 'តំណភ្ជាប់គេហទំព័រផ្ទាល់៖' : 'Direct Web App URL:'}
              </span>
              <span className="font-mono text-slate-700 font-semibold truncate block">
                {window.location.origin}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 shrink-0 flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">{isKhmer ? 'បានចម្លង' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isKhmer ? 'ចម្លង Link' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
          >
            {isKhmer ? 'បិទផ្ទាំង' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
