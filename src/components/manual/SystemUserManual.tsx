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
  ArrowRight
} from 'lucide-react';

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

export const SystemUserManual: React.FC = () => {
  const { isKhmer } = useLanguage();
  const [activeSectionId, setActiveSectionId] = useState<string>('kiosk');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLangMode, setActiveLangMode] = useState<'both' | 'km' | 'en'>(isKhmer ? 'km' : 'en');

  const manualSections: ManualSection[] = [
    {
      id: 'kiosk',
      titleEn: '1. Check-in Terminal & GPS Attendance',
      titleKm: '១. ចំណុចស្កេនវត្តមាន និងទីតាំង GPS',
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
      titleEn: '2. Weekly Timetable & Period Management',
      titleKm: '២. កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍ និងការគ្រប់គ្រងម៉ោង',
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
      titleEn: '3. Teaching Hours & Wage Payroll Calculation',
      titleKm: '៣. ការគណនាម៉ោងបង្រៀន និងប្រាក់ឈ្នួលគ្រូ',
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
      titleEn: '4. Telegram Bot & Instant Alerts Setup',
      titleKm: '៤. ការកំណត់ Telegram Bot និងសារដំណឹងស្វ័យប្រវត្តិ',
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
      titleEn: '5. Faculty & Employee Staff Profiles',
      titleKm: '៥. ការគ្រប់គ្រងព័ត៌មានគ្រូបង្រៀន និងបុគ្គលិក',
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
      titleEn: '6. Organization & Geofence Policy Configuration',
      titleKm: '៦. ការកំណត់ស្ថាប័ន និងគោលការណ៍ទីតាំង GPS',
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
      titleEn: '7. Sign-in, User Accounts & Roles (RBAC)',
      titleKm: '៧. ការចូលប្រើប្រព័ន្ធ គណនី និងសិទ្ធិអនុញ្ញាត',
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
              ? 'ការណែនាំលម្អិតពីរបៀបស្កេនវត្តមាន កាលវិភាគបង្រៀន គណនាប្រាក់ឈ្នួលគ្រូ ការកំណត់ទីតាំង GPS និងតេឡេក្រាម Bot។'
              : 'Complete walkthrough for faculty check-in, weekly class timetables, teaching hours & wage payroll, GPS geofencing, and automated Telegram alerts.'}
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
            onClick={handlePrintManual}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>{isKhmer ? 'បោះពុម្ពសៀវភៅណែនាំ' : 'Print User Manual'}</span>
          </button>
        </div>
      </div>

      {/* Quick Search & Summary Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isKhmer ? 'ស្វែងរកមេរៀនណែនាំ (ឧ. ស្កេនវត្តមាន, ប្រាក់ឈ្នួល)...' : 'Search user manual guides...'}
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
  );
};
