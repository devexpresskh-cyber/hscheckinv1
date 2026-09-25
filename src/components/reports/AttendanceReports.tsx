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
  DollarSign
} from 'lucide-react';
import { TeachingWageReport } from './TeachingWageReport.tsx';

export const AttendanceReports: React.FC = () => {
  const { canAccessDepartment } = useAuth();
  const { showToast } = useNotification();
  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSystemSettings());

  React.useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setSystemSettings(StorageService.getSystemSettings());
    });
    return unsub;
  }, []);

  const [reportType, setReportType] = useState<'teaching_wage' | 'monthly' | 'daily'>('teaching_wage');
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

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${selectedMonth}.csv`);
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
      <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
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
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Attendance Reports & Analytics
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-khmer mt-0.5">
                របាយការណ៍វត្តមានប្រចាំខែ និងប្រចាំថ្ងៃ សម្រាប់សវនកម្ម និងបើកប្រាក់បៀវត្ស
              </p>
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReportType('monthly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  reportType === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Monthly Report
              </button>
              <button
                onClick={() => setReportType('daily')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
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
                    className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-transparent border-0 text-slate-800 text-xs font-bold focus:outline-hidden"
                  />
                </div>
              )}

              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        
        {/* Printable Org Banner */}
        <div className="hidden print:block p-6 border-b border-slate-200 text-center">
          <h1 className="text-xl font-bold">{systemSettings.organizationName}</h1>
          {systemSettings.khmerOrgName && (
            <p className="text-sm font-khmer text-slate-800">{systemSettings.khmerOrgName}</p>
          )}
          <p className="text-xs text-slate-600 mt-1">Faculty & Staff Attendance Report • Period: {selectedMonth}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Staff Name</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-3 text-center">Present</th>
                <th className="py-3 px-3 text-center">Late</th>
                <th className="py-3 px-3 text-center">Absent</th>
                <th className="py-3 px-3 text-center">Leave</th>
                <th className="py-3 px-4 text-right">Late (Mins)</th>
                <th className="py-3 px-4 text-right">Overtime</th>
                <th className="py-3 px-4 text-right">Est. Work Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {monthlyStaffAggregates.map(staff => (
                <tr key={staff.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
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
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                    {staff.totalLateMinutes > 0 ? `${staff.totalLateMinutes}m` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-sky-800">
                    {staff.totalOvertimeMinutes > 0 ? `+${staff.totalOvertimeMinutes}m` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                    {staff.approxWorkingHours} hrs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
          <span>Total Staff Included: <b>{monthlyStaffAggregates.length}</b></span>
          <span>Verified for Payroll Audit & HR Compliance</span>
        </div>
      </div>
      </>
      )}

    </div>
  );
};
