import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Palmtree,
  DollarSign,
  GraduationCap,
  CalendarDays
} from 'lucide-react';
import { TeachingWageReport } from './TeachingWageReport.tsx';
import { Attendance31DaysSheet } from '../attendance/Attendance31DaysSheet.tsx';
import { AttendancePeriodGrid } from '../attendance/AttendancePeriodGrid.tsx';
import { AcademicDatesModal } from '../schedules/AcademicDatesModal.tsx';

export const AttendanceReports: React.FC = () => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSystemSettings());
  const [isAcademicDatesModalOpen, setIsAcademicDatesModalOpen] = useState(false);

  React.useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setSystemSettings(StorageService.getSystemSettings());
    });
    return unsub;
  }, []);

  const canEditAcademicDates =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin_hr' ||
    hasPermission('settings.manage') ||
    hasPermission('schedules.edit');

  const [reportType, setReportType] = useState<'teaching_wage' | 'period_attendance' | 'sheet_31days' | 'monthly' | 'daily'>('sheet_31days');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [selectedDate, setSelectedDate] = useState('2026-09-24');
  const [selectedDept, setSelectedDept] = useState('All');

  const departments = StorageService.getDepartments();
  const teachers = StorageService.getTeachers().filter(t => t.status === 'Active');
  const employees = StorageService.getEmployees().filter(e => e.status === 'Active');
  const allAttendance = StorageService.getAttendance();

  // Combine staff
  const allStaff = useMemo(() => {
    return [
      ...teachers.map(t => ({ id: t.id, code: t.teacherId, name: t.fullName, khmerName: t.khmerName, type: 'Teacher', dept: t.department })),
      ...employees.map(e => ({ id: e.id, code: e.employeeId, name: e.fullName, khmerName: e.khmerName, type: 'Employee', dept: e.department }))
    ].filter(s => canAccessDepartment(s.dept) && (selectedDept === 'All' || s.dept === selectedDept));
  }, [teachers, employees, canAccessDepartment, selectedDept]);

  // Aggregate stats per staff member for the selected month
  const monthlyStaffAggregates = useMemo(() => {
    return allStaff.map(staff => {
      const records = allAttendance.filter(
        a => a.personId === staff.id && a.date.startsWith(selectedMonth)
      );

      const presentCount = records.filter(r => r.status === 'Present').length;
      const lateCount = records.filter(r => r.status === 'Late').length;
      const absentCount = records.filter(r => r.status === 'Absent').length;
      const leaveCount = records.filter(r => r.status === 'Leave').length;

      const totalLateMinutes = records.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);
      const totalOvertimeMinutes = records.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0);

      // Estimated working hours (present + late days * 8h)
      const approxWorkingHours = (presentCount + lateCount) * 8 + Math.round(totalOvertimeMinutes / 60);

      return {
        ...staff,
        presentCount,
        lateCount,
        absentCount,
        leaveCount,
        totalLateMinutes,
        totalOvertimeMinutes,
        approxWorkingHours,
        recordsCount: records.length
      };
    });
  }, [allStaff, allAttendance, selectedMonth]);

  // Overall totals
  const overallTotals = useMemo(() => {
    return monthlyStaffAggregates.reduce(
      (acc, s) => ({
        present: acc.present + s.presentCount,
        late: acc.late + s.lateCount,
        absent: acc.absent + s.absentCount,
        leave: acc.leave + s.leaveCount,
        lateMins: acc.lateMins + s.totalLateMinutes,
        otMins: acc.otMins + s.totalOvertimeMinutes
      }),
      { present: 0, late: 0, absent: 0, leave: 0, lateMins: 0, otMins: 0 }
    );
  }, [monthlyStaffAggregates]);

  const handleExportCSV = () => {
    const metaRows = [
      `# Organization: "${systemSettings.organizationName || 'EduTrack MIS'}"`,
      `# Academic Year: "${systemSettings.academicYear || '2026-2027'} (${systemSettings.academicStartDate || ''} to ${systemSettings.academicEndDate || ''})"`,
      `# Current Semester: "${systemSettings.currentSemester || 'Semester 1'}"`,
      `# Report Month: "${selectedMonth}"`,
      `# Generated Date: "${new Date().toISOString()}"`,
      ''
    ];

    const headers = ['Staff ID', 'Name', 'Role', 'Department', 'Present Days', 'Late Days', 'Absent Days', 'Leave Days', 'Total Late (Mins)', 'Total Overtime (Mins)', 'Est. Work Hours'];
    const rows = monthlyStaffAggregates.map(s => [
      s.code,
      `"${s.name}"`,
      s.type,
      `"${s.dept}"`,
      s.presentCount,
      s.lateCount,
      s.absentCount,
      s.leaveCount,
      s.totalLateMinutes,
      s.totalOvertimeMinutes,
      s.approxWorkingHours
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [...metaRows, headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${selectedMonth}_AY${systemSettings.academicYear || '2026-2027'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported attendance payroll report to CSV', 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Report Type Switcher Tabs */}
      <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2 print:hidden">
        <button
          onClick={() => setReportType('teaching_wage')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all ${
            reportType === 'teaching_wage'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Teaching Hours & Wage Report (ម៉ោងបង្រៀន និងប្រាក់ឈ្នួល)</span>
        </button>

        <button
          onClick={() => setReportType('period_attendance')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all ${
            reportType === 'period_attendance'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Period Attendance (វត្តមានតាមម៉ោង)</span>
        </button>

        <button
          onClick={() => setReportType('sheet_31days')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all ${
            reportType === 'sheet_31days'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>31-Day Attendance Records (តារាងវត្តមាន ៣១ ថ្ងៃ)</span>
        </button>

        <button
          onClick={() => setReportType('monthly')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all ${
            reportType === 'monthly'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>General Staff Monthly Report (របាយការណ៍ប្រចាំខែទូទៅ)</span>
        </button>

        <button
          onClick={() => setReportType('daily')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all ${
            reportType === 'daily'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Daily Roll Call Summary (សង្ខេបវត្តមានប្រចាំថ្ងៃ)</span>
        </button>
      </div>

      {reportType === 'teaching_wage' ? (
        <TeachingWageReport />
      ) : reportType === 'period_attendance' ? (
        <AttendancePeriodGrid />
      ) : reportType === 'sheet_31days' ? (
        <Attendance31DaysSheet />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Attendance Reports & Analytics
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-slate-500 font-khmer">
                  របាយការណ៍វត្តមានប្រចាំខែ និងប្រចាំថ្ងៃ សម្រាប់សវនកម្ម និងបើកប្រាក់បៀវត្ស
                </p>
                {systemSettings.academicYear && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <GraduationCap className="w-3 h-3 text-emerald-600" />
                    <span>AY {systemSettings.academicYear}</span>
                    {systemSettings.academicStartDate && systemSettings.academicEndDate && (
                      <span className="text-slate-500 font-normal">
                        ({systemSettings.academicStartDate} – {systemSettings.academicEndDate})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {canEditAcademicDates && (
                <button
                  type="button"
                  onClick={() => setIsAcademicDatesModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Configure Academic Year start and end dates"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
                  <span>Set Academic Dates</span>
                </button>
              )}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReportType('monthly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  reportType === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Monthly Report
              </button>
              <button
                onClick={() => setReportType('daily')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  reportType === 'daily' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Daily Summary
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {reportType === 'monthly' ? (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden cursor-pointer"
                  />
                </div>
              )}

              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-emerald-900">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Present</span>
          <span className="text-2xl font-black">{overallTotals.present}</span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">sessions on time</span>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-900">
          <span className="text-[10px] uppercase font-bold text-amber-700 block">Total Late</span>
          <span className="text-2xl font-black">{overallTotals.late}</span>
          <span className="text-[10px] text-amber-600 block mt-0.5">late occurrences</span>
        </div>

        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-rose-900">
          <span className="text-[10px] uppercase font-bold text-rose-700 block">Total Absences</span>
          <span className="text-2xl font-black">{overallTotals.absent}</span>
          <span className="text-[10px] text-rose-600 block mt-0.5">unexcused days</span>
        </div>

        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 text-purple-900">
          <span className="text-[10px] uppercase font-bold text-purple-700 block">Approved Leave</span>
          <span className="text-2xl font-black">{overallTotals.leave}</span>
          <span className="text-[10px] text-purple-600 block mt-0.5">excused days</span>
        </div>

        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 text-orange-900">
          <span className="text-[10px] uppercase font-bold text-orange-700 block">Total Late Minutes</span>
          <span className="text-2xl font-black">{overallTotals.lateMins}m</span>
          <span className="text-[10px] text-orange-600 block mt-0.5">cumulative delay</span>
        </div>

        <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200 text-sky-900">
          <span className="text-[10px] uppercase font-bold text-sky-700 block">Total Overtime</span>
          <span className="text-2xl font-black">+{overallTotals.otMins}m</span>
          <span className="text-[10px] text-sky-600 block mt-0.5">extra duty hours</span>
        </div>
      </div>

      {/* Aggregate Report Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none standard-report-wrapper">
        
        {/* Printable Org Banner & Official Cambodian School Header */}
        <div className="hidden print:block p-6 pb-4 border-b-2 border-slate-900 text-center standard-admin-report-header">
          <div className="text-xs font-khmer font-bold text-slate-800 tracking-wider">
            ព្រះរាជាណាចក្រកម្ពុជា • ជាតិ សាសនា ព្រះមហាក្សត្រ
          </div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">
            Kingdom of Cambodia • Nation Religion King
          </div>
          <div className="w-16 h-0.5 bg-slate-400 mx-auto my-2 rounded-full" />

          <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
            {systemSettings.organizationName}
          </h1>
          {systemSettings.khmerOrgName && (
            <p className="text-sm sm:text-base font-khmer font-bold text-slate-800 mt-0.5">
              {systemSettings.khmerOrgName}
            </p>
          )}
          <div className="text-sm font-black text-indigo-900 font-khmer mt-2">
            របាយការណ៍ស្រង់វត្តមានបុគ្គលិក និងសាស្រ្តាចារ្យផ្លូវការ (Official Faculty & Staff Attendance Report)
          </div>

          {/* Reference metadata strip */}
          <div className="mt-3 pt-2.5 border-t border-slate-200 grid grid-cols-4 gap-2 text-left text-xs bg-slate-50 p-2.5 rounded-xl">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Academic Year (ឆ្នាំសិក្សា)</span>
              <span className="font-bold text-slate-900 font-mono">
                {systemSettings.academicYear || '2026-2027'}
              </span>
              {systemSettings.academicStartDate && systemSettings.academicEndDate && (
                <span className="text-[10px] text-slate-500 block font-mono">
                  {systemSettings.academicStartDate} to {systemSettings.academicEndDate}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Report Period (កាលបរិច្ឆេទ)</span>
              <span className="font-bold text-slate-900">
                {reportType === 'monthly' ? `Month ${selectedMonth}` : `Date ${selectedDate}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Scope (ដេប៉ាតឺម៉ង់)</span>
              <span className="font-bold text-slate-900">
                {selectedDept === 'All' ? 'All Departments' : selectedDept}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Printed Date (កាលបរិច្ឆេបោះពុម្ព)</span>
              <span className="font-mono text-slate-800">
                {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="standard-report-table w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-3">Staff ID</th>
                <th className="py-3 px-4">Staff Name</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-3 text-center">Present</th>
                <th className="py-3 px-3 text-center">Late</th>
                <th className="py-3 px-3 text-center">Absent</th>
                <th className="py-3 px-3 text-center">Leave</th>
                <th className="py-3 px-3 text-right">Late (Mins)</th>
                <th className="py-3 px-3 text-right">Overtime</th>
                <th className="py-3 px-4 text-right">Est. Work Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {monthlyStaffAggregates.map((staff, idx) => (
                <tr key={staff.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {staff.code}
                  </td>
                  <td className="py-3 px-4 font-extrabold text-slate-900">
                    {staff.name}
                    {staff.khmerName && (
                      <span className="text-[10px] text-slate-400 font-khmer block font-normal">
                        {staff.khmerName}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{staff.dept}</span>
                    <span className="text-[10px] text-slate-400 block">{staff.type}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">
                    {staff.presentCount}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-amber-700">
                    {staff.lateCount}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-rose-700">
                    {staff.absentCount}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-purple-700">
                    {staff.leaveCount}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-800">
                    {staff.totalLateMinutes > 0 ? `${staff.totalLateMinutes}m` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-sky-800">
                    {staff.totalOvertimeMinutes > 0 ? `+${staff.totalOvertimeMinutes}m` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                    {staff.approxWorkingHours} hrs
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
              <tr>
                <td colSpan={4} className="py-3 px-4 text-right font-bold uppercase tracking-wider text-xs">
                  Summary Totals ({monthlyStaffAggregates.length} Staff):
                </td>
                <td className="py-3 px-3 text-center text-emerald-800 font-black">{overallTotals.present}</td>
                <td className="py-3 px-3 text-center text-amber-800 font-black">{overallTotals.late}</td>
                <td className="py-3 px-3 text-center text-rose-800 font-black">{overallTotals.absent}</td>
                <td className="py-3 px-3 text-center text-purple-800 font-black">{overallTotals.leave}</td>
                <td className="py-3 px-3 text-right font-mono text-amber-900 font-bold">{overallTotals.lateMins}m</td>
                <td className="py-3 px-3 text-right font-mono text-sky-900 font-bold">+{overallTotals.otMins}m</td>
                <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                  {monthlyStaffAggregates.reduce((sum, s) => sum + s.approxWorkingHours, 0)} hrs
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Official Certification & 3 Signatures Footer (Printable & Screen) */}
        <div className="standard-admin-report-footer p-6 border-t border-slate-200 bg-slate-50/70">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {/* Prepared By */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  អ្នករៀបចំ (Prepared By)
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">HR / Registrar Officer</p>
              </div>
              <div className="my-8">
                <div className="h-10 border-b border-dashed border-slate-300 w-3/4 mx-auto" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Date: {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>

            {/* Verified By */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  អ្នកត្រួតពិនិត្យ (Verified By)
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Academic Supervisor / Audit</p>
              </div>
              <div className="my-8">
                <div className="h-10 border-b border-dashed border-slate-300 w-3/4 mx-auto" />
              </div>
              <div>
                <div className="font-bold text-slate-400 text-xs">____________________________</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Date: ____ / ____ / 2026</div>
              </div>
            </div>

            {/* Approved By */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  អ្នកអនុម័ត (Approved By)
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">School Director / Principal</p>
              </div>
              <div className="my-8 flex items-center justify-center">
                <div className="w-18 h-18 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase rotate-[-12deg]">
                  Official Stamp
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-400 text-xs">____________________________</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Date: ____ / ____ / 2026</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-1">
            <span>Academic Year: {systemSettings.academicYear || '2026-2027'} ({systemSettings.academicStartDate || ''} to {systemSettings.academicEndDate || ''})</span>
            <span>Generated from {systemSettings.organizationName} Attendance System</span>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Academic Dates Configuration Modal */}
      {isAcademicDatesModalOpen && (
        <AcademicDatesModal
          isOpen={isAcademicDatesModalOpen}
          onClose={() => setIsAcademicDatesModalOpen(false)}
        />
      )}

    </div>
  );
};
