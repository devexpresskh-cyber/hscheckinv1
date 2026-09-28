import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { Employee, Schedule, Holiday } from '../../types/index.ts';
import { EmployeeMonthlyPresentCalendar } from './EmployeeMonthlyPresentCalendar.tsx';
import {
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Building,
  Palmtree,
  UserCheck,
  History,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  LogOut,
  LogIn,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface EmployeeStaffCalendarProps {
  onNavigateToHistory?: () => void;
}

export const EmployeeStaffCalendar: React.FC<EmployeeStaffCalendarProps> = ({ onNavigateToHistory }) => {
  const { currentUser } = useAuth();
  const { showToast } = useNotification();
  const { isKhmer } = useLanguage();

  const [timeStr, setTimeStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'monthly_present' | 'weekly_shifts' | 'holidays'>('monthly_present');

  // Storage data
  const [employees, setEmployees] = useState<Employee[]>(() => StorageService.getEmployees());
  const [schedules, setSchedules] = useState<Schedule[]>(() => StorageService.getSchedules());
  const [attendance, setAttendance] = useState(() => StorageService.getAttendance());
  const [holidays, setHolidays] = useState<Holiday[]>(() => StorageService.getHolidays());

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setEmployees(StorageService.getEmployees());
      setSchedules(StorageService.getSchedules());
      setAttendance(StorageService.getAttendance());
      setHolidays(StorageService.getHolidays());
    });
    return unsub;
  }, []);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString(isKhmer ? 'km-KH' : 'en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [isKhmer]);

  // Identify current employee profile
  const employeeProfile = useMemo(() => {
    if (!currentUser) return null;
    return employees.find(
      e =>
        (currentUser.personId && e.id === currentUser.personId) ||
        e.id === currentUser.id ||
        (e.email && currentUser.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (e.employeeId && currentUser.email && currentUser.email.toLowerCase().includes(e.employeeId.toLowerCase())) ||
        e.fullName.toLowerCase() === currentUser.fullName.toLowerCase()
    ) || null;
  }, [currentUser, employees]);

  // Find assigned or default schedule
  const assignedSchedule = useMemo(() => {
    if (employeeProfile?.assignedScheduleId) {
      const sch = schedules.find(s => s.id === employeeProfile.assignedScheduleId);
      if (sch) return sch;
    }
    // Match by department or default standard
    const deptSch = schedules.find(
      s => s.department?.toLowerCase() === employeeProfile?.department?.toLowerCase()
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
        department: employeeProfile?.department || 'Administration'
      }
    );
  }, [employeeProfile, schedules]);

  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const currentDayIndex = todayDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Check today's attendance record
  const todayRecord = useMemo(() => {
    if (!currentUser) return null;
    return attendance.find(
      r =>
        (r.personId === employeeProfile?.id ||
          r.personId === currentUser.id ||
          r.personName.toLowerCase() === currentUser.fullName.toLowerCase()) &&
        r.date === todayStr
    ) || null;
  }, [attendance, employeeProfile, currentUser, todayStr]);

  // Handlers for instant Check-in and Check-out
  const handleCheckIn = () => {
    if (!employeeProfile && !currentUser) return;
    setIsSubmitting(true);

    const personId = employeeProfile?.id || currentUser.id;
    const personName = employeeProfile?.fullName || currentUser.fullName;
    const khmerName = employeeProfile?.khmerName || currentUser.khmerName;
    const department = employeeProfile?.department || currentUser.department || 'Administration';

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
            ? `បានស្កេនចូលដោយជោគជ័យ៖ ${khmerName || personName} (${result.record?.status === 'Late' ? 'មកយឺត' : 'ទាន់ម៉ោង'})`
            : result.message,
          result.record?.status === 'Late' ? 'warning' : 'success'
        );
      } else {
        showToast(result.message, 'error');
      }
    }, 300);
  };

  const handleCheckOut = () => {
    if (!employeeProfile && !currentUser) return;
    setIsSubmitting(true);

    const personId = employeeProfile?.id || currentUser.id;
    const personName = employeeProfile?.fullName || currentUser.fullName;

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
            ? `បានស្កេនចេញដោយជោគជ័យ៖ ${employeeProfile?.khmerName || personName}`
            : result.message,
          'success'
        );
      } else {
        showToast(result.message, 'error');
      }
    }, 300);
  };

  // Week days definition
  const weekDays = [
    { index: 1, nameEn: 'Monday', nameKm: 'ថ្ងៃចន្ទ', shortEn: 'Mon', shortKm: 'ចន្ទ' },
    { index: 2, nameEn: 'Tuesday', nameKm: 'ថ្ងៃអង្គារ', shortEn: 'Tue', shortKm: 'អង្គារ' },
    { index: 3, nameEn: 'Wednesday', nameKm: 'ថ្ងៃពុធ', shortEn: 'Wed', shortKm: 'ពុធ' },
    { index: 4, nameEn: 'Thursday', nameKm: 'ថ្ងៃព្រហស្បតិ៍', shortEn: 'Thu', shortKm: 'ព្រហ' },
    { index: 5, nameEn: 'Friday', nameKm: 'ថ្ងៃសុក្រ', shortEn: 'Fri', shortKm: 'សុក្រ' },
    { index: 6, nameEn: 'Saturday', nameKm: 'ថ្ងៃសៅរ៍', shortEn: 'Sat', shortKm: 'សៅរ៍' },
    { index: 0, nameEn: 'Sunday', nameKm: 'ថ្ងៃអាទិត្យ', shortEn: 'Sun', shortKm: 'អាទិត្យ' }
  ];

  return (
    <div className={`space-y-5 max-w-4xl mx-auto pb-10 ${isKhmer ? 'font-khmer' : 'font-sans'}`}>
      
      {/* 1. Employee Identity & Duty Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {employeeProfile?.photoUrl && employeeProfile.photoUrl.trim() ? (
              <img
                src={employeeProfile.photoUrl.trim()}
                alt=""
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-600/20 shrink-0">
                {(employeeProfile?.fullName || currentUser.fullName).charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                  {isKhmer ? employeeProfile?.khmerName || currentUser.khmerName || currentUser.fullName : currentUser.fullName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700">
                  {employeeProfile?.employeeId || 'STAFF'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {employeeProfile?.position || 'Staff Member'} • {employeeProfile?.department || currentUser.department || 'Administration'}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{isKhmer ? 'គណនីបុគ្គលិកផ្ទាល់ខ្លួន (Personal Staff Portal)' : 'Authenticated Personal Staff Account'}</span>
              </div>
            </div>
          </div>

          {/* Live Clock & Shift Badge */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-indigo-900 bg-indigo-50 px-3 py-1.5 rounded-xl font-bold">
              <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span className="font-mono text-sm">{timeStr || '00:00:00'}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium sm:mt-1">
              {todayDate.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Today's Duty & Quick Check-in/Check-out Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden">
        {/* Subtle background graphic */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isKhmer ? 'វេនការងារថ្ងៃនេះ (Today\'s Shift)' : 'Today\'s Work Shift'}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {isKhmer ? assignedSchedule.khmerName || assignedSchedule.name : assignedSchedule.name}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-indigo-200 font-medium">
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-indigo-300" />
                <span>{assignedSchedule.startTime} - {assignedSchedule.endTime}</span>
              </div>
              {assignedSchedule.breakStart && assignedSchedule.breakEnd && (
                <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                  <span>{isKhmer ? 'សម្រាកបាយ៖' : 'Lunch Break:'} {assignedSchedule.breakStart} - {assignedSchedule.breakEnd}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                <MapPin className="w-3.5 h-3.5 text-rose-300" />
                <span>{assignedSchedule.location || 'Heart School Campus'}</span>
              </div>
            </div>

            {/* Current Duty State Badge */}
            <div className="pt-1">
              {!todayRecord ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {isKhmer ? 'មិនទាន់ស្កេនចូលនៅឡើយ (Not Checked In)' : 'Scheduled • Not Checked In Yet'}
                </span>
              ) : todayRecord.checkOutTime ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isKhmer ? `បានបញ្ចប់ការងារថ្ងៃនេះ (ម៉ោង ${todayRecord.checkInTime} - ${todayRecord.checkOutTime})` : `Shift Completed (In: ${todayRecord.checkInTime} • Out: ${todayRecord.checkOutTime})`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  {isKhmer ? `កំពុងបម្រើការ (ស្កេនចូលម៉ោង ${todayRecord.checkInTime})` : `On Duty (Checked in at ${todayRecord.checkInTime})`}
                </span>
              )}
            </div>
          </div>

          {/* Action Button: Check In / Check Out */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            {!todayRecord ? (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{isKhmer ? 'ស្កេនវត្តមានចូល (Check In)' : 'Check In Now'}</span>
                  </>
                )}
              </button>
            ) : !todayRecord.checkOutTime ? (
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all duration-200 active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>{isKhmer ? 'ស្កេនវត្តមានចេញ (Check Out)' : 'Check Out Now'}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="px-5 py-3 rounded-2xl bg-white/10 text-center text-xs font-bold text-emerald-200 border border-white/15">
                ✓ {isKhmer ? 'បានកត់ត្រាវត្តមានពេញលេញ' : 'Attendance Logged'}
              </div>
            )}

            {onNavigateToHistory && (
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>{isKhmer ? 'មើលប្រវត្តិវត្តមានរបស់ខ្ញុំ' : 'View Check-in History'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Navigation View Switcher (Monthly Present Calendar | Weekly Shifts | Holidays) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('monthly_present')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'monthly_present'
                ? 'bg-white text-indigo-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <span>{isKhmer ? 'ប្រតិទិនវត្តមានប្រចាំខែ (Monthly Present)' : 'Monthly Present Calendar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weekly_shifts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'weekly_shifts'
                ? 'bg-white text-indigo-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>{isKhmer ? 'កាលវិភាគវេនការងារ (Weekly Shifts)' : 'Weekly Shift Roster'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('holidays')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'holidays'
                ? 'bg-white text-indigo-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palmtree className="w-4 h-4 text-emerald-600" />
            <span>{isKhmer ? 'ថ្ងៃឈប់សម្រាក (Holidays)' : 'School Holidays'}</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 text-xs text-slate-500 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{isKhmer ? 'កំណត់ត្រាវត្តមានបុគ្គលិកផ្លូវការ' : 'Official Staff Presence Roster'}</span>
        </div>
      </div>

      {/* 4. Tab Content Rendering */}
      {activeTab === 'monthly_present' && (
        <EmployeeMonthlyPresentCalendar
          initialEmployee={employeeProfile}
          onNavigateToHistory={onNavigateToHistory}
        />
      )}

      {/* 5. Weekly Work Schedule (Mon - Sun) */}
      {activeTab === 'weekly_shifts' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              <h3 className="font-black text-base text-slate-900">
                {isKhmer ? 'កាលវិភាគការងារប្រចាំសប្តាហ៍ (Weekly Shift Schedule)' : 'Weekly Work Shift Schedule'}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {assignedSchedule.daysOfWeek?.length || 6} {isKhmer ? 'ថ្ងៃ / សប្តាហ៍' : 'Days / Week'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
            {weekDays.map(day => {
              const isToday = day.index === currentDayIndex;
              const isWorkingDay = assignedSchedule.daysOfWeek?.includes(day.index) ?? (day.index !== 0);

              return (
                <div
                  key={day.index}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isToday
                      ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                      : isWorkingDay
                      ? 'bg-slate-50/70 border-slate-200'
                      : 'bg-slate-100/50 border-slate-200/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-black ${isToday ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {isKhmer ? day.shortKm : day.shortEn}
                    </span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-600 text-white">
                        {isKhmer ? 'ថ្ងៃនេះ' : 'Today'}
                      </span>
                    )}
                  </div>

                  {isWorkingDay ? (
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-700 text-[11px]">
                        {assignedSchedule.startTime} - {assignedSchedule.endTime}
                      </div>
                      {assignedSchedule.breakStart && (
                        <div className="text-[10px] text-slate-500">
                          {isKhmer ? 'សម្រាក' : 'Break'}: {assignedSchedule.breakStart}
                        </div>
                      )}
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                        {isKhmer ? 'ថ្ងៃធ្វើការ' : 'Duty'}
                      </span>
                    </div>
                  ) : (
                    <div className="py-2 text-center">
                      <span className="text-[10px] font-bold text-slate-400">
                        {isKhmer ? 'ឈប់សម្រាក' : 'Off Day'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Upcoming Holidays & School Off Days */}
      {activeTab === 'holidays' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-base text-slate-900">
              {isKhmer ? 'ប្រតិទិនថ្ងៃឈប់សម្រាកសាលា (School Holidays)' : 'School Holidays & Official Breaks'}
            </h3>
          </div>

          {holidays.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">
              {isKhmer ? 'មិនមានថ្ងៃឈប់សម្រាកនាពេលខាងមុខទេ' : 'No upcoming school holidays listed.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {holidays.slice(0, 6).map(h => (
                <div
                  key={h.id}
                  className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 flex items-start gap-2.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {isKhmer ? h.khmerName || h.name : h.name}
                    </h4>
                    <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                      {h.date} {h.endDate && h.endDate !== h.date ? `→ ${h.endDate}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
