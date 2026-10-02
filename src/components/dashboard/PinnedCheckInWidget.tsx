import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { Employee, Teacher, AttendanceRecord, TeacherSubjectSchedule, Schedule } from '../../types/index.ts';
import confetti from 'canvas-confetti';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  MapPin,
  Calendar,
  Sparkles,
  Users,
  GraduationCap,
  ShieldCheck,
  ChevronDown,
  Pin,
  Sun,
  Moon,
  ClockAlert
} from 'lucide-react';

interface PinnedCheckInWidgetProps {
  onOpenCheckIn?: () => void;
}

export const PinnedCheckInWidget: React.FC<PinnedCheckInWidgetProps> = ({ onOpenCheckIn }) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  const [tick, setTick] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Storage data subscriptions
  const [employees, setEmployees] = useState<Employee[]>(() =>
    StorageService.getEmployees().filter(e => e.status === 'Active')
  );
  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    StorageService.getTeachers().filter(t => t.status === 'Active')
  );
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [schedules, setSchedules] = useState<Schedule[]>(() => StorageService.getSchedules());
  const [subjectSchedules, setSubjectSchedules] = useState<TeacherSubjectSchedule[]>(() =>
    StorageService.getSubjectSchedules()
  );
  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSystemSettings());

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setEmployees(StorageService.getEmployees().filter(e => e.status === 'Active'));
      setTeachers(StorageService.getTeachers().filter(t => t.status === 'Active'));
      setAllAttendance(StorageService.getAttendance());
      setSchedules(StorageService.getSchedules());
      setSubjectSchedules(StorageService.getSubjectSchedules());
      setSystemSettings(StorageService.getSystemSettings());
    });
    return unsub;
  }, []);

  // Live second clock ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDayIndex = useMemo(() => new Date().getDay(), []);
  const currentTimeStr = useMemo(() => AttendanceEngine.getCurrentTimeString(), [tick]);
  const curMins = useMemo(() => AttendanceEngine.timeToMinutes(currentTimeStr), [currentTimeStr]);

  // Current formatted date string
  const formattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [isKhmer]);

  // Determine active target staff for checkin
  // If user is employee or teacher, locked to their profile.
  // If user is admin/manager, allow selecting any employee/teacher from dropdown.
  const isEmployeeRole = currentUser?.role === 'employee';
  const isTeacherRole = currentUser?.role === 'teacher';

  const defaultStaffId = useMemo(() => {
    if (isEmployeeRole) {
      const match = employees.find(
        e => e.id === currentUser?.personId || e.email?.toLowerCase() === currentUser?.email?.toLowerCase()
      );
      return match ? match.id : (employees[0]?.id || '');
    }
    if (isTeacherRole) {
      const match = teachers.find(
        t => t.id === currentUser?.personId || t.email?.toLowerCase() === currentUser?.email?.toLowerCase()
      );
      return match ? match.id : (teachers[0]?.id || '');
    }
    return employees[0]?.id || '';
  }, [currentUser, isEmployeeRole, isTeacherRole, employees, teachers]);

  const [selectedStaffId, setSelectedStaffId] = useState<string>(defaultStaffId);

  useEffect(() => {
    if (defaultStaffId && !selectedStaffId) {
      setSelectedStaffId(defaultStaffId);
    }
  }, [defaultStaffId, selectedStaffId]);

  // Active selected employee or teacher
  const selectedEmployee = employees.find(e => e.id === selectedStaffId);
  const selectedTeacher = teachers.find(t => t.id === selectedStaffId);
  const isTargetTeacher = Boolean(selectedTeacher && (isTeacherRole || !selectedEmployee));

  // Assigned schedule for employee
  const employeeSchedule = useMemo(() => {
    if (!selectedEmployee) return schedules[0] || null;
    return (
      schedules.find(s => s.id === selectedEmployee.assignedScheduleId) ||
      schedules.find(s => s.targetType === 'Standard') ||
      schedules[0] ||
      null
    );
  }, [selectedEmployee, schedules]);

  const morningStart = employeeSchedule?.startTime || '08:00';
  const morningEnd = employeeSchedule?.endTime || '12:00';
  const eveningStart = employeeSchedule?.afternoonStartTime || '13:30';
  const eveningEnd = employeeSchedule?.afternoonEndTime || '17:30';

  // Find today's attendance records for the selected employee
  const morningRecord = useMemo(() => {
    if (!selectedEmployee) return undefined;
    return allAttendance.find(
      a =>
        a.personId === selectedEmployee.id &&
        a.date === todayStr &&
        !a.subjectScheduleId &&
        (a.session === 'morning' || (!a.session && !a.scheduleName?.includes('Evening')))
    );
  }, [selectedEmployee, allAttendance, todayStr]);

  const eveningRecord = useMemo(() => {
    if (!selectedEmployee) return undefined;
    return allAttendance.find(
      a =>
        a.personId === selectedEmployee.id &&
        a.date === todayStr &&
        !a.subjectScheduleId &&
        (a.session === 'afternoon' || a.session === 'evening' || a.scheduleName?.includes('Evening'))
    );
  }, [selectedEmployee, allAttendance, todayStr]);

  // Find active teacher subject schedule if targeting a teacher
  const activeTeacherSubject = useMemo(() => {
    if (!selectedTeacher) return null;
    const teacherClasses = subjectSchedules.filter(s => {
      if (!s.isActive || s.teacherId !== selectedTeacher.id) return false;
      if (s.daysOfWeek && s.daysOfWeek.length > 0) {
        return s.daysOfWeek.includes(todayDayIndex);
      }
      return s.dayOfWeek === todayDayIndex;
    });

    const active = teacherClasses.find(s => {
      const sStart = AttendanceEngine.timeToMinutes(s.startTime);
      const sEnd = AttendanceEngine.timeToMinutes(s.endTime);
      return curMins >= Math.max(0, sStart - 30) && curMins < sEnd;
    });

    return active || teacherClasses[0] || null;
  }, [selectedTeacher, subjectSchedules, todayDayIndex, curMins]);

  const teacherRecord = useMemo(() => {
    if (!selectedTeacher || !activeTeacherSubject) return undefined;
    return allAttendance.find(
      a =>
        a.personId === selectedTeacher.id &&
        a.date === todayStr &&
        (a.subjectScheduleId === activeTeacherSubject.id || a.scheduleId === activeTeacherSubject.id)
    );
  }, [selectedTeacher, activeTeacherSubject, allAttendance, todayStr]);

  // Handle Employee Check-in for Morning or Evening Shift
  // Requirements: Employee can check in before and after shifttime!
  const handleEmployeeCheckIn = (shift: 'morning' | 'evening') => {
    if (!selectedEmployee || isSubmitting) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const result = AttendanceEngine.processCheckIn({
        personId: selectedEmployee.id,
        personName: selectedEmployee.fullName,
        khmerName: selectedEmployee.khmerName,
        personType: 'employee',
        department: selectedEmployee.department,
        scheduleId: selectedEmployee.assignedScheduleId,
        shiftType: shift,
        session: shift === 'evening' ? 'afternoon' : 'morning',
        customTime: currentTimeStr,
        latitude: systemSettings.defaultLocationLatitude,
        longitude: systemSettings.defaultLocationLongitude
      });

      setIsSubmitting(false);

      if (result.success) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 }
        });
        showToast(
          isKhmer
            ? `បានស្កេនចូល ${shift === 'evening' ? 'វេនល្ងាច' : 'វេនព្រឹក'} ជោគជ័យ៖ ${selectedEmployee.khmerName || selectedEmployee.fullName} (${result.record?.status === 'Late' ? 'មកយឺត' : 'ទាន់ម៉ោង'})`
            : `Checked in successfully for ${shift === 'evening' ? 'Evening' : 'Morning'} shift: ${selectedEmployee.fullName} (${result.record?.status === 'Late' ? 'Late' : 'On Time'})`,
          result.record?.status === 'Late' ? 'warning' : 'success'
        );
      } else {
        showToast(result.message, 'error');
      }
    }, 250);
  };

  // Handle Employee Check-out for Morning or Evening Shift
  // Requirements: Employee can check out before and after shifttime!
  const handleEmployeeCheckOut = (shift: 'morning' | 'evening') => {
    if (!selectedEmployee || isSubmitting) return;

    const recordToClose = shift === 'morning' ? morningRecord : eveningRecord;

    setIsSubmitting(true);
    setTimeout(() => {
      const result = AttendanceEngine.processCheckOut({
        personId: selectedEmployee.id,
        personName: selectedEmployee.fullName,
        shiftType: shift,
        session: shift === 'evening' ? 'afternoon' : 'morning',
        attendanceRecordId: recordToClose?.id,
        customTime: currentTimeStr
      });

      setIsSubmitting(false);

      if (result.success) {
        showToast(
          isKhmer
            ? `បានស្កេនចេញ ${shift === 'evening' ? 'វេនល្ងាច' : 'វេនព្រឹក'} ជោគជ័យ៖ ${selectedEmployee.khmerName || selectedEmployee.fullName} ម៉ោង ${result.record?.checkOutTime || currentTimeStr}`
            : `Checked out successfully from ${shift === 'evening' ? 'Evening' : 'Morning'} shift: ${selectedEmployee.fullName} at ${result.record?.checkOutTime || currentTimeStr}`,
          'success'
        );
      } else {
        showToast(result.message, 'error');
      }
    }, 250);
  };

  // Handle Teacher Check-in / Check-out
  const handleTeacherCheckIn = () => {
    if (!selectedTeacher || !activeTeacherSubject || isSubmitting) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const result = AttendanceEngine.processCheckIn({
        personId: selectedTeacher.id,
        personName: selectedTeacher.fullName,
        khmerName: selectedTeacher.khmerName,
        personType: 'teacher',
        department: selectedTeacher.department,
        scheduleId: selectedTeacher.assignedScheduleId,
        subjectScheduleId: activeTeacherSubject.id,
        customTime: currentTimeStr,
        latitude: systemSettings.defaultLocationLatitude,
        longitude: systemSettings.defaultLocationLongitude
      });

      setIsSubmitting(false);

      if (result.success) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 }
        });
        showToast(
          isKhmer
            ? `ស្កេនចូលជោគជ័យ៖ ${selectedTeacher.khmerName || selectedTeacher.fullName} [${activeTeacherSubject.khmerSubject || activeTeacherSubject.subject}]`
            : result.message,
          'success'
        );
      } else {
        showToast(result.message, 'error');
      }
    }, 250);
  };

  const handleTeacherCheckOut = () => {
    if (!selectedTeacher || !activeTeacherSubject || isSubmitting) return;

    const curM = AttendanceEngine.timeToMinutes(currentTimeStr);
    const endM = AttendanceEngine.timeToMinutes(activeTeacherSubject.endTime);
    const isAutoSet = curM >= endM;

    setIsSubmitting(true);
    setTimeout(() => {
      const result = AttendanceEngine.processCheckOut({
        personId: selectedTeacher.id,
        personName: selectedTeacher.fullName,
        subjectScheduleId: activeTeacherSubject.id,
        customTime: isAutoSet ? activeTeacherSubject.endTime : currentTimeStr,
        autoSetToEndOfSchedule: isAutoSet
      });

      setIsSubmitting(false);

      if (result.success) {
        showToast(
          isKhmer
            ? `ស្កេនចេញជោគជ័យ៖ ${selectedTeacher.khmerName || selectedTeacher.fullName}`
            : result.message,
          'success'
        );
      } else {
        showToast(result.message, 'error');
      }
    }, 250);
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-indigo-200/80 shadow-md p-4 sm:p-5 mb-5 relative overflow-hidden transition-all">
      {/* Decorative top accent strip */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />

      {/* Header Row: Pinned Tag + Staff Selector + Live Clock */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        
        {/* Left: Pinned Title & Live Clock */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black shrink-0">
            <Pin className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600 -rotate-45" />
            <span>{isKhmer ? 'ស្ថានីយស្កេនវត្តមាន (PINNED)' : 'PINNED CHECK-IN / CHECK-OUT'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 shrink-0">
            <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse shrink-0" />
            <span className="font-mono text-slate-900 font-extrabold text-sm tracking-tight">{currentTimeStr}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 text-[11px]">{formattedDate}</span>
          </div>

          {/* GPS Verified Status Badge */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isKhmer ? 'ទីតាំង GPS បរិវេណសាលា' : 'Campus Geofence Verified'}</span>
          </div>
        </div>

        {/* Right: Staff Switcher (for Admin/Manager) & Open Kiosk Button */}
        <div className="flex flex-wrap items-center gap-2">
          {!isEmployeeRole && !isTeacherRole && (
            <div className="relative min-w-[200px]">
              <select
                value={selectedStaffId}
                onChange={e => setSelectedStaffId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold py-1.5 px-3 pr-8 rounded-xl appearance-none cursor-pointer focus:outline-indigo-500"
              >
                <optgroup label={isKhmer ? 'បុគ្គលិកទូទៅ (Employees)' : 'Employees'}>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} {e.khmerName ? `(${e.khmerName})` : ''} • {e.department}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={isKhmer ? 'គ្រូបង្រៀន (Faculty Teachers)' : 'Faculty Teachers'}>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.khmerName ? `(${t.khmerName})` : ''} • {t.department}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {onOpenCheckIn && (
            <button
              type="button"
              onClick={onOpenCheckIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              title={isKhmer ? 'បើកផ្ទាំងស្កេនកាមេរ៉ា / QR / PIN ពេញលេញ' : 'Open Full QR / Camera / PIN Kiosk'}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>{isKhmer ? 'ម៉ាស៊ីនស្កេនពេញលេញ' : 'Full Kiosk'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Action Area */}
      {!isTargetTeacher && selectedEmployee ? (
        /* ================= EMPLOYEE TWO-SHIFT STATION ================= */
        <div className="pt-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">
                {selectedEmployee.fullName} {selectedEmployee.khmerName ? `(${selectedEmployee.khmerName})` : ''}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                {selectedEmployee.department} • {selectedEmployee.position}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {isKhmer
                ? 'បុគ្គលិកត្រូវស្កេនចូល/ចេញទាំង ២ វេន (វេនព្រឹក និង វេនល្ងាច) • អាចស្កេនមុន និងក្រោយម៉ោងវេនបាន'
                : 'Must clock in/out both shifts (Morning & Evening) • Early & late check-in allowed'}
            </div>
          </div>

          {/* Grid of Two Shifts: Morning and Evening */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            
            {/* 1. MORNING SHIFT CARD */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-white transition-all shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Sun className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block">
                        {isKhmer ? 'វេនព្រឹក (Morning Shift)' : 'Morning Shift'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 font-mono">
                        {morningStart} — {morningEnd}
                      </span>
                    </div>
                  </div>

                  {/* Morning Status Badge */}
                  <div>
                    {morningRecord?.checkInTime && morningRecord?.checkOutTime ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{isKhmer ? 'បានបញ្ចប់' : 'Completed'}</span>
                      </span>
                    ) : morningRecord?.checkInTime ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{isKhmer ? 'កំពុងបំពេញការងារ' : 'In Shift'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                        {isKhmer ? 'មិនទាន់ស្កេន' : 'Not Checked In'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex items-center justify-between text-xs py-1 text-slate-600 bg-white px-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold">{isKhmer ? 'ចូល៖' : 'In:'}</span>
                    <span className="font-mono font-bold text-slate-800">
                      {morningRecord?.checkInTime || '—'}
                    </span>
                    {morningRecord?.lateMinutes && morningRecord.lateMinutes > 0 ? (
                      <span className="text-[10px] text-rose-600 font-bold">
                        (+{morningRecord.lateMinutes}m)
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold">{isKhmer ? 'ចេញ៖' : 'Out:'}</span>
                    <span className="font-mono font-bold text-slate-800">
                      {morningRecord?.checkOutTime || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Morning Shift */}
              <div className="flex items-center gap-2 pt-1">
                {!morningRecord?.checkInTime ? (
                  <button
                    type="button"
                    onClick={() => handleEmployeeCheckIn('morning')}
                    disabled={isSubmitting}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span>{isKhmer ? 'ស្កេនចូល វេនព្រឹក' : 'Check In (Morning)'}</span>
                  </button>
                ) : !morningRecord?.checkOutTime ? (
                  <button
                    type="button"
                    onClick={() => handleEmployeeCheckOut('morning')}
                    disabled={isSubmitting}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>{isKhmer ? 'ស្កេនចេញ វេនព្រឹក' : 'Check Out (Morning)'}</span>
                  </button>
                ) : (
                  <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isKhmer ? 'វេនព្រឹកបានកត់ត្រារួចរាល់' : 'Morning Shift Done'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. EVENING SHIFT CARD */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-white transition-all shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                      <Moon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block">
                        {isKhmer ? 'វេនល្ងាច (Evening Shift)' : 'Evening Shift'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 font-mono">
                        {eveningStart} — {eveningEnd}
                      </span>
                    </div>
                  </div>

                  {/* Evening Status Badge */}
                  <div>
                    {eveningRecord?.checkInTime && eveningRecord?.checkOutTime ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{isKhmer ? 'បានបញ្ចប់' : 'Completed'}</span>
                      </span>
                    ) : eveningRecord?.checkInTime ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{isKhmer ? 'កំពុងបំពេញការងារ' : 'In Shift'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                        {isKhmer ? 'មិនទាន់ស្កេន' : 'Not Checked In'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex items-center justify-between text-xs py-1 text-slate-600 bg-white px-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold">{isKhmer ? 'ចូល៖' : 'In:'}</span>
                    <span className="font-mono font-bold text-slate-800">
                      {eveningRecord?.checkInTime || '—'}
                    </span>
                    {eveningRecord?.lateMinutes && eveningRecord.lateMinutes > 0 ? (
                      <span className="text-[10px] text-rose-600 font-bold">
                        (+{eveningRecord.lateMinutes}m)
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 font-semibold">{isKhmer ? 'ចេញ៖' : 'Out:'}</span>
                    <span className="font-mono font-bold text-slate-800">
                      {eveningRecord?.checkOutTime || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Evening Shift */}
              <div className="flex items-center gap-2 pt-1">
                {!eveningRecord?.checkInTime ? (
                  <button
                    type="button"
                    onClick={() => handleEmployeeCheckIn('evening')}
                    disabled={isSubmitting}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span>{isKhmer ? 'ស្កេនចូល វេនល្ងាច' : 'Check In (Evening)'}</span>
                  </button>
                ) : !eveningRecord?.checkOutTime ? (
                  <button
                    type="button"
                    onClick={() => handleEmployeeCheckOut('evening')}
                    disabled={isSubmitting}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>{isKhmer ? 'ស្កេនចេញ វេនល្ងាច' : 'Check Out (Evening)'}</span>
                  </button>
                ) : (
                  <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isKhmer ? 'វេនល្ងាចបានកត់ត្រារួចរាល់' : 'Evening Shift Done'}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : isTargetTeacher && selectedTeacher ? (
        /* ================= TEACHER CLASS SESSION STATION ================= */
        <div className="pt-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">
                {selectedTeacher.fullName} {selectedTeacher.khmerName ? `(${selectedTeacher.khmerName})` : ''}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                {selectedTeacher.department} • {selectedTeacher.subject}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {isKhmer
                ? 'ស្កេនវត្តមានតាមកាលវិភាគបង្រៀនជាក់ស្តែង • ហាមស្កេនចូលពេលហួសម៉ោងបញ្ចប់'
                : 'Teachers check in per subject schedule period'}
            </div>
          </div>

          {activeTeacherSubject ? (
            <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">
                      {activeTeacherSubject.khmerSubject || activeTeacherSubject.subject}
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                      {activeTeacherSubject.startTime} — {activeTeacherSubject.endTime}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {activeTeacherSubject.periodName} • {activeTeacherSubject.gradeClass} ({activeTeacherSubject.room})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!teacherRecord?.checkInTime ? (
                  <button
                    type="button"
                    onClick={handleTeacherCheckIn}
                    disabled={isSubmitting}
                    className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'ស្កេនចូលម៉ោងបង្រៀន' : 'Check In Class'}</span>
                  </button>
                ) : !teacherRecord?.checkOutTime ? (
                  <button
                    type="button"
                    onClick={handleTeacherCheckOut}
                    disabled={isSubmitting}
                    className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'ស្កេនចេញ' : 'Check Out'}</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isKhmer ? 'បានបញ្ចប់' : 'Completed'}</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-center">
              {isKhmer ? 'គ្មានកាលវិភាគបង្រៀននៅពេលនេះទេ' : 'No active class schedule at present time'}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
