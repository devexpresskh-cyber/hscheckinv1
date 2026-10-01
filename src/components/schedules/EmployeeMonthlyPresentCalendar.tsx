import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { Employee, Schedule, Holiday, AttendanceRecord, LeaveRequest } from '../../types/index.ts';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Palmtree,
  Printer,
  X,
  LogIn,
  LogOut,
  CalendarCheck,
  Building,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface EmployeeMonthlyPresentCalendarProps {
  initialEmployee?: Employee | null;
  onNavigateToHistory?: () => void;
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

export const EmployeeMonthlyPresentCalendar: React.FC<EmployeeMonthlyPresentCalendarProps> = ({
  initialEmployee,
  onNavigateToHistory
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  const isEmployeeRole = currentUser.role === 'employee';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  // Storage data
  const [employees, setEmployees] = useState<Employee[]>(() => StorageService.getEmployees());
  const [schedules, setSchedules] = useState<Schedule[]>(() => StorageService.getSchedules());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [holidays, setHolidays] = useState<Holiday[]>(() => StorageService.getHolidays());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => StorageService.getLeaveRequests());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setEmployees(StorageService.getEmployees());
      setSchedules(StorageService.getSchedules());
      setAttendance(StorageService.getAttendance());
      setHolidays(StorageService.getHolidays());
      setLeaveRequests(StorageService.getLeaveRequests());
    });
    return unsub;
  }, []);

  // Determine active employee profile
  const activeEmployee = useMemo(() => {
    if (initialEmployee) return initialEmployee;
    if (!currentUser) return null;

    return (
      employees.find(
        e =>
          (currentUser.personId && (e.id === currentUser.personId || e.employeeId?.toLowerCase() === currentUser.personId?.toLowerCase())) ||
          e.id === currentUser.id ||
          (e.email && currentUser.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (e.employeeId && currentUser.email && currentUser.email.toLowerCase().includes(e.employeeId.toLowerCase())) ||
          e.fullName.toLowerCase() === currentUser.fullName.toLowerCase()
      ) || employees[0] || null
    );
  }, [initialEmployee, currentUser, employees]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    return activeEmployee?.id || employees[0]?.id || '';
  });

  useEffect(() => {
    if (activeEmployee) {
      setSelectedEmployeeId(activeEmployee.id);
    }
  }, [activeEmployee]);

  const currentDisplayEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId) || activeEmployee || null;
  }, [employees, selectedEmployeeId, activeEmployee]);

  // Assigned schedule for employee
  const assignedSchedule = useMemo(() => {
    if (currentDisplayEmployee?.assignedScheduleId) {
      const sch = schedules.find(s => s.id === currentDisplayEmployee.assignedScheduleId);
      if (sch) return sch;
    }
    const deptSch = schedules.find(
      s => s.department?.toLowerCase() === currentDisplayEmployee?.department?.toLowerCase()
    );
    if (deptSch) return deptSch;

    return (
      schedules[0] || {
        id: 'sch-default',
        name: 'Standard Staff Shift',
        khmerName: 'វេនការងារបុគ្គលិកស្តង់ដារ',
        startTime: '07:30',
        endTime: '17:00',
        breakStart: '11:30',
        breakEnd: '13:00',
        gracePeriodMinutes: 15,
        daysOfWeek: [1, 2, 3, 4, 5, 6],
        location: 'Main Campus',
        department: currentDisplayEmployee?.department || 'Administration'
      }
    );
  }, [currentDisplayEmployee, schedules]);

  // Selected Day Details Modal
  const [selectedDayDetails, setSelectedDayDetails] = useState<{
    date: Date;
    dateStr: string;
    dayOfWeek: number;
    attendance?: AttendanceRecord | null;
    holiday?: Holiday | null;
    leave?: LeaveRequest | null;
    isWorkingDay: boolean;
    isToday: boolean;
    isPast: boolean;
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

  // Helper to check if a date is within an approved leave request
  const getLeaveForDate = (dateStr: string, empId: string | undefined): LeaveRequest | undefined => {
    if (!empId) return undefined;
    return leaveRequests.find(l => {
      if (l.status !== 'Approved') return false;
      const isPersonMatch = l.personId === empId || (currentDisplayEmployee && l.personName.toLowerCase() === currentDisplayEmployee.fullName.toLowerCase());
      if (!isPersonMatch) return false;
      return dateStr >= l.startDate && dateStr <= (l.endDate || l.startDate);
    });
  };

  // Calendar Day computation for current month (Mon = col 0, Sun = col 6)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // getDay() gives 0 = Sun, 1 = Mon ... 6 = Sat
    // Convert so Monday = 0, Sunday = 6
    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const workingDays = assignedSchedule.daysOfWeek || [1, 2, 3, 4, 5, 6];

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
    const todayStr = formatLocalDate(nowYear, nowMonth, nowDay);

    interface CalendarDayCell {
      dayNumber: number;
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isPast: boolean;
      isFuture: boolean;
      dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
      isWorkingDay: boolean;
      attendance?: AttendanceRecord | null;
      holiday?: Holiday | null;
      leave?: LeaveRequest | null;
      computedStatus: 'Present' | 'Late' | 'Absent' | 'On Duty' | 'Leave' | 'Holiday' | 'Scheduled' | 'Off Day';
    }

    const cells: CalendarDayCell[] = [];

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
        isPast: dateStr < todayStr,
        isFuture: dateStr > todayStr,
        dayOfWeek: dow,
        isWorkingDay: false,
        computedStatus: 'Off Day'
      });
    }

    // Current month cells
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = formatLocalDate(currentYear, currentMonth, day);
      const dow = d.getDay(); // 0 = Sun, 1 = Mon, 6 = Sat

      const isToday = currentYear === nowYear && currentMonth === nowMonth && day === nowDay;
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;
      const isWorkingDay = workingDays.includes(dow);

      // Match holiday
      const holiday = holidays.find(h => {
        if (h.date === dateStr) return true;
        if (h.endDate && dateStr >= h.date && dateStr <= h.endDate) return true;
        return false;
      }) || null;

      // Match approved leave
      const leave = getLeaveForDate(dateStr, currentDisplayEmployee?.id) || null;

      // Match attendance record
      const att = attendance.find(a => {
        if (a.date !== dateStr) return false;
        return (
          a.personId === currentDisplayEmployee?.id ||
          (currentDisplayEmployee?.employeeId && a.personId === currentDisplayEmployee.employeeId) ||
          (currentDisplayEmployee && a.personName.toLowerCase() === currentDisplayEmployee.fullName.toLowerCase())
        );
      }) || null;

      // Determine computed presence status
      let computedStatus: CalendarDayCell['computedStatus'] = 'Off Day';

      if (holiday) {
        computedStatus = 'Holiday';
      } else if (leave) {
        computedStatus = 'Leave';
      } else if (att) {
        if (att.checkInTime && !att.checkOutTime && isToday) {
          computedStatus = 'On Duty';
        } else if (att.status === 'Late' || (att.lateMinutes && att.lateMinutes > 0)) {
          computedStatus = 'Late';
        } else if (att.status === 'Absent') {
          computedStatus = 'Absent';
        } else {
          computedStatus = 'Present';
        }
      } else if (isWorkingDay) {
        if (isPast) {
          computedStatus = 'Absent'; // Working day passed without check-in
        } else if (isToday) {
          computedStatus = 'Scheduled'; // Waiting for check-in today
        } else {
          computedStatus = 'Scheduled'; // Future working shift
        }
      } else {
        computedStatus = 'Off Day';
      }

      cells.push({
        dayNumber: day,
        date: d,
        dateStr,
        isCurrentMonth: true,
        isToday,
        isPast,
        isFuture,
        dayOfWeek: dow,
        isWorkingDay,
        attendance: att,
        holiday,
        leave,
        computedStatus
      });
    }

    // Next month padding cells to complete 35 or 42 grid slots
    const totalCells = cells.length;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const dateStr = d.toISOString().split('T')[0];
      cells.push({
        dayNumber: i,
        date: d,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        isPast: dateStr < todayStr,
        isFuture: dateStr > todayStr,
        dayOfWeek: d.getDay(),
        isWorkingDay: false,
        computedStatus: 'Off Day'
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayStr, assignedSchedule, holidays, attendance, leaveRequests, currentDisplayEmployee]);

  // Aggregate monthly statistics
  const monthlyStats = useMemo(() => {
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let onDutyDays = 0;
    let leaveDays = 0;
    let holidayDays = 0;
    let scheduledWorkDays = 0;
    let totalWorkedMinutes = 0;

    calendarCells.forEach(cell => {
      if (!cell.isCurrentMonth) return;

      if (cell.isWorkingDay) {
        scheduledWorkDays++;
      }

      switch (cell.computedStatus) {
        case 'Present':
          presentDays++;
          break;
        case 'Late':
          lateDays++;
          presentDays++; // Counted as attended
          break;
        case 'On Duty':
          onDutyDays++;
          presentDays++;
          break;
        case 'Absent':
          absentDays++;
          break;
        case 'Leave':
          leaveDays++;
          break;
        case 'Holiday':
          holidayDays++;
          break;
      }

      // Calculate worked minutes if attendance record exists
      if (cell.attendance) {
        if (cell.attendance.checkInTime && cell.attendance.checkOutTime) {
          const inMins = AttendanceEngine.timeToMinutes(cell.attendance.checkInTime);
          const outMins = AttendanceEngine.timeToMinutes(cell.attendance.checkOutTime);
          if (outMins > inMins) {
            totalWorkedMinutes += (outMins - inMins);
          }
        } else if (cell.attendance.checkInTime) {
          // If on duty today, calculate elapsed
          const inMins = AttendanceEngine.timeToMinutes(cell.attendance.checkInTime);
          const nowMins = AttendanceEngine.timeToMinutes(AttendanceEngine.getCurrentTimeString());
          if (nowMins > inMins) {
            totalWorkedMinutes += (nowMins - inMins);
          }
        }
      }
    });

    const totalWorkedHours = Math.round((totalWorkedMinutes / 60) * 10) / 10;
    const punctualityRate = presentDays > 0 ? Math.round(((presentDays - lateDays) / presentDays) * 100) : 100;

    return {
      presentDays,
      lateDays,
      absentDays,
      onDutyDays,
      leaveDays,
      holidayDays,
      scheduledWorkDays,
      totalWorkedHours,
      punctualityRate
    };
  }, [calendarCells]);

  // Handlers for instant Check-in and Check-out
  const handleCheckInNow = () => {
    if (!currentDisplayEmployee && !currentUser) return;
    setIsSubmitting(true);

    const personId = currentDisplayEmployee?.id || currentUser.id;
    const personName = currentDisplayEmployee?.fullName || currentUser.fullName;
    const khmerName = currentDisplayEmployee?.khmerName || currentUser.khmerName;
    const department = currentDisplayEmployee?.department || currentUser.department || 'Administration';

    setTimeout(() => {
      const result = AttendanceEngine.processCheckIn({
        personId,
        personName,
        khmerName,
        personType: 'employee',
        department,
        scheduleId: assignedSchedule.id,
        customTime: AttendanceEngine.getCurrentTimeString()
      });

      setIsSubmitting(false);

      if (result.success) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
        showToast(
          isKhmer
            ? `បានស្កេនចូលជោគជ័យ៖ ${khmerName || personName} (${result.record?.status === 'Late' ? 'មកយឺត' : 'ទាន់ម៉ោង'})`
            : result.message,
          result.record?.status === 'Late' ? 'warning' : 'success'
        );
        // Refresh local details if modal is open
        if (selectedDayDetails && selectedDayDetails.isToday) {
          setSelectedDayDetails({
            ...selectedDayDetails,
            attendance: result.record || null
          });
        }
      } else {
        showToast(result.message, 'error');
      }
    }, 250);
  };

  const handleCheckOutNow = () => {
    if (!currentDisplayEmployee && !currentUser) return;
    setIsSubmitting(true);

    const personId = currentDisplayEmployee?.id || currentUser.id;
    const personName = currentDisplayEmployee?.fullName || currentUser.fullName;

    setTimeout(() => {
      const result = AttendanceEngine.processCheckOut({
        personId,
        personName,
        customTime: AttendanceEngine.getCurrentTimeString()
      });

      setIsSubmitting(false);

      if (result.success) {
        showToast(
          isKhmer
            ? `បានស្កេនចេញជោគជ័យ៖ ${currentDisplayEmployee?.khmerName || personName}`
            : result.message,
          'success'
        );
        if (selectedDayDetails && selectedDayDetails.isToday) {
          const fresh = StorageService.getAttendance().find(
            a => a.date === todayStr && a.personId === personId
          );
          setSelectedDayDetails({
            ...selectedDayDetails,
            attendance: fresh || null
          });
        }
      } else {
        showToast(result.message, 'error');
      }
    }, 250);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`space-y-4 max-w-5xl mx-auto ${isKhmer ? 'font-khmer' : 'font-sans'}`}>
      
      {/* 1. Header Toolbar with Month Navigator & Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
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

        {/* Right: Employee Selector (if Supervisor/Admin) or Personal Staff Badge */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {!isEmployeeRole && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                {isKhmer ? 'បុគ្គលិក៖' : 'Staff:'}
              </span>
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="w-full sm:w-64 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.employeeId}) - {e.department}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isEmployeeRole && currentDisplayEmployee && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-bold text-indigo-900">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>{currentDisplayEmployee.fullName}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-600 text-white">
                {currentDisplayEmployee.employeeId}
              </span>
            </div>
          )}

          {/* Print Calendar Button */}
          <button
            onClick={handlePrint}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer print:hidden"
            title="Print Monthly Presence Calendar"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Monthly KPI Presence Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>{isKhmer ? 'ថ្ងៃមានវត្តមាន' : 'Days Present'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-700">{monthlyStats.presentDays}</span>
            <span className="text-xs text-slate-400">/{monthlyStats.scheduledWorkDays} {isKhmer ? 'ថ្ងៃ' : 'shifts'}</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>{isKhmer ? 'អត្រាមកទាន់ពេល' : 'Punctuality Rate'}</span>
            <span className="text-xs font-bold text-indigo-600">%</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-indigo-700">{monthlyStats.punctualityRate}%</span>
            <span className="text-xs text-slate-400">{isKhmer ? 'ទាន់ម៉ោង' : 'on-time'}</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>{isKhmer ? 'ថ្ងៃមកយឺត' : 'Late Arrivals'}</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-600">{monthlyStats.lateDays}</span>
            <span className="text-xs text-slate-400">{isKhmer ? 'ថ្ងៃ' : 'days'}</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>{isKhmer ? 'ម៉ោងការងារសរុប' : 'Total Work Hours'}</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-sky-700">{monthlyStats.totalWorkedHours}</span>
            <span className="text-xs text-slate-400">hrs</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>{isKhmer ? 'ច្បាប់ & ថ្ងៃឈប់' : 'Leaves & Holidays'}</span>
            <Palmtree className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-purple-700">{monthlyStats.leaveDays + monthlyStats.holidayDays}</span>
            <span className="text-xs text-slate-400">
              ({monthlyStats.leaveDays} {isKhmer ? 'ច្បាប់' : 'lv'}, {monthlyStats.holidayDays} {isKhmer ? 'បុណ្យ' : 'hol'})
            </span>
          </div>
        </div>
      </div>

      {/* 3. Legend Bar */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-bold">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider">{isKhmer ? 'សម្គាល់ពណ៌៖' : 'Legend:'}</span>
          <div className="flex items-center gap-1.5 text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{isKhmer ? 'វត្តមាន (Present)' : 'Present'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-800">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>{isKhmer ? 'មកយឺត (Late)' : 'Late'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>{isKhmer ? 'អវត្តមាន (Absent)' : 'Absent'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-800">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span>{isKhmer ? 'កំពុងបំពេញការងារ (On Duty)' : 'On Duty'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-purple-800">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>{isKhmer ? 'ថ្ងៃបុណ្យ/ច្បាប់ (Holiday/Leave)' : 'Holiday / Leave'}</span>
          </div>
        </div>

        {onNavigateToHistory && (
          <button
            onClick={onNavigateToHistory}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors cursor-pointer"
          >
            {isKhmer ? 'មើលកំណត់ត្រាលម្អិត →' : 'View Raw History →'}
          </button>
        )}
      </div>

      {/* 4. Main 7-Column Monthly Present Calendar Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden max-w-full min-w-0">
        <div className="overflow-x-auto max-w-full">
          <div className="min-w-[620px] sm:min-w-0">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-center font-bold text-xs text-slate-700 py-3">
          {DAYS_HEADER_EN.map((dayName, idx) => (
            <div key={dayName} className="flex flex-col items-center">
              <span className="text-slate-900 font-black">{isKhmer ? DAYS_HEADER_KM[idx] : dayName}</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {isKhmer ? dayName : DAYS_HEADER_KM[idx]}
              </span>
            </div>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 auto-rows-fr">
          {calendarCells.map((cell, idx) => {
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
                      attendance: cell.attendance,
                      holiday: cell.holiday,
                      leave: cell.leave,
                      isWorkingDay: cell.isWorkingDay,
                      isToday: cell.isToday,
                      isPast: cell.isPast
                    });
                  }
                }}
                className={`min-h-[110px] sm:min-h-[125px] p-2 sm:p-2.5 flex flex-col justify-between transition-all select-none group relative ${
                  !cell.isCurrentMonth
                    ? 'bg-slate-50/40 text-slate-300 opacity-50 cursor-default'
                    : cell.isToday
                    ? 'bg-indigo-50/90 hover:bg-indigo-100/90 cursor-pointer ring-2 ring-indigo-600 ring-inset shadow-md z-10'
                    : isWeekend
                    ? 'bg-slate-50/25 hover:bg-slate-50 cursor-pointer'
                    : 'bg-white hover:bg-slate-50/80 cursor-pointer'
                }`}
              >
                {/* Cell Header: Day Number + Today Badge + Top Status Icon */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-6.5 h-6.5 flex items-center justify-center rounded-full text-xs font-black ${
                        cell.isToday
                          ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-300'
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

                  {cell.isCurrentMonth && (
                    <div className="flex items-center gap-1">
                      {cell.computedStatus === 'Holiday' && (
                        <span className="p-0.5 rounded bg-purple-100 text-purple-700" title={cell.holiday?.name}>
                          <Palmtree className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {cell.computedStatus === 'Leave' && (
                        <span className="p-0.5 rounded bg-blue-100 text-blue-700" title={cell.leave?.leaveType}>
                          <CalendarCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {cell.computedStatus === 'Present' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      {cell.computedStatus === 'Late' && (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      {cell.computedStatus === 'On Duty' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                      )}
                      {cell.computedStatus === 'Absent' && (
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      )}
                    </div>
                  )}
                </div>

                {/* Cell Center: Attendance / Shift Status Content */}
                <div className="space-y-1 flex-1 py-1">
                  {cell.isCurrentMonth && (
                    <>
                      {/* 1. Holiday Day */}
                      {cell.computedStatus === 'Holiday' && cell.holiday && (
                        <div className="p-1 rounded-lg bg-purple-50 border border-purple-200 text-[10px] text-purple-900 font-bold leading-tight">
                          <p className="truncate">🏖️ {isKhmer ? cell.holiday.khmerName || cell.holiday.name : cell.holiday.name}</p>
                        </div>
                      )}

                      {/* 2. Approved Leave Day */}
                      {cell.computedStatus === 'Leave' && cell.leave && (
                        <div className="p-1 rounded-lg bg-blue-50 border border-blue-200 text-[10px] text-blue-900 font-bold leading-tight">
                          <p className="truncate">📋 {isKhmer ? 'ច្បាប់ឈប់សម្រាក' : cell.leave.leaveType}</p>
                        </div>
                      )}

                      {/* 3. Present (On Time) */}
                      {cell.computedStatus === 'Present' && cell.attendance && (
                        <div className="p-1 sm:p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[10px] space-y-0.5">
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span>In: {cell.attendance.checkInTime || '--:--'}</span>
                            <span className="text-[9px] font-black text-emerald-700">{isKhmer ? 'ទាន់ពេល' : 'On-time'}</span>
                          </div>
                          {cell.attendance.checkOutTime && (
                            <div className="text-[9px] text-slate-500 font-mono">
                              Out: {cell.attendance.checkOutTime}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. Late Arrival */}
                      {cell.computedStatus === 'Late' && cell.attendance && (
                        <div className="p-1 sm:p-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[10px] space-y-0.5">
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span>In: {cell.attendance.checkInTime || '--:--'}</span>
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded">
                              +{cell.attendance.lateMinutes || 1}m
                            </span>
                          </div>
                          {cell.attendance.checkOutTime && (
                            <div className="text-[9px] text-slate-500 font-mono">
                              Out: {cell.attendance.checkOutTime}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5. On Duty (Today in progress) */}
                      {cell.computedStatus === 'On Duty' && cell.attendance && (
                        <div className="p-1 sm:p-1.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-950 text-[10px] space-y-0.5 animate-pulse">
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span>In: {cell.attendance.checkInTime}</span>
                            <span className="text-[9px] font-black text-blue-700">{isKhmer ? 'កំពុងបម្រើការ' : 'On Duty'}</span>
                          </div>
                          <span className="text-[9px] text-blue-600 block">
                            {isKhmer ? 'រង់ចាំស្កេនចេញ' : 'Pending check-out'}
                          </span>
                        </div>
                      )}

                      {/* 6. Absent Day (Past working day missed) */}
                      {cell.computedStatus === 'Absent' && (
                        <div className="p-1 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-800 font-bold">
                          <span>✕ {isKhmer ? 'អវត្តមាន' : 'Absent'}</span>
                        </div>
                      )}

                      {/* 7. Scheduled Shift (Today waiting or Future) */}
                      {cell.computedStatus === 'Scheduled' && (
                        <div className="p-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600 space-y-0.5">
                          <div className="font-mono font-semibold text-slate-700">
                            {assignedSchedule.startTime} - {assignedSchedule.endTime}
                          </div>
                          {cell.isToday && (
                            <span className="text-[9px] font-bold text-amber-600 block">
                              {isKhmer ? 'មិនទាន់ស្កេនចូល' : 'Pending Check-in'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 8. Off Day */}
                      {cell.computedStatus === 'Off Day' && (
                        <div className="text-center py-1 text-[10px] font-medium text-slate-400">
                          {isKhmer ? 'សម្រាក' : 'Off'}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Cell Footer: Quick badge */}
                {cell.isCurrentMonth && cell.isToday && (
                  <div className="pt-0.5 border-t border-indigo-100 text-right">
                    <span className="text-[9px] font-black text-indigo-600">
                      ● {isKhmer ? 'ថ្ងៃនេះ' : 'Today'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
          </div>
        </div>
      </div>

      {/* 5. Selected Day Details Modal */}
      {selectedDayDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-black text-base sm:text-lg">
                    {selectedDayDetails.date.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {currentDisplayEmployee?.fullName} ({currentDisplayEmployee?.employeeId}) • {currentDisplayEmployee?.department}
                </p>
              </div>

              <button
                onClick={() => setSelectedDayDetails(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              {/* Holiday Alert if any */}
              {selectedDayDetails.holiday && (
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 flex items-center gap-3">
                  <Palmtree className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs text-purple-900 block">
                      {isKhmer ? selectedDayDetails.holiday.khmerName || selectedDayDetails.holiday.name : selectedDayDetails.holiday.name}
                    </span>
                    <span className="text-[11px] text-purple-700">
                      {isKhmer ? 'ថ្ងៃឈប់សម្រាកផ្លូវការរបស់សាលា' : 'Official School Holiday'}
                    </span>
                  </div>
                </div>
              )}

              {/* Leave Alert if any */}
              {selectedDayDetails.leave && (
                <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 flex items-center gap-3">
                  <CalendarCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs text-blue-900 block">
                      {selectedDayDetails.leave.leaveType}
                    </span>
                    <span className="text-[11px] text-blue-700">
                      {selectedDayDetails.leave.reason || (isKhmer ? 'ច្បាប់ឈប់សម្រាកត្រូវបានអនុម័ត' : 'Approved Leave')}
                    </span>
                  </div>
                </div>
              )}

              {/* Assigned Shift Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isKhmer ? 'វេនការងារដែលបានកំណត់' : 'Scheduled Shift'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    {assignedSchedule.department}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  {isKhmer ? assignedSchedule.khmerName || assignedSchedule.name : assignedSchedule.name}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                  <span className="flex items-center gap-1 font-mono font-bold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{assignedSchedule.startTime} – {assignedSchedule.endTime}</span>
                  </span>
                  {assignedSchedule.breakStart && (
                    <span className="text-[11px] text-slate-500">
                      ({isKhmer ? 'សម្រាក' : 'Break'}: {assignedSchedule.breakStart} - {assignedSchedule.breakEnd})
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>{assignedSchedule.location || 'Main Campus'}</span>
                  </span>
                </div>
              </div>

              {/* Attendance Record Status */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {isKhmer ? 'ស្ថានភាពវត្តមានជាក់ស្តែង' : 'Recorded Presence Status'}
                  </span>
                  {selectedDayDetails.attendance ? (
                    selectedDayDetails.attendance.status === 'Late' || (selectedDayDetails.attendance.lateMinutes && selectedDayDetails.attendance.lateMinutes > 0) ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                        {isKhmer ? 'មកយឺត (Late)' : 'Late Arrival'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {isKhmer ? 'មានវត្តមាន (Present)' : 'Present'}
                      </span>
                    )
                  ) : selectedDayDetails.isToday ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {isKhmer ? 'មិនទាន់ស្កេនចូល' : 'Pending Check-in'}
                    </span>
                  ) : selectedDayDetails.isPast && selectedDayDetails.isWorkingDay ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      {isKhmer ? 'អវត្តមាន (Absent)' : 'Absent / No Record'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                      {isKhmer ? 'ថ្ងៃសម្រាក ឬមិនទាន់ដល់' : 'Scheduled / Off'}
                    </span>
                  )}
                </div>

                {selectedDayDetails.attendance ? (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        {isKhmer ? 'ម៉ោងស្កេនចូល (Check In)' : 'Check In Time'}
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        {selectedDayDetails.attendance.checkInTime || '--:--'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        {isKhmer ? 'ម៉ោងស្កេនចេញ (Check Out)' : 'Check Out Time'}
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        {selectedDayDetails.attendance.checkOutTime || '--:--'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">
                    {selectedDayDetails.isToday
                      ? (isKhmer ? 'អ្នកមិនទាន់បានស្កេនវត្តមានសម្រាប់ថ្ងៃនេះនៅឡើយទេ' : 'You have not checked in for today yet.')
                      : (isKhmer ? 'ពុំមានកំណត់ត្រាវត្តមានសម្រាប់កាលបរិច្ឆេទនេះឡើយ' : 'No presence punch logged for this date.')}
                  </p>
                )}

                {/* Instant Check-in / Check-out button if selected day is Today */}
                {selectedDayDetails.isToday && (
                  <div className="pt-2">
                    {!selectedDayDetails.attendance?.checkInTime ? (
                      <button
                        onClick={handleCheckInNow}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            <span>{isKhmer ? 'ស្កេនវត្តមានចូលឥឡូវនេះ (Check In)' : 'Check In for Today'}</span>
                          </>
                        )}
                      </button>
                    ) : !selectedDayDetails.attendance?.checkOutTime ? (
                      <button
                        onClick={handleCheckOutNow}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <LogOut className="w-4 h-4" />
                            <span>{isKhmer ? 'ស្កេនវត្តមានចេញឥឡូវនេះ (Check Out)' : 'Check Out for Today'}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-xs font-bold text-emerald-800">
                        ✓ {isKhmer ? 'បានកត់ត្រាវត្តមានពេញលេញសម្រាប់ថ្ងៃនេះ' : 'Today\'s Attendance Fully Completed'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedDayDetails(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {isKhmer ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
