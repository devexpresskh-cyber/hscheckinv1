import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, TeacherSubjectSchedule, Holiday, AttendanceRecord } from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  Palmtree,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Printer,
  X,
  Plus,
  DollarSign,
  Filter,
  User,
  Coffee,
  Calendar,
  Layers,
  LogIn,
  LogOut
} from 'lucide-react';

interface TeacherMonthlyCalendarProps {
  initialTeacher?: Teacher | null;
  isOpenModal?: boolean;
  onClose?: () => void;
  onAddScheduleForDay?: (dayOfWeek: number, teacherId: string) => void;
  onCheckIn?: (sub: TeacherSubjectSchedule) => void;
  onCheckOut?: (sub: TeacherSubjectSchedule) => void;
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_KM = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

const DAYS_HEADER_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_HEADER_KM = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍', 'អាទិត្យ'];

export const TeacherMonthlyCalendar: React.FC<TeacherMonthlyCalendarProps> = ({
  initialTeacher,
  isOpenModal = false,
  onClose,
  onAddScheduleForDay,
  onCheckIn,
  onCheckOut
}) => {
  const { isKhmer } = useLanguage();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();

  const isTeacherRole = currentUser.role === 'teacher';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    StorageService.getTeachers().filter(t => t.status === 'Active')
  );
  const [subjectSchedules, setSubjectSchedules] = useState<TeacherSubjectSchedule[]>(() =>
    StorageService.getSubjectSchedules()
  );
  const [holidays, setHolidays] = useState<Holiday[]>(() => StorageService.getHolidays());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());

  // Subscribe to storage
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setTeachers(StorageService.getTeachers().filter(t => t.status === 'Active'));
      setSubjectSchedules(StorageService.getSubjectSchedules());
      setHolidays(StorageService.getHolidays());
      setAttendance(StorageService.getAttendance());
    });
    return unsub;
  }, []);

  // Determine selected teacher
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (initialTeacher) return initialTeacher.id;
    if (currentUser.personId) return currentUser.personId;
    return teachers[0]?.id || '';
  });

  // Robustly resolve active teacher matching linked profile
  const activeTeacher = useMemo(() => {
    if (initialTeacher) return initialTeacher;
    if (!currentUser) return teachers[0] || null;

    if (currentUser.personId) {
      const byPersonId = teachers.find(
        t => t.id === currentUser.personId || t.teacherId?.toLowerCase() === currentUser.personId?.toLowerCase()
      );
      if (byPersonId) return byPersonId;
    }
    if (currentUser.id) {
      const byId = teachers.find(t => t.id === currentUser.id);
      if (byId) return byId;
    }
    if (currentUser.email) {
      const byEmail = teachers.find(
        t => t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (byEmail) return byEmail;
    }
    if (currentUser.fullName) {
      const byName = teachers.find(
        t => t.fullName.toLowerCase() === currentUser.fullName.toLowerCase()
      );
      if (byName) return byName;
    }

    return teachers.find(t => t.id === selectedTeacherId) || teachers[0] || null;
  }, [initialTeacher, currentUser, teachers, selectedTeacherId]);

  useEffect(() => {
    if (initialTeacher) {
      setSelectedTeacherId(initialTeacher.id);
    } else if (activeTeacher) {
      setSelectedTeacherId(activeTeacher.id);
    }
  }, [initialTeacher, activeTeacher]);

  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleTeacherCheckInAction = (cls: TeacherSubjectSchedule) => {
    if (onCheckIn) {
      onCheckIn(cls);
      return;
    }

    // Built-in AttendanceEngine fallback
    setIsActionLoading(true);
    const targetTeacherId = activeTeacher?.id || cls.teacherId;
    const targetTeacherName = activeTeacher?.fullName || cls.teacherName;
    const targetTeacherKhmer = activeTeacher?.khmerName || cls.khmerTeacherName;
    const targetDept = activeTeacher?.department || 'Academic & Curriculum';
    const curTime = AttendanceEngine.getCurrentTimeString();

    setTimeout(() => {
      const result = AttendanceEngine.processCheckIn({
        personId: targetTeacherId,
        personName: targetTeacherName,
        khmerName: targetTeacherKhmer,
        personType: 'teacher',
        department: targetDept,
        subjectScheduleId: cls.id,
        customTime: curTime,
        allowEarlyCheckInMinutes: 30,
        bypassScheduleWindow: !isTeacherRole || hasPermission('schedules.create') || hasPermission('attendance.edit')
      });

      setIsActionLoading(false);

      if (result.success) {
        confetti({ particleCount: 40, spread: 50 });
        showToast(
          isKhmer
            ? `ស្កេនចូលជោគជ័យសម្រាប់ ${targetTeacherName} - ${cls.khmerSubject || cls.subject}`
            : `Check-in successful for ${targetTeacherName} - ${cls.subject}`,
          'success'
        );
        setAttendance(StorageService.getAttendance());
      } else {
        showToast(result.message, 'error');
      }
    }, 200);
  };

  const handleTeacherCheckOutAction = (cls: TeacherSubjectSchedule) => {
    if (onCheckOut) {
      onCheckOut(cls);
      return;
    }

    // Built-in AttendanceEngine fallback
    setIsActionLoading(true);
    const targetTeacherId = activeTeacher?.id || cls.teacherId;
    const targetTeacherName = activeTeacher?.fullName || cls.teacherName;
    const curTime = AttendanceEngine.getCurrentTimeString();

    setTimeout(() => {
      const result = AttendanceEngine.processCheckOut({
        personId: targetTeacherId,
        personName: targetTeacherName,
        subjectScheduleId: cls.id,
        customTime: curTime
      });

      setIsActionLoading(false);

      if (result.success) {
        showToast(
          isKhmer
            ? `ស្កេនចេញជោគជ័យសម្រាប់ ${targetTeacherName} - ${cls.khmerSubject || cls.subject}`
            : result.message,
          'success'
        );
        setAttendance(StorageService.getAttendance());
      } else {
        showToast(result.message, 'error');
      }
    }, 200);
  };

  // Selected Day Details Modal
  const [selectedDayDetails, setSelectedDayDetails] = useState<{
    date: Date;
    dateStr: string;
    dayOfWeek: number;
    classes: TeacherSubjectSchedule[];
    holiday?: Holiday;
    attendance?: AttendanceRecord;
  } | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const n = new Date();
    setCurrentYear(n.getFullYear());
    setCurrentMonth(n.getMonth());
  };

  // Filter teacher's weekly subject schedules
  const teacherSchedules = useMemo(() => {
    if (!activeTeacher) return [];
    return subjectSchedules.filter(s => s.teacherId === activeTeacher.id && s.isActive);
  }, [subjectSchedules, activeTeacher]);

  // Calendar Day computation for current month
  // Monday is column 0, Sunday is column 6
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // getDay() gives 0 = Sun, 1 = Mon ... 6 = Sat
    // Convert so Monday = 0, Sunday = 6
    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDay = now.getDate();

    const formatLocalDate = (y: number, m: number, d: number) => {
      const targetDate = new Date(y, m, d);
      const ty = targetDate.getFullYear();
      const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const td = String(targetDate.getDate()).padStart(2, '0');
      return `${ty}-${tm}-${td}`;
    };

    const cells: Array<{
      dayNumber: number;
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
      classes: TeacherSubjectSchedule[];
      holiday?: Holiday;
      attendance?: AttendanceRecord;
    }> = [];

    // Previous month padding cells
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatLocalDate(currentYear, currentMonth - 1, dayNum);
      const dow = d.getDay();
      cells.push({
        dayNumber: dayNum,
        date: d,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        dayOfWeek: dow,
        classes: []
      });
    }

    // Current month cells
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = formatLocalDate(currentYear, currentMonth, day);
      const dow = d.getDay(); // 0 = Sun, 1 = Mon, 6 = Sat
      const isToday = currentYear === nowYear && currentMonth === nowMonth && day === nowDay;

      // Check holidays on this date
      const holiday = holidays.find(h => h.date === dateStr);

      // Match schedules for this day of week
      const matchingClasses = teacherSchedules
        .filter(s => {
          if (Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0) {
            return s.daysOfWeek.includes(dow);
          }
          return s.dayOfWeek === dow;
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Match attendance record for teacher on this date
      const att = attendance.find(
        a => a.personId === activeTeacher?.id && a.date === dateStr
      );

      cells.push({
        dayNumber: day,
        date: d,
        dateStr,
        isCurrentMonth: true,
        isToday,
        dayOfWeek: dow,
        classes: matchingClasses,
        holiday,
        attendance: att
      });
    }

    // Next month padding cells to complete 35 or 42 grid slots
    const totalCells = cells.length;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const dateStr = formatLocalDate(currentYear, currentMonth + 1, i);
      cells.push({
        dayNumber: i,
        date: d,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        dayOfWeek: d.getDay(),
        classes: []
      });
    }

    return cells;
  }, [currentYear, currentMonth, teacherSchedules, holidays, attendance, activeTeacher]);

  // Aggregate monthly statistics
  const monthlyStats = useMemo(() => {
    let totalScheduledSessions = 0;
    let totalMinutes = 0;
    let teachingDaysCount = 0;
    let holidaysCount = 0;
    let projectedWage = 0;

    const baseRate = activeTeacher?.hourlyRate ?? 20;

    calendarCells.forEach(cell => {
      if (cell.isCurrentMonth) {
        if (cell.holiday) {
          holidaysCount++;
        }
        if (cell.classes.length > 0) {
          teachingDaysCount++;
          totalScheduledSessions += cell.classes.length;

          cell.classes.forEach(c => {
            const startParts = c.startTime.split(':').map(Number);
            const endParts = c.endTime.split(':').map(Number);
            const durationMin = Math.max(0, (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]));
            totalMinutes += durationMin;

            const rate = c.hourlyRate ?? baseRate;
            projectedWage += (durationMin / 60) * rate;
          });
        }
      }
    });

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    return {
      totalScheduledSessions,
      totalHours,
      teachingDaysCount,
      holidaysCount,
      projectedWage: Math.round(projectedWage)
    };
  }, [calendarCells, activeTeacher]);

  const handlePrint = () => {
    window.print();
  };

  const content = (
    <div className="space-y-4">
      {/* Month & Teacher Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Month Navigator */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>
                {isKhmer ? MONTH_NAMES_KM[currentMonth] : MONTH_NAMES_EN[currentMonth]} {currentYear}
              </span>
            </h2>
            <button
              onClick={handleJumpToToday}
              className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
            >
              {isKhmer ? 'ថ្ងៃនេះ' : 'Today'}
            </button>
          </div>
        </div>

        {/* Right: Teacher Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Teacher Selector for Admin/Supervisor */}
          {!isTeacherRole && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <User className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="w-full sm:w-64 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.teacherId}) - {t.subject}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Teacher Badge if locked / role */}
          {isTeacherRole && activeTeacher && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>{activeTeacher.fullName} ({activeTeacher.teacherId})</span>
            </div>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer print:hidden"
            title="Print Monthly Schedule"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Statistics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium block">
            {isKhmer ? 'ថ្ងៃបង្រៀនក្នុងខែ' : 'Teaching Days'}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-indigo-700">{monthlyStats.teachingDaysCount}</span>
            <span className="text-xs text-slate-500">{isKhmer ? 'ថ្ងៃ' : 'days'}</span>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium block">
            {isKhmer ? 'វេនបង្រៀនសរុប' : 'Total Sessions'}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-slate-900">{monthlyStats.totalScheduledSessions}</span>
            <span className="text-xs text-slate-500">{isKhmer ? 'វេន' : 'classes'}</span>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium block">
            {isKhmer ? 'ម៉ោងបង្រៀនសរុប' : 'Total Hours'}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-emerald-700">{monthlyStats.totalHours}</span>
            <span className="text-xs text-slate-500">hrs</span>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium block">
            {isKhmer ? 'ប្រាក់ឈ្នួលប៉ាន់ស្មាន' : 'Projected Wage'}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-emerald-800">
              {activeTeacher?.currency === 'KHR' ? '៛' : '$'}{monthlyStats.projectedWage}
            </span>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-500 font-medium block">
            {isKhmer ? 'ថ្ងៃឈប់សម្រាក' : 'Public Holidays'}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-purple-700">{monthlyStats.holidaysCount}</span>
            <span className="text-xs text-slate-500">{isKhmer ? 'ថ្ងៃ' : 'holidays'}</span>
          </div>
        </div>
      </div>

      {/* Main 7-Column Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center font-bold text-xs text-slate-700 py-2.5">
          {DAYS_HEADER_EN.map((dayName, idx) => (
            <div key={dayName} className="flex flex-col items-center">
              <span className="text-slate-900">{isKhmer ? DAYS_HEADER_KM[idx] : dayName}</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {isKhmer ? dayName : DAYS_HEADER_KM[idx]}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 auto-rows-fr">
          {calendarCells.map((cell, idx) => {
            const hasClasses = cell.classes.length > 0;
            const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (cell.isCurrentMonth) {
                    setSelectedDayDetails({
                      date: cell.date,
                      dateStr: cell.dateStr,
                      dayOfWeek: cell.dayOfWeek,
                      classes: cell.classes,
                      holiday: cell.holiday,
                      attendance: cell.attendance
                    });
                  }
                }}
                className={`min-h-[105px] sm:min-h-[125px] p-2 flex flex-col justify-between transition-all cursor-pointer select-none group relative ${
                  !cell.isCurrentMonth
                    ? 'bg-slate-50/50 text-slate-300 opacity-60 cursor-default'
                    : cell.isToday
                    ? 'bg-indigo-50/90 hover:bg-indigo-100/90 ring-2 ring-indigo-600 ring-inset shadow-md z-10'
                    : isWeekend
                    ? 'bg-slate-50/20 hover:bg-slate-50'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                {/* Cell Header: Day Number + Today Badge + Holiday / Attendance Badges */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-6.5 h-6.5 flex items-center justify-center rounded-full text-xs font-black ${
                        cell.isToday
                          ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.isToday && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-2xs">
                        {isKhmer ? 'ថ្ងៃនេះ' : 'TODAY'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Holiday indicator */}
                    {cell.holiday && (
                      <span
                        className="p-1 rounded-md bg-purple-100 text-purple-700 shrink-0"
                        title={cell.holiday.name}
                      >
                        <Palmtree className="w-3 h-3" />
                      </span>
                    )}

                    {/* Attendance status */}
                    {cell.attendance && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          cell.attendance.status === 'Present'
                            ? 'bg-emerald-500'
                            : cell.attendance.status === 'Late'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        title={`Attendance: ${cell.attendance.status}`}
                      />
                    )}
                  </div>
                </div>

                {/* Holiday Label if present */}
                {cell.holiday && cell.isCurrentMonth && (
                  <div className="mb-1 px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-[10px] text-purple-800 font-bold truncate">
                    🏖️ {cell.holiday.khmerName || cell.holiday.name}
                  </div>
                )}

                {/* Scheduled Classes Chits */}
                <div className="space-y-1 flex-1">
                  {cell.classes.slice(0, 2).map((cls, cIdx) => (
                    <div
                      key={cls.id || cIdx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold truncate bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-colors"
                      title={`${cls.startTime} - ${cls.endTime} • ${cls.gradeClass} • ${cls.subject} (${cls.room})`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[9px] text-indigo-700 font-bold shrink-0">
                          {cls.startTime}
                        </span>
                        <span className="truncate">{cls.gradeClass || cls.subject}</span>
                      </div>
                    </div>
                  ))}

                  {cell.classes.length > 2 && (
                    <span className="text-[9px] font-bold text-slate-500 block px-1 text-center">
                      +{cell.classes.length - 2} {isKhmer ? 'វេនទៀត' : 'more'}
                    </span>
                  )}
                </div>

                {/* Cell Bottom: Session Count if any */}
                {cell.isCurrentMonth && hasClasses && (
                  <div className="text-[9px] font-bold text-slate-400 text-right mt-1">
                    {cell.classes.length} {isKhmer ? 'វេន' : 'sessions'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Modal */}
      {selectedDayDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Day Details Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-base">
                    {selectedDayDetails.date.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {activeTeacher?.fullName} • {selectedDayDetails.classes.length} {isKhmer ? 'វេនបង្រៀន' : 'sessions rostered'}
                </p>
              </div>

              <button
                onClick={() => setSelectedDayDetails(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Holiday Banner if day is holiday */}
            {selectedDayDetails.holiday && (
              <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2.5 text-xs text-purple-900">
                <Palmtree className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <span className="font-bold">{selectedDayDetails.holiday.name}</span>
                  {selectedDayDetails.holiday.khmerName && (
                    <span className="text-[11px] text-purple-700 block font-khmer">
                      {selectedDayDetails.holiday.khmerName}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Attendance Status Banner if available */}
            {selectedDayDetails.attendance && (
              <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">
                    {isKhmer ? 'វត្តមានកត់ត្រា' : 'Recorded Attendance'}:
                  </span>
                  <span className="font-bold text-emerald-700">
                    {selectedDayDetails.attendance.status}
                  </span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">
                  In: {selectedDayDetails.attendance.checkInTime || '--:--'} • Out: {selectedDayDetails.attendance.checkOutTime || '--:--'}
                </span>
              </div>
            )}

            {/* Class Sessions List */}
            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              {selectedDayDetails.classes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <Coffee className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">{isKhmer ? 'គ្មានម៉ោងបង្រៀននៅថ្ងៃនេះទេ' : 'No academic sessions scheduled for this day'}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isKhmer ? 'គ្រូសម្រាកពីការបង្រៀន ឬគ្មានវេនដែលបានកំណត់' : 'Faculty is scheduled off or has no assigned bell periods.'}
                  </p>
                </div>
              ) : (
                [...selectedDayDetails.classes]
                  .sort((a, b) => {
                    const pA = a.periodNumber || 0;
                    const pB = b.periodNumber || 0;
                    if (pA !== pB) return pA - pB;
                    return a.startTime.localeCompare(b.startTime);
                  })
                  .map((cls, idx) => (
                    <div
                      key={cls.id || idx}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:bg-white hover:border-indigo-300 transition-all shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-600 text-white shadow-2xs">
                              {isKhmer ? `ម៉ោងទី ${cls.periodNumber || idx + 1}` : cls.periodName || `P${cls.periodNumber || idx + 1}`}
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              {cls.subject}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              {cls.gradeClass}
                            </span>
                          </div>
                          {cls.khmerSubject && (
                            <span className="text-[11px] text-slate-500 font-khmer block mt-0.5">
                              {cls.khmerSubject}
                            </span>
                          )}
                        </div>

                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                          {cls.currency === 'KHR' ? '៛' : '$'}{(cls.hourlyRate ?? activeTeacher?.hourlyRate ?? 20).toFixed(0)}/hr
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1 font-mono font-semibold text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{cls.startTime} – {cls.endTime}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cls.room}</span>
                          </span>
                        </div>

                        {/* Attendance status badge / live indicator */}
                        {(() => {
                          const isToday = selectedDayDetails.dateStr === todayStr;
                          const isCurrentTeacherOwner = isTeacherRole && (
                            activeTeacher?.id === currentUser.personId ||
                            activeTeacher?.id === currentUser.id ||
                            (activeTeacher?.teacherId && currentUser.personId && activeTeacher.teacherId.toLowerCase() === currentUser.personId.toLowerCase()) ||
                            (activeTeacher?.fullName && currentUser.fullName && activeTeacher.fullName.toLowerCase() === currentUser.fullName.toLowerCase())
                          );

                          const isOwnerRecord = (a: AttendanceRecord) =>
                            a.personId === activeTeacher?.id ||
                            a.personId === cls.teacherId ||
                            (activeTeacher?.teacherId && a.personId.toLowerCase() === activeTeacher.teacherId.toLowerCase()) ||
                            (a.personName && activeTeacher?.fullName && a.personName.toLowerCase() === activeTeacher.fullName.toLowerCase());

                          const classAtt = AttendanceEngine.findRecordForSubjectSchedule(
                            cls,
                            attendance,
                            selectedDayDetails.dateStr,
                            activeTeacher ? [activeTeacher] : undefined
                          );

                          if (classAtt) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                                  classAtt.status === 'Late'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>
                                    {classAtt.checkInTime ? `In: ${classAtt.checkInTime}` : classAtt.status}
                                    {classAtt.checkOutTime ? ` • Out: ${classAtt.checkOutTime}` : ''}
                                  </span>
                                </span>

                                {isToday && !classAtt.checkOutTime && isCurrentTeacherOwner && (
                                  <button
                                    type="button"
                                    onClick={() => handleTeacherCheckOutAction(cls)}
                                    disabled={isActionLoading}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow-xs transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    <LogOut className="w-3 h-3" />
                                    <span>{isKhmer ? 'ស្កេនចេញ' : 'Check Out'}</span>
                                  </button>
                                )}
                              </div>
                            );
                          }

                          // Only allow teacher who owns this schedule to check in! Do not allow admin to check-in teacher's schedule
                          if (isToday && isCurrentTeacherOwner) {
                            return (
                              <button
                                type="button"
                                onClick={() => handleTeacherCheckInAction(cls)}
                                disabled={isActionLoading}
                                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-xs shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>{isKhmer ? 'ស្កេនវត្តមានចូល (Check In)' : 'Check In'}</span>
                              </button>
                            );
                          }

                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{isKhmer ? 'រង់ចាំស្កេន' : 'Scheduled'}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {hasPermission('schedules.create') && onAddScheduleForDay && (
                <button
                  onClick={() => {
                    const dow = selectedDayDetails.dayOfWeek;
                    const tid = activeTeacher?.id || '';
                    setSelectedDayDetails(null);
                    onAddScheduleForDay(dow, tid);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isKhmer ? 'បន្ថែមវេនបង្រៀនថ្ងៃនេះ' : 'Add Class Session'}</span>
                </button>
              )}

              <button
                onClick={() => setSelectedDayDetails(null)}
                className="ml-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {isKhmer ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isOpenModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
        <div className="bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-base">
                  {isKhmer ? 'កាលវិភាគបង្រៀនប្រចាំខែ (Monthly Calendar Schedule)' : 'Faculty Monthly Calendar Schedule'}
                </h3>
                <p className="text-xs text-slate-300">
                  {activeTeacher?.fullName} ({activeTeacher?.teacherId}) • {activeTeacher?.subject}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
};
