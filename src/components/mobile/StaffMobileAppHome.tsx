import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { GeoService } from '../../services/geoService.ts';
import {
  Teacher,
  Employee,
  TeacherSubjectSchedule,
  Schedule,
  AttendanceRecord,
  Holiday,
  LeaveRequest
} from '../../types/index.ts';
import { NavTab } from '../layout/Sidebar.tsx';
import {
  LogIn,
  LogOut,
  Clock,
  CalendarDays,
  CalendarCheck,
  Palmtree,
  DollarSign,
  Video,
  Bell,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock4,
  ChevronRight,
  TrendingUp,
  Sparkles,
  RotateCw,
  QrCode,
  User,
  GraduationCap,
  Briefcase,
  Home,
  Wallet,
  Search,
  BookOpen,
  Send,
  X
} from 'lucide-react';
import { TelegramService } from '../../services/telegramService.ts';
import { TeacherProfileModal } from '../teachers/TeacherProfileModal.tsx';

interface StaffMobileAppHomeProps {
  onNavigate: (tab: NavTab) => void;
  onOpenCheckIn: () => void;
}

export const StaffMobileAppHome: React.FC<StaffMobileAppHomeProps> = ({
  onNavigate,
  onOpenCheckIn
}) => {
  const { currentUser } = useAuth();
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();

  const isTeacher = currentUser.role === 'teacher';
  const isEmployee = currentUser.role === 'employee';

  const [tick, setTick] = useState(0);
  const [deviceCoords, setDeviceCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoDistance, setGeoDistance] = useState<number | null>(null);
  const [isGpsRefreshing, setIsGpsRefreshing] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [scheduleTabFilter, setScheduleTabFilter] = useState<'all' | 'active' | 'absent'>('all');

  // Storage states
  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    StorageService.getTeachers().filter(t => t.status === 'Active')
  );
  const [employees, setEmployees] = useState<Employee[]>(() =>
    StorageService.getEmployees().filter(e => e.status === 'Active')
  );
  const [subjectSchedules, setSubjectSchedules] = useState<TeacherSubjectSchedule[]>(() =>
    StorageService.getSubjectSchedules()
  );
  const [schedules, setSchedules] = useState<Schedule[]>(() =>
    StorageService.getSchedules()
  );
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>(() =>
    StorageService.getAttendance()
  );
  const [holidays, setHolidays] = useState<Holiday[]>(() =>
    StorageService.getHolidays()
  );
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    StorageService.getLeaveRequests()
  );
  const [systemSettings, setSystemSettings] = useState(() =>
    StorageService.getSettings()
  );

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setTeachers(StorageService.getTeachers().filter(t => t.status === 'Active'));
      setEmployees(StorageService.getEmployees().filter(e => e.status === 'Active'));
      setSubjectSchedules(StorageService.getSubjectSchedules());
      setSchedules(StorageService.getSchedules());
      setAllAttendance(StorageService.getAttendance());
      setHolidays(StorageService.getHolidays());
      setLeaveRequests(StorageService.getLeaveRequests());
      setSystemSettings(StorageService.getSettings());
    });
    return unsub;
  }, []);

  // Update clock every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayHoliday = useMemo(() => AttendanceEngine.getHoliday(todayStr), [todayStr, holidays]);
  const isTodayHoliday = Boolean(todayHoliday);
  const todayDayIndex = useMemo(() => new Date().getDay(), []);
  const currentTimeStr = useMemo(() => AttendanceEngine.getCurrentTimeString(), [tick]);
  const curMins = useMemo(() => AttendanceEngine.timeToMinutes(currentTimeStr), [currentTimeStr]);

  // Active teacher or employee profile
  const activeTeacher = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.personId) {
      const match = teachers.find(
        t => t.id === currentUser.personId || t.teacherId?.toLowerCase() === currentUser.personId?.toLowerCase()
      );
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
    return teachers[0] || null;
  }, [currentUser, teachers]);

  const activeEmployee = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.personId) {
      const match = employees.find(
        e => e.id === currentUser.personId || e.employeeId?.toLowerCase() === currentUser.personId?.toLowerCase()
      );
      if (match) return match;
    }
    if (currentUser.email) {
      const match = employees.find(e => e.email && e.email.toLowerCase() === currentUser.email.toLowerCase());
      if (match) return match;
    }
    if (currentUser.fullName) {
      const match = employees.find(e => e.fullName.toLowerCase() === currentUser.fullName.toLowerCase());
      if (match) return match;
    }
    return employees[0] || null;
  }, [currentUser, employees]);

  // GPS verification
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setDeviceCoords(coords);
          const check = AttendanceEngine.verifyLocation(coords.latitude, coords.longitude, systemSettings);
          setGeoDistance(check.distance);
        },
        () => {
          setDeviceCoords(null);
          setGeoDistance(null);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [systemSettings]);

  const handleRefreshGps = async () => {
    setIsGpsRefreshing(true);
    try {
      const pos = await GeoService.getCurrentPosition({ highAccuracy: true, timeout: 8000, maximumAge: 0 });
      setDeviceCoords(pos);
      const check = AttendanceEngine.verifyLocation(pos.latitude, pos.longitude, systemSettings);
      setGeoDistance(check.distance);
      showToast(
        check.inside
          ? (isKhmer ? `📍 ក្នុងបរិវេណសាលា (ចម្ងាយ ${check.distance}ម)` : `Inside campus (${check.distance}m)`)
          : (isKhmer ? `⚠️ ក្រៅបរិវេណសាលា (ចម្ងាយ ${check.distance}ម)` : `Outside campus (${check.distance}m)`),
        check.inside ? 'success' : 'warning'
      );
    } catch (err: any) {
      showToast(err.message || 'GPS detection failed', 'error');
    } finally {
      setIsGpsRefreshing(false);
    }
  };

  // Today's assigned substitute classes (for Teacher OR Employee)
  const todayAssignedSubstituteClasses = useMemo(() => {
    const personId = isTeacher ? activeTeacher?.id : activeEmployee?.id;
    const targetId = personId || currentUser.personId || currentUser.id;
    if (!targetId) return [];

    const assignedSubs = StorageService.getAssignedSubstituteSchedules(targetId, todayStr);
    return assignedSubs.map(item => {
      const sub = item.schedule;
      const effectiveStart = item.assignee?.startTime || sub.startTime;
      const effectiveEnd = item.assignee?.endTime || sub.endTime;

      const rec = allAttendance.find(
        r => r.date === todayStr &&
             (r.personId === targetId || r.personName?.toLowerCase() === currentUser.fullName?.toLowerCase()) &&
             (r.subjectScheduleId === sub.id || r.scheduleId === sub.id) &&
             r.isSubstitute
      );
      const isCheckedIn = Boolean(rec?.checkInTime);
      const isCheckedOut = Boolean(rec?.checkOutTime);
      const sStart = AttendanceEngine.timeToMinutes(effectiveStart);
      const sEnd = AttendanceEngine.timeToMinutes(effectiveEnd);

      const isInSession = (isCheckedIn && !isCheckedOut) || (curMins >= sStart && curMins < sEnd && !isCheckedOut);
      const isUpcoming = curMins < sStart && !isCheckedIn;
      const isCompleted = isCheckedOut || (curMins >= sEnd && isCheckedIn);
      const isPassed = curMins >= sEnd && !isCheckedIn;
      const isAbsent = Boolean(rec?.status === 'Absent' || (isPassed && !isCheckedIn));
      const isLeave = rec?.status === 'Leave';

      return {
        schedule: {
          ...sub,
          startTime: effectiveStart,
          endTime: effectiveEnd
        },
        record: rec,
        isCheckedIn,
        isCheckedOut,
        isInSession,
        isUpcoming,
        isCompleted,
        isPassed,
        isAbsent,
        isLeave,
        isSubstitute: true,
        isReassignedDueToAbsence: false,
        substituteNames: undefined as string | undefined,
        absentNote: undefined as string | undefined,
        originalTeacherName: item.substitution.originalTeacherName,
        originalTeacherKhmer: item.substitution.originalTeacherKhmer,
        allocatedHours: item.assignee?.allocatedHours || item.substitution.totalScheduleHours,
        manualWage: item.assignee?.manualGrossWage
      };
    });
  }, [isTeacher, activeTeacher, activeEmployee, currentUser, todayStr, allAttendance, curMins]);

  // Today's teaching classes (for Teacher: includes owned and assigned substitute classes)
  const todayClasses = useMemo(() => {
    if (!isTeacher) return [];
    const myId = (activeTeacher?.id || '').toLowerCase();
    const myTeacherCode = (activeTeacher?.teacherId || '').toLowerCase();
    const myName = (currentUser.fullName || activeTeacher?.fullName || '').toLowerCase();
    const myKhmer = (currentUser.khmerName || activeTeacher?.khmerName || '').trim();
    const myPersonId = (currentUser.personId || '').toLowerCase();

    const regularClasses = subjectSchedules
      .filter(s => {
        if (!s.isActive) return false;
        const subTId = (s.teacherId || '').toLowerCase();
        const subName = (s.teacherName || '').toLowerCase();
        const subKhmer = (s.khmerTeacherName || '').trim();

        const isMatch =
          (myId && subTId === myId) ||
          (myTeacherCode && subTId === myTeacherCode) ||
          (myPersonId && subTId === myPersonId) ||
          (myName && subName === myName) ||
          (myKhmer && subKhmer === myKhmer);

        if (!isMatch) return false;
        if (s.daysOfWeek && Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0) {
          return s.daysOfWeek.includes(todayDayIndex);
        }
        return s.dayOfWeek === todayDayIndex;
      })
      .map(sub => {
        const rec = AttendanceEngine.findRecordForSubjectSchedule(sub, allAttendance, todayStr, teachers);
        const substitution = StorageService.findSubstitution(sub.id, todayStr);
        const isReassignedDueToAbsence = Boolean(substitution && substitution.status !== 'cancelled');
        const substituteNames = substitution?.assignees?.map(a => a.substituteName).join(', ') || substitution?.substituteName;
        const isCheckedIn = Boolean(rec?.checkInTime);
        const isCheckedOut = Boolean(rec?.checkOutTime);
        const sStart = AttendanceEngine.timeToMinutes(sub.startTime);
        const sEnd = AttendanceEngine.timeToMinutes(sub.endTime);

        const isInSession = (isCheckedIn && !isCheckedOut) || (curMins >= sStart && curMins < sEnd && !isCheckedOut);
        const isUpcoming = curMins < sStart && !isCheckedIn;
        const isCompleted = isCheckedOut || (curMins >= sEnd && isCheckedIn);
        const isPassed = curMins >= sEnd && !isCheckedIn;
        const isAbsent = Boolean(rec?.status === 'Absent' || isReassignedDueToAbsence || (isPassed && !isCheckedIn));
        const isLeave = rec?.status === 'Leave';

        return {
          schedule: sub,
          record: rec,
          isCheckedIn,
          isCheckedOut,
          isInSession,
          isUpcoming,
          isCompleted,
          isPassed,
          isAbsent,
          isLeave,
          isSubstitute: false,
          isReassignedDueToAbsence,
          substituteNames,
          absentNote: rec?.correctionNote || (isReassignedDueToAbsence ? `Absent - Reassigned to: ${substituteNames}` : isPassed ? 'Missed class without clock-in' : undefined),
          originalTeacherName: undefined as string | undefined,
          originalTeacherKhmer: undefined as string | undefined,
          allocatedHours: undefined as number | undefined,
          manualWage: undefined as number | undefined
        };
      });

    // Merge regular classes and substitute classes assigned to this teacher
    const combined = [...regularClasses];
    todayAssignedSubstituteClasses.forEach(subItem => {
      if (!combined.some(c => c.schedule.id === subItem.schedule.id)) {
        combined.push(subItem);
      }
    });

    return combined.sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
  }, [isTeacher, activeTeacher, subjectSchedules, allAttendance, todayStr, todayDayIndex, curMins, teachers, todayAssignedSubstituteClasses]);

  // Today's work shift (for Employee)
  const todayEmployeeShift = useMemo(() => {
    if (!isEmployee) return null;
    const empId = activeEmployee?.id;
    const empSchedules = schedules.filter(s => {
      if (!s.isActive) return false;
      if (empId && s.assignedPersonIds && s.assignedPersonIds.length > 0 && !s.assignedPersonIds.includes(empId)) return false;
      if (s.daysOfWeek && Array.isArray(s.daysOfWeek)) {
        return s.daysOfWeek.includes(todayDayIndex);
      }
      return false;
    });

    const primarySchedule = empSchedules[0] || null;
    const record = allAttendance.find(
      a => a.date === todayStr && (a.personId === empId || a.personId === currentUser.id)
    );

    return {
      schedule: primarySchedule,
      record
    };
  }, [isEmployee, activeEmployee, schedules, allAttendance, todayStr, todayDayIndex, currentUser.id]);

  // Today check-in status
  const todayRecord = useMemo(() => {
    const personId = isTeacher ? activeTeacher?.id : activeEmployee?.id;
    return allAttendance.find(
      a => a.date === todayStr && (a.personId === personId || a.personId === currentUser.id)
    );
  }, [isTeacher, activeTeacher, activeEmployee, allAttendance, todayStr, currentUser.id]);

  const isCheckedInToday = Boolean(todayRecord?.checkInTime);
  const isCheckedOutToday = Boolean(todayRecord?.checkOutTime);

  // Quick 8 Features Tiles (Matching Screenshot's 8-Icon Grid)
  const features = [
    {
      id: 'checkin',
      labelEn: 'Check In',
      labelKm: 'ស្កេនចូល',
      icon: LogIn,
      bgColor: isTodayHoliday ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-600',
      action: isTodayHoliday
        ? () => {
            showToast(
              isKhmer
                ? `មិនអនុញ្ញាតឱ្យស្កេនចូលទេ៖ ថ្ងៃនេះជាថ្ងៃឈប់សម្រាកបុណ្យ "${todayHoliday?.khmerName || todayHoliday?.name}"។`
                : `Check-in denied: Today is an official holiday — "${todayHoliday?.name}".`,
              'error'
            );
          }
        : onOpenCheckIn
    },
    {
      id: 'checkout',
      labelEn: 'Check Out',
      labelKm: 'ស្កេនចេញ',
      icon: LogOut,
      bgColor: 'bg-sky-50 text-sky-600',
      action: onOpenCheckIn
    },
    {
      id: 'timetable',
      labelEn: isTeacher ? 'Timetable' : 'Shifts',
      labelKm: isTeacher ? 'កាលវិភាគ' : 'វេនការងារ',
      icon: Clock,
      bgColor: 'bg-indigo-50 text-indigo-600',
      action: () => onNavigate('schedules')
    },
    {
      id: 'calendar',
      labelEn: 'Calendar',
      labelKm: 'ប្រតិទិន',
      icon: CalendarDays,
      bgColor: 'bg-blue-50 text-blue-600',
      action: () => onNavigate('monthly_calendar')
    },
    {
      id: 'leave',
      labelEn: 'Leave',
      labelKm: 'សុំច្បាប់',
      icon: CalendarCheck,
      bgColor: 'bg-purple-50 text-purple-600',
      action: () => onNavigate('leave')
    },
    {
      id: 'holidays',
      labelEn: 'Holidays',
      labelKm: 'ថ្ងៃឈប់',
      icon: Palmtree,
      bgColor: 'bg-teal-50 text-teal-600',
      action: () => onNavigate('holidays')
    },
    {
      id: 'history',
      labelEn: 'History',
      labelKm: 'វត្តមាន',
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50 text-emerald-600',
      action: () => onNavigate('attendance')
    },
    {
      id: 'manual',
      labelEn: 'Guide',
      labelKm: 'វីដេអូ',
      icon: Video,
      bgColor: 'bg-rose-50 text-rose-600',
      action: () => window.dispatchEvent(new CustomEvent('edutrack:open-video-manual'))
    }
  ];

  const unreadNotificationsCount = useMemo(() => {
    // Count pending leave requests or today's classes
    const leaves = leaveRequests.filter(l => l.status === 'Pending').length;
    return leaves > 0 ? leaves : 4;
  }, [leaveRequests]);

  const userDisplayName = isKhmer
    ? currentUser.khmerName || currentUser.fullName
    : currentUser.fullName;

  return (
    <div className="w-full flex justify-center py-0 sm:py-3 px-0 sm:px-2 font-sans select-none min-h-full">
      {/* Mobile-Inspired Frame matching Screenshot Style */}
      <div className="w-full max-w-md bg-white sm:rounded-2xl shadow-xl sm:border border-slate-200/80 overflow-hidden flex flex-col relative transition-all duration-300 min-h-[calc(100dvh-5rem)] sm:min-h-0">
        
        {/* ======================================================== */}
        {/* TOP VIBRANT BLUE HEADER (Flat, Clean - Curve Removed)     */}
        {/* ======================================================== */}
        <div className="bg-[#2563eb] text-white pt-5 pb-5 px-6 relative shadow-xs border-b border-blue-600/30">

          {/* Greeting: Hello! [User Name] & Notification Bell */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div>
              <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isKhmer ? 'សួស្តី!' : 'Hello!'}
              </p>
              <h1 className="text-base sm:text-lg font-bold text-blue-100 mt-0.5 truncate max-w-[240px]">
                {userDisplayName}
              </h1>
              
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs text-blue-200/90 font-medium">
                  {isTeacher
                    ? (isKhmer ? 'សាស្រ្តាចារ្យបង្រៀន' : 'Faculty Teacher')
                    : (isKhmer ? 'បុគ្គលិកប្រតិបត្តិការ' : 'Staff Employee')}
                  {' • '}
                  {activeTeacher?.department || activeEmployee?.department || 'EduTrack'}
                </span>

                {/* Compact GPS status chip */}
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-semibold backdrop-blur-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${geoDistance !== null && geoDistance <= systemSettings.geofenceRadiusMeters ? 'bg-emerald-400 animate-pulse' : 'bg-amber-300'}`} />
                  <span>
                    {geoDistance !== null && geoDistance <= systemSettings.geofenceRadiusMeters
                      ? (isKhmer ? `ក្នុងបរិវេណ (${geoDistance}ម)` : `In Campus (${geoDistance}m)`)
                      : geoDistance !== null
                      ? (isKhmer ? `ក្រៅបរិវេណ (${geoDistance}ម)` : `Outside (${geoDistance}m)`)
                      : (isKhmer ? 'GPS សកម្ម' : 'GPS Active')}
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshGps}
                    disabled={isGpsRefreshing}
                    className="p-0.5 hover:text-blue-200 cursor-pointer"
                    title="Refresh GPS"
                  >
                    <RotateCw className={`w-2.5 h-2.5 ${isGpsRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationDrawerOpen(!isNotificationDrawerOpen)}
                className="w-11 h-11 rounded-full bg-white text-blue-600 shadow-lg flex items-center justify-center hover:bg-blue-50 transition-transform active:scale-90 cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-blue-600" />
              </button>
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[11px] flex items-center justify-center shadow-md border-2 border-white animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* "FEATURES" SECTION (8-Icon Grid - Screenshot Signature)  */}
        {/* ======================================================== */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {isKhmer ? 'មុខងារចម្បង' : 'Features'}
            </h2>
            <span className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => onNavigate('schedules')}>
              {isKhmer ? 'មើលទាំងអស់' : 'View All'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            {features.map(item => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className="flex flex-col items-center gap-1.5 p-1 rounded-2xl hover:bg-slate-50 active:scale-95 transition-transform cursor-pointer group"
                >
                  <div className={`w-14 h-14 rounded-2xl ${item.bgColor} flex items-center justify-center shadow-xs group-hover:shadow-md transition-shadow`}>
                    <IconComp className="w-6 h-6 transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 truncate max-w-[68px]">
                    {isKhmer ? item.labelKm : item.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RECENT ACTIVITY & TIMELINE ("Today's Schedule")          */}
        {/* ======================================================== */}
        {/* ======================================================== */}
        {/* RECENT ACTIVITY & TIMELINE ("Today's Schedule")          */}
        {/* ======================================================== */}
        <div className="px-6 pt-5 pb-8 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {isKhmer ? 'កាលវិភាគ & វត្តមានថ្ងៃនេះ' : "Today's Schedule"}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('monthly_calendar')}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              {isKhmer ? 'ប្រតិទិនខែ →' : 'Monthly →'}
            </button>
          </div>

          {/* Teacher: Filter Pills (All / Active / Absent) */}
          {isTeacher && todayClasses.length > 0 && (() => {
            const absentList = todayClasses.filter(c => c.isAbsent);
            const absentCount = absentList.length;
            const activeCount = todayClasses.length - absentCount;

            return (
              <div className="space-y-3 mb-3.5">
                {/* 🚨 AUTO DISPLAY ABSENT ASSIGNED SCHEDULE ALERT BANNER */}
                {absentCount > 0 && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 via-rose-100/60 to-rose-50 border-2 border-rose-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-rose-600/30 mt-0.5 sm:mt-0">
                        <AlertTriangle className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-xs sm:text-sm text-rose-950">
                            {isKhmer ? 'កាលវិភាគអវត្តមាន (Absent Assigned Schedule)' : 'Absent Assigned Schedule Alert'}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white shadow-2xs">
                            {absentCount} {isKhmer ? 'ម៉ោងអវត្តមាន' : 'Class(es) Absent'}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-800/90 mt-0.5 leading-snug">
                          {isKhmer
                            ? 'កាលវិភាគបង្រៀនរបស់អ្នកត្រូវបានសម្គាល់ជា "អវត្តមាន" ឬបានចាត់តាំងគ្រូជំនួស។ សូមពិនិត្យវត្តមាន ឬប្តឹងតវ៉ា។'
                            : 'Your assigned class has been marked Absent or reassigned to a substitute. Please verify records.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setScheduleTabFilter(f => f === 'absent' ? 'all' : 'absent')}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          scheduleTabFilter === 'absent'
                            ? 'bg-rose-700 text-white shadow-xs'
                            : 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {scheduleTabFilter === 'absent' ? (isKhmer ? 'បង្ហាញទាំងអស់' : 'Show All') : (isKhmer ? 'មើលអវត្តមាន' : 'View Absent')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('schedules')}
                        className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        {isKhmer ? 'កាលវិភាគពេញ' : 'Schedules'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setScheduleTabFilter('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      scheduleTabFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isKhmer ? `ទាំងអស់ (${todayClasses.length})` : `All (${todayClasses.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleTabFilter('active')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      scheduleTabFilter === 'active'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isKhmer ? `សកម្ម (${activeCount})` : `Active (${activeCount})`}
                  </button>
                  {absentCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setScheduleTabFilter('absent')}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                        scheduleTabFilter === 'absent'
                          ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30 ring-2 ring-rose-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 animate-pulse'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>{isKhmer ? `🚨 អវត្តមាន (${absentCount})` : `🚨 Absent (${absentCount})`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* List of today's periods / shifts */}
          <div className="space-y-2.5">
            {isTeacher && todayClasses.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
                {isKhmer ? 'គ្មានកាលវិភាគបង្រៀនសម្រាប់ថ្ងៃនេះទេ' : 'No classes scheduled for today.'}
              </div>
            ) : isTeacher ? (
              (() => {
                const classesToShow =
                  scheduleTabFilter === 'absent'
                    ? todayClasses.filter(c => c.isAbsent)
                    : scheduleTabFilter === 'active'
                    ? todayClasses.filter(c => !c.isAbsent)
                    : todayClasses;

                if (classesToShow.length === 0) {
                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
                      {scheduleTabFilter === 'absent'
                        ? (isKhmer ? 'គ្មានកាលវិភាគអវត្តមានសម្រាប់ថ្ងៃនេះទេ' : 'No absent classes today.')
                        : (isKhmer ? 'គ្មានកាលវិភាគក្នុងតម្រងនេះទេ' : 'No classes match this filter.')}
                    </div>
                  );
                }

                return classesToShow.map((item, idx) => {
                  const sub = item.schedule;
                  const rec = item.record;
                  return (
                    <div
                      key={sub.id || idx}
                      className={`p-3.5 rounded-2xl border transition-all shadow-2xs ${
                        item.isAbsent
                          ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400 ring-1 ring-rose-200/60'
                          : 'bg-slate-50 border-slate-200/80 hover:border-blue-300'
                      } flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          item.isAbsent
                            ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {sub.periodName.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`text-xs sm:text-sm font-black truncate ${
                              item.isAbsent ? 'text-rose-950' : 'text-slate-900'
                            }`}>
                              {sub.subject}
                            </h4>
                            {item.isSubstitute && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                <span>🔄</span>
                                <span>{isKhmer ? `បង្រៀនជំនួស (${item.originalTeacherKhmer || item.originalTeacherName || 'គ្រូ'})` : `Sub for ${item.originalTeacherName}`}</span>
                              </span>
                            )}
                            {item.isReassignedDueToAbsence && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                                <span>🔄</span>
                                <span>{isKhmer ? `ជំនួសដោយ៖ ${item.substituteNames}` : `Sub: ${item.substituteNames}`}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="font-mono">{sub.startTime} - {sub.endTime}</span>
                            <span>•</span>
                            <span>{sub.room}</span>
                            {item.allocatedHours && (
                              <>
                                <span>•</span>
                                <span className="text-amber-700 font-semibold">{item.allocatedHours}h</span>
                              </>
                            )}
                          </p>
                          {item.isAbsent && item.absentNote && (
                            <p className="text-[10px] text-rose-700 font-medium mt-1 bg-rose-100/70 border border-rose-200/80 px-2 py-0.5 rounded-md inline-block">
                              ⚠️ {item.absentNote}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        {item.isCheckedOut ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            {isKhmer ? 'បានចេញ' : 'Done'}
                          </span>
                        ) : item.isCheckedIn ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                            {isKhmer ? 'ក្នុងថ្នាក់' : 'In Class'}
                          </span>
                        ) : item.isLeave ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                            {isKhmer ? '📋 សុំច្បាប់' : 'Leave'}
                          </span>
                        ) : item.isAbsent ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white border border-rose-700 flex items-center gap-1 shadow-xs shadow-rose-600/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span>{isKhmer ? 'អវត្តមាន' : 'Absent'}</span>
                          </span>
                        ) : item.isInSession ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {isKhmer ? 'ដល់ម៉ោង' : 'Active'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-200 text-slate-600">
                            {isKhmer ? 'ត្រៀម' : 'Upcoming'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              /* Employee Shift */
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        {todayEmployeeShift?.schedule?.name || (isKhmer ? 'វេនការងារទូទៅ' : 'Standard Shift')}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {todayEmployeeShift?.schedule?.startTime || '08:00'} - {todayEmployeeShift?.schedule?.endTime || '17:00'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isTodayHoliday ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {isKhmer ? 'ថ្ងៃឈប់សម្រាកបុណ្យ' : 'Holiday: Closed'}
                      </span>
                    ) : isCheckedInToday ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {isKhmer ? 'បានស្កេនចូល' : 'Present'}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
                        {isKhmer ? 'មិនទាន់ស្កេន' : 'Pending In'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Assigned Substitute Classes for Staff / Employee */}
                {todayAssignedSubstituteClasses.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 px-1">
                      <span>🔄</span>
                      <span>{isKhmer ? 'កាលវិភាគបង្រៀនជំនួសដែលបានចាត់តាំង (Assigned Substitute Classes)' : 'Assigned Substitute Classes'}</span>
                    </div>
                    {todayAssignedSubstituteClasses.map((item, idx) => {
                      const sub = item.schedule;
                      return (
                        <div
                          key={sub.id || idx}
                          className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 hover:border-amber-300 flex items-center justify-between gap-3 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                              {sub.periodName ? sub.periodName.slice(0, 2) : 'SUB'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                  {sub.subject}
                                </h4>
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                                  {isKhmer ? `ជំនួសគ្រូ ${item.originalTeacherKhmer || item.originalTeacherName}` : `Sub for ${item.originalTeacherName}`}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="font-mono">{sub.startTime} - {sub.endTime}</span>
                                <span>•</span>
                                <span>{sub.room}</span>
                                {item.allocatedHours && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-800 font-semibold">{item.allocatedHours}h</span>
                                  </>
                                )}
                                {item.manualWage !== undefined && item.manualWage > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-bold">${item.manualWage.toFixed(2)}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div>
                            {item.isCheckedOut ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                {isKhmer ? 'បានចេញ' : 'Done'}
                              </span>
                            ) : item.isCheckedIn ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                                {isKhmer ? 'ក្នុងថ្នាក់' : 'In Class'}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={onOpenCheckIn}
                                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-2xs"
                              >
                                {isKhmer ? 'ស្កេនចូល' : 'Check In'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notification Drawer Modal */}
        {isNotificationDrawerOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h3 className="font-black text-slate-900 text-sm">
                    {isKhmer ? 'ការជូនដំណឹង' : 'Notifications'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotificationDrawerOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-xs">
                  <span className="font-bold text-blue-900 block">
                    {isKhmer ? 'ស្វាគមន៍មកកាន់ប្រព័ន្ធវត្តមាន' : 'Welcome to Faculty Portal'}
                  </span>
                  <span className="text-blue-700">
                    {isKhmer ? 'សូមកុំភ្លេចស្កេនវត្តមានចូល និងចេញឱ្យបានទាន់ពេលវេលា' : 'Remember to punch in and out for every teaching session.'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
                  <span className="font-bold text-emerald-900 block">
                    {isKhmer ? 'ទីតាំង GPS សកម្ម' : 'Geofence Active'}
                  </span>
                  <span className="text-emerald-700">
                    {isKhmer ? 'ទីតាំងត្រូវបានផ្ទៀងផ្ទាត់ដោយស្វ័យប្រវត្តិក្បែរបរិវេណសាលា' : 'Campus location verified for automated punches.'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNotificationDrawerOpen(false)}
                className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
              >
                {isKhmer ? 'យល់ព្រម' : 'Got it'}
              </button>
            </div>
          </div>
        )}

        {/* Teacher Profile Modal */}
        {isProfileModalOpen && (
          <TeacherProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
          />
        )}

      </div>
    </div>
  );
};
