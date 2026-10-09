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
  Minimize2,
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
  UserCheck,
  Bell,
  Languages,
  LayoutDashboard,
  CalendarDays,
  FileCheck,
  Coffee,
  Check,
  X
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
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
}> = ({
  initialModule = 1,
  onDownloadRequested,
  isFullscreen = true,
  onToggleFullscreen,
  onClose
}) => {
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
  const [bottomTabMode, setBottomTabMode] = useState<'list' | 'timeline'>('list');
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
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {
      // Audio autoplay policy handled safely
    }
  };

  // Modules metadata definition
  const modulesList = [
    {
      id: 1,
      titleEn: 'Module 1: App Installation on Mobile & PC (PWA)',
      titleKm: 'ផ្នែកទី ១៖ ការដំឡើងកម្មវិធី EduTrack លើទូរស័ព្ទ និងកុំព្យូទ័រ',
      icon: Smartphone,
      sidebarTab: 'dashboard',
      steps: [
        {
          id: '1-1',
          timeSec: 2,
          cursorX: 86,
          cursorY: 12,
          actionType: 'hover' as const,
          titleEn: 'Step 1: Open school web address in browser and locate "Install App"',
          titleKm: 'ជំហានទី ១៖ បើកកម្មវិធីរុករក រួចរកមើលផ្ទាំង "ដំឡើងកម្មវិធី"',
          subtitleEn: 'EduTrack is a Progressive Web App (PWA) with instant offline caching.',
          subtitleKm: 'EduTrack ជា PWA ដំណើរការលឿន និងគាំទ្រការប្រើ Offline គ្មានរបារ Browser។'
        },
        {
          id: '1-2',
          timeSec: 3,
          cursorX: 86,
          cursorY: 12,
          actionType: 'click' as const,
          titleEn: 'Step 2: Tap "Install App" to launch native installation banner',
          titleKm: 'ជំហានទី ២៖ ចុចលើ "ដំឡើងកម្មវិធី" ដើម្បីបើកផ្ទាំងដំឡើង',
          subtitleEn: 'The device prompt asks to add EduTrack MIS to the Home Screen.',
          subtitleKm: 'ប្រព័ន្ធនឹងបង្ហាញផ្ទាំងសួរដើម្បីបន្ថែម EduTrack ទៅលើ Home Screen។'
        },
        {
          id: '1-3',
          timeSec: 3,
          cursorX: 58,
          cursorY: 62,
          actionType: 'click' as const,
          titleEn: 'Step 3: Confirm "Add to Home screen"',
          titleKm: 'ជំហានទី ៣៖ ចុចយល់ព្រម "Add to Home Screen"',
          subtitleEn: 'A standalone native app icon is created on the home screen immediately.',
          subtitleKm: 'រូបតំណាងកម្មវិធីនឹងលេចឡើងលើអេក្រង់ទូរស័ព្ទភ្លាមៗ អាចចុចបើកប្រើបានគ្រប់ពេល។'
        }
      ]
    },
    {
      id: 2,
      titleEn: 'Module 2: Teacher Account Login & Security PIN',
      titleKm: 'ផ្នែកទី ២៖ ការចូលគណនីគ្រូបង្រៀន និងលេខកូដសម្ងាត់ PIN ៤ខ្ទង់',
      icon: Lock,
      sidebarTab: 'login',
      steps: [
        {
          id: '2-1',
          timeSec: 2,
          cursorX: 50,
          cursorY: 26,
          actionType: 'hover' as const,
          titleEn: 'Step 1: Select "Staff PIN" tab and choose faculty account',
          titleKm: 'ជំហានទី ១៖ ជ្រើសរើសផ្ទាំង "កូដគ្រូ PIN (Staff PIN)" និងឈ្មោះគណនីគ្រូ',
          subtitleEn: 'Select Dr. Sovann Vichea (Computer Science faculty - TCH-001).',
          subtitleKm: 'ជ្រើសរើសលោកគ្រូ សុវណ្ណ វិជ្ជា (ដេប៉ាតឺម៉ង់វិទ្យាសាស្ត្រកុំព្យូទ័រ)។'
        },
        {
          id: '2-2',
          timeSec: 1.5,
          cursorX: 43,
          cursorY: 63,
          actionType: 'click' as const,
          titleEn: 'Step 2: Enter digit [1] on confidential keypad',
          titleKm: 'ជំហានទី ២៖ ចុចលេខ [1] លើក្តារចុចលេខសម្ងាត់',
          subtitleEn: 'Digits are masked as confidential bullet dots.',
          subtitleKm: 'លេខសម្ងាត់ត្រូវបានលាក់ជាសញ្ញាចុចដើម្បីសុវត្ថិភាព។'
        },
        {
          id: '2-3',
          timeSec: 1.5,
          cursorX: 50,
          cursorY: 63,
          actionType: 'click' as const,
          titleEn: 'Step 3: Enter digits [2], [3], and [4]',
          titleKm: 'ជំហានទី ៣៖ ចុចបន្តលេខ [2], [3] និង [4]',
          subtitleEn: 'Entering 4-digit PIN completes instant identity verification.',
          subtitleKm: 'ការបញ្ចូលលេខកូដ ៤ខ្ទង់ នឹងផ្ទៀងផ្ទាត់អត្តសញ្ញាណភ្លាមៗ។'
        },
        {
          id: '2-4',
          timeSec: 2.5,
          cursorX: 57,
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
      titleEn: 'Module 3: Weekly & Monthly Schedule Timeline Calendar',
      titleKm: 'ផ្នែកទី ៣៖ កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍ និងខែ (តាមរូបភាពថ្មី)',
      icon: Calendar,
      sidebarTab: 'monthly_calendar',
      steps: [
        {
          id: '3-1',
          timeSec: 2,
          cursorX: 50,
          cursorY: 28,
          actionType: 'hover' as const,
          titleEn: 'Step 1: Check Month Capsule (< March 2026 >) & connected range',
          titleKm: 'ជំហានទី ១៖ ពិនិត្យខែ (< March 2026 >) និងរបារថ្ងៃភ្ជាប់គ្នា ១៤-១៨',
          subtitleEn: 'Deep navy midnight header with connected blue range pill capsule.',
          subtitleKm: 'ប្រតិទិនខៀវចាស់ជាមួយរបារថ្ងៃភ្ជាប់គ្នា និងរង្វង់ពណ៌បៃតង/ទឹកក្រូច។'
        },
        {
          id: '3-2',
          timeSec: 2.5,
          cursorX: 54,
          cursorY: 34,
          actionType: 'click' as const,
          titleEn: 'Step 2: Tap Wednesday (Day 14) inside the connected capsule',
          titleKm: 'ជំហានទី ២៖ ចុចលើថ្ងៃពុធ (ទី ១៤) ក្នុងរបារកាលវិភាគ',
          subtitleEn: 'Day 14 lights up in vibrant solid blue pill.',
          subtitleKm: 'ថ្ងៃទី ១៤ រំលេចពណ៌ខៀវដិតច្បាស់ងាយស្រួលមើល។'
        },
        {
          id: '3-3',
          timeSec: 3,
          cursorX: 50,
          cursorY: 65,
          actionType: 'click' as const,
          titleEn: 'Step 3: Review class card: CS-201 Data Structures (Room 304)',
          titleKm: 'ជំហានទី ៣៖ ពិនិត្យកាតម៉ោងបង្រៀន៖ CS-201 (បន្ទប់ 304 ម៉ោង 08:00)',
          subtitleEn: 'Curved white sheet displays category tag pills and ONGOING status.',
          subtitleKm: 'ផ្ទាំងសបង្ហាញស្លាកពណ៌ និងស្ថានភាពកំពុងបង្រៀន (ONGOING)។'
        }
      ]
    },
    {
      id: 4,
      titleEn: 'Module 4: Classroom Attendance & GPS Campus Kiosk',
      titleKm: 'ផ្នែកទី ៤៖ វត្តមានចូលបង្រៀន & ផ្ទៀងផ្ទាត់ GPS បរិវេណសាលា',
      icon: MapPin,
      sidebarTab: 'kiosk',
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
      titleEn: 'Module 5: Personal QR Code Badge & Printable Door Sign',
      titleKm: 'ផ្នែកទី ៥៖ កូដ QR ផ្ទាល់ខ្លួន & ស្លាកបិទទ្វារថ្នាក់រៀន A4',
      icon: QrCode,
      sidebarTab: 'qr',
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
          cursorX: 56,
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
      titleEn: 'Module 6: Leave Requests & Academic Holidays',
      titleKm: 'ផ្នែកទី ៦៖ ការស្នើសុំច្បាប់សម្រាក & ប្រតិទិនឈប់សម្រាក',
      icon: Palmtree,
      sidebarTab: 'leave',
      steps: [
        {
          id: '6-1',
          timeSec: 2,
          cursorX: 75,
          cursorY: 22,
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
      titleEn: 'Module 7: Verified Teaching Hours & Gross Wage Summary Report',
      titleKm: 'ផ្នែកទី ៧៖ របាយការណ៍ម៉ោងបង្រៀន & ប្រាក់ឈ្នួលសរុបប្រចាំខែ',
      icon: DollarSign,
      sidebarTab: 'reports',
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
        if (currentModule < modulesList.length) {
          setCurrentModule(prev => prev + 1);
          setStepIndex(0);
          resetModuleStates(currentModule + 1);
        } else {
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
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-100 font-sans select-none relative overflow-hidden">
      
      {/* ======================================================== */}
      {/* 1. ACTUAL 100% REAL EDUTRACK TOP APP HEADER */}
      {/* ======================================================== */}
      <header className="bg-gradient-to-r from-[#071b38] via-[#0b2a5e] to-[#041329] border-b border-blue-900/40 text-white px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-lg shrink-0 z-40">
        
        {/* Left: Organization Branding & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black shadow-md shadow-blue-500/25 shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-wide text-white uppercase">
                EDUTRACK ACADEMIC MIS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-cyan-300 border border-blue-400/30 hidden sm:inline-block">
                FACULTY PORTAL
              </span>
            </div>
            <span className="text-[10px] text-blue-200/80 font-medium block">
              International Academic System • Year 2026-2027
            </span>
          </div>
        </div>

        {/* Right: Live Clock, Language Toggle, Notification Bell, Faculty Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Live Clock */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-blue-200 font-mono bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>08:45 AM</span>
          </div>

          {/* Language Toggle Badge */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-xl text-xs font-bold border border-white/15 text-slate-200">
            <Languages className="w-3.5 h-3.5 text-cyan-300" />
            <span>🇰🇭 ភាសាខ្មែរ</span>
          </div>

          {/* Notifications Bell */}
          <div className="relative p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
              2
            </span>
          </div>

          {/* Faculty Profile Pill */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-400/30 px-3 py-1.5 rounded-2xl shadow-xs">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
              SV
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-white block leading-tight">Dr. Sovann Vichea</span>
              <span className="text-[10px] text-cyan-300 font-mono leading-none">TCH-001 • Computer Science</span>
            </div>
          </div>

          {/* Header Action: Install App (Module 1 highlight) */}
          {currentModule === 1 && (
            <div
              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md ${
                pwaInstalled
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white animate-pulse'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{pwaInstalled ? '✓ Installed' : 'Install App'}</span>
            </div>
          )}

          {/* Fullscreen & Close button */}
          <div className="flex items-center gap-1.5 border-l border-white/15 pl-3">
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                title="Close Video Manual"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

      </header>

      {/* ======================================================== */}
      {/* 2. REAL APP BODY (SIDEBAR + MAIN CONTENT VIEWPORT) */}
      {/* ======================================================== */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* Real Left Navigation Sidebar */}
        <aside className="w-16 sm:w-60 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-2 sm:p-3 shrink-0">
          <nav className="space-y-1">
            {[
              { id: 'dashboard', icon: LayoutDashboard, labelEn: 'Dashboard', labelKm: 'ផ្ទាំងដើម', mod: 1 },
              { id: 'schedules', icon: CalendarDays, labelEn: 'Daily Schedule', labelKm: 'កាលវិភាគ', mod: 3 },
              { id: 'monthly_calendar', icon: Calendar, labelEn: 'Monthly Calendar', labelKm: 'ប្រចាំខែ', mod: 3 },
              { id: 'kiosk', icon: MapPin, labelEn: 'Attendance Kiosk', labelKm: 'ស្កេនវត្តមាន', mod: 4 },
              { id: 'qr', icon: QrCode, labelEn: 'Personal QR Badge', labelKm: 'កូដ QR គ្រូ', mod: 5 },
              { id: 'leave', icon: Palmtree, labelEn: 'Leave Requests', labelKm: 'ច្បាប់សម្រាក', mod: 6 },
              { id: 'reports', icon: DollarSign, labelEn: 'Wage Reports', labelKm: 'ប្រាក់ឈ្នួល', mod: 7 }
            ].map(tab => {
              const IconComp = tab.icon;
              const isActive = activeModuleObj.sidebarTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectModule(tab.mod)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline-block">{isKhmer ? tab.labelKm : tab.labelEn}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden sm:block p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="text-cyan-400 font-bold block">100% Real Live MIS</span>
            <span>Faculty verified environment with active real-time data sync.</span>
          </div>
        </aside>

        {/* Real Main Viewport Rendering Authentic Views */}
        <main className="flex-1 bg-slate-950/60 overflow-y-auto p-3 sm:p-6 flex flex-col justify-center items-center relative">
          
          {/* ======================================================== */}
          {/* MODULE 1: PWA Installation View */}
          {/* ======================================================== */}
          {currentModule === 1 && (
            <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-900 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30">
                <Smartphone className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  {isKhmer ? 'ដំឡើងកម្មវិធី EduTrack លើទូរស័ព្ទ និងកុំព្យូទ័រ' : 'Install EduTrack MIS on Home Screen'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isKhmer
                    ? 'ដំណើរការពេញអេក្រង់ គ្មានរបារ Browser ជាមួយការទាញទិន្នន័យក្រៅបណ្តាញ Offline'
                    : '1-tap native full-screen experience with zero browser address bars and offline caching.'}
                </p>
              </div>

              {/* Real PWA Install Banner Simulation */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white border border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-black">
                    E
                  </div>
                  <div>
                    <div className="text-xs font-bold">EduTrack Faculty Portal</div>
                    <div className="text-[10px] text-slate-400">edutrack.school.edu • Progressive Web App (PWA)</div>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  {isKhmer
                    ? 'បន្ថែមកម្មវិធីទៅលើផ្ទាំងទូរស័ព្ទដើម្បីចូលមើលកាលវិភាគ និងស្កេនវត្តមានបានលឿន?'
                    : 'Add application to home screen for instant 1-tap faculty attendance and schedule?'}
                </p>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button className="px-3 py-1.5 rounded-xl text-xs text-slate-400">Cancel</button>
                  <button
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md ${
                      pwaInstalled ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {pwaInstalled ? '✓ Added to Home Screen' : 'Add to Home screen'}
                  </button>
                </div>
              </div>

              {pwaInstalled && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isKhmer ? 'ដំឡើងជោគជ័យ! កម្មវិធីរួចរាល់លើ Home Screen' : 'Installed successfully! Icon created on Home Screen'}</span>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 2: Authentic 100% Real LoginPage Card */}
          {/* ======================================================== */}
          {currentModule === 2 && (
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 text-slate-900 animate-in zoom-in-95">
              <div className="flex items-center justify-center gap-2 border-b border-slate-100 pb-3">
                <div className="px-3.5 py-1 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold">
                  Admin / Staff
                </div>
                <div className="px-3.5 py-1 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs">
                  Staff PIN (គ្រូ) ✓
                </div>
              </div>

              <div className="text-center space-y-0.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">SELECTED FACULTY</span>
                <span className="text-sm font-black text-slate-900 block">Dr. Sovann Vichea (TCH-001)</span>
              </div>

              {/* PIN Bullets Display */}
              <div className="flex items-center justify-center gap-3 py-2">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center font-black text-lg transition-all ${
                      pinDigits.length > idx
                        ? 'border-blue-600 bg-blue-50 text-blue-600 scale-105'
                        : 'border-slate-300 bg-slate-50 text-transparent'
                    }`}
                  >
                    ●
                  </div>
                ))}
              </div>

              {/* Numeric Keypad Grid */}
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto text-sm font-black">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✓'].map(btn => {
                  const isPressed =
                    (btn === '1' && pinDigits.length >= 1) ||
                    (btn === '2' && pinDigits.length >= 2) ||
                    (btn === '3' && pinDigits.length >= 3) ||
                    (btn === '4' && pinDigits.length >= 4);

                  return (
                    <button
                      key={btn}
                      className={`h-11 rounded-xl border flex items-center justify-center transition-all ${
                        isPressed
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-95'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      {btn}
                    </button>
                  );
                })}
              </div>

              {stepIndex >= 3 && (
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Access Granted • Welcome Dr. Sovann!</span>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 3: 100% Real Monthly Schedule Matching Screenshot */}
          {/* ======================================================== */}
          {currentModule === 3 && (
            <div className="w-full max-w-md bg-[#09152b] rounded-[38px] overflow-hidden border border-blue-900/60 shadow-2xl flex flex-col text-white animate-in zoom-in-95">
              
              {/* Upper Midnight Navy Calendar */}
              <div className="p-5 space-y-4 bg-[#09152b]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400">June, 21 Wednesday</span>
                  <div className="bg-[#13223f] px-3.5 py-1.5 rounded-xl text-xs font-bold border border-blue-900/50">
                    &lt; March 2026 &gt;
                  </div>
                </div>

                {/* Day of Week */}
                <div className="grid grid-cols-7 text-center font-bold text-[10px] text-slate-400 tracking-wider">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
                    <span key={d}>{d}</span>
                  ))}
                </div>

                {/* Date Grid with Connected Capsule Range (14-18) */}
                <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-bold">
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
                    <div key={i} className="relative flex items-center justify-center h-8">
                      {(d.range || d.rangeStart || d.rangeEnd) && (
                        <div
                          className={`absolute inset-y-0.5 bg-[#2563eb]/25 ${
                            d.rangeStart ? 'left-0.5 right-0 rounded-l-full' : d.rangeEnd ? 'left-0 right-0.5 rounded-r-full' : 'inset-x-0'
                          }`}
                        />
                      )}
                      <span
                        className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${
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
              <div className="bg-white rounded-t-[34px] p-5 shadow-2xl space-y-3 text-slate-900">
                <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />

                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">Tue 14 March 2026</div>
                  <div className="flex items-center gap-1 text-[11px] font-bold bg-slate-100 p-0.5 rounded-xl">
                    <span className="px-2 py-0.5 bg-white text-blue-600 rounded-lg shadow-2xs">List</span>
                    <span className="px-2 py-0.5 text-slate-500">Timeline</span>
                  </div>
                </div>

                {/* Class Card */}
                <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                        SV
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 leading-tight">CS-201 Data Structures</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">08:00 - 09:30 AM • Year 2</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                      ONGOING
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600">Computer Science</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600">Room 304</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700">Period 1</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 4: Authentic CheckInKiosk Interface */}
          {/* ======================================================== */}
          {currentModule === 4 && (
            <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 text-slate-900 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-900">Classroom Check-In Terminal</span>
                </div>
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                  07:58 AM
                </span>
              </div>

              {/* GPS Radar Circle Simulation */}
              <div className="p-4 rounded-2xl bg-slate-950 text-white flex items-center justify-between gap-3 relative overflow-hidden">
                <div className="flex items-center gap-3 z-10">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 relative">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                      ● GPS Verified Inside Campus Perimeter
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      11.5564° N, 104.9282° E • 18m from building (&lt; 500m)
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Inside Campus
                </span>
              </div>

              <button
                className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                  checkInDone
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-300'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 active:scale-95'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span>{checkInDone ? '✓ CHECK IN COMPLETED (07:58 AM)' : 'CHECK IN (ចូលបង្រៀន) • 07:58 AM'}</span>
              </button>

              {checkInDone && (
                <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-600" />
                    <span>Telegram Alert Sent to School Group #Faculty</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                    Delivered
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 5: Personal QR Badge & Door Sign */}
          {/* ======================================================== */}
          {currentModule === 5 && (
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4 text-slate-900 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Personal Faculty Smart QR Badge</span>
                <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                  TCH-001
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white text-center space-y-3 shadow-md">
                <div className="w-14 h-14 rounded-full bg-blue-500/20 border-2 border-blue-400 mx-auto flex items-center justify-center text-xl font-black text-blue-200">
                  SV
                </div>
                <div>
                  <div className="text-sm font-black text-white">Dr. Sovann Vichea</div>
                  <div className="text-xs text-blue-200">Department of Computer Science</div>
                </div>

                <div className="w-32 h-32 bg-white rounded-2xl mx-auto p-2 flex items-center justify-center shadow-inner">
                  <QrCode className="w-28 h-28 text-slate-900" />
                </div>
                <div className="text-[10px] text-slate-300">
                  1 Master QR Code routes all weekly periods Monday to Saturday
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5">
                  <Download className="w-4 h-4" />
                  <span>Download QR</span>
                </button>
                <button
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    doorSignOpen ? 'bg-purple-700 text-white shadow-md' : 'bg-purple-600 text-white'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Door Sign</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 6: Leave Request */}
          {/* ======================================================== */}
          {currentModule === 6 && (
            <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4 text-slate-900 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="text-xs font-bold text-slate-900">Faculty Leave Application</div>
                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                  Annual Quota: 12 Days Left
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Leave Category</label>
                  <input
                    readOnly
                    value="Sick Leave (ច្បាប់ឈឺ)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-500 font-bold block mb-1">From Date</label>
                    <input
                      readOnly
                      value="16 Jan 2026"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-bold block mb-1">To Date</label>
                    <input
                      readOnly
                      value="17 Jan 2026"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Reason / Notes</label>
                  <input
                    readOnly
                    value="Doctor appointment & prescribed medical recovery"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <button
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  leaveSubmitted
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-blue-600 text-white shadow-md'
                }`}
              >
                <span>{leaveSubmitted ? '✓ Submitted • Status: Pending Review' : 'Submit Leave Request'}</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 7: Wage Ledger & Hours */}
          {/* ======================================================== */}
          {currentModule === 7 && (
            <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4 text-slate-900 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs font-bold text-slate-900">Monthly Teaching Wage Summary</div>
                  <div className="text-[10px] text-slate-400">January 2026 • Verified Sessions</div>
                </div>
                <button
                  onClick={onDownloadRequested}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    reportExported ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{reportExported ? '✓ Exported' : 'Export Excel'}</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-200 uppercase tracking-wider block">
                    TOTAL GROSS PAYABLE
                  </span>
                  <span className="text-3xl font-black tracking-tight">$950.00</span>
                  <span className="text-xs text-emerald-100 block mt-0.5">
                    38.0 Verified Teaching Hours × $25.00/hr
                  </span>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-white/20 text-xs font-black">
                  19 Classes
                </span>
              </div>

              {stepIndex >= 2 && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold text-center animate-in zoom-in-95">
                  🎉 {isKhmer ? 'វគ្គណែនាំបានបញ្ចប់ជោគជ័យ! លោកគ្រូ-អ្នកគ្រូរួចរាល់ក្នុងការប្រើប្រាស់' : 'Training Complete! Faculty is certified to operate EduTrack.'}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* REAL ANIMATED MOUSE CURSOR OVERLAY */}
          {/* ======================================================== */}
          {!interactiveMode && (
            <div
              className="absolute pointer-events-none transition-all duration-700 ease-out z-50 flex items-center"
              style={{
                left: `${activeStep.cursorX}%`,
                top: `${activeStep.cursorY}%`,
                transform: 'translate(-4px, -4px)'
              }}
            >
              {isClicking && (
                <span className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-cyan-400/50 animate-ping" />
              )}

              <svg
                className={`w-7 h-7 drop-shadow-xl transition-transform duration-150 ${
                  isClicking ? 'scale-75 text-cyan-400' : 'text-blue-500'
                }`}
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="white"
                strokeWidth="1.5"
              >
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
              </svg>

              <span className="ml-2 px-2.5 py-1 rounded-lg bg-slate-950/95 text-white text-[11px] font-bold border border-slate-700 shadow-xl whitespace-nowrap hidden sm:inline-block">
                {activeStep.actionType === 'click' ? 'Click' : 'Action'}
              </span>
            </div>
          )}

        </main>

      </div>

      {/* ======================================================== */}
      {/* 3. FLOATING CINEMATIC VIDEO PLAYER CONTROLS & CAPTIONS */}
      {/* ======================================================== */}
      <div className="bg-slate-950/95 border-t border-slate-800/80 px-4 sm:px-6 py-3 flex flex-col gap-2.5 shrink-0 z-40">
        
        {/* Dual Language Subtitle Caption Bar */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <div className="text-white font-bold">
              <span>{isKhmer ? activeStep.titleKm : activeStep.titleEn}</span>
              <span className="text-slate-400 font-normal ml-2 hidden sm:inline">
                {isKhmer ? activeStep.subtitleKm : activeStep.subtitleEn}
              </span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-cyan-400 bg-cyan-950/70 px-2.5 py-0.5 rounded-lg border border-cyan-800/50 shrink-0">
            Step {stepIndex + 1}/{activeModuleObj.steps.length}
          </div>
        </div>

        {/* Video Scrubber & Playback Controls Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (interactiveMode) setInteractiveMode(false);
              }}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={handleRestart}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Restart from Module 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (currentModule > 1) handleSelectModule(currentModule - 1);
              }}
              disabled={currentModule <= 1}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 cursor-pointer"
              title="Previous Module"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (currentModule < modulesList.length) handleSelectModule(currentModule + 1);
              }}
              disabled={currentModule >= modulesList.length}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 cursor-pointer"
              title="Next Module"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Module 1 to 7 Jump Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {modulesList.map(mod => {
              const IconComp = mod.icon;
              const isActive = mod.id === currentModule;
              return (
                <button
                  key={mod.id}
                  onClick={() => handleSelectModule(mod.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <IconComp className="w-3 h-3" />
                  <span>Mod {mod.id}</span>
                </button>
              );
            })}
          </div>

          {/* Right Action Controls: Interactive, Sound, Speed */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setInteractiveMode(!interactiveMode);
                if (!interactiveMode) setIsPlaying(false);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                interactiveMode
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{interactiveMode ? 'Try-It Mode Active' : 'Try-It Yourself'}</span>
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <button
              onClick={() => {
                const speeds = [0.75, 1, 1.25, 1.5];
                setPlaybackSpeed(speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length]);
              }}
              className="px-2 py-1 rounded-xl bg-slate-800 text-slate-300 font-mono text-[11px] cursor-pointer"
            >
              {playbackSpeed}x
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
