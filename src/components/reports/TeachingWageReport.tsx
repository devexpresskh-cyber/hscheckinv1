import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { Teacher, AttendanceRecord, TeacherSubjectSchedule, TeacherWageSummary, TeacherClassSessionDetail } from '../../types/index.ts';
import {
  GraduationCap,
  Clock,
  DollarSign,
  Download,
  Printer,
  Calendar,
  Building,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  TrendingUp,
  X,
  Award,
  BookOpen,
  UserCheck
} from 'lucide-react';

export const TeachingWageReport: React.FC = () => {
  const { canAccessDepartment } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [dateFilterMode, setDateFilterMode] = useState<'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<TeacherWageSummary | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  const departments = StorageService.getDepartments();
  const teachers = StorageService.getTeachers().filter(t => t.status === 'Active');
  const allAttendance = StorageService.getAttendance();
  const subjectSchedules = StorageService.getSubjectSchedules();

  // Helper: Convert time "07:30" to minutes
  const timeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      if (!canAccessDepartment(t.department)) return false;
      if (selectedDept !== 'All' && t.department !== selectedDept) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.fullName.toLowerCase().includes(q) ||
          t.khmerName?.toLowerCase().includes(q) ||
          t.teacherId.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teachers, selectedDept, searchQuery, canAccessDepartment]);

  // Calculate Teaching Wage Summaries
  const wageSummaries: TeacherWageSummary[] = useMemo(() => {
    return filteredTeachers.map(teacher => {
      const baseHourlyRate = teacher.hourlyRate || 20;
      const currency = teacher.currency || 'USD';

      // Filter attendance records in date window
      const teacherRecords = allAttendance.filter(att => {
        if (att.personId !== teacher.id) return false;
        if (dateFilterMode === 'month') {
          return att.date.startsWith(selectedMonth);
        } else {
          return att.date >= startDate && att.date <= endDate;
        }
      });

      // Filter subject periods (classes)
      const subjectRecords = teacherRecords.filter(r => Boolean(r.subjectScheduleId || r.subject));

      let totalScheduledClasses = subjectRecords.length;
      let totalCompletedClasses = 0;
      let totalMissedClasses = 0;
      let totalLateClasses = 0;
      let totalLateMinutes = 0;
      let totalOvertimeMinutes = 0;
      let scheduledHours = 0;
      let completedHours = 0;
      let grossWage = 0;

      const classSessions: TeacherClassSessionDetail[] = [];

      subjectRecords.forEach(rec => {
        const scheduleRef = subjectSchedules.find(s => s.id === rec.subjectScheduleId);
        const rateApplied = scheduleRef?.hourlyRate || baseHourlyRate;

        // Calculate scheduled duration
        const schedStartMins = timeToMinutes(rec.scheduledStart);
        const schedEndMins = timeToMinutes(rec.scheduledEnd);
        const schedDurationMinutes = Math.max(0, schedEndMins - schedStartMins);
        const schedDurationHours = schedDurationMinutes / 60;
        scheduledHours += schedDurationHours;

        // Calculate actual taught duration
        let actualTaughtHours = 0;
        if (rec.checkInTime && rec.checkOutTime) {
          const inMins = timeToMinutes(rec.checkInTime);
          const outMins = timeToMinutes(rec.checkOutTime);
          const actualDurationMinutes = Math.max(0, outMins - inMins);
          // Credit up to scheduled duration plus minor overtime
          actualTaughtHours = Math.min(schedDurationHours + 0.5, actualDurationMinutes / 60);
          totalCompletedClasses++;
        } else if (rec.checkInTime && (rec.status === 'Present' || rec.status === 'Late')) {
          // In session or single punch, credit scheduled duration
          actualTaughtHours = schedDurationHours;
          totalCompletedClasses++;
        } else if (rec.status === 'Absent') {
          totalMissedClasses++;
        }

        completedHours += actualTaughtHours;

        if (rec.status === 'Late' || (rec.lateMinutes && rec.lateMinutes > 0)) {
          totalLateClasses++;
          totalLateMinutes += rec.lateMinutes || 0;
        }

        totalOvertimeMinutes += rec.overtimeMinutes || 0;

        const sessionWage = actualTaughtHours * rateApplied;
        grossWage += sessionWage;

        classSessions.push({
          attendanceId: rec.id,
          date: rec.date,
          subject: rec.subject || scheduleRef?.subject || 'Class Period',
          khmerSubject: rec.khmerSubject || scheduleRef?.khmerSubject,
          subjectCode: rec.subjectCode || scheduleRef?.subjectCode || '',
          gradeClass: rec.gradeClass || scheduleRef?.gradeClass || 'General',
          room: rec.room || scheduleRef?.room || 'Main Classroom',
          periodName: rec.periodName || scheduleRef?.periodName || 'Class Session',
          scheduledStart: rec.scheduledStart,
          scheduledEnd: rec.scheduledEnd,
          scheduledDurationHours: Number(schedDurationHours.toFixed(2)),
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          actualTaughtHours: Number(actualTaughtHours.toFixed(2)),
          status: rec.status,
          lateMinutes: rec.lateMinutes || 0,
          rateApplied,
          wageEarned: Number(sessionWage.toFixed(2))
        });
      });

      // If no recorded attendance records exist yet, simulate scheduled baseline from subject timetable
      if (subjectRecords.length === 0) {
        const assignedSubjects = subjectSchedules.filter(s => s.teacherId === teacher.id && s.isActive);
        const estWeeklyHours = assignedSubjects.reduce((sum, s) => {
          const sStart = timeToMinutes(s.startTime);
          const sEnd = timeToMinutes(s.endTime);
          const daysCount = s.daysOfWeek ? s.daysOfWeek.length : 1;
          return sum + ((sEnd - sStart) / 60) * daysCount;
        }, 0);

        // Assume ~4 weeks in a month
        const estMonthHours = estWeeklyHours * 4;
        scheduledHours = estMonthHours;
        completedHours = estMonthHours;
        totalScheduledClasses = assignedSubjects.length * 4 * 5;
        totalCompletedClasses = totalScheduledClasses;
        grossWage = completedHours * baseHourlyRate;
      }

      const completionRate = totalScheduledClasses > 0
        ? Math.round((totalCompletedClasses / totalScheduledClasses) * 100)
        : 100;

      const punctualityRate = totalCompletedClasses > 0
        ? Math.round(((totalCompletedClasses - totalLateClasses) / totalCompletedClasses) * 100)
        : 100;

      const netWage = grossWage;

      return {
        teacherId: teacher.id,
        teacherCode: teacher.teacherId,
        teacherName: teacher.fullName,
        khmerName: teacher.khmerName,
        photoUrl: teacher.photoUrl,
        department: teacher.department,
        position: teacher.position,
        employmentType: teacher.employmentType,
        hourlyRate: baseHourlyRate,
        currency,
        totalScheduledClasses,
        totalCompletedClasses,
        totalMissedClasses,
        totalLateClasses,
        totalLateMinutes,
        totalOvertimeMinutes,
        scheduledHours: Number(scheduledHours.toFixed(1)),
        completedHours: Number(completedHours.toFixed(1)),
        completionRate,
        punctualityRate,
        grossWage: Number(grossWage.toFixed(2)),
        lateDeductions: 0,
        netWage: Number(netWage.toFixed(2)),
        classSessions
      };
    });
  }, [filteredTeachers, allAttendance, subjectSchedules, selectedMonth, dateFilterMode, startDate, endDate]);

  // Overall Aggregate KPIs
  const overallKPIs = useMemo(() => {
    const totalFaculty = wageSummaries.length;
    const totalHours = wageSummaries.reduce((sum, s) => sum + s.completedHours, 0);
    const totalWage = wageSummaries.reduce((sum, s) => sum + s.netWage, 0);
    const totalClasses = wageSummaries.reduce((sum, s) => sum + s.totalCompletedClasses, 0);
    const avgRate = totalFaculty > 0
      ? wageSummaries.reduce((sum, s) => sum + s.hourlyRate, 0) / totalFaculty
      : 0;
    const avgCompletion = totalFaculty > 0
      ? wageSummaries.reduce((sum, s) => sum + s.completionRate, 0) / totalFaculty
      : 100;

    return {
      totalFaculty,
      totalHours: Number(totalHours.toFixed(1)),
      totalWage: Number(totalWage.toFixed(2)),
      totalClasses,
      avgRate: Number(avgRate.toFixed(2)),
      avgCompletion: Math.round(avgCompletion)
    };
  }, [wageSummaries]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Teacher ID',
      'Teacher Full Name',
      'Khmer Name',
      'Department',
      'Employment Type',
      'Hourly Teaching Rate ($/hr)',
      'Scheduled Classes',
      'Completed Classes',
      'Missed Classes',
      'Late Classes',
      'Total Late (Minutes)',
      'Scheduled Hours',
      'Actual Taught Hours',
      'Completion Rate (%)',
      'Punctuality Rate (%)',
      'Gross Wage ($)',
      'Net Payable Wage ($)'
    ];

    const rows = wageSummaries.map(s => [
      s.teacherCode,
      `"${s.teacherName}"`,
      `"${s.khmerName || ''}"`,
      `"${s.department}"`,
      s.employmentType,
      s.hourlyRate.toFixed(2),
      s.totalScheduledClasses,
      s.totalCompletedClasses,
      s.totalMissedClasses,
      s.totalLateClasses,
      s.totalLateMinutes,
      s.scheduledHours.toFixed(1),
      s.completedHours.toFixed(1),
      `${s.completionRate}%`,
      `${s.punctualityRate}%`,
      s.grossWage.toFixed(2),
      s.netWage.toFixed(2)
    ]);

    const periodLabel = dateFilterMode === 'month' ? selectedMonth : `${startDate}_to_${endDate}`;
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Teacher_Teaching_Hours_Wage_Report_${periodLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported teaching hours and wage report to CSV', 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  const openTeacherDetail = (summary: TeacherWageSummary) => {
    setSelectedTeacherForDetail(summary);
    setIsPayslipModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isKhmer ? 'របាយការណ៍ម៉ោងបង្រៀន និងប្រាក់ឈ្នួលគ្រូ' : 'Teaching Hours & Wage Summary Report'}
              </h2>
              <p className="text-xs text-slate-500 font-khmer mt-0.5">
                គណនាស្វ័យប្រវត្តិនូវម៉ោងបង្រៀនជាក់ស្តែង និងប្រាក់ឈ្នួលសរុបផ្អែកលើអត្រាកម្រៃបង្រៀនក្នុងមួយម៉ោង
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Wage CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isKhmer ? 'គ្រូបង្រៀនសរុប' : 'Teaching Faculty'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {overallKPIs.totalFaculty}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Active monitored teachers
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isKhmer ? 'ម៉ោងបង្រៀនជាក់ស្តែង' : 'Hours Delivered'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-2">
            {overallKPIs.totalHours} <span className="text-sm font-bold text-slate-400">hrs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {overallKPIs.totalClasses} classes taught
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-200 shadow-xs relative overflow-hidden bg-gradient-to-br from-white via-white to-emerald-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              {isKhmer ? 'ប្រាក់ឈ្នួលត្រូវបើកសរុប' : 'Total Wage Payable'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
            ${overallKPIs.totalWage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            Avg. ${overallKPIs.avgRate.toFixed(2)}/hr rate
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isKhmer ? 'អត្រាបំពេញម៉ោង' : 'Completion Rate'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {overallKPIs.avgCompletion}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Classes attended vs scheduled
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setDateFilterMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => setDateFilterMode('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilterMode === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Custom Range
            </button>
          </div>

          {dateFilterMode === 'month' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
              />
            </div>
          )}

          {/* Department filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search teacher, ID or subject..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-3 py-1.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              {isKhmer ? 'បញ្ជីប្រាក់ឈ្នួលបង្រៀនលម្អិតតាមគ្រូ' : 'Faculty Teaching Wage Breakdown'}
            </h3>
            <p className="text-xs text-slate-400">
              Auto-calculated based on verified check-in/out records and teaching hourly rate
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
            {wageSummaries.length} Teachers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-5">Teacher Profile</th>
                <th className="p-3.5">Department & Subject</th>
                <th className="p-3.5 text-center">Hourly Rate</th>
                <th className="p-3.5 text-center">Classes (Done / Sched)</th>
                <th className="p-3.5 text-center">Taught Hours</th>
                <th className="p-3.5 text-center">Punctuality</th>
                <th className="p-3.5 text-right font-black text-emerald-800">Auto Wage ($)</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {wageSummaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    No teaching records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                wageSummaries.map(summary => (
                  <tr key={summary.teacherId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Teacher profile */}
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={summary.photoUrl}
                          alt={summary.teacherName}
                          className="w-9 h-9 rounded-2xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-black text-slate-900">{summary.teacherName}</div>
                          <div className="text-[10px] text-slate-400 font-khmer">
                            {summary.khmerName || summary.teacherCode} • {summary.teacherCode}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="p-3.5">
                      <div className="text-slate-800 font-semibold">{summary.department}</div>
                      <div className="text-[10px] text-slate-400">{summary.position}</div>
                    </td>

                    {/* Hourly rate */}
                    <td className="p-3.5 text-center">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        ${summary.hourlyRate.toFixed(2)}/hr
                      </span>
                    </td>

                    {/* Classes */}
                    <td className="p-3.5 text-center">
                      <div className="font-bold text-slate-900">
                        {summary.totalCompletedClasses} / {summary.totalScheduledClasses}
                      </div>
                      <div className="w-16 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, summary.completionRate)}%` }}
                        />
                      </div>
                    </td>

                    {/* Taught hours */}
                    <td className="p-3.5 text-center">
                      <span className="font-black text-blue-600 font-mono text-sm">
                        {summary.completedHours.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        of {summary.scheduledHours} hrs
                      </span>
                    </td>

                    {/* Punctuality */}
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          summary.punctualityRate >= 90
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {summary.punctualityRate}%
                      </span>
                      {summary.totalLateMinutes > 0 && (
                        <span className="text-[10px] text-rose-500 block font-medium mt-0.5">
                          {summary.totalLateMinutes}m late
                        </span>
                      )}
                    </td>

                    {/* Calculated Wage */}
                    <td className="p-3.5 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="font-black text-sm sm:text-base text-emerald-700 font-mono bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-xl shadow-xs">
                          ${summary.netWage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {summary.completedHours}h × ${summary.hourlyRate}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={() => openTeacherDetail(summary)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors inline-flex items-center gap-1 shadow-xs"
                      >
                        <FileText className="w-3 h-3 text-slate-500" />
                        <span>Breakdown</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Teacher Itemized Payslip Modal */}
      {isPayslipModalOpen && selectedTeacherForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 my-auto">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    {isKhmer ? 'ប័ណ្ណបើកប្រាក់ឈ្នួលបង្រៀនគ្រូ' : 'Teacher Teaching Compensation Payslip'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Period: {dateFilterMode === 'month' ? selectedMonth : `${startDate} to ${endDate}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPayslipModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Printable Payslip Voucher */}
            <div id="teacher-payslip-print" className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              
              {/* Teacher Profile Summary Card */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedTeacherForDetail.photoUrl}
                    alt={selectedTeacherForDetail.teacherName}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                  />
                  <div>
                    <h4 className="text-base font-black text-slate-900">
                      {selectedTeacherForDetail.teacherName}
                    </h4>
                    <p className="text-xs text-slate-500 font-khmer">
                      {selectedTeacherForDetail.khmerName || ''} • {selectedTeacherForDetail.teacherCode}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedTeacherForDetail.department} • {selectedTeacherForDetail.position}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-right space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">
                    Base Hourly Rate
                  </div>
                  <div className="text-lg font-black text-slate-900 font-mono">
                    ${selectedTeacherForDetail.hourlyRate.toFixed(2)} / hour
                  </div>
                </div>
              </div>

              {/* Wage Math Highlights */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Total Classes</div>
                  <div className="text-lg font-black text-blue-950 mt-0.5">
                    {selectedTeacherForDetail.totalCompletedClasses}
                  </div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-indigo-700 uppercase">Hours Delivered</div>
                  <div className="text-lg font-black text-indigo-950 mt-0.5">
                    {selectedTeacherForDetail.completedHours} hrs
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Net Wage Payable</div>
                  <div className="text-lg font-black text-emerald-800 mt-0.5 font-mono">
                    ${selectedTeacherForDetail.netWage.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Itemized Class Sessions Table */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Itemized Teaching Sessions Log ({selectedTeacherForDetail.classSessions.length} classes)</span>
                </h5>

                {selectedTeacherForDetail.classSessions.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    No individual clock punch records found. Estimated wage is based on recurring schedule baseline.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Subject & Class</th>
                          <th className="p-2.5 text-center">Actual Time</th>
                          <th className="p-2.5 text-center">Hours</th>
                          <th className="p-2.5 text-center">Rate</th>
                          <th className="p-2.5 text-right">Earned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTeacherForDetail.classSessions.map((session, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-medium text-slate-700">
                              {session.date}
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold text-slate-900 block">{session.subject}</span>
                              <span className="text-[10px] text-slate-400">
                                {session.gradeClass} • {session.room}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono">
                              {session.checkInTime ? (
                                <span className="font-bold text-slate-800">
                                  {session.checkInTime} - {session.checkOutTime || 'Ongoing'}
                                </span>
                              ) : (
                                <span className="text-slate-400">Scheduled {session.scheduledStart}</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-bold text-blue-600 font-mono">
                              {session.actualTaughtHours}h
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-600">
                              ${session.rateApplied.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-black text-emerald-700 font-mono">
                              ${session.wageEarned.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Signatures block for official voucher */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <div className="h-12 border-b border-slate-300"></div>
                  <p className="font-bold text-slate-700 mt-1">Prepared by (HR)</p>
                </div>
                <div>
                  <div className="h-12 border-b border-slate-300"></div>
                  <p className="font-bold text-slate-700 mt-1">Academic Director</p>
                </div>
                <div>
                  <div className="h-12 border-b border-slate-300"></div>
                  <p className="font-bold text-slate-700 mt-1">Teacher Acknowledgment</p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsPayslipModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Payslip Voucher</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
