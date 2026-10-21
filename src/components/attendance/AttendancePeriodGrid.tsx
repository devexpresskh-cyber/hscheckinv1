import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import {
  Teacher,
  TeacherSubjectSchedule,
  TimetablePeriod,
  AttendanceRecord,
  AttendanceStatus,
  Employee,
  ScheduleSubstitution
} from '../../types/index.ts';
import { ScheduleSubstituteModal } from '../schedules/ScheduleSubstituteModal.tsx';
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  Printer,
  GraduationCap,
  BookOpen,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  LogIn,
  LogOut,
  Info,
  Users2,
  Sparkles,
  Layers,
  Building,
  UserPlus,
  UserCheck
} from 'lucide-react';

interface AttendancePeriodGridProps {
  onRequestCorrection?: (record?: Partial<AttendanceRecord>) => void;
}

interface PeriodCellData {
  period: TimetablePeriod;
  schedule?: TeacherSubjectSchedule;
  attendanceRecord?: AttendanceRecord;
  status: 'Present' | 'Late' | 'In Progress' | 'Upcoming' | 'Absent' | 'Leave' | 'Free';
  checkInTime?: string;
  checkOutTime?: string;
  lateMinutes?: number;
  isCurrentActivePeriod: boolean;
  substitution?: ScheduleSubstitution;
}

interface TeacherPeriodRow {
  teacher: Teacher;
  subjectCode: string;
  cells: PeriodCellData[];
  scheduledPeriodsCount: number;
  attendedCount: number;
  lateCount: number;
  missedCount: number;
  totalTaughtMinutes: number;
  attendanceRate: number;
}

