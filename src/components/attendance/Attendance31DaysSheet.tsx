import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceRecord, Teacher, Employee, Holiday, LeaveRequest, AttendanceStatus } from '../../types/index.ts';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Search,
  Filter,
  Users2,
  GraduationCap,
  Clock,
  Building,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Palmtree,
  Info,
  X,
  FileSpreadsheet,
  Check,
  ChevronDown
} from 'lucide-react';

interface Attendance31DaysSheetProps {
  onRequestCorrection?: (record?: Partial<AttendanceRecord>) => void;
}

interface StaffRowData {
  id: string;
  code: string;
  name: string;
  khmerName?: string;
  type: 'Teacher' | 'Employee';
  dept: string;
  subjectCode?: string;
  hourlyRate?: number;
  avatarUrl?: string;
}

interface DayCellDetail {
  dayNum: number;
  dateStr: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon ...
  isWeekend: boolean;
  isToday: boolean;
  isValidDay: boolean; // within month's days
  status: 'Present' | 'Late' | 'Absent' | 'Leave' | 'Holiday' | 'Weekly Off' | 'Missing Check-out' | 'No Record' | 'Future' | 'N/A';
  badgeLetter: string;
  checkIn?: string;
  checkOut?: string;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  subject?: string;
  gradeClass?: string;
  room?: string;
  recordsCount: number;
  record?: AttendanceRecord;
}

