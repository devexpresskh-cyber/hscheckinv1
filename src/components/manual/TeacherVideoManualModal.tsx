import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  Download,
  Video,
  Play,
  CheckCircle2,
  Clock,
  Smartphone,
  Lock,
  Calendar,
  MapPin,
  QrCode,
  DollarSign,
  Palmtree,
  X,
  ShieldCheck,
  Sparkles,
  MousePointer,
  Film,
  RotateCcw,
  Volume2,
  Maximize2,
  Minimize2,
  ArrowLeft
} from 'lucide-react';
import { RealInterfaceActionWalkthrough } from './RealInterfaceActionWalkthrough.tsx';

interface TeacherVideoManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialModule?: number;
}

interface VideoChapter {
  number: string;
  titleEn: string;
  titleKm: string;
  timeRange: string;
  duration: string;
  icon: React.ElementType;
  keyPointsEn: string[];
  keyPointsKm: string[];
}

export const TeacherVideoManualModal: React.FC<TeacherVideoManualModalProps> = ({
  isOpen,
  onClose,
  initialModule = 1
}) => {
  const { isKhmer } = useLanguage();
  const [activeTab, setActiveTab] = useState<'live_action' | 'video_player' | 'syllabus'>('live_action');
  const [downloadStarted, setDownloadStarted] = useState<boolean>(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Esc key listener to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleBrowserFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsBrowserFullscreen(true);
        }).catch(() => {});
      } else {
        document.exitFullscreen().then(() => {
          setIsBrowserFullscreen(false);
        }).catch(() => {});
      }
    } catch {}
  };

  const chapters: VideoChapter[] = [
    {
      number: '01',
      titleEn: 'Module 1: Opening Web Browser, Entering Link & App Installation',
      titleKm: 'ផ្នែកទី ១៖ ការបើកកម្មវិធីរុករក វាយបញ្ចូលតំណភ្ជាប់ (Web Link) & ដំឡើងកម្មវិធី',
      timeRange: '00:00 - 00:10',
      duration: '10s',
      icon: Smartphone,
      keyPointsEn: [
        'Open Google Chrome (Android/PC) or Safari (iPhone/iPad)',
        'Tap the top address bar and enter the school link: https://edutrack.edu.kh',
        'Press Enter/Go to load the official EduTrack Faculty Portal',
        'Tap "Install App" or Menu (⋮) → "Add to Home screen" for 1-tap desktop/mobile access'
      ],
      keyPointsKm: [
        'បើកកម្មវិធី Google Chrome (Android/PC) ឬ Safari (iPhone/iPad)',
        'ចុចលើរបារ URL ខាងលើ រួចវាយបញ្ចូលតំណភ្ជាប់សាលា៖ https://edutrack.edu.kh',
        'ចុច Go ឬ Enter ដើម្បីបើកទំព័រគ្រប់គ្រងការសិក្សាផ្លូវការ',
        'ចុចលើ "ដំឡើងកម្មវិធី (Install App)" ឬ Add to Home Screen ដើម្បីប្រើប្រាស់ផ្ទាល់'
      ]
    },
    {
      number: '02',
      titleEn: 'Module 2: Teacher Account Login & Security PIN',
      titleKm: 'ផ្នែកទី ២៖ ការចូលគណនីគ្រូបង្រៀន និងលេខសម្ងាត់ PIN ៤ខ្ទង់',
      timeRange: '00:10 - 00:19',
      duration: '9s',
      icon: Lock,
      keyPointsEn: [
        'Select "Teacher Login" tab on authentication screen',
        'Choose faculty name from list or enter Teacher ID (e.g., TCH-001)',
        'Enter confidential 4-digit security PIN on the on-screen keypad',
        'Strict role-based privacy: Teachers only see their assigned data'
      ],
      keyPointsKm: [
        'ជ្រើសរើសផ្ទាំង "គ្រូបង្រៀន (Teacher)" នៅទំព័រចូលគណនី',
        'ជ្រើសឈ្មោះគ្រូពីបញ្ជី ឬវាយអត្តលេខគ្រូ (ឧ. TCH-001)',
        'បញ្ចូលលេខសម្ងាត់ ៤ខ្ទង់ របស់អ្នកលើក្តារចុចលើអេក្រង់',
        'សុវត្ថិភាពខ្ពស់៖ គ្រូអាចចូលមើលបានតែទិន្នន័យផ្ទាល់ខ្លួនប៉ុណ្ណោះ'
      ]
    },
    {
      number: '03',
      titleEn: 'Module 3: Current Schedule Check-In & Check-Out Timeline',
      titleKm: 'ផ្នែកទី ៣៖ ការស្កេនចូល-ចេញ លើកាលវិភាគបង្រៀនជាក់ស្តែង',
      timeRange: '00:19 - 00:29',
      duration: '10s',
      icon: Calendar,
      keyPointsEn: [
        'Connected monthly & weekly timeline with interactive class cards',
        'Tap "Check In Class (ស្កេនចូល)" directly on current schedule to start teaching',
        'Real-time active class status: IN PROGRESS with live session timer',
        'Tap "Check Out Class (ស្កេនចេញ)" when class ends; auto-calculates verified wage hours'
      ],
      keyPointsKm: [
        'ប្រតិទិនខៀវចាស់ Midnight Navy ជាមួយរបារកាលវិភាគភ្ជាប់គ្នា និងកាតម៉ោងបង្រៀន',
        'ចុច "ស្កេនចូល (Check In)" ផ្ទាល់លើកាតម៉ោងបង្រៀន ដើម្បីចាប់ផ្តើមម៉ោងសិក្សា',
        'ស្ថានភាពកំពុងបង្រៀន (IN PROGRESS) ជាមួយនាឡិការាប់ម៉ោងជាក់ស្តែង',
        'ចុច "ស្កេនចេញ (Check Out)" ពេលចប់ម៉ោង គណនាម៉ោងបង្រៀនចូលក្នុងប្រាក់ឈ្នួលស្វ័យប្រវត្តិ'
      ]
    },
    {
      number: '04',
      titleEn: 'Module 4: Classroom Attendance & GPS Campus Verification',
      titleKm: 'ផ្នែកទី ៤៖ ការស្កេនវត្តមានចូល និងផ្ទៀងផ្ទាត់ GPS បរិវេណសាលា',
      timeRange: '00:29 - 00:40',
      duration: '11s',
      icon: MapPin,
      keyPointsEn: [
        'Open Check-In Terminal; logged-in teacher profile is pre-selected',
        'System automatically maps current present-time class schedule',
        'GPS perimeter check enforces physical presence within 500m campus boundary',
        'Click CHECK IN; instant notification dispatched to School Telegram group'
      ],
      keyPointsKm: [
        'បើកផ្ទាំងស្កេនវត្តមាន ប្រព័ន្ធនឹងជ្រើសរើសឈ្មោះគ្រូដោយស្វ័យប្រវត្តិ',
        'ប្រព័ន្ធកំណត់មុខវិជ្ជា និងវេនម៉ោងបង្រៀនបច្ចុប្បន្នដោយស្វ័យប្រវត្តិ',
        'ផ្ទៀងផ្ទាត់ទីតាំង GPS ក្នុងបរិវេណសាលា (កាំ ៥០០ម៉ែត្រ) ដើម្បីធានាសុពលភាព',
        'ចុច CHECK IN ពេលចូល និង CHECK OUT ពេលចេញ; ដំណឹងផ្ញើទៅ Telegram ភ្លាមៗ'
      ]
    },
    {
      number: '05',
      titleEn: 'Module 5: Personal QR Code Badge & Printable Door Sign',
      titleKm: 'ផ្នែកទី ៥៖ កូដ QR ផ្ទាល់ខ្លួន និងស្លាកបិទទ្វារថ្នាក់រៀន A4',
      timeRange: '00:40 - 00:49',
      duration: '9s',
      icon: QrCode,
      keyPointsEn: [
        'Strictly restricted: Teachers view and download their own QR badge only',
        '1 smart QR code covers all scheduled periods throughout the academic week',
        'High-resolution Door Sign with faculty photo, subject details & institution header',
        'One-click download as PNG image or print for classroom entrance door'
      ],
      keyPointsKm: [
        'សុវត្ថិភាពខ្ពស់៖ គ្រូអាចមើល និងទាញយកបានតែកូដ QR ផ្ទាល់ខ្លួនប៉ុណ្ណោះ',
        'កូដ QR វៃឆ្លាតតែមួយ អាចស្កេនគ្រប់ម៉ោងបង្រៀនទាំងអស់ពេញមួយសប្តាហ៍',
        'ទម្រង់ស្លាកបិទទ្វារថ្នាក់រៀនច្បាស់កម្រិតខ្ពស់ រួមមានរូបថតគ្រូ និងព័ត៌មានមុខវិជ្ជា',
        'ចុចទាញយកជារូបភាព PNG រក្សាទុកក្នុងទូរស័ព្ទ ឬបោះពុម្ពបិទមុខបន្ទប់រៀន'
      ]
    },
    {
      number: '06',
      titleEn: 'Module 6: Submitting Leave Requests & Academic Holidays',
      titleKm: 'ផ្នែកទី ៦៖ ការស្នើសុំច្បាប់សម្រាក និងប្រតិទិនឈប់សម្រាក',
      timeRange: '00:49 - 00:58',
      duration: '9s',
      icon: Palmtree,
      keyPointsEn: [
        'Navigate to "Leave" tab on navigation menu',
        'Select Leave Type & Duration Mode: Full Days or Flexible Hourly Leave (e.g. 2 hours)',
        'Input date, time range, hours & reason; submit for Coordinator review',
        'Status updates live (Pending → Approved); auto-exempts class attendance'
      ],
      keyPointsKm: [
        'ចូលទៅកាន់ផ្ទាំង "ច្បាប់ឈប់សម្រាក (Leave)" លើរបារបញ្ជា',
        'ជ្រើសប្រភេទច្បាប់ & ទម្រង់សុំច្បាប់៖ ជាថ្ងៃពេញ ឬជាម៉ោងបត់បែន (ឧ. ២ ម៉ោង)',
        'បញ្ចូលកាលបរិច្ឆេទ ម៉ោងចាប់ផ្តើម-បញ្ចប់ ចំនួនម៉ោង និងមូលហេតុ',
        'ស្ថានភាពពិនិត្យផ្ទាល់ (Approved) លើកលែងការស្កេនម៉ោងបង្រៀនស្វ័យប្រវត្តិ'
      ]
    },
    {
      number: '07',
      titleEn: 'Module 7: Teaching Hours & Gross Wage Summary Report',
      titleKm: 'ផ្នែកទី ៧៖ របាយការណ៍ម៉ោងបង្រៀន និងប្រាក់ឈ្នួលសរុប',
      timeRange: '00:58 - 01:08',
      duration: '10s',
      icon: DollarSign,
      keyPointsEn: [
        'View total verified teaching hours for the active pay period',
        'Transparent calculation: Total Verified Sessions × Hourly Rate = Gross Wage',
        'Export monthly teaching ledger to Excel / CSV or print payroll slip',
        'Official completion wrap-up and IT support contacts'
      ],
      keyPointsKm: [
        'ពិនិត្យម៉ោងបង្រៀនសរុបជាក់ស្តែងដែលបានផ្ទៀងផ្ទាត់ក្នុងខែបច្ចុប្បន្ន',
        'ការគណនាប្រាក់ឈ្នួលមានតម្លាភាព៖ ម៉ោងសរុប × អត្រាឈ្នួលក្នុងមួយម៉ោង',
        'ទាញយករបាយការណ៍បង្រៀនជា Excel, CSV ឬបោះពុម្ពបានគ្រប់ពេល',
        'បញ្ចប់វគ្គណែនាំ និងព័ត៌មានទំនាក់ទំនងផ្នែកជំនួយបច្ចេកវិទ្យា'
      ]
    }
  ];

  const handleDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/downloads/teacher-video-manual.mp4';
    link.download = 'EduTrack_Teacher_Video_Manual_1080p.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadStarted(false);
    }, 4000);
  };

  const jumpToVideoTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-slate-950 text-white font-sans overflow-hidden select-none animate-in fade-in duration-200">
      
      {/* ======================================================== */}
      {/* 100% FULLSCREEN REAL INTERFACE (ZERO WRAPPER HEADER) */}
      {/* ======================================================== */}

      {/* TAB 1: 100% Real Live Interface Walkthrough */}
      {activeTab === 'live_action' && (
        <div className="flex-1 w-full h-full min-h-0">
          <RealInterfaceActionWalkthrough
            initialModule={initialModule}
            onDownloadRequested={handleDownload}
            onSwitchToVideoPlayer={() => setActiveTab('video_player')}
            isFullscreen={isBrowserFullscreen}
            onToggleFullscreen={toggleBrowserFullscreen}
            onClose={onClose}
          />
        </div>
      )}

      {/* TAB 2: Fullscreen MP4 Video Player with Floating Overlay Controls */}
      {activeTab === 'video_player' && (
        <div className="flex-1 w-full h-full flex flex-col bg-slate-950 p-3 sm:p-6 relative overflow-y-auto">
          {/* Floating Top Controls Bar (Zero Push, Floating Header) */}
          <div className="w-full max-w-5xl mx-auto flex items-center justify-between pb-3 pt-1">
            <button
              onClick={() => setActiveTab('live_action')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/95 hover:bg-blue-600 text-white text-xs font-bold border border-blue-900/40 shadow-lg cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>{isKhmer ? '← ត្រឡប់ទៅផ្ទាំងពិត (Live Interface)' : '← Return to 100% Real Interface'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                  downloadStarted
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white'
                }`}
              >
                <Download className={`w-3.5 h-3.5 ${downloadStarted ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">
                  {downloadStarted ? (isKhmer ? 'កំពុងទាញយក...' : 'Downloading...') : (isKhmer ? 'ទាញយក MP4' : 'Download MP4')}
                </span>
              </button>

              <button
                onClick={toggleBrowserFullscreen}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title={isBrowserFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen'}
              >
                {isBrowserFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                title="Exit (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col justify-center items-center space-y-4">
            <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                src="/downloads/teacher-video-manual.mp4"
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              >
                Your browser does not support HTML5 video.
              </video>
            </div>

            {/* Quick Seek Chapter Markers */}
            <div className="w-full bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold">{isKhmer ? 'លោតទៅកាន់ជំពូកនីមួយៗ (Chapter Navigation):' : 'Jump to Video Chapters:'}</span>
                <span className="text-[10px] text-slate-400 font-mono">1920×1080 Full HD</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { label: 'Mod 1: Install', time: 0 },
                  { label: 'Mod 2: PIN Login', time: 10 },
                  { label: 'Mod 3: Schedule', time: 19 },
                  { label: 'Mod 4: GPS Attendance', time: 29 },
                  { label: 'Mod 5: QR Badge', time: 40 },
                  { label: 'Mod 6: Leave Form', time: 49 },
                  { label: 'Mod 7: Wage Ledger', time: 58 }
                ].map((ch, idx) => (
                  <button
                    key={idx}
                    onClick={() => jumpToVideoTime(ch.time)}
                    className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-blue-600 text-slate-300 hover:text-white transition-all text-[11px] font-bold text-left flex items-center justify-between cursor-pointer border border-slate-800"
                  >
                    <span>{ch.label}</span>
                    <span className="font-mono text-[10px] text-slate-400">00:{ch.time < 10 ? `0${ch.time}` : ch.time}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Syllabus & Chapter Review with Floating Back Button */}
      {activeTab === 'syllabus' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <button
              onClick={() => setActiveTab('live_action')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold border border-slate-800 cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>{isKhmer ? 'ត្រឡប់ទៅផ្ទាំងពិត (Live Interface)' : 'Return to Real Interface'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {chapters.map(ch => {
            const IconComp = ch.icon;
            return (
              <div key={ch.number} className="bg-slate-900 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-md space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600/20 text-cyan-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-blue-400 uppercase bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
                        MODULE {ch.number}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {ch.timeRange} ({ch.duration})
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                      {isKhmer ? ch.titleKm : ch.titleEn}
                    </h4>
                  </div>
                </div>

                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-xs space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isKhmer ? 'ចំណុចសំខាន់ៗដែលបានបង្ហាញក្នុងវីដេអូ' : 'Key Demonstrations in this Module:'}
                  </span>
                  {(isKhmer ? ch.keyPointsKm : ch.keyPointsEn).map((pt, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