export const AttendancePeriodGrid: React.FC<AttendancePeriodGridProps> = ({
  onRequestCorrection
}) => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  const todayStr = AttendanceEngine.getCurrentDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [shiftFilter, setShiftFilter] = useState<'All' | 'Morning' | 'Afternoon'>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'timeline' : 'grid';
    }
    return 'grid';
  });
  const [timelineGrouping, setTimelineGrouping] = useState<'period' | 'teacher'>('period');
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<number | 'All'>('All');
  const [selectedCellModal, setSelectedCellModal] = useState<{
    teacher: Teacher;
    cell: PeriodCellData;
  } | null>(null);

  // Substitute modal state
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [substituteTargetSchedule, setSubstituteTargetSchedule] = useState<TeacherSubjectSchedule | null>(null);
  const [substituteTargetExisting, setSubstituteTargetExisting] = useState<ScheduleSubstitution | null>(null);

  // Storage subscriptions
  const [teachers, setTeachers] = useState(() => StorageService.getTeachers().filter(t => t.status === 'Active'));
  const [employees, setEmployees] = useState(() => StorageService.getEmployees().filter(e => e.status === 'Active'));
  const [subjectSchedules, setSubjectSchedules] = useState(() => StorageService.getSubjectSchedules().filter(s => s.isActive));
  const [periods, setPeriods] = useState(() => StorageService.getPeriods().sort((a, b) => a.periodNumber - b.periodNumber));
  const [attendance, setAttendance] = useState(() => StorageService.getAttendance());
  const [departments, setDepartments] = useState(() => StorageService.getDepartments());
  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSystemSettings());

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setTeachers(StorageService.getTeachers().filter(t => t.status === 'Active'));
      setEmployees(StorageService.getEmployees().filter(e => e.status === 'Active'));
      setSubjectSchedules(StorageService.getSubjectSchedules().filter(s => s.isActive));
      setPeriods(StorageService.getPeriods().sort((a, b) => a.periodNumber - b.periodNumber));
      setAttendance(StorageService.getAttendance());
      setDepartments(StorageService.getDepartments());
      setSystemSettings(StorageService.getSystemSettings());
    });
    return unsub;
  }, []);

  const isAdmin =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin_hr' ||
    currentUser.role === 'supervisor' ||
    (!['teacher', 'employee'].includes(currentUser.role) && (hasPermission('attendance.view') || hasPermission('reports.view')));

  // Selected date details
  const { dateObj, dayOfWeek, dayNameEn, dayNameKm, formattedDisplayDate } = useMemo(() => {
    const parts = selectedDate.split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const d = parseInt(parts[2], 10) || new Date().getDate();
    const dt = new Date(y, m - 1, d);

    const dow = dt.getDay(); // 0 = Sun, 1 = Mon ...
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysKm = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

    return {
      dateObj: dt,
      dayOfWeek: dow,
      dayNameEn: daysEn[dow],
      dayNameKm: daysKm[dow],
      formattedDisplayDate: `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`
    };
  }, [selectedDate]);

  // Current clock time calculations
  const curTimeStr = AttendanceEngine.getCurrentTimeString();
  const curMinutes = AttendanceEngine.timeToMinutes(curTimeStr);
  const isDateToday = selectedDate === todayStr;

  // Filter periods by shift (Morning = Period 1-5, Afternoon = Period 6-10)
  const filteredPeriods = useMemo(() => {
    let list = [...periods];
    if (list.length === 0) {
      // Fallback default periods 1..10
      list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({
        id: `period-${n}`,
        periodNumber: n,
        periodName: `Period ${n}`,
        khmerPeriodName: `ម៉ោងទី ${n}`,
        startTime: n <= 5 ? `0${6 + n}:00` : `${7 + n}:00`,
        endTime: n <= 5 ? `0${6 + n}:45` : `${7 + n}:45`,
        sessionType: n <= 5 ? 'Morning' : 'Afternoon',
        isBreak: false
      }));
    }

    if (shiftFilter === 'Morning') {
      return list.filter(p => (p.periodNumber <= 5) || (p.sessionType === 'Morning'));
    }
    if (shiftFilter === 'Afternoon') {
      return list.filter(p => (p.periodNumber > 5) || (p.sessionType === 'Afternoon'));
    }
    return list;
  }, [periods, shiftFilter]);

  // Active period ongoing right now
  const activeCurrentPeriod = useMemo(() => {
    if (!isDateToday) return null;
    return filteredPeriods.find(p => {
      const s = AttendanceEngine.timeToMinutes(p.startTime);
      const e = AttendanceEngine.timeToMinutes(p.endTime);
      return curMinutes >= s && curMinutes <= e;
    }) || null;
  }, [isDateToday, filteredPeriods, curMinutes]);

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    let list = teachers.filter(t => canAccessDepartment(t.department));

    // Non-admin faculty privacy: teacher sees own row
    if (currentUser.role === 'teacher') {
      const owned = list.filter(
        t => t.id === currentUser.personId ||
             t.id === currentUser.id ||
             (t.email && currentUser.email && t.email.toLowerCase() === currentUser.email.toLowerCase()) ||
             t.fullName.toLowerCase() === currentUser.fullName.toLowerCase()
      );
      if (owned.length > 0) return owned;
    }

    if (selectedDept !== 'All') {
      list = list.filter(t => t.department === selectedDept);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        t.fullName.toLowerCase().includes(q) ||
        (t.khmerName && t.khmerName.toLowerCase().includes(q)) ||
        t.teacherId.toLowerCase().includes(q) ||
        (t.subject && t.subject.toLowerCase().includes(q))
      );
    }

    return list;
  }, [teachers, canAccessDepartment, currentUser, selectedDept, searchQuery]);

  // Build grid data for teachers
  const gridRows = useMemo<TeacherPeriodRow[]>(() => {
    return filteredTeachers.map(teacher => {
      // Find teacher schedules active on this day of week
      const teacherSchedules = subjectSchedules.filter(s => {
        const matchesTeacher =
          s.teacherId === teacher.id ||
          s.teacherId?.toLowerCase() === teacher.teacherId?.toLowerCase() ||
          s.teacherName?.toLowerCase() === teacher.fullName?.toLowerCase();

        if (!matchesTeacher) return false;

        // Matches day of week
        if (Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0) {
          return s.daysOfWeek.includes(dayOfWeek);
        }
        return s.dayOfWeek === dayOfWeek;
      });

      // Subject code for display
      const mainSubCode = teacherSchedules.find(s => s.subjectCode)?.subjectCode ||
        (teacher.subject ? teacher.subject.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() + '-01' : 'TCH');

      let scheduledPeriodsCount = 0;
      let attendedCount = 0;
      let lateCount = 0;
      let missedCount = 0;
      let totalTaughtMinutes = 0;

      const cells: PeriodCellData[] = filteredPeriods.map(period => {
        // Find if teacher has schedule for this period
        let sched = teacherSchedules.find(
          s => s.periodNumber === period.periodNumber ||
               (s.startTime && period.startTime && s.startTime === period.startTime)
        );

        let isAssignedSubstituteForPeriod = false;
        let substForPeriod = sched ? StorageService.findSubstitution(sched.id, selectedDate) : undefined;

        // If teacher doesn't have an original schedule in this period, check if they were assigned as a substitute!
        if (!sched) {
          const coveredAssignments = StorageService.getAssignedSubstituteSchedules(teacher.id, selectedDate);
          const matchedCover = coveredAssignments.find(ca =>
            ca.schedule.periodNumber === period.periodNumber ||
            (ca.schedule.startTime && period.startTime && ca.schedule.startTime === period.startTime)
          );
          if (matchedCover) {
            sched = matchedCover.schedule;
            substForPeriod = matchedCover.substitution;
            isAssignedSubstituteForPeriod = true;
          }
        }

        if (!sched) {
          return {
            period,
            status: 'Free',
            isCurrentActivePeriod: false
          };
        }

        scheduledPeriodsCount++;

        // Determine if period is currently ongoing
        const startM = AttendanceEngine.timeToMinutes(sched.startTime || period.startTime);
        const endM = AttendanceEngine.timeToMinutes(sched.endTime || period.endTime);
        const isCurrentActive = isDateToday && (curMinutes >= startM && curMinutes <= endM);

        // Find attendance record for this class schedule on selected date
        const attRec = isAssignedSubstituteForPeriod
          ? attendance.find(r => r.date === selectedDate && r.personId === teacher.id && r.isSubstitute && (r.subjectScheduleId === sched.id || r.scheduleId === sched.id))
          : AttendanceEngine.findRecordForSubjectSchedule(sched, attendance, selectedDate, teachers);

        let cellStatus: PeriodCellData['status'] = 'Upcoming';

        if (attRec) {
          if (attRec.status === 'Late' || (attRec.lateMinutes && attRec.lateMinutes > 0)) {
            cellStatus = 'Late';
            attendedCount++;
            lateCount++;
            totalTaughtMinutes += Math.max(45, (endM - startM) || 45);
          } else if (attRec.status === 'Present' || attRec.checkInTime) {
            cellStatus = 'Present';
            attendedCount++;
            totalTaughtMinutes += Math.max(45, (endM - startM) || 45);
          } else if (attRec.status === 'Leave') {
            cellStatus = 'Leave';
          } else if (attRec.status === 'Absent') {
            cellStatus = 'Absent';
            missedCount++;
          }
        } else {
          // No record yet
          if (isCurrentActive) {
            cellStatus = 'In Progress';
          } else if (isDateToday && curMinutes > endM) {
            // Class has ended today without check-in -> Absent/Missed
            cellStatus = 'Absent';
            missedCount++;
          } else if (!isDateToday && selectedDate < todayStr) {
            // Past date without check-in
            cellStatus = 'Absent';
            missedCount++;
          } else {
            // Future or today upcoming
            cellStatus = 'Upcoming';
          }
        }

        const subst = substForPeriod || StorageService.findSubstitution(sched.id, selectedDate);

        return {
          period,
          schedule: sched,
          attendanceRecord: attRec,
          status: cellStatus,
          checkInTime: attRec?.checkInTime,
          checkOutTime: attRec?.checkOutTime,
          lateMinutes: attRec?.lateMinutes,
          isCurrentActivePeriod: isCurrentActive,
          substitution: subst || undefined
        };
      });

      const rate = scheduledPeriodsCount > 0 ? Math.round((attendedCount / scheduledPeriodsCount) * 100) : 100;

      return {
        teacher,
        subjectCode: mainSubCode,
        cells,
        scheduledPeriodsCount,
        attendedCount,
        lateCount,
        missedCount,
        totalTaughtMinutes,
        attendanceRate: rate
      };
    });
  }, [filteredTeachers, subjectSchedules, dayOfWeek, filteredPeriods, attendance, selectedDate, teachers, isDateToday, curMinutes, todayStr]);

  // Aggregate KPI summary for this day
  const dailyKpis = useMemo(() => {
    let totalClasses = 0;
    let presentClasses = 0;
    let lateClasses = 0;
    let inProgressClasses = 0;
    let missedClasses = 0;

    gridRows.forEach(row => {
      row.cells.forEach(cell => {
        if (cell.schedule) {
          totalClasses++;
          if (cell.status === 'Present') presentClasses++;
          if (cell.status === 'Late') lateClasses++;
          if (cell.status === 'In Progress') inProgressClasses++;
          if (cell.status === 'Absent') missedClasses++;
        }
      });
    });

    return {
      totalClasses,
      presentClasses,
      lateClasses,
      inProgressClasses,
      missedClasses
    };
  }, [gridRows]);

  // Summary per period column
  const periodColumnTotals = useMemo(() => {
    return filteredPeriods.map((period, idx) => {
      let scheduled = 0;
      let present = 0;
      let late = 0;
      let inProgress = 0;
      let absent = 0;

      gridRows.forEach(row => {
        const cell = row.cells[idx];
        if (cell.schedule) {
          scheduled++;
          if (cell.status === 'Present') present++;
          if (cell.status === 'Late') late++;
          if (cell.status === 'In Progress') inProgress++;
          if (cell.status === 'Absent') absent++;
        }
      });

      return {
        periodNumber: period.periodNumber,
        scheduled,
        present,
        late,
        inProgress,
        absent,
        totalActiveOrPresent: present + late + inProgress
      };
    });
  }, [filteredPeriods, gridRows]);

  // Groups of classes per period for "By Period" Timeline view
  const periodScheduleGroups = useMemo(() => {
    return filteredPeriods.map(period => {
      const classesInPeriod: {
        teacher: Teacher;
        cell: PeriodCellData;
      }[] = [];

      gridRows.forEach(row => {
        const cell = row.cells.find(c => c.period.periodNumber === period.periodNumber);
        if (cell && cell.schedule) {
          classesInPeriod.push({
            teacher: row.teacher,
            cell
          });
        }
      });

      const isCurrentActive = isDateToday && (curMinutes >= AttendanceEngine.timeToMinutes(period.startTime) && curMinutes <= AttendanceEngine.timeToMinutes(period.endTime));
      const hasEnded = isDateToday ? curMinutes > AttendanceEngine.timeToMinutes(period.endTime) : selectedDate < todayStr;
      const isUpcoming = isDateToday ? curMinutes < AttendanceEngine.timeToMinutes(period.startTime) : selectedDate > todayStr;

      const presentCount = classesInPeriod.filter(c => c.cell.status === 'Present').length;
      const lateCount = classesInPeriod.filter(c => c.cell.status === 'Late').length;
      const inProgressCount = classesInPeriod.filter(c => c.cell.status === 'In Progress').length;
      const missedCount = classesInPeriod.filter(c => c.cell.status === 'Absent' || c.cell.status === 'Leave').length;

      return {
        period,
        classes: classesInPeriod,
        isCurrentActive,
        hasEnded,
        isUpcoming,
        stats: {
          total: classesInPeriod.length,
          present: presentCount,
          late: lateCount,
          inProgress: inProgressCount,
          missed: missedCount
        }
      };
    });
  }, [filteredPeriods, gridRows, isDateToday, curMinutes, selectedDate, todayStr]);

  // Date Navigation
  const handlePrevDay = () => {
    const dt = new Date(selectedDate);
    dt.setDate(dt.getDate() - 1);
    setSelectedDate(dt.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const dt = new Date(selectedDate);
    dt.setDate(dt.getDate() + 1);
    setSelectedDate(dt.toISOString().split('T')[0]);
  };

  // Quick Check-in action from cell/modal
  const handlePerformCheckIn = (teacher: Teacher, sched: TeacherSubjectSchedule) => {
    const holiday = AttendanceEngine.getHoliday(selectedDate);
    if (holiday) {
      const holidayLabel = holiday.khmerName ? `${holiday.name} (${holiday.khmerName})` : holiday.name;
      showToast(
        isKhmer
          ? `មិនអនុញ្ញាតឱ្យស្កេនចូលទេ៖ កាលបរិច្ឆេទ ${selectedDate} ជាថ្ងៃឈប់សម្រាកបុណ្យផ្លូវការ "${holidayLabel}"។`
          : `Check-in denied: ${selectedDate} is an official holiday — "${holidayLabel}". Check-in is not allowed on holidays.`,
        'error'
      );
      return;
    }

    const res = AttendanceEngine.processCheckIn({
      personId: teacher.id,
      personType: 'teacher',
      personName: teacher.fullName,
      khmerName: teacher.khmerName,
      department: teacher.department,
      scheduleId: sched.id,
      subjectScheduleId: sched.id,
      date: selectedDate,
      bypassScheduleWindow: true
    });

    if (res.success) {
      showToast(isKhmer ? `បានស្កេនចូលជោគជ័យសម្រាប់ ${sched.subject}` : `Check-in recorded for ${sched.subject}`, 'success');
      setSelectedCellModal(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Quick Check-out action from cell/modal
  const handlePerformCheckOut = (teacher: Teacher, sched: TeacherSubjectSchedule) => {
    const res = AttendanceEngine.processCheckOut({
      personId: teacher.id,
      personName: teacher.fullName,
      subjectScheduleId: sched.id
    });

    if (res.success) {
      showToast(isKhmer ? `បានស្កេនចេញជោគជ័យសម្រាប់ ${sched.subject}` : `Check-out recorded for ${sched.subject}`, 'success');
      setSelectedCellModal(null);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Print Period Attendance Sheet
  const handlePrint = () => {
    const orgName = systemSettings?.organizationName || 'EDUCATION MANAGEMENT SYSTEM';
    const khmerOrgName = systemSettings?.khmerOrgName || 'ប្រព័ន្ធគ្រប់គ្រងគ្រឹះស្ថានអប់រំ';

    const periodThs = filteredPeriods.map(p => `
      <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 8.5px; background: #f8fafc; min-width: 60px;">
        <div style="font-weight: 800; color: #1e293b;">${p.periodName}</div>
        <div style="font-size: 7.5px; color: #64748b;">${p.startTime} - ${p.endTime}</div>
      </th>
    `).join('');

    const teacherTrs = gridRows.map((row, idx) => {
      const cellsHtml = row.cells.map(c => {
        if (!c.schedule) {
          return `<td style="border: 1px solid #cbd5e1; text-align: center; color: #cbd5e1; font-size: 8px;">-</td>`;
        }
        const badgeBg = c.status === 'Present' ? '#ecfdf5' : c.status === 'Late' ? '#fffbeb' : c.status === 'Absent' ? '#fef2f2' : '#f1f5f9';
        const badgeColor = c.status === 'Present' ? '#047857' : c.status === 'Late' ? '#b45309' : c.status === 'Absent' ? '#b91c1c' : '#475569';
        const statusLetter = c.status === 'Present' ? 'P' : c.status === 'Late' ? 'L' : c.status === 'Absent' ? 'A' : 'Sched';

        return `
          <td style="border: 1px solid #cbd5e1; padding: 4px; background: ${badgeBg}; text-align: center; font-size: 8px;">
            <div style="font-weight: 700; color: #0f172a; white-space: nowrap;">${c.schedule.subjectCode || c.schedule.subject}</div>
            <div style="font-size: 7px; color: #64748b;">${c.schedule.gradeClass || ''}</div>
            <div style="font-weight: 800; color: ${badgeColor}; font-size: 7.5px; margin-top: 1px;">${statusLetter} ${c.checkInTime ? `(${c.checkInTime})` : ''}</div>
          </td>
        `;
      }).join('');

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 8.5px;">
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; font-weight: 700; white-space: nowrap;">
            ${row.teacher.khmerName || row.teacher.fullName}
            ${row.teacher.khmerName && row.teacher.fullName ? `<span style="font-size: 7.5px; color: #64748b; font-weight: normal; display: block;">${row.teacher.fullName}</span>` : ''}
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; font-family: monospace; font-size: 8px;">${row.teacher.department}</td>
          ${cellsHtml}
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 700; color: #047857;">${row.attendedCount} / ${row.scheduledPeriodsCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 800;">${row.attendanceRate}%</td>
        </tr>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocked', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Daily Period Attendance - ${selectedDate}</title>
        <style>
          @page { size: landscape; margin: 8mm 8mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Khmer OS", Arial, sans-serif; margin: 0; padding: 8px; color: #0f172a; font-size: 9px; }
          .header-box { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
          .org { font-size: 15px; font-weight: 900; text-transform: uppercase; margin: 0; }
          .khmer-org { font-size: 12px; font-weight: 700; margin: 2px 0 0 0; }
          .doc-title { font-size: 13px; font-weight: 800; color: #2563eb; text-transform: uppercase; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
          .signatures { margin-top: 24px; display: flex; justify-content: space-between; text-align: center; font-size: 9px; }
          .sig-box { width: 28%; }
          .sig-line { margin-top: 45px; border-top: 1px dashed #64748b; padding-top: 4px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="org">${orgName}</div>
          <div class="khmer-org">${khmerOrgName}</div>
          <div class="doc-title">DAILY FACULTY ATTENDANCE BY PERIOD (វត្តមានគ្រូបង្រៀនតាមម៉ោងសិក្សា)</div>
          <div style="font-size: 10px; color: #475569; margin-top: 3px; font-weight: 600;">
            Date: ${dayNameEn}, ${formattedDisplayDate} (${dayNameKm}) • Shift: ${shiftFilter}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 24px;">No</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; min-width: 110px; text-align: left;">Faculty Name</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 65px; text-align: left;">Dept</th>
              ${periodThs}
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 45px; text-align: center;">Attended</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 35px; text-align: center;">Rate %</th>
            </tr>
          </thead>
          <tbody>
            ${teacherTrs}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div>Recorded By (កត់ត្រាដោយ)</div>
            <div class="sig-line">Academic Coordinator / Registrar</div>
          </div>
          <div class="sig-box">
            <div>Checked By (ត្រួតពិនិត្យដោយ)</div>
            <div class="sig-line">Head of Academics / Supervisor</div>
          </div>
          <div class="sig-box">
            <div>Approved By (អនុម័តដោយ)</div>
            <div class="sig-line">School Principal / Director</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export CSV
  const handleExportCSV = () => {
    const periodHeaders = filteredPeriods.map(p => `"${p.periodName} (${p.startTime}-${p.endTime})"`);
    const headers = [
      'No',
      'Teacher ID',
      'Teacher Name',
      'Khmer Name',
      'Department',
      ...periodHeaders,
      'Scheduled Classes',
      'Attended Classes',
      'Late Classes',
      'Missed Classes',
      'Attendance Rate %'
    ];

    const rows = gridRows.map((row, idx) => {
      const cellValues = row.cells.map(c => {
        if (!c.schedule) return 'Free';
        const sub = c.schedule.subjectCode || c.schedule.subject;
        const timeLog = c.checkInTime ? `[${c.checkInTime}]` : '';
        return `"${sub} (${c.status}) ${timeLog}"`;
      });

      return [
        idx + 1,
        row.teacher.teacherId,
        `"${row.teacher.fullName}"`,
        `"${row.teacher.khmerName || ''}"`,
        `"${row.teacher.department}"`,
        ...cellValues,
        row.scheduledPeriodsCount,
        row.attendedCount,
        row.lateCount,
        row.missedCount,
        `${row.attendanceRate}%`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Periods_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isKhmer ? 'បានទាញយកទិន្នន័យវត្តមានតាមម៉ោង' : 'Exported period attendance to CSV', 'info');
  };

  return (
    <div className="space-y-4">

      {/* Top Filter & Stepper Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        
        {/* Date Selector with Steppers & Quick Today */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-2xs">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-0 text-xs sm:text-sm font-black text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Today Button */}
          {selectedDate !== todayStr ? (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors cursor-pointer"
            >
              {isKhmer ? 'ថ្ងៃនេះ (Today)' : 'Today'}
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isKhmer ? `ថ្ងៃនេះ: ${dayNameKm}` : `Today: ${dayNameEn}`}</span>
            </span>
          )}

          {/* Search box - full width on mobile */}
          <div className="relative w-full sm:w-60 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកគ្រូ មុខវិជ្ជា ថ្នាក់ បន្ទប់...' : 'Search teacher, class, room...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Right Controls: Shift, Department, View Mode, Print, CSV */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 justify-between lg:justify-end w-full lg:w-auto">
          
          {/* Shift Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setShiftFilter('All')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${shiftFilter === 'All' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
            >
              {isKhmer ? 'គ្រប់ម៉ោង' : 'All'}
            </button>
            <button
              onClick={() => setShiftFilter('Morning')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${shiftFilter === 'Morning' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
            >
              {isKhmer ? 'ព្រឹក' : 'Morning'}
            </button>
            <button
              onClick={() => setShiftFilter('Afternoon')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${shiftFilter === 'Afternoon' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
            >
              {isKhmer ? 'រសៀល' : 'Afternoon'}
            </button>
          </div>

          {/* Department Filter */}
          {currentUser.role !== 'teacher' && (
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="All">{isKhmer ? 'គ្រប់ដេប៉ាតឺម៉ង់' : 'All Depts'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          )}

          {/* View Mode Switcher: Timeline vs Grid */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Timeline View (ទិដ្ឋភាព Timeline)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table Grid View (ទិដ្ឋភាពតារាង)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'តារាង' : 'Grid'}</span>
            </button>
          </div>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Print Period Attendance"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKhmer ? 'បោះពុម្ព' : 'Print'}</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKhmer ? 'ទាញយក CSV' : 'Export CSV'}</span>
            <span className="sm:hidden">CSV</span>
          </button>

        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">
            {isKhmer ? 'ម៉ោងត្រូវបង្រៀនសរុប' : 'Total Scheduled'}
          </span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">{dailyKpis.totalClasses}</span>
          <span className="text-[10px] text-slate-500">{isKhmer ? 'ថ្នាក់ថ្ងៃនេះ' : 'classes today'}</span>
        </div>

        <div className="bg-emerald-50/70 p-3 sm:p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wide">
            {isKhmer ? 'មានវត្តមាន / ទាន់ពេល' : 'Present / On Time'}
          </span>
          <span className="text-xl font-black text-emerald-900 mt-0.5 block">{dailyKpis.presentClasses}</span>
          <span className="text-[10px] text-emerald-600">{isKhmer ? 'បានស្កេនចូល' : 'sessions logged'}</span>
        </div>

        <div className="bg-amber-50/70 p-3 sm:p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wide">
            {isKhmer ? 'មកយឺត' : 'Late Arrival'}
          </span>
          <span className="text-xl font-black text-amber-900 mt-0.5 block">{dailyKpis.lateClasses}</span>
          <span className="text-[10px] text-amber-600">{isKhmer ? 'លើសម៉ោងកំណត់' : 'past grace period'}</span>
        </div>

        <div className="bg-sky-50/70 p-3 sm:p-3.5 rounded-2xl border border-sky-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-sky-700 block tracking-wide">
            {isKhmer ? 'កំពុងបង្រៀន' : 'In Session Now'}
          </span>
          <span className="text-xl font-black text-sky-900 mt-0.5 block">{dailyKpis.inProgressClasses}</span>
          <span className="text-[10px] text-sky-600">{isKhmer ? 'ម៉ោងកំពុងដំណើរការ' : 'active right now'}</span>
        </div>

        <div className="bg-rose-50/70 p-3 sm:p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-rose-700 block tracking-wide">
            {isKhmer ? 'ខកខាន / អវត្តមាន' : 'Missed / Absent'}
          </span>
          <span className="text-xl font-black text-rose-900 mt-0.5 block">{dailyKpis.missedClasses}</span>
          <span className="text-[10px] text-rose-600">{isKhmer ? 'មិនមានការស្កេន' : 'no check-in recorded'}</span>
        </div>
      </div>

      {/* Interactive Period Timeline Header Ribbon (Mobile & Responsive) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2 flex-wrap">
                <span>{isKhmer ? 'កាលវិភាគតាមម៉ោង (Period Timeline)' : 'Period Attendance Timeline'}</span>
                {isDateToday && activeCurrentPeriod && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                    <span>{activeCurrentPeriod.periodName} ({isKhmer ? 'កំពុងបង្រៀន' : 'Active'})</span>
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {dayNameKm || dayNameEn} • {formattedDisplayDate} • {dailyKpis.totalClasses} {isKhmer ? 'ថ្នាក់បង្រៀនថ្ងៃនេះ' : 'classes scheduled today'}
              </p>
            </div>
          </div>

          {/* Timeline View Options & Quick Jump */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {viewMode === 'timeline' && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setTimelineGrouping('period')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    timelineGrouping === 'period'
                      ? 'bg-white text-indigo-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Group by Period (តាមម៉ោង)"
                >
                  {isKhmer ? 'តាមម៉ោង' : 'By Period'}
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineGrouping('teacher')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    timelineGrouping === 'teacher'
                      ? 'bg-white text-indigo-700 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Group by Faculty (តាមគ្រូ)"
                >
                  {isKhmer ? 'តាមគ្រូ' : 'By Teacher'}
                </button>
              </div>
            )}

            {isDateToday && activeCurrentPeriod && selectedPeriodFilter !== activeCurrentPeriod.periodNumber && (
              <button
                type="button"
                onClick={() => setSelectedPeriodFilter(activeCurrentPeriod.periodNumber)}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                title="Jump to active period"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                <span>{isKhmer ? 'ម៉ោងផ្ទាល់' : 'Live Now'}</span>
              </button>
            )}

            {selectedPeriodFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedPeriodFilter('All')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>{isKhmer ? 'មើលគ្រប់ម៉ោង' : 'Show All'}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Scrolling Period Timeline Track */}
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar touch-pan-x">
            <button
              type="button"
              onClick={() => setSelectedPeriodFilter('All')}
              className={`px-3 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer border ${
                selectedPeriodFilter === 'All'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>{isKhmer ? 'គ្រប់ម៉ោង' : 'All Periods'}</span>
              <span className="ml-1.5 opacity-75 text-[10px]">({dailyKpis.totalClasses})</span>
            </button>

            {filteredPeriods.map(p => {
              const isCurrentNow = isDateToday && (curMinutes >= AttendanceEngine.timeToMinutes(p.startTime) && curMinutes <= AttendanceEngine.timeToMinutes(p.endTime));
              const isSelected = selectedPeriodFilter === p.periodNumber;
              const stat = periodColumnTotals.find(t => t.periodNumber === p.periodNumber);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPeriodFilter(isSelected ? 'All' : p.periodNumber)}
                  className={`flex items-center gap-2.5 px-3 sm:px-3.5 py-2 rounded-2xl text-left transition-all shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/30'
                      : isCurrentNow
                      ? 'bg-blue-50 hover:bg-blue-100 text-blue-950 border-blue-400 ring-1 ring-blue-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center font-black text-[11px] sm:text-xs shrink-0 ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : isCurrentNow
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    P{p.periodNumber}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black truncate">
                        {p.khmerPeriodName || p.periodName}
                      </span>
                      {isCurrentNow && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
                      )}
                    </div>
                    <div className={`text-[10px] font-mono leading-none mt-0.5 ${
                      isSelected ? 'text-indigo-100' : isCurrentNow ? 'text-blue-700 font-bold' : 'text-slate-500'
                    }`}>
                      {p.startTime} - {p.endTime}
                    </div>
                  </div>

                  {stat && (
                    <div className={`text-right pl-1 border-l text-[10px] shrink-0 font-mono ${
                      isSelected ? 'border-white/25 text-white' : 'border-slate-200 text-slate-600'
                    }`}>
                      <span className="font-extrabold">{stat.totalActiveOrPresent}</span>
                      <span className="opacity-70">/{stat.scheduled}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIMELINE VIEW (Optimized for Mobile & Touch Screens) */}
      {/* ========================================================================= */}
      {viewMode === 'timeline' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Timeline Sub-view 1: Grouped by Period (Chronological time slots - Ideal for Mobile!) */}
          {timelineGrouping === 'period' ? (
            <div className="space-y-4">
              {(() => {
                const displayPeriodGroups = selectedPeriodFilter === 'All'
                  ? periodScheduleGroups
                  : periodScheduleGroups.filter(g => g.period.periodNumber === selectedPeriodFilter);

                if (displayPeriodGroups.length === 0) {
                  return (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
                      <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm">
                        {isKhmer ? 'ពុំមានកាលវិភាគបង្រៀនសម្រាប់កាលបរិច្ឆេទនេះទេ' : 'No teacher schedules found for this period.'}
                      </p>
                    </div>
                  );
                }

                return displayPeriodGroups.map((group) => {
                  const p = group.period;
                  const isCurrentNow = group.isCurrentActive;

                  return (
                    <div
                      key={p.id}
                      className={`bg-white rounded-3xl border overflow-hidden transition-all shadow-xs ${
                        isCurrentNow
                          ? 'border-blue-400 ring-2 ring-blue-400/20 shadow-blue-500/5'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Period Header Section */}
                      <div className={`p-3.5 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isCurrentNow ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50/80 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                            isCurrentNow ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'
                          }`}>
                            P{p.periodNumber}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                                {p.khmerPeriodName || p.periodName}
                              </h4>
                              <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                                {p.startTime} - {p.endTime}
                              </span>
                              {isCurrentNow && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  <span>{isKhmer ? 'កំពុងដំណើរការ' : 'Live Now'}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                              {p.periodName} • {group.classes.length} {isKhmer ? 'ថ្នាក់បង្រៀនក្នុងម៉ោងនេះ' : 'classes scheduled'}
                            </p>
                          </div>
                        </div>

                        {/* Period Attendance Stats Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold font-mono">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {group.stats.present} {isKhmer ? 'មានវត្តមាន' : 'Present'}
                          </span>
                          {group.stats.late > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                              {group.stats.late} {isKhmer ? 'យឺត' : 'Late'}
                            </span>
                          )}
                          {group.stats.inProgress > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-300">
                              {group.stats.inProgress} {isKhmer ? 'កំពុងបង្រៀន' : 'In Session'}
                            </span>
                          )}
                          {group.stats.missed > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300">
                              {group.stats.missed} {isKhmer ? 'អវត្តមាន' : 'Missed'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Period Classes Cards */}
                      <div className="p-3.5 sm:p-4">
                        {group.classes.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            {isKhmer ? 'គ្មានថ្នាក់បង្រៀនដែលបានកំណត់ក្នុងម៉ោងនេះទេ' : 'No classes scheduled for this period.'}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {group.classes.map(({ teacher, cell }) => {
                              const sched = cell.schedule!;
                              const isPresent = cell.status === 'Present';
                              const isLate = cell.status === 'Late';
                              const isInProgress = cell.status === 'In Progress';
                              const isAbsent = cell.status === 'Absent' || cell.status === 'Leave';

                              return (
                                <div
                                  key={`${teacher.id}-${cell.period.id}`}
                                  onClick={() => setSelectedCellModal({ teacher, cell })}
                                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                                    isInProgress
                                      ? 'bg-sky-50/60 border-sky-300 shadow-xs ring-1 ring-sky-300'
                                      : isPresent
                                      ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/70'
                                      : isLate
                                      ? 'bg-amber-50/40 border-amber-200 hover:bg-amber-50/70'
                                      : isAbsent
                                      ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/70'
                                      : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                                  }`}
                                >
                                  {/* Teacher & Subject Header */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs font-khmer">
                                        {(teacher.khmerName || teacher.fullName).charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <h5 className="font-black text-slate-900 text-xs truncate font-khmer">
                                          {teacher.khmerName || teacher.fullName}
                                        </h5>
                                        <p className="text-[10px] text-slate-500 font-sans truncate">
                                          {teacher.khmerName && teacher.fullName ? `${teacher.fullName} • ` : ''}{teacher.department}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="shrink-0">
                                      {isPresent ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          <span>{cell.checkInTime || 'Present'}</span>
                                        </span>
                                      ) : isLate ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                          <Clock className="w-3 h-3 text-amber-600" />
                                          <span>+{cell.lateMinutes}m</span>
                                        </span>
                                      ) : isInProgress ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300 animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                                          <span>Active</span>
                                        </span>
                                      ) : isAbsent ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                          <XCircle className="w-3 h-3 text-rose-600" />
                                          <span>{cell.substitution ? (isKhmer ? 'ជំនួស' : 'Sub') : (isKhmer ? 'អវត្តមាន' : 'Absent')}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                          <Clock className="w-3 h-3 text-slate-400" />
                                          <span>Sched</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Subject Title */}
                                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="font-extrabold text-slate-900 text-xs truncate">
                                        {sched.subject}
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                        {sched.gradeClass && (
                                          <span className="flex items-center gap-1">
                                            <Users2 className="w-3 h-3 text-slate-400" />
                                            <span>{sched.gradeClass}</span>
                                          </span>
                                        )}
                                        {sched.room && (
                                          <span className="flex items-center gap-1 font-mono">
                                            <MapPin className="w-3 h-3 text-slate-400" />
                                            <span>{sched.room}</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="p-1 rounded-lg bg-slate-100 text-slate-400 group-hover:text-indigo-600 shrink-0">
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            /* Timeline Sub-view 2: Grouped by Teacher (Teacher profile with vertical period step track) */
            <div className="space-y-4">
              {gridRows.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-sm">
                    {isKhmer ? 'ពុំមានកាលវិភាគបង្រៀនសម្រាប់កាលបរិច្ឆេទនេះទេ' : 'No teacher schedules found for this date.'}
                  </p>
                </div>
              ) : (
                gridRows.map((row) => {
                  // Filter cells if a specific period is selected
                  const displayCells = selectedPeriodFilter === 'All'
                    ? row.cells.filter(c => c.schedule)
                    : row.cells.filter(c => c.period.periodNumber === selectedPeriodFilter && c.schedule);

                  if (displayCells.length === 0 && selectedPeriodFilter !== 'All') {
                    return null;
                  }

                  return (
                    <div
                      key={row.teacher.id}
                      className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-indigo-300"
                    >
                      {/* Teacher Card Header */}
                      <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs font-khmer">
                            {(row.teacher.khmerName || row.teacher.fullName).charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate font-khmer">
                                {row.teacher.khmerName || row.teacher.fullName}
                              </h4>
                              {row.subjectCode && (
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded text-[9px] sm:text-[10px]">
                                  {row.subjectCode}
                                </span>
                              )}
                              {row.teacher.id === currentUser.personId && (
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] sm:text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono">{row.teacher.teacherId}</span>
                              {row.teacher.khmerName && row.teacher.fullName && (
                                <span className="font-sans">• {row.teacher.fullName}</span>
                              )}
                              <span>•</span>
                              <span className="text-slate-600 font-medium">{row.teacher.department}</span>
                            </div>
                          </div>
                        </div>

                        {/* Day Attendance Rate Pill */}
                        <div className="text-right shrink-0">
                          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 font-mono text-[11px] sm:text-xs font-bold">
                            <span className="text-emerald-700 font-extrabold">{row.attendedCount}</span>
                            <span className="text-slate-400">/{row.scheduledPeriodsCount}</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] sm:text-[10px] font-black ${
                              row.attendanceRate >= 80 ? 'bg-emerald-100 text-emerald-800' :
                              row.attendanceRate >= 50 ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {row.attendanceRate}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Vertical Timeline Track */}
                      <div className="p-3.5 sm:p-5">
                        {displayCells.length === 0 ? (
                          <div className="py-4 text-center text-slate-400 text-xs italic">
                            {isKhmer ? 'គ្មានម៉ោងបង្រៀនក្នុងម៉ោងនេះទេ' : 'No classes scheduled for this period.'}
                          </div>
                        ) : (
                          <div className="relative pl-6 sm:pl-8 space-y-3.5 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                            {displayCells.map((cell) => {
                              const sched = cell.schedule!;
                              const isPresent = cell.status === 'Present';
                              const isLate = cell.status === 'Late';
                              const isInProgress = cell.status === 'In Progress';
                              const isAbsent = cell.status === 'Absent' || cell.status === 'Leave';

                              return (
                                <div
                                  key={cell.period.id}
                                  className="relative group cursor-pointer"
                                  onClick={() => setSelectedCellModal({ teacher: row.teacher, cell })}
                                >
                                  {/* Timeline Dot */}
                                  <div className={`absolute -left-6 sm:-left-8 top-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 bg-white flex items-center justify-center transition-transform group-hover:scale-110 z-10 ${
                                    isPresent ? 'border-emerald-500 text-emerald-600' :
                                    isLate ? 'border-amber-500 text-amber-600' :
                                    isInProgress ? 'border-sky-500 text-sky-600 ring-2 ring-sky-200' :
                                    isAbsent ? 'border-rose-500 text-rose-600' :
                                    'border-slate-300 text-slate-400'
                                  }`}>
                                    {isPresent ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> :
                                     isLate ? <Clock className="w-2.5 h-2.5 text-amber-600" /> :
                                     isInProgress ? <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" /> :
                                     isAbsent ? <XCircle className="w-2.5 h-2.5 text-rose-600" /> :
                                     <span className="w-1 h-1 rounded-full bg-slate-300" />}
                                  </div>

                                  {/* Timeline Class Item Box */}
                                  <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
                                    isInProgress ? 'bg-sky-50/70 border-sky-300 shadow-xs ring-1 ring-sky-300' :
                                    isPresent ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/70' :
                                    isLate ? 'bg-amber-50/40 border-amber-200 hover:bg-amber-50/70' :
                                    isAbsent ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/70' :
                                    'bg-slate-50/70 border-slate-200 hover:bg-white'
                                  }`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                      {/* Period info & Subject */}
                                      <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white font-mono">
                                            {cell.period.periodName}
                                          </span>
                                          <span className="text-xs font-mono font-bold text-slate-700">
                                            {cell.period.startTime} - {cell.period.endTime}
                                          </span>
                                          {cell.period.khmerPeriodName && (
                                            <span className="text-[11px] text-slate-500 font-khmer">
                                              ({cell.period.khmerPeriodName})
                                            </span>
                                          )}
                                        </div>

                                        <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                                          <span>{sched.subject}</span>
                                          {sched.subjectCode && (
                                            <span className="text-xs text-indigo-600 font-mono">
                                              ({sched.subjectCode})
                                            </span>
                                          )}
                                        </h5>

                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                          {sched.gradeClass && (
                                            <span className="flex items-center gap-1">
                                              <Users2 className="w-3.5 h-3.5 text-slate-400" />
                                              <span>{sched.gradeClass}</span>
                                            </span>
                                          )}
                                          {sched.room && (
                                            <span className="flex items-center gap-1">
                                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                              <span className="font-mono">{sched.room}</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Status Badges & Quick Action */}
                                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                        {isPresent ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>{isKhmer ? 'មានវត្តមាន' : 'Present'} {cell.checkInTime ? `(${cell.checkInTime})` : ''}</span>
                                          </span>
                                        ) : isLate ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                                            <span>{isKhmer ? 'មកយឺត' : 'Late'} +{cell.lateMinutes}m {cell.checkInTime ? `(${cell.checkInTime})` : ''}</span>
                                          </span>
                                        ) : isInProgress ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-sky-100 text-sky-800 border border-sky-300 animate-pulse">
                                            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                                            <span>{isKhmer ? 'កំពុងបង្រៀន' : 'In Session'}</span>
                                          </span>
                                        ) : isAbsent ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                            <span>
                                              {cell.substitution ? (isKhmer ? 'មានគ្រូជំនួស' : 'Sub Assigned') :
                                               cell.status === 'Leave' ? (isKhmer ? 'សុំច្បាប់' : 'On Leave') :
                                               (isKhmer ? 'ខកខាន' : 'Missed')}
                                            </span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{isKhmer ? 'តាមកាលវិភាគ' : 'Scheduled'}</span>
                                          </span>
                                        )}

                                        {/* Tap detail arrow */}
                                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                          <ChevronRight className="w-4 h-4" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLE GRID VIEW (Full Desktop & Responsive Scrolling) */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
      <div className="space-y-3 animate-in fade-in duration-200">
        {/* Mobile View Recommendation Banner */}
        <div className="md:hidden bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-indigo-900 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">{isKhmer ? 'ប្តូរទៅទិដ្ឋភាព Timeline ងាយស្រួលមើលលើទូរស័ព្ទ' : 'Timeline view is recommended for mobile screens.'}</span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px] shrink-0 hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
          >
            {isKhmer ? 'ប្តូរជា Timeline' : 'Switch to Timeline'}
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              {/* Top Period Header Row */}
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-700">
                
                {/* Fixed Index Column */}
                <th className="py-2.5 sm:py-3 px-1.5 sm:px-2.5 text-center w-7 sm:w-8 border-r border-slate-200 sticky left-0 bg-slate-50 z-20">
                  #
                </th>

                {/* Fixed Faculty Name Column */}
                <th className="py-2.5 sm:py-3 px-2 sm:px-3.5 min-w-[130px] sm:min-w-[190px] border-r border-slate-200 sticky left-7 sm:left-8 bg-slate-50 z-20">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">{isKhmer ? 'គ្រូបង្រៀន / មុខវិជ្ជា' : 'Faculty Member'}</span>
                  </div>
                </th>

                {/* Fixed Dept Column */}
                <th className="py-3 px-2 text-center w-24 border-r border-slate-200 hidden md:table-cell">
                  {isKhmer ? 'ផ្នែក' : 'Dept'}
                </th>

                {/* Period Columns Header */}
                {filteredPeriods.map(p => {
                  const isCurrentNow = isDateToday && (curMinutes >= AttendanceEngine.timeToMinutes(p.startTime) && curMinutes <= AttendanceEngine.timeToMinutes(p.endTime));

                  return (
                    <th
                      key={p.id}
                      className={`py-2 px-2 text-center min-w-[110px] max-w-[130px] border-r border-slate-200 transition-colors ${
                        isCurrentNow
                          ? 'bg-blue-50/90 text-blue-900 ring-2 ring-blue-500/40 ring-inset'
                          : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <div className="flex items-center gap-1">
                          <span className="font-black text-xs text-slate-900">
                            {p.periodName}
                          </span>
                          {isCurrentNow && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" title="Active Now" />
                          )}
                        </div>
                        {p.khmerPeriodName && (
                          <span className="text-[10px] font-khmer text-slate-500 font-normal">
                            {p.khmerPeriodName}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5 font-semibold">
                          {p.startTime} - {p.endTime}
                        </span>
                      </div>
                    </th>
                  );
                })}

                {/* Summary Metrics */}
                <th className="py-3 px-2 text-center w-16 border-r border-slate-200 font-bold text-slate-700">
                  {isKhmer ? 'វត្តមាន' : 'Attended'}
                </th>
                <th className="py-3 px-2 text-center w-14 font-black text-indigo-700 bg-indigo-50/40">
                  %
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {gridRows.length === 0 ? (
                <tr>
                  <td colSpan={filteredPeriods.length + 5} className="py-16 text-center text-slate-400 text-xs">
                    {isKhmer ? 'ពុំមានទិន្នន័យគ្រូបង្រៀន ឬកាលវិភាគសម្រាប់ថ្ងៃនេះ' : 'No teacher schedules found for this date.'}
                  </td>
                </tr>
              ) : (
                gridRows.map((row, idx) => (
                  <tr key={row.teacher.id} className="hover:bg-slate-50/60 transition-colors">
                    
                    {/* Index */}
                    <td className="py-3 px-2 text-center font-mono text-[10px] text-slate-400 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                      {idx + 1}
                    </td>

                    {/* Teacher Name Column */}
                    <td className="py-3 px-2 sm:px-3.5 border-r border-slate-100 sticky left-7 sm:left-8 bg-white group-hover:bg-slate-50 z-10 min-w-[130px] sm:min-w-[190px]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 font-khmer">
                          {(row.teacher.khmerName || row.teacher.fullName).charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          {isAdmin ? (
                            <>
                              <div className="font-extrabold text-slate-900 truncate text-xs flex items-center gap-1.5 font-khmer">
                                <span>{row.teacher.khmerName || row.teacher.fullName}</span>
                                {row.subjectCode && (
                                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1 py-0.2 rounded text-[9px]">
                                    {row.subjectCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                <span className="font-mono">{row.teacher.teacherId}</span>
                                {row.teacher.khmerName && row.teacher.fullName && <span className="font-sans">• {row.teacher.fullName}</span>}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-extrabold text-slate-900 truncate text-xs flex items-center gap-1.5 font-khmer">
                                <span>{row.teacher.khmerName || row.teacher.fullName}</span>
                                {row.subjectCode && (
                                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1 py-0.2 rounded text-[9px]">
                                    {row.subjectCode}
                                  </span>
                                )}
                                {row.teacher.id === currentUser.personId && (
                                  <span className="text-[10px] text-emerald-600 font-bold">(You)</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {row.teacher.department}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Dept */}
                    <td className="py-3 px-2 text-center text-[11px] text-slate-600 border-r border-slate-100 hidden md:table-cell truncate max-w-[90px]">
                      {row.teacher.department}
                    </td>

                    {/* Period Cells */}
                    {row.cells.map(cell => {
                      if (!cell.schedule) {
                        return (
                          <td
                            key={cell.period.id}
                            className="py-2.5 px-2 text-center border-r border-slate-100/70 text-slate-300 font-mono text-[11px]"
                          >
                            <span className="text-slate-300 select-none">-</span>
                          </td>
                        );
                      }

                      const sched = cell.schedule;
                      const isPresent = cell.status === 'Present';
                      const isLate = cell.status === 'Late';
                      const isInProgress = cell.status === 'In Progress';
                      const isAbsent = cell.status === 'Absent' || cell.status === 'Leave';
                      const isUpcoming = cell.status === 'Upcoming';

                      return (
                        <td
                          key={cell.period.id}
                          onClick={() => setSelectedCellModal({ teacher: row.teacher, cell })}
                          className={`py-2 px-2 border-r border-slate-100/80 cursor-pointer transition-all hover:scale-[1.02] ${
                            isPresent
                              ? 'bg-emerald-50/50 hover:bg-emerald-100/60'
                              : isLate
                              ? 'bg-amber-50/50 hover:bg-amber-100/60'
                              : isInProgress
                              ? 'bg-sky-50/60 hover:bg-sky-100/70 ring-1 ring-sky-300 ring-inset'
                              : isAbsent
                              ? 'bg-rose-50/50 hover:bg-rose-100/60'
                              : 'bg-slate-50/40 hover:bg-slate-100/60'
                          }`}
                        >
                          <div className="space-y-1">
                            {/* Subject & Code */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-slate-900 truncate text-[11px]" title={sched.subject}>
                                {sched.subjectCode || sched.subject}
                              </span>
                              {sched.room && (
                                <span className="text-[9px] text-slate-400 font-mono shrink-0">
                                  {sched.room}
                                </span>
                              )}
                            </div>

                            {/* Class info */}
                            <div className="text-[10px] text-slate-500 font-medium truncate">
                              {sched.gradeClass || ''}
                            </div>

                            {/* Status badge strip */}
                            <div className="flex items-center justify-between pt-0.5">
                              {isPresent ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>{cell.checkInTime || 'Present'}</span>
                                </span>
                              ) : isLate ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300">
                                  <Clock className="w-2.5 h-2.5 text-amber-600" />
                                  <span>+{cell.lateMinutes}m</span>
                                </span>
                              ) : isInProgress ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-sky-800 bg-sky-100/90 px-1.5 py-0.5 rounded border border-sky-300 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                                  <span>Active</span>
                                </span>
                              ) : isAbsent ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-800 bg-rose-100/90 px-1.5 py-0.5 rounded border border-rose-300">
                                    <XCircle className="w-2.5 h-2.5 text-rose-600" />
                                    <span>
                                      {cell.substitution
                                        ? (isKhmer ? 'មានគ្រូជំនួស' : 'Sub Assigned')
                                        : cell.status === 'Leave'
                                        ? (isKhmer ? 'សុំច្បាប់' : 'On Leave')
                                        : (isKhmer ? 'អវត្តមាន' : 'Absent')}
                                    </span>
                                  </span>
                                  {cell.substitution && (
                                    <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-purple-800 bg-purple-100 px-1 py-0.5 rounded border border-purple-200 truncate max-w-[90px]" title={`Covered by ${cell.substitution.substituteName}`}>
                                      <UserCheck className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                      <span className="truncate">{cell.substitution.substituteName}</span>
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                                  <span>Sched</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    {/* Attended count */}
                    <td className="py-3 px-2 text-center border-r border-slate-100 font-mono font-bold text-slate-800 text-xs">
                      <span className="text-emerald-700 font-extrabold">{row.attendedCount}</span>
                      <span className="text-slate-400">/{row.scheduledPeriodsCount}</span>
                    </td>

                    {/* Attendance Rate */}
                    <td className="py-3 px-2 text-center font-black text-indigo-700 bg-indigo-50/20 text-xs">
                      {row.attendanceRate}%
                    </td>

                  </tr>
                ))
              )}
            </tbody>

            {/* Bottom Summary: Classes per Period */}
            {gridRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-black text-[10px] text-slate-700 border-t-2 border-slate-200">
                  <td colSpan={2} className="py-2.5 px-3.5 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 text-left font-black">
                    {isKhmer ? 'វត្តមានសរុបតាមម៉ោង (Period Totals)' : 'Period Attendance Summary'}
                  </td>
                  <td className="border-r border-slate-200 hidden md:table-cell"></td>
                  {periodColumnTotals.map(tot => (
                    <td
                      key={tot.periodNumber}
                      className="py-2 px-1 text-center border-r border-slate-200 text-[10px]"
                    >
                      <div className="font-mono">
                        <span className="text-emerald-700 font-bold">{tot.totalActiveOrPresent}</span>
                        <span className="text-slate-400">/{tot.scheduled}</span>
                      </div>
                      {tot.absent > 0 && (
                        <div className="text-[9px] text-rose-600 font-bold">
                          {tot.absent} missed
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="py-2 px-1 text-center text-emerald-800 font-mono font-bold">
                    {dailyKpis.presentClasses + dailyKpis.lateClasses}
                  </td>
                  <td className="py-2 px-1 text-center text-indigo-700 font-bold">
                    {dailyKpis.totalClasses > 0
                      ? Math.round(((dailyKpis.presentClasses + dailyKpis.lateClasses) / dailyKpis.totalClasses) * 100)
                      : 100}%
                  </td>
                </tr>
              </tfoot>
            )}

          </table>
        </div>

        {/* Footer info note */}
        <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {isKhmer
                ? `វត្តមានតាមម៉ោងសម្រាប់ ${dayNameKm} ${formattedDisplayDate}។ ចុចលើប្រអប់ម៉ោងដើម្បីស្កេនចូល ឬកែសម្រួល។`
                : `Period attendance timetable for ${dayNameEn}, ${formattedDisplayDate}. Click any period cell to punch or inspect details.`}
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-slate-600">
            {gridRows.length} {isKhmer ? 'គ្រូបង្រៀន' : 'Faculty Included'}
          </span>
        </div>

      </div>
    </div>
    )}

      {/* Period Cell Inspection & Quick Check-In Modal */}
      {selectedCellModal && selectedCellModal.cell.schedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-300 block">
                  {selectedCellModal.cell.period.periodName} • {selectedCellModal.cell.period.startTime} - {selectedCellModal.cell.period.endTime}
                </span>
                <h3 className="text-base font-extrabold flex items-center gap-2 mt-0.5">
                  <span>{selectedCellModal.cell.schedule.subject}</span>
                  {selectedCellModal.cell.schedule.subjectCode && (
                    <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[10px] font-mono">
                      {selectedCellModal.cell.schedule.subjectCode}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 font-khmer">
                  {selectedCellModal.teacher.khmerName || selectedCellModal.teacher.fullName} {selectedCellModal.teacher.khmerName && selectedCellModal.teacher.fullName ? `(${selectedCellModal.teacher.fullName})` : ''} ({selectedCellModal.teacher.department})
                </p>
              </div>
              <button
                onClick={() => setSelectedCellModal(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Class Details Strip */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">{isKhmer ? 'ថ្នាក់រៀន៖' : 'Grade / Class:'}</span>
                  <span className="font-extrabold text-slate-900">{selectedCellModal.cell.schedule.gradeClass || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">{isKhmer ? 'បន្ទប់សិក្សា៖' : 'Room:'}</span>
                  <span className="font-extrabold text-slate-900">{selectedCellModal.cell.schedule.room || 'Main Hall'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">{isKhmer ? 'ស្ថានភាព៖' : 'Status:'}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedCellModal.cell.status === 'Present'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : selectedCellModal.cell.status === 'Late'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : selectedCellModal.cell.status === 'In Progress'
                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                      : selectedCellModal.cell.status === 'Absent'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedCellModal.cell.status}
                  </span>
                </div>
              </div>

              {/* Punch Logs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl">
                  <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wide">
                    {isKhmer ? 'ស្កេនចូល (Check-In)' : 'Check-In Punch'}
                  </span>
                  <span className="text-sm font-black font-mono text-emerald-900 block mt-1">
                    {selectedCellModal.cell.checkInTime || '--:--'}
                  </span>
                  {selectedCellModal.cell.lateMinutes && selectedCellModal.cell.lateMinutes > 0 ? (
                    <span className="text-[10px] font-bold text-amber-700 block mt-0.5">
                      ⚠️ {selectedCellModal.cell.lateMinutes} mins late
                    </span>
                  ) : null}
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl">
                  <span className="text-[10px] text-indigo-700 font-bold block uppercase tracking-wide">
                    {isKhmer ? 'ស្កេនចេញ (Check-Out)' : 'Check-Out Punch'}
                  </span>
                  <span className="text-sm font-black font-mono text-indigo-900 block mt-1">
                    {selectedCellModal.cell.checkOutTime || '--:--'}
                  </span>
                </div>
              </div>

              {/* Substitution Details if active */}
              {selectedCellModal.cell.substitution && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center justify-between text-purple-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      <span>{isKhmer ? 'ការចាត់តាំងបង្រៀនជំនួស (គ្រូដើមអវត្តមាន)' : 'Substitute Coverage (Absent Teacher)'}</span>
                    </span>
                    <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-semibold">
                      {selectedCellModal.cell.substitution.assignees?.length || 1} {isKhmer ? 'នាក់' : 'assignee(s)'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedCellModal.cell.substitution.assignees && selectedCellModal.cell.substitution.assignees.length > 0 ? (
                      selectedCellModal.cell.substitution.assignees.map((a, i) => (
                        <div key={a.id || i} className="p-2 bg-white rounded-xl border border-purple-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block">{a.substituteName}</span>
                            <span className="text-[10px] text-slate-500">
                              {a.substituteType === 'employee' ? (isKhmer ? 'បុគ្គលិក (Staff)' : 'Staff Member') : (isKhmer ? 'គ្រូបង្រៀន' : 'Teacher')} • {a.startTime} – {a.endTime} ({a.allocatedHours} hrs)
                            </span>
                          </div>
                          <span className="font-mono font-bold text-purple-800 text-xs">
                            {a.substituteType === 'employee'
                              ? `${isKhmer ? 'ឈ្នួលកំណត់៖' : 'Wage:'} $${Number(a.manualGrossWage ?? 0).toFixed(2)}`
                              : `${isKhmer ? 'ឈ្នួល៖' : 'Wage:'} $${Number(a.calculatedWage ?? 0).toFixed(2)}`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 bg-white rounded-xl border border-purple-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{selectedCellModal.cell.substitution.substituteName}</span>
                        <span className="text-purple-700 font-bold text-[11px]">
                          {selectedCellModal.cell.substitution.substituteType === 'employee' ? (isKhmer ? 'បុគ្គលិក' : 'Staff') : (isKhmer ? 'គ្រូ' : 'Teacher')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Check-In / Check-Out Actions for this class */}
              <div className="pt-2 flex flex-col gap-2">
                {/* Admin Assign Substitute Button */}
                {currentUser && currentUser.role !== 'teacher' && (
                  <button
                    type="button"
                    onClick={() => {
                      const s = selectedCellModal.cell.schedule!;
                      setSubstituteTargetSchedule(s);
                      setSubstituteTargetExisting(selectedCellModal.cell.substitution || StorageService.findSubstitution(s.id, selectedDate) || null);
                      setSelectedCellModal(null);
                      setIsSubstituteModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-purple-600" />
                    <span>
                      {selectedCellModal.cell.substitution
                        ? (isKhmer ? 'កែប្រែការចាត់តាំងជំនួស (Edit Substitutes)' : 'Edit Substitute Assignment')
                        : (isKhmer ? 'ចាត់តាំងគ្រូ ឬបុគ្គលិកជំនួស (អវត្តមាន)' : 'Assign Teacher or Staff Substitute')}
                    </span>
                  </button>
                )}

                {!selectedCellModal.cell.checkInTime ? (
                  <button
                    onClick={() => handlePerformCheckIn(selectedCellModal.teacher, selectedCellModal.cell.schedule!)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isKhmer ? 'ស្កេនចូលម៉ោងនេះ (Check-in Now)' : 'Check-in to this Period'}</span>
                  </button>
                ) : !selectedCellModal.cell.checkOutTime ? (
                  <button
                    onClick={() => handlePerformCheckOut(selectedCellModal.teacher, selectedCellModal.cell.schedule!)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isKhmer ? 'ស្កេនចេញពីម៉ោងនេះ (Check-out Now)' : 'Check-out from this Period'}</span>
                  </button>
                ) : null}

                {onRequestCorrection && (
                  <button
                    onClick={() => {
                      const t = selectedCellModal.teacher;
                      const s = selectedCellModal.cell.schedule!;
                      const c = selectedCellModal.cell;
                      setSelectedCellModal(null);
                      onRequestCorrection({
                        personId: t.id,
                        personName: t.fullName,
                        khmerName: t.khmerName,
                        personType: 'teacher',
                        date: selectedDate,
                        subject: s.subject,
                        subjectCode: s.subjectCode,
                        gradeClass: s.gradeClass,
                        room: s.room,
                        scheduledStart: s.startTime,
                        scheduledEnd: s.endTime,
                        periodName: c.period.periodName,
                        checkInTime: c.checkInTime,
                        checkOutTime: c.checkOutTime
                      });
                    }}
                    className="w-full py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-xs transition-colors"
                  >
                    {isKhmer ? 'ស្នើសុំកែសម្រួលម៉ោង (Request Correction)' : 'Request Correction for this Period'}
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Schedule Substitute Assignment Modal */}
      {isSubstituteModalOpen && (
        <ScheduleSubstituteModal
          isOpen={isSubstituteModalOpen}
          onClose={() => {
            setIsSubstituteModalOpen(false);
            setSubstituteTargetSchedule(null);
            setSubstituteTargetExisting(null);
          }}
          schedule={substituteTargetSchedule}
          selectedDate={selectedDate}
          teachers={teachers}
          employees={employees}
          currentUser={currentUser}
          existingSubstitution={substituteTargetExisting}
          onSuccess={() => {
            setAttendance(StorageService.getAttendance());
          }}
        />
      )}

    </div>
  );
};
