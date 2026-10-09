import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Users,
  GraduationCap,
  ShieldCheck,
  Send,
  Download,
  Printer,
  Search,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Smartphone,
  Lock,
  DollarSign,
  Coffee,
  HelpCircle,
  FileSpreadsheet,
  Globe,
  ArrowRight,
  Bell,
  Volume2,
  Play,
  Video,
  Monitor,
  Laptop,
  CornerDownLeft,
  ExternalLink,
  RotateCcw,
  Check,
  Layers,
  LayoutDashboard,
  CalendarCheck,
  Palmtree
} from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton.tsx';
import { ScheduleAlertService } from '../../services/scheduleAlertService.ts';
import { TeacherVideoManualModal } from './TeacherVideoManualModal.tsx';
import { RealInterfaceActionWalkthrough } from './RealInterfaceActionWalkthrough.tsx';

interface ManualSection {
  id: string;
  titleEn: string;
  titleKm: string;
  badge: string;
  icon: React.ElementType;
  descriptionEn: string;
  descriptionKm: string;
  stepsEn: { title: string; desc: string; tip?: string }[];
  stepsKm: { title: string; desc: string; tip?: string }[];
  faqEn?: { q: string; a: string }[];
  faqKm?: { q: string; a: string }[];
}

/**
 * Interactive Web Browser Link Simulator Component
 * Demonstrates exactly how a teacher enters the URL on mobile/desktop browsers.
 */
