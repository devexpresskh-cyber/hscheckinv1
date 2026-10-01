import React, { useState, useEffect, useId } from 'react';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  Sparkles,
  Building2,
  Clock,
  MapPin,
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  X,
  Share2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Sliders,
  Palette
} from 'lucide-react';
import { TeacherSubjectSchedule, Schedule, Teacher, TimetablePeriod } from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { ScheduleQrService } from '../../services/scheduleQrService.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';

const escapeHtml = (str?: string | null): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_KH = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

interface PrintPosterOptions {
  mode: 'teacher' | 'room' | 'subject' | 'general';
  layout: 'poster' | 'badge' | 'minimal';
  teacher: Teacher | null;
  subject: TeacherSubjectSchedule | null;
  room: string;
  general: Schedule | null;
  teacherSchedules: TeacherSubjectSchedule[];
  roomSchedules: TeacherSubjectSchedule[];
  qrDataUrl: string;
  qrPayloadString: string;
  settings: any;
  showLogo: boolean;
  qrColor: string;
  isKhmer: boolean;
}

const buildSchedulePosterPrintHtml = (opts: PrintPosterOptions): string => {
  const {
    mode,
    layout,
    teacher,
    subject,
    room,
    general,
    teacherSchedules,
    roomSchedules,
    qrDataUrl,
    qrPayloadString,
    settings,
    showLogo,
    isKhmer
  } = opts;

  const schoolName = settings.schoolName || settings.organizationName || 'EduTrack International Academy';
  const academicYear = settings.academicYear || '2026-2027';

  // Target title & badges
  let targetTitle = '';
  let targetSubtitle = '';
  let targetKhmer = '';
  let targetBadge = '';

  if (mode === 'teacher') {
    targetTitle = teacher?.fullName || 'Faculty Member';
    targetKhmer = teacher?.khmerName || '';
    targetSubtitle = `${teacher?.department || 'Academic Department'} • ${teacher?.subject || 'All Subjects'}`;
    targetBadge = teacher?.teacherId ? `ID: ${teacher.teacherId}` : 'FACULTY SMART QR';
  } else if (mode === 'subject') {
    targetTitle = subject?.subject || 'Class Subject';
    targetKhmer = subject?.khmerSubject || '';
    targetSubtitle = `${subject?.gradeClass || 'Class'} • ${subject?.room || room} • ${subject?.teacherName || 'Faculty'}`;
    targetBadge = `${subject?.startTime || '07:30'} - ${subject?.endTime || '09:00'}`;
  } else if (mode === 'room') {
    targetTitle = `Classroom ${room}`;
    targetKhmer = `បន្ទប់បង្រៀន ${room}`;
    targetSubtitle = `${settings.organizationName || 'Campus'} • General Door QR Station`;
    targetBadge = 'CLASSROOM CHECK-IN STATION';
  } else {
    targetTitle = general?.name || 'Academic Shift';
    targetKhmer = general?.khmerName || '';
    targetSubtitle = `${general?.department || 'Faculty'} (${general?.startTime} - ${general?.endTime})`;
    targetBadge = 'SHIFT SCHEDULE';
  }

  // Teacher Schedule Rows for Poster
  let scheduleTableHtml = '';
  if (mode === 'teacher' && teacherSchedules.length > 0) {
    const rows = teacherSchedules.map(sch => {
      const dIndex = sch.dayOfWeek ?? 1;
      const dayName = isKhmer ? DAY_NAMES_KH[dIndex] : DAY_NAMES_EN[dIndex];
      const timeStr = `${sch.startTime || '07:30'} - ${sch.endTime || '09:00'}`;
      const subTitle = isKhmer && sch.khmerSubject ? `${sch.khmerSubject} (${sch.subject})` : sch.subject;

      return `
        <tr>
          <td style="font-weight: 700; color: #1e1b4b;">${escapeHtml(dayName)}</td>
          <td style="font-family: monospace; font-weight: 700; text-align: center;">${escapeHtml(timeStr)}</td>
          <td style="text-align: center; color: #4338ca; font-weight: 600;">${escapeHtml(sch.periodName || 'Period')}</td>
          <td style="font-weight: 700; color: #0f172a;">${escapeHtml(subTitle)}</td>
          <td style="text-align: center; font-weight: 600;">${escapeHtml(sch.gradeClass || 'All')}</td>
          <td style="text-align: center; font-weight: 700; color: #047857;">${escapeHtml(sch.room || 'TBD')}</td>
        </tr>
      `;
    }).join('');

    scheduleTableHtml = `
      <div style="margin-top: 14px; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h4 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px;">
            📅 ${isKhmer ? 'កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍' : 'Weekly Teaching Timetable'} (${teacherSchedules.length} ${isKhmer ? 'ម៉ោងបង្រៀន' : 'Assigned Classes'})
          </h4>
          <span style="font-size: 10px; color: #64748b; font-weight: 600;">
            ${isKhmer ? 'ស្កេន QR តែ១ នេះសម្រាប់គ្រប់ម៉ោងទាំងអស់' : '1 Master QR works for all these periods'}
          </span>
        </div>
        <table class="schedule-table">
          <thead>
            <tr>
              <th style="width: 14%;">${isKhmer ? 'ថ្ងៃ' : 'Day'}</th>
              <th style="width: 18%; text-align: center;">${isKhmer ? 'ម៉ោងបង្រៀន' : 'Time'}</th>
              <th style="width: 14%; text-align: center;">${isKhmer ? 'វេន' : 'Period'}</th>
              <th>${isKhmer ? 'មុខវិជ្ជា' : 'Subject'}</th>
              <th style="width: 14%; text-align: center;">${isKhmer ? 'ថ្នាក់' : 'Class'}</th>
              <th style="width: 13%; text-align: center;">${isKhmer ? 'បន្ទប់' : 'Room'}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  } else if (mode === 'room' && roomSchedules.length > 0) {
    const rows = roomSchedules.map(sch => {
      const dIndex = sch.dayOfWeek ?? 1;
      const dayName = isKhmer ? DAY_NAMES_KH[dIndex] : DAY_NAMES_EN[dIndex];
      const timeStr = `${sch.startTime} - ${sch.endTime}`;
      return `
        <tr>
          <td style="font-weight: 700;">${escapeHtml(dayName)}</td>
          <td style="font-family: monospace; font-weight: 700; text-align: center;">${escapeHtml(timeStr)}</td>
          <td style="font-weight: 700;">${escapeHtml(sch.subject)}</td>
          <td style="text-align: center;">${escapeHtml(sch.gradeClass)}</td>
          <td style="color: #4338ca; font-weight: 700;">${escapeHtml(sch.teacherName)}</td>
        </tr>
      `;
    }).join('');

    scheduleTableHtml = `
      <div style="margin-top: 14px; text-align: left;">
        <h4 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-bottom: 6px;">
          🏫 ${isKhmer ? 'កាលវិភាគប្រើប្រាស់បន្ទប់នេះ' : 'Classroom Assigned Timetable'} (${roomSchedules.length} ${isKhmer ? 'ថ្នាក់' : 'Classes'})
        </h4>
        <table class="schedule-table">
          <thead>
            <tr>
              <th style="width: 16%;">${isKhmer ? 'ថ្ងៃ' : 'Day'}</th>
              <th style="width: 20%; text-align: center;">${isKhmer ? 'ម៉ោង' : 'Time'}</th>
              <th>${isKhmer ? 'មុខវិជ្ជា' : 'Subject'}</th>
              <th style="width: 18%; text-align: center;">${isKhmer ? 'ថ្នាក់' : 'Class'}</th>
              <th style="width: 22%;">${isKhmer ? 'គ្រូបង្រៀន' : 'Faculty'}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  // Teacher PIN block for verification
  let pinBadgeHtml = '';
  if (teacher?.pinCode) {
    pinBadgeHtml = `
      <div class="pin-box">
        <span class="pin-label">🔐 ${isKhmer ? 'កូដសម្ងាត់ PIN ផ្ទៀងផ្ទាត់ ៖' : 'Faculty PIN Code:'}</span>
        <span class="pin-code">${escapeHtml(teacher.pinCode)}</span>
        <span class="pin-note">(${isKhmer ? 'វាយកូដនេះពេលស្កេនដើម្បីចុះវត្តមាន' : 'Enter 4-digit PIN after scan to confirm'})</span>
      </div>
    `;
  }

  // Teacher Avatar if badge layout
  let teacherAvatarHtml = '';
  if (layout === 'badge' && teacher) {
    if (teacher.photoUrl && teacher.photoUrl.trim()) {
      teacherAvatarHtml = `
        <div style="margin: 0 auto 12px; width: 68px; height: 68px; border-radius: 50%; overflow: hidden; border: 3px solid #4338ca; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <img src="${escapeHtml(teacher.photoUrl.trim())}" style="width: 100%; height: 100%; object-fit: cover;" alt="${escapeHtml(teacher.fullName)}" />
        </div>
      `;
    } else {
      teacherAvatarHtml = `
        <div style="margin: 0 auto 12px; width: 64px; height: 64px; border-radius: 50%; background: #e0e7ff; color: #3730a3; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 900; border: 2px solid #6366f1;">
          ${escapeHtml(teacher.fullName.charAt(0))}
        </div>
      `;
    }
  }

  // Output CSS rules
  const css = `
    @page {
      size: portrait;
      margin: 8mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #ffffff;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: ${layout === 'badge' ? '12px' : '6px'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .poster-container {
      width: 100%;
      max-width: ${layout === 'badge' ? '420px' : layout === 'minimal' ? '460px' : '700px'};
      border: 2.5px solid #0f172a;
      border-radius: ${layout === 'badge' ? '20px' : '24px'};
      padding: ${layout === 'badge' ? '20px 18px' : '22px 26px'};
      text-align: center;
      background: #ffffff;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      position: relative;
    }
    .inst-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .school-title {
      font-size: ${layout === 'badge' ? '13px' : '15px'};
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      line-height: 1.2;
    }
    .school-sub {
      font-size: 10px;
      font-weight: 700;
      color: #4f46e5;
      letter-spacing: 0.3px;
    }
    .badge-pill {
      display: inline-block;
      background: #e0e7ff;
      color: #3730a3;
      font-size: 10px;
      font-weight: 900;
      padding: 3px 10px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .target-title {
      font-size: ${layout === 'badge' ? '18px' : '22px'};
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
    }
    .target-khmer {
      font-size: ${layout === 'badge' ? '13px' : '15px'};
      font-weight: 700;
      color: #4338ca;
      margin-top: 2px;
    }
    .target-sub {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 4px;
    }
    .qr-card {
      display: inline-block;
      padding: 12px;
      background: #ffffff;
      border: 2px solid #cbd5e1;
      border-radius: 18px;
      margin: 12px auto;
      position: relative;
    }
    .qr-img {
      width: ${layout === 'badge' ? '200px' : layout === 'minimal' ? '220px' : '230px'};
      height: ${layout === 'badge' ? '200px' : layout === 'minimal' ? '220px' : '230px'};
      display: block;
      margin: 0 auto;
      object-fit: contain;
    }
    .center-crest {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 44px;
      height: 44px;
      background: #ffffff;
      border: 2px solid #4338ca;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      font-size: 22px;
    }
    .pin-box {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fef3c7;
      border: 1.5px solid #f59e0b;
      border-radius: 10px;
      padding: 4px 12px;
      margin: 8px auto;
      font-size: 11px;
    }
    .pin-label {
      font-weight: 800;
      color: #92400e;
    }
    .pin-code {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 900;
      font-size: 13px;
      color: #78350f;
      letter-spacing: 1px;
    }
    .pin-note {
      font-size: 10px;
      color: #b45309;
      font-weight: 600;
    }
    .instructions-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 14px;
      padding: 10px 14px;
      margin-top: 10px;
      text-align: center;
    }
    .inst-step {
      font-size: 12px;
      font-weight: 800;
      color: #1e1b4b;
      line-height: 1.4;
    }
    .inst-sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-top: 4px;
    }
    .schedule-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      padding: 5px 8px;
      border: 1px solid #0f172a;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .schedule-table td {
      padding: 5px 7px;
      border: 1px solid #cbd5e1;
      font-size: 10px;
    }
    .schedule-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .url-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5px;
      color: #64748b;
      word-break: break-all;
      margin-top: 8px;
    }
    .auth-footer {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #94a3b8;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      text-align: center;
      font-size: 10px;
    }
    .sign-line {
      height: 36px;
      border-bottom: 1px solid #94a3b8;
      margin-bottom: 4px;
    }
  `;

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(targetTitle)} - Schedule QR Station Sign</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
        <style>${css}</style>
      </head>
      <body>
        <div class="poster-container">
          
          <!-- Institution Header -->
          <div class="inst-header">
            <div style="font-size: 26px;">🏛️</div>
            <div>
              <div class="school-title">${escapeHtml(schoolName)}</div>
              <div class="school-sub">
                ${isKhmer ? 'ប្រព័ន្ធកាលវិភាគ និងវត្តមានគ្រូបង្រៀនផ្លូវការ' : 'Official Teacher Schedule & Attendance Station'} • AY ${escapeHtml(academicYear)}
              </div>
            </div>
          </div>

          <!-- Teacher Avatar (if badge layout) -->
          ${teacherAvatarHtml}

          <!-- Target Identification -->
          <div>
            <div class="badge-pill">${escapeHtml(targetBadge)}</div>
            <h1 class="target-title">${escapeHtml(targetTitle)}</h1>
            ${targetKhmer ? `<div class="target-khmer">${escapeHtml(targetKhmer)}</div>` : ''}
            <div class="target-sub">${escapeHtml(targetSubtitle)}</div>
          </div>

          <!-- PIN Code for verification -->
          ${pinBadgeHtml}

          <!-- QR Code Image -->
          <div class="qr-card">
            ${qrDataUrl ? `<img src="${qrDataUrl}" class="qr-img" alt="Schedule QR" />` : '<div style="width: 220px; height: 220px; background: #eee;"></div>'}
            ${showLogo ? '<div class="center-crest">🏫</div>' : ''}
          </div>

          <!-- Step by Step Instructions -->
          <div class="instructions-card">
            <div class="inst-step">
              ${isKhmer
                ? '១. ស្កេន QR តាមទូរស័ព្ទ  •  ២. បញ្ជាក់កូដ PIN ៤ ខ្ទង់  •  ៣. វត្តមានកត់ត្រាភ្លាមៗ!'
                : '1. Scan QR with Camera  •  2. Enter 4-Digit PIN  •  3. Instant Attendance Confirmation!'}
            </div>
            <div class="inst-sub">
              ${isKhmer
                ? 'មិនបាច់ Login ចូលប្រព័ន្ធទេ! ម៉ោងបង្រៀន និងប្រាក់ឈ្នួលត្រូវបានគណនាស្វ័យប្រវត្តិ។'
                : 'No system login required. Teaching hours & payroll wage calculated automatically.'}
            </div>
          </div>

          <!-- Schedule Timetable (for poster layout) -->
          ${layout === 'poster' ? scheduleTableHtml : ''}

          <!-- Direct Link -->
          ${qrPayloadString ? `<div class="url-text">Web Check-in Link: ${escapeHtml(qrPayloadString)}</div>` : ''}

          <!-- Signatures (for official poster layout) -->
          ${layout === 'poster' ? `
            <div class="signatures-grid">
              <div>
                <div class="sign-line"></div>
                <strong style="color: #334155;">Academic Coordinator / HR</strong>
              </div>
              <div>
                <div class="sign-line"></div>
                <strong style="color: #334155;">Faculty Member Acknowledgment</strong>
              </div>
            </div>
          ` : ''}

          <!-- Footer Stamp -->
          <div class="auth-footer">
            <span>EduTrack Academic MIS • Official Station</span>
            <span>Printed: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

        </div>
      </body>
    </html>
  `;
};

interface ScheduleQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubjectSchedule?: TeacherSubjectSchedule | null;
  initialSchedule?: Schedule | null;
  initialTeacher?: Teacher | null;
}

export const ScheduleQRCodeModal: React.FC<ScheduleQRCodeModalProps> = ({
  isOpen,
  onClose,
  initialSubjectSchedule,
  initialSchedule,
  initialTeacher
}) => {
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();
  const printSectionId = useId();

  const [subjectSchedules, setSubjectSchedules] = useState<TeacherSubjectSchedule[]>(() =>
    StorageService.getSubjectSchedules()
  );
  const [schedules, setSchedules] = useState<Schedule[]>(() => StorageService.getSchedules());
  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    StorageService.getTeachers().filter(t => t.status === 'Active')
  );
  const [periods, setPeriods] = useState<TimetablePeriod[]>(() => StorageService.getPeriods());
  const [settings, setSettings] = useState(() => StorageService.getSystemSettings());

  // Selection state: 'teacher' | 'room' | 'subject' | 'general'
  const [mode, setMode] = useState<'teacher' | 'room' | 'subject' | 'general'>(
    initialTeacher ? 'teacher' : initialSubjectSchedule ? 'subject' : initialSchedule ? 'general' : 'teacher'
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectSchedule?.id || subjectSchedules[0]?.id || ''
  );
  const [selectedGeneralId, setSelectedGeneralId] = useState<string>(
    initialSchedule?.id || schedules[0]?.id || ''
  );
  const [selectedRoom, setSelectedRoom] = useState<string>('Room 204');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    initialTeacher?.id || initialSubjectSchedule?.teacherId || teachers[0]?.id || ''
  );

  // QR Customization
  const [qrColor, setQrColor] = useState<string>('#1e1b4b'); // deep indigo
  const [qrFormat, setQrFormat] = useState<'url' | 'json'>('url');
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [posterLayout, setPosterLayout] = useState<'poster' | 'badge' | 'minimal'>('poster');

  // Generated QR output state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrPayloadString, setQrPayloadString] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Refresh lists on open
  useEffect(() => {
    if (isOpen) {
      const liveSubjects = StorageService.getSubjectSchedules();
      const liveSchedules = StorageService.getSchedules();
      const liveTeachers = StorageService.getTeachers().filter(t => t.status === 'Active');
      setSubjectSchedules(liveSubjects);
      setSchedules(liveSchedules);
      setTeachers(liveTeachers);
      setPeriods(StorageService.getPeriods());
      setSettings(StorageService.getSystemSettings());

      if (initialTeacher) {
        setMode('teacher');
        setSelectedTeacherId(initialTeacher.id);
      } else if (initialSubjectSchedule) {
        setMode('subject');
        setSelectedSubjectId(initialSubjectSchedule.id);
        if (initialSubjectSchedule.teacherId) {
          setSelectedTeacherId(initialSubjectSchedule.teacherId);
        }
      } else if (initialSchedule) {
        setMode('general');
        setSelectedGeneralId(initialSchedule.id);
      } else {
        if (!selectedTeacherId && liveTeachers[0]) {
          setSelectedTeacherId(liveTeachers[0].id);
        }
      }
    }
  }, [isOpen, initialSubjectSchedule, initialSchedule, initialTeacher]);

  // Resolve current active targets
  const currentSubject = subjectSchedules.find(s => s.id === selectedSubjectId);
  const currentGeneral = schedules.find(s => s.id === selectedGeneralId);
  const currentTeacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];

  // All schedules for currently selected teacher (multi-period)
  const teacherAllSchedules = subjectSchedules
    .filter(
      s =>
        s.teacherId === currentTeacher?.id ||
        (s.teacherName &&
          currentTeacher &&
          s.teacherName.toLowerCase() === currentTeacher.fullName.toLowerCase())
    )
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Determine room list
  const uniqueRooms = Array.from(
    new Set([
      ...subjectSchedules.map(s => s.room).filter(Boolean),
      'Room 101',
      'Room 102',
      'Room 201',
      'Room 202',
      'Room 204',
      'Lab A',
      'Lab B',
      'Main Hall'
    ])
  );

  // Generate QR Code data whenever inputs change
  useEffect(() => {
    let rawText = '';

    if (mode === 'teacher') {
      if (qrFormat === 'url') {
        rawText = ScheduleQrService.buildTeacherMasterUrl(selectedTeacherId);
      } else {
        rawText = JSON.stringify(
          currentTeacher
            ? ScheduleQrService.buildJsonPayload(currentTeacher, 'teacher')
            : { app: 'edutrack', type: 'teacher_master_qr', teacherId: selectedTeacherId },
          null,
          0
        );
      }
    } else if (mode === 'room') {
      if (qrFormat === 'url') {
        rawText = ScheduleQrService.buildRoomUrl(selectedRoom);
      } else {
        rawText = JSON.stringify(
          ScheduleQrService.buildJsonPayload({ room: selectedRoom }, 'room'),
          null,
          0
        );
      }
    } else if (mode === 'subject') {
      const activeScheduleId = selectedSubjectId;
      if (qrFormat === 'url') {
        rawText = ScheduleQrService.buildScheduleUrl(
          activeScheduleId,
          'subject',
          currentSubject?.teacherId || selectedTeacherId
        );
      } else if (currentSubject) {
        rawText = JSON.stringify(
          ScheduleQrService.buildJsonPayload(currentSubject, 'subject'),
          null,
          0
        );
      } else {
        rawText = ScheduleQrService.buildScheduleUrl(activeScheduleId, 'subject');
      }
    } else {
      const activeScheduleId = selectedGeneralId;
      if (qrFormat === 'url') {
        rawText = ScheduleQrService.buildScheduleUrl(activeScheduleId, 'general', selectedTeacherId);
      } else if (currentGeneral) {
        rawText = JSON.stringify(
          ScheduleQrService.buildJsonPayload(currentGeneral, 'general', selectedRoom),
          null,
          0
        );
      } else {
        rawText = ScheduleQrService.buildScheduleUrl(activeScheduleId, 'general');
      }
    }

    setQrPayloadString(rawText);

    // Render Data URL & SVG
    ScheduleQrService.generateQRCodeDataUrl(rawText, {
      color: { dark: qrColor, light: '#ffffff' },
      width: 480,
      margin: 2
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err));

    ScheduleQrService.generateQRCodeSvg(rawText, {
      color: { dark: qrColor, light: '#ffffff' },
      margin: 2
    })
      .then(svg => setQrSvg(svg))
      .catch(err => console.error('QR SVG generation error:', err));
  }, [
    mode,
    selectedTeacherId,
    selectedSubjectId,
    selectedGeneralId,
    selectedRoom,
    qrColor,
    qrFormat,
    currentSubject,
    currentGeneral,
    currentTeacher
  ]);

  if (!isOpen) return null;

  // Actions
  const handleCopyLink = async () => {
    let directUrl = '';
    if (mode === 'teacher') {
      directUrl = ScheduleQrService.buildTeacherMasterUrl(selectedTeacherId);
    } else if (mode === 'room') {
      directUrl = ScheduleQrService.buildRoomUrl(selectedRoom);
    } else if (mode === 'subject') {
      directUrl = ScheduleQrService.buildScheduleUrl(
        selectedSubjectId,
        'subject',
        currentSubject?.teacherId || selectedTeacherId
      );
    } else {
      directUrl = ScheduleQrService.buildScheduleUrl(
        selectedGeneralId,
        'general',
        selectedTeacherId
      );
    }

    try {
      await navigator.clipboard.writeText(directUrl);
      setIsCopied(true);
      showToast(
        isKhmer ? 'បានចម្លងតំណភ្ជាប់ស្កេនដោយជោគជ័យ!' : 'Direct check-in link copied to clipboard!',
        'success'
      );
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      showToast('Could not copy link to clipboard.', 'error');
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    const filename = `edutrack-qr-${
      mode === 'teacher'
        ? (currentTeacher?.fullName || 'teacher-master').toLowerCase().replace(/\s+/g, '-')
        : mode === 'room'
        ? selectedRoom.toLowerCase().replace(/\s+/g, '-')
        : mode === 'subject'
        ? (currentSubject?.subject || 'schedule').toLowerCase().replace(/\s+/g, '-')
        : (currentGeneral?.name || 'shift').toLowerCase().replace(/\s+/g, '-')
    }.png`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(isKhmer ? 'បានទាញយក PNG ដោយជោគជ័យ!' : 'QR Code downloaded as PNG!', 'success');
  };

  const handleDownloadSvg = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `edutrack-qr-${
      mode === 'teacher'
        ? (currentTeacher?.fullName || 'teacher-master').toLowerCase().replace(/\s+/g, '-')
        : mode === 'room'
        ? selectedRoom.toLowerCase().replace(/\s+/g, '-')
        : mode === 'subject'
        ? (currentSubject?.subject || 'schedule').toLowerCase().replace(/\s+/g, '-')
        : 'schedule'
    }.svg`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(isKhmer ? 'បានទាញយក SVG ដោយជោគជ័យ!' : 'QR Code downloaded as vector SVG!', 'success');
  };

  // Dedicated Print Engine: Generates pure, isolated, high-resolution printable HTML
  const handlePrint = (layoutOverride?: 'poster' | 'badge' | 'minimal') => {
    const layout = layoutOverride || posterLayout;

    let directUrl = '';
    if (mode === 'teacher') {
      directUrl = ScheduleQrService.buildTeacherMasterUrl(selectedTeacherId);
    } else if (mode === 'room') {
      directUrl = ScheduleQrService.buildRoomUrl(selectedRoom);
    } else if (mode === 'subject') {
      directUrl = ScheduleQrService.buildScheduleUrl(
        selectedSubjectId,
        'subject',
        currentSubject?.teacherId || selectedTeacherId
      );
    } else {
      directUrl = ScheduleQrService.buildScheduleUrl(
        selectedGeneralId,
        'general',
        selectedTeacherId
      );
    }

    try {
      let iframe = document.getElementById('schedule-qr-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'schedule-qr-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        document.body.appendChild(iframe);
      }

      const html = buildSchedulePosterPrintHtml({
        mode,
        layout,
        teacher: currentTeacher || null,
        subject: currentSubject || null,
        room: selectedRoom,
        general: currentGeneral || null,
        teacherSchedules: teacherAllSchedules,
        roomSchedules: subjectSchedules.filter(s => s.room === selectedRoom),
        qrDataUrl,
        qrPayloadString: directUrl,
        settings,
        showLogo,
        qrColor,
        isKhmer
      });

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 300);
        return;
      }
    } catch (err) {
      console.error('Dedicated iframe print error, falling back to window.print():', err);
    }

    // Fallback: window.print()
    window.print();
  };

  // Color Swatches
  const colorOptions = [
    { label: 'Indigo', value: '#1e1b4b', bg: 'bg-indigo-950' },
    { label: 'Emerald', value: '#064e3b', bg: 'bg-emerald-950' },
    { label: 'Slate', value: '#0f172a', bg: 'bg-slate-900' },
    { label: 'Royal Blue', value: '#1e3a8a', bg: 'bg-blue-900' },
    { label: 'Burgundy', value: '#4c0519', bg: 'bg-rose-950' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 schedule-qr-modal-backdrop print:static print:bg-transparent print:p-0 print:m-0 print:overflow-visible">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col schedule-qr-modal-box print:max-w-none print:w-full print:border-none print:shadow-none print:max-h-none print:overflow-visible">
        
        {/* Header (Hidden in Print) */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {isKhmer ? 'បង្កើត និងបោះពុម្ពកូដ QR កាលវិភាគ' : 'Teacher Schedule QR & Print Station'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isKhmer ? 'ស្កេនដោយមិនបាច់ Login' : 'No-Login Scan'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isKhmer
                  ? 'គ្រូគ្រាន់តែស្កេន QR និងផ្ទៀងផ្ទាត់លេខសម្ងាត់ PIN ៤ ខ្ទង់ដើម្បីចុះវត្តមានភ្លាមៗ'
                  : 'Faculty scan with mobile camera & confirm 4-digit PIN for instant wage logging'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Grid: Left Controls (5 cols, hidden in print) + Right Live Preview & Poster (7 cols) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:p-0 print:overflow-visible">
          
          {/* Left Column: Form & Configuration (5 cols, hidden in print) */}
          <div className="lg:col-span-5 space-y-4 print:hidden">
            
            {/* Target Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>{isKhmer ? 'ប្រភេទកាលវិភាគ ៖' : 'Schedule Type:'}</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {isKhmer ? 'ជ្រើសរើសទម្រង់ QR ដែលសមស្រប' : 'Select QR Workflow'}
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setMode('teacher')}
                  className={`py-2 px-2 rounded-xl transition-all text-center truncate ${
                    mode === 'teacher'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="1 Smart QR for all periods of a teacher"
                >
                  {isKhmer ? '🎓 គ្រូ (ម៉ោងច្រើន)' : '🎓 Teacher Smart'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('subject')}
                  className={`py-2 px-2 rounded-xl transition-all text-center truncate ${
                    mode === 'subject'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isKhmer ? '📚 មុខវិជ្ជា/ថ្នាក់' : '📚 Class Subject'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('room')}
                  className={`py-2 px-2 rounded-xl transition-all text-center truncate ${
                    mode === 'room'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isKhmer ? '🏫 បន្ទប់រៀន' : '🏫 Room Door'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('general')}
                  className={`py-2 px-2 rounded-xl transition-all text-center truncate ${
                    mode === 'general'
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isKhmer ? '⏱️ វេនទូទៅ' : '⏱️ General Shift'}
                </button>
              </div>
            </div>

            {/* If Teacher Mode: Universal Master QR for Multiple Periods */}
            {mode === 'teacher' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>{isKhmer ? 'ជ្រើសរើសគ្រូបង្រៀន (Faculty Member) ៖' : 'Select Faculty Member:'}</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {isKhmer ? 'កូដ QR តែ១ សម្រាប់គ្រប់ម៉ោង' : '1 QR for All Periods'}
                    </span>
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none shadow-xs"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} {t.khmerName ? `(${t.khmerName})` : ''} - {t.department}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multi-Period Schedule Breakdown for this Teacher */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs space-y-2.5">
                  <div className="flex items-center justify-between font-black text-indigo-950">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        {isKhmer
                          ? `ម៉ោងបង្រៀនទាំងអស់របស់គ្រូ (${teacherAllSchedules.length} ម៉ោង) ៖`
                          : `Assigned Periods (${teacherAllSchedules.length} Classes):`}
                      </span>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-200/70 text-indigo-900 text-[10px] font-bold">
                      {isKhmer ? 'ឆ្លាតវៃតាមម៉ោង' : 'Smart Clock-In'}
                    </span>
                  </div>

                  {teacherAllSchedules.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {teacherAllSchedules.map((sub, idx) => (
                        <div
                          key={sub.id || idx}
                          className="p-2 rounded-xl bg-white border border-indigo-100 flex items-center justify-between text-[11px] shadow-2xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-900 truncate">
                              {sub.gradeClass} • {sub.khmerSubject || sub.subject}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span>{sub.periodName || `Period ${idx + 1}`}</span>
                              <span>•</span>
                              <span>{sub.room}</span>
                              {sub.daysOfWeek && sub.daysOfWeek.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{sub.daysOfWeek.slice(0, 2).join(', ')}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 font-mono font-bold text-indigo-700 text-[10px] bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                            {sub.startTime} - {sub.endTime}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      {isKhmer
                        ? 'មិនទាន់មានម៉ោងបង្រៀនត្រូវបានកំណត់នៅឡើយទេ។ QR នេះនឹងកត់ត្រាវត្តមានទូទៅរបស់គ្រូ។'
                        : 'No subject periods assigned yet. This QR acts as a general faculty check-in.'}
                    </p>
                  )}

                  {/* Informational Multi-Period Guide */}
                  <div className="p-2.5 rounded-xl bg-white/90 border border-indigo-200 text-[11px] text-slate-600 leading-relaxed">
                    <strong className="text-indigo-900 font-bold block mb-1">
                      {isKhmer ? '💡 របៀបដែលគ្រូគ្រប់គ្រងម៉ោងច្រើន ៖' : '💡 How Multi-Period QR Works:'}
                    </strong>
                    <ul className="space-y-1 list-disc list-inside text-[10.5px]">
                      <li>
                        {isKhmer
                          ? 'គ្រូកាន់តែ QR មួយនេះ (លើកាត ID ឬរូបថតក្នុងទូរស័ព្ទ) សម្រាប់គ្រប់ម៉ោងទាំងអស់។'
                          : 'Teacher keeps this single QR on their ID card badge or phone.'}
                      </li>
                      <li>
                        {isKhmer
                          ? 'ពេលស្កេន ប្រព័ន្ធនឹងរកឃើញម៉ោងបង្រៀនជាក់ស្តែងតាមនាឡិកាដោយស្វ័យប្រវត្តិ។'
                          : 'System automatically detects the active period based on the current time.'}
                      </li>
                      <li>
                        {isKhmer
                          ? 'ប្រសិនបើមានម៉ោងជាប់គ្នា គ្រូអាចចុចប្តូរម៉ោងដែលត្រូវចុះវត្តមានបានភ្លាមៗ។'
                          : 'If consecutive periods exist, teacher can tap to switch period before confirming PIN.'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* If Subject Mode: Select Teacher Subject Schedule */}
            {mode === 'subject' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>{isKhmer ? 'ជ្រើសរើសកាលវិភាគមុខវិជ្ជា ៖' : 'Select Subject Schedule:'}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {subjectSchedules.length} available
                    </span>
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none shadow-xs"
                  >
                    {subjectSchedules.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.gradeClass} • {sub.subject} ({sub.periodName || `${sub.startTime}-${sub.endTime}`}) – {sub.teacherName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Quick Meta Info */}
                {currentSubject && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-black text-indigo-950">
                      <span className="truncate">{currentSubject.khmerSubject || currentSubject.subject}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-200/70 text-indigo-900 text-[10px] font-bold">
                        {currentSubject.gradeClass}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-indigo-800 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        {currentSubject.startTime} – {currentSubject.endTime}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        {currentSubject.room}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-bold">
                        <User className="w-3 h-3 text-indigo-500" />
                        {currentSubject.teacherName}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If General Shift Mode */}
            {mode === 'general' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {isKhmer ? 'ជ្រើសរើសវេនទូទៅ ៖' : 'Select General Shift:'}
                  </label>
                  <select
                    value={selectedGeneralId}
                    onChange={e => setSelectedGeneralId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none shadow-xs"
                  >
                    {schedules.map(sch => (
                      <option key={sch.id} value={sch.id}>
                        {sch.name} ({sch.startTime} - {sch.endTime}) – {sch.department}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* If Room Mode: Select Room */}
            {mode === 'room' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {isKhmer ? 'ជ្រើសរើសបន្ទប់បង្រៀន (Classroom/Lab) ៖' : 'Select Classroom/Lab:'}
                  </label>
                  <select
                    value={selectedRoom}
                    onChange={e => setSelectedRoom(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none shadow-xs"
                  >
                    {uniqueRooms.map(r => (
                      <option key={r} value={r}>
                        🏫 {r}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isKhmer
                    ? 'QR កូដបន្ទប់អាចបិទនៅលើទ្វារបន្ទប់រៀន។ គ្រូណាដែលមកបង្រៀនក្នុងបន្ទប់នេះ អាចស្កេន និងវាយកូដ PIN ផ្ទាល់ខ្លួនដើម្បីចុះវត្តមាន។'
                    : 'Classroom QR code can be posted at the door. Any teacher scheduled in this room can scan it and enter their PIN to clock in.'}
                </p>
              </div>
            )}

            {/* QR Code Appearance & Styling Controls */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isKhmer ? 'រចនាបថ និងពណ៌ QR កូដ' : 'QR Code Styling & Format'}</span>
              </div>

              {/* Color picker */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Color:</span>
                <div className="flex items-center gap-1.5">
                  {colorOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setQrColor(opt.value)}
                      className={`w-6 h-6 rounded-full ${opt.bg} transition-all flex items-center justify-center text-white ${
                        qrColor === opt.value
                          ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={opt.label}
                    >
                      {qrColor === opt.value && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format selection */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white border border-slate-200 font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="qrFormat"
                    checked={qrFormat === 'url'}
                    onChange={() => setQrFormat('url')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    {isKhmer ? 'Web Link (ទូរស័ព្ទស្កេន)' : 'Camera Deep-Link'}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white border border-slate-200 font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="qrFormat"
                    checked={qrFormat === 'json'}
                    onChange={() => setQrFormat('json')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    {isKhmer ? 'Offline JSON Payload' : 'Offline JSON'}
                  </span>
                </label>
              </div>

              {/* Toggle Logo */}
              <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <span>{isKhmer ? 'បង្ហាញរូបសញ្ញាសាលា (School Crest)' : 'Show School Center Badge'}</span>
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={e => setShowLogo(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>

          </div>

          {/* Right Column: High-Fidelity Printable Poster / Card Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-between space-y-4 print:w-full print:col-span-12 print:p-0">
            
            {/* Poster Layout Format Switcher (Hidden in Print) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold w-full max-w-md print:hidden">
              <button
                type="button"
                onClick={() => setPosterLayout('poster')}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center ${
                  posterLayout === 'poster'
                    ? 'bg-white text-indigo-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isKhmer ? '📄 ផ្ទាំងបិទទ្វារ (A4)' : '📄 Door Sign (A4)'}
              </button>
              <button
                type="button"
                onClick={() => setPosterLayout('badge')}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center ${
                  posterLayout === 'badge'
                    ? 'bg-white text-indigo-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isKhmer ? '🪪 កាតគ្រូ (Badge)' : '🪪 Teacher Badge'}
              </button>
              <button
                type="button"
                onClick={() => setPosterLayout('minimal')}
                className={`flex-1 py-1.5 px-2 rounded-xl transition-all cursor-pointer text-center ${
                  posterLayout === 'minimal'
                    ? 'bg-white text-indigo-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isKhmer ? '🪧 ទម្រង់សាមញ្ញ' : '🪧 Minimal Sign'}
              </button>
            </div>

            {/* The Printable Door Poster Container */}
            <div
              id={`printable-schedule-poster-${printSectionId}`}
              className={`w-full bg-white rounded-3xl border-2 border-slate-300 p-5 sm:p-6 shadow-xl text-center space-y-4 relative schedule-qr-poster-print print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none ${
                posterLayout === 'badge' ? 'max-w-xs sm:max-w-sm' : 'max-w-sm sm:max-w-md'
              }`}
            >
              {/* Top Institutional Header */}
              <div className="border-b-2 border-slate-900 pb-3 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-slate-900 tracking-tight leading-none uppercase">
                      {settings.schoolName || settings.organizationName || 'EduTrack Academy'}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-semibold leading-none">
                      {isKhmer ? 'ប្រព័ន្ធកាលវិភាគ និងវត្តមានគ្រូផ្លូវការ' : 'Teacher Schedule & Attendance Station'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Title / Class Subject Badge */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-900">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-700" />
                  <span>
                    {mode === 'teacher'
                      ? (currentTeacher?.teacherId ? `ID: ${currentTeacher.teacherId}` : currentTeacher?.department || 'Faculty Master')
                      : mode === 'subject'
                      ? currentSubject?.gradeClass || 'All Classes'
                      : mode === 'room'
                      ? selectedRoom
                      : currentGeneral?.department || 'Faculty'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  {mode === 'teacher'
                    ? `${currentTeacher?.fullName} ${currentTeacher?.khmerName ? `(${currentTeacher.khmerName})` : ''}`
                    : mode === 'subject'
                    ? currentSubject?.khmerSubject || currentSubject?.subject || 'Class Subject'
                    : mode === 'room'
                    ? `Classroom ${selectedRoom}`
                    : currentGeneral?.khmerName || currentGeneral?.name || 'Faculty Shift'}
                </h3>
                {mode === 'teacher' ? (
                  <p className="text-xs text-indigo-700 font-bold">
                    {isKhmer
                      ? `កូដ QR ឆ្លាតវៃសម្រាប់គ្រប់ម៉ោងបង្រៀន (${teacherAllSchedules.length} ម៉ោង)`
                      : `Master Multi-Period Smart QR (${teacherAllSchedules.length} Assigned Classes)`}
                  </p>
                ) : mode === 'subject' && currentSubject?.subject && currentSubject.subject !== currentSubject.khmerSubject ? (
                  <p className="text-xs text-slate-500 font-medium">({currentSubject.subject})</p>
                ) : null}
              </div>

              {/* Faculty PIN Pill for quick verification */}
              {mode === 'teacher' && currentTeacher?.pinCode && (
                <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1 text-xs text-amber-900">
                  <span className="font-bold">🔐 PIN:</span>
                  <span className="font-mono font-black text-amber-950 text-sm tracking-wider">
                    {currentTeacher.pinCode}
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">
                    ({isKhmer ? 'បញ្ជាក់កូដនេះពេលស្កេន' : 'Enter after scanning'})
                  </span>
                </div>
              )}

              {/* QR Code Canvas / Visual with Center Crest */}
              <div className="relative inline-block mx-auto p-3 rounded-2xl bg-white border border-slate-200 shadow-md">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Schedule QR Code"
                    className="w-44 h-44 sm:w-52 sm:h-52 mx-auto object-contain select-none"
                  />
                ) : (
                  <div className="w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center bg-slate-50">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* Center Badge if enabled */}
                {showLogo && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-white border-2 border-indigo-600 shadow-lg flex items-center justify-center text-indigo-700 pointer-events-none">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Meta Details Pill (Room, Period, Time, Teacher) */}
              <div className="grid grid-cols-2 gap-2 text-left bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    {isKhmer ? 'ម៉ោងបង្រៀន / ពេល' : 'Time & Period'}
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] sm:text-xs">
                    {mode === 'teacher'
                      ? (teacherAllSchedules.length > 0 ? `${teacherAllSchedules.length} Classes Weekly` : 'Dynamic Period')
                      : mode === 'subject'
                      ? `${currentSubject?.startTime || '07:30'} - ${currentSubject?.endTime || '09:00'}`
                      : `${currentGeneral?.startTime || '07:30'} - ${currentGeneral?.endTime || '17:00'}`}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block truncate">
                    {mode === 'teacher'
                      ? (isKhmer ? 'កំណត់ម៉ោងស្វ័យប្រវត្តិតាមពេលស្កេន' : 'Auto-detected on scan')
                      : mode === 'subject'
                      ? currentSubject?.periodName || 'Period 1'
                      : 'Standard Shift'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    {isKhmer ? 'ដេប៉ាតឺម៉ង់ / គ្រូ' : 'Department & Faculty'}
                  </span>
                  <span className="font-bold text-slate-800 text-[11px] sm:text-xs truncate block">
                    {mode === 'teacher'
                      ? currentTeacher?.department || 'Academic Department'
                      : mode === 'subject'
                      ? currentSubject?.room || selectedRoom
                      : selectedRoom}
                  </span>
                  <span className="text-[10px] text-indigo-700 font-bold truncate block">
                    {mode === 'teacher'
                      ? currentTeacher?.subject || 'All Subjects'
                      : mode === 'subject'
                      ? currentSubject?.teacherName || 'Scheduled Faculty'
                      : currentTeacher?.fullName || 'Faculty Member'}
                  </span>
                </div>
              </div>

              {/* Teacher Weekly Class Schedule Timetable Preview (When poster layout & teacher mode) */}
              {posterLayout === 'poster' && mode === 'teacher' && teacherAllSchedules.length > 0 && (
                <div className="text-left border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <div className="bg-slate-900 text-white px-3 py-1.5 text-[11px] font-bold flex items-center justify-between">
                    <span>📅 {isKhmer ? 'កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍' : 'Weekly Teaching Timetable'}</span>
                    <span className="text-[10px] text-indigo-300 font-mono">
                      {teacherAllSchedules.length} Classes
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-1.5">{isKhmer ? 'ថ្ងៃ' : 'Day'}</th>
                          <th className="p-1.5 text-center">{isKhmer ? 'ម៉ោង' : 'Time'}</th>
                          <th className="p-1.5">{isKhmer ? 'មុខវិជ្ជា' : 'Subject'}</th>
                          <th className="p-1.5 text-center">{isKhmer ? 'បន្ទប់' : 'Room'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {teacherAllSchedules.map((s, idx) => {
                          const dIdx = s.dayOfWeek ?? 1;
                          const dayLabel = isKhmer ? DAY_NAMES_KH[dIdx] : DAY_NAMES_EN[dIdx];
                          return (
                            <tr key={s.id || idx} className="hover:bg-slate-50">
                              <td className="p-1.5 font-bold text-slate-800">{dayLabel}</td>
                              <td className="p-1.5 text-center font-mono text-slate-600">{s.startTime}-{s.endTime}</td>
                              <td className="p-1.5 font-medium text-slate-900 truncate max-w-[120px]">
                                {s.subject} <span className="text-[9px] text-slate-400">({s.gradeClass})</span>
                              </td>
                              <td className="p-1.5 text-center font-bold text-emerald-700">{s.room}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Instructions Footer (in Khmer & English) */}
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 leading-snug space-y-1">
                <div className="flex items-center justify-center gap-1.5 font-bold text-indigo-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {isKhmer
                      ? '១. ស្កេន QR តាមទូរស័ព្ទ  •  ២. បញ្ជាក់កូដ PIN ៤ ខ្ទង់'
                      : '1. Scan with Phone Camera  •  2. Enter 4-Digit PIN'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {isKhmer
                    ? 'មិនបាច់ Login ចូលប្រព័ន្ធទេ! វត្តមាននឹងត្រូវបានកត់ត្រាភ្លាមៗ។'
                    : 'No system login required. Attendance is instantly marked on PIN confirmation.'}
                </p>
              </div>

            </div>

            {/* Quick Actions Row (Hidden in Print) */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full print:hidden">
              <button
                type="button"
                onClick={() => handlePrint('poster')}
                className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 active:scale-95 cursor-pointer"
                title="Print Full A4 Door Poster with Timetable"
              >
                <Printer className="w-4 h-4 text-indigo-200" />
                <span>{isKhmer ? 'បោះពុម្ពផ្ទាំងបិទទ្វារ (A4)' : 'Print Door Sign (A4)'}</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrint('badge')}
                className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Print Teacher Pocket ID Badge"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>{isKhmer ? 'បោះពុម្ពកាតគ្រូ (Badge)' : 'Print ID Badge'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span>PNG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>SVG</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">{isKhmer ? 'បានចម្លង!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>{isKhmer ? 'Link' : 'Copy Link'}</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