export const Attendance31DaysSheet: React.FC<Attendance31DaysSheetProps> = ({
  onRequestCorrection
}) => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [staffTypeFilter, setStaffTypeFilter] = useState<'All' | 'Teacher' | 'Employee'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCellDetail, setSelectedCellDetail] = useState<{
    staff: StaffRowData;
    cell: DayCellDetail;
  } | null>(null);

  // Storage data
  const [departments, setDepartments] = useState(() => StorageService.getDepartments());
  const [teachers, setTeachers] = useState(() => StorageService.getTeachers().filter(t => t.status === 'Active'));
  const [employees, setEmployees] = useState(() => StorageService.getEmployees().filter(e => e.status === 'Active'));
  const [attendance, setAttendance] = useState(() => StorageService.getAttendance());
  const [holidays, setHolidays] = useState(() => StorageService.getHolidays());
  const [leaveRequests, setLeaveRequests] = useState(() => StorageService.getLeaveRequests());
  const [subjectSchedules, setSubjectSchedules] = useState(() => StorageService.getSubjectSchedules());
  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSystemSettings());

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setDepartments(StorageService.getDepartments());
      setTeachers(StorageService.getTeachers().filter(t => t.status === 'Active'));
      setEmployees(StorageService.getEmployees().filter(e => e.status === 'Active'));
      setAttendance(StorageService.getAttendance());
      setHolidays(StorageService.getHolidays());
      setLeaveRequests(StorageService.getLeaveRequests());
      setSubjectSchedules(StorageService.getSubjectSchedules());
      setSystemSettings(StorageService.getSystemSettings());
    });
    return unsub;
  }, []);

  const isAdmin =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin_hr' ||
    currentUser.role === 'supervisor' ||
    (!['teacher', 'employee'].includes(currentUser.role) && (hasPermission('attendance.view') || hasPermission('reports.view')));

  // Calculate month specifics
  const { year, monthNum, daysInMonth, monthLabel } = useMemo(() => {
    const parts = selectedMonth.split('-');
    const y = parseInt(parts[0], 10) || today.getFullYear();
    const m = parseInt(parts[1], 10) || (today.getMonth() + 1);
    const numDays = new Date(y, m, 0).getDate();

    const monthNamesEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthNamesKm = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];

    const labelEn = `${monthNamesEn[m - 1]} ${y}`;
    const labelKm = `ខែ${monthNamesKm[m - 1]} ឆ្នាំ ${y}`;

    return {
      year: y,
      monthNum: m,
      daysInMonth: numDays,
      monthLabel: isKhmer ? labelKm : labelEn
    };
  }, [selectedMonth, isKhmer, today]);

  // Generate 31 day headers definitions
  const dayHeaders = useMemo(() => {
    const days = [];
    const weekdayShortEn = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const weekdayShortKm = ['អា', 'ច', 'អ', 'ព', 'ព្រ', 'សុ', 'ស'];

    for (let d = 1; d <= 31; d++) {
      const isValidDay = d <= daysInMonth;
      if (isValidDay) {
        const dateObj = new Date(year, monthNum - 1, d);
        const dayOfWeek = dateObj.getDay();
        const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = dateStr === todayStr;
        const isHoliday = holidays.some(h => h.date === dateStr);

        days.push({
          dayNum: d,
          dayStr: String(d).padStart(2, '0'),
          dateStr,
          dayOfWeek,
          weekdayEn: weekdayShortEn[dayOfWeek],
          weekdayKm: weekdayShortKm[dayOfWeek],
          isWeekend,
          isToday,
          isHoliday,
          isValidDay: true
        });
      } else {
        // Beyond the month boundary (e.g. Day 31 in 30-day month, or 29..31 in Feb)
        days.push({
          dayNum: d,
          dayStr: String(d).padStart(2, '0'),
          dateStr: '',
          dayOfWeek: -1,
          weekdayEn: '--',
          weekdayKm: '--',
          isWeekend: false,
          isToday: false,
          isHoliday: false,
          isValidDay: false
        });
      }
    }
    return days;
  }, [year, monthNum, daysInMonth, holidays, todayStr]);

  // Combine and filter staff list
  const staffList = useMemo<StaffRowData[]>(() => {
    const teacherRows: StaffRowData[] = teachers.map(t => {
      // Find representative subject code
      const teacherSchedules = subjectSchedules.filter(s => s.teacherId === t.id);
      const subCode = teacherSchedules.find(s => s.subjectCode)?.subjectCode ||
                      (t.subject ? t.subject.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() + '-01' : 'TCH-01');

      return {
        id: t.id,
        code: t.teacherId,
        name: t.fullName,
        khmerName: t.khmerName,
        type: 'Teacher',
        dept: t.department || 'Academic',
        subjectCode: subCode,
        hourlyRate: t.hourlyRate,
        avatarUrl: t.photoUrl
      };
    });

    const employeeRows: StaffRowData[] = employees.map(e => ({
      id: e.id,
      code: e.employeeId,
      name: e.fullName,
      khmerName: e.khmerName,
      type: 'Employee',
      dept: e.department || 'Operations',
      subjectCode: '',
      hourlyRate: 0,
      avatarUrl: e.photoUrl
    }));

    let combined = [...teacherRows, ...employeeRows];

    // Department security filter
    combined = combined.filter(s => canAccessDepartment(s.dept));

    // Role restriction: if logged-in is teacher or employee and not admin, only show self
    if (currentUser.role === 'teacher' || currentUser.role === 'employee') {
      combined = combined.filter(
        s => s.id === currentUser.personId ||
             s.id === currentUser.id ||
             (currentUser.email && s.name.toLowerCase() === currentUser.fullName.toLowerCase())
      );
    }

    // Filter by staff type
    if (staffTypeFilter !== 'All') {
      combined = combined.filter(s => s.type === staffTypeFilter);
    }

    // Filter by department
    if (selectedDept !== 'All') {
      combined = combined.filter(s => s.dept === selectedDept);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      combined = combined.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.khmerName && s.khmerName.toLowerCase().includes(q)) ||
        s.code.toLowerCase().includes(q) ||
        (s.subjectCode && s.subjectCode.toLowerCase().includes(q)) ||
        s.dept.toLowerCase().includes(q)
      );
    }

    return combined;
  }, [teachers, employees, subjectSchedules, canAccessDepartment, currentUser, staffTypeFilter, selectedDept, searchQuery]);

  // Compute status for each staff across all 31 days
  const gridData = useMemo(() => {
    return staffList.map(staff => {
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let holidayCount = 0;
      let offDayCount = 0;
      let totalLateMinutes = 0;
      let totalWorkMinutes = 0;

      const cells: DayCellDetail[] = dayHeaders.map(header => {
        if (!header.isValidDay) {
          return {
            dayNum: header.dayNum,
            dateStr: '',
            dayOfWeek: -1,
            isWeekend: false,
            isToday: false,
            isValidDay: false,
            status: 'N/A',
            badgeLetter: '',
            recordsCount: 0
          };
        }

        const dateStr = header.dateStr;
        const records = attendance.filter(
          a => (a.personId === staff.id || a.personName?.toLowerCase() === staff.name.toLowerCase()) && a.date === dateStr
        );

        if (records.length > 0) {
          // Find most significant record
          const hasLate = records.find(r => r.status === 'Late' || (r.lateMinutes && r.lateMinutes > 0));
          const hasLeave = records.find(r => r.status === 'Leave');
          const hasAbsent = records.find(r => r.status === 'Absent');
          const hasHoliday = records.find(r => r.status === 'Holiday');
          const hasOff = records.find(r => r.status === 'Off Day');
          const hasMissing = records.find(r => r.status === 'Missing Check-out');
          const hasPresent = records.find(r => r.status === 'Present');

          const primaryRecord = hasLate || hasPresent || hasMissing || hasLeave || hasAbsent || hasHoliday || hasOff || records[0];

          let cellStatus: DayCellDetail['status'] = 'Present';
          let letter = 'P';

          if (hasLate) {
            cellStatus = 'Late';
            letter = 'L';
            lateCount++;
            totalLateMinutes += (hasLate.lateMinutes || 0);
          } else if (hasMissing) {
            cellStatus = 'Missing Check-out';
            letter = 'M';
            presentCount++;
          } else if (hasPresent) {
            cellStatus = 'Present';
            letter = 'P';
            presentCount++;
          } else if (hasLeave) {
            cellStatus = 'Leave';
            letter = 'LV';
            leaveCount++;
          } else if (hasHoliday) {
            cellStatus = 'Holiday';
            letter = 'H';
            holidayCount++;
          } else if (hasOff) {
            cellStatus = 'Weekly Off';
            letter = 'W';
            offDayCount++;
          } else if (hasAbsent) {
            cellStatus = 'Absent';
            letter = 'A';
            absentCount++;
          } else {
            cellStatus = 'Present';
            letter = 'P';
            presentCount++;
          }

          // Compute duration
          records.forEach(r => {
            if (r.checkInTime && r.checkOutTime) {
              const [ih, im] = r.checkInTime.split(':').map(Number);
              const [oh, om] = r.checkOutTime.split(':').map(Number);
              const diff = (oh * 60 + om) - (ih * 60 + im);
              if (diff > 0) totalWorkMinutes += diff;
            } else if (r.status === 'Present' || r.status === 'Late') {
              totalWorkMinutes += 120; // 2 hour default session
            }
          });

          return {
            dayNum: header.dayNum,
            dateStr,
            dayOfWeek: header.dayOfWeek,
            isWeekend: header.isWeekend,
            isToday: header.isToday,
            isValidDay: true,
            status: cellStatus,
            badgeLetter: letter,
            checkIn: primaryRecord.checkInTime,
            checkOut: primaryRecord.checkOutTime,
            lateMinutes: primaryRecord.lateMinutes,
            earlyLeaveMinutes: primaryRecord.earlyLeaveMinutes,
            overtimeMinutes: primaryRecord.overtimeMinutes,
            subject: primaryRecord.subject,
            gradeClass: primaryRecord.gradeClass,
            room: primaryRecord.room,
            recordsCount: records.length,
            record: primaryRecord
          };
        }

        // No record exists
        if (dateStr > todayStr) {
          // Future date
          return {
            dayNum: header.dayNum,
            dateStr,
            dayOfWeek: header.dayOfWeek,
            isWeekend: header.isWeekend,
            isToday: header.isToday,
            isValidDay: true,
            status: 'Future',
            badgeLetter: '',
            recordsCount: 0
          };
        }

        if (header.isHoliday) {
          holidayCount++;
          return {
            dayNum: header.dayNum,
            dateStr,
            dayOfWeek: header.dayOfWeek,
            isWeekend: header.isWeekend,
            isToday: header.isToday,
            isValidDay: true,
            status: 'Holiday',
            badgeLetter: 'H',
            recordsCount: 0
          };
        }

        // Check if person on approved leave
        const onLeave = leaveRequests.some(
          l => l.personId === staff.id && l.status === 'Approved' && l.startDate <= dateStr && l.endDate >= dateStr
        );
        if (onLeave) {
          leaveCount++;
          return {
            dayNum: header.dayNum,
            dateStr,
            dayOfWeek: header.dayOfWeek,
            isWeekend: header.isWeekend,
            isToday: header.isToday,
            isValidDay: true,
            status: 'Leave',
            badgeLetter: 'LV',
            recordsCount: 0
          };
        }

        if (header.isWeekend) {
          offDayCount++;
          return {
            dayNum: header.dayNum,
            dateStr,
            dayOfWeek: header.dayOfWeek,
            isWeekend: header.isWeekend,
            isToday: header.isToday,
            isValidDay: true,
            status: 'Weekly Off',
            badgeLetter: 'W',
            recordsCount: 0
          };
        }

        // Past weekday with no log -> Absent
        absentCount++;
        return {
          dayNum: header.dayNum,
          dateStr,
          dayOfWeek: header.dayOfWeek,
          isWeekend: header.isWeekend,
          isToday: header.isToday,
          isValidDay: true,
          status: 'Absent',
          badgeLetter: 'A',
          recordsCount: 0
        };
      });

      const totalWorkHours = (totalWorkMinutes / 60).toFixed(1);
      const totalDutyDays = presentCount + lateCount + absentCount;
      const attendanceRate = totalDutyDays > 0 ? Math.round(((presentCount + lateCount) / totalDutyDays) * 100) : 100;

      return {
        staff,
        cells,
        presentCount,
        lateCount,
        absentCount,
        leaveCount,
        holidayCount,
        offDayCount,
        totalLateMinutes,
        totalWorkHours,
        attendanceRate
      };
    });
  }, [staffList, dayHeaders, attendance, todayStr, leaveRequests]);

  // Aggregate totals per day across all staff for bottom summary row
  const daySummaryTotals = useMemo(() => {
    return dayHeaders.map((header, idx) => {
      if (!header.isValidDay) return { present: 0, late: 0, absent: 0, leave: 0, total: 0 };
      let present = 0;
      let late = 0;
      let absent = 0;
      let leave = 0;

      gridData.forEach(row => {
        const cell = row.cells[idx];
        if (cell.status === 'Present') present++;
        else if (cell.status === 'Late') late++;
        else if (cell.status === 'Absent') absent++;
        else if (cell.status === 'Leave') leave++;
      });

      return {
        present,
        late,
        absent,
        leave,
        total: present + late
      };
    });
  }, [dayHeaders, gridData]);

  // Overall KPIs for the month
  const overallKpi = useMemo(() => {
    return gridData.reduce(
      (acc, row) => ({
        present: acc.present + row.presentCount,
        late: acc.late + row.lateCount,
        absent: acc.absent + row.absentCount,
        leave: acc.leave + row.leaveCount,
        lateMins: acc.lateMins + row.totalLateMinutes
      }),
      { present: 0, late: 0, absent: 0, leave: 0, lateMins: 0 }
    );
  }, [gridData]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const parts = selectedMonth.split('-');
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const parts = selectedMonth.split('-');
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const dayCols = Array.from({ length: 31 }, (_, i) => `Day ${String(i + 1).padStart(2, '0')}`);
    const headers = [
      'No',
      'Staff ID',
      'Staff Name',
      'Khmer Name',
      'Role',
      'Department',
      'Subject Code',
      ...dayCols,
      'Total Present',
      'Total Late',
      'Total Absent',
      'Total Leave',
      'Total Work Hours',
      'Attendance %'
    ];

    const rows = gridData.map((row, idx) => {
      const cellValues = row.cells.map(c => {
        if (!c.isValidDay) return 'N/A';
        if (c.status === 'Future') return '-';
        if (c.status === 'Late') return `L(${c.lateMinutes || 0}m)`;
        if (c.status === 'Present') return 'P';
        if (c.status === 'Absent') return 'A';
        if (c.status === 'Leave') return 'LV';
        if (c.status === 'Holiday') return 'H';
        if (c.status === 'Weekly Off') return 'W';
        if (c.status === 'Missing Check-out') return 'M';
        return '-';
      });

      return [
        idx + 1,
        row.staff.code,
        `"${row.staff.name}"`,
        `"${row.staff.khmerName || ''}"`,
        row.staff.type,
        `"${row.staff.dept}"`,
        `"${row.staff.subjectCode || ''}"`,
        ...cellValues,
        row.presentCount,
        row.lateCount,
        row.absentCount,
        row.leaveCount,
        row.totalWorkHours,
        `${row.attendanceRate}%`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_31Days_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isKhmer ? 'បានទាញយកតារាងវត្តមាន ៣១ ថ្ងៃដោយជោគជ័យ' : 'Exported 31-day attendance records to CSV', 'info');
  };

  // Print 31-day sheet
  const handlePrintSheet = () => {
    const orgName = systemSettings?.organizationName || 'EDUCATION MANAGEMENT SYSTEM';
    const khmerOrgName = systemSettings?.khmerOrgName || 'ប្រព័ន្ធគ្រប់គ្រងគ្រឹះស្ថានអប់រំ';

    const dayHeadersHtml = dayHeaders.map(h => `
      <th style="border: 1px solid #cbd5e1; padding: 4px 2px; text-align: center; width: 22px; font-size: 9px; ${h.isWeekend ? 'background-color: #f1f5f9; color: #64748b;' : ''}">
        <div style="font-weight: 800;">${h.dayStr}</div>
        <div style="font-size: 7px; color: #64748b;">${h.weekdayEn}</div>
      </th>
    `).join('');

    const staffRowsHtml = gridData.map((row, idx) => {
      const cellsHtml = row.cells.map(c => {
        if (!c.isValidDay) return `<td style="border: 1px solid #cbd5e1; text-align: center; font-size: 8px; color: #cbd5e1; background: #f8fafc;">•</td>`;
        if (c.status === 'Present') return `<td style="border: 1px solid #cbd5e1; text-align: center; font-size: 9px; font-weight: 800; color: #047857; background: #ecfdf5;">P</td>`;
        if (c.status === 'Late') return `<td style="border: 1px solid #cbd5e1; text-align: center; font-size: 9px; font-weight: 800; color: #b45309; background: #fffbeb;">L</td>`;
        if (c.status === 'Absent') return `<td style="border: 1px solid #cbd5e1; text-align: center; font-size: 9px; font-weight: 800; color: #b91c1c; background: #fef2f2;">A</td>`;
        if (c.status === 'Leave') return `<td style="border: 1px solid #cbd5e1; text-align: center; font-size: 8px; font-weight: 700; color: #6d28d9; background: #f5f3ff;">LV</td>`;
        if (c.status === 'Holiday') return `<td style="border: 1px solid #cbd5e1; text-align: center; font-size: 9px; font-weight: 700; color: #0369a1; background: #f0f9ff;">H</td>`;
        if (c.status === 'Weekly Off') return `<td style="border: 1px solid #cbd5e1; text-align: center; font-size: 8px; color: #94a3b8; background: #f8fafc;">W</td>`;
        if (c.status === 'Missing Check-out') return `<td style="border: 1px solid #cbd5e1; text-align: center; font-size: 8px; font-weight: 700; color: #c2410c; background: #fff7ed;">M</td>`;
        return `<td style="border: 1px solid #cbd5e1; text-align: center; font-size: 8px; color: #94a3b8;">-</td>`;
      }).join('');

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 9px;">
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; font-family: monospace; font-weight: 700;">${row.staff.code}</td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; font-weight: 700; white-space: nowrap;">
            ${row.staff.name}
            ${row.staff.khmerName ? `<span style="font-size: 8px; color: #64748b; font-weight: 400; display: block;">${row.staff.khmerName}</span>` : ''}
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; color: #475569;">${row.staff.dept}</td>
          ${cellsHtml}
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 700; color: #047857;">${row.presentCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 700; color: #b45309;">${row.lateCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 700; color: #b91c1c;">${row.absentCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 700; color: #6d28d9;">${row.leaveCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-family: monospace; font-weight: 800;">${row.totalWorkHours}h</td>
          <td style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-weight: 800;">${row.attendanceRate}%</td>
        </tr>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocker prevented print window', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>31-Day Attendance Records - ${monthLabel}</title>
        <style>
          @page {
            size: landscape;
            margin: 8mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Khmer OS", Arial, sans-serif;
            margin: 0;
            padding: 8px;
            color: #0f172a;
            font-size: 10px;
          }
          .title-area {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .org-title {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            margin: 0;
          }
          .khmer-title {
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
            margin: 2px 0 0 0;
          }
          .sheet-title {
            font-size: 13px;
            font-weight: 800;
            color: #047857;
            text-transform: uppercase;
            margin-top: 4px;
          }
          .legend-bar {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-bottom: 8px;
            font-size: 9px;
            font-weight: 600;
          }
          .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .legend-badge {
            display: inline-block;
            width: 14px;
            height: 14px;
            line-height: 14px;
            text-align: center;
            border-radius: 3px;
            font-weight: bold;
            font-size: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          th {
            background-color: #f8fafc;
            color: #0f172a;
          }
          .signatures {
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 10px;
          }
          .signature-box {
            width: 28%;
          }
          .sign-line {
            margin-top: 50px;
            border-top: 1px dashed #64748b;
            padding-top: 4px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="title-area">
          <h1 class="org-title">${orgName}</h1>
          <div class="khmer-title">${khmerOrgName}</div>
          <div class="sheet-title">31-DAY ATTENDANCE ROSTER & AUDIT REGISTER (តារាងស្រង់វត្តមាន ៣១ ថ្ងៃ) • ${monthLabel}</div>
        </div>

        <div class="legend-bar">
          <div class="legend-item"><span class="legend-badge" style="background:#ecfdf5; color:#047857; border:1px solid #6ee7b7;">P</span> Present (មានវត្តមាន)</div>
          <div class="legend-item"><span class="legend-badge" style="background:#fffbeb; color:#b45309; border:1px solid #fcd34d;">L</span> Late (មកយឺត)</div>
          <div class="legend-item"><span class="legend-badge" style="background:#fef2f2; color:#b91c1c; border:1px solid #fca5a5;">A</span> Absent (អវត្តមាន)</div>
          <div class="legend-item"><span class="legend-badge" style="background:#f5f3ff; color:#6d28d9; border:1px solid #d8b4fe;">LV</span> Leave (សុំច្បាប់)</div>
          <div class="legend-item"><span class="legend-badge" style="background:#f0f9ff; color:#0369a1; border:1px solid #7dd3fc;">H</span> Holiday (បុណ្យ)</div>
          <div class="legend-item"><span class="legend-badge" style="background:#f8fafc; color:#64748b; border:1px solid #cbd5e1;">W</span> Weekly Off (សម្រាក)</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 24px;">No</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 65px;">ID</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; min-width: 130px; text-align: left;">Staff Name / Faculty</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 75px; text-align: left;">Dept</th>
              ${dayHeadersHtml}
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 24px; color:#047857;">P</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 24px; color:#b45309;">L</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 24px; color:#b91c1c;">A</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 24px; color:#6d28d9;">LV</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 38px;">Hours</th>
              <th style="border: 1px solid #cbd5e1; padding: 4px; width: 32px;">%</th>
            </tr>
          </thead>
          <tbody>
            ${staffRowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div class="signature-box">
            <div>Prepared By (រៀបចំដោយ)</div>
            <div class="sign-line">HR Officer / Registrar</div>
          </div>
          <div class="signature-box">
            <div>Verified By (ត្រួតពិនិត្យដោយ)</div>
            <div class="sign-line">Head of Department / Academic Dean</div>
          </div>
          <div class="signature-box">
            <div>Approved By (អនុម័តដោយ)</div>
            <div class="sign-line">School Principal / Director</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Render cell badge
  const renderCellBadge = (cell: DayCellDetail) => {
    if (!cell.isValidDay) {
      return (
        <span className="w-5 h-5 flex items-center justify-center text-[10px] text-slate-300 font-mono">
          -
        </span>
      );
    }

    if (cell.status === 'Future') {
      return (
        <span className="w-5 h-5 flex items-center justify-center text-[10px] text-slate-300">
          •
        </span>
      );
    }

    if (cell.status === 'Present') {
      return (
        <div
          title={`Present - ${cell.checkIn ? `${cell.checkIn} to ${cell.checkOut || 'end'}` : 'Recorded'}`}
          className="w-5 h-5 rounded-md bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 font-black text-[9px] flex items-center justify-center shadow-2xs hover:scale-110 transition-transform"
        >
          P
        </div>
      );
    }

    if (cell.status === 'Late') {
      return (
        <div
          title={`Late (${cell.lateMinutes || 0}m) - In: ${cell.checkIn || '--'}`}
          className="w-5 h-5 rounded-md bg-amber-100/90 text-amber-800 border border-amber-300/80 font-black text-[9px] flex items-center justify-center shadow-2xs hover:scale-110 transition-transform"
        >
          L
        </div>
      );
    }

    if (cell.status === 'Missing Check-out') {
      return (
        <div
          title={`Missing Check-out - In: ${cell.checkIn || '--'}`}
          className="w-5 h-5 rounded-md bg-orange-100 text-orange-800 border border-orange-300 font-black text-[9px] flex items-center justify-center shadow-2xs hover:scale-110 transition-transform"
        >
          M
        </div>
      );
    }

    if (cell.status === 'Absent') {
      return (
        <div
          title="Unexcused Absence"
          className="w-5 h-5 rounded-md bg-rose-100/90 text-rose-800 border border-rose-300/80 font-black text-[9px] flex items-center justify-center shadow-2xs hover:scale-110 transition-transform"
        >
          A
        </div>
      );
    }

    if (cell.status === 'Leave') {
      return (
        <div
          title="Excused Leave"
          className="w-5 h-5 rounded-md bg-purple-100 text-purple-800 border border-purple-300 font-bold text-[8px] flex items-center justify-center shadow-2xs hover:scale-110 transition-transform"
        >
          LV
        </div>
      );
    }

    if (cell.status === 'Holiday') {
      return (
        <div
          title="Official School Holiday"
          className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 border border-sky-300 font-bold text-[9px] flex items-center justify-center shadow-2xs hover:scale-110 transition-transform"
        >
          H
        </div>
      );
    }

    if (cell.status === 'Weekly Off') {
      return (
        <div
          title="Weekly Off / Weekend"
          className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 border border-slate-200/80 font-medium text-[8px] flex items-center justify-center"
        >
          W
        </div>
      );
    }

    return (
      <span className="w-5 h-5 flex items-center justify-center text-[10px] text-slate-400">
        -
      </span>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Top Controls Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Month Navigator & Search */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Month Selector with Steppers */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-3">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent border-0 text-xs sm:text-sm font-black text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Current Month Button */}
          {selectedMonth !== currentMonthStr && (
            <button
              onClick={() => setSelectedMonth(currentMonthStr)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors"
            >
              {isKhmer ? 'ខែបច្ចុប្បន្ន' : 'Current Month'}
            </button>
          )}

          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកឈ្មោះ លេខកូដ...' : 'Search staff, ID, code...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Right: Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Staff Type Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setStaffTypeFilter('All')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${staffTypeFilter === 'All' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
            >
              {isKhmer ? 'ទាំងអស់' : 'All'}
            </button>
            <button
              onClick={() => setStaffTypeFilter('Teacher')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${staffTypeFilter === 'Teacher' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
            >
              <GraduationCap className="w-3 h-3 text-indigo-600" />
              <span>{isKhmer ? 'គ្រូ' : 'Teachers'}</span>
            </button>
            <button
              onClick={() => setStaffTypeFilter('Employee')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${staffTypeFilter === 'Employee' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
            >
              <Users2 className="w-3 h-3 text-emerald-600" />
              <span>{isKhmer ? 'បុគ្គលិក' : 'Employees'}</span>
            </button>
          </div>

          {/* Department Filter */}
          {currentUser.role !== 'teacher' && currentUser.role !== 'employee' && (
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden"
            >
              <option value="All">{isKhmer ? 'គ្រប់ផ្នែកទាំងអស់' : 'All Departments'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrintSheet}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Print 31-Day Attendance Sheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKhmer ? 'បោះពុម្ព' : 'Print'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isKhmer ? 'ទាញយក CSV' : 'Export CSV'}</span>
          </button>

        </div>

      </div>

      {/* Legend & Month Summary Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-600">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            {isKhmer ? 'កំណត់សម្គាល់៖' : 'Legend:'}
          </span>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8px] font-black flex items-center justify-center">P</span>
            <span className="text-[11px] text-slate-700">{isKhmer ? 'វត្តមាន (Present)' : 'Present'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-md bg-amber-100 text-amber-800 border border-amber-300 text-[8px] font-black flex items-center justify-center">L</span>
            <span className="text-[11px] text-slate-700">{isKhmer ? 'យឺត (Late)' : 'Late'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[8px] font-black flex items-center justify-center">A</span>
            <span className="text-[11px] text-slate-700">{isKhmer ? 'អវត្តមាន (Absent)' : 'Absent'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-md bg-purple-100 text-purple-800 border border-purple-300 text-[7px] font-black flex items-center justify-center">LV</span>
            <span className="text-[11px] text-slate-700">{isKhmer ? 'សុំច្បាប់ (Leave)' : 'Leave'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-md bg-sky-100 text-sky-800 border border-sky-300 text-[8px] font-black flex items-center justify-center">H</span>
            <span className="text-[11px] text-slate-700">{isKhmer ? 'បុណ្យ (Holiday)' : 'Holiday'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[8px] font-bold flex items-center justify-center">W</span>
            <span className="text-[11px] text-slate-700">{isKhmer ? 'សម្រាក (Off)' : 'Off Day'}</span>
          </div>
        </div>

        {/* Quick Month Metrics */}
        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
            {overallKpi.present} {isKhmer ? 'វត្តមាន' : 'Present'}
          </span>
          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
            {overallKpi.late} {isKhmer ? 'យឺត' : 'Late'}
          </span>
          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
            {overallKpi.absent} {isKhmer ? 'អវត្តមាន' : 'Absent'}
          </span>
          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
            {overallKpi.leave} {isKhmer ? 'ច្បាប់' : 'Leave'}
          </span>
        </div>

      </div>

      {/* 31-Day Header Attendance Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              {/* Header Row: Column Titles & 31 Day Numbers */}
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-700">
                
                {/* Fixed Info Columns */}
                <th className="py-2.5 px-2.5 text-center w-8 border-r border-slate-200/80 sticky left-0 bg-slate-50 z-20">
                  #
                </th>
                <th className="py-2.5 px-3 min-w-[190px] border-r border-slate-200/80 sticky left-8 bg-slate-50 z-20">
                  {isKhmer ? 'គ្រូ / បុគ្គលិក (Staff Member)' : 'Staff Member / Faculty'}
                </th>
                <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200/80 hidden md:table-cell">
                  {isKhmer ? 'ផ្នែក' : 'Dept'}
                </th>

                {/* 31 Day Columns */}
                {dayHeaders.map(h => (
                  <th
                    key={h.dayNum}
                    className={`py-1.5 px-0.5 text-center min-w-[27px] max-w-[29px] border-r border-slate-200/60 transition-colors ${
                      h.isToday
                        ? 'bg-indigo-50/90 text-indigo-900 border-indigo-200'
                        : h.isWeekend
                        ? 'bg-slate-100/80 text-slate-500'
                        : h.isHoliday
                        ? 'bg-sky-50 text-sky-800'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <span className={`text-[11px] font-black ${h.isToday ? 'text-indigo-700 underline decoration-2' : ''}`}>
                        {h.dayStr}
                      </span>
                      <span className={`text-[8px] font-semibold uppercase ${h.isWeekend ? 'text-slate-400' : 'text-slate-500'}`}>
                        {isKhmer ? h.weekdayKm : h.weekdayEn}
                      </span>
                    </div>
                  </th>
                ))}

                {/* Summary Metrics Columns */}
                <th className="py-2.5 px-2 text-center w-9 border-r border-slate-200/80 font-black text-emerald-700 bg-emerald-50/50" title="Total Present">
                  P
                </th>
                <th className="py-2.5 px-2 text-center w-9 border-r border-slate-200/80 font-black text-amber-700 bg-amber-50/50" title="Total Late">
                  L
                </th>
                <th className="py-2.5 px-2 text-center w-9 border-r border-slate-200/80 font-black text-rose-700 bg-rose-50/50" title="Total Absent">
                  A
                </th>
                <th className="py-2.5 px-2 text-center w-9 border-r border-slate-200/80 font-black text-purple-700 bg-purple-50/50" title="Total Leave">
                  LV
                </th>
                <th className="py-2.5 px-2 text-center w-14 border-r border-slate-200/80 font-mono font-bold text-slate-800" title="Estimated Hours">
                  {isKhmer ? 'ម៉ោង' : 'Hours'}
                </th>
                <th className="py-2.5 px-2 text-center w-12 font-black text-indigo-700 bg-indigo-50/40" title="Attendance Rate">
                  %
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {gridData.length === 0 ? (
                <tr>
                  <td colSpan={39} className="py-16 text-center text-slate-400 text-xs">
                    {isKhmer ? 'ពុំមានទិន្នន័យបុគ្គលិក ឬវត្តមានសម្រាប់លក្ខខណ្ឌដែលបានជ្រើសរើស' : 'No faculty or staff found for the selected month/department.'}
                  </td>
                </tr>
              ) : (
                gridData.map((row, idx) => {
                  const isTeacher = row.staff.type === 'Teacher';

                  return (
                    <tr key={row.staff.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Fixed Index Column */}
                      <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-400 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                        {idx + 1}
                      </td>

                      {/* Fixed Staff Name Column */}
                      <td className="py-2 px-3 border-r border-slate-100 sticky left-8 bg-white group-hover:bg-slate-50 z-10 min-w-[190px]">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
                            isTeacher ? 'bg-indigo-600' : 'bg-emerald-600'
                          }`}>
                            {row.staff.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            {/* Admin sees Full Name + Subject Code + Khmer Name */}
                            {isAdmin ? (
                              <>
                                <div className="font-extrabold text-slate-900 truncate text-xs flex items-center gap-1.5">
                                  <span>{row.staff.name}</span>
                                  {row.staff.subjectCode && (
                                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1 rounded text-[9px]">
                                      {row.staff.subjectCode}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                  <span className="font-mono">{row.staff.code}</span>
                                  {row.staff.khmerName && <span>• {row.staff.khmerName}</span>}
                                </div>
                              </>
                            ) : (
                              /* Non-admin viewing */
                              <>
                                <div className="font-extrabold text-slate-900 truncate text-xs flex items-center gap-1.5">
                                  {isTeacher ? (
                                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/90 px-1.5 py-0.5 rounded text-[10px]">
                                      {row.staff.subjectCode || row.staff.code}
                                    </span>
                                  ) : (
                                    <span>{row.staff.name}</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {row.staff.dept}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-2 px-2 text-center text-[11px] text-slate-600 border-r border-slate-100 hidden md:table-cell truncate max-w-[85px]">
                        {row.staff.dept}
                      </td>

                      {/* 31 Day Cells */}
                      {row.cells.map(cell => (
                        <td
                          key={cell.dayNum}
                          onClick={() => {
                            if (cell.isValidDay && cell.status !== 'Future' && cell.status !== 'N/A') {
                              setSelectedCellDetail({ staff: row.staff, cell });
                            }
                          }}
                          className={`py-1.5 px-0.5 text-center border-r border-slate-100/80 transition-colors ${
                            cell.isValidDay && cell.status !== 'Future' && cell.status !== 'N/A'
                              ? 'cursor-pointer hover:bg-indigo-50/50'
                              : ''
                          } ${
                            cell.isToday
                              ? 'bg-indigo-50/30'
                              : cell.isWeekend
                              ? 'bg-slate-50/60'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            {renderCellBadge(cell)}
                          </div>
                        </td>
                      ))}

                      {/* Summary Metrics Cells */}
                      <td className="py-2 px-1 text-center font-bold text-emerald-700 border-r border-slate-100 bg-emerald-50/20">
                        {row.presentCount}
                      </td>
                      <td className="py-2 px-1 text-center font-bold text-amber-700 border-r border-slate-100 bg-amber-50/20">
                        {row.lateCount}
                      </td>
                      <td className="py-2 px-1 text-center font-bold text-rose-700 border-r border-slate-100 bg-rose-50/20">
                        {row.absentCount}
                      </td>
                      <td className="py-2 px-1 text-center font-bold text-purple-700 border-r border-slate-100 bg-purple-50/20">
                        {row.leaveCount}
                      </td>
                      <td className="py-2 px-1 text-center font-mono font-bold text-slate-800 border-r border-slate-100 text-[11px]">
                        {row.totalWorkHours}h
                      </td>
                      <td className="py-2 px-1 text-center font-black text-indigo-700 bg-indigo-50/20 text-[11px]">
                        {row.attendanceRate}%
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Bottom Row: Day Totals Summary */}
            {gridData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-black text-[10px] text-slate-700 border-t-2 border-slate-200">
                  <td colSpan={2} className="py-2.5 px-3 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 text-left font-black">
                    {isKhmer ? 'សរុបវត្តមានប្រចាំថ្ងៃ (Daily Total Present)' : 'Daily Total Present'}
                  </td>
                  <td className="border-r border-slate-200 hidden md:table-cell"></td>
                  {daySummaryTotals.map((tot, idx) => (
                    <td
                      key={idx}
                      className="py-2 px-0.5 text-center border-r border-slate-200/80 font-mono"
                    >
                      {dayHeaders[idx].isValidDay ? (
                        <span className={`text-[10px] ${tot.total > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                          {tot.total}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  ))}
                  <td className="py-2 px-1 text-center text-emerald-800 bg-emerald-100/50 border-r border-slate-200">{overallKpi.present}</td>
                  <td className="py-2 px-1 text-center text-amber-800 bg-amber-100/50 border-r border-slate-200">{overallKpi.late}</td>
                  <td className="py-2 px-1 text-center text-rose-800 bg-rose-100/50 border-r border-slate-200">{overallKpi.absent}</td>
                  <td className="py-2 px-1 text-center text-purple-800 bg-purple-100/50 border-r border-slate-200">{overallKpi.leave}</td>
                  <td colSpan={2} className="py-2 px-2 text-center text-slate-500 font-normal">
                    {gridData.length} {isKhmer ? 'បុគ្គលិក' : 'Staff'}
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
                ? `បង្ហាញតារាងវត្តមាន ៣១ ថ្ងៃសម្រាប់ខែ ${monthLabel}។ ចុចលើប្រអប់ថ្ងៃនីមួយៗ ដើម្បីមើលព័ត៌មានលម្អិតម៉ោងស្កេន។`
                : `Showing 31-day attendance register for ${monthLabel}. Click any day cell to inspect punch timestamps.`}
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-slate-600">
            {gridData.length} {isKhmer ? 'នាក់ត្រូវបានរាប់បញ្ចូល' : 'Faculty & Staff Included'}
          </span>
        </div>

      </div>

      {/* Day Cell Detail Modal */}
      {selectedCellDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-300 block">
                  {selectedCellDetail.cell.dateStr}
                </span>
                <h3 className="text-base font-extrabold flex items-center gap-2 mt-0.5">
                  <span>{selectedCellDetail.staff.name}</span>
                  {selectedCellDetail.staff.subjectCode && (
                    <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[10px] font-mono">
                      {selectedCellDetail.staff.subjectCode}
                    </span>
                  )}
                </h3>
                {selectedCellDetail.staff.khmerName && (
                  <p className="text-xs text-slate-300 font-khmer mt-0.5">
                    {selectedCellDetail.staff.khmerName}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedCellDetail(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Status Badge Strip */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-600">
                  {isKhmer ? 'ស្ថានភាពវត្តមាន៖' : 'Attendance Status:'}
                </span>
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                  selectedCellDetail.cell.status === 'Present'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : selectedCellDetail.cell.status === 'Late'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : selectedCellDetail.cell.status === 'Absent'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : selectedCellDetail.cell.status === 'Leave'
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {selectedCellDetail.cell.status}
                </span>
              </div>

              {/* Punch Timestamps */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl">
                  <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wide">
                    {isKhmer ? 'ម៉ោងស្កេនចូល (Check-In)' : 'Check-In Punch'}
                  </span>
                  <span className="text-sm font-black font-mono text-emerald-900 block mt-1">
                    {selectedCellDetail.cell.checkIn || '--:--'}
                  </span>
                  {selectedCellDetail.cell.lateMinutes && selectedCellDetail.cell.lateMinutes > 0 ? (
                    <span className="text-[10px] font-bold text-amber-700 block mt-0.5">
                      ⚠️ {selectedCellDetail.cell.lateMinutes} mins late
                    </span>
                  ) : null}
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl">
                  <span className="text-[10px] text-indigo-700 font-bold block uppercase tracking-wide">
                    {isKhmer ? 'ម៉ោងស្កេនចេញ (Check-Out)' : 'Check-Out Punch'}
                  </span>
                  <span className="text-sm font-black font-mono text-indigo-900 block mt-1">
                    {selectedCellDetail.cell.checkOut || '--:--'}
                  </span>
                  {selectedCellDetail.cell.earlyLeaveMinutes && selectedCellDetail.cell.earlyLeaveMinutes > 0 ? (
                    <span className="text-[10px] font-bold text-rose-700 block mt-0.5">
                      ⚠️ {selectedCellDetail.cell.earlyLeaveMinutes} mins early leave
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Academic / Subject Details if applicable */}
              {(selectedCellDetail.cell.subject || selectedCellDetail.cell.gradeClass) && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">
                    {isKhmer ? 'ព័ត៌មានមុខវិជ្ជា និងថ្នាក់៖' : 'Class Session Details:'}
                  </span>
                  <div className="font-bold text-slate-800 text-xs">
                    {selectedCellDetail.cell.subject}
                    {selectedCellDetail.cell.gradeClass && ` • ${selectedCellDetail.cell.gradeClass}`}
                  </div>
                  {selectedCellDetail.cell.room && (
                    <div className="text-[11px] text-slate-500">
                      {isKhmer ? 'បន្ទប់សិក្សា៖ ' : 'Room: '} {selectedCellDetail.cell.room}
                    </div>
                  )}
                </div>
              )}

              {/* Location Verification Tag */}
              <div className="flex items-center justify-between text-slate-500 text-[11px] px-1">
                <span>{isKhmer ? 'ដេប៉ាតឺម៉ង់៖' : 'Department:'} <b>{selectedCellDetail.staff.dept}</b></span>
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kiosk / GPS Verified</span>
                </span>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedCellDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {isKhmer ? 'បិទ' : 'Close'}
              </button>

              {onRequestCorrection && (
                <button
                  onClick={() => {
                    const cell = selectedCellDetail.cell;
                    const staff = selectedCellDetail.staff;
                    setSelectedCellDetail(null);
                    onRequestCorrection({
                      personId: staff.id,
                      personName: staff.name,
                      khmerName: staff.khmerName,
                      personType: staff.type === 'Teacher' ? 'teacher' : 'employee',
                      date: cell.dateStr,
                      checkInTime: cell.checkIn,
                      checkOutTime: cell.checkOut,
                      subject: cell.subject,
                      gradeClass: cell.gradeClass,
                      department: staff.dept
                    });
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                >
                  {isKhmer ? 'ស្នើសុំកែសម្រួលវត្តមាន' : 'Request Correction'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