const WebBrowserLinkSimulator: React.FC<{ onExplorePages: () => void }> = ({ onExplorePages }) => {
  const { isKhmer } = useLanguage();
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('mobile');
  const [browserMode, setBrowserMode] = useState<'chrome' | 'safari'>('chrome');
  const [urlState, setUrlState] = useState<'empty' | 'typed' | 'navigated'>('typed');
  const [typedUrl, setTypedUrl] = useState<string>('https://edutrack.edu.kh');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handlePaste = () => {
    setTypedUrl('https://edutrack.edu.kh');
    setUrlState('typed');
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText('https://edutrack.edu.kh').catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleGo = () => {
    setUrlState('navigated');
  };

  const handleReset = () => {
    setUrlState('empty');
    setTypedUrl('');
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4 sm:p-6 text-white shadow-xl space-y-5">
      {/* Simulator Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Interactive Simulator
            </span>
            <span className="text-xs text-slate-400">
              {isKhmer ? 'សាកល្បងវាយតំណភ្ជាប់គេហទំព័រផ្ទាល់' : 'Try entering link live'}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            {isKhmer ? 'របៀបវាយបញ្ចូលតំណភ្ជាប់សាលាលើ Web Browser' : 'How to Enter School Link on Web Browser'}
          </h3>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center text-xs font-bold">
            <button
              onClick={() => setDeviceType('mobile')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                deviceType === 'mobile'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'ទូរស័ព្ទដៃ' : 'Mobile'}</span>
            </button>
            <button
              onClick={() => setDeviceType('desktop')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                deviceType === 'desktop'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'កុំព្យូទ័រ' : 'Desktop'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Simulated Browser Window Frame */}
      <div className={`mx-auto bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden transition-all ${
        deviceType === 'mobile' ? 'max-w-md' : 'w-full'
      }`}>
        {/* Top Browser Bar (Tabs + Window Controls) */}
        <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            </div>

            {/* Browser Tab */}
            <div className="ml-2 px-3 py-1 bg-slate-950 rounded-t-lg text-[11px] font-bold text-slate-300 border-t border-x border-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span className="truncate max-w-[150px]">
                {urlState === 'navigated' ? 'EduTrack Faculty Portal' : 'New Tab'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
            <span className="hidden sm:inline">Google Chrome / Apple Safari</span>
          </div>
        </div>

        {/* Address Bar Area (The Core Focus for the Teacher) */}
        <div className="p-3 bg-slate-900/50 border-b border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-slate-400 text-xs shrink-0">
              <span className="p-1 hover:text-white cursor-pointer">‹</span>
              <span className="p-1 hover:text-white cursor-pointer">›</span>
              <span className="p-1 hover:text-white cursor-pointer">↻</span>
            </div>

            {/* The Actual Address Bar */}
            <div className="flex-1 min-h-[42px] bg-slate-950 rounded-xl border-2 border-cyan-500/80 px-3 flex items-center justify-between text-xs font-mono shadow-inner ring-2 ring-cyan-500/20">
              <div className="flex items-center gap-2 truncate">
                {urlState === 'navigated' ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>Secure</span>
                  </span>
                ) : (
                  <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}

                {urlState === 'empty' ? (
                  <span className="text-slate-500 text-xs">Search or enter website address...</span>
                ) : (
                  <span className="text-white font-bold text-xs truncate">
                    <span className="text-slate-400">https://</span>
                    <span className="text-cyan-300">edutrack.edu.kh</span>
                  </span>
                )}
              </div>

              {/* Action Inside Bar */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {urlState !== 'navigated' && (
                  <button
                    onClick={handleGo}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                  >
                    <span>Go</span>
                    <CornerDownLeft className="w-3 h-3" />
                  </button>
                )}
                <span className="text-slate-500 hover:text-white cursor-pointer text-xs font-bold pl-1">⋮</span>
              </div>
            </div>
          </div>

          {/* Quick Practice Buttons Beneath Address Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px]">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePaste}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>📋</span>
                <span>{isKhmer ? 'បិទភ្ជាប់ Link: https://edutrack.edu.kh' : 'Paste School Link'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isCopied ? '✓ Copied' : '📑 Copy URL'}</span>
              </button>

              <button
                onClick={handleReset}
                className="px-2 py-1 rounded-lg bg-slate-850 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Reset simulation"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SSL HTTPS 256-bit</span>
            </div>
          </div>
        </div>

        {/* Viewport Content Area inside the Simulated Browser */}
        <div className="p-4 sm:p-6 min-h-[220px] bg-slate-950 flex flex-col justify-center items-center text-center">
          {urlState === 'empty' ? (
            <div className="space-y-2 py-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-300">
                {isKhmer ? 'របារអាសយដ្ឋានទទេ (សូមវាយតំណភ្ជាប់)' : 'Address Bar Empty (Type link to proceed)'}
              </h4>
              <p className="text-[11px] text-slate-500 max-w-xs">
                {isKhmer
                  ? 'ចុចលើប៊ូតុង "បិទភ្ជាប់ Link" ខាងលើ ដើម្បីសាកល្បងបញ្ចូលអាសយដ្ឋានគេហទំព័រ។'
                  : 'Click "Paste School Link" above to test entering the school web address.'}
              </p>
            </div>
          ) : urlState === 'typed' ? (
            <div className="space-y-3 py-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-cyan-300 flex items-center justify-center mx-auto">
                <CornerDownLeft className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  {isKhmer ? 'អាសយដ្ឋានបានវាយបញ្ចូលរួចរាល់!' : 'School Link Entered!'}
                </h4>
                <p className="text-xs text-cyan-300 font-mono">
                  https://edutrack.edu.kh
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm pt-1">
                  {isKhmer
                    ? 'ឥឡូវនេះ សូមចុចប៊ូតុង "Go" ឬ "Enter" លើក្តារចុចទូរស័ព្ទរបស់អ្នក ដើម្បីបើកទំព័រគ្រប់គ្រងការសិក្សា។'
                    : 'Now tap the blue "Go" button or press Enter on your mobile keyboard to navigate to the faculty portal.'}
                </p>
              </div>

              <button
                onClick={handleGo}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs shadow-lg shadow-blue-500/30 flex items-center gap-2 mx-auto active:scale-95 transition-all cursor-pointer"
              >
                <span>{isKhmer ? 'ចុច Enter / Go ដើម្បីបើកទំព័រ' : 'Press Go / Enter to Open'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Loaded Official Portal Preview */
            <div className="w-full space-y-4 animate-in zoom-in-95 text-left">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                    E
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white leading-tight">
                      EduTrack Academic MIS
                    </h5>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                      <span>✓ Official Faculty Portal Connected</span>
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-xl bg-blue-500/20 text-cyan-300 border border-blue-400/30 text-[10px] font-bold">
                  2026 Academic Year
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">
                    {isKhmer ? 'ទំព័រដើមបានបើកជោគជ័យ! ចង់ចូលទំព័រជាក់ស្តែង?' : 'Page Loaded! Explore Real Interface Walkthrough?'}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {isKhmer
                      ? 'ចុចដើម្បីមើលទំព័រកាលវិភាគបង្រៀន ស្កេនវត្តមាន និងប្រាក់ឈ្នួលជាក់ស្តែង'
                      : 'Step through teacher PIN login, daily schedule check-in, and wage ledger.'}
                  </p>
                </div>

                <button
                  onClick={onExplorePages}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>{isKhmer ? 'មើលទំព័រជាក់ស្តែង' : 'Use Live Pages'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step by Step Device Directions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <span className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px]">1</span>
            <span>{isKhmer ? 'ទូរស័ព្ទ Android (Chrome)' : 'Android (Google Chrome)'}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {isKhmer
              ? '១. បើក Chrome ២. ចុចរបារខាងលើ ៣. វាយ https://edutrack.edu.kh ៤. ចុច Enter/Go ៥. ចុចសញ្ញាចុចបី (⋮) រើស "Add to Home Screen"។'
              : '1. Open Chrome. 2. Tap top URL bar. 3. Enter https://edutrack.edu.kh. 4. Press Enter. 5. Tap menu (⋮) → "Add to Home screen".'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
            <span className="w-5 h-5 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center text-[10px]">2</span>
            <span>{isKhmer ? 'ទូរស័ព្ទ iPhone (Safari)' : 'iPhone & iPad (Safari)'}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {isKhmer
              ? '១. បើក Safari ២. ចុចរបារ URL ខាងក្រោម/លើ ៣. វាយ https://edutrack.edu.kh ៤. ចុច Go ៥. ចុច Share (⎋) រើស "Add to Home Screen"។'
              : '1. Open Safari. 2. Tap address bar. 3. Enter https://edutrack.edu.kh. 4. Press Go. 5. Tap Share (⎋) → "Add to Home Screen".'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px]">3</span>
            <span>{isKhmer ? 'កុំព្យូទ័រ PC / Mac' : 'Desktop PC / Mac'}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {isKhmer
              ? '១. បើក Chrome ឬ Edge ២. ចុចរបារ URL ខាងលើ ៣. វាយ https://edutrack.edu.kh រួចចុច Enter ៤. ចុចរូបសញ្ញាដំឡើង ⊕ នៅខាងស្តាំរបារ។'
              : '1. Open Chrome or Edge. 2. Tap address bar. 3. Enter https://edutrack.edu.kh and press Enter. 4. Click install icon ⊕ in URL bar.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const SystemUserManual: React.FC = () => {
  const { isKhmer } = useLanguage();
  const [manualViewMode, setManualViewMode] = useState<'interactive_pages' | 'documentation'>('interactive_pages');
  const [activeSectionId, setActiveSectionId] = useState<string>('browser-entry');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLangMode, setActiveLangMode] = useState<'both' | 'km' | 'en'>(isKhmer ? 'km' : 'en');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);

  const manualSections: ManualSection[] = [
    {
      id: 'browser-entry',
      titleEn: '1. Opening Web Browser & Entering Link (https://edutrack.edu.kh)',
      titleKm: '១. ការបើកកម្មវិធីរុករក & វាយបញ្ចូលតំណភ្ជាប់សាលា',
      badge: 'Getting Started',
      icon: Globe,
      descriptionEn: 'How teachers open Google Chrome or Apple Safari, type or paste the official school domain (https://edutrack.edu.kh), and navigate securely to the faculty portal.',
      descriptionKm: 'ការណែនាំអំពីរបៀបដែលគ្រូបង្រៀនបើកកម្មវិធីរុករក (Chrome ឬ Safari) វាយបញ្ចូល ឬបិទភ្ជាប់តំណភ្ជាប់សាលា (https://edutrack.edu.kh) និងចូលប្រើប្រព័ន្ធដោយសុវត្ថិភាព។',
      stepsEn: [
        {
          title: 'Step 1: Open Google Chrome or Apple Safari',
          desc: 'On your Android device or PC, open Google Chrome. On your iPhone or iPad, open Apple Safari.',
          tip: 'Chrome and Safari fully support offline timetable caching and camera QR scanning.'
        },
        {
          title: 'Step 2: Tap the Top Search / Address (URL) Bar',
          desc: 'Tap inside the top search or address bar to open your on-screen keyboard.',
          tip: 'On iOS 15+ iPhones, the address bar is at the bottom of the screen by default.'
        },
        {
          title: 'Step 3: Type or Paste the Exact School Link: https://edutrack.edu.kh',
          desc: 'Type https://edutrack.edu.kh accurately. As you type, the browser autocompletes with the official EduTrack Faculty Portal.',
          tip: 'Bookmark or save the link to your phone favorites for instant recall.'
        },
        {
          title: 'Step 4: Press "Enter" or "Go" to Navigate',
          desc: 'Tap Go or the blue Enter arrow on your keyboard. The browser initiates a secure TLS/SSL encrypted connection indicated by the padlock 🔒 symbol.',
          tip: 'The page loads instantly with faculty login and attendance features.'
        },
        {
          title: 'Step 5: Add to Home Screen (PWA Standalone App)',
          desc: 'On Android: Tap browser menu (⋮) → "Add to Home screen" or "Install App". On iPhone: Tap Share (⎋) → "Add to Home Screen".',
          tip: 'A dedicated EduTrack icon will be pinned to your phone desktop, so you never have to retype the URL bar again!'
        }
      ],
      stepsKm: [
        {
          title: 'ជំហានទី ១៖ បើកកម្មវិធី Google Chrome ឬ Safari',
          desc: 'នៅលើទូរស័ព្ទ Android ឬកុំព្យូទ័រ សូមបើក Google Chrome។ លើទូរស័ព្ទ iPhone ឬ iPad សូមបើក Apple Safari។',
          tip: 'Chrome និង Safari គាំទ្រការប្រើប្រាស់ Offline និងការស្កេន QR កម្រិតខ្ពស់។'
        },
        {
          title: 'ជំហានទី ២៖ ចុចលើរបារអាសយដ្ឋាន (URL Bar)',
          desc: 'ចុចលើប្រអប់អាសយដ្ឋានខាងលើ ដើម្បីបើកក្តារចុចលើអេក្រង់ទូរស័ព្ទ។',
          tip: 'លើ iPhone ប្រព័ន្ធ iOS របារ URL អាចស្ថិតនៅផ្នែកខាងក្រោមនៃអេក្រង់។'
        },
        {
          title: 'ជំហានទី ៣៖ វាយបញ្ចូល ឬបិទភ្ជាប់តំណភ្ជាប់៖ https://edutrack.edu.kh',
          desc: 'វាយបញ្ចូលអាសយដ្ឋានសាលា៖ https://edutrack.edu.kh ឱ្យបានត្រឹមត្រូវ។ ប្រព័ន្ធនឹងបង្ហាញឈ្មោះស្វ័យប្រវត្តិ។',
          tip: 'អាចចម្លង (Copy) តំណភ្ជាប់ទុក ដើម្បីងាយស្រួលបិទភ្ជាប់ (Paste)។'
        },
        {
          title: 'ជំហានទី ៤៖ ចុច "Go" ឬ "Enter" ដើម្បីបើកទំព័រ',
          desc: 'ចុចប៊ូតុង Go ឬ Enter លើក្តារចុច។ កម្មវិធីរុករកនឹងភ្ជាប់ដោយសុវត្ថិភាព ជាមួយរូបសោរ 🔒 (SSL Encrypted)។',
          tip: 'ទំព័រគ្រប់គ្រងការសិក្សានឹងបង្ហាញភ្លាមៗ ត្រៀមសម្រាប់ការចូលគណនីគ្រូ។'
        },
        {
          title: 'ជំហានទី ៥៖ បន្ថែមទៅអេក្រង់ដើម (Add to Home screen)',
          desc: 'លើ Android៖ ចុចសញ្ញាចុចបី (⋮) រើស "Add to Home screen"។ លើ iPhone៖ ចុច Share (⎋) រើស "Add to Home Screen"។',
          tip: 'រូបតំណាង EduTrack នឹងបង្កើតលើអេក្រង់ទូរស័ព្ទ មិនបាច់វាយតំណភ្ជាប់ URL ម្តងទៀតឡើយ!'
        }
      ],
      faqEn: [
        {
          q: 'Do I need to retype the web link every morning?',
          a: 'No! Simply tap "Add to Home screen" once. An EduTrack app icon is saved to your phone desktop. Tap it to launch full-screen directly without opening the browser.'
        },
        {
          q: 'What should I do if the link says "Not Secure"?',
          a: 'Always check for the green padlock 🔒 and ensure you typed https:// (with an "s" for SSL security) at https://edutrack.edu.kh.'
        }
      ],
      faqKm: [
        {
          q: 'តើខ្ញុំត្រូវវាយតំណភ្ជាប់ URL រាល់ព្រឹកដែរឬទេ?',
          a: 'មិនបាច់ទេ! គ្រាន់តែចុច "Add to Home Screen" តែម្តងគត់ រូបតំណាងកម្មវិធីនឹងបង្ហាញលើអេក្រង់ទូរស័ព្ទ។ អ្នកអាចចុចបើកប្រើភ្លាមៗពេញអេក្រង់ដោយមិនបាច់វាយ Link ម្តងទៀតឡើយ។'
        },
        {
          q: 'តើត្រូវធ្វើដូចម្តេចប្រសិនបើតំណភ្ជាប់មិនដំណើរការ?',
          a: 'សូមពិនិត្យមើលរូបសោរ 🔒 និងប្រាកដថាបានវាយ https://edutrack.edu.kh ត្រឹមត្រូវតាមអក្សរតូចទាំងអស់។'
        }
      ]
    },
    {
      id: 'kiosk',
      titleEn: '2. Check-in Terminal & GPS Attendance',
      titleKm: '២. ចំណុចស្កេនវត្តមាន និងទីតាំង GPS',
      badge: 'Core Feature',
      icon: Clock,
      descriptionEn: 'How teachers and staff record daily check-in and check-out with automatic GPS boundary verification.',
      descriptionKm: 'ការណែនាំអំពីការស្កេនវត្តមានចូល-ចេញ របស់គ្រូបង្រៀន និងបុគ្គលិក ជាមួយនឹងការផ្ទៀងផ្ទាត់ទីតាំង GPS ក្នុងបរិវេណសាលា។',
      stepsEn: [
        {
          title: 'Select Staff Member or Scan ID',
          desc: 'On the Check-in Terminal screen (or Mobile Modal), choose your name from the dropdown or scan your teacher/employee barcode.',
          tip: 'Logged-in teachers and staff are automatically pre-selected.'
        },
        {
          title: 'Select Class Schedule (For Teachers)',
          desc: 'Teachers must clock in by specific subject class session (e.g., Mathematics Grade 10A, Period 1). The system automatically selects the current present-time class.',
          tip: 'Scanning in before or during class time is required. Scanning into past sessions or after class end-time is blocked.'
        },
        {
          title: 'Verify GPS Campus Boundary',
          desc: 'The system verifies that you are physically within the authorized campus perimeter (e.g. 500m radius). If campus boundary enforcement is ON and you are outside, check-in will be denied.',
          tip: 'Use the Simulator toggle (On-Campus / Outside) to test boundary behavior.'
        },
        {
          title: 'Click CHECK IN / CHECK OUT',
          desc: 'Tap the green CHECK IN button. The system records your exact timestamp, calculates late arrival if applicable, dispatches a Telegram alert, and records your attendance.',
          tip: 'When your class finishes, click CHECK OUT to finalize your teaching duration.'
        }
      ],
      stepsKm: [
        {
          title: 'ជ្រើសរើសឈ្មោះ ឬស្កេនកាតសម្គាល់',
          desc: 'នៅទំព័រ "ចំណុចស្កេនវត្តមាន" (ឬចុចប៊ូតុងស្កេនលើទូរស័ព្ទ) សូមជ្រើសរើសឈ្មោះរបស់អ្នក ឬស្កេនបាកូដកាតសម្គាល់គ្រូ/បុគ្គលិក។',
          tip: 'ប្រសិនបើអ្នកបានចូលគណនីរួចហើយ ប្រព័ន្ធនឹងជ្រើសឈ្មោះអ្នកដោយស្វ័យប្រវត្តិ។'
        },
        {
          title: 'ជ្រើសរើសម៉ោងបង្រៀន (សម្រាប់គ្រូ)',
          desc: 'គ្រូបង្រៀនត្រូវស្កេនវត្តមានតាមម៉ោងមុខវិជ្ជាជាក់លាក់ (ឧទាហរណ៍៖ គណិតវិទ្យា ថ្នាក់ទី១០A ម៉ោងទី១)។ ប្រព័ន្ធនឹងជ្រើសរើសម៉ោងដែលត្រូវបង្រៀននៅពេលបច្ចុប្បន្នដោយស្វ័យប្រវត្តិ។',
          tip: 'អាចស្កេនចូលបានតែក្នុងម៉ោងបង្រៀនបច្ចុប្បន្នប៉ុណ្ណោះ។ មិនអនុញ្ញាតឱ្យស្កេនចូលម៉ោងដែលបានកន្លងផុត ឬហួសម៉ោងបញ្ចប់ឡើយ។'
        },
        {
          title: 'ផ្ទៀងផ្ទាត់ទីតាំង GPS ក្នុងបរិវេណសាលា',
          desc: 'ប្រព័ន្ធនឹងផ្ទៀងផ្ទាត់ទីតាំង GPS របស់អ្នកជាមួយបរិវេណសាលា (កាំ ៥០០ម៉ែត្រ)។ ប្រសិនបើសាលាបានបើកមុខងារកំហិត GPS ហើយអ្នកនៅក្រៅបរិវេណ ប្រព័ន្ធនឹងបដិសេធមិនឱ្យស្កេនចូលឡើយ។',
          tip: 'អាចប្រើប៊ូតុងសាកល្បងទីតាំង (ក្នុងសាលា / ក្រៅសាលា) សម្រាប់ធ្វើតេស្ត។'
        },
        {
          title: 'ចុច "ស្កេនចូល (CHECK IN)" ឬ "ស្កេនចេញ"',
          desc: 'ចុចប៊ូតុងពណ៌បៃតង "ស្កេនចូល"។ ប្រព័ន្ធនឹងកត់ត្រាម៉ោងជាក់ស្តែង គណនាម៉ោងយឺត (ប្រសិនបើមាន) ផ្ញើសារដំណឹងទៅតេឡេក្រាម និងកត់ត្រាទុកក្នុងប្រព័ន្ធ។',
          tip: 'នៅពេលបញ្ចប់ម៉ោងបង្រៀន សូមចុច "ស្កេនចេញ" ដើម្បីគណនាម៉ោងបង្រៀនជាក់ស្តែង។'
        }
      ],
      faqEn: [
        {
          q: 'What happens if I arrive after the grace period?',
          a: 'If you check in after the scheduled start time plus grace period (e.g. 15 mins), your status is marked as "Late" with the exact number of late minutes displayed and sent to Telegram.'
        },
        {
          q: 'Can a teacher check in after the class has already finished?',
          a: 'No. The system strictly enforces real-time attendance. Scanning in after a class session has ended is prohibited.'
        }
      ],
      faqKm: [
        {
          q: 'តើមានអ្វីកើតឡើងប្រសិនបើខ្ញុំមកដល់ហួសម៉ោងអនុគ្រោះ?',
          a: 'ប្រសិនបើអ្នកស្កេនចូលហួសម៉ោងចាប់ផ្តើមកាលវិភាគបូកនឹងម៉ោងអនុគ្រោះ (ឧ. ១៥នាទី) ប្រព័ន្ធនឹងកត់ត្រាស្ថានភាពជា "មកយឺត (Late)" រួមជាមួយចំនួននាទីដែលយឺត និងផ្ញើដំណឹងទៅតេឡេក្រាម។'
        },
        {
          q: 'តើគ្រូអាចស្កេនចូលក្រោយពេលម៉ោងបង្រៀនចប់ហើយបានទេ?',
          a: 'មិនអាចទេ។ ប្រព័ន្ធកំណត់យ៉ាងតឹងរ៉ឹងឱ្យស្កេនតែក្នុងពេលបច្ចុប្បន្នប៉ុណ្ណោះ។ ការស្កេនចូលក្រោយម៉ោងបញ្ចប់ត្រូវហាមឃាត់ដាច់ខាត។'
        }
      ]
    },
    {
      id: 'timetables',
      titleEn: '3. Weekly Timetable & Period Management',
      titleKm: '៣. កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍ និងការគ្រប់គ្រងម៉ោង',
      badge: 'Academic',
      icon: Calendar,
      descriptionEn: 'Managing Mon-Sat timetable periods, assigning class sessions, rooms, subjects, and hourly wage rates.',
      descriptionKm: 'ការគ្រប់គ្រងម៉ោងសិក្សា ចន្ទ ដល់ សៅរ៍ ការបែងចែកម៉ោងបង្រៀន បន្ទប់រៀន មុខវិជ្ជា និងអត្រាប្រាក់ឈ្នួលក្នុងមួយម៉ោង។',
      stepsEn: [
        {
          title: 'Navigate to Schedules & Timetables',
          desc: 'Open the "Schedules & Timetables" tab from the sidebar. You can switch between the Mon-Sat Master Timetable, General Shifts, and Period Management.',
          tip: 'Filter timetable view by specific Teacher or Class Grade.'
        },
        {
          title: 'Configure Standard Periods & Breaks',
          desc: 'Click "Manage Standard Periods" to define morning, afternoon, and break intervals (e.g., Period 1: 07:30-08:30, Lunch Break: 11:30-13:30).',
          tip: 'Break intervals are clearly distinguished in amber across the entire weekly grid.'
        },
        {
          title: 'Assign Classes to Teachers',
          desc: 'Click on any empty slot or use "Assign Class to Teacher" to select the teacher, subject, grade, room, and day of the week.',
          tip: 'You can set a custom Hourly Wage Rate per period or let it default to the teacher base rate.'
        },
        {
          title: 'Print Official Timetable',
          desc: 'Click the "Print Timetable" button to generate a clean, official formatted weekly timetable complete with school identity and academic year.',
          tip: 'Supports printer and PDF export.'
        }
      ],
      stepsKm: [
        {
          title: 'ចូលទៅកាន់ "កាលវិភាគបង្រៀន"',
          desc: 'ចុចលើម៉ឺនុយ "កាលវិភាគបង្រៀន (Schedules)" លើរបារខាងឆ្វេង។ អ្នកអាចមើលតារាងកាលវិភាគ ចន្ទ-សៅរ៍ វេនទូទៅ និងការគ្រប់គ្រងម៉ោងសិក្សា។',
          tip: 'អាចជ្រើសមើលតាមគ្រូជាក់លាក់ ឬតាមកម្រិតថ្នាក់នីមួយៗបាន។'
        },
        {
          title: 'កំណត់ម៉ោងសិក្សា និងម៉ោងសម្រាកទូទៅ',
          desc: 'ចុចប៊ូតុង "គ្រប់គ្រងម៉ោងស្តង់ដារ" ដើម្បីកំណត់ម៉ោងពេលព្រឹក ពេលរសៀល និងម៉ោងសម្រាក (ឧ. ម៉ោងទី១៖ ០៧:៣០-០៨:៣០, សម្រាកថ្ងៃត្រង់៖ ១១:៣០-១៣:៣០)។',
          tip: 'ម៉ោងសម្រាកនឹងបង្ហាញពណ៌ទឹកក្រូចច្បាស់ៗលើតារាងកាលវិភាគសប្តាហ៍។'
        },
        {
          title: 'បែងចែកម៉ោងបង្រៀនដល់គ្រូ',
          desc: 'ចុចលើប្រឡោះកាលវិភាគ ឬចុច "បញ្ចូលម៉ោងបង្រៀន" ដើម្បីជ្រើសរើសគ្រូ មុខវិជ្ជា ថ្នាក់រៀន បន្ទប់ និងថ្ងៃក្នុងសប្តាហ៍។',
          tip: 'អាចកំណត់អត្រាកម្រៃបង្រៀនក្នុងមួយម៉ោងសម្រាប់មុខវិជ្ជានោះ ឬប្រើអត្រាមូលដ្ឋានរបស់គ្រូ។'
        },
        {
          title: 'បោះពុម្ពកាលវិភាគផ្លូវការ',
          desc: 'ចុចប៊ូតុង "បោះពុម្ព (Print Timetable)" ដើម្បីទទួលបានតារាងកាលវិភាគស្អាត បែបផ្លូវការ ជាមួយឈ្មោះសាលា និងឆ្នាំសិក្សា។',
          tip: 'គាំទ្រទាំងការបោះពុម្ពចេញម៉ាស៊ីនព្រីន ឬរក្សាទុកជា PDF។'
        }
      ]
    },
    {
      id: 'wages',
      titleEn: '4. Teaching Hours & Wage Payroll Calculation',
      titleKm: '៤. ការគណនាម៉ោងបង្រៀន និងប្រាក់ឈ្នួលគ្រូ',
      badge: 'Finance / HR',
      icon: DollarSign,
      descriptionEn: 'Automated calculation of actual taught hours and net payable wages based on verified check-in/out records.',
      descriptionKm: 'ការគណនាស្វ័យប្រវត្តិនូវម៉ោងបង្រៀនជាក់ស្តែង និងប្រាក់ឈ្នួលត្រូវបើកសរុប ផ្អែកលើការស្កេនចូល-ចេញដែលបានផ្ទៀងផ្ទាត់។',
      stepsEn: [
        {
          title: 'Open Reports & Wage Payroll',
          desc: 'Select "Reports & Wage Payroll" from the sidebar and click on "Teaching Hours & Wage Report".',
          tip: 'Filter by specific Month or custom Date Range.'
        },
        {
          title: 'Review Auto-Calculated Hours and Wages',
          desc: 'The system computes: Completed Classes, Scheduled Hours, Actual Taught Hours, Punctuality Rate, and Net Payable Wage ($) for each teacher.',
          tip: 'Wage = Actual Taught Hours × Teacher Hourly Rate ($/hr).'
        },
        {
          title: 'Itemized Individual Payslip Voucher',
          desc: 'Click "Breakdown" on any teacher row to view a detailed breakdown of every single class session taught, date, room, subject, and wage earned.',
          tip: 'Click "Print Payslip" inside the modal to generate an official employee payment voucher.'
        },
        {
          title: 'Export to Payroll CSV / Excel',
          desc: 'Click "Export Wage CSV" to download an official spreadsheet ready for finance and banking disbursements.',
          tip: 'Includes full audit details and compensation figures.'
        }
      ],
      stepsKm: [
        {
          title: 'ចូលទៅកាន់ "របាយការណ៍ និងប្រាក់ឈ្នួល"',
          desc: 'ជ្រើសរើសម៉ឺនុយ "របាយការណ៍ និងប្រាក់ឈ្នួល (Reports)" រួចចុចផ្ទាំង "របាយការណ៍ម៉ោងបង្រៀន និងប្រាក់ឈ្នួល"។',
          tip: 'អាចជ្រើសរើសមើលតាមខែ ឬចន្លោះកាលបរិច្ឆេទជាក់លាក់។'
        },
        {
          title: 'ពិនិត្យម៉ោងបង្រៀន និងប្រាក់ឈ្នួលដែលគណនាដោយស្វ័យប្រវត្តិ',
          desc: 'ប្រព័ន្ធនឹងគណនា៖ ចំនួនម៉ោងដែលបានបង្រៀនជាក់ស្តែង ម៉ោងតាមកាលវិភាគ ភាគរយទៀងម៉ោង និងប្រាក់ឈ្នួលត្រូវបើក ($) សម្រាប់គ្រូនីមួយៗ។',
          tip: 'ប្រាក់ឈ្នួល = ម៉ោងបង្រៀនជាក់ស្តែង × អត្រាកម្រៃបង្រៀនក្នុងមួយម៉ោង ($/h)។'
        },
        {
          title: 'មើល និងបោះពុម្ពប័ណ្ណបើកប្រាក់ឈ្នួលលម្អិត (Payslip)',
          desc: 'ចុចប៊ូតុង "Breakdown" លើជួរឈ្មោះគ្រូនីមួយៗ ដើម្បីពិនិត្យលម្អិតគ្រប់ម៉ោងដែលបានបង្រៀន កាលបរិច្ឆេទ បន្ទប់ និងប្រាក់ឈ្នួលទទួលបាន។',
          tip: 'ចុច "បោះពុម្ពប័ណ្ណបើកប្រាក់" ក្នុងផ្ទាំងនោះ ដើម្បីចេញប័ណ្ណផ្លូវការជូនគ្រូ។'
        },
        {
          title: 'ទាញយកឯកសារ CSV / Excel សម្រាប់គណនេយ្យ',
          desc: 'ចុចប៊ូតុង "Export Wage CSV" ដើម្បីទាញយកតារាងទិន្នន័យសម្រាប់ផ្នែកគណនេយ្យ និងបើកប្រាក់បៀវត្ស។',
          tip: 'ទិន្នន័យរួមបញ្ចូលព័ត៌មានលម្អិតពេញលេញ និងត្រឹមត្រូវ។'
        }
      ]
    },
    {
      id: 'telegram',
      titleEn: '5. Telegram Bot & Instant Alerts Setup',
      titleKm: '៥. ការកំណត់ Telegram Bot និងសារដំណឹងស្វ័យប្រវត្តិ',
      badge: 'Automation',
      icon: Send,
      descriptionEn: 'Connect your school Telegram group or channel to receive real-time notifications when teachers arrive, depart, or arrive late.',
      descriptionKm: 'ការភ្ជាប់ Telegram Bot ទៅកាន់គ្រុប ឬឆាណែលសាលា ដើម្បីទទួលដំណឹងភ្លាមៗនៅពេលគ្រូស្កេនចូល ស្កេនចេញ ឬមកយឺត។',
      stepsEn: [
        {
          title: 'Create Bot with @BotFather',
          desc: 'Open Telegram, chat with @BotFather, send /newbot, and copy the HTTP API Token provided.',
          tip: 'Example token format: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ'
        },
        {
          title: 'Get Target Group / Channel Chat ID',
          desc: 'Add your bot to your School Telegram Group as an Administrator. Obtain the Group Chat ID (e.g. -1001234567890).',
          tip: 'You can test sending a message to find your Chat ID.'
        },
        {
          title: 'Configure in Telegram Center',
          desc: 'Navigate to "Telegram Bot & Alerts" tab in the app, paste the Bot Token and Chat ID, and toggle on alert types (Check-in, Check-out, Late arrivals, Absence scanner).',
          tip: 'Click "Send Test Alert" to verify delivery immediately.'
        }
      ],
      stepsKm: [
        {
          title: 'បង្កើត Bot ជាមួយ @BotFather',
          desc: 'បើកកម្មវិធី Telegram ឆាតទៅកាន់ @BotFather ផ្ញើពាក្យ /newbot ហើយចម្លងយក HTTP API Token ដែលទទួលបាន។',
          tip: 'ទម្រង់ Token ឧទាហរណ៍៖ 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ'
        },
        {
          title: 'យក Chat ID នៃគ្រុប ឬឆាណែលសាលា',
          desc: 'ទាញ Bot ចូលទៅក្នុងគ្រុបតេឡេក្រាមសាលា ហើយកំណត់ឱ្យធ្វើជា Admin។ បន្ទាប់មកយក Chat ID នៃគ្រុប (ឧ. -1001234567890)។',
          tip: 'អាចប្រើប៊ូតុង "ផ្ញើសារសាកល្បង" ដើម្បីដឹងថាការភ្ជាប់ជោគជ័យឬអត់។'
        },
        {
          title: 'បញ្ចូលការកំណត់ក្នុងប្រព័ន្ធ',
          desc: 'ចូលទៅកាន់ផ្ទាំង "តេឡេក្រាម Bot (Telegram Center)" ដាក់ Bot Token និង Chat ID រួចបើកប្រភេទសារដំណឹងដែលចង់បាន (ស្កេនចូល ស្កេនចេញ មកយឺត ឬអវត្តមាន)។',
          tip: 'ចុចប៊ូតុង "ផ្ញើសារសាកល្បង (Test Alert)" ដើម្បីផ្ទៀងផ្ទាត់ភ្លាមៗ។'
        }
      ]
    },
    {
      id: 'staff',
      titleEn: '6. Faculty & Employee Staff Profiles',
      titleKm: '៦. ការគ្រប់គ្រងព័ត៌មានគ្រូបង្រៀន និងបុគ្គលិក',
      badge: 'HR / Records',
      icon: Users,
      descriptionEn: 'Adding and editing teacher credentials, subjects, departments, hourly wage rates, and contact info.',
      descriptionKm: 'ការបន្ថែម និងកែប្រែប្រវត្តិរូបគ្រូ មុខវិជ្ជាបង្រៀន ផ្នែក អត្រាកម្រៃបង្រៀនក្នុងមួយម៉ោង និងទំនាក់ទំនង។',
      stepsEn: [
        {
          title: 'Add New Teacher / Staff Profile',
          desc: 'Click "+ Add Teacher" in Teacher Management. Fill in English Name, Khmer Name, Teacher ID, Department, Position, and Base Hourly Rate ($/hr).',
          tip: 'Hourly rate is used to calculate teaching compensation in reports.'
        },
        {
          title: 'Assign RFID / Barcode Card & Photo',
          desc: 'You can assign an ID badge code for barcode scanning in the kiosk terminal and upload or link a profile picture.',
          tip: 'Supports camera and image URL.'
        },
        {
          title: 'CSV Import & Export',
          desc: 'Bulk import entire faculty rosters using CSV format, or export the roster with contact information for administrative records.',
          tip: 'UTF-8 format supports Khmer script smoothly.'
        }
      ],
      stepsKm: [
        {
          title: 'បន្ថែមព័ត៌មានគ្រូ ឬបុគ្គលិកថ្មី',
          desc: 'ចុចប៊ូតុង "+ បន្ថែមគ្រូ" ក្នុងទំព័រគ្រប់គ្រងគ្រូ។ បំពេញឈ្មោះឡាតាំង ឈ្មោះខ្មែរ លេខកូដគ្រូ ផ្នែក តួនាទី និងអត្រាកម្រៃក្នុងមួយម៉ោង ($/h)។',
          tip: 'អត្រាកម្រៃក្នុងមួយម៉ោង នឹងត្រូវយកទៅគណនាប្រាក់ឈ្នួលបង្រៀនក្នុងរបាយការណ៍។'
        },
        {
          title: 'កំណត់កាតបាកូដ និងរូបថត',
          desc: 'អាចបញ្ចូលលេខកូដកាតសម្គាល់សម្រាប់ការស្កេនបាកូដ និងដាក់រូបថតប្រវត្តិរូបរបស់គ្រូ។',
          tip: 'ងាយស្រួលស្កេនវត្តមានរហ័សនៅចំណុចស្កេន។'
        },
        {
          title: 'នាំចូល និងទាញយកទិន្នន័យ (CSV)',
          desc: 'អាចនាំចូលបញ្ជីគ្រូច្រើននាក់ក្នុងពេលតែមួយតាមរយៈឯកសារ CSV ឬទាញយករបាយការណ៍បុគ្គលិក។',
          tip: 'គាំទ្រអក្សរខ្មែរបានយ៉ាងត្រឹមត្រូវ ១០០%។'
        }
      ]
    },
    {
      id: 'settings',
      titleEn: '7. Organization & Geofence Policy Configuration',
      titleKm: '៧. ការកំណត់ស្ថាប័ន និងគោលការណ៍ទីតាំង GPS',
      badge: 'Administration',
      icon: ShieldCheck,
      descriptionEn: 'Customizing school branding, Khmer institution name, grace periods, and physical campus coordinates.',
      descriptionKm: 'ការកែសម្រួលឈ្មោះសាលា (ខ្មែរ/អង់គ្លេស) រយៈពេលអនុគ្រោះ និងកូអរដោនេទីតាំងបរិវេណសាលា។',
      stepsEn: [
        {
          title: 'Set School Name (English & Khmer)',
          desc: 'In System Settings, edit "Organization Name (English)" and "Khmer Name". Changes synchronize across all printable reports, headers, and screens in real time.',
          tip: 'Saved permanently to Cloud Firestore.'
        },
        {
          title: 'Configure Attendance Policy',
          desc: 'Set the Default Grace Period (e.g. 15 minutes) and Absence Scanner Threshold (e.g. 60 minutes after start time).',
          tip: 'Staff checking in within the grace period are marked Present without penalty.'
        },
        {
          title: 'Configure GPS Geofencing Perimeter',
          desc: 'Enter Campus Latitude, Longitude, and authorized radius (e.g. 500m). Toggle "Enforce Campus GPS Geofence" to activate strict mobile proximity enforcement.',
          tip: 'When enabled, scans from outside the authorized boundary are immediately denied.'
        }
      ],
      stepsKm: [
        {
          title: 'កំណត់ឈ្មោះសាលា (ភាសាខ្មែរ និងអង់គ្លេស)',
          desc: 'នៅក្នុង "ការកំណត់ប្រព័ន្ធ (System Settings)" កែប្រែឈ្មោះស្ថាប័នជាភាសាខ្មែរ និងអង់គ្លេស។ ព័ត៌មាននឹងត្រូវធ្វើបច្ចុប្បន្នភាពលើគ្រប់ទំព័រ និងរបាយការណ៍ទាំងអស់។',
          tip: 'ទិន្នន័យរក្សាទុកនៅលើ Cloud Firestore ដោយសុវត្ថិភាព។'
        },
        {
          title: 'កំណត់គោលការណ៍វត្តមាន និងម៉ោងអនុគ្រោះ',
          desc: 'កំណត់រយៈពេលអនុគ្រោះ (ឧ. ១៥នាទី) និងរយៈពេលស្កេនរកអ្នកអវត្តមាន (ឧ. ៦០នាទី ក្រោយម៉ោងចូល)។',
          tip: 'អ្នកដែលមកដល់ក្នុងរយៈពេលអនុគ្រោះ នឹងត្រូវចាត់ទុកថា "មានវត្តមាន (Present)" មិនរាប់ថាយឺតឡើយ។'
        },
        {
          title: 'កំណត់ទីតាំង GPS បរិវេណសាលា',
          desc: 'បញ្ចូលកូអរដោនេ Latitude, Longitude និងកាំអនុញ្ញាត (ឧ. ៥០០ម៉ែត្រ)។ បើកមុខងារ "Enforce Campus GPS Geofence" ដើម្បីកំហិតទីតាំង។',
          tip: 'នៅពេលបើកដំណើរការ អ្នកនៅក្រៅបរិវេណសាលានឹងមិនអាចស្កេនចូលបានឡើយ។'
        }
      ]
    },
    {
      id: 'auth',
      titleEn: '8. Sign-in, User Accounts & Roles (RBAC)',
      titleKm: '៨. ការចូលប្រើប្រព័ន្ធ គណនី និងសិទ្ធិអនុញ្ញាត',
      badge: 'Security',
      icon: Lock,
      descriptionEn: 'How to sign in with Google or Staff ID, and how role permissions control feature access.',
      descriptionKm: 'ការចូលប្រើប្រព័ន្ធតាមរយៈ Google ឬលេខកូដសម្គាល់ និងការគ្រប់គ្រងសិទ្ធិតាមតួនាទី។',
      stepsEn: [
        {
          title: 'Signing In with Google',
          desc: 'Click "Continue with Google Account" on the login page for instant, secure authentication via Firebase Auth.',
          tip: 'Your institutional or personal Google email is supported.'
        },
        {
          title: 'Signing In with Staff ID / Email',
          desc: 'Enter your teacher code (e.g. TCH-2026-001) or email. Any password is accepted for testing mode.',
          tip: 'Teachers can clock in directly at the kiosk terminal without signing in with a password.'
        },
        {
          title: 'Role-Based Access Control (RBAC)',
          desc: 'Roles include Super Admin, Admin/HR, Supervisor, Teacher, and Employee. In User Management, administrators can customize permissions granularly.',
          tip: 'Supervisors can only view and manage staff within their assigned department.'
        }
      ],
      stepsKm: [
        {
          title: 'ការចូលប្រើតាមរយៈគណនី Google',
          desc: 'ចុចប៊ូតុង "Continue with Google Account" នៅលើទំព័រ Login ដើម្បីចូលប្រើប្រព័ន្ធភ្លាមៗដោយសុវត្ថិភាព។',
          tip: 'គាំទ្រអ៊ីមែល Google ផ្ទាល់ខ្លួន ឬអ៊ីមែលរបស់សាលា។'
        },
        {
          title: 'ការចូលប្រើតាមរយៈលេខសម្គាល់ ឬអ៊ីមែល',
          desc: 'បញ្ចូលលេខកូដសម្គាល់គ្រូ (ឧ. TCH-2026-001) ឬអ៊ីមែល។ អាចវាយពាក្យសម្ងាត់ណាមួយក៏បានសម្រាប់ដំណើរការសាកល្បង។',
          tip: 'គ្រូបង្រៀនអាចស្កេនវត្តមាននៅចំណុចស្កេន Kiosk ដោយផ្ទាល់ ដោយមិនចាំបាច់វាយពាក្យសម្ងាត់ឡើយ។'
        },
        {
          title: 'ការកំណត់សិទ្ធិតាមតួនាទី (RBAC)',
          desc: 'តួនាទីរួមមាន៖ Super Admin, Admin/HR, Supervisor, Teacher, និង Employee។ អ្នកគ្រប់គ្រងអាចកែសម្រួលសិទ្ធិលម្អិតក្នុងទំព័រ User Management។',
          tip: 'ប្រធានដេប៉ាតឺម៉ង់ (Supervisor) អាចមើលឃើញតែបុគ្គលិកក្នុងផ្នែករបស់ខ្លួនប៉ុណ្ណោះ។'
        }
      ]
    },
    {
      id: 'pwa-install',
      titleEn: '9. Install App to Mobile Home Screen (PWA)',
      titleKm: '៩. ដំឡើងកម្មវិធីលើអេក្រង់ទូរស័ព្ទ (PWA)',
      badge: 'Mobile PWA',
      icon: Smartphone,
      descriptionEn: 'How to install EduTrack directly onto iPhone (iOS Safari) or Android (Chrome) home screen for fast 1-tap full-screen access without app stores.',
      descriptionKm: 'ការណែនាំអំពីរបៀបដំឡើង EduTrack លើអេក្រង់ដើមនៃទូរស័ព្ទដៃ iPhone និង Android ដើម្បីប្រើប្រាស់ដូចកម្មវិធីទូរស័ព្ទពិតប្រាកដ ដោយមិនបាច់ចូល App Store ឬ Play Store។',
      stepsEn: [
        {
          title: 'Opening Browser & Entering Web Link (https://edutrack.edu.kh)',
          desc: '1. Open Google Chrome on Android/PC or Safari on iPhone. 2. Tap the top URL address bar. 3. Type or paste the school portal link: https://edutrack.edu.kh. 4. Tap Enter/Go to load the portal.',
          tip: 'Ensure the secure padlock 🔒 (HTTPS) appears for verified encrypted privacy.'
        },
        {
          title: 'First-Login Popup Alert & In-App Guide',
          desc: 'When staff or teachers first sign in on a mobile browser, an automatic popup alert welcomes them to install EduTrack directly to their home screen with 1 tap.',
          tip: 'Opens fullscreen like an installed native app with offline caching and schedule alerts.'
        },
        {
          title: 'iPhone & iPad Installation (Safari)',
          desc: '1. Open EduTrack in Safari. 2. Tap the Share button (⎋) at the bottom toolbar. 3. Scroll down and tap "Add to Home Screen". 4. Tap "Add" in the top right corner.',
          tip: 'An EduTrack icon will appear on your phone home screen immediately.'
        },
        {
          title: 'Android & Samsung Internet Installation',
          desc: '1. Open EduTrack in Chrome. 2. Tap the three dots (⋮) in the top-right corner. 3. Select "Install app" or "Add to Home screen". 4. Confirm to complete.',
          tip: 'Ultra lightweight, takes less than 2MB of phone storage.'
        }
      ],
      stepsKm: [
        {
          title: 'ការបើកកម្មវិធីរុករក & វាយបញ្ចូលតំណភ្ជាប់ (https://edutrack.edu.kh)',
          desc: '១. បើកកម្មវិធី Google Chrome (លើ Android/PC) ឬ Safari (លើ iPhone/iPad)។ ២. ចុចលើរបារអាសយដ្ឋាន URL ខាងលើ។ ៣. វាយបញ្ចូល ឬបិទភ្ជាប់តំណភ្ជាប់សាលា៖ https://edutrack.edu.kh។ ៤. ចុច Go ឬ Enter ដើម្បីចូលប្រព័ន្ធ។',
          tip: 'ពិនិត្យមើលរូបសោរ 🔒 (HTTPS) ដើម្បីធានាសុវត្ថិភាពទិន្នន័យ និងការការពារកម្រិតខ្ពស់។'
        },
        {
          title: 'ផ្ទាំង Alert ដំឡើងស្វ័យប្រវត្តពេលចូលដំបូង',
          desc: 'នៅពេលគ្រូ ឬបុគ្គលិកចូលប្រើលើកដំបូងតាមទូរស័ព្ទដៃ ប្រព័ន្ធនឹងបង្ហាញផ្ទាំង Alert ស្វាគមន៍ដោយស្វ័យប្រវត្ត ដើម្បីឱ្យលោកអ្នកដំឡើង App លើអេក្រង់ដើមដោយចុចតែម្តង។',
          tip: 'ដំណើរការពេញអេក្រង់ និងគាំទ្រការប្រើប្រាស់ Offline។'
        },
        {
          title: 'សម្រាប់ទូរស័ព្ទ iPhone & iPad (Safari)',
          desc: '១. បើកតំណភ្ជាប់ក្នុង Safari។ ២. ចុចប៊ូតុង Share (សញ្ញាប្រអប់មានព្រួញឡើងលើ ⎋) នៅរបារខាងក្រោម។ ៣. រំកិលចុះក្រោម រួចចុច "Add to Home Screen (បន្ថែមទៅអេក្រង់ដើម)"។ ៤. ចុច "Add" នៅជ្រុងខាងស្តាំលើ។',
          tip: 'រូបតំណាង EduTrack នឹងបង្ហាញលើអេក្រង់ទូរស័ព្ទភ្លាមៗ។'
        },
        {
          title: 'សម្រាប់ទូរស័ព្ទ Android (Chrome / Samsung)',
          desc: '១. បើកកម្មវិធីក្នុង Chrome។ ២. ចុចសញ្ញាចុចបី (⋮) នៅជ្រុងខាងស្តាំលើ។ ៣. ជ្រើសយក "Install app" ឬ "បន្ថែមទៅអេក្រង់ដើម"។ ៤. ចុចបញ្ជាក់ Install។',
          tip: 'ទំហំតូចក្រោម 2MB មិនស៊ីមេម៉ូរីទូរស័ព្ទឡើយ។'
        }
      ]
    },
    {
      id: 'schedule-alerts',
      titleEn: '10. Teacher Schedule Alerts Before Start & End',
      titleKm: '១០. ការដាស់តឿនគ្រូមុនម៉ោងបង្រៀនចូល និងចេញ',
      badge: 'Automated Alerts',
      icon: Bell,
      descriptionEn: 'How EduTrack alerts teachers automatically before their scheduled class starts and ends via Audio Bell Chimes, Web Push Notifications, In-App Countdown Banners, and Telegram Bot Dispatches.',
      descriptionKm: 'របៀបដែលប្រព័ន្ធ EduTrack ផ្ញើសារ និងបន្លឺសម្លេងរោទ៍ដាស់តឿនគ្រូបង្រៀនមុនម៉ោងចូលបង្រៀន និងមុនម៉ោងបញ្ចប់ តាមរយៈកណ្ដឹងសម្លេង ការជូនដំណឹងលើទូរស័ព្ទ (Web Push) ផ្ទាំងរាប់ថយក្រោយលើអេក្រង់ និងសារ Telegram Bot។',
      stepsEn: [
        {
          title: '1. In-App Audio Bell Chimes (100% Offline Synthesizer)',
          desc: 'The system plays a clear, melodic synthesizer bell chime (C5-E5-G5) 5-15 minutes before class begins, and a gentle wrap-up chime (G5-E5) 3-5 minutes before class ends. Teachers can mute or preview the sounds in their schedule banner.',
          tip: 'Synthesized via HTML5 Web Audio API, so it rings reliably without needing external audio downloads.'
        },
        {
          title: '2. Mobile & Desktop Web Push Notifications',
          desc: 'When using the installed PWA or browser, teachers receive system push notifications even if the phone screen is locked: "🔔 Class Reminder: Grade 12A Math starts in 10 mins at Room 204".',
          tip: 'Tap "Enable" on the alert settings widget to grant notification permission.'
        },
        {
          title: '3. Real-Time Countdown & Quick Check-in Banner',
          desc: 'A persistent status banner appears atop the teacher schedule and home screen displaying exact minutes remaining until the next class or until class conclusion, complete with 1-tap "Check-in" and "Check-out" buttons.',
          tip: 'Shows exact room number, subject name, class grade, and scheduled time window.'
        },
        {
          title: '4. Automated Telegram Bot Direct Alerts',
          desc: 'If Telegram Bot alerts are enabled, the server dispatches a personal schedule reminder to the teacher or department group chat with subject details, room assignment, and attendance check-in instructions.',
          tip: 'Teachers can also message the bot commands like /myschedule and /status anytime.'
        }
      ],
      stepsKm: [
        {
          title: '១. សម្លេងរោទ៍កណ្ដឹងក្នុងប្រព័ន្ធ (Audio Chimes)',
          desc: 'ប្រព័ន្ធបន្លឺសម្លេងកណ្ដឹងពិរោះរណ្តំ ៥ ទៅ ១៥ នាទីមុនម៉ោងបង្រៀនចូល និងសម្លេងរំលឹកបិទបញ្ចប់ ៣ ទៅ ៥ នាទីមុនម៉ោងចប់។ គ្រូអាចបើក/បិទ ឬសាកល្បងសម្លេងបានដោយផ្ទាល់។',
          tip: 'ដំណើរការតាមបច្ចេកវិទ្យា Web Audio API មិនត្រូវការទាញយកឯកសារសម្លេងពីក្រៅឡើយ។'
        },
        {
          title: '២. ការជូនដំណឹងលើអេក្រង់ទូរស័ព្ទ (Web Push Notifications)',
          desc: 'នៅពេលដំឡើង App រួច គ្រូនឹងទទួលបាន Notification លើអេក្រង់ទូរស័ព្ទ ទោះបីកំពុងចាក់សោទូរស័ព្ទ ឬបិទកម្មវិធីក៏ដោយ ដូចជា៖ "🔔 រំលឹកម៉ោងបង្រៀន៖ គណិតវិទ្យា ថ្នាក់ ១២A នឹងចាប់ផ្តើមក្នុង 10 នាទីទៀតនៅបន្ទប់ 204"។',
          tip: 'ចុចប៊ូតុង "បើក" លើផ្ទាំងកំណត់ការដាស់តឿនដើម្បីអនុញ្ញាត។'
        },
        {
          title: '៣. ផ្ទាំងរាប់ថយក្រោយ និងប៊ូតុងស្កេនវត្តមានរហ័ស',
          desc: 'ផ្ទាំងពណ៌ស្អាតនៅផ្នែកខាងលើនៃទំព័រកាលវិភាគបង្ហាញចំនួននាទីដែលនៅសល់មុនពេលចាប់ផ្តើម ឬបញ្ចប់ ព្រមទាំងប៊ូតុង "ស្កេនវត្តមាន" ឬ "ស្កេនចេញ" ដោយចុចតែម្តង។',
          tip: 'បង្ហាញច្បាស់លាស់នូវលេខបន្ទប់ ឈ្មោះមុខវិជ្ជា និងថ្នាក់រៀន។'
        },
        {
          title: '៤. ការផ្ញើសាររំលឹកស្វ័យប្រវត្តិតាម Telegram Bot',
          desc: 'ប្រព័ន្ធនឹងផ្ញើសាររំលឹកកាលវិភាគទៅកាន់ Telegram ផ្ទាល់ខ្លួនរបស់គ្រូ ឬគ្រុប Telegram ដេប៉ាតឺម៉ង់ មុនម៉ោងបង្រៀនចូល។',
          tip: 'គ្រូអាចវាយបញ្ជា /myschedule ឬ /status ទៅកាន់ Bot ដើម្បីឆែកកាលវិភាគគ្រប់ពេល។'
        }
      ],
      faqEn: [
        {
          q: 'Can a teacher change how many minutes before class the alert sounds?',
          a: 'Yes. In the Schedule Alert widget at the top of the schedule, click the Settings (gear/sliders) icon. Teachers can select 5, 10, or 15 minutes before class start, and 3, 5, or 10 minutes before class ends.'
        },
        {
          q: 'Will alerts work if the phone screen is turned off?',
          a: 'Yes! Once you install EduTrack to your home screen (PWA) and click "Enable Notifications", your mobile OS delivers Web Push notifications directly to your lock screen and notification shade.'
        }
      ],
      faqKm: [
        {
          q: 'តើគ្រូអាចកំណត់ចំនួននាទីដាស់តឿនមុនម៉ោងបង្រៀនបានទេ?',
          a: 'បាន! គ្រូគ្រាន់តែចុចលើរូបសញ្ញាកំណត់ (Settings) នៅលើផ្ទាំង Schedule Alert រួចរើស ៥, ១០ ឬ ១៥ នាទីមុនម៉ោងចូល និង ៣, ៥ ឬ ១០ នាទីមុនម៉ោងចេញ។'
        },
        {
          q: 'តើការដាស់តឿនដំណើរការទេពេលបិទអេក្រង់ទូរស័ព្ទ?',
          a: 'ដំណើរការ! នៅពេលដំឡើង App លើទូរស័ព្ទ (PWA) រួចចុច "បើកការជូនដំណឹង" ទូរស័ព្ទនឹងលោត Push Notification លើ Lock Screen ដូចកម្មវិធីទូរស័ព្ទដទៃទៀត។'
        }
      ]
    },
    {
      id: 'leave-requests',
      titleEn: '11. Leave Requests by Hours or Full Days & Approvals',
      titleKm: '១១. ការស្នើសុំច្បាប់ជាម៉ោង ឬជាថ្ងៃពេញ និងការអនុម័តច្បាប់',
      badge: 'Leave Policy',
      icon: CalendarCheck,
      descriptionEn: 'Apply for leave flexibly by exact hours (e.g., 2 hours: 08:00 - 10:00) or full days. The system automatically cross-references scheduled teaching sessions, routes requests to department supervisors, logs leave attendance upon approval, and updates the 31-day sheet and personal monthly calendar.',
      descriptionKm: 'ការស្នើសុំច្បាប់ឈប់សម្រាកបត់បែនជាម៉ោង (ឧ. ២ ម៉ោង៖ ០៨:០០-១០:០០) ឬជាថ្ងៃពេញ។ ប្រព័ន្ធផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិនូវម៉ោងបង្រៀនជាក់ស្តែង បញ្ជូនទៅប្រធានដេប៉ាតឺម៉ង់ពិនិត្យអនុម័ត កត់ត្រាអវត្តមានស្វ័យប្រវត្តលើតារាងវត្តមាន ៣១ថ្ងៃ និងប្រតិទិនបុគ្គលិក។',
      stepsEn: [
        {
          title: '1. Select Leave Duration Mode: By Hours or Full Days',
          desc: 'Click "+ Apply for Leave" in the Leave Requests tab. Toggle between "⏱️ By Hours" (partial day) or "📅 Full Days".',
          tip: 'Hourly leave is ideal for medical visits, family errands, or official school missions during specific teaching periods.'
        },
        {
          title: '2. Set Date & Exact Hours with Quick Presets',
          desc: 'Choose your date and input Start Time & End Time. Use quick buttons (1 hr, 1.5 hrs, 2 hrs, 3 hrs, Half Day 4h). The system computes exact duration automatically.',
          tip: 'The form displays any class sessions scheduled on that day to prevent timetable conflicts.'
        },
        {
          title: '3. Select Category & Submit Reason',
          desc: 'Choose from Annual Leave, Sick Leave, Personal Leave, Maternity Leave, or Other Duty. Enter a clear explanation for supervisor review.',
          tip: 'Submissions are instantly timestamped with status "Pending Review".'
        },
        {
          title: '4. Supervisor Approval & Auto-Attendance Logging',
          desc: 'Supervisors approve or reject with 1 click. When approved, EduTrack automatically logs leave status for only the affected timetable classes, dispatches Telegram alerts with exact hours, and updates the 31-day sheet.',
          tip: 'Classes outside the leave time window remain active so the teacher can teach and check in normally for the rest of the day.'
        }
      ],
      stepsKm: [
        {
          title: '១. ជ្រើសរើសទម្រង់សុំច្បាប់៖ ជាម៉ោង ឬជាថ្ងៃពេញ',
          desc: 'ចុចប៊ូតុង "+ ស្នើសុំច្បាប់ថ្មី" ក្នុងទំព័រច្បាប់ឈប់សម្រាក។ អ្នកអាចជ្រើសរើស "⏱️ ជាម៉ោង (By Hours)" ឬ "📅 ជាថ្ងៃពេញ (Full Days)"។',
          tip: 'ការសុំច្បាប់ជាម៉ោងស័ក្តិសមបំផុតសម្រាប់ពិនិត្យសុខភាព ឬធុរៈផ្ទាល់ខ្លួនខ្លីៗមួយចំនួនម៉ោង។'
        },
        {
          title: '២. កំណត់កាលបរិច្ឆេទ ម៉ោងចាប់ផ្តើម និងម៉ោងបញ្ចប់',
          desc: 'ជ្រើសរើសកាលបរិច្ឆេទ រួចកំណត់ម៉ោងចាប់ផ្តើម និងបញ្ចប់ ឬចុចប៊ូតុងរហ័ស (១ ម៉ោង, ១.៥ ម៉ោង, ២ ម៉ោង, ៣ ម៉ោង, កន្លះថ្ងៃ ៤ ម៉ោង)។ ប្រព័ន្ធគណនាចំនួនម៉ោងស្វ័យប្រវត្ត។',
          tip: 'ផ្ទាំងនឹងបង្ហាញបញ្ជីម៉ោងបង្រៀនដែលចំកាលបរិច្ឆេទនោះ ដើម្បីងាយស្រួលផ្ទៀងផ្ទាត់។'
        },
        {
          title: '៣. ជ្រើសរើសប្រភេទច្បាប់ និងមូលហេតុ',
          desc: 'ជ្រើសរើស៖ ច្បាប់ប្រចាំឆ្នាំ, ច្បាប់ឈឺ, ច្បាប់ផ្ទាល់ខ្លួន, ច្បាប់លំហែមាតុភាព ឬធុរៈផ្សេងៗ រួចបំពេញមូលហេតុដើម្បីផ្ញើទៅប្រធានដេប៉ាតឺម៉ង់។',
          tip: 'សំណើនឹងមានស្ថានភាព "រង់ចាំពិនិត្យ (Pending Review)" ភ្លាមៗ។'
        },
        {
          title: '៤. ការអនុម័ត និងកត់ត្រាវត្តមានស្វ័យប្រវត្តក្នុងតារាង',
          desc: 'ប្រធានដេប៉ាតឺម៉ង់ចុច "អនុម័ត (Approve)"។ ប្រព័ន្ធនឹងកត់ត្រាអវត្តមានស្វ័យប្រវត្តតែលើម៉ោងបង្រៀនដែលចំម៉ោងសុំច្បាប់ប៉ុណ្ណោះ ផ្ញើសារដំណឹងទៅ Telegram និងបង្ហាញលើតារាង ៣១ថ្ងៃ និងប្រតិទិនប្រចាំខែ។',
          tip: 'ម៉ោងបង្រៀនផ្សេងទៀតក្នុងថ្ងៃដដែលនៅតែបន្តដំណើរការធម្មតា គ្រូអាចស្កេនវត្តមានបង្រៀនបាន។'
        }
      ],
      faqEn: [
        {
          q: 'Does taking 2 hours of leave mark the teacher absent for the whole day?',
          a: 'No! When using "By Hours", the system precisely marks Leave only for class sessions that fall within that time window (e.g. 08:00 - 10:00). Other morning or afternoon classes remain completely unaffected and count toward regular presence.'
        },
        {
          q: 'Where do teachers and managers see approved hourly leave?',
          a: 'Approved hourly leave appears in the Leave Requests table (with exact hours count and badge), on the Monthly Presence Calendar (e.g. ⏱️ 2h Hourly Leave 08:00-10:00), and on the 31-Day Attendance Sheet.'
        }
      ],
      faqKm: [
        {
          q: 'តើការសុំច្បាប់ ២ ម៉ោង ធ្វើឱ្យខកខានវត្តមានពេញមួយថ្ងៃទេ?',
          a: 'មិនទេ! នៅពេលជ្រើសរើស "ជាម៉ោង (By Hours)" ប្រព័ន្ធកត់ត្រាច្បាប់តែលើម៉ោងបង្រៀនដែលចំចន្លោះម៉ោងសុំច្បាប់ប៉ុណ្ណោះ (ឧ. ០៨:០០-១០:០០)។ ម៉ោងបង្រៀនដទៃទៀតក្នុងថ្ងៃដដែលនៅតែដំណើរការធម្មតា។'
        },
        {
          q: 'តើអាចមើលឃើញច្បាប់ជាម៉ោងនៅកន្លែងណាខ្លះ?',
          a: 'ច្បាប់ជាម៉ោងបង្ហាញក្នុងតារាងគ្រប់គ្រងច្បាប់ (បង្ហាញចំនួនម៉ោង និងចន្លោះម៉ោងច្បាស់លាស់), លើប្រតិទិនវត្តមានប្រចាំខែ (ឧ. ⏱️ ២ម៉ោង ០៨:០០-១០:០០) និងលើតារាងវត្តមាន ៣១ ថ្ងៃ។'
        }
      ]
    }
  ];

  // Filtering sections by search query
  const filteredSections = manualSections.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.titleEn.toLowerCase().includes(q) ||
      s.titleKm.toLowerCase().includes(q) ||
      s.descriptionEn.toLowerCase().includes(q) ||
      s.descriptionKm.toLowerCase().includes(q)
    );
  });

  const activeSection = manualSections.find(s => s.id === activeSectionId) || manualSections[0];

  const handlePrintManual = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'សៀវភៅណែនាំផ្លូវការ' : 'Official System Manual'}</span>
            </span>
            <span className="text-xs text-slate-400">
              {isKhmer ? 'ភាសាខ្មែរ • English Guide' : 'Bilingual Documentation'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isKhmer ? 'សៀវភៅណែនាំការប្រើប្រាស់ប្រព័ន្ធ EduTrack' : 'EduTrack System User Manual & Guide'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-medium">
            {isKhmer
              ? 'ការណែនាំលម្អិតពីរបៀបវាយតំណភ្ជាប់លើ Browser ស្កេនវត្តមាន កាលវិភាគបង្រៀន គណនាប្រាក់ឈ្នួលគ្រូ និងតេឡេក្រាម Bot។'
              : 'Complete walkthrough for opening browser, entering school link, teacher PIN login, daily class schedule check-in, GPS attendance, and payroll.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          
          {/* Language Display Selector */}
          <div className="bg-slate-800/80 p-1 rounded-2xl border border-slate-700 flex items-center text-xs font-bold">
            <button
              onClick={() => setActiveLangMode('km')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeLangMode === 'km'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🇰🇭 ខ្មែរ
            </button>
            <button
              onClick={() => setActiveLangMode('en')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeLangMode === 'en'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => setActiveLangMode('both')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeLangMode === 'both'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🌐 Both / ទាំងពីរ
            </button>
          </div>

          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            title={isKhmer ? 'ទាញយកវីដេអូណែនាំសម្រាប់គ្រូ (Full HD 1080p)' : 'Download Teacher Video Manual (Full HD 1080p)'}
          >
            <Video className="w-4 h-4 text-white" />
            <span>{isKhmer ? 'វីដេអូណែនាំ (Video Manual)' : 'Video Manual (MP4)'}</span>
          </button>

          <button
            onClick={handlePrintManual}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>{isKhmer ? 'បោះពុម្ពសៀវភៅណែនាំ' : 'Print User Manual'}</span>
          </button>
        </div>
      </div>

      {/* Primary Mode Selector: Live System Pages vs Written Documentation */}
      <div className="bg-slate-900 p-2 rounded-3xl border border-slate-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setManualViewMode('interactive_pages')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              manualViewMode === 'interactive_pages'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{isKhmer ? '💻 ទំព័រជាក់ស្តែងក្នុងប្រព័ន្ធ (Live System Pages)' : '💻 Live System Pages Walkthrough'}</span>
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider font-extrabold">
              100% Real
            </span>
          </button>

          <button
            onClick={() => setManualViewMode('documentation')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              manualViewMode === 'documentation'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{isKhmer ? '📖 សៀវភៅណែនាំផ្លូវការ (Detailed Guide)' : '📖 Detailed User Documentation'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{isKhmer ? 'ប្រព័ន្ធផ្ទាល់ អាចចុចសាកល្បងបានគ្រប់ទំព័រ' : 'Interactive & Real Live Application'}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODE A: LIVE SYSTEM PAGES WALKTHROUGH EMBEDDED IN MANUAL */}
      {/* ======================================================== */}
      {manualViewMode === 'interactive_pages' ? (
        <div className="space-y-4 animate-in fade-in">
          {/* Quick Explanatory Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-lg shrink-0">
                🌐
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  {isKhmer ? 'ទំព័រជាក់ស្តែងក្នុងប្រព័ន្ធ សម្រាប់គ្រូបង្រៀន (Live Authentic Interface)' : 'Real System Interface Walkthrough for Teachers'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isKhmer
                    ? 'ចុចលើម៉ូឌុលខាងក្រោមដើម្បីមើលរបៀបវាយតំណភ្ជាប់ Browser, ចូលគណនី, កាលវិភាគបង្រៀន និងស្កេនចូល-ចេញ។'
                    : 'Click modules below to inspect web browser URL entry, PIN login, schedule check-in/out, and kiosk attendance.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isKhmer ? 'មើលពេញអេក្រង់ (Fullscreen)' : 'Open Fullscreen'}</span>
              </button>
            </div>
          </div>

          {/* Embedded Real Interface Action Walkthrough */}
          <div className="h-[780px] w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-950">
            <RealInterfaceActionWalkthrough
              initialModule={1}
              onDownloadRequested={() => setIsVideoModalOpen(true)}
              onSwitchToVideoPlayer={() => setIsVideoModalOpen(true)}
              onClose={() => setManualViewMode('documentation')}
            />
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* MODE B: DETAILED DOCUMENTATION & BROWSER LINK SIMULATOR */
        /* ======================================================== */
        <div className="space-y-6 animate-in fade-in">
          {/* Top Interactive Browser Link Simulator (Always accessible) */}
          <WebBrowserLinkSimulator
            onExplorePages={() => setManualViewMode('interactive_pages')}
          />

          {/* Quick Search & Summary Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isKhmer ? 'ស្វែងរកមេរៀនណែនាំ (ឧ. វាយតំណភ្ជាប់, ស្កេនវត្តមាន)...' : 'Search user manual guides...'}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>{manualSections.length} Comprehensive Modules</span>
              <span>•</span>
              <span className="text-indigo-600 font-extrabold">Bilingual Khmer/English</span>
            </div>
          </div>

          {/* Main Documentation Layout: Sidebar + Reader View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Navigation Sidebar of Modules */}
            <div className="lg:col-span-4 space-y-2 print:hidden">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-3 space-y-1.5">
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {isKhmer ? 'ជំពូក និងប្រធានបទ' : 'Table of Contents'}
                </div>

                {filteredSections.map(sec => {
                  const IconComp = sec.icon;
                  const isSelected = sec.id === activeSection.id;

                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSectionId(sec.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-bold truncate block ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {isKhmer ? sec.titleKm : sec.titleEn}
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {sec.badge}
                          </span>
                        </div>

                        <p className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400 font-khmer'}`}>
                          {isKhmer ? sec.titleEn : sec.titleKm}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Support Card */}
              <div className="bg-indigo-50/70 rounded-3xl p-5 border border-indigo-100 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>{isKhmer ? 'ជំនួយបច្ចេកទេស' : 'Institutional Assistance'}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {isKhmer
                    ? 'ប្រសិនបើត្រូវការជំនួយបន្ថែម ឬកំណត់ទីតាំង GPS សាលា សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ (Super Administrator)។'
                    : 'Need help onboarding staff or calibrating GPS boundary? Contact your system super administrator.'}
                </p>
              </div>
            </div>

            {/* Reader Display Panel */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-8">
              
              {/* Module Title Header */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                    {activeSection.badge}
                  </span>
                  <span className="text-xs text-slate-400">Chapter Guide</span>
                </div>

                {(activeLangMode === 'km' || activeLangMode === 'both') && (
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-khmer leading-snug">
                    {activeSection.titleKm}
                  </h2>
                )}

                {(activeLangMode === 'en' || activeLangMode === 'both') && (
                  <h3 className="text-lg sm:text-xl font-bold text-indigo-900 mt-1">
                    {activeSection.titleEn}
                  </h3>
                )}

                <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                  {activeLangMode === 'km' && activeSection.descriptionKm}
                  {activeLangMode === 'en' && activeSection.descriptionEn}
                  {activeLangMode === 'both' && (
                    <>
                      <span className="block font-khmer text-slate-800">{activeSection.descriptionKm}</span>
                      <span className="block text-slate-500 mt-1">{activeSection.descriptionEn}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isKhmer ? 'ជំហាននៃការអនុវត្តជាក់ស្តែង' : 'Operational Step-by-Step Instructions'}</span>
                </h4>

                <div className="space-y-4">
                  {activeSection.stepsEn.map((stepEn, idx) => {
                    const stepKm = activeSection.stepsKm[idx] || stepEn;

                    return (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2.5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            {idx + 1}
                          </div>
                          
                          <div className="space-y-1 flex-1 min-w-0">
                            {(activeLangMode === 'km' || activeLangMode === 'both') && (
                              <h5 className="text-sm font-extrabold text-slate-900 font-khmer">
                                {stepKm.title}
                              </h5>
                            )}
                            {(activeLangMode === 'en' || activeLangMode === 'both') && (
                              <h6 className="text-xs font-bold text-indigo-950">
                                {stepEn.title}
                              </h6>
                            )}

                            <p className="text-xs text-slate-600 leading-relaxed pt-1">
                              {activeLangMode === 'km' && stepKm.desc}
                              {activeLangMode === 'en' && stepEn.desc}
                              {activeLangMode === 'both' && (
                                <>
                                  <span className="block font-khmer text-slate-700">{stepKm.desc}</span>
                                  <span className="block text-slate-500 mt-1">{stepEn.desc}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {(stepKm.tip || stepEn.tip) && (
                          <div className="ml-10 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold mr-1">{isKhmer ? 'ចំណាំ៖' : 'Pro Tip:'}</span>
                              <span>{isKhmer ? (stepKm.tip || stepEn.tip) : (stepEn.tip || stepKm.tip)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Install Action if viewing the PWA Install module or Browser entry */}
              {(activeSection.id === 'pwa-install' || activeSection.id === 'browser-entry') && (
                <div className="pt-2">
                  <PWAInstallButton variant="banner" />
                </div>
              )}

              {/* Interactive Audio Bell Test if viewing Schedule Alerts module */}
              {activeSection.id === 'schedule-alerts' && (
                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-indigo-600" />
                      <span className="font-bold text-xs sm:text-sm text-indigo-950">
                        {isKhmer ? 'សាកល្បងសម្លេងកណ្ដឹងរោទ៍កាលវិភាគផ្ទាល់' : 'Test Real-Time Schedule Chimes'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-800">
                      Web Audio Synthesizer
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isKhmer
                      ? 'ចុចប៊ូតុងខាងក្រោមដើម្បីស្តាប់សម្លេងកណ្ដឹងដែលប្រព័ន្ធនឹងបន្លឺឡើងមុនម៉ោងបង្រៀនចូល និងមុនម៉ោងចេញ៖'
                      : 'Click below to preview the melodic chimes triggered by the system before class starts and ends:'}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <button
                      onClick={() => ScheduleAlertService.playStartAlertSound()}
                      className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{isKhmer ? '🔔 សម្លេងមុនម៉ោងចូល (Start Chime)' : '🔔 Play Class Start Chime'}</span>
                    </button>
                    <button
                      onClick={() => ScheduleAlertService.playEndAlertSound()}
                      className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{isKhmer ? '⏳ សម្លេងមុនម៉ោងចេញ (Wrap-up Chime)' : '⏳ Play Class End Chime'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Frequently Asked Questions (FAQ) */}
              {((activeSection.faqKm && activeSection.faqKm.length > 0) || (activeSection.faqEn && activeSection.faqEn.length > 0)) && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                    <span>{isKhmer ? 'សំណួរដែលជួបញឹកញាប់ (FAQ)' : 'Frequently Asked Questions (FAQ)'}</span>
                  </h4>

                  <div className="space-y-3">
                    {activeSection.faqEn?.map((itemEn, fIdx) => {
                      const itemKm = activeSection.faqKm?.[fIdx] || itemEn;

                      return (
                        <div key={fIdx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
                          <div className="text-xs font-black text-slate-900 flex items-start gap-2">
                            <span className="text-indigo-600 font-mono font-bold">Q:</span>
                            <span>{isKhmer ? itemKm.q : itemEn.q}</span>
                          </div>
                          <div className="text-xs text-slate-600 pl-4.5 leading-relaxed">
                            <span className="text-emerald-600 font-bold mr-1">A:</span>
                            <span>{isKhmer ? itemKm.a : itemEn.a}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Teacher Video Manual Syllabus & Download Modal */}
      <TeacherVideoManualModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />

    </div>
  );
};
