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
  Sparkles,
  Plus,
  Divide,
  AlertCircle
} from 'lucide-react';
import {
  TeacherSubjectSchedule,
  Teacher,
  Employee,
  UserAccount,
  ScheduleSubstitution,
  ScheduleSubstitutionAssignee
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

interface AssigneeDraft {
  id: string;
  substituteType: 'teacher' | 'employee';
  personId: string;
  allocatedHours: number;
  manualGrossWage: string; // For staff, default "0"
  startTime: string;
  endTime: string;
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

  const [assignees, setAssignees] = useState<AssigneeDraft[]>([]);
  const [markCheckedIn, setMarkCheckedIn] = useState<boolean>(true);
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

  // Helper: compute continuous start and end times for assignees based on allocated hours
  const computeTimeSlices = (drafts: AssigneeDraft[], baseStartTime: string) => {
    let currentMins = AttendanceEngine.timeToMinutes(baseStartTime);
    return drafts.map(d => {
      const startStr = AttendanceEngine.minutesToTime(currentMins);
      const spanMins = Math.round((d.allocatedHours || 0) * 60);
      currentMins += spanMins;
      const endStr = AttendanceEngine.minutesToTime(currentMins);
      return {
        ...d,
        startTime: startStr,
        endTime: endStr
      };
    });
  };

  // Populate initial state whenever opened or schedule/existing substitution changes
  useEffect(() => {
    if (isOpen && schedule) {
      const schedStart = schedule.startTime || '07:30';
      const schedEnd = schedule.endTime || '09:00';

      if (existingSubstitution && existingSubstitution.assignees && existingSubstitution.assignees.length > 0) {
        // Load multiple existing assignees
        const loaded: AssigneeDraft[] = existingSubstitution.assignees.map((a, idx) => ({
          id: a.id || `assignee-${idx}`,
          substituteType: a.substituteType,
          personId: a.substituteId,
          allocatedHours: Number(a.allocatedHours) || (durationHours / existingSubstitution.assignees!.length),
          manualGrossWage: String(a.manualGrossWage ?? 0),
          startTime: a.startTime || schedStart,
          endTime: a.endTime || schedEnd
        }));
        setAssignees(loaded);
        setMarkCheckedIn(Boolean(existingSubstitution.checkInTime || existingSubstitution.assignees[0]?.checkInTime));
        setNote(existingSubstitution.note || '');
      } else if (existingSubstitution) {
        // Single existing assignee fallback
        const single: AssigneeDraft = {
          id: `assignee-0`,
          substituteType: existingSubstitution.substituteType,
          personId: existingSubstitution.substituteId,
          allocatedHours: durationHours,
          manualGrossWage: String(existingSubstitution.manualGrossWage ?? 0),
          startTime: existingSubstitution.startTime || schedStart,
          endTime: existingSubstitution.endTime || schedEnd
        };
        setAssignees([single]);
        setMarkCheckedIn(Boolean(existingSubstitution.checkInTime));
        setNote(existingSubstitution.note || '');
      } else {
        // New assignment defaults: start with 1 assignee covering full duration
        const firstTeacher = availableTeachers[0];
        const initialDraft: AssigneeDraft = {
          id: `assignee-${Date.now()}-0`,
          substituteType: 'teacher',
          personId: firstTeacher?.id || '',
          allocatedHours: durationHours,
          manualGrossWage: '0',
          startTime: schedStart,
          endTime: schedEnd
        };
        setAssignees([initialDraft]);
        setMarkCheckedIn(true);
        setNote(
          isKhmer
            ? 'គ្រូដើមអវត្តមាន - ចាត់តាំងគ្រូ/បុគ្គលិកបង្រៀនជំនួស'
            : 'Original teacher absent - substitute assigned to cover class session'
        );
      }
    }
  }, [isOpen, schedule, existingSubstitution]);

  if (!isOpen || !schedule) return null;

  // Calculation of total allocated hours
  const totalAllocatedHours = Math.round(
    assignees.reduce((acc, a) => acc + (Number(a.allocatedHours) || 0), 0) * 100
  ) / 100;
  const remainingHours = Math.round(Math.max(0, durationHours - totalAllocatedHours) * 100) / 100;
  const isOverAllocated = totalAllocatedHours > durationHours + 0.01;
  const isUnderAllocated = totalAllocatedHours < durationHours - 0.01;

  // Handler: Update assignee field
  const handleUpdateAssignee = (id: string, updates: Partial<AssigneeDraft>) => {
    setAssignees(prev => {
      const updated = prev.map(a => {
        if (a.id !== id) return a;
        const next = { ...a, ...updates };

        // When switching substituteType, set default personId
        if (updates.substituteType && updates.substituteType !== a.substituteType) {
          if (updates.substituteType === 'teacher') {
            next.personId = availableTeachers[0]?.id || '';
          } else {
            next.personId = employees[0]?.id || '';
            // For staff gross wage is manual, default is 0
            if (!next.manualGrossWage || isNaN(Number(next.manualGrossWage))) {
              next.manualGrossWage = '0';
            }
          }
        }
        return next;
      });
      return computeTimeSlices(updated, schedule.startTime);
    });
  };

  // Handler: Add another substitute (teacher or staff up to schedule hours)
  const handleAddAssignee = () => {
    const newAlloc = remainingHours > 0.25 ? remainingHours : Math.max(0.5, Math.round((durationHours / (assignees.length + 1)) * 100) / 100);

    // If remaining hours is 0, adjust existing assignees to make room or add with remaining
    const defaultPerson = availableTeachers.find(t => !assignees.some(a => a.personId === t.id)) || availableTeachers[0];

    const newDraft: AssigneeDraft = {
      id: `assignee-${Date.now()}-${assignees.length}`,
      substituteType: 'teacher',
      personId: defaultPerson?.id || '',
      allocatedHours: newAlloc,
      manualGrossWage: '0',
      startTime: schedule.startTime,
      endTime: schedule.endTime
    };

    const nextList = [...assignees, newDraft];
    setAssignees(computeTimeSlices(nextList, schedule.startTime));
  };

  // Handler: Remove assignee
  const handleRemoveAssignee = (id: string) => {
    if (assignees.length <= 1) return;
    const filtered = assignees.filter(a => a.id !== id);
    setAssignees(computeTimeSlices(filtered, schedule.startTime));
  };

  // Handler: Split schedule hours equally among all current assignees
  const handleSplitEqually = () => {
    if (assignees.length === 0) return;
    const perPerson = Math.round((durationHours / assignees.length) * 100) / 100;
    const updated = assignees.map((a, idx) => ({
      ...a,
      allocatedHours: idx === assignees.length - 1
        ? Math.round((durationHours - perPerson * (assignees.length - 1)) * 100) / 100
        : perPerson
    }));
    setAssignees(computeTimeSlices(updated, schedule.startTime));
  };

  // Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (assignees.length === 0) {
      showToast(isKhmer ? 'សូមបន្ថែមអ្នកបង្រៀនជំនួសយ៉ាងតិច ១ នាក់' : 'Please add at least 1 substitute', 'error');
      return;
    }

    if (isOverAllocated) {
      showToast(
        isKhmer
          ? `ម៉ោងដែលបានបែងចែកសរុប (${totalAllocatedHours} ម៉ោង) លើសពីម៉ោងកាលវិភាគជាក់ស្តែង (${durationHours} ម៉ោង)។ សូមកែសម្រួលម៉ោងឡើងវិញ!`
          : `Total allocated hours (${totalAllocatedHours} hrs) exceeds total schedule duration (${durationHours} hrs). Please adjust hours.`,
        'error'
      );
      return;
    }

    // Validate each assignee
    for (let i = 0; i < assignees.length; i++) {
      const a = assignees[i];
      if (!a.personId) {
        showToast(
          isKhmer
            ? `សូមជ្រើសរើស ${a.substituteType === 'employee' ? 'បុគ្គលិក' : 'គ្រូ'} សម្រាប់អ្នកជំនួសទី ${i + 1}`
            : `Please select a ${a.substituteType === 'employee' ? 'staff member' : 'teacher'} for assignee #${i + 1}`,
          'error'
        );
        return;
      }
      if (a.allocatedHours <= 0) {
        showToast(
          isKhmer
            ? `ម៉ោងបង្រៀនរបស់អ្នកជំនួសទី ${i + 1} ត្រូវតែធំជាង 0`
            : `Allocated hours for assignee #${i + 1} must be > 0`,
          'error'
        );
        return;
      }
      if (a.substituteType === 'employee') {
        const parsedWage = parseFloat(a.manualGrossWage);
        if (isNaN(parsedWage) || parsedWage < 0) {
          showToast(
            isKhmer
              ? `ប្រាក់ឈ្នួល (Gross Wage) សម្រាប់បុគ្គលិកជំនួសទី ${i + 1} ត្រូវតែជាលេខចាប់ពី 0 ឡើងទៅ`
              : `Manual gross wage for staff substitute #${i + 1} must be >= 0`,
            'error'
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      // Build final normalized assignees
      const finalAssignees: ScheduleSubstitutionAssignee[] = assignees.map((a, idx) => {
        let name = '';
        let khmer: string | undefined = undefined;
        let dept = '';
        let rate: number | undefined = undefined;

        if (a.substituteType === 'teacher') {
          const tObj = availableTeachers.find(t => t.id === a.personId);
          name = tObj?.fullName || 'Teacher';
          khmer = tObj?.khmerName;
          dept = tObj?.department || 'Academic';
          rate = tObj?.hourlyRate ?? schedule.hourlyRate ?? 20;
        } else {
          const eObj = employees.find(e => e.id === a.personId);
          name = eObj?.fullName || 'Staff';
          khmer = eObj?.khmerName;
          dept = eObj?.department || 'Staff';
        }

        const staffGrossWage = a.substituteType === 'employee'
          ? (parseFloat(a.manualGrossWage) || 0)
          : 0;
        const calcWage = a.substituteType === 'teacher'
          ? Math.round((a.allocatedHours * (rate || 20)) * 100) / 100
          : staffGrossWage;

        return {
          id: a.id,
          substituteType: a.substituteType,
          substituteId: a.personId,
          substituteName: name,
          substituteKhmerName: khmer,
          substituteDepartment: dept,
          startTime: a.startTime || schedule.startTime,
          endTime: a.endTime || schedule.endTime,
          allocatedHours: a.allocatedHours,
          manualGrossWage: staffGrossWage,
          hourlyRate: rate,
          calculatedWage: calcWage,
          checkInTime: markCheckedIn ? (a.startTime || schedule.startTime) : undefined,
          checkOutTime: markCheckedIn ? (a.endTime || schedule.endTime) : undefined
        };
      });

      const res = StorageService.assignScheduleSubstitute({
        schedule,
        date: selectedDate,
        assignees: finalAssignees,
        markCheckedIn,
        note,
        assignedBy: currentUser.fullName || currentUser.email
      });

      const summaryText = finalAssignees.map(a =>
        `${a.substituteName} (${a.substituteType === 'employee' ? 'Staff' : 'Teacher'}, ${a.allocatedHours}h${a.substituteType === 'employee' ? `, $${(a.manualGrossWage ?? 0).toFixed(2)}` : ''})`
      ).join(', ');

      showToast(
        isKhmer
          ? `បានចាត់តាំងអ្នកជំនួស ${finalAssignees.length} នាក់ (${summaryText}) ជំនួសគ្រូ ${schedule.teacherName} ដោយជោគជ័យ!`
          : `Assigned ${finalAssignees.length} substitute(s) (${summaryText}) to cover for absent teacher ${schedule.teacherName}!`,
        'success'
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign substitutes', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSubstitution = () => {
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
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
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
                {isKhmer
                  ? 'អាចចាត់តាំងគ្រូផ្សេង ឬបុគ្គលិក (អាចច្រើនជាង ១ នាក់ តាមម៉ោងកាលវិភាគ)'
                  : 'Assign to another teacher or to staff (more than 1 teacher or staff up to schedule hours)'}
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
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{schedule.startTime} – {schedule.endTime}</span>
                </span>
                <span className="block text-[10px] text-slate-500 font-bold mt-0.5">
                  {durationHours} {isKhmer ? 'ម៉ោងសរុប' : 'hrs total'}
                </span>
              </div>
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

            {/* Original Teacher info with Absent Flag ($0 wage) */}
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
                    {isKhmer ? 'គ្រូទទួលខុសត្រូវដើម (អវត្តមាន)' : 'Original Scheduled Teacher (Absent)'}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-600 text-white shadow-2xs shrink-0">
                {isKhmer ? 'អវត្តមាន ($0.00)' : 'Absent ($0.00 Wage)'}
              </span>
            </div>
          </div>

          {/* Allocation Progress & Summary Bar */}
          <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isKhmer ? 'ការបែងចែកម៉ោងបង្រៀនជំនួស' : 'Schedule Hours Allocation'}:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-700">
                  {totalAllocatedHours} / {durationHours} {isKhmer ? 'ម៉ោង' : 'hrs'}
                </span>
                {assignees.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSplitEqually}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer shadow-2xs transition-colors"
                    title={isKhmer ? 'បែងចែកម៉ោងស្មើគ្នា' : 'Split hours evenly among assignees'}
                  >
                    <Divide className="w-3 h-3" />
                    <span>{isKhmer ? 'ចែកស្មើ' : 'Split Evenly'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverAllocated
                    ? 'bg-rose-500'
                    : totalAllocatedHours === durationHours
                    ? 'bg-emerald-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(100, (totalAllocatedHours / durationHours) * 100)}%` }}
              />
            </div>

            {/* Status indicator note */}
            <div className="flex items-center justify-between text-[11px]">
              {isOverAllocated ? (
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {isKhmer
                    ? `លើស ${Math.round((totalAllocatedHours - durationHours) * 100) / 100} ម៉ោង (មិនត្រូវលើស ${durationHours} ម៉ោង)`
                    : `Over allocated by ${Math.round((totalAllocatedHours - durationHours) * 100) / 100} hrs (max ${durationHours} hrs)!`}
                </span>
              ) : isUnderAllocated ? (
                <span className="text-amber-700 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {isKhmer
                    ? `នៅសល់ ${remainingHours} ម៉ោង មិនទាន់បានបែងចែក`
                    : `${remainingHours} hrs unallocated (can assign another teacher or staff)`}
                </span>
              ) : (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {isKhmer ? 'បានបែងចែកគ្រប់ ១០០% នៃម៉ោងបង្រៀន' : '100% of schedule hours allocated'}
                </span>
              )}

              <span className="text-slate-500 text-[10px]">
                {assignees.length} {isKhmer ? 'អ្នកជំនួស' : assignees.length === 1 ? 'substitute' : 'substitutes'}
              </span>
            </div>
          </div>

          {/* Assignees List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>
                  {isKhmer ? 'បញ្ជីអ្នកបង្រៀនជំនួស (គ្រូ ឬបុគ្គលិក)' : 'Substitute Assignees (Teacher or Staff)'}
                </span>
              </label>

              {/* Add Another Substitute Button */}
              <button
                type="button"
                onClick={handleAddAssignee}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {isKhmer
                    ? '+ បន្ថែមអ្នកជំនួស (គ្រូ/បុគ្គលិក)'
                    : '+ Add Teacher / Staff'}
                </span>
              </button>
            </div>

            {/* List of Assignee Cards */}
            <div className="space-y-3">
              {assignees.map((assignee, index) => {
                const selectedTeacher = availableTeachers.find(t => t.id === assignee.personId);
                const teacherRate = selectedTeacher?.hourlyRate ?? schedule.hourlyRate ?? 20;
                const estimatedTeacherWage = (assignee.allocatedHours * teacherRate).toFixed(2);
                const selectedEmployee = employees.find(e => e.id === assignee.personId);

                return (
                  <div
                    key={assignee.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 relative hover:border-indigo-300 transition-all"
                  >
                    {/* Card Header: Assignee index & Role Type Selector */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateAssignee(assignee.id, { substituteType: 'teacher' })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              assignee.substituteType === 'teacher'
                                ? 'bg-white text-indigo-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{isKhmer ? 'គ្រូបង្រៀន' : 'Teacher'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAssignee(assignee.id, { substituteType: 'employee' })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              assignee.substituteType === 'employee'
                                ? 'bg-white text-purple-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <User className="w-3.5 h-3.5 text-purple-600" />
                            <span>{isKhmer ? 'បុគ្គលិក (Staff)' : 'Staff Member'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Remove Button (if more than 1 assignee) */}
                      {assignees.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignee(assignee.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={isKhmer ? 'លុបអ្នកជំនួសនេះ' : 'Remove this substitute'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Person Selector Dropdown */}
                    <div>
                      {assignee.substituteType === 'teacher' ? (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {isKhmer ? 'ជ្រើសរើសគ្រូបង្រៀនជំនួស' : 'Select Substitute Teacher'} *
                          </label>
                          <select
                            value={assignee.personId}
                            onChange={e => handleUpdateAssignee(assignee.id, { personId: e.target.value })}
                            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                      ) : (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {isKhmer ? 'ជ្រើសរើសបុគ្គលិកជំនួស (Staff)' : 'Select Staff Member (Employee)'} *
                          </label>
                          <select
                            value={assignee.personId}
                            onChange={e => handleUpdateAssignee(assignee.id, { personId: e.target.value })}
                            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                      )}
                    </div>

                    {/* Allocated Hours & Time Window */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {isKhmer ? 'ម៉ោងបង្រៀនដែលបែងចែក (Hours)' : 'Allocated Hours (up to schedule)'} *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.25"
                            min="0.25"
                            max={durationHours}
                            value={assignee.allocatedHours}
                            onChange={e =>
                              handleUpdateAssignee(assignee.id, {
                                allocatedHours: Math.max(0.25, parseFloat(e.target.value) || 0)
                              })
                            }
                            className="w-full pr-12 pl-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                            required
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                            {isKhmer ? 'ម៉ោង' : 'hrs'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          {assignee.startTime} – {assignee.endTime}
                        </span>
                      </div>

                      {/* Wage Configuration:
                          - If Teacher: hourly rate & calculated wage
                          - If Staff: manual gross wage, default 0
                      */}
                      <div>
                        {assignee.substituteType === 'teacher' ? (
                          <div className="p-2 bg-indigo-50/50 rounded-xl border border-indigo-100 h-full flex flex-col justify-center text-xs">
                            <span className="text-[10px] text-slate-500 font-semibold block">
                              {isKhmer ? 'ប្រាក់ឈ្នួលគ្រូតាមម៉ោង' : 'Teacher Hourly Rate'}: <b>${teacherRate.toFixed(2)}/hr</b>
                            </span>
                            <span className="text-xs font-extrabold text-indigo-700 font-mono mt-0.5 block">
                              {assignee.allocatedHours} hr × ${teacherRate} = ${estimatedTeacherWage}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-purple-600" />
                                <span>{isKhmer ? 'ប្រាក់ឈ្នួលកំណត់ដោយដៃ (Gross Wage)' : 'Manual Gross Wage ($)'}</span>
                              </label>
                              <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                {isKhmer ? 'លំនាំដើម $0' : 'Default $0'}
                              </span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={assignee.manualGrossWage}
                                onChange={e => handleUpdateAssignee(assignee.id, { manualGrossWage: e.target.value })}
                                placeholder="0.00"
                                className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold bg-purple-50/40 border border-purple-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                                required
                              />
                            </div>
                            <p className="text-[10px] text-purple-900 font-medium">
                              {isKhmer
                                ? 'សម្រាប់បុគ្គលិក ប្រាក់ឈ្នួលគឺកំណត់ដោយដៃ (លំនាំដើម $0)។'
                                : 'For staff, gross wage is manual (default is 0).'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mark Attendance Option */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={markCheckedIn}
                onChange={e => setMarkCheckedIn(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">
                {isKhmer ? 'ស្កេនវត្តមានចូលភ្លាមៗ (Mark Present for assigned substitutes)' : 'Record attendance as Present immediately for substitutes'}
              </span>
            </label>
            <p className="text-[11px] text-slate-500 pl-6">
              {isKhmer
                ? 'កំណត់ត្រាវត្តមាននឹងត្រូវបានបង្កើតដោយស្វ័យប្រវត្តិតាមចំណែកម៉ោងរបស់គ្រូ/បុគ្គលិកនីមួយៗ'
                : 'Attendance records will be created automatically for each substitute covering their allocated time slot.'}
            </p>
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

          {/* Existing substitution notice & revert option */}
          {existingSubstitution && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {isKhmer ? 'ម៉ោងនេះមានការចាត់តាំងជំនួសរួចហើយ' : 'Class currently has an active substitution'}: <b>{existingSubstitution.substituteName}</b>
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveSubstitution}
                className="px-2 py-1 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKhmer ? 'លុបចោល' : 'Revert'}</span>
              </button>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
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
                onClick={handleRemoveSubstitution}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                {isKhmer ? 'លុបការជំនួស' : 'Remove Substitution'}
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isOverAllocated}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? isKhmer ? 'កំពុងរក្សាទុក...' : 'Saving...'
                  : existingSubstitution
                  ? isKhmer ? 'កែប្រែការចាត់តាំង' : 'Update Substitutions'
                  : isKhmer ? `ចាត់តាំងជំនួស (${assignees.length} នាក់)` : `Confirm & Assign (${assignees.length} Substitutes)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
