import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { Teacher, TeacherSubjectSchedule, AttendanceRecord, AttendanceStatus } from '../../types/index.ts';
import confetti from 'canvas-confetti';
import {
  X,
  UserCheck,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
  Search,
  Check
} from 'lucide-react';

interface AdminRecordAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTeacherId?: string;
  initialDate?: string;
  initialSubjectScheduleId?: string;
  onSuccess?: () => void;
}

export const AdminRecordAttendanceModal: React.FC<AdminRecordAttendanceModalProps> = ({
  isOpen,
  onClose,
  initialTeacherId,
  initialDate,
  initialSubjectScheduleId,
  onSuccess
}) => {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    StorageService.getTeachers().filter(t => t.status === 'Active')
  );
  const [subjectSchedules, setSubjectSchedules] = useState<TeacherSubjectSchedule[]>(() =>
    StorageService.getSubjectSchedules().filter(s => s.isActive)
  );
  const [systemSettings] = useState(() => StorageService.getSettings());

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form states
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId || (teachers[0]?.id || ''));
  const [date, setDate] = useState<string>(initialDate || todayStr);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(initialSubjectScheduleId || '');
  const [status, setStatus] = useState<AttendanceStatus>('Present');
  const [checkInTime, setCheckInTime] = useState<string>('07:30');
  const [checkOutTime, setCheckOutTime] = useState<string>('09:30');
  const [lateMinutes, setLateMinutes] = useState<number>(0);
  const [adminNote, setAdminNote] = useState<string>('Admin manual entry');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [teacherSearch, setTeacherSearch] = useState<string>('');

  useEffect(() => {
    if (initialTeacherId) setSelectedTeacherId(initialTeacherId);
    if (initialDate) setDate(initialDate);
    if (initialSubjectScheduleId) setSelectedScheduleId(initialSubjectScheduleId);
  }, [initialTeacherId, initialDate, initialSubjectScheduleId, isOpen]);

  // Selected teacher object
  const selectedTeacher = useMemo(() => {
    return teachers.find(t => t.id === selectedTeacherId || t.teacherId === selectedTeacherId) || teachers[0];
  }, [teachers, selectedTeacherId]);

  // Day of week for chosen date
  const dayOfWeek = useMemo(() => {
    if (!date) return new Date().getDay();
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }, [date]);

  // Holiday check for chosen date
  const dateHoliday = useMemo(() => AttendanceEngine.getHoliday(date), [date]);

  // Classes for this teacher on this day of week
  const teacherClassesOnDate = useMemo(() => {
    if (!selectedTeacher) return [];
    return subjectSchedules.filter(sub => {
      const isMatch = sub.teacherId === selectedTeacher.id ||
        sub.teacherId === selectedTeacher.teacherId ||
        sub.teacherName.toLowerCase() === selectedTeacher.fullName.toLowerCase();
      if (!isMatch) return false;

      if (sub.daysOfWeek && Array.isArray(sub.daysOfWeek) && sub.daysOfWeek.length > 0) {
        return sub.daysOfWeek.includes(dayOfWeek);
      }
      return sub.dayOfWeek === dayOfWeek;
    });
  }, [selectedTeacher, subjectSchedules, dayOfWeek]);

  // Pre-fill schedule start/end when selected schedule changes
  useEffect(() => {
    if (selectedScheduleId) {
      const match = teacherClassesOnDate.find(s => s.id === selectedScheduleId);
      if (match) {
        setCheckInTime(match.startTime);
        setCheckOutTime(match.endTime);
        return;
      }
    }

    if (teacherClassesOnDate.length > 0) {
      setSelectedScheduleId(teacherClassesOnDate[0].id);
      setCheckInTime(teacherClassesOnDate[0].startTime);
      setCheckOutTime(teacherClassesOnDate[0].endTime);
    } else {
      setSelectedScheduleId('custom');
      setCheckInTime('07:30');
      setCheckOutTime('09:30');
    }
  }, [selectedTeacherId, date, teacherClassesOnDate]);

  // Filtered teachers list for searchable select
  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.toLowerCase().trim();
    if (!q) return teachers;
    return teachers.filter(t =>
      t.fullName.toLowerCase().includes(q) ||
      (t.khmerName && t.khmerName.toLowerCase().includes(q)) ||
      t.teacherId.toLowerCase().includes(q) ||
      (t.department && t.department.toLowerCase().includes(q))
    );
  }, [teachers, teacherSearch]);

  const handleFillFullSchedule = () => {
    const match = teacherClassesOnDate.find(s => s.id === selectedScheduleId);
    if (match) {
      setCheckInTime(match.startTime);
      setCheckOutTime(match.endTime);
      setStatus('Present');
      setLateMinutes(0);
      showToast(
        isKhmer
          ? `បានបំពេញម៉ោងពេញលេញតាមកាលវិភាគ (${match.startTime} - ${match.endTime})`
          : `Filled full schedule hours: ${match.startTime} – ${match.endTime}`,
        'info'
      );
    } else {
      setCheckInTime('07:30');
      setCheckOutTime('09:30');
      setStatus('Present');
      setLateMinutes(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) {
      showToast('Please select a teacher', 'error');
      return;
    }

    if (dateHoliday && (status === 'Present' || status === 'Late' || Boolean(checkInTime))) {
      const holidayLabel = dateHoliday.khmerName ? `${dateHoliday.name} (${dateHoliday.khmerName})` : dateHoliday.name;
      showToast(
        isKhmer
          ? `មិនអនុញ្ញាតឱ្យកត់ត្រាការស្កេនចូលទេ៖ កាលបរិច្ឆេទ ${date} ជាថ្ងៃឈប់សម្រាកបុណ្យផ្លូវការ "${holidayLabel}"។`
          : `Check-in denied: ${date} is an official holiday — "${holidayLabel}". Check-in is not allowed on holidays.`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    const chosenSchedule = teacherClassesOnDate.find(s => s.id === selectedScheduleId);

    const sStart = chosenSchedule?.startTime || checkInTime;
    const sEnd = chosenSchedule?.endTime || checkOutTime;

    // Check if record already exists for this teacher, date, and schedule
    const allAttendance = StorageService.getAttendance();
    const existing = allAttendance.find(
      r => r.personId === selectedTeacher.id &&
           r.date === date &&
           (chosenSchedule ? (r.subjectScheduleId === chosenSchedule.id || r.scheduleId === chosenSchedule.id) : true)
    );

    const adminFullName = currentUser.fullName || 'Administrator';
    const note = `Admin record by ${adminFullName}: ${adminNote || 'Verified in person'}`;

    const recordId = existing ? existing.id : `att-${date}-${selectedTeacher.id}-${chosenSchedule ? chosenSchedule.id : 'manual'}-${Date.now().toString().slice(-4)}`;

    const newRecord: AttendanceRecord = {
      id: recordId,
      personId: selectedTeacher.id,
      personType: 'teacher',
      personName: selectedTeacher.fullName,
      khmerName: selectedTeacher.khmerName,
      department: selectedTeacher.department || 'Academic & Curriculum',
      date: date,
      scheduleId: chosenSchedule ? chosenSchedule.id : (selectedTeacher.assignedScheduleId || 'sch-standard-fulltime'),
      scheduleName: chosenSchedule ? `${chosenSchedule.subject} (${chosenSchedule.periodName || 'Class'})` : 'Admin Manual Recorded Schedule',
      subjectScheduleId: chosenSchedule?.id,
      subject: chosenSchedule?.subject || 'Class Period',
      khmerSubject: chosenSchedule?.khmerSubject,
      subjectCode: chosenSchedule?.subjectCode,
      gradeClass: chosenSchedule?.gradeClass || 'General',
      room: chosenSchedule?.room || 'Main Room',
      periodName: chosenSchedule?.periodName || 'Period',
      session: parseInt(sStart.split(':')[0], 10) < 12 ? 'morning' : 'afternoon',
      scheduledStart: sStart,
      scheduledEnd: sEnd,
      checkInTime: status === 'Absent' ? undefined : checkInTime,
      checkOutTime: status === 'Absent' ? undefined : checkOutTime,
      status: status,
      lateMinutes: status === 'Late' ? (lateMinutes || 10) : 0,
      earlyLeaveMinutes: 0,
      overtimeMinutes: 0,
      locationLatitude: systemSettings.defaultLocationLatitude,
      locationLongitude: systemSettings.defaultLocationLongitude,
      locationVerified: true, // Admin override
      isCorrected: true,
      correctionNote: note,
      reassignedBy: adminFullName,
      reassignedAt: new Date().toISOString(),
      reassignReason: 'Admin Manual Attendance Log',
      createdAt: `${date}T${checkInTime || '07:30'}:00`
    };

    if (existing) {
      StorageService.updateAttendanceRecord(existing.id, newRecord);
    } else {
      StorageService.addAttendanceRecord(newRecord);
    }

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'Admin Recorded Teacher Attendance',
      target: `${selectedTeacher.fullName} (${date} • ${chosenSchedule?.subject || 'Class'} • ${status})`,
      newValue: `In: ${checkInTime}, Out: ${checkOutTime}, Note: ${adminNote}`,
      ipAddress: '127.0.0.1'
    });

    // Telegram dispatch if check-in
    if (status === 'Present' || status === 'Late') {
      TelegramService.sendCheckInAlert({
        name: selectedTeacher.fullName,
        khmerName: selectedTeacher.khmerName,
        personType: 'teacher',
        department: selectedTeacher.department || 'Academic',
        time: checkInTime,
        scheduled: `${sStart} - ${sEnd}`,
        status: status,
        lateMinutes: status === 'Late' ? lateMinutes : 0,
        subjectInfo: chosenSchedule ? `${chosenSchedule.subject} (${chosenSchedule.gradeClass || ''} - ${chosenSchedule.room || ''})` : undefined
      });
    }

    setIsSubmitting(false);
    confetti({ particleCount: 50, spread: 60 });
    showToast(
      isKhmer
        ? `បានកត់ត្រាវត្តមានជោគជ័យសម្រាប់ ${selectedTeacher.fullName} (${status})`
        : `Successfully recorded attendance for ${selectedTeacher.fullName} (${status})`,
      'success'
    );

    if (onSuccess) onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <UserCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">
                  {isKhmer ? 'កត់ត្រាវត្តមានគ្រូបង្រៀន (Admin Record)' : 'Record Attendance for Teacher'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Admin Tool
                </span>
              </div>
              <p className="text-[11px] text-indigo-200">
                {isKhmer
                  ? 'កត់ត្រាវត្តមានជំនួសគ្រូដោយផ្ទាល់ (Override Geofence & Bypass Schedule Window)'
                  : 'Manually record or correct teacher attendance with full administrative privilege.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Teacher Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>{isKhmer ? 'ជ្រើសរើសគ្រូបង្រៀន (Select Teacher) *' : 'Select Faculty Teacher *'}</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {teachers.length} {isKhmer ? 'គ្រូសកម្ម' : 'Active Teachers'}
              </span>
            </label>

            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={isKhmer ? 'ស្វែងរកឈ្មោះ ឬលេខកូដគ្រូ...' : 'Filter teacher by name or code...'}
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <select
                required
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {filteredTeachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} {t.khmerName ? `(${t.khmerName})` : ''} • ID: {t.teacherId} • {t.department || 'Academic'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isKhmer ? 'កាលបរិច្ឆេទវត្តមាន (Date) *' : 'Attendance Date *'}</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs"
              />
              {dateHoliday && (
                <div className="mt-1.5 p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-center gap-1.5 font-bold">
                  <span>🌴 {dateHoliday.name} {dateHoliday.khmerName ? `(${dateHoliday.khmerName})` : ''}: {isKhmer ? 'ថ្ងៃឈប់សម្រាកបុណ្យផ្លូវការ (បិទស្កេនចូល)' : 'Official Holiday (Check-in Disabled)'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isKhmer ? 'ស្ថានភាពវត្តមាន (Status) *' : 'Attendance Status *'}</span>
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
                {(['Present', 'Late', 'Leave', 'Absent'] as AttendanceStatus[]).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      status === st
                        ? st === 'Present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : st === 'Late'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : st === 'Leave'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'Present' ? (isKhmer ? 'វត្តមាន' : 'Present')
                      : st === 'Late' ? (isKhmer ? 'យឺត' : 'Late')
                      : st === 'Leave' ? (isKhmer ? 'ច្បាប់' : 'Leave')
                      : (isKhmer ? 'អវត្តមាន' : 'Absent')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timetable Class Session Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isKhmer ? 'ជ្រើសរើសម៉ោងបង្រៀន / កាលវិភាគ' : 'Teaching Period / Timetable Session'}</span>
              </label>
              <button
                type="button"
                onClick={handleFillFullSchedule}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>{isKhmer ? 'បំពេញម៉ោងពេញលេញ (Auto Full Schedule)' : 'Fill Full Schedule Hours'}</span>
              </button>
            </div>

            {teacherClassesOnDate.length > 0 ? (
              <div className="space-y-1.5">
                {teacherClassesOnDate.map(cls => (
                  <label
                    key={cls.id}
                    onClick={() => setSelectedScheduleId(cls.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedScheduleId === cls.id
                        ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="scheduleSession"
                        checked={selectedScheduleId === cls.id}
                        onChange={() => setSelectedScheduleId(cls.id)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <span>{cls.khmerSubject || cls.subject}</span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                            {cls.gradeClass}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>🚪 {cls.room || 'Room'}</span>
                          <span>•</span>
                          <span>🏷️ {cls.periodName || 'Period'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-indigo-950 text-xs block">
                        {cls.startTime} - {cls.endTime}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold">
                        Full Period
                      </span>
                    </div>
                  </label>
                ))}

                <label
                  onClick={() => setSelectedScheduleId('custom')}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer ${
                    selectedScheduleId === 'custom'
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scheduleSession"
                    checked={selectedScheduleId === 'custom'}
                    onChange={() => setSelectedScheduleId('custom')}
                    className="text-indigo-600"
                  />
                  <span className="font-bold text-slate-700">
                    {isKhmer ? 'ម៉ោងបង្រៀនពិសេស / វេនក្រៅកាលវិភាគ (Custom Session)' : 'Custom Teaching Session / Special Period'}
                  </span>
                </label>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
                <span>
                  {isKhmer
                    ? 'គ្មានកាលវិភាគបង្រៀនទៀងទាត់សម្រាប់ថ្ងៃនេះឡើយ (កំពុងប្រើប្រាស់ Custom Session)'
                    : 'No regular class scheduled for this day of week. Using Custom Session.'}
                </span>
                <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                  Custom
                </span>
              </div>
            )}
          </div>

          {/* Check-In and Check-Out Times */}
          {status !== 'Absent' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>{isKhmer ? 'ម៉ោងស្កេនចូល (Check In Time)' : 'Check In Time'}</span>
                </label>
                <input
                  type="time"
                  required
                  value={checkInTime}
                  onChange={e => setCheckInTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-600" />
                  <span>{isKhmer ? 'ម៉ោងស្កេនចេញ (Check Out Time)' : 'Check Out Time'}</span>
                </label>
                <input
                  type="time"
                  required
                  value={checkOutTime}
                  onChange={e => setCheckOutTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 shadow-2xs"
                />
              </div>

              {status === 'Late' && (
                <div className="sm:col-span-2 pt-1">
                  <label className="block text-[11px] font-bold text-amber-800 mb-1">
                    {isKhmer ? 'ចំនួននាទីយឺត (Late Minutes)' : 'Late Minutes'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={lateMinutes}
                    onChange={e => setLateMinutes(Number(e.target.value))}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 font-bold text-amber-950"
                  />
                </div>
              )}
            </div>
          )}

          {/* Admin Note / Justification */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{isKhmer ? 'មូលហេតុ ឬចំណាំរបស់អ្នកគ្រប់គ្រង (Admin Note / Justification)' : 'Admin Note / Reason for Manual Entry'}</span>
            </label>
            <input
              type="text"
              required
              placeholder={isKhmer ? 'ឧ. បានបង្រៀនផ្ទាល់ក្នុងបន្ទប់ គ្រូខូចទូរស័ព្ទ...' : 'e.g., Taught in person, phone malfunction, approved by dean'}
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Privilege Badge Note */}
          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-950 text-[11px] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              {isKhmer
                ? `កត់ត្រាដោយ ${currentUser.fullName} (${currentUser.role})។ ប្រព័ន្ធនឹងកត់ត្រាក្នុង Audit Log ផ្ទៀងផ្ទាត់ GPS ស្វ័យប្រវត្ត និងធ្វើបច្ចុប្បន្នភាពតារាង ៣១ ថ្ងៃភ្លាមៗ។`
                : `Authorized by ${currentUser.fullName} (${currentUser.role}). Automatically bypasses geofence restrictions and updates payroll ledgers immediately.`}
            </span>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all cursor-pointer"
            >
              {isKhmer ? 'បោះបង់' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? (isKhmer ? 'កំពុងកត់ត្រា...' : 'Saving...') : (isKhmer ? 'រក្សាទុកវត្តមាន (Save Attendance)' : 'Save Attendance Record')}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
