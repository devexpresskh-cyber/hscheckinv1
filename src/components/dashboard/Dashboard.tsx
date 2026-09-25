import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { AttendanceRecord } from '../../types/index.ts';
import {
  Users,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Palmtree,
  LogOut,
  ClockAlert,
  Send,
  Sparkles,
  Filter,
  Calendar,
  Building,
  ArrowUpRight,
  TrendingUp,
  MapPin
} from 'lucide-react';

export const Dashboard: React.FC<{ onNavigate: (tab: any) => void; onOpenCheckIn?: () => void }> = ({ onNavigate, onOpenCheckIn }) => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { t, isKhmer } = useLanguage();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  const teachers = StorageService.getTeachers().filter(t => t.status === 'Active');
  const employees = StorageService.getEmployees().filter(e => e.status === 'Active');
  const departments = StorageService.getDepartments();
  const allAttendance = StorageService.getAttendance();

  // Filter attendance records
  const filteredAttendance = useMemo(() => {
    return allAttendance.filter(record => {
      // Date filter
      if (selectedDate && record.date !== selectedDate) return false;
      // Department scoping (supervisor restriction)
      if (!canAccessDepartment(record.department)) return false;
      // Dropdown department filter
      if (selectedDept !== 'All' && record.department !== selectedDept) return false;
      // Status filter
      if (selectedStatus !== 'All' && record.status !== selectedStatus) return false;
      return true;
    });
  }, [allAttendance, selectedDate, selectedDept, selectedStatus, canAccessDepartment]);

  // Statistics calculation for the selected date
  const stats = useMemo(() => {
    const presentCount = filteredAttendance.filter(r => r.status === 'Present').length;
    const lateCount = filteredAttendance.filter(r => r.status === 'Late').length;
    const absentCount = filteredAttendance.filter(r => r.status === 'Absent').length;
    const leaveCount = filteredAttendance.filter(r => r.status === 'Leave').length;
    const checkedOutCount = filteredAttendance.filter(r => Boolean(r.checkOutTime)).length;
    const missingCheckoutCount = filteredAttendance.filter(
      r => r.status === 'Missing Check-out' || (Boolean(r.checkInTime) && !r.checkOutTime)
    ).length;

    const totalStaffCount = teachers.length + employees.length;
    const attendanceRate = totalStaffCount > 0
      ? Math.round(((presentCount + lateCount) / totalStaffCount) * 100)
      : 0;

    return {
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      leave: leaveCount,
      checkedOut: checkedOutCount,
      missingCheckout: missingCheckoutCount,
      totalStaff: totalStaffCount,
      totalTeachers: teachers.length,
      totalEmployees: employees.length,
      attendanceRate
    };
  }, [filteredAttendance, teachers.length, employees.length]);

  const handleSendDailyTelegramSummary = async () => {
    const res = await TelegramService.sendDailySummary();
    if (res.success) {
      showToast(`Telegram summary dispatched (${res.statusText})`, 'success');
    } else {
      showToast(`Telegram dispatch error: ${res.error || 'Failed'}`, 'error');
    }
  };

  const handleRunAbsenceCheck = () => {
    const result = AttendanceEngine.runAbsenceDetector();
    if (result.absencesMarked > 0 || result.missingCheckoutsMarked > 0) {
      showToast(`Detection finished: ${result.absencesMarked} absent flagged, ${result.missingCheckoutsMarked} missing checkout updated`, 'warning');
    } else {
      showToast('All rostered staff are compliant. No unexcused absences found.', 'success');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              {isKhmer ? 'ឆ្នាំសិក្សា ២០២៦-២០២៧' : 'Academic Year 2026-2027'}
            </span>
            <span className="text-xs text-slate-400">
              {isKhmer ? 'ឆមាសទី ១ • តាមដានពេលវេលាជាក់ស្តែង' : 'Term 1 • Live Monitoring'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
            {isKhmer ? 'ផ្ទាំងគ្រប់គ្រងវត្តមាន និងកាលវិភាគ' : 'Attendance & Schedule Dashboard'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {isKhmer
              ? 'តាមដានវត្តមានគ្រូ និងបុគ្គលិកជាក់ស្តែង ផ្ទៀងផ្ទាត់ទីតាំង GPS គណនាម៉ោងយឺត និងការជូនដំណឹងតេឡេក្រាមស្វ័យប្រវត្តិ។'
              : 'Real-time biometric & mobile check-in verification, late arrival calculations, and automated Telegram alerts.'}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('kiosk')}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <ClockAlert className="w-4 h-4 shrink-0" />
            <span>{isKhmer ? 'ចំណុចស្កេនវត្តមាន' : 'Check-in Kiosk'}</span>
          </button>

          {hasPermission('telegram.configure') && (
            <button
              onClick={handleSendDailyTelegramSummary}
              className="flex items-center gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/30 transition-all active:scale-95"
              title={isKhmer ? 'ផ្ញើសេចក្តីសង្ខេបវត្តមានទៅក្រុមតេឡេក្រាម' : 'Dispatches formatted summary to Telegram Admin & Staff Groups'}
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>{isKhmer ? 'ផ្ញើរបាយការណ៍ TG' : 'Send TG Summary'}</span>
            </button>
          )}

          {hasPermission('attendance.edit') && (
            <button
              onClick={handleRunAbsenceCheck}
              className="flex items-center gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{isKhmer ? 'ស្វែងរកអវត្តមាន' : 'Detect Absences'}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid - Responsive without overlap */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
        
        {/* Total Teachers */}
        <div
          onClick={() => onNavigate('teachers')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase truncate">
              {isKhmer ? 'គ្រូបង្រៀន' : 'Teachers'}
            </span>
            <GraduationCap className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{stats.totalTeachers}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{isKhmer ? 'ក្នុងបញ្ជីសកម្ម' : 'Active Faculty'}</p>
        </div>

        {/* Total Employees */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase truncate">
              {isKhmer ? 'បុគ្គលិកទូទៅ' : 'Employees'}
            </span>
            <Users className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{stats.totalEmployees}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{isKhmer ? 'បុគ្គលិកគាំទ្រ' : 'Support Staff'}</p>
        </div>

        {/* Present */}
        <div className="bg-emerald-50/70 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase truncate">
              {isKhmer ? 'មានវត្តមាន' : 'Present'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-2">{stats.present}</p>
          <p className="text-[10px] text-emerald-700 mt-0.5 truncate">{isKhmer ? 'ទាន់ពេលវេលា' : 'On Time'}</p>
        </div>

        {/* Late */}
        <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase truncate">
              {isKhmer ? 'មកយឺត' : 'Late'}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-950 mt-2">{stats.late}</p>
          <p className="text-[10px] text-amber-700 mt-0.5 truncate">{isKhmer ? 'លើសម៉ោងអនុគ្រោះ' : 'Past Grace'}</p>
        </div>

        {/* Absent */}
        <div className="bg-rose-50/70 p-3.5 sm:p-4 rounded-2xl border border-rose-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-rose-800 uppercase truncate">
              {isKhmer ? 'អវត្តមាន' : 'Absent'}
            </span>
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-950 mt-2">{stats.absent}</p>
          <p className="text-[10px] text-rose-700 mt-0.5 truncate">{isKhmer ? 'គ្មានការអនុញ្ញាត' : 'Unexcused'}</p>
        </div>

        {/* Leave */}
        <div className="bg-purple-50/70 p-3.5 sm:p-4 rounded-2xl border border-purple-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-purple-800 uppercase truncate">
              {isKhmer ? 'សុំច្បាប់' : 'On Leave'}
            </span>
            <Palmtree className="w-4 h-4 text-purple-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-950 mt-2">{stats.leave}</p>
          <p className="text-[10px] text-purple-700 mt-0.5 truncate">{isKhmer ? 'មានការអនុម័ត' : 'Approved'}</p>
        </div>

        {/* Checked Out */}
        <div className="bg-sky-50/70 p-3.5 sm:p-4 rounded-2xl border border-sky-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-sky-800 uppercase truncate">
              {isKhmer ? 'ស្កេនចេញ' : 'Checked Out'}
            </span>
            <LogOut className="w-4 h-4 text-sky-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-sky-950 mt-2">{stats.checkedOut}</p>
          <p className="text-[10px] text-sky-700 mt-0.5 truncate">{isKhmer ? 'ចប់ម៉ោងការងារ' : 'Shift Done'}</p>
        </div>

        {/* Missing Check-out */}
        <div className="bg-orange-50/70 p-3.5 sm:p-4 rounded-2xl border border-orange-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-orange-800 uppercase truncate">
              {isKhmer ? 'ខកខានចេញ' : 'Missing Out'}
            </span>
            <ClockAlert className="w-4 h-4 text-orange-600 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-orange-950 mt-2">{stats.missingCheckout}</p>
          <p className="text-[10px] text-orange-700 mt-0.5 truncate">{isKhmer ? 'មិនទាន់ស្កេនចេញ' : 'Pending Out'}</p>
        </div>

      </div>

      {/* Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance Breakdown Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Attendance Distribution</h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {stats.attendanceRate}% Present Rate
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Summary of today's attendance sessions</p>

            {/* Visual Bars */}
            <div className="mt-5 space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-700">Present (On-time)</span>
                  <span className="text-slate-700">{stats.present} staff</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${stats.totalStaff > 0 ? (stats.present / stats.totalStaff) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-700">Late Arrivals</span>
                  <span className="text-slate-700">{stats.late} staff</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${stats.totalStaff > 0 ? (stats.late / stats.totalStaff) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-700">Unexcused Absences</span>
                  <span className="text-slate-700">{stats.absent} staff</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: `${stats.totalStaff > 0 ? (stats.absent / stats.totalStaff) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-purple-700">Approved Leave</span>
                  <span className="text-slate-700">{stats.leave} staff</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${stats.totalStaff > 0 ? (stats.leave / stats.totalStaff) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-between text-xs text-slate-500">
            <span>Total Expected Staff: <b>{stats.totalStaff}</b></span>
            <button
              onClick={() => onNavigate('reports')}
              className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Weekly Trend Overview */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Weekly Attendance Trend</h3>
              <span className="text-xs text-slate-400 font-medium">Mon — Fri</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Faculty & staff presence consistency</p>

            {/* Chart Columns Simulation */}
            <div className="grid grid-cols-5 gap-2 items-end h-36 mt-6 pt-4 border-b border-slate-100 pb-2">
              {[
                { day: 'Mon', rate: 94, late: 2 },
                { day: 'Tue', rate: 91, late: 4 },
                { day: 'Wed', rate: 96, late: 1 },
                { day: 'Thu', rate: 89, late: 5 },
                { day: 'Fri (Today)', rate: stats.attendanceRate || 88, late: stats.late }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.rate}%
                  </span>
                  <div
                    className="w-full max-w-8 rounded-t-lg bg-indigo-500 group-hover:bg-indigo-600 transition-all shadow-xs"
                    style={{ height: `${item.rate}%` }}
                  />
                  <span className="text-[10px] font-bold text-slate-500 mt-1">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Present
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Late Alert
              </span>
            </div>
            <span className="text-slate-400 text-[11px]">Avg: 92%</span>
          </div>
        </div>

        {/* Telegram Automated Integration Status */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Telegram Alerts Live</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Automated dispatch to Telegram Admin & Staff</p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Late Arrival Alerts:</span>
                <span className="font-bold text-emerald-600">Active (Instant)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Absence Detection Alerts:</span>
                <span className="font-bold text-emerald-600">Active (60m past start)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Daily Attendance Summary:</span>
                <span className="font-bold text-slate-700">Scheduled 17:30</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Interactive Bot Commands:</span>
                <span className="font-bold text-indigo-600">/checkin /status /help</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Test or reconfigure bot</span>
            <button
              onClick={() => onNavigate('telegram')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Bot Center</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Filter Bar & Today's Attendance Roster */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              {isKhmer ? 'បញ្ជីវត្តមានថ្ងៃនេះ' : "Today's Attendance Roster"}
            </h3>
            <p className="text-xs text-slate-500">
              {isKhmer
                ? 'កំណត់ត្រាវត្តមានផ្ទាល់ តាមដានតាមដេប៉ាតឺម៉ង់ និងសិទ្ធិអនុញ្ញាត'
                : 'Live records filtered by department and status permissions.'}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-semibold focus:outline-hidden"
              />
            </div>

            {/* Department filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-semibold focus:outline-hidden"
              >
                <option value="All">{isKhmer ? 'គ្រប់ដេប៉ាតឺម៉ង់' : 'All Departments'}</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-semibold focus:outline-hidden"
              >
                <option value="All">{isKhmer ? 'គ្រប់ស្ថានភាព' : 'All Statuses'}</option>
                <option value="Present">{isKhmer ? 'មានវត្តមាន' : 'Present'}</option>
                <option value="Late">{isKhmer ? 'មកយឺត' : 'Late'}</option>
                <option value="Absent">{isKhmer ? 'អវត្តមាន' : 'Absent'}</option>
                <option value="Leave">{isKhmer ? 'សុំច្បាប់' : 'On Leave'}</option>
                <option value="Missing Check-out">{isKhmer ? 'ខកខានស្កេនចេញ' : 'Missing Check-out'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{isKhmer ? 'ឈ្មោះបុគ្គលិក / គ្រូ' : 'Staff Member'}</th>
                <th className="py-3 px-4">{isKhmer ? 'តួនាទី & ផ្នែក' : 'Role & Dept'}</th>
                <th className="py-3 px-4">{isKhmer ? 'កាលវិភាគ' : 'Schedule'}</th>
                <th className="py-3 px-4">{isKhmer ? 'ស្កេនចូល' : 'Check-in'}</th>
                <th className="py-3 px-4">{isKhmer ? 'ស្កេនចេញ' : 'Check-out'}</th>
                <th className="py-3 px-4">{isKhmer ? 'ស្ថានភាព' : 'Status & Lateness'}</th>
                <th className="py-3 px-4">{isKhmer ? 'ផ្ទៀងផ្ទាត់ GPS' : 'GPS Verified'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {isKhmer ? 'មិនមានកំណត់ត្រាវត្តមានត្រូវនឹងការស្វែងរកឡើយ' : 'No attendance records found matching filters.'}
                  </td>
                </tr>
              ) : (
                filteredAttendance.map(record => {
                  const statusColors = {
                    Present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    Late: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
                    Absent: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
                    'Early Leave': 'bg-orange-100 text-orange-800 border-orange-200',
                    Leave: 'bg-purple-100 text-purple-800 border-purple-200',
                    Holiday: 'bg-blue-100 text-blue-800 border-blue-200',
                    'Missing Check-out': 'bg-rose-50 text-rose-700 border-rose-200',
                    'Off Day': 'bg-slate-100 text-slate-600 border-slate-200'
                  }[record.status] || 'bg-slate-100 text-slate-700 border-slate-200';

                  const getStatusLabel = (status: string) => {
                    if (!isKhmer) return status;
                    switch (status) {
                      case 'Present': return 'មានវត្តមាន';
                      case 'Late': return 'មកយឺត';
                      case 'Absent': return 'អវត្តមាន';
                      case 'Leave': return 'សុំច្បាប់';
                      case 'Early Leave': return 'ចេញមុនម៉ោង';
                      case 'Holiday': return 'ថ្ងៃឈប់សម្រាក';
                      case 'Missing Check-out': return 'ខកខានស្កេនចេញ';
                      case 'Off Day': return 'ថ្ងៃសម្រាក';
                      default: return status;
                    }
                  };

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>
                          <span>
                            {isKhmer && record.khmerName ? record.khmerName : record.personName}
                          </span>
                          {record.khmerName && !isKhmer && (
                            <span className="text-[11px] text-slate-400 ml-1.5 font-khmer">
                              ({record.khmerName})
                            </span>
                          )}
                          {isKhmer && (
                            <span className="text-[11px] text-slate-400 ml-1.5 block sm:inline">
                              ({record.personName})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize font-medium text-slate-700">
                          {isKhmer ? (record.personType === 'teacher' ? 'គ្រូបង្រៀន' : 'បុគ្គលិក') : record.personType}
                        </span>
                        <span className="text-slate-400 text-[10px] block">{record.department}</span>
                      </td>
                      <td className="py-3 px-4">
                        {record.subject ? (
                          <div>
                            <span className="font-extrabold text-indigo-900 block text-xs">
                              {record.subject}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {record.gradeClass || ''} {record.room ? `• ${record.room}` : ''} ({record.scheduledStart} - {record.scheduledEnd})
                            </span>
                          </div>
                        ) : (
                          <div className="text-slate-600 font-mono text-[11px]">
                            {record.scheduledStart} - {record.scheduledEnd}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {record.checkInTime || <span className="text-slate-400 font-normal">--:--</span>}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {record.checkOutTime || <span className="text-slate-400 font-normal">--:--</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${statusColors}`}>
                            {getStatusLabel(record.status)}
                          </span>
                          {record.lateMinutes > 0 && (
                            <span className="text-[10px] font-bold text-amber-700">
                              +{record.lateMinutes}{isKhmer ? 'ន' : 'm'} {isKhmer ? 'យឺត' : 'late'}
                            </span>
                          )}
                          {record.earlyLeaveMinutes > 0 && (
                            <span className="text-[10px] font-bold text-orange-700">
                              -{record.earlyLeaveMinutes}{isKhmer ? 'ន' : 'm'} {isKhmer ? 'ចេញមុន' : 'early'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {record.locationVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            {isKhmer ? 'បានផ្ទៀងផ្ទាត់' : 'Verified'}
                          </span>
                        ) : record.checkInTime ? (
                          <span className="text-[11px] text-slate-400">
                            {isKhmer ? 'ទូទៅ' : 'Standard'}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 pt-2">
          <span>
            {isKhmer
              ? `បង្ហាញ ${filteredAttendance.length} កំណត់ត្រា សម្រាប់ថ្ងៃទី ${selectedDate}`
              : `Showing ${filteredAttendance.length} records for ${selectedDate}`}
          </span>
          <button
            onClick={() => onNavigate('attendance')}
            className="font-bold text-indigo-600 hover:text-indigo-800"
          >
            {isKhmer ? 'គ្រប់គ្រងវត្តមានទាំងអស់ និងការកែប្រែ →' : 'Manage All Records & Corrections →'}
          </button>
        </div>

      </div>

    </div>
  );
};
