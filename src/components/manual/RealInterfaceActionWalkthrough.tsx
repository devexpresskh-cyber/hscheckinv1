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
  X,
  Film,
  LogIn,
  LogOut,
  Globe,
  Search,
  ArrowRight,
  CornerDownLeft
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
  onSwitchToVideoPlayer?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
}> = ({
  initialModule = 1,
  onDownloadRequested,
  onSwitchToVideoPlayer,
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
  const [browserUrlText, setBrowserUrlText] = useState<string>('');
  const [isBrowserFocused, setIsBrowserFocused] = useState<boolean>(false);
  const [isPageLoaded, setIsPageLoaded] = useState<boolean>(false);
  const [pwaInstalled, setPwaInstalled] = useState<boolean>(false);
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('Wed');
  const [selectedClassCard, setSelectedClassCard] = useState<boolean>(false);
  const [bottomTabMode, setBottomTabMode] = useState<'list' | 'timeline'>('list');
  const [scheduleCheckedIn, setScheduleCheckedIn] = useState<boolean>(false);
  const [scheduleCheckedOut, setScheduleCheckedOut] = useState<boolean>(false);
  const [checkInDone, setCheckInDone] = useState<boolean>(false);
  const [kioskCheckedOut, setKioskCheckedOut] = useState<boolean>(false);
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
      titleEn: 'Module 1: Opening Web Browser, Entering Link & App Installation',
      titleKm: 'ផ្នែកទី ១៖ ការបើកកម្មវិធីរុករក វាយបញ្ចូលតំណភ្ជាប់ (Web Link) & ដំឡើងកម្មវិធី',
      icon: Smartphone,
      sidebarTab: 'dashboard',
      steps: [
        {
          id: '1-1',
          timeSec: 2.5,
          cursorX: 50,
          cursorY: 18,
          actionType: 'click' as const,
          titleEn: 'Step 1: Open Chrome / Safari browser and tap the top URL Address Bar',
          titleKm: 'ជំហានទី ១៖ បើកកម្មវិធីរុករក (Chrome / Safari) រួចចុចលើរបារអាសយដ្ឋាន (URL Bar)',
          subtitleEn: 'Tapping the top search/URL bar opens the keyboard ready for web address entry.',
          subtitleKm: 'ចុចលើប្រអប់អាសយដ្ឋានខាងលើ ដើម្បីរៀបចំវាយបញ្ចូលតំណភ្ជាប់គេហទំព័រ។'
        },
        {
          id: '1-2',
          timeSec: 3,
          cursorX: 58,
          cursorY: 18,
          actionType: 'type' as const,
          titleEn: 'Step 2: Type or paste the school portal link: https://edutrack.edu.kh',
          titleKm: 'ជំហានទី ២៖ វាយបញ្ចូល ឬបិទភ្ជាប់តំណភ្ជាប់សាលា៖ https://edutrack.edu.kh',
          subtitleEn: 'Enter the exact school domain. Live autocomplete matches EduTrack Academic MIS.',
          subtitleKm: 'វាយបញ្ចូលអាសយដ្ឋានគេហទំព័ររបស់សាលា ប្រព័ន្ធនឹងបង្ហាញឈ្មោះស្វ័យប្រវត្តិ។'
        },
        {
          id: '1-3',
          timeSec: 2.5,
          cursorX: 50,
          cursorY: 28,
          actionType: 'click' as const,
          titleEn: 'Step 3: Tap "Go / Enter" to navigate & load the EduTrack MIS page',
          titleKm: 'ជំហានទី ៣៖ ចុចប៊ូតុង "Go" ឬ "Enter" ដើម្បីបើកទំព័រប្រព័ន្ធ EduTrack',
          subtitleEn: 'Browser connects securely via HTTPS and loads the real-time teacher environment.',
          subtitleKm: 'កម្មវិធីរុករកភ្ជាប់ដោយសុវត្ថិភាព HTTPS និងបង្ហាញទំព័រគ្រប់គ្រងការសិក្សាភ្លាមៗ។'
        },
        {
          id: '1-4',
          timeSec: 2.5,
          cursorX: 74,
          cursorY: 34,
          actionType: 'click' as const,
          titleEn: 'Step 4: Tap "Install App" banner or browser menu (⋮) → "Add to Home screen"',
          titleKm: 'ជំហានទី ៤៖ ចុចលើផ្ទាំង "ដំឡើងកម្មវិធី (Install App)" ឬ Menu (⋮) → Add to Home screen',
          subtitleEn: 'The device displays the native install prompt to save EduTrack to Home Screen.',
          subtitleKm: 'ទូរស័ព្ទបង្ហាញផ្ទាំងដំឡើង ដើម្បីដាក់រូបតំណាងកម្មវិធីលើអេក្រង់ដើម។'
        },
        {
          id: '1-5',
          timeSec: 3,
          cursorX: 68,
          cursorY: 68,
          actionType: 'success' as const,
          titleEn: 'Step 5: Confirm "Add to Home screen" - 1-tap standalone app ready!',
          titleKm: 'ជំហានទី ៥៖ ចុចយល់ព្រម "Add to Home Screen" - កម្មវិធីរួចរាល់លើអេក្រង់ទូរស័ព្ទ!',
          subtitleEn: 'Launch directly from home screen anytime without retyping the URL address bar.',
          subtitleKm: 'ចុចបើកប្រើលើអេក្រង់ទូរស័ព្ទបានគ្រប់ពេល ដោយមិនបាច់វាយតំណភ្ជាប់ URL ម្តងទៀតឡើយ។'
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
      titleEn: 'Module 3: Current Schedule Check-In & Check-Out Timeline',
      titleKm: 'ផ្នែកទី ៣៖ ការស្កេនចូល-ចេញ លើកាលវិភាគបង្រៀនជាក់ស្តែង',
      icon: Calendar,
      sidebarTab: 'monthly_calendar',
      steps: [
        {
          id: '3-1',
          timeSec: 2.5,
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
          titleEn: 'Step 2: Tap Wednesday (Day 14) to view today\'s current classes',
          titleKm: 'ជំហានទី ២៖ ចុចលើថ្ងៃពុធ (ទី ១៤) ដើម្បីមើលម៉ោងបង្រៀនថ្ងៃនេះ',
          subtitleEn: 'Day 14 lights up in vibrant solid blue pill, loading today\'s schedule.',
          subtitleKm: 'ថ្ងៃទី ១៤ រំលេចពណ៌ខៀវដិតច្បាស់ និងបង្ហាញកាលវិភាគថ្ងៃនេះ។'
        },
        {
          id: '3-3',
          timeSec: 2.5,
          cursorX: 50,
          cursorY: 62,
          actionType: 'hover' as const,
          titleEn: 'Step 3: Review current schedule card: CS-201 Data Structures (Room 304)',
          titleKm: 'ជំហានទី ៣៖ ពិនិត្យកាតម៉ោងបង្រៀនបច្ចុប្បន្ន៖ CS-201 (បន្ទប់ 304 ម៉ោង ០៨:០០ ព្រឹក)',
          subtitleEn: 'Shows start time 08:00 AM, department, period, and status ready for check-in.',
          subtitleKm: 'បង្ហាញម៉ោង ០៨:០០ ព្រឹក ដេប៉ាតឺម៉ង់ បន្ទប់ និងប៊ូតុងត្រៀមស្កេនចូល។'
        },
        {
          id: '3-4',
          timeSec: 3,
          cursorX: 62,
          cursorY: 74,
          actionType: 'click' as const,
          titleEn: 'Step 4: Tap "Check In Class (ស្កេនចូល)" to start teaching session',
          titleKm: 'ជំហានទី ៤៖ ចុចប៊ូតុង "ស្កេនចូល (Check In)" ដើម្បីចាប់ផ្តើមបង្រៀន',
          subtitleEn: 'Locks check-in at 08:00 AM; verifies presence and notifies coordinator.',
          subtitleKm: 'កត់ត្រាម៉ោងចូល ០៨:០០ ព្រឹក ផ្ទៀងផ្ទាត់វត្តមាន និងផ្ញើដំណឹងភ្លាមៗ។'
        },
        {
          id: '3-5',
          timeSec: 3,
          cursorX: 50,
          cursorY: 74,
          actionType: 'hover' as const,
          titleEn: 'Step 5: Session In Progress: Status becomes "IN PROGRESS (កំពុងបង្រៀន)"',
          titleKm: 'ជំហានទី ៥៖ ម៉ោងបង្រៀនកំពុងដំណើរការ៖ ស្ថានភាពប្តូរទៅ "កំពុងបង្រៀន"',
          subtitleEn: 'Live elapsed timer counts teaching duration. Button switches to Check Out.',
          subtitleKm: 'នាឡិការាប់ម៉ោងបង្រៀនជាក់ស្តែង ហើយប៊ូតុងប្តូរទៅជា "ស្កេនចេញ (Check Out)"។'
        },
        {
          id: '3-6',
          timeSec: 3,
          cursorX: 62,
          cursorY: 74,
          actionType: 'click' as const,
          titleEn: 'Step 6: Tap "Check Out Class (ស្កេនចេញ)" when period finishes',
          titleKm: 'ជំហានទី ៦៖ ចុចប៊ូតុង "ស្កេនចេញ (Check Out)" នៅពេលចប់ម៉ោងបង្រៀន',
          subtitleEn: 'Locks checkout at 09:30 AM (90 mins = 1.5 verified hours calculated).',
          subtitleKm: 'កត់ត្រាម៉ោងបញ្ចប់ ០៩:៣០ ព្រឹក (៩០ នាទី = ១.៥ ម៉ោងបង្រៀនគណនាចូលប្រាក់ឈ្នួល)។'
        },
        {
          id: '3-7',
          timeSec: 3,
          cursorX: 50,
          cursorY: 78,
          actionType: 'success' as const,
          titleEn: 'Step 7: Session Completed! Verified Wage Hours Logged to Ledger',
          titleKm: 'ជំហានទី ៧៖ បញ្ចប់ម៉ោងបង្រៀនជោគជ័យ! ទិន្នន័យម៉ោងត្រូវបានបញ្ចូលក្នុងបញ្ជីប្រាក់ឈ្នួល',
          subtitleEn: 'Both In & Out timestamps recorded. Telegram broadcast dispatched.',
          subtitleKm: 'កំណត់ត្រាម៉ោងចូល និងម៉ោងចេញពេញលេញ ជាមួយរបាយការណ៍ម៉ោងបង្រៀន។'
        }
      ]
    },
    {
      id: 4,
      titleEn: 'Module 4: Classroom Attendance & GPS Campus Kiosk',
      titleKm: 'ផ្នែកទី ៤៖ វត្តមានចូល-ចេញ & ផ្ទៀងផ្ទាត់ GPS បរិវេណសាលា',
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
          cursorY: 64,
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
          cursorY: 64,
          actionType: 'hover' as const,
          titleEn: 'Step 4: Attendance confirmed & Telegram notification sent!',
          titleKm: 'ជំហានទី ៤៖ កត់ត្រាវត្តមានជោគជ័យ & ផ្ញើដំណឹងស្វ័យប្រវត្តិទៅ Telegram!',
          subtitleEn: 'School administration and faculty channel receive instant proof.',
          subtitleKm: 'គណៈគ្រប់គ្រង និងក្រុមការងារសាលាទទួលបានសារដំណឹងតាម Telegram ភ្លាមៗ។'
        },
        {
          id: '4-5',
          timeSec: 3,
          cursorX: 50,
          cursorY: 70,
          actionType: 'click' as const,
          titleEn: 'Step 5: End of class: Click "CHECK OUT (បញ្ចប់ម៉ោងបង្រៀន)"',
          titleKm: 'ជំហានទី ៥៖ ចប់ម៉ោងបង្រៀន៖ ចុចប៊ូតុង "CHECK OUT (បញ្ចប់ម៉ោង)"',
          subtitleEn: 'Clock out timestamp logged at 09:30 AM (1.5 verified teaching hours).',
          subtitleKm: 'កត់ត្រាម៉ោងចេញនៅម៉ោង ០៩:៣០ ព្រឹក (១.៥ ម៉ោងបង្រៀនត្រូវបានបញ្ជាក់)។'
        },
        {
          id: '4-6',
          timeSec: 3,
          cursorX: 50,
          cursorY: 70,
          actionType: 'success' as const,
          titleEn: 'Step 6: Class completed! Verified hours logged to wage payroll',
          titleKm: 'ជំហានទី ៦៖ បញ្ចប់ម៉ោងបង្រៀន! ម៉ោងជាក់ស្តែងបញ្ចូលក្នុងបញ្ជីប្រាក់ឈ្នួល',
          subtitleEn: 'Total duration (92 mins) synced to monthly faculty salary report.',
          subtitleKm: 'រយៈពេលសរុប (៩២ នាទី) ត្រូវបានធ្វើសមកាលកម្មទៅរបាយការណ៍ប្រាក់បៀវត្ស។'
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
          titleEn: 'Step 2: Select Duration Mode: Hourly (2.0 hrs: 08:00-10:00) or Full Days',
          titleKm: 'ជំហានទី ២៖ ជ្រើសរើសទម្រង់សុំច្បាប់៖ ជាម៉ោង (២ ម៉ោង៖ ០៨:០០-១០:០០) ឬជាថ្ងៃពេញ',
          subtitleEn: 'Supports flexible partial-day hour leaves matching specific class periods.',
          subtitleKm: 'គាំទ្រការសុំច្បាប់ជាម៉ោងបត់បែន ស្របតាមវេនម៉ោងបង្រៀនជាក់ស្តែង។'
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

        if (currentModule === 1 && stepIndex === 0) {
          setIsBrowserFocused(true);
          setBrowserUrlText('');
          setIsPageLoaded(false);
          setPwaInstalled(false);
        } else if (currentModule === 1 && stepIndex === 1) {
          setIsBrowserFocused(true);
          setBrowserUrlText('https://edutrack.edu.kh');
          playSfx('key');
        } else if (currentModule === 1 && stepIndex === 2) {
          setIsBrowserFocused(false);
          setBrowserUrlText('https://edutrack.edu.kh');
          setIsPageLoaded(true);
          playSfx('success');
        } else if (currentModule === 1 && stepIndex === 3) {
          playSfx('click');
        } else if (currentModule === 1 && stepIndex === 4) {
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
        } else if (currentModule === 3 && stepIndex === 3) {
          setScheduleCheckedIn(true);
          playSfx('success');
        } else if (currentModule === 3 && stepIndex === 5) {
          setScheduleCheckedOut(true);
          playSfx('success');
        } else if (currentModule === 4 && stepIndex === 2) {
          setCheckInDone(true);
          playSfx('success');
        } else if (currentModule === 4 && stepIndex === 4) {
          setKioskCheckedOut(true);
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
    if (modId === 1) {
      setPwaInstalled(false);
      setBrowserUrlText('');
      setIsBrowserFocused(false);
      setIsPageLoaded(false);
    }
    if (modId === 2) setPinDigits([]);
    if (modId === 3) {
      setSelectedDay('Wed');
      setSelectedClassCard(false);
      setScheduleCheckedIn(false);
      setScheduleCheckedOut(false);
    }
    if (modId === 4) {
      setCheckInDone(false);
      setKioskCheckedOut(false);
    }
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

          {/* Switch to Pre-recorded 1080p MP4 */}
          {onSwitchToVideoPlayer && (
            <button
              onClick={onSwitchToVideoPlayer}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 transition-colors border border-white/10 cursor-pointer"
              title="Watch Recorded 1080p MP4 Video"
            >
              <Film className="w-3.5 h-3.5 text-cyan-300" />
              <span>MP4 Video</span>
            </button>
          )}

          {/* Download 1080p MP4 Button */}
          {onDownloadRequested && (
            <button
              onClick={onDownloadRequested}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              title="Download 1080p MP4 Video Manual"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{isKhmer ? 'ទាញយក MP4' : 'Download MP4'}</span>
            </button>
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
          {/* MODULE 1: Real Web Browser URL Entry & PWA Installation */}
          {/* ======================================================== */}
          {currentModule === 1 && (
            <div className="w-full max-w-xl bg-slate-900 rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95">
              
              {/* Top Browser Bar: Window Controls + Browser Tab */}
              <div className="bg-slate-950 px-4 pt-3 pb-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  {/* Browser Tab */}
                  <div className="ml-3 px-3 py-1 bg-slate-900 rounded-t-xl text-[11px] font-bold text-slate-200 border-t border-x border-slate-800 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">
                      E
                    </div>
                    <span className="truncate max-w-[140px] sm:max-w-[200px]">
                      {isPageLoaded ? 'EduTrack Academic MIS' : 'New Tab'}
                    </span>
                    <span className="text-slate-500 hover:text-white cursor-pointer ml-1">×</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
                  Chrome / Safari
                </div>
              </div>

              {/* Browser Navigation & Address (URL) Bar */}
              <div className="bg-slate-900 px-3 sm:px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
                <div className="flex items-center gap-1 text-slate-400">
                  <button className="p-1 hover:text-white rounded transition-colors text-xs cursor-pointer">‹</button>
                  <button className="p-1 hover:text-white rounded transition-colors text-xs cursor-pointer">›</button>
                  <button className="p-1 hover:text-white rounded transition-colors text-xs cursor-pointer">↻</button>
                </div>

                {/* THE ACTUAL URL ADDRESS BAR INPUT */}
                <div
                  onClick={() => {
                    if (interactiveMode) {
                      setIsBrowserFocused(true);
                      setBrowserUrlText('https://edutrack.edu.kh');
                      setIsPageLoaded(true);
                      playSfx('key');
                    }
                  }}
                  className={`flex-1 h-10 px-3 rounded-2xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                    stepIndex <= 1
                      ? 'bg-slate-950 border-2 border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                      : 'bg-slate-950 border border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    {stepIndex >= 2 ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span className="hidden sm:inline">Secure</span>
                      </span>
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}

                    {/* Typed Web Address */}
                    {stepIndex === 0 ? (
                      <span className="text-slate-400 flex items-center gap-1 truncate font-mono text-xs">
                        <span>Search or enter website address...</span>
                        <span className="w-1.5 h-4 bg-cyan-400 animate-pulse inline-block" />
                      </span>
                    ) : (
                      <span className="text-white font-mono font-bold flex items-center gap-0.5 truncate text-xs">
                        <span className="text-slate-400">https://</span>
                        <span className="text-cyan-300">edutrack.edu.kh</span>
                        {stepIndex === 1 && (
                          <span className="w-1.5 h-4 bg-cyan-400 animate-pulse inline-block ml-0.5" />
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {stepIndex >= 1 && (
                      <span className="p-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold px-2 flex items-center gap-1">
                        <span>Go</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-slate-400 hover:text-white cursor-pointer px-1 text-sm font-bold">
                  ⋮
                </div>
              </div>

              {/* Progress Sweep Bar when Navigating */}
              {stepIndex >= 2 && !pwaInstalled && (
                <div className="w-full h-0.5 bg-blue-900/50 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 animate-pulse w-full" />
                </div>
              )}

              {/* Main In-Browser Viewport */}
              <div className="bg-slate-950 p-4 sm:p-6 min-h-[340px] flex flex-col justify-between relative overflow-hidden">
                
                {/* STATE A: Pre-navigation / Entering Link in Browser */}
                {stepIndex < 2 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center shadow-lg">
                      <Search className="w-7 h-7 animate-pulse" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">
                        {isKhmer ? 'វាយបញ្ចូលតំណភ្ជាប់សាលាលើ Web Browser' : 'Enter Official School Link in Browser'}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {isKhmer
                          ? 'បើកកម្មវិធី Chrome ឬ Safari រួចវាយ https://edutrack.edu.kh លើរបារអាសយដ្ឋាន'
                          : 'Open Chrome or Safari, tap top address bar and type https://edutrack.edu.kh'}
                      </p>
                    </div>

                    {/* Interactive Teacher Practice Controls */}
                    <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                      <button
                        onClick={() => {
                          setIsBrowserFocused(true);
                          setBrowserUrlText('https://edutrack.edu.kh');
                          setIsPageLoaded(false);
                          setStepIndex(1);
                          playSfx('key');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-cyan-300 hover:text-white border border-blue-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      >
                        <span>📋</span>
                        <span>{isKhmer ? 'បិទភ្ជាប់តំណភ្ជាប់ (Paste Link)' : 'Paste School Link'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsBrowserFocused(true);
                          setBrowserUrlText('https://edutrack.edu.kh');
                          setIsPageLoaded(true);
                          setStepIndex(2);
                          playSfx('success');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" />
                        <span>{isKhmer ? 'ចុច Enter / Go ដើម្បីបើក' : 'Press Enter / Go'}</span>
                      </button>
                    </div>

                    {/* Simulated Mobile Keyboard Quick-Keys */}
                    <div className="p-2 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-300 font-mono">
                      <span className="text-slate-500 text-[9px] mr-1">Quick:</span>
                      {['https://', 'edutrack', '.edu.kh', 'Enter ↵'].map((keyText, kIdx) => (
                        <button
                          key={kIdx}
                          onClick={() => {
                            setIsBrowserFocused(true);
                            setBrowserUrlText('https://edutrack.edu.kh');
                            if (keyText.includes('Enter')) {
                              setIsPageLoaded(true);
                              setStepIndex(2);
                              playSfx('success');
                            } else {
                              setStepIndex(1);
                              playSfx('key');
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer border border-slate-700/60 font-semibold"
                        >
                          {keyText}
                        </button>
                      ))}
                    </div>

                    {/* Autocomplete Link Suggestion Pill */}
                    {stepIndex === 1 && (
                      <div
                        onClick={() => {
                          setIsPageLoaded(true);
                          setStepIndex(2);
                          playSfx('success');
                        }}
                        className="w-full max-w-md p-3 rounded-2xl bg-slate-900 border-2 border-blue-500/80 text-left flex items-center justify-between shadow-xl animate-in slide-in-from-top-2 cursor-pointer hover:bg-slate-850"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                            E
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">EduTrack Academic MIS</div>
                            <div className="text-[10px] text-cyan-400 font-mono">https://edutrack.edu.kh</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-1 rounded-lg flex items-center gap-1">
                          <span>Visit / Go</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  
                  /* STATE B: EduTrack Web App Loaded in Browser */
                  <div className="flex-1 flex flex-col justify-between space-y-4 animate-in fade-in">
                    
                    {/* EduTrack Portal Web Header inside Browser */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border border-blue-900/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                          E
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">EduTrack Faculty Portal</div>
                          <div className="text-[10px] text-slate-400">https://edutrack.edu.kh • Active</div>
                        </div>
                      </div>

                      {/* Header Install Button Badge */}
                      <div
                        onClick={() => {
                          if (interactiveMode) setPwaInstalled(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          stepIndex === 3
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white ring-2 ring-cyan-400 scale-105 shadow-md shadow-blue-500/30 animate-pulse'
                            : 'bg-blue-600/30 text-cyan-300 border border-blue-500/40 hover:bg-blue-600 hover:text-white'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>{pwaInstalled ? '✓ Installed' : 'Install App'}</span>
                      </div>
                    </div>

                    {/* In-Browser In-App Welcome & Install Prompt Banner */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                            PWA HOME SCREEN ACCESS
                          </span>
                          <h4 className="text-sm font-black text-white">
                            {isKhmer ? 'ដំឡើង EduTrack លើអេក្រង់ទូរស័ព្ទ (Home Screen)' : 'Add EduTrack to Home Screen?'}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {isKhmer
                              ? 'បើកប្រើប្រាស់ភ្លាមៗ គ្មានរបារ Browser មិនចាំបាច់វាយ Link ម្តងទៀតទេ'
                              : 'Fast 1-tap full-screen access without retyping the browser web link.'}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-lg shrink-0">
                          📲
                        </div>
                      </div>

                      {/* Browser Install Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <span className="text-xs text-slate-500">Not now</span>
                        <button
                          onClick={() => {
                            if (interactiveMode) {
                              setPwaInstalled(true);
                              playSfx('success');
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
                            pwaInstalled
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                              : stepIndex >= 3
                              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white ring-2 ring-cyan-300 scale-105'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{pwaInstalled ? '✓ Added to Home Screen' : 'Add to Home Screen (ដំឡើង)'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Installed Success Confirmation */}
                    {pwaInstalled && (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center justify-between animate-in zoom-in-95">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            {isKhmer
                              ? 'ដំឡើងជោគជ័យ! រូបតំណាង EduTrack បានបង្កើតលើ Home Screen'
                              : 'Standalone App Icon Created! Launch directly without typing URL.'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50">
                          PWA Ready
                        </span>
                      </div>
                    )}

                  </div>
                )}

              </div>

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
                <div
                  onClick={() => {
                    if (interactiveMode) {
                      if (!scheduleCheckedIn) {
                        setScheduleCheckedIn(true);
                        playSfx('success');
                      } else if (!scheduleCheckedOut) {
                        setScheduleCheckedOut(true);
                        playSfx('success');
                      }
                    }
                  }}
                  className={`bg-white border p-3.5 rounded-2xl shadow-xs space-y-2.5 transition-all ${
                    scheduleCheckedOut
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : scheduleCheckedIn
                      ? 'border-cyan-400 ring-2 ring-cyan-200/50 bg-gradient-to-br from-white via-cyan-50/20 to-blue-50/30'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-white ${
                          scheduleCheckedOut ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                      >
                        SV
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 leading-tight">CS-201 Data Structures</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">08:00 - 09:30 AM • Year 2</div>
                      </div>
                    </div>

                    {/* Dynamic Status Badge */}
                    {scheduleCheckedOut ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{isKhmer ? 'បានបញ្ចប់' : 'COMPLETED'}</span>
                      </span>
                    ) : scheduleCheckedIn ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-300 flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>{isKhmer ? 'កំពុងបង្រៀន' : 'IN PROGRESS'}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                        {isKhmer ? 'ម៉ោងនេះ' : 'CURRENT'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600">Computer Science</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600">Room 304</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700">Period 1</span>
                  </div>

                  {/* Interactive Check-In / Check-Out Actions Strip */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {scheduleCheckedOut
                          ? 'In: 08:00 AM • Out: 09:30 AM (1.5h)'
                          : scheduleCheckedIn
                          ? 'In: 08:00 AM • Session: 01:28:45'
                          : isKhmer
                          ? 'រង់ចាំស្កេនចូលម៉ោងបង្រៀន'
                          : 'Ready for Faculty Check-In'}
                      </span>
                    </div>

                    {!scheduleCheckedIn ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setScheduleCheckedIn(true);
                          playSfx('success');
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-[11px] shadow-sm transition-all flex items-center gap-1.5 text-white cursor-pointer ${
                          stepIndex === 3
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 ring-2 ring-blue-400 scale-105 animate-pulse'
                            : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
                        }`}
                      >
                        <LogIn className="w-3 h-3" />
                        <span>{isKhmer ? 'ស្កេនចូល (Check In)' : 'Check In Class'}</span>
                      </button>
                    ) : !scheduleCheckedOut ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setScheduleCheckedOut(true);
                          playSfx('success');
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-[11px] shadow-sm transition-all flex items-center gap-1.5 text-slate-950 cursor-pointer ${
                          stepIndex === 5
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 ring-2 ring-amber-300 scale-105 animate-pulse'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400'
                        }`}
                      >
                        <LogOut className="w-3 h-3" />
                        <span>{isKhmer ? 'ស្កេនចេញ (Check Out)' : 'Check Out Class'}</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{isKhmer ? 'ស្កេនចេញរួចរាល់' : 'Checked Out'}</span>
                      </span>
                    )}
                  </div>

                  {/* Verified Session Summary Notification */}
                  {scheduleCheckedOut && (
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-bold flex items-center justify-between animate-in zoom-in-95">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>1.5 Verified Hours Credited to Payroll</span>
                      </div>
                      <span className="bg-white px-2 py-0.5 rounded text-emerald-700 shadow-2xs font-mono">
                        +$37.50
                      </span>
                    </div>
                  )}
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
                  {kioskCheckedOut ? '09:30 AM' : checkInDone ? '08:45 AM' : '07:58 AM'}
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

              {/* Interactive Kiosk Buttons & Active Session State */}
              <div className="space-y-3">
                {!checkInDone ? (
                  <button
                    onClick={() => {
                      setCheckInDone(true);
                      playSfx('success');
                    }}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                      stepIndex === 2
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white ring-2 ring-emerald-300 scale-105 animate-pulse shadow-emerald-500/30'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 active:scale-95'
                    }`}
                  >
                    <UserCheck className="w-5 h-5" />
                    <span>CHECK IN (ចូលបង្រៀន) • 07:58 AM</span>
                  </button>
                ) : !kioskCheckedOut ? (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-cyan-900">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Class Session Active (Started 07:58 AM)</span>
                      </div>
                      <span className="font-mono text-cyan-800 bg-white px-2.5 py-1 rounded-lg shadow-2xs font-black">
                        01:31:12
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setKioskCheckedOut(true);
                        playSfx('success');
                      }}
                      className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                        stepIndex === 4
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 ring-2 ring-amber-300 scale-105 animate-pulse shadow-orange-500/20'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-orange-500/20 active:scale-95'
                      }`}
                    >
                      <LogOut className="w-5 h-5" />
                      <span>CHECK OUT (បញ្ចប់ម៉ោងបង្រៀន) • 09:30 AM</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 space-y-2 animate-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Teaching Session Completed &amp; Verified</span>
                      </span>
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-black">
                        1.5 Hours
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-mono font-normal">
                      In: 07:58 AM • Out: 09:30 AM • Duration: 92 mins
                    </div>
                  </div>
                )}

                {/* Telegram Alert Notification Status */}
                {checkInDone && (
                  <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        {kioskCheckedOut
                          ? 'Telegram: Dr. Sovann Checked Out at 09:30 AM (1.5h Logged)'
                          : 'Telegram: Dr. Sovann Checked In at 07:58 AM (On-Time)'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded shadow-2xs shrink-0">
                      Delivered
                    </span>
                  </div>
                )}
              </div>
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
                {/* Duration Mode Switcher */}
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Duration Mode (ទម្រង់សុំច្បាប់)</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <span className="py-1 px-2.5 rounded-lg text-[11px] font-bold text-center bg-white text-purple-900 shadow-xs">
                      ⏱️ By Hours (ជាម៉ោង)
                    </span>
                    <span className="py-1 px-2.5 rounded-lg text-[11px] font-medium text-center text-slate-500">
                      📅 Full Days (ជាថ្ងៃ)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">Leave Category</label>
                  <input
                    readOnly
                    value="Personal / Doctor Leave (ច្បាប់ផ្ទាល់ខ្លួន)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-500 font-bold block mb-1">Date</label>
                    <input
                      readOnly
                      value="16 Jan 2026"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-bold block mb-1">Hours</label>
                    <input
                      readOnly
                      value="2.0 hrs"
                      className="w-full bg-purple-50 border border-purple-200 text-purple-900 font-bold rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 font-bold block mb-1">Time</label>
                    <input
                      readOnly
                      value="08:00 - 10:00"
                      className="w-full bg-purple-50 border border-purple-200 text-purple-900 font-bold rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-500 font-bold block mb-1">Reason / Notes</label>
                  <input
                    readOnly
                    value="Doctor dental appointment (morning period)"
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
