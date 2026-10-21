import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Download,
  Calendar,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Building2,
  Sparkles,
  RefreshCw,
  X,
  FileSpreadsheet,
  Check,
  GraduationCap
} from 'lucide-react';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Teacher,
  TeacherSubjectSchedule,
  AttendanceRecord,
  TimetablePeriod
} from '../../types/index.ts';

interface DailyScheduleReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialTeacherId?: string;
}

export const DailyScheduleReconciliationModal: React.FC<DailyScheduleReconciliationModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialTeacherId
}) => {
  const { currentUser } = useAuth();
  const isTeacherRole = currentUser?.role === 'teacher';
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();

  // Load fresh database state
  const systemSettings = StorageService.getSystemSettings();
  const teachers: Teacher[] = StorageService.getTeachers();
  const subjectSchedules: TeacherSubjectSchedule[] = StorageService.getSubjectSchedules();
  const attendanceList: AttendanceRecord[] = StorageService.getAttendance();
  const periods: TimetablePeriod[] = StorageService.getPeriods();
  const departments = StorageService.getDepartments();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);

  // Active teacher resolution
  const activeTeacher = useMemo(() => {
    if (!currentUser) return null;
    if (initialTeacherId && initialTeacherId !== 'all') {
      const match = teachers.find(t => t.id === initialTeacherId || t.teacherId === initialTeacherId);
      if (match) return match;
    }
    if (currentUser.personId) {
      const match = teachers.find(t => t.id === currentUser.personId || t.teacherId?.toLowerCase() === currentUser.personId?.toLowerCase());
      if (match) return match;
    }
    if (currentUser.id) {
      const cleanId = currentUser.id.replace(/^usr-/, '');
      const match = teachers.find(t => t.id === cleanId || t.teacherId?.toLowerCase() === cleanId.toLowerCase());
      if (match) return match;
    }
    if (currentUser.email) {
      const match = teachers.find(t => t.email && t.email.toLowerCase() === currentUser.email.toLowerCase());
      if (match) return match;
    }
    if (currentUser.fullName) {
      const match = teachers.find(t => t.fullName.toLowerCase() === currentUser.fullName.toLowerCase());
      if (match) return match;
    }
    return isTeacherRole ? (teachers[0] || null) : null;
  }, [currentUser, isTeacherRole, initialTeacherId, teachers]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (isTeacherRole && activeTeacher) return activeTeacher.id;
    return initialTeacherId || 'all';
  });

  useEffect(() => {
    if (isTeacherRole && activeTeacher) {
      setSelectedTeacherId(activeTeacher.id);
    } else if (initialTeacherId) {
      setSelectedTeacherId(initialTeacherId);
    }
  }, [isTeacherRole, activeTeacher, initialTeacherId]);

  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Selected date day-of-week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const selectedDateObj = useMemo(() => new Date(selectedDate), [selectedDate]);
  const selectedDow = useMemo(() => {
    return isNaN(selectedDateObj.getTime()) ? 1 : selectedDateObj.getDay();
  }, [selectedDateObj]);

  const khmerDays = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Current system minutes for live status comparison
  const curTimeStr = AttendanceEngine.getCurrentTimeString();
  const curMins = AttendanceEngine.timeToMinutes(curTimeStr);
  const isSelectedDateToday = selectedDate === todayStr;

  // Schedules matching the selected day of week
  const daySchedules = useMemo(() => {
    return subjectSchedules.filter(sub => {
      if (!sub.isActive) return false;
      if (sub.daysOfWeek && Array.isArray(sub.daysOfWeek) && sub.daysOfWeek.length > 0) {
        return sub.daysOfWeek.includes(selectedDow);
      }
      return sub.dayOfWeek === selectedDow;
    });
  }, [subjectSchedules, selectedDow]);

  // Combined reconciliation rows
  const reconciliationRows = useMemo(() => {
    return daySchedules.map((sub, index) => {
      // Find matching teacher
      const teacher = teachers.find(
        t => t.id === sub.teacherId || t.teacherId === sub.teacherId || t.fullName === sub.teacherName
      );

      // Find matching attendance record in system
      const record = AttendanceEngine.findRecordForSubjectSchedule(
        sub,
        attendanceList,
        selectedDate,
        teachers
      );

      // Calculate scheduled minutes
      const schedStartMins = AttendanceEngine.timeToMinutes(sub.startTime);
      const schedEndMins = AttendanceEngine.timeToMinutes(sub.endTime);
      const schedDurationMins = schedEndMins > schedStartMins ? schedEndMins - schedStartMins : 0;
      const schedHours = schedDurationMins > 0 ? (schedDurationMins / 60).toFixed(1) : '0';

      // Check-in & Check-out details
      const checkInTime = record?.checkInTime || '';
      const checkOutTime = record?.checkOutTime || '';
      const hasCheckedIn = Boolean(checkInTime);
      const hasCheckedOut = Boolean(checkOutTime);

      let actualStartMins = 0;
      let actualEndMins = 0;
      let actualDurationMins = 0;
      let actualHours = '0';

      if (hasCheckedIn) {
        actualStartMins = AttendanceEngine.timeToMinutes(checkInTime);
        if (hasCheckedOut) {
          actualEndMins = AttendanceEngine.timeToMinutes(checkOutTime);
          actualDurationMins = actualEndMins > actualStartMins ? actualEndMins - actualStartMins : 0;
        } else if (isSelectedDateToday && curMins > actualStartMins) {
          actualDurationMins = Math.min(curMins - actualStartMins, schedDurationMins);
        }
        actualHours = actualDurationMins > 0 ? (actualDurationMins / 60).toFixed(1) : '0';
      }

      // Variance calculation
      let checkInVarianceMinutes = 0;
      let checkOutVarianceMinutes = 0;
      let statusType: 'on_time' | 'late' | 'in_session' | 'early_leave' | 'absent' | 'upcoming' | 'missed' = 'upcoming';
      let statusLabelKhmer = 'មិនទាន់ដល់ម៉ោង';
      let statusLabelEnglish = 'Upcoming';
      let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

      if (hasCheckedIn) {
        checkInVarianceMinutes = actualStartMins - schedStartMins;
        if (hasCheckedOut) {
          checkOutVarianceMinutes = schedEndMins - actualEndMins;
        }

        if (checkInVarianceMinutes > 15) {
          statusType = 'late';
          statusLabelKhmer = `មកយឺត +${checkInVarianceMinutes} នាទី`;
          statusLabelEnglish = `Late +${checkInVarianceMinutes}m`;
          badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
        } else if (hasCheckedOut && checkOutVarianceMinutes > 15) {
          statusType = 'early_leave';
          statusLabelKhmer = `ចេញមុន -${checkOutVarianceMinutes} នាទី`;
          statusLabelEnglish = `Left Early -${checkOutVarianceMinutes}m`;
          badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
        } else if (!hasCheckedOut && isSelectedDateToday && curMins >= schedStartMins && curMins < schedEndMins) {
          statusType = 'in_session';
          statusLabelKhmer = 'កំពុងបង្រៀន';
          statusLabelEnglish = 'In Session';
          badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
        } else {
          statusType = 'on_time';
          statusLabelKhmer = 'ទាន់ពេល ✓';
          statusLabelEnglish = 'On Time ✓';
          badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
        }
      } else {
        // Not checked in
        if (record?.status === 'Absent' || record?.status === 'Leave') {
          statusType = 'absent';
          statusLabelKhmer = record.status === 'Leave' ? 'ច្បាប់ (Leave)' : 'អវត្តមាន (Absent)';
          statusLabelEnglish = record.status;
          badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
        } else if (!isSelectedDateToday || curMins >= schedEndMins) {
          statusType = 'missed';
          statusLabelKhmer = 'ខកខាន Check-in';
          statusLabelEnglish = 'Missing Check-in';
          badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
        } else if (curMins >= schedStartMins && curMins < schedEndMins) {
          statusType = 'late';
          statusLabelKhmer = 'មិនទាន់ Check-in (យឺត)';
          statusLabelEnglish = 'No Check-in (Late)';
          badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
        } else {
          statusType = 'upcoming';
          statusLabelKhmer = 'មិនទាន់ដល់ម៉ោង';
          statusLabelEnglish = 'Upcoming';
          badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
        }
      }

      // Department fallback
      const department = teacher?.department || 'Academic & Curriculum';

      return {
        rowNo: index + 1,
        scheduleId: sub.id,
        teacherId: sub.teacherId,
        teacherCode: teacher?.teacherId || sub.teacherId,
        teacherName: sub.teacherName,
        khmerTeacherName: sub.khmerTeacherName || teacher?.khmerName || sub.teacherName,
        subject: sub.subject,
        khmerSubject: sub.khmerSubject || sub.subject,
        gradeClass: sub.gradeClass,
        room: sub.room || 'General Room',
        startTime: sub.startTime,
        endTime: sub.endTime,
        schedDurationMins,
        schedHours: parseFloat(schedHours),
        checkInTime: checkInTime || '—',
        checkOutTime: checkOutTime || (hasCheckedIn ? (statusType === 'in_session' ? 'In Session' : '—') : '—'),
        actualHours: parseFloat(actualHours),
        hasCheckedIn,
        hasCheckedOut,
        statusType,
        statusLabelKhmer,
        statusLabelEnglish,
        badgeClass,
        checkInVarianceMinutes,
        department,
        verifiedStatus: record?.isCorrected ? 'Corrected' : (record ? 'Recorded' : 'Pending'),
        remarks: record?.correctionNote || ''
      };
    });
  }, [daySchedules, teachers, attendanceList, selectedDate, isSelectedDateToday, curMins]);

  // Apply User Filters
  const filteredRows = useMemo(() => {
    return reconciliationRows.filter(row => {
      // Teacher filter
      if (selectedTeacherId !== 'all') {
        const matchesTeacher = row.teacherId === selectedTeacherId || row.teacherCode === selectedTeacherId;
        if (!matchesTeacher) return false;
      }

      // Department filter
      if (selectedDepartment !== 'all' && row.department !== selectedDepartment) return false;

      // Status filter
      if (selectedStatusFilter === 'checked_in' && !row.hasCheckedIn) return false;
      if (selectedStatusFilter === 'late' && row.statusType !== 'late') return false;
      if (selectedStatusFilter === 'on_time' && row.statusType !== 'on_time') return false;
      if (selectedStatusFilter === 'discrepancy' && row.statusType !== 'late' && row.statusType !== 'missed' && row.statusType !== 'early_leave') return false;
      if (selectedStatusFilter === 'missed' && row.statusType !== 'missed' && row.statusType !== 'absent') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = row.teacherName.toLowerCase().includes(q) || row.khmerTeacherName.toLowerCase().includes(q);
        const matchCode = row.teacherCode.toLowerCase().includes(q);
        const matchSubj = row.subject.toLowerCase().includes(q) || row.khmerSubject.toLowerCase().includes(q);
        const matchClass = row.gradeClass.toLowerCase().includes(q) || row.room.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchSubj && !matchClass) return false;
      }

      return true;
    });
  }, [reconciliationRows, selectedTeacherId, selectedDepartment, selectedStatusFilter, searchQuery]);

  // Calculate Summary Statistics
  const summaryStats = useMemo(() => {
    const totalScheduledClasses = filteredRows.length;
    const totalScheduledHours = filteredRows.reduce((sum, r) => sum + r.schedHours, 0);
    const totalCheckedIn = filteredRows.filter(r => r.hasCheckedIn).length;
    const totalOnTime = filteredRows.filter(r => r.statusType === 'on_time').length;
    const totalLate = filteredRows.filter(r => r.statusType === 'late').length;
    const totalMissed = filteredRows.filter(r => r.statusType === 'missed' || r.statusType === 'absent').length;
    const totalActualHours = filteredRows.reduce((sum, r) => sum + r.actualHours, 0);
    const checkInRate = totalScheduledClasses > 0 ? Math.round((totalCheckedIn / totalScheduledClasses) * 100) : 0;

    return {
      totalScheduledClasses,
      totalScheduledHours: totalScheduledHours.toFixed(1),
      totalCheckedIn,
      totalOnTime,
      totalLate,
      totalMissed,
      totalActualHours: totalActualHours.toFixed(1),
      checkInRate
    };
  }, [filteredRows]);

  // Trigger Print Dialog
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      showToast('No schedule records to export for this date', 'warning');
      return;
    }

    const headers = [
      'No',
      'Teacher ID',
      'Teacher Name (English)',
      'Teacher Name (Khmer)',
      'Department',
      'Subject',
      'Class/Grade',
      'Room',
      'Scheduled Start',
      'Scheduled End',
      'Scheduled Hours',
      'System Check-In',
      'System Check-Out',
      'Actual Hours Taught',
      'Variance Status',
      'Teacher Signature',
      'Supervisor Remark'
    ];

    const rows = filteredRows.map((r, i) => [
      i + 1,
      `"${r.teacherCode}"`,
      `"${r.teacherName}"`,
      `"${r.khmerTeacherName}"`,
      `"${r.department}"`,
      `"${r.subject}"`,
      `"${r.gradeClass}"`,
      `"${r.room}"`,
      r.startTime,
      r.endTime,
      r.schedHours,
      r.checkInTime,
      r.checkOutTime,
      r.actualHours,
      `"${isKhmer ? r.statusLabelKhmer : r.statusLabelEnglish}"`,
      '""',
      `"${r.remarks}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Teacher_Schedule_Checkin_Reconciliation_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported reconciliation sheet to CSV', 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* Modal Container */}
      <div className={`w-full ${orientation === 'landscape' ? 'max-w-6xl' : 'max-w-4xl'} bg-white text-slate-900 rounded-none sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[96vh] print:max-h-none print:max-w-none print:shadow-none print:border-none print:rounded-none`}>
        
        {/* Top Controls Bar (Hidden during Print) */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black tracking-tight truncate flex items-center gap-2">
                <span>{isKhmer ? 'ទម្រង់ផ្ទៀងផ្ទាត់កាលវិភាគ និង Check-in/out ប្រចាំថ្ងៃ' : 'Daily Teacher Schedule & Check-in Verification Form'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                  Print Form
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {isKhmer
                  ? 'បោះពុម្ពតារាងប្រៀបធៀបម៉ោងកាលវិភាគ ធៀបនឹង ម៉ោង Check-in ជាក់ស្តែង'
                  : 'Official printable audit sheet comparing scheduled teaching hours with actual system check-in/out'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Orientation Selector */}
            <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 text-xs border border-white/15">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  orientation === 'landscape' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isKhmer ? 'ទទឹង (Landscape)' : 'Landscape'}
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  orientation === 'portrait' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {isKhmer ? 'បណ្តោយ (Portrait)' : 'Portrait'}
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer"
              title="Export reconciliation sheet to CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">{isKhmer ? 'នាំចេញ CSV' : 'Export CSV'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-xs font-black shadow-md shadow-indigo-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isKhmer ? 'បោះពុម្ពទម្រង់ (Print)' : 'Print Form'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors ml-1 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Hidden during Print) */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 print:hidden shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Date Picker */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-bold text-slate-700">{isKhmer ? 'កាលបរិច្ឆេទ:' : 'Date:'}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="font-mono font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            {/* Quick Date Shortcuts */}
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {isKhmer ? 'ថ្ងៃនេះ' : 'Today'}
            </button>

            {/* Filter by Department */}
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="all">{isKhmer ? 'គ្រប់ដេប៉ាតឺម៉ង់ / All Depts' : 'All Departments'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{isKhmer ? d.khmerName || d.name : d.name}</option>
              ))}
            </select>

            {/* Filter by Teacher */}
            {!isTeacherRole ? (
              <select
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="all">{isKhmer ? 'គ្រប់គ្រូបង្រៀន / All Teachers' : 'All Teachers'}</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.teacherId} - {t.khmerName || t.fullName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>{activeTeacher?.khmerName || activeTeacher?.fullName || currentUser?.fullName}</span>
              </div>
            )}

            {/* Filter by Verification Status */}
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="all">{isKhmer ? 'គ្រប់ស្ថានភាព / All Status' : 'All Status'}</option>
              <option value="on_time">{isKhmer ? '✓ ទាន់ពេល (On-Time)' : 'On-Time'}</option>
              <option value="late">{isKhmer ? '⚠️ មកយឺត (Late)' : 'Late'}</option>
              <option value="checked_in">{isKhmer ? 'បាន Check-in ក្នុងប្រព័ន្ធ' : 'Checked In'}</option>
              <option value="discrepancy">{isKhmer ? '⚡ មានគម្លាត (Discrepancies)' : 'Discrepancies'}</option>
              <option value="missed">{isKhmer ? '❌ ខកខាន Check-in / អវត្តមាន' : 'Missing / Absent'}</option>
            </select>
          </div>

          {/* Search Query */}
          <div className="relative min-w-[180px] max-w-[260px] w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកគ្រូ មុខវិជ្ជា...' : 'Search teacher, subject...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs shadow-2xs"
            />
          </div>
        </div>

        {/* Printable Form Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 print:p-0 print:overflow-visible print:space-y-4">
          
          {/* ========================================================= */}
          {/* OFFICIAL CAMBODIAN / INSTITUTIONAL PRINT HEADER */}
          {/* ========================================================= */}
          <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-4">
            
            {/* National Motto (Standard in Cambodian Official School Sheets) */}
            <div className="space-y-0.5 mb-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide font-khmer">
                ព្រះរាជាណាចក្រកម្ពុជា
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-widest font-khmer">
                ជាតិ សាសនា ព្រះមហាក្សត្រ
              </p>
              <div className="flex justify-center items-center gap-1.5 pt-0.5">
                <span className="w-12 h-[1px] bg-slate-900" />
                <span className="text-[10px] text-slate-700">❖❖❖</span>
                <span className="w-12 h-[1px] bg-slate-900" />
              </div>
            </div>

            {/* School Header */}
            <div className="flex items-center justify-between pt-1 px-2">
              <div className="text-left">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase">
                  {systemSettings.organizationName}
                </h3>
                <p className="text-xs font-bold text-slate-700 font-khmer">
                  {systemSettings.khmerOrgName}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isKhmer ? 'ការិយាល័យសិក្សាធិការ និងគ្រប់គ្រងបុគ្គលិក' : 'Academic Affairs & Faculty Office'}
                </p>
              </div>

              <div className="text-right text-[11px] text-slate-600">
                <p><b>{isKhmer ? 'ឆ្នាំសិក្សា៖' : 'Academic Year:'}</b> 2026 - 2027</p>
                <p><b>{isKhmer ? 'កាលបរិច្ឆេទបោះពុម្ព៖' : 'Printed:'}</b> {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Form Main Title */}
            <div className="pt-2">
              <h1 className="text-base sm:text-xl font-black text-slate-950 uppercase tracking-tight font-khmer">
                ទម្រង់ផ្ទៀងផ្ទាត់កាលវិភាគបង្រៀន និងវត្តមានប្រចាំថ្ងៃ
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-700 tracking-normal">
                DAILY TEACHER SCHEDULE & ATTENDANCE RECONCILIATION SHEET
              </p>
            </div>

            {/* Target Date Meta Badge */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
              <span className="bg-slate-100 text-slate-900 px-3 py-1 rounded-lg border border-slate-300">
                {isKhmer ? 'ថ្ងៃ៖ ' : 'Day: '} <b>{isKhmer ? khmerDays[selectedDow] : englishDays[selectedDow]}</b>
              </span>
              <span className="bg-slate-100 text-slate-900 px-3 py-1 rounded-lg border border-slate-300">
                {isKhmer ? 'កាលបរិច្ឆេទ៖ ' : 'Date: '} <b className="font-mono">{selectedDate}</b>
              </span>
              <span className="bg-slate-100 text-slate-900 px-3 py-1 rounded-lg border border-slate-300">
                {isKhmer ? 'ចំនួនម៉ោងកាលវិភាគ៖ ' : 'Total Classes: '} <b>{filteredRows.length}</b> {isKhmer ? 'ថ្នាក់' : 'Classes'}
              </span>
              <span className="bg-slate-100 text-slate-900 px-3 py-1 rounded-lg border border-slate-300">
                {isKhmer ? 'ម៉ោងបង្រៀនសរុប៖ ' : 'Total Hours: '} <b>{summaryStats.totalScheduledHours}</b> {isKhmer ? 'ម៉ោង' : 'Hours'}
              </span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STATISTICAL AUDIT SUMMARY STRIP */}
          {/* ========================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 print:bg-white">
              <div className="text-[10px] text-slate-500 font-bold uppercase">{isKhmer ? 'កាលវិភាគសរុប' : 'Scheduled'}</div>
              <div className="text-base font-black text-slate-900 mt-0.5">{summaryStats.totalScheduledClasses}</div>
              <div className="text-[10px] text-indigo-700 font-bold">{summaryStats.totalScheduledHours} hrs</div>
            </div>

            <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 print:bg-white">
              <div className="text-[10px] text-emerald-800 font-bold uppercase">{isKhmer ? 'បាន Check-in' : 'Checked In'}</div>
              <div className="text-base font-black text-emerald-700 mt-0.5">{summaryStats.totalCheckedIn}</div>
              <div className="text-[10px] text-emerald-600 font-bold">{summaryStats.checkInRate}% rate</div>
            </div>

            <div className="p-2.5 rounded-xl border border-teal-300 bg-teal-50/70 print:bg-white">
              <div className="text-[10px] text-teal-800 font-bold uppercase">{isKhmer ? 'មកទាន់ពេល' : 'On-Time'}</div>
              <div className="text-base font-black text-teal-700 mt-0.5">{summaryStats.totalOnTime}</div>
              <div className="text-[10px] text-teal-600 font-bold">100% Match</div>
            </div>

            <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50/70 print:bg-white">
              <div className="text-[10px] text-amber-800 font-bold uppercase">{isKhmer ? 'មកយឺត' : 'Late Arrival'}</div>
              <div className="text-base font-black text-amber-700 mt-0.5">{summaryStats.totalLate}</div>
              <div className="text-[10px] text-amber-600 font-bold">&gt;15 mins</div>
            </div>

            <div className="p-2.5 rounded-xl border border-rose-300 bg-rose-50/70 print:bg-white">
              <div className="text-[10px] text-rose-800 font-bold uppercase">{isKhmer ? 'ខកខាន / អវត្តមាន' : 'Missed / Absent'}</div>
              <div className="text-base font-black text-rose-700 mt-0.5">{summaryStats.totalMissed}</div>
              <div className="text-[10px] text-rose-600 font-bold">Pending audit</div>
            </div>

            <div className="p-2.5 rounded-xl border border-blue-300 bg-blue-50/70 print:bg-white">
              <div className="text-[10px] text-blue-800 font-bold uppercase">{isKhmer ? 'ម៉ោងជាក់ស្តែង' : 'Actual Taught'}</div>
              <div className="text-base font-black text-blue-700 mt-0.5">{summaryStats.totalActualHours}</div>
              <div className="text-[10px] text-blue-600 font-bold">hrs completed</div>
            </div>

            <div className="p-2.5 rounded-xl border border-purple-300 bg-purple-50/70 print:bg-white col-span-2 sm:col-span-1">
              <div className="text-[10px] text-purple-800 font-bold uppercase">{isKhmer ? 'ស្ថានភាពផ្ទៀងផ្ទាត់' : 'Audit Status'}</div>
              <div className="text-xs font-black text-purple-700 mt-1">
                {summaryStats.totalMissed === 0 && summaryStats.totalLate === 0 ? '✓ COMPLETE' : '⚠️ ATTENTION'}
              </div>
              <div className="text-[10px] text-purple-600 font-bold">Daily Reconciliation</div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* THE COMPARISON AUDIT TABLE */}
          {/* ========================================================= */}
          <div className="border-2 border-slate-900 rounded-2xl overflow-hidden print:border-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white border-b-2 border-slate-900 text-[11px] font-black uppercase tracking-wider print:bg-slate-900 print:text-white">
                  <th className="p-2 text-center w-8 border-r border-slate-700">ល.រ</th>
                  <th className="p-2 w-20 border-r border-slate-700">អត្តលេខ</th>
                  <th className="p-2 w-44 border-r border-slate-700">ឈ្មោះគ្រូបង្រៀន</th>
                  <th className="p-2 w-40 border-r border-slate-700">មុខវិជ្ជា & ថ្នាក់</th>
                  <th className="p-2 w-16 text-center border-r border-slate-700">បន្ទប់</th>
                  <th className="p-2 w-32 border-r border-slate-700 text-center bg-indigo-950/60 print:bg-slate-800">
                    <div>ម៉ោងកាលវិភាគ</div>
                    <div className="text-[9px] text-indigo-200">Scheduled Time</div>
                  </th>
                  <th className="p-2 w-28 border-r border-slate-700 text-center bg-emerald-950/60 print:bg-slate-800">
                    <div>Check-In ប្រព័ន្ធ</div>
                    <div className="text-[9px] text-emerald-200">System Check-in</div>
                  </th>
                  <th className="p-2 w-28 border-r border-slate-700 text-center bg-emerald-950/60 print:bg-slate-800">
                    <div>Check-Out ប្រព័ន្ធ</div>
                    <div className="text-[9px] text-emerald-200">System Check-out</div>
                  </th>
                  <th className="p-2 w-20 text-center border-r border-slate-700">
                    <div>ម៉ោងបង្រៀន</div>
                    <div className="text-[9px] text-slate-300">Actual Hrs</div>
                  </th>
                  <th className="p-2 w-32 border-r border-slate-700 text-center">
                    <div>ការផ្ទៀងផ្ទាត់</div>
                    <div className="text-[9px] text-slate-300">Variance / Status</div>
                  </th>
                  <th className="p-2 w-28 text-center border-r border-slate-700">
                    <div>ហត្ថលេខាគ្រូ</div>
                    <div className="text-[9px] text-slate-300">Teacher Sign</div>
                  </th>
                  <th className="p-2 w-28 text-center">
                    <div>អ្នកត្រួតពិនិត្យ</div>
                    <div className="text-[9px] text-slate-300">Supervisor Note</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-medium">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-500 font-bold">
                      {isKhmer
                        ? `មិនមានទិន្នន័យកាលវិភាគបង្រៀនសម្រាប់ថ្ងៃនេះទេ (${selectedDate})`
                        : `No teaching schedule records found for selected date (${selectedDate})`}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <tr
                        key={row.scheduleId}
                        className={`text-slate-900 ${
                          !row.hasCheckedIn && row.statusType === 'missed'
                            ? 'bg-rose-50/50 print:bg-rose-50/30'
                            : row.statusType === 'late'
                            ? 'bg-amber-50/50 print:bg-amber-50/30'
                            : isEven
                            ? 'bg-white'
                            : 'bg-slate-50/60 print:bg-white'
                        }`}
                      >
                        {/* No. */}
                        <td className="p-2 text-center font-bold font-mono border-r border-slate-200">
                          {idx + 1}
                        </td>

                        {/* Teacher ID */}
                        <td className="p-2 font-mono font-bold text-slate-700 border-r border-slate-200 whitespace-nowrap text-[11px]">
                          {row.teacherCode}
                        </td>

                        {/* Teacher Name */}
                        <td className="p-2 border-r border-slate-200">
                          <div className="font-black text-slate-900 font-khmer leading-snug">
                            {row.khmerTeacherName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {row.teacherName}
                          </div>
                        </td>

                        {/* Subject & Grade */}
                        <td className="p-2 border-r border-slate-200">
                          <div className="font-bold text-slate-900 font-khmer">
                            {row.khmerSubject}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono font-bold">
                            {row.gradeClass}
                          </div>
                        </td>

                        {/* Room */}
                        <td className="p-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200 whitespace-nowrap">
                          {row.room}
                        </td>

                        {/* Scheduled Time & Hours */}
                        <td className="p-2 border-r border-slate-200 text-center font-mono bg-indigo-50/40 print:bg-white">
                          <div className="font-black text-indigo-950">
                            {row.startTime} - {row.endTime}
                          </div>
                          <div className="text-[10px] font-bold text-indigo-700 font-sans">
                            {row.schedHours} hrs
                          </div>
                        </td>

                        {/* System Check-in */}
                        <td className="p-2 border-r border-slate-200 text-center font-mono bg-emerald-50/30 print:bg-white">
                          <div className={`font-black ${row.hasCheckedIn ? 'text-emerald-900' : 'text-slate-400'}`}>
                            {row.checkInTime}
                          </div>
                          {row.hasCheckedIn && row.checkInVarianceMinutes > 0 && (
                            <div className="text-[9px] font-bold text-amber-700 font-sans">
                              +{row.checkInVarianceMinutes}m late
                            </div>
                          )}
                        </td>

                        {/* System Check-out */}
                        <td className="p-2 border-r border-slate-200 text-center font-mono bg-emerald-50/30 print:bg-white">
                          <div className={`font-black ${row.hasCheckedOut ? 'text-emerald-900' : 'text-slate-400'}`}>
                            {row.checkOutTime}
                          </div>
                        </td>

                        {/* Actual Taught Hours */}
                        <td className="p-2 text-center border-r border-slate-200 font-mono font-black text-slate-900">
                          {row.actualHours > 0 ? `${row.actualHours} h` : '0 h'}
                        </td>

                        {/* Variance / Status Badge */}
                        <td className="p-2 border-r border-slate-200 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] border ${row.badgeClass} whitespace-nowrap print:border-slate-400`}
                          >
                            {isKhmer ? row.statusLabelKhmer : row.statusLabelEnglish}
                          </span>
                        </td>

                        {/* Physical Teacher Signature Dotted Line */}
                        <td className="p-2 border-r border-slate-200 text-center align-bottom">
                          <div className="w-full pt-4 border-b border-dotted border-slate-400 text-[9px] text-slate-300 select-none">
                            ........................
                          </div>
                        </td>

                        {/* Supervisor Sign / Remark */}
                        <td className="p-2 text-center align-bottom">
                          <div className="w-full pt-4 border-b border-dotted border-slate-400 text-[9px] text-slate-300 select-none">
                            ........................
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer Totals */}
              <tfoot>
                <tr className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-900 text-xs">
                  <td colSpan={5} className="p-2.5 text-right uppercase border-r border-slate-300">
                    {isKhmer ? 'សរុបម៉ោងបង្រៀនទាំងអស់ (Total Hours):' : 'Grand Total Hours:'}
                  </td>
                  <td className="p-2.5 text-center font-mono text-indigo-900 border-r border-slate-300">
                    {summaryStats.totalScheduledHours} hrs
                  </td>
                  <td colSpan={2} className="p-2.5 text-center border-r border-slate-300 text-[11px] text-emerald-800">
                    {summaryStats.totalCheckedIn} / {summaryStats.totalScheduledClasses} Classes Checked-in
                  </td>
                  <td className="p-2.5 text-center font-mono text-blue-900 border-r border-slate-300">
                    {summaryStats.totalActualHours} hrs
                  </td>
                  <td colSpan={3} className="p-2.5 text-slate-600 text-[10px] text-center">
                    {isKhmer ? 'ផ្ទៀងផ្ទាត់ដោយប្រព័ន្ធ EduTrack MIS' : 'Verified via EduTrack School MIS'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ========================================================= */}
          {/* OFFICIAL INSTITUTIONAL SIGNATURE SECTION */}
          {/* ========================================================= */}
          <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-900 page-break-inside-avoid">
            
            {/* Column 1: Teacher Representative */}
            <div className="space-y-1">
              <p className="text-[11px] text-slate-600 font-mono">
                {isKhmer ? 'ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២...' : 'Date: ...... / ...... / 202...'}
              </p>
              <h4 className="font-black text-slate-900 uppercase font-khmer">
                {isKhmer ? 'គ្រូបង្រៀនទទួលបន្ទុក' : 'Teacher Representative'}
              </h4>
              <p className="text-[10px] text-slate-400 font-normal">
                {isKhmer ? '(ហត្ថលេខា និង ឈ្មោះ)' : '(Signature & Name)'}
              </p>
              <div className="h-20 flex items-end justify-center pb-2">
                <span className="w-40 border-b border-dotted border-slate-400"></span>
              </div>
            </div>

            {/* Column 2: Academic & HR Supervisor */}
            <div className="space-y-1">
              <p className="text-[11px] text-slate-600 font-mono">
                {isKhmer ? 'ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២...' : 'Date: ...... / ...... / 202...'}
              </p>
              <h4 className="font-black text-slate-900 uppercase font-khmer">
                {isKhmer ? 'ប្រធានផ្នែកសិក្សាធិការ / បុគ្គលិក' : 'Academic / HR Supervisor'}
              </h4>
              <p className="text-[10px] text-slate-400 font-normal">
                {isKhmer ? '(ហត្ថលេខា និង ឈ្មោះ)' : '(Signature & Name)'}
              </p>
              <div className="h-20 flex items-end justify-center pb-2">
                <span className="w-40 border-b border-dotted border-slate-400"></span>
              </div>
            </div>

            {/* Column 3: School Director / Principal */}
            <div className="space-y-1">
              <p className="text-[11px] text-slate-600 font-mono">
                {isKhmer ? 'ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២...' : 'Date: ...... / ...... / 202...'}
              </p>
              <h4 className="font-black text-slate-900 uppercase font-khmer">
                {isKhmer ? 'នាយកសាលា / គណៈគ្រប់គ្រង' : 'Principal / School Director'}
              </h4>
              <p className="text-[10px] text-slate-400 font-normal">
                {isKhmer ? '(ហត្ថលេខា និង ត្រាផ្លូវការ)' : '(Signature & Official Seal)'}
              </p>
              <div className="h-20 flex items-end justify-center pb-2">
                <span className="w-40 border-b border-dotted border-slate-400"></span>
              </div>
            </div>

          </div>

          {/* Print Footer note */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-between">
            <span>{systemSettings.organizationName} • {isKhmer ? systemSettings.khmerOrgName : ''}</span>
            <span>{isKhmer ? 'ឯកសារផ្លូវការសម្រាប់ផ្ទៀងផ្ទាត់ម៉ោងបង្រៀន និងគណនាប្រាក់ឈ្នួល' : 'Official Academic Audit & Payroll Ledger Document'}</span>
            <span>Page 1 of 1</span>
          </div>

        </div>

      </div>

    </div>
  );
};
