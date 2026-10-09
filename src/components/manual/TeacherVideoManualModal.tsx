import React, { useState, useRef } from 'react';
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
  ExternalLink,
  RotateCcw,
  Volume2
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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!isOpen) return null;

  const chapters: VideoChapter[] = [
    {
      number: '01',
      titleEn: 'Module 1: App Installation on Mobile & PC',
      titleKm: 'ផ្នែកទី ១៖ ការដំឡើងកម្មវិធី EduTrack លើទូរស័ព្ទ និងកុំព្យូទ័រ',
      timeRange: '00:00 - 00:10',
      duration: '10s',
      icon: Smartphone,
      keyPointsEn: [
        'Open school web address in Chrome (Android/PC) or Safari (iPhone/iPad)',
        'Android: Tap "Install App" or Menu (⋮) → "Add to Home screen"',
        'iOS: Tap Share button (⎋) → "Add to Home Screen"',
        'Standalone native app icon created with offline caching support'
      ],
      keyPointsKm: [
        'បើកតំណភ្ជាប់ប្រព័ន្ធក្នុង Chrome (Android) ឬ Safari (iPhone)',
        'Android៖ ចុចផ្ទាំង "ដំឡើងកម្មវិធី" ឬសញ្ញា (⋮) → Add to Home screen',
        'iPhone៖ ចុចប៊ូតុង Share (⎋) → Add to Home Screen',
        'កម្មវិធីដំណើរការពេញអេក្រង់ ដូច native app និងគាំទ្រការប្រើ Offline'
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
      titleEn: 'Module 3: Weekly Schedule & Mobile Timeline Calendar',
      titleKm: 'ផ្នែកទី ៣៖ កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍ និងប្រតិទិន Timeline',
      timeRange: '00:19 - 00:29',
      duration: '10s',
      icon: Calendar,
      keyPointsEn: [
        'Interactive Month header dropdown (e.g., January ∨) to expand mini monthly picker',
        'Horizontal 7-day strip (Mon-Sat); active day highlighted in vibrant blue pill',
        'Timeline event cards with period badges, subject names, rooms & bell times',
        'Tap "..." on any class card for quick room and schedule options'
      ],
      keyPointsKm: [
        'ចុចលើឈ្មោះខែ (January ∨) ដើម្បីពន្លាតប្រតិទិនប្រចាំខែតូច និងជ្រើសថ្ងៃ',
        'របារថ្ងៃប្រចាំសប្តាហ៍ ៧ថ្ងៃ ជាមួយប៊ូតុងរំលេចពណ៌ខៀវលើថ្ងៃដែលបានជ្រើស',
        'តារាង Timeline បង្ហាញម៉ោងច្បាស់លាស់ កាតព័ត៌មានមុខវិជ្ជា និងបន្ទប់សិក្សា',
        'ចុចសញ្ញាចុចបី "..." លើកាតនីមួយៗដើម្បីមើលព័ត៌មានលម្អិតបន្ថែម'
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
      titleKm: 'ផ្នែកទី ៥៖ កូដ QR ផ្ទាល់ខ្លួន និងស្លាកបិទទ្វារថ្នាក់រៀន',
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
        'Select Leave Type (Sick Leave, Annual Vacation, Urgent Family Leave)',
        'Input start & end dates and notes; submit for Coordinator review',
        'Status updates live (Pending → Approved); view school holiday calendar'
      ],
      keyPointsKm: [
        'ចូលទៅកាន់ផ្ទាំង "ច្បាប់ឈប់សម្រាក (Leave)" លើរបារបញ្ជា',
        'ជ្រើសប្រភេទច្បាប់ (ឈឺ, សម្រាកប្រចាំឆ្នាំ, ការបន្ទាន់) និងកាលបរិច្ឆេទ',
        'ដាក់ពាក្យស្នើសុំទៅកាន់គណៈគ្រប់គ្រង; ស្ថានភាពពិនិត្យផ្ទាល់ (Approved)',
        'ពិនិត្យប្រតិទិនឈប់សម្រាកបុណ្យជាតិ និងការរៀបចំគ្រូបង្រៀនជំនួស'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 font-sans">
        
        {/* Top Gradient Banner Header */}
        <div className="bg-gradient-to-r from-[#071b38] via-[#0b2a5e] to-[#041329] text-white p-4 sm:p-5 relative shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    Official Video Manual
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Real Interface Action
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                    Full HD 1080p
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white mt-1 leading-tight">
                  {isKhmer
                    ? 'វីដេអូណែនាំការប្រើប្រាស់សម្រាប់គ្រូបង្រៀន (សកម្មភាពលើផ្ទាំងកម្មវិធីពិត)'
                    : 'Teacher Video Manual: Real Actions on Authentic EduTrack Interface'}
                </h2>
                <p className="text-xs text-blue-200/90 mt-0.5">
                  {isKhmer
                    ? 'ទស្សនាសកម្មភាពចុចប៊ូតុង ស្កេន GPS និងបញ្ចូលកូដ PIN លើផ្ទាំងពិត ឬទាញយកឯកសារ MP4'
                    : 'Watch real cursor clicks, keypad PIN entries, and GPS attendance on real UI, or download Full HD MP4.'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Bar Inside Header */}
          <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <span className="font-bold text-white">Interactive Mode:</span> Active • <span className="font-bold text-white">Resolution:</span> 1920×1080 • <span className="font-bold text-white">Duration:</span> 77 seconds
            </div>

            <button
              onClick={handleDownload}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer ${
                downloadStarted
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-300'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white active:scale-95'
              }`}
            >
              <Download className={`w-3.5 h-3.5 ${downloadStarted ? 'animate-bounce' : ''}`} />
              <span>
                {downloadStarted
                  ? (isKhmer ? 'កំពុងទាញយក... (Downloading)' : 'Downloading MP4...')
                  : (isKhmer ? 'ទាញយកវីដេអូ (Download MP4)' : 'Download MP4 (5 MB)')}
              </span>
            </button>
          </div>
        </div>

        {/* View Mode Switcher: Live Action vs MP4 Video Player vs Syllabus */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs font-bold shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('live_action')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'live_action'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 bg-white/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
              <MousePointer className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'សកម្មភាពផ្ទាល់លើ Real Interface' : 'Live Real Interface Action'}</span>
            </button>

            <button
              onClick={() => setActiveTab('video_player')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'video_player'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 bg-white/60'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'ចាក់វីដេអូ MP4 (1080p Player)' : 'MP4 Video Player'}</span>
            </button>

            <button
              onClick={() => setActiveTab('syllabus')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'syllabus'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 bg-white/60'
              }`}
            >
              <span>{isKhmer ? 'មាតិកាទាំង ៧ ជំពូក' : '7 Modules Syllabus'}</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 bg-slate-900/95 flex flex-col p-2 sm:p-4">
          
          {/* TAB 1: Real Interface Video Action Simulator */}
          {activeTab === 'live_action' && (
            <div className="flex-1 w-full h-full min-h-[460px]">
              <RealInterfaceActionWalkthrough
                initialModule={initialModule}
                onDownloadRequested={handleDownload}
              />
            </div>
          )}

          {/* TAB 2: Embedded MP4 Video Player with chapter markers */}
          {activeTab === 'video_player' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 max-w-4xl mx-auto w-full p-2">
              <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  src="/downloads/teacher-video-manual.mp4"
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                  poster=""
                >
                  Your browser does not support HTML5 video.
                </video>
              </div>

              {/* Fast Jump Chapter Markers */}
              <div className="w-full bg-slate-800/80 rounded-2xl border border-slate-700 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold">{isKhmer ? 'លោតទៅកាន់ជំពូកនីមួយៗ (Chapter Navigation):' : 'Jump to Video Chapters:'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">1080p Full HD</span>
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
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-slate-300 hover:text-white transition-all text-[11px] font-bold text-left flex items-center justify-between cursor-pointer border border-slate-700/60"
                    >
                      <span>{ch.label}</span>
                      <span className="font-mono text-[10px] text-slate-400">00:{ch.time < 10 ? `0${ch.time}` : ch.time}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Syllabus & Chapter Details */}
          {activeTab === 'syllabus' && (
            <div className="space-y-4 max-w-4xl mx-auto w-full p-2 bg-slate-50 rounded-2xl">
              {chapters.map(ch => {
                const IconComp = ch.icon;
                return (
                  <div key={ch.number} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              MODULE {ch.number}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {ch.timeRange} ({ch.duration})
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                            {isKhmer ? ch.titleKm : ch.titleEn}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {isKhmer ? 'ចំណុចសំខាន់ៗដែលបានបង្ហាញក្នុងវីដេអូ' : 'Key Demonstrations in this Module:'}
                      </span>
                      {(isKhmer ? ch.keyPointsKm : ch.keyPointsEn).map((pt, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-2 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
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

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>EduTrack Faculty Training System • Verified Interactive Resource</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'ទាញយក MP4' : 'Download Video (MP4)'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
            >
              {isKhmer ? 'បិទ' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
