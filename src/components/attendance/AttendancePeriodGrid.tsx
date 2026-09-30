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
  AttendanceStatus
} from '../../types/index.ts';
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
  Building
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
  const [groupView, setGroupView] = useState<'teacher' | 'class'>('teacher');
  const [selectedCellModal, setSelectedCellModal] = useState<{
    teacher: Teacher;
    cell: PeriodCellData;
  } | null>(null);

  // Storage subscriptions
  const [teachers, setTeachers] = useState(() => StorageService.getTeachers().filter(t => t.status === 'Active'));
  const [subjectSchedules, setSubjectSchedules] = useState(() => StorageService.getSubjectSchedules().filter(s => s.isActive));
  const [periods, setPeriods] = useState(() => StorageService.getPeriods().sort((a, b) => a.periodNumber - b.periodNumber));
  const [attendance, setAttendance] = useState(() => StorageService.getAttendance());
  const [departments, setDepartments] = useState(() => StorageService.getDepartments());
  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSystemSettings());

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setTeachers(StorageService.getTeachers().filter(t => t.status === 'Active'));
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
        const sched = teacherSchedules.find(
          s => s.periodNumber === period.periodNumber ||
               (s.startTime && period.startTime && s.startTime === period.startTime)
        );

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
        const attRec = AttendanceEngine.findRecordForSubjectSchedule(sched, attendance, selectedDate, teachers);

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

        return {
          period,
          schedule: sched,
          attendanceRecord: attRec,
          status: cellStatus,
          checkInTime: attRec?.checkInTime,
          checkOutTime: attRec?.checkOutTime,
          lateMinutes: attRec?.lateMinutes,
          isCurrentActivePeriod: isCurrentActive
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
    const res = AttendanceEngine.processCheckIn({
      personId: teacher.id,
      personType: 'teacher',
      personName: teacher.fullName,
      khmerName: teacher.khmerName,
      department: teacher.department,
      scheduleId: sched.id,
      subjectScheduleId: sched.id,
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
            ${row.teacher.fullName}
            ${row.teacher.khmerName ? `<span style="font-size: 7.5px; color: #64748b; font-weight: normal; display: block;">${row.teacher.khmerName}</span>` : ''}
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
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Date Selector with Steppers */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-2xs">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-indigo-600" />
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
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors"
            >
              {isKhmer ? 'ថ្ងៃនេះ (Today)' : 'Today'}
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isKhmer ? `ថ្ងៃនេះ: ${dayNameKm}` : `Today: ${dayNameEn}`}</span>
            </span>
          )}

          {/* Search box */}
          <div className="relative min-w-[190px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកគ្រូ មុខវិជ្ជា ថ្នាក់...' : 'Search teacher, class, code...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Right Controls: Shift, Department, Print, CSV */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Shift Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setShiftFilter('All')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${shiftFilter === 'All' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
            >
              {isKhmer ? 'គ្រប់ម៉ោង (All)' : 'All Periods'}
            </button>
            <button
              onClick={() => setShiftFilter('Morning')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${shiftFilter === 'Morning' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
            >
              {isKhmer ? 'ព្រឹក (P1-P5)' : 'Morning (P1-5)'}
            </button>
            <button
              onClick={() => setShiftFilter('Afternoon')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${shiftFilter === 'Afternoon' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
            >
              {isKhmer ? 'រសៀល (P6-P10)' : 'Afternoon (P6-10)'}
            </button>
          </div>

          {/* Department Filter */}
          {currentUser.role !== 'teacher' && (
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="All">{isKhmer ? 'គ្រប់ដេប៉ាតឺម៉ង់' : 'All Departments'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Print Period Attendance"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKhmer ? 'បោះពុម្ព' : 'Print'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isKhmer ? 'ទាញយក CSV' : 'Export CSV'}</span>
          </button>

        </div>

      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">
            {isKhmer ? 'ម៉ោងត្រូវបង្រៀនសរុប' : 'Total Scheduled'}
          </span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">{dailyKpis.totalClasses}</span>
          <span className="text-[10px] text-slate-500">{isKhmer ? 'ថ្នាក់ថ្ងៃនេះ' : 'classes today'}</span>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wide">
            {isKhmer ? 'មានវត្តមាន / ទាន់ពេល' : 'Present / On Time'}
          </span>
          <span className="text-xl font-black text-emerald-900 mt-0.5 block">{dailyKpis.presentClasses}</span>
          <span className="text-[10px] text-emerald-600">{isKhmer ? 'បានស្កេនចូល' : 'sessions logged'}</span>
        </div>

        <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wide">
            {isKhmer ? 'មកយឺត' : 'Late Arrival'}
          </span>
          <span className="text-xl font-black text-amber-900 mt-0.5 block">{dailyKpis.lateClasses}</span>
          <span className="text-[10px] text-amber-600">{isKhmer ? 'លើសម៉ោងកំណត់' : 'past grace period'}</span>
        </div>

        <div className="bg-sky-50/70 p-3.5 rounded-2xl border border-sky-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-sky-700 block tracking-wide">
            {isKhmer ? 'កំពុងបង្រៀន' : 'In Session Now'}
          </span>
          <span className="text-xl font-black text-sky-900 mt-0.5 block">{dailyKpis.inProgressClasses}</span>
          <span className="text-[10px] text-sky-600">{isKhmer ? 'ម៉ោងកំពុងដំណើរការ' : 'active right now'}</span>
        </div>

        <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-rose-700 block tracking-wide">
            {isKhmer ? 'ខកខាន / អវត្តមាន' : 'Missed / Absent'}
          </span>
          <span className="text-xl font-black text-rose-900 mt-0.5 block">{dailyKpis.missedClasses}</span>
          <span className="text-[10px] text-rose-600">{isKhmer ? 'មិនមានការស្កេន' : 'no check-in recorded'}</span>
        </div>
      </div>

      {/* Main Period Header Attendance Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              {/* Top Period Header Row */}
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-700">
                
                {/* Fixed Index Column */}
                <th className="py-3 px-2.5 text-center w-8 border-r border-slate-200 sticky left-0 bg-slate-50 z-20">
                  #
                </th>

                {/* Fixed Faculty Name Column */}
                <th className="py-3 px-3.5 min-w-[190px] border-r border-slate-200 sticky left-8 bg-slate-50 z-20">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>{isKhmer ? 'គ្រូបង្រៀន / មុខវិជ្ជា' : 'Faculty Member'}</span>
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
                    <td className="py-3 px-3.5 border-r border-slate-100 sticky left-8 bg-white group-hover:bg-slate-50 z-10 min-w-[190px]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {row.teacher.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          {isAdmin ? (
                            <>
                              <div className="font-extrabold text-slate-900 truncate text-xs flex items-center gap-1.5">
                                <span>{row.teacher.fullName}</span>
                                {row.subjectCode && (
                                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1 py-0.2 rounded text-[9px]">
                                    {row.subjectCode}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                <span className="font-mono">{row.teacher.teacherId}</span>
                                {row.teacher.khmerName && <span>• {row.teacher.khmerName}</span>}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-extrabold text-slate-900 truncate text-xs flex items-center gap-1.5">
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.5 rounded text-[10px]">
                                  {row.subjectCode}
                                </span>
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
                      const isAbsent = cell.status === 'Absent';
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
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-800 bg-rose-100/90 px-1.5 py-0.5 rounded border border-rose-300">
                                  <XCircle className="w-2.5 h-2.5 text-rose-600" />
                                  <span>Missed</span>
                                </span>
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
                <p className="text-xs text-slate-300 mt-0.5">
                  {selectedCellModal.teacher.fullName} ({selectedCellModal.teacher.department})
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

              {/* Quick Check-In / Check-Out Actions for this class */}
              <div className="pt-2 flex flex-col gap-2">
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

    </div>
  );
};
