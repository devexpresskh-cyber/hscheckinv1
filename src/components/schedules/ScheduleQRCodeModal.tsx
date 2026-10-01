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

  const handlePrint = () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {isKhmer ? 'បង្កើតកូដ QR កាលវិភាគ' : 'Create Schedule QR Code'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isKhmer ? 'ស្កេនដោយមិនបាច់ Login' : 'No-Login Scan'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isKhmer
                  ? 'គ្រូគ្រាន់តែស្កេន QR និងផ្ទៀងផ្ទាត់លេខសម្ងាត់ PIN ៤ ខ្ទង់ដើម្បីចុះវត្តមានភ្លាមៗ'
                  : 'Faculty can scan without logging in — attendance confirmed with 4-digit PIN'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Grid: Left Controls (1 col) + Right Live Preview & Poster (1 col) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Form & Configuration (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
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
          <div className="lg:col-span-7 flex flex-col items-center justify-between space-y-4">
            
            {/* The Printable Door Poster Container */}
            <div
              id={`printable-schedule-poster-${printSectionId}`}
              className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl border-2 border-slate-300 p-5 sm:p-6 shadow-xl text-center space-y-4 relative print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none"
            >
              {/* Top Institutional Header */}
              <div className="border-b-2 border-slate-900 pb-3 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-slate-900 tracking-tight leading-none uppercase">
                      {settings.schoolName || settings.organizationName}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-semibold leading-none">
                      {isKhmer ? 'ប្រព័ន្ធកាលវិភាគ និងវត្តមានគ្រូ' : 'Teacher Schedule & Attendance Station'}
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

              {/* QR Code Canvas / Visual with Center Crest */}
              <div className="relative inline-block mx-auto p-3 rounded-2xl bg-white border border-slate-200 shadow-md">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Schedule QR Code"
                    className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain select-none"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-slate-50">
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

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>{isKhmer ? 'បោះពុម្ពបិទលើទ្វារ' : 'Print Door Sign'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs transition-all"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span>PNG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs transition-all"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>SVG</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs transition-all"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">{isKhmer ? 'បានចម្លង!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>{isKhmer ? 'ចម្លង Link' : 'Copy Link'}</span>
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
