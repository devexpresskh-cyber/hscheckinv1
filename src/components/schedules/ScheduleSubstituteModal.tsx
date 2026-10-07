import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  GraduationCap,
  User,
  Clock,
  BookOpen,
  MapPin,
  Calendar,
  AlertTriangle,
  DollarSign,
  CheckCircle2,
  Trash2,
  Sparkles
} from 'lucide-react';
import {
  TeacherSubjectSchedule,
  Teacher,
  Employee,
  UserAccount,
  ScheduleSubstitution
} from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';

interface ScheduleSubstituteModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: TeacherSubjectSchedule | null;
  selectedDate: string; // YYYY-MM-DD
  teachers: Teacher[];
  employees: Employee[];
  currentUser: UserAccount;
  existingSubstitution?: ScheduleSubstitution | null;
  onSuccess?: () => void;
}

export const ScheduleSubstituteModal: React.FC<ScheduleSubstituteModalProps> = ({
  isOpen,
  onClose,
  schedule,
  selectedDate,
  teachers,
  employees,
  currentUser,
  existingSubstitution,
  onSuccess
}) => {
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();

  const [substituteType, setSubstituteType] = useState<'teacher' | 'employee'>('teacher');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [manualGrossWage, setManualGrossWage] = useState<string>('0');
  const [markCheckedIn, setMarkCheckedIn] = useState<boolean>(true);
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [checkOutTime, setCheckOutTime] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Available teachers (exclude original absent teacher)
  const availableTeachers = teachers.filter(t => {
    if (!schedule) return true;
    return t.id !== schedule.teacherId &&
           t.teacherId?.toLowerCase() !== schedule.teacherId?.toLowerCase() &&
           t.fullName.toLowerCase() !== schedule.teacherName.toLowerCase();
  });

  // Calculate schedule duration in hours
  const durationHours = schedule ? (() => {
    const s = AttendanceEngine.timeToMinutes(schedule.startTime);
    const e = AttendanceEngine.timeToMinutes(schedule.endTime);
    return Math.max(0.5, Math.round(((e - s) / 60) * 100) / 100);
  })() : 1;

  // Selected teacher's rate
  const selectedTeacher = availableTeachers.find(t => t.id === selectedTeacherId);
  const teacherHourlyRate = selectedTeacher?.hourlyRate ?? schedule?.hourlyRate ?? 20;
  const estimatedTeacherWage = (durationHours * teacherHourlyRate).toFixed(2);

  // Selected employee
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Populate initial state whenever opened or schedule/existing substitution changes
  useEffect(() => {
    if (isOpen && schedule) {
      const curTime = AttendanceEngine.getCurrentTimeString();
      const schedStart = schedule.startTime || '07:30';
      const schedEnd = schedule.endTime || '09:00';

      if (existingSubstitution) {
        setSubstituteType(existingSubstitution.substituteType);
        if (existingSubstitution.substituteType === 'teacher') {
          setSelectedTeacherId(existingSubstitution.substituteId);
          setSelectedEmployeeId(employees[0]?.id || '');
        } else {
          setSelectedEmployeeId(existingSubstitution.substituteId);
          setSelectedTeacherId(availableTeachers[0]?.id || '');
        }
        setManualGrossWage(String(existingSubstitution.manualGrossWage ?? 0));
        setCheckInTime(existingSubstitution.checkInTime || schedStart);
        setCheckOutTime(existingSubstitution.checkOutTime || schedEnd);
        setMarkCheckedIn(Boolean(existingSubstitution.checkInTime));
        setNote(existingSubstitution.note || '');
      } else {
        // Defaults for new assignment
        setSubstituteType('teacher');
        setSelectedTeacherId(availableTeachers[0]?.id || '');
        setSelectedEmployeeId(employees[0]?.id || '');
        // For staff gross wage is manual, default is 0
        setManualGrossWage('0');
        setCheckInTime(schedStart);
        setCheckOutTime(schedEnd);
        setMarkCheckedIn(true);
        setNote(isKhmer ? 'គ្រូដើមអវត្តមាន - ចាត់តាំងគ្រូ/បុគ្គលិកបង្រៀនជំនួស' : 'Original teacher absent - substitute assigned to cover class session');
      }
    }
  }, [isOpen, schedule, existingSubstitution]);

  if (!isOpen || !schedule) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (substituteType === 'teacher' && !selectedTeacherId) {
      showToast(isKhmer ? 'សូមជ្រើសរើសគ្រូបង្រៀនជំនួស' : 'Please select a substitute teacher', 'error');
      return;
    }
    if (substituteType === 'employee' && !selectedEmployeeId) {
      showToast(isKhmer ? 'សូមជ្រើសរើសបុគ្គលិកជំនួស' : 'Please select a substitute staff member', 'error');
      return;
    }

    const parsedWage = parseFloat(manualGrossWage);
    if (substituteType === 'employee' && (isNaN(parsedWage) || parsedWage < 0)) {
      showToast(isKhmer ? 'ប្រាក់ឈ្នួលសរុប (Gross Wage) ត្រូវតែជាលេខចាប់ពី 0 ឡើងទៅ' : 'Gross wage must be a valid number >= 0', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let subId = '';
      let subName = '';
      let subKhmer = '';
      let subDept = '';

      if (substituteType === 'teacher') {
        const tObj = availableTeachers.find(t => t.id === selectedTeacherId);
        if (!tObj) throw new Error('Teacher not found');
        subId = tObj.id;
        subName = tObj.fullName;
        subKhmer = tObj.khmerName;
        subDept = tObj.department;
      } else {
        const eObj = employees.find(e => e.id === selectedEmployeeId);
        if (!eObj) throw new Error('Employee staff not found');
        subId = eObj.id;
        subName = eObj.fullName;
        subKhmer = eObj.khmerName;
        subDept = eObj.department;
      }

      const res = StorageService.assignScheduleSubstitute({
        schedule,
        date: selectedDate,
        substituteType,
        substituteId: subId,
        substituteName: subName,
        substituteKhmerName: subKhmer,
        substituteDepartment: subDept,
        manualGrossWage: substituteType === 'employee' ? (parsedWage || 0) : undefined,
        markCheckedIn,
        checkInTime: markCheckedIn ? (checkInTime || schedule.startTime) : undefined,
        checkOutTime: markCheckedIn ? (checkOutTime || schedule.endTime) : undefined,
        note,
        assignedBy: currentUser.fullName || currentUser.email
      });

      showToast(
        isKhmer
          ? `បានចាត់តាំង ${subName} (${substituteType === 'employee' ? 'បុគ្គលិក' : 'គ្រូ'}) ជំនួសគ្រូ ${schedule.teacherName} ដោយជោគជ័យ!${substituteType === 'employee' ? ` (ប្រាក់ឈ្នួល $${(parsedWage || 0).toFixed(2)})` : ''}`
          : `Assigned ${subName} (${substituteType === 'employee' ? 'Staff' : 'Teacher'}) to cover ${schedule.subject} for absent teacher ${schedule.teacherName}.${substituteType === 'employee' ? ` Manual Gross Wage: $${(parsedWage || 0).toFixed(2)}` : ''}`,
        'success'
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign substitute', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = () => {
    if (!confirm(isKhmer ? 'តើលោកអ្នកពិតជាចង់លុបចោលការចាត់តាំងគ្រូជំនួសនេះមែនទេ?' : 'Are you sure you want to revert and remove this substitution?')) {
      return;
    }
    const res = StorageService.removeScheduleSubstitute(schedule.id, selectedDate);
    if (res.success) {
      showToast(isKhmer ? 'បានលុបចោលការចាត់តាំងជំនួសដោយជោគជ័យ' : res.message, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                {isKhmer ? 'ចាត់តាំងគ្រូ ឬបុគ្គលិកជំនួស (គ្រូដើមអវត្តមាន)' : 'Assign Substitute / Reassign Absent Class'}
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isKhmer ? 'គ្រូដើមមិនបានមកបង្រៀន រដ្ឋបាលអាចចាត់តាំងគ្រូផ្សេង ឬបុគ្គលិកជំនួស' : 'When teacher is absent, admin can assign to another teacher or to a staff'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Schedule Context Card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                  {schedule.periodName || 'Class Session'} • {schedule.gradeClass}
                </span>
                <h4 className="font-extrabold text-sm text-slate-900">
                  {isKhmer && schedule.khmerSubject ? schedule.khmerSubject : schedule.subject}
                </h4>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>{schedule.startTime} – {schedule.endTime}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{selectedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{schedule.room || 'Main Room'}</span>
              </div>
            </div>

            {/* Original Teacher info with Absent Flag */}
            <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-rose-200/70 text-rose-800 font-bold text-xs flex items-center justify-center shrink-0">
                  {schedule.teacherName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-rose-950 truncate">
                    {schedule.teacherName}
                    {schedule.khmerTeacherName && <span className="text-rose-700 font-normal ml-1">({schedule.khmerTeacherName})</span>}
                  </div>
                  <div className="text-[10px] text-rose-600">
                    {isKhmer ? 'គ្រូទទួលខុសត្រូវដើម' : 'Original Scheduled Teacher'}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-600 text-white shadow-2xs shrink-0">
                {isKhmer ? 'អវត្តមាន ($0.00)' : 'Absent ($0.00 Wage)'}
              </span>
            </div>
          </div>

          {/* Substitute Target Type Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isKhmer ? 'ជ្រើសរើសប្រភេទអ្នកបង្រៀនជំនួស' : 'Assign Substitute To:'}
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setSubstituteType('teacher')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  substituteType === 'teacher'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>{isKhmer ? 'គ្រូបង្រៀនផ្សេង' : 'Another Teacher'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSubstituteType('employee')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  substituteType === 'employee'
                    ? 'bg-white text-purple-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4 text-purple-600" />
                <span>{isKhmer ? 'បុគ្គលិកទូទៅ (Staff)' : 'Staff Member (Employee)'}</span>
              </button>
            </div>
          </div>

          {/* Teacher Selection */}
          {substituteType === 'teacher' && (
            <div className="space-y-3 p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {isKhmer ? 'ជ្រើសរើសគ្រូបង្រៀនជំនួស' : 'Select Substitute Teacher'} *
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                >
                  <option value="">{isKhmer ? '-- ជ្រើសរើសគ្រូបង្រៀន --' : '-- Select Teacher --'}</option>
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.khmerName ? `(${t.khmerName})` : ''} — {t.subject} (${(t.hourlyRate ?? 20).toFixed(0)}/hr)
                    </option>
                  ))}
                </select>
              </div>

              {selectedTeacher && (
                <div className="p-2.5 bg-white rounded-xl border border-indigo-200/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">
                      {isKhmer ? 'តម្លៃម៉ោងបង្រៀនធម្មតារបស់គ្រូ' : 'Teacher Base Hourly Rate'}:
                    </span>
                    <span className="font-extrabold text-indigo-700">
                      ${teacherHourlyRate.toFixed(2)}/hr
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px] block">
                      {isKhmer ? 'ប្រាក់ឈ្នួលប៉ាន់ស្មាន' : 'Estimated Session Wage'}:
                    </span>
                    <span className="font-extrabold text-emerald-700 font-mono">
                      {durationHours} hr × ${teacherHourlyRate} = ${estimatedTeacherWage}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Employee Staff Selection & Manual Gross Wage */}
          {substituteType === 'employee' && (
            <div className="space-y-3 p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {isKhmer ? 'ជ្រើសរើសបុគ្គលិកជំនួស (Staff)' : 'Select Staff Member (Employee)'} *
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                >
                  <option value="">{isKhmer ? '-- ជ្រើសរើសបុគ្គលិក --' : '-- Select Staff --'}</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} {e.khmerName ? `(${e.khmerName})` : ''} — {e.position} ({e.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Requirement: for staff gross wage is manual, default is 0 */}
              <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isKhmer ? 'ប្រាក់ឈ្នួលបង្រៀនជំនួស (Gross Wage)' : 'Manual Gross Wage ($)'}</span>
                  </label>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                    {isKhmer ? 'កំណត់ដោយដៃ (ស្រេចចិត្ត)' : 'Manual Input'}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualGrossWage}
                    onChange={e => setManualGrossWage(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    required
                  />
                </div>

                <p className="text-[11px] text-purple-900 font-medium leading-relaxed bg-purple-50/80 p-2 rounded-lg border border-purple-100">
                  <Sparkles className="w-3 h-3 text-purple-600 inline mr-1" />
                  {isKhmer
                    ? 'សម្រាប់បុគ្គលិក ប្រាក់ឈ្នួលម៉ោងបង្រៀនជំនួសគឺកំណត់ដោយដៃ (default គឺ $0)។ អាចបញ្ចូល $0 សម្រាប់ភារកិច្ចបុគ្គលិកទូទៅ ឬបញ្ចូលទឹកប្រាក់ដែលបានព្រមព្រៀង។'
                    : 'For staff, gross wage is manual (default is $0). Enter 0 for regular duty coverage, or specify any agreed compensation amount for this class session.'}
                </p>
              </div>
            </div>
          )}

          {/* Attendance Check-in Options */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={markCheckedIn}
                onChange={e => setMarkCheckedIn(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">
                {isKhmer ? 'ស្កេនវត្តមានចូលភ្លាមៗ (Mark Present & In Class)' : 'Record attendance as Present immediately'}
              </span>
            </label>

            {markCheckedIn && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {isKhmer ? 'ម៉ោងស្កេនចូល (Check-In)' : 'Check-In Time'}
                  </label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={e => setCheckInTime(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {isKhmer ? 'ម៉ោងស្កេនចេញ (Check-Out)' : 'Check-Out Time'}
                  </label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={e => setCheckOutTime(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes / Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isKhmer ? 'មូលហេតុ ឬចំណាំផ្សេងៗ (Notes / Reason)' : 'Reason / Note'}
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={isKhmer ? 'ឧ. គ្រូឈឺសុំច្បាប់បន្ទាន់...' : 'e.g. Teacher sick leave cover...'}
              className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Existing substitution notice */}
          {existingSubstitution && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {isKhmer ? 'ម៉ោងនេះមានការចាត់តាំងជំនួសរួចហើយ' : 'Class currently has an active substitute'}: <b>{existingSubstitution.substituteName}</b>
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="px-2 py-1 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKhmer ? 'លុបចោល' : 'Revert'}</span>
              </button>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isKhmer ? 'បោះបង់' : 'Cancel'}
            </button>

            {existingSubstitution && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                {isKhmer ? 'លុបការជំនួស' : 'Remove Substitution'}
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? isKhmer ? 'កំពុងរក្សាទុក...' : 'Saving...'
                  : existingSubstitution
                  ? isKhmer ? 'កែប្រែការចាត់តាំង' : 'Update Substitution'
                  : isKhmer ? 'ចាត់តាំងជំនួស & រក្សាទុក' : 'Confirm & Assign Substitute'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
