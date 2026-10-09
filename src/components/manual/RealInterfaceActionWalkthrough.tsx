import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  CheckCircle2,
  Smartphone,
  Lock,
  Calendar,
  MapPin,
  QrCode,
  Palmtree,
  DollarSign,
  Maximize2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MousePointer,
  Radio,
  Send,
  FileSpreadsheet,
  Download,
  Printer,
  Shield,
  Clock,
  Building2,
  UserCheck
} from 'lucide-react';

interface ModuleStep {
  id: string;
  timeSec: number;
  cursorX: number; // percentage 0-100
  cursorY: number; // percentage 0-100
  actionType: 'hover' | 'click' | 'type' | 'success';
  titleEn: string;
  titleKm: string;
  subtitleEn: string;
  subtitleKm: string;
}

export const RealInterfaceActionWalkthrough: React.FC<{
  initialModule?: number;
  onDownloadRequested?: () => void;
}> = ({ initialModule = 1, onDownloadRequested }) => {
  const { isKhmer } = useLanguage();

  // Playback state
  const [currentModule, setCurrentModule] = useState<number>(initialModule);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [interactiveMode, setInteractiveMode] = useState<boolean>(false);
  const [isClicking, setIsClicking] = useState<boolean>(false);

  // Simulated UI state within walkthrough
  const [pwaInstalled, setPwaInstalled] = useState<boolean>(false);
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('Wed');
  const [selectedClassCard, setSelectedClassCard] = useState<boolean>(false);
  const [gpsVerified, setGpsVerified] = useState<boolean>(false);
  const [checkInDone, setCheckInDone] = useState<boolean>(false);
  const [doorSignOpen, setDoorSignOpen] = useState<boolean>(false);
  const [leaveSubmitted, setLeaveSubmitted] = useState<boolean>(false);
  const [reportExported, setReportExported] = useState<boolean>(false);

  // Audio Context for synthesized realistic SFX
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSfx = (type: 'click' | 'beep' | 'success' | 'key') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'key') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1050, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'success') {
        // Two-tone chord
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {
      // Audio autoplay policy ignored safely
    }
  };

  // Modules metadata definition
  const modulesList = [
    {
      id: 1,
      titleEn: 'Module 1: App Installation (PWA)',
      titleKm: 'ផ្នែកទី ១៖ ការដំឡើងកម្មវិធី EduTrack (PWA)',
      icon: Smartphone,
      steps: [
        {
          id: '1-1',
          timeSec: 2,
          cursorX: 82,
          cursorY: 18,
          actionType: 'hover' as const,
          titleEn: 'Step 1: Open Chrome/Safari and locate "Install App"',
          titleKm: 'ជំហានទី ១៖ បើកកម្មវិធីរុករក រួចរកមើលផ្ទាំង "ដំឡើងកម្មវិធី"',
          subtitleEn: 'EduTrack is a Progressive Web App (PWA) with instant offline caching.',
          subtitleKm: 'EduTrack ជា PWA ដំណើរការលឿន និងគាំទ្រការប្រើ Offline គ្មានរបារ Browser។'
        },
        {
          id: '1-2',
          timeSec: 3,
          cursorX: 82,
          cursorY: 18,
          actionType: 'click' as const,
          titleEn: 'Step 2: Tap "Install App" to launch native prompt',
          titleKm: 'ជំហានទី ២៖ ចុចលើ "ដំឡើងកម្មវិធី" ដើម្បីបើកផ្ទាំងផ្ទៀងផ្ទាត់',
          subtitleEn: 'The native device dialog prompts to add EduTrack to the Home Screen.',
          subtitleKm: 'ប្រព័ន្ធនឹងបង្ហាញផ្ទាំងសួរដើម្បីបន្ថែម EduTrack ទៅលើ Home Screen។'
        },
        {
          id: '1-3',
          timeSec: 3,
          cursorX: 68,
          cursorY: 58,
          actionType: 'click' as const,
          titleEn: 'Step 3: Confirm "Add to Home screen"',
          titleKm: 'ជំហានទី ៣៖ ចុចយល់ព្រម "Add to Home Screen"',
          subtitleEn: 'A standalone native icon is created on the home screen immediately.',
          subtitleKm: 'រូបតំណាងកម្មវិធីនឹងលេចឡើងលើអេក្រង់ទូរស័ព្ទភ្លាមៗ អាចចុចបើកប្រើបានគ្រប់ពេល។'
        }
      ]
    },
    {
      id: 2,
      titleEn: 'Module 2: Teacher Login & PIN',
      titleKm: 'ផ្នែកទី ២៖ ការចូលគណនីគ្រូ និងលេខកូដ PIN',
      icon: Lock,
      steps: [
        {
          id: '2-1',
          timeSec: 2,
          cursorX: 50,
          cursorY: 28,
          actionType: 'hover' as const,
          titleEn: 'Step 1: Select "Teacher Login" and choose faculty account',
          titleKm: 'ជំហានទី ១៖ ជ្រើសរើសផ្ទាំង "គ្រូបង្រៀន" និងឈ្មោះគណនីគ្រូ',
          subtitleEn: 'Select Dr. Sovann Vichea (Computer Science faculty).',
          subtitleKm: 'ជ្រើសរើសលោកគ្រូ សុវណ្ណ វិជ្ជា (ដេប៉ាតឺម៉ង់វិទ្យាសាស្ត្រកុំព្យូទ័រ)។'
        },
        {
          id: '2-2',
          timeSec: 1.5,
          cursorX: 42,
          cursorY: 58,
          actionType: 'click' as const,
          titleEn: 'Step 2: Enter digit [1] on confidential keypad',
          titleKm: 'ជំហានទី ២៖ ចុចលេខ [1] លើក្តារចុចលេខសម្ងាត់',
          subtitleEn: 'Digits are masked as bullets for faculty confidentiality.',
          subtitleKm: 'លេខសម្ងាត់ត្រូវបានលាក់ជាសញ្ញាចុចដើម្បីសុវត្ថិភាព។'
        },
        {
          id: '2-3',
          timeSec: 1.5,
          cursorX: 50,
          cursorY: 58,
          actionType: 'click' as const,
          titleEn: 'Step 3: Enter digits [2], [3], and [4]',
          titleKm: 'ជំហានទី ៣៖ ចុចបន្តលេខ [2], [3] និង [4]',
          subtitleEn: 'Entering 4-digit PIN completes instant identity verification.',
          subtitleKm: 'ការបញ្ចូលលេខកូដ ៤ខ្ទង់ នឹងផ្ទៀងផ្ទាត់អត្តសញ្ញាណភ្លាមៗ។'
        },
        {
          id: '2-4',
          timeSec: 2.5,
          cursorX: 50,
          cursorY: 82,
          actionType: 'success' as const,
          titleEn: 'Step 4: Authenticated successfully! Welcome Dr. Sovann',
          titleKm: 'ជំហានទី ៤៖ ផ្ទៀងផ្ទាត់ជោគជ័យ! សូមស្វាគមន៍លោកគ្រូ សុវណ្ណ',
          subtitleEn: 'Teachers strictly view their own schedule, QR badge, and wage ledger.',
          subtitleKm: 'គ្រូបង្រៀនអាចមើលបានតែទិន្នន័យកាលវិភាគ កូដ QR និងប្រាក់ឈ្នួលផ្ទាល់ខ្លួនប៉ុណ្ណោះ។'
        }
      ]
    },
    {
      id: 3,
      titleEn: 'Module 3: Weekly Schedule & Timeline',
      titleKm: 'ផ្នែកទី ៣៖ កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍',
      icon: Calendar,
      steps: [
        {
          id: '3-1',
          timeSec: 2,
          cursorX: 45,
          cursorY: 22,
          actionType: 'hover' as const,
          titleEn: 'Step 1: Check Month header & 7-Day navigation bar',
          titleKm: 'ជំហានទី ១៖ ពិនិត្យខែ និងរបារថ្ងៃប្រចាំសប្តាហ៍ ៧ថ្ងៃ (ច័ន្ទ-សៅរ៍)',
          subtitleEn: 'Click Month to expand calendar picker; select any day to view classes.',
          subtitleKm: 'ចុចលើខែដើម្បីពន្លាតប្រតិទិន; ចុចលើថ្ងៃនីមួយៗដើម្បីមើលម៉ោងបង្រៀន។'
        },
        {
          id: '3-2',
          timeSec: 2.5,
          cursorX: 52,
          cursorY: 28,
          actionType: 'click' as const,
          titleEn: 'Step 2: Switch to "Wednesday (Wed, 14 Jan)"',
          titleKm: 'ជំហានទី ២៖ ចុចប្តូរទៅថ្ងៃ "ពុធ (Wed, 14 Jan)"',
          subtitleEn: 'Active day illuminates in deep blue pill badge.',
          subtitleKm: 'ថ្ងៃដែលបានជ្រើសនឹងរំលេចពណ៌ខៀវដិតច្បាស់ងាយស្រួលមើល។'
        },
        {
          id: '3-3',
          timeSec: 3,
          cursorX: 50,
          cursorY: 55,
          actionType: 'click' as const,
          titleEn: 'Step 3: Review class card: CS-201 Data Structures (Room 304)',
          titleKm: 'ជំហានទី ៣៖ ពិនិត្យកាតម៉ោងបង្រៀន៖ CS-201 (បន្ទប់ 304 ម៉ោង 08:00)',
          subtitleEn: 'Card displays bell time, classroom number, and session status.',
          subtitleKm: 'កាតបង្ហាញម៉ោងចូល-ចេញ បន្ទប់រៀន និងស្ថានភាពម៉ោងបង្រៀនជាក់ស្តែង។'
        }
      ]
    },
    {
      id: 4,
      titleEn: 'Module 4: Classroom Attendance & GPS Check-In',
      titleKm: 'ផ្នែកទី ៤៖ វត្តមានចូលបង្រៀន & ផ្ទៀងផ្ទាត់ GPS បរិវេណសាលា',
      icon: MapPin,
      steps: [
        {
          id: '4-1',
          timeSec: 2,
          cursorX: 50,
          cursorY: 36,
          actionType: 'hover' as const,
          titleEn: 'Step 1: Open Check-In Terminal (Auto-identifies faculty)',
          titleKm: 'ជំហានទី ១៖ បើកផ្ទាំងស្កេនវត្តមាន (ប្រព័ន្ធជ្រើសឈ្មោះគ្រូស្វ័យប្រវត្តិ)',
          subtitleEn: 'System maps current present-time class subject and room automatically.',
          subtitleKm: 'ប្រព័ន្ធផ្គូផ្គងមុខវិជ្ជា និងបន្ទប់ដែលត្រូវបង្រៀននៅម៉ោងនេះដោយស្វ័យប្រវត្តិ។'
        },
        {
          id: '4-2',
          timeSec: 2.5,
          cursorX: 50,
          cursorY: 48,
          actionType: 'hover' as const,
          titleEn: 'Step 2: GPS verifies physical presence within 500m campus boundary',
          titleKm: 'ជំហានទី ២៖ GPS ផ្ទៀងផ្ទាត់ទីតាំងពិតក្នុងបរិវេណសាលា (កាំ ៥០០ម៉ែត្រ)',
          subtitleEn: 'Live perimeter radar: "18 meters from classroom - Inside Campus".',
          subtitleKm: 'រ៉ាដាផ្ទៀងផ្ទាត់៖ ចម្ងាយ ១៨ ម៉ែត្រពីអគារសិក្សា - ស្ថិតក្នុងបរិវេណសាលា។'
        },
        {
          id: '4-3',
          timeSec: 2.5,
          cursorX: 50,
          cursorY: 72,
          actionType: 'click' as const,
          titleEn: 'Step 3: Click "CHECK IN (ចូលបង្រៀន)" button',
          titleKm: 'ជំហានទី ៣៖ ចុចប៊ូតុង "CHECK IN (ចូលបង្រៀន)"',
          subtitleEn: 'Instant timestamp recorded at 07:58 AM (On Time).',
          subtitleKm: 'កត់ត្រាពេលចូលភ្លាមៗនៅម៉ោង ០៧:៥៨ ព្រឹក (ទាន់ពេលវេលា)។'
        },
        {
          id: '4-4',
          timeSec: 2.5,
          cursorX: 50,
          cursorY: 72,
          actionType: 'success' as const,
          titleEn: 'Step 4: Attendance confirmed & Telegram notification sent!',
          titleKm: 'ជំហានទី ៤៖ កត់ត្រាវត្តមានជោគជ័យ & ផ្ញើដំណឹងស្វ័យប្រវត្តិទៅ Telegram!',
          subtitleEn: 'School administration and faculty channel receive instant proof.',
          subtitleKm: 'គណៈគ្រប់គ្រង និងក្រុមការងារសាលាទទួលបានសារដំណឹងតាម Telegram ភ្លាមៗ។'
        }
      ]
    },
    {
      id: 5,
      titleEn: 'Module 5: Personal QR Badge & Door Sign',
      titleKm: 'ផ្នែកទី ៥៖ កូដ QR ផ្ទាល់ខ្លួន & ស្លាកបិទទ្វារថ្នាក់រៀន',
      icon: QrCode,
      steps: [
        {
          id: '5-1',
          timeSec: 2,
          cursorX: 50,
          cursorY: 38,
          actionType: 'hover' as const,
          titleEn: 'Step 1: View Personal Smart QR Code Badge',
          titleKm: 'ជំហានទី ១៖ ពិនិត្យកាត QR Code វៃឆ្លាតផ្ទាល់ខ្លួនរបស់គ្រូ',
          subtitleEn: '1 dynamic QR code covers all assigned classes across the week.',
          subtitleKm: 'កូដ QR តែមួយគត់ អាចស្កេនគ្រប់ម៉ោងបង្រៀនទាំងអស់ពេញមួយសប្តាហ៍។'
        },
        {
          id: '5-2',
          timeSec: 2.5,
          cursorX: 58,
          cursorY: 72,
          actionType: 'click' as const,
          titleEn: 'Step 2: Click "Print Classroom Door Sign"',
          titleKm: 'ជំហានទី ២៖ ចុចលើ "បោះពុម្ពស្លាកបិទទ្វារថ្នាក់រៀន"',
          subtitleEn: 'Generates official door sign with faculty portrait, department & QR matrix.',
          subtitleKm: 'បង្កើតស្លាកផ្លូវការមានរូបថតគ្រូ មុខវិជ្ជា និងកូដ QR សម្រាប់បិទមុខទ្វារថ្នាក់។'
        },
        {
          id: '5-3',
          timeSec: 3,
          cursorX: 72,
          cursorY: 22,
          actionType: 'hover' as const,
          titleEn: 'Step 3: Download as PNG or Print for classroom door',
          titleKm: 'ជំហានទី ៣៖ ទាញយកជារូបភាព PNG ឬបោះពុម្ពបិទទ្វារបន្ទប់រៀន',
          subtitleEn: 'Students and staff can scan directly at the classroom door.',
          subtitleKm: 'សិស្ស និងបុគ្គលិកអាចស្កេនពិនិត្យវត្តមានផ្ទាល់មុខបន្ទប់បានយ៉ាងងាយ។'
        }
      ]
    },
    {
      id: 6,
      titleEn: 'Module 6: Leave Requests & Holidays',
      titleKm: 'ផ្នែកទី ៦៖ ការស្នើសុំច្បាប់សម្រាក & ប្រតិទិនឈប់សម្រាក',
      icon: Palmtree,
      steps: [
        {
          id: '6-1',
          timeSec: 2,
          cursorX: 75,
          cursorY: 25,
          actionType: 'click' as const,
          titleEn: 'Step 1: Navigate to "Leave" and tap "+ New Leave Request"',
          titleKm: 'ជំហានទី ១៖ ចូលផ្ទាំង "ច្បាប់សម្រាក" រួចចុច "+ ស្នើសុំច្បាប់ថ្មី"',
          subtitleEn: 'View annual leave balance (12 days left) and sick leave quota.',
          subtitleKm: 'ពិនិត្យចំនួនច្បាប់ដែលនៅសល់ (ច្បាប់ប្រចាំឆ្នាំ ១២ថ្ងៃ, ច្បាប់ឈឺ ៥ថ្ងៃ)។'
        },
        {
          id: '6-2',
          timeSec: 2.5,
          cursorX: 50,
          cursorY: 52,
          actionType: 'type' as const,
          titleEn: 'Step 2: Select Leave Type (Sick Leave) & Dates (Jan 16-17)',
          titleKm: 'ជំហានទី ២៖ ជ្រើសប្រភេទច្បាប់ (ច្បាប់ឈឺ) និងកាលបរិច្ឆេទ (១៦-១៧ មករា)',
          subtitleEn: 'Input reason note: "Doctor medical checkup and rest".',
          subtitleKm: 'បញ្ចូលមូលហេតុ៖ "ពិនិត្យសុខភាពតាមវេជ្ជបញ្ជា និងសម្រាកព្យាបាល"។'
        },
        {
          id: '6-3',
          timeSec: 2.5,
          cursorX: 65,
          cursorY: 76,
          actionType: 'click' as const,
          titleEn: 'Step 3: Click "Submit Request" for Coordinator Review',
          titleKm: 'ជំហានទី ៣៖ ចុច "ដាក់ពាក្យស្នើសុំ" ទៅកាន់គណៈគ្រប់គ្រង',
          subtitleEn: 'Status updates live from Pending Approval to Approved.',
          subtitleKm: 'ស្ថានភាពបង្ហាញបច្ចុប្បន្នភាពភ្លាមៗ (រង់ចាំការអនុម័ត 🟡)។'
        }
      ]
    },
    {
      id: 7,
      titleEn: 'Module 7: Verified Teaching Hours & Gross Wage Report',
      titleKm: 'ផ្នែកទី ៧៖ របាយការណ៍ម៉ោងបង្រៀន & ប្រាក់ឈ្នួលសរុប',
      icon: DollarSign,
      steps: [
        {
          id: '7-1',
          timeSec: 2.5,
          cursorX: 50,
          cursorY: 34,
          actionType: 'hover' as const,
          titleEn: 'Step 1: Open Monthly Teaching Ledger & Payroll Summary',
          titleKm: 'ជំហានទី ១៖ បើកតារាងសង្ខេបម៉ោងបង្រៀន និងប្រាក់ឈ្នួលប្រចាំខែ',
          subtitleEn: 'Transparent formula: 38 Verified Teaching Hours × $25/hr = $950.00 Gross Wage.',
          subtitleKm: 'រូបមន្តគណនាតម្លាភាព៖ ៣៨ ម៉ោងជាក់ស្តែង × ២៥ដុល្លារ/ម៉ោង = ៩៥០.០០ ដុល្លារ។'
        },
        {
          id: '7-2',
          timeSec: 2.5,
          cursorX: 78,
          cursorY: 28,
          actionType: 'click' as const,
          titleEn: 'Step 2: Click "Export Excel (.xlsx)" or Print Payroll Slip',
          titleKm: 'ជំហានទី ២៖ ចុច "ទាញយកជា Excel (.xlsx)" ឬបោះពុម្ពប័ណ្ណបើកប្រាក់',
          subtitleEn: 'Faculty can save digital receipts for records anytime.',
          subtitleKm: 'គ្រូអាចទាញយកឯកសារកត់ត្រាទុក ឬបោះពុម្ពបានគ្រប់ពេលវេលា។'
        },
        {
          id: '7-3',
          timeSec: 3,
          cursorX: 50,
          cursorY: 55,
          actionType: 'success' as const,
          titleEn: 'Step 3: Training Complete! You are ready to use EduTrack',
          titleKm: 'ជំហានទី ៣៖ បញ្ចប់ការណែនាំ! លោកគ្រូ-អ្នកគ្រូរួចរាល់ក្នុងការប្រើប្រាស់ EduTrack',
          subtitleEn: 'All 7 modules mastered: from installation to payroll summary.',
          subtitleKm: 'បានបញ្ចប់គ្រប់ ៧ ផ្នែក៖ ចាប់តាំងពីការដំឡើង រហូតដល់របាយការណ៍ប្រាក់ឈ្នួល។'
        }
      ]
    }
  ];

  const activeModuleObj = modulesList.find(m => m.id === currentModule) || modulesList[0];
  const activeStep = activeModuleObj.steps[stepIndex] || activeModuleObj.steps[0];

  // Auto-play timer effect
  useEffect(() => {
    if (!isPlaying || interactiveMode) return;

    const stepDuration = (activeStep.timeSec * 1000) / playbackSpeed;

    const timer = setTimeout(() => {
      // Execute simulated action side effects
      if (activeStep.actionType === 'click') {
        setIsClicking(true);
        playSfx('click');
        setTimeout(() => setIsClicking(false), 200);

        // Update module-specific states
        if (currentModule === 1 && stepIndex === 1) {
          setPwaInstalled(false);
        } else if (currentModule === 1 && stepIndex === 2) {
          setPwaInstalled(true);
          playSfx('success');
        } else if (currentModule === 2 && stepIndex === 1) {
          setPinDigits(['1']);
          playSfx('key');
        } else if (currentModule === 2 && stepIndex === 2) {
          setPinDigits(['1', '2', '3', '4']);
          playSfx('key');
        } else if (currentModule === 3 && stepIndex === 1) {
          setSelectedDay('Wed');
        } else if (currentModule === 3 && stepIndex === 2) {
          setSelectedClassCard(true);
        } else if (currentModule === 4 && stepIndex === 2) {
          setCheckInDone(true);
          playSfx('success');
        } else if (currentModule === 5 && stepIndex === 1) {
          setDoorSignOpen(true);
          playSfx('beep');
        } else if (currentModule === 6 && stepIndex === 2) {
          setLeaveSubmitted(true);
          playSfx('success');
        } else if (currentModule === 7 && stepIndex === 1) {
          setReportExported(true);
          playSfx('success');
        }
      } else if (activeStep.actionType === 'type') {
        playSfx('key');
      } else if (activeStep.actionType === 'success') {
        playSfx('success');
      }

      // Progress to next step or next module
      if (stepIndex < activeModuleObj.steps.length - 1) {
        setStepIndex(prev => prev + 1);
      } else {
        // Move to next module
        if (currentModule < modulesList.length) {
          setCurrentModule(prev => prev + 1);
          setStepIndex(0);
          resetModuleStates(currentModule + 1);
        } else {
          // Loop back to start or pause
          setIsPlaying(false);
        }
      }
    }, stepDuration);

    return () => clearTimeout(timer);
  }, [isPlaying, currentModule, stepIndex, playbackSpeed, interactiveMode]);

  const resetModuleStates = (modId: number) => {
    if (modId === 1) setPwaInstalled(false);
    if (modId === 2) setPinDigits([]);
    if (modId === 3) {
      setSelectedDay('Mon');
      setSelectedClassCard(false);
    }
    if (modId === 4) setCheckInDone(false);
    if (modId === 5) setDoorSignOpen(false);
    if (modId === 6) setLeaveSubmitted(false);
    if (modId === 7) setReportExported(false);
  };

  const handleSelectModule = (modId: number) => {
    setCurrentModule(modId);
    setStepIndex(0);
    resetModuleStates(modId);
    playSfx('beep');
  };

  const handleRestart = () => {
    setCurrentModule(1);
    setStepIndex(0);
    resetModuleStates(1);
    setIsPlaying(true);
    playSfx('beep');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 font-sans">
      
      {/* Top Walkthrough Control Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
              Live Real Action
            </span>
          </div>

          <div className="hidden sm:block h-4 w-[1px] bg-slate-700" />

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <span className="text-cyan-400">EduTrack MIS</span>
            <span>•</span>
            <span>{isKhmer ? activeModuleObj.titleKm : activeModuleObj.titleEn}</span>
          </div>
        </div>

        {/* Action Bar: Speed, Sound, Interactive toggle */}
        <div className="flex items-center gap-2 text-xs">
          {/* Interactive Mode Toggle */}
          <button
            onClick={() => {
              setInteractiveMode(!interactiveMode);
              if (!interactiveMode) setIsPlaying(false);
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              interactiveMode
                ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Try It Yourself Interactive Mode"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{interactiveMode ? (isKhmer ? 'សាកល្បងដោយផ្ទាល់ ✓' : 'Try-It Mode Active') : (isKhmer ? 'សាកល្បងចុចផ្ទាល់' : 'Try-It Yourself')}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title={isMuted ? 'Unmute Audio SFX' : 'Mute Audio SFX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Speed Selector */}
          <button
            onClick={() => {
              const speeds = [0.75, 1, 1.25, 1.5];
              const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
              setPlaybackSpeed(next);
            }}
            className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] cursor-pointer"
            title="Playback Speed"
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>

      {/* Main Viewport Container: Simulated Real Interface */}
      <div className="relative flex-1 bg-slate-900 overflow-hidden flex flex-col justify-center items-center p-2 sm:p-4 min-h-[380px] sm:min-h-[460px]">
        
        {/* Browser & OS Shell Frame */}
        <div className="w-full max-w-4xl bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col relative select-none">
          
          {/* Mock Browser Top Address Bar */}
          <div className="bg-slate-800/90 px-3 py-1.5 border-b border-slate-700 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-0.5 rounded-lg border border-slate-700 text-[11px] text-slate-300 font-mono">
              <span className="text-emerald-400">🔒</span>
              <span>https://edutrack.school.edu/app</span>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PWA Ready
              </span>
            </div>
          </div>

          {/* Authentic Real EduTrack Top App Header */}
          <div className="bg-gradient-to-r from-[#071b38] via-[#0b2a5e] to-[#041329] px-4 py-2.5 border-b border-blue-900/50 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black shadow-md shadow-blue-600/30">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-xs font-black tracking-wide block leading-none text-white">
                  EDUTRACK MIS
                </span>
                <span className="text-[9px] text-blue-300 font-medium">Faculty Academic Portal</span>
              </div>
            </div>

            {/* Teacher Header Profile Indicator */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded-xl text-[11px]">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white">Dr. Sovann Vichea</span>
                <span className="text-blue-300 text-[10px]">(Computer Science)</span>
              </div>

              {/* Install Badge in Module 1 */}
              {currentModule === 1 && (
                <div
                  id="install-app-btn"
                  className={`px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                    pwaInstalled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white animate-pulse'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{pwaInstalled ? '✓ App Installed' : 'Install App'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Content Area Rendering the Active Simulated Module */}
          <div className="p-4 sm:p-6 bg-slate-100 text-slate-900 min-h-[300px] sm:min-h-[340px] flex flex-col justify-center relative overflow-hidden">
            
            {/* MODULE 1: PWA Installation UI */}
            {currentModule === 1 && (
              <div className="space-y-4 max-w-lg mx-auto w-full">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {isKhmer ? 'ដំឡើងកម្មវិធី EduTrack លើទូរស័ព្ទ' : 'Install EduTrack on Home Screen'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {isKhmer
                        ? 'ដំណើរការពេញអេក្រង់ គ្មានរបារ Browser ជាមួយការទាញទិន្នន័យក្រៅបណ្តាញ Offline'
                        : 'Fast, native full-screen experience with zero browser bars and offline data caching.'}
                    </p>
                  </div>

                  {/* Native Prompt Modal Simulation */}
                  {stepIndex >= 1 && (
                    <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-700 animate-in zoom-in-95 duration-200 text-left space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black">
                          E
                        </div>
                        <div>
                          <div className="text-xs font-bold">EduTrack Teacher Portal</div>
                          <div className="text-[10px] text-slate-400">edutrack.school.edu • Progressive Web App</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {isKhmer
                          ? 'បន្ថែមកម្មវិធីទៅលើផ្ទាំងទូរស័ព្ទដើម្បីចូលប្រើប្រាស់បានលឿន?'
                          : 'Add application to home screen for 1-tap faculty attendance and schedule?'}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <button className="px-3 py-1 rounded-xl text-xs text-slate-400">Cancel</button>
                        <button
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            pwaInstalled ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white shadow-md'
                          }`}
                        >
                          {pwaInstalled ? '✓ Added' : 'Add to Home screen'}
                        </button>
                      </div>
                    </div>
                  )}

                  {pwaInstalled && (
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{isKhmer ? 'ដំឡើងជោគជ័យ! កម្មវិធីរួចរាល់លើ Home Screen' : 'Installed successfully! Icon created on Home Screen'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODULE 2: Teacher Login & PIN */}
            {currentModule === 2 && (
              <div className="max-w-md mx-auto w-full bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-4">
                <div className="flex items-center justify-center gap-2 border-b border-slate-100 pb-3">
                  <div className="px-3 py-1 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold">
                    Admin / Staff
                  </div>
                  <div className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs">
                    Teacher Login ✓
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase">Selected Faculty</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    Dr. Sovann Vichea (TCH-001)
                  </div>
                </div>

                {/* PIN Mask Display */}
                <div className="flex items-center justify-center gap-3 py-2">
                  {[0, 1, 2, 3].map(idx => (
                    <div
                      key={idx}
                      className={`w-9 h-9 rounded-2xl border-2 flex items-center justify-center font-black text-lg transition-all ${
                        pinDigits.length > idx
                          ? 'border-blue-600 bg-blue-50 text-blue-600 scale-105'
                          : 'border-slate-300 bg-slate-50 text-transparent'
                      }`}
                    >
                      ●
                    </div>
                  ))}
                </div>

                {/* Simulated Keypad */}
                <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto text-sm font-black">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✓'].map(btn => {
                    const isPressed =
                      (btn === '1' && pinDigits.length >= 1) ||
                      (btn === '2' && pinDigits.length >= 2) ||
                      (btn === '3' && pinDigits.length >= 3) ||
                      (btn === '4' && pinDigits.length >= 4);

                    return (
                      <button
                        key={btn}
                        className={`h-10 rounded-xl border flex items-center justify-center transition-all ${
                          isPressed
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        {btn}
                      </button>
                    );
                  })}
                </div>

                {stepIndex >= 3 && (
                  <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in zoom-in-95">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Access Granted • Welcome Dr. Sovann!</span>
                  </div>
                )}
              </div>
            )}

            {/* MODULE 3: Monthly & Weekly Schedule Matching Screenshot */}
            {currentModule === 3 && (
              <div className="max-w-md mx-auto w-full bg-[#09152b] rounded-3xl overflow-hidden border border-blue-900/60 shadow-2xl flex flex-col">
                {/* Upper Dark Midnight Navy Calendar */}
                <div className="p-4 text-white space-y-3 bg-[#09152b]">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400">June, 21 Wednesday</span>
                    <div className="bg-[#13223f] px-3 py-1 rounded-xl text-[11px] font-bold border border-blue-900/50">
                      &lt; March 2026 &gt;
                    </div>
                  </div>

                  {/* Day of Week */}
                  <div className="grid grid-cols-7 text-center font-bold text-[9px] text-slate-400 tracking-wider">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>

                  {/* Date Grid with Connected Capsule Range (14 to 18) and Status Dots */}
                  <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-bold">
                    {[
                      { num: 1 }, { num: 2 }, { num: 3 }, { num: 4 }, { num: 5 }, { num: 6 }, { num: 7 },
                      { num: 8 }, { num: 9 }, { num: 10 }, { num: 11 }, { num: 12 },
                      { num: 13, green: true },
                      { num: 14, rangeStart: true },
                      { num: 15, range: true },
                      { num: 16, range: true },
                      { num: 17, range: true },
                      { num: 18, rangeEnd: true },
                      { num: 19 }, { num: 20 }, { num: 21 }, { num: 22 }, { num: 23 }, { num: 24 }, { num: 25 },
                      { num: 26 }, { num: 27 },
                      { num: 28, orange: true }
                    ].map((d, i) => (
                      <div key={i} className="relative flex items-center justify-center h-7">
                        {(d.range || d.rangeStart || d.rangeEnd) && (
                          <div
                            className={`absolute inset-y-0.5 bg-[#2563eb]/25 ${
                              d.rangeStart ? 'left-0.5 right-0 rounded-l-full' : d.rangeEnd ? 'left-0 right-0.5 rounded-r-full' : 'inset-x-0'
                            }`}
                          />
                        )}
                        <span
                          className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                            d.rangeStart || d.rangeEnd
                              ? 'bg-[#3b82f6] text-white shadow-md'
                              : d.green
                              ? 'bg-[#10b981] text-white shadow-md'
                              : d.orange
                              ? 'bg-[#f97316] text-white shadow-md'
                              : 'text-slate-200'
                          }`}
                        >
                          {d.num}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lower Curved White Sheet */}
                <div className="bg-white rounded-t-[28px] p-3.5 shadow-xl space-y-2.5">
                  <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto" />

                  {/* Class Card (Left Screenshot Style) */}
                  <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-2xs space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                          SV
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 leading-tight">CS-201 Data Structures</div>
                          <div className="text-[10px] text-slate-400">Tue 14 March • 08:00 - 09:30 AM</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                        ONGOING
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-blue-50 text-blue-600">Computer Science</span>
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-emerald-50 text-emerald-600">Room 304</span>
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-amber-50 text-amber-700">Year 2</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 4: Attendance & GPS Check-In */}
            {currentModule === 4 && (
              <div className="max-w-lg mx-auto w-full bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-900">Classroom Check-In Terminal</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                    07:58 AM
                  </span>
                </div>

                {/* GPS Radar Circle Simulation */}
                <div className="p-3.5 rounded-2xl bg-slate-950 text-white flex items-center justify-between gap-3 relative overflow-hidden">
                  <div className="flex items-center gap-3 z-10">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 relative">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span className="text-emerald-400">● GPS Coordinates Verified</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        11.5564° N, 104.9282° E • 18m from campus center
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Inside Campus
                  </span>
                </div>

                {/* Action Button */}
                <button
                  className={`w-full py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                    checkInDone
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-300'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 active:scale-95'
                  }`}
                >
                  <UserCheck className="w-5 h-5" />
                  <span>{checkInDone ? '✓ CHECK IN COMPLETED (07:58 AM)' : 'CHECK IN (ចូលបង្រៀន) • 07:58 AM'}</span>
                </button>

                {checkInDone && (
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>Telegram Alert Dispatched to Faculty Group</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                      Delivered
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* MODULE 5: QR Badge & Door Sign */}
            {currentModule === 5 && (
              <div className="max-w-md mx-auto w-full bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900">Personal Smart QR Badge</div>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    TCH-001
                  </span>
                </div>

                {/* Mock QR Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white text-center space-y-3 shadow-md">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-400 mx-auto flex items-center justify-center text-lg font-black text-blue-200">
                    SV
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">Dr. Sovann Vichea</div>
                    <div className="text-xs text-blue-200">Faculty of Computer Science</div>
                  </div>

                  {/* QR Graphic Box */}
                  <div className="w-28 h-28 bg-white rounded-xl mx-auto p-2 flex items-center justify-center shadow-inner">
                    <QrCode className="w-24 h-24 text-slate-900" />
                  </div>
                  <div className="text-[10px] text-slate-300">
                    1 QR Code covers all scheduled weekly classes
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    <span>Download QR</span>
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      doorSignOpen
                        ? 'bg-purple-700 text-white shadow-md'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Door Sign</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODULE 6: Leave Request */}
            {currentModule === 6 && (
              <div className="max-w-lg mx-auto w-full bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="text-xs font-bold text-slate-900">Faculty Leave Application</div>
                  <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg">
                    Annual Quota: 12 Days Left
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="text-slate-500 font-bold block mb-1">Leave Category</label>
                    <input
                      readOnly
                      value="Sick Leave (ច្បាប់ឈឺ)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-500 font-bold block mb-1">From Date</label>
                      <input
                        readOnly
                        value="16 Jan 2026"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-bold block mb-1">To Date</label>
                      <input
                        readOnly
                        value="17 Jan 2026"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-500 font-bold block mb-1">Reason / Notes</label>
                    <input
                      readOnly
                      value="Doctor appointment & prescribed medical recovery"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <button
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                    leaveSubmitted
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  }`}
                >
                  <span>{leaveSubmitted ? '✓ Submitted • Status: Pending Review' : 'Submit Leave Request'}</span>
                </button>
              </div>
            )}

            {/* MODULE 7: Wage Ledger & Hours */}
            {currentModule === 7 && (
              <div className="max-w-lg mx-auto w-full bg-white p-5 rounded-3xl border border-slate-200 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Monthly Teaching Wage Summary</div>
                    <div className="text-[10px] text-slate-400">January 2026 • Verified Sessions</div>
                  </div>
                  <button
                    onClick={onDownloadRequested}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      reportExported
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{reportExported ? '✓ Exported' : 'Export Excel'}</span>
                  </button>
                </div>

                {/* Big Wage Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-200 uppercase tracking-wider block">
                      TOTAL GROSS PAYABLE
                    </span>
                    <span className="text-2xl font-black tracking-tight">$950.00</span>
                    <span className="text-[11px] text-emerald-100 block mt-0.5">
                      38.0 Verified Teaching Hours × $25.00/hr
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-xl bg-white/20 text-[11px] font-black backdrop-blur-xs">
                      19 Classes
                    </span>
                  </div>
                </div>

                {stepIndex >= 2 && (
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold text-center animate-in zoom-in-95">
                    🎉 {isKhmer ? 'វគ្គណែនាំបានបញ្ចប់ជោគជ័យ! លោកគ្រូ-អ្នកគ្រូអាចចាប់ផ្តើមប្រើប្រាស់បាន' : 'Video Manual Completed! Faculty is fully certified to operate EduTrack.'}
                  </div>
                )}
              </div>
            )}

            {/* REAL ANIMATED MOUSE CURSOR OVERLAY */}
            {!interactiveMode && (
              <div
                className="absolute pointer-events-none transition-all duration-700 ease-out z-50 flex items-center"
                style={{
                  left: `${activeStep.cursorX}%`,
                  top: `${activeStep.cursorY}%`,
                  transform: 'translate(-4px, -4px)'
                }}
              >
                {/* Expanding Click Pulse Wave */}
                {isClicking && (
                  <span className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-cyan-400/50 animate-ping" />
                )}

                {/* SVG Glowing Cursor Pointer */}
                <svg
                  className={`w-7 h-7 drop-shadow-lg transition-transform duration-150 ${
                    isClicking ? 'scale-75 text-cyan-400' : 'text-blue-500'
                  }`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="white"
                  strokeWidth="1.5"
                >
                  <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
                </svg>

                {/* Optional Step Pointer Label */}
                <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-bold border border-slate-700 shadow-md whitespace-nowrap hidden sm:inline-block">
                  {activeStep.actionType === 'click' ? 'Click' : 'Action'}
                </span>
              </div>
            )}

          </div>

          {/* Subtitles & Narration Caption Strip */}
          <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="space-y-0.5">
              <div className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>{isKhmer ? activeStep.titleKm : activeStep.titleEn}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {isKhmer ? activeStep.subtitleKm : activeStep.subtitleEn}
              </div>
            </div>

            <div className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50 shrink-0">
              Step {stepIndex + 1}/{activeModuleObj.steps.length}
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Video Player Scrub Bar & Chapter Switcher */}
      <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 space-y-3 shrink-0">
        
        {/* Playback Controls & Progress */}
        <div className="flex items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            {/* Play / Pause button */}
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (interactiveMode) setInteractiveMode(false);
              }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* Restart button */}
            <button
              onClick={handleRestart}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Restart from Module 1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Previous Module */}
            <button
              onClick={() => {
                if (currentModule > 1) handleSelectModule(currentModule - 1);
              }}
              disabled={currentModule <= 1}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
              title="Previous Module"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next Module */}
            <button
              onClick={() => {
                if (currentModule < modulesList.length) handleSelectModule(currentModule + 1);
              }}
              disabled={currentModule >= modulesList.length}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
              title="Next Module"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Module Pill Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-xl py-1">
            {modulesList.map(mod => {
              const IconComp = mod.icon;
              const isActive = mod.id === currentModule;
              return (
                <button
                  key={mod.id}
                  onClick={() => handleSelectModule(mod.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>Mod {mod.id}</span>
                </button>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
};
