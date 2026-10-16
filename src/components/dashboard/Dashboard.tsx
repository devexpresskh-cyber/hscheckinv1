import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { StorageService } from '../../services/storageService.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { AttendanceRecord, Teacher, Employee, Department, TeacherSubjectSchedule } from '../../types/index.ts';
import { PinnedCheckInWidget } from './PinnedCheckInWidget.tsx';
import { AdminRecordAttendanceModal } from '../attendance/AdminRecordAttendanceModal.tsx';
import { GeoService } from '../../services/geoService.ts';
import {
  Users,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
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
  MapPin,
  BookOpen,
  Clock,
  Activity,
  Layers,
  ChevronRight,
  Video,
  Download,
  Play,
  RotateCw,
  UserCheck,
  UserPlus,
  User,
  FileText,
  Smartphone,
  LayoutDashboard,
  CalendarDays,
  QrCode,
  ShieldCheck
} from 'lucide-react';

export const Dashboard: React.FC<{ onNavigate: (tab: any) => void; onOpenCheckIn?: () => void }> = ({ onNavigate, onOpenCheckIn }) => {
  const { currentUser, canAccessDepartment, hasPermission } = useAuth();
  const { showToast } = useNotification();
  const { t, isKhmer } = useLanguage();

  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin_hr' || currentUser.role === 'supervisor' || (!['teacher', 'employee'].includes(currentUser.role));

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [tick, setTick] = useState<number>(0);

  // Admin Record Attendance Modal State
  const [isAdminRecordModalOpen, setIsAdminRecordModalOpen] = useState<boolean>(false);
  const [adminRecordTeacherId, setAdminRecordTeacherId] = useState<string | undefined>(undefined);
  const [adminRecordScheduleId, setAdminRecordScheduleId] = useState<string | undefined>(undefined);
  const [liveClassTab, setLiveClassTab] = useState<'in_session' | 'all_today'>('in_session');

  // Device GPS State for Live Campus Geofence Badge
  const [deviceCoords, setDeviceCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoDistance, setGeoDistance] = useState<number | null>(null);
  const [isGpsRefreshing, setIsGpsRefreshing] = useState<boolean>(false);

  // Reactive state synchronized with StorageService to reflect state updates immediately
  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    StorageService.getTeachers().filter(t => t.status === 'Active')
  );
  const [employees, setEmployees] = useState<Employee[]>(() =>
    StorageService.getEmployees().filter(e => e.status === 'Active')
  );
  const [departments, setDepartments] = useState<Department[]>(() => StorageService.getDepartments());
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [systemSettings, setSystemSettings] = useState(() => StorageService.getSystemSettings());
  const [subjectSchedules, setSubjectSchedules] = useState<TeacherSubjectSchedule[]>(() =>
    StorageService.getSubjectSchedules()
  );

  // Subscribe to StorageService for immediate real-time state updates
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setTeachers(StorageService.getTeachers().filter(t => t.status === 'Active'));
      setEmployees(StorageService.getEmployees().filter(e => e.status === 'Active'));
      setDepartments(StorageService.getDepartments());
      setAllAttendance(StorageService.getAttendance());
      setSubjectSchedules(StorageService.getSubjectSchedules());
      setSystemSettings(StorageService.getSystemSettings());
    });
    return unsub;
  }, []);

  // Live ticker every 10 seconds to keep live active session statuses fresh
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDayIndex = useMemo(() => new Date().getDay(), []);
  const currentTimeStr = useMemo(() => AttendanceEngine.getCurrentTimeString(), [tick]);
  const curMins = useMemo(() => AttendanceEngine.timeToMinutes(currentTimeStr), [currentTimeStr]);

  // Compute live active teaching sessions right now across faculty
  const liveTeachingSessions = useMemo(() => {
    const todayClasses = subjectSchedules.filter(sub => {
      if (!sub.isActive) return false;
      if (sub.daysOfWeek && Array.isArray(sub.daysOfWeek) && sub.daysOfWeek.length > 0) {
        return sub.daysOfWeek.includes(todayDayIndex);
      }
      return sub.dayOfWeek === todayDayIndex;
    });

    return todayClasses.map(sub => {
      const rec = AttendanceEngine.findRecordForSubjectSchedule(sub, allAttendance, todayStr, teachers);
      const isCheckedIn = Boolean(rec?.checkInTime);
      const isCheckedOut = Boolean(rec?.checkOutTime);
      const sStart = AttendanceEngine.timeToMinutes(sub.startTime);
      const sEnd = AttendanceEngine.timeToMinutes(sub.endTime);

      const isInSession = (isCheckedIn && !isCheckedOut) || (curMins >= sStart && curMins < sEnd && !isCheckedOut);
      const isUpcoming = curMins < sStart && !isCheckedIn;
      const isCompleted = isCheckedOut || (curMins >= sEnd && isCheckedIn);

      return {
        schedule: sub,
        record: rec,
        isCheckedIn,
        isCheckedOut,
        isInSession,
        isUpcoming,
        isCompleted
      };
    });
  }, [subjectSchedules, allAttendance, todayDayIndex, todayStr, teachers, curMins]);

  const currentlyInClass = useMemo(() => {
    return liveTeachingSessions.filter(s => s.isInSession);
  }, [liveTeachingSessions]);

  // Current Week Days (Mon to Sun) for Mobile App Weekday Capsule Strip (Matching Screenshot Design)
  const currentWeekDays = useMemo(() => {
    const today = new Date();
    const curDow = today.getDay(); // 0 is Sun, 1 is Mon...
    const mondayDiff = curDow === 0 ? -6 : 1 - curDow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayDiff);

    const days = [];
    const enDayShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const kmDayShort = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហ', 'សុក្រ', 'សៅរ៍', 'អាទិត្យ'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;
      const dowIndex = d.getDay();
      const isSelected = dateStr === selectedDate;
      const isCurrentDay = dateStr === todayStr;

      // Count active classes on this day
      const dayClassesCount = subjectSchedules.filter(sub => {
        if (!sub.isActive) return false;
        if (sub.daysOfWeek && Array.isArray(sub.daysOfWeek) && sub.daysOfWeek.length > 0) {
          return sub.daysOfWeek.includes(dowIndex);
        }
        return sub.dayOfWeek === dowIndex;
      }).length;

      // Attendance records on this day
      const dayAttendance = allAttendance.filter(a => a.date === dateStr);
      const hasPresent = dayAttendance.some(a => a.status === 'Present');
      const hasLate = dayAttendance.some(a => a.status === 'Late');
      const hasAbsent = dayAttendance.some(a => a.status === 'Absent');

      days.push({
        date: d,
        dateStr,
        dayNumber: d.getDate(),
        dowIndex,
        labelEn: enDayShort[i],
        labelKm: kmDayShort[i],
        isSelected,
        isCurrentDay,
        dayClassesCount,
        hasPresent,
        hasLate,
        hasAbsent
      });
    }
    return days;
  }, [selectedDate, todayStr, subjectSchedules, allAttendance]);

  // Selected Day Classes for Mobile App Timeline
  const selectedDayClasses = useMemo(() => {
    const selDateObj = new Date(selectedDate);
    const selDow = isNaN(selDateObj.getTime()) ? todayDayIndex : selDateObj.getDay();

    const matched = subjectSchedules.filter(sub => {
      if (!sub.isActive) return false;
      if (sub.daysOfWeek && Array.isArray(sub.daysOfWeek) && sub.daysOfWeek.length > 0) {
        return sub.daysOfWeek.includes(selDow);
      }
      return sub.dayOfWeek === selDow;
    });

    return matched.map(sub => {
      const rec = AttendanceEngine.findRecordForSubjectSchedule(sub, allAttendance, selectedDate, teachers);
      const isCheckedIn = Boolean(rec?.checkInTime);
      const isCheckedOut = Boolean(rec?.checkOutTime);
      const sStart = AttendanceEngine.timeToMinutes(sub.startTime);
      const sEnd = AttendanceEngine.timeToMinutes(sub.endTime);

      const isToday = selectedDate === todayStr;
      const isInSession = isToday && ((isCheckedIn && !isCheckedOut) || (curMins >= sStart && curMins < sEnd && !isCheckedOut));
      const isUpcoming = isToday && (curMins < sStart && !isCheckedIn);
      const isCompleted = isCheckedOut || (isToday && curMins >= sEnd && isCheckedIn);

      return {
        schedule: sub,
        record: rec,
        isCheckedIn,
        isCheckedOut,
        isInSession,
        isUpcoming,
        isCompleted
      };
    }).sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
  }, [selectedDate, subjectSchedules, allAttendance, teachers, todayStr, todayDayIndex, curMins]);

  // Filter attendance records
  const filteredAttendance = useMemo(() => {
    const isTeacher = currentUser.role === 'teacher';
    return allAttendance.filter(record => {
      // Date filter
      if (selectedDate && record.date !== selectedDate) return false;
      // Teacher sees only owned attendance records
      if (isTeacher) {
        const isOwned =
          (currentUser.personId && record.personId === currentUser.personId) ||
          record.personId === currentUser.id ||
          record.personName.toLowerCase() === currentUser.fullName.toLowerCase();
        if (!isOwned) return false;
      } else {
        // Department scoping (supervisor restriction)
        if (!canAccessDepartment(record.department)) return false;
        // Dropdown department filter
        if (selectedDept !== 'All' && record.department !== selectedDept) return false;
      }
      // Status filter
      if (selectedStatus !== 'All' && record.status !== selectedStatus) return false;
      return true;
    });
  }, [allAttendance, selectedDate, selectedDept, selectedStatus, canAccessDepartment, currentUser]);

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

  // Query device GPS for home page status pill
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setDeviceCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          const check = AttendanceEngine.verifyLocation(
            pos.coords.latitude,
            pos.coords.longitude,
            systemSettings
          );
          setGeoDistance(check.distance);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
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
          ? (isKhmer ? `GPS ត្រឹមត្រូវ៖ ក្នុងបរិវេណសាលា (${check.distance}ម)` : `GPS Verified: Inside campus (${check.distance}m)`)
          : (isKhmer ? `ក្រៅបរិវេណសាលា៖ ចម្ងាយ ${check.distance.toLocaleString()}ម (លើស ${systemSettings.geofenceRadiusMeters}ម)` : `Outside Campus: ${check.distance.toLocaleString()}m (Allowed: ${systemSettings.geofenceRadiusMeters}m)`),
        check.inside ? 'success' : 'warning'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to detect GPS location', 'error');
    } finally {
      setIsGpsRefreshing(false);
    }
  };

  const handleAdminQuickCheckIn = (sub: TeacherSubjectSchedule) => {
    const holiday = AttendanceEngine.getHoliday();
    if (holiday) {
      const holidayLabel = holiday.khmerName ? `${holiday.name} (${holiday.khmerName})` : holiday.name;
      showToast(
        isKhmer
          ? `មិនអនុញ្ញាតឱ្យស្កេនចូលទេ៖ ថ្ងៃនេះជាថ្ងៃឈប់សម្រាកបុណ្យផ្លូវការ "${holidayLabel}"។`
          : `Check-in denied: Today is an official holiday — "${holidayLabel}". Check-in is not allowed on holidays.`,
        'error'
      );
      return;
    }

    const teacher = teachers.find(t => t.id === sub.teacherId || t.teacherId === sub.teacherId || t.fullName.toLowerCase() === sub.teacherName.toLowerCase());
    const res = AttendanceEngine.processCheckIn({
      personId: teacher?.id || sub.teacherId,
      personName: sub.teacherName,
      khmerName: teacher?.khmerName,
      personType: 'teacher',
      department: teacher?.department || 'Academic',
      scheduleId: sub.id,
      subjectScheduleId: sub.id,
      customTime: currentTimeStr,
      latitude: systemSettings.defaultLocationLatitude,
      longitude: systemSettings.defaultLocationLongitude,
      bypassGeofence: true
    });

    if (res.success) {
      showToast(
        isKhmer
          ? `បានកត់ត្រាស្កេនចូលជោគជ័យសម្រាប់ ${sub.teacherName} [${sub.subject}]`
          : `Recorded check-in for ${sub.teacherName} [${sub.subject}]`,
        'success'
      );
      setAllAttendance(StorageService.getAttendance());
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleAdminQuickCheckOut = (sub: TeacherSubjectSchedule) => {
    const teacher = teachers.find(t => t.id === sub.teacherId || t.teacherId === sub.teacherId || t.fullName.toLowerCase() === sub.teacherName.toLowerCase());
    const res = AttendanceEngine.processCheckOut({
      personId: teacher?.id || sub.teacherId,
      personName: sub.teacherName,
      subjectScheduleId: sub.id,
      customTime: currentTimeStr,
      autoSetToEndOfSchedule: true,
      latitude: systemSettings.defaultLocationLatitude,
      longitude: systemSettings.defaultLocationLongitude,
      bypassGeofence: true
    });

    if (res.success) {
      showToast(
        isKhmer
          ? `បានកត់ត្រាស្កេនចេញជោគជ័យសម្រាប់ ${sub.teacherName}`
          : `Recorded check-out for ${sub.teacherName}`,
        'success'
      );
      setAllAttendance(StorageService.getAttendance());
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleOpenAdminRecordModal = (teacherId?: string, scheduleId?: string) => {
    setAdminRecordTeacherId(teacherId);
    setAdminRecordScheduleId(scheduleId);
    setIsAdminRecordModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Pinned Check-In / Check-Out Station at Top Home Page (Hidden on Admin Dashboard, shown for staff) */}
      {!isAdmin && <PinnedCheckInWidget onOpenCheckIn={onOpenCheckIn} />}

      {/* Top Banner / Welcome & Quick Actions - Mobile App Sleek Navy Container */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                {currentUser.role === 'teacher'
                  ? (isKhmer ? 'ផតថលគ្រូបង្រៀន • សកម្ម' : 'Faculty Teacher Portal • Active')
                  : (isKhmer
                      ? `ឆ្នាំសិក្សា ${systemSettings.academicYear || '២០២៦-២០២៧'}`
                      : `Academic Year ${systemSettings.academicYear || '2026-2027'}`)}
              </span>
              <span className="text-xs text-slate-400">
                {currentUser.role === 'teacher'
                  ? (isKhmer ? 'កាលវិភាគបង្រៀន និងវត្តមានផ្ទាល់ខ្លួន' : 'Personal Teaching Schedule & Attendance')
                  : (isKhmer
                      ? `${systemSettings.currentSemester || 'ឆមាសទី ១'} (${systemSettings.academicStartDate || '01 Sep 2026'} – ${systemSettings.academicEndDate || '30 Jun 2027'})`
                      : `${systemSettings.currentSemester || 'Term 1'} (${systemSettings.academicStartDate || '2026-09-01'} to ${systemSettings.academicEndDate || '2027-06-30'})`)}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
              {currentUser.role === 'teacher'
                ? (isKhmer ? `ស្វាគមន៍សាស្រ្តាចារ្យ ${currentUser.khmerName || currentUser.fullName}` : `Welcome, ${currentUser.fullName}`)
                : (isKhmer ? 'ផ្ទាំងគ្រប់គ្រងវត្តមាន និងកាលវិភាគ' : 'Attendance & Schedule Dashboard')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {currentUser.role === 'teacher'
                ? (isKhmer
                    ? 'សូមពិនិត្យកាលវិភាគបង្រៀនប្រចាំថ្ងៃ ស្កេនវត្តមានចូល/ចេញ និងពិនិត្យប្រវត្តិវត្តមានរបស់អ្នក។'
                    : 'Review your daily class teaching timetable, check-in/out of periods, and track personal attendance history.')
                : (isKhmer
                    ? 'តាមដានវត្តមានគ្រូ និងបុគ្គលិកជាក់ស្តែង ផ្ទៀងផ្ទាត់ទីតាំង GPS គណនាម៉ោងយឺត និងការជូនដំណឹងតេឡេក្រាមស្វ័យប្រវត្តិ។'
                    : 'Real-time biometric & mobile check-in verification, late arrival calculations, and automated Telegram alerts.')}
            </p>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <button
                onClick={() => handleOpenAdminRecordModal()}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                title={isKhmer ? 'កត់ត្រាវត្តមានសម្រាប់គ្រូបង្រៀន' : 'Record attendance for teacher'}
              >
                <UserCheck className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>{isKhmer ? 'កត់ត្រាវត្តមានឱ្យគ្រូ' : 'Record for Teacher'}</span>
              </button>
            )}

            {onOpenCheckIn && (
              <button
                onClick={onOpenCheckIn}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <ClockAlert className="w-4 h-4 shrink-0" />
                <span>{isKhmer ? 'ស្កេនវត្តមាន (Check In)' : 'Quick Check-in'}</span>
              </button>
            )}

            {hasPermission('telegram.configure') && (
              <button
                onClick={handleSendDailyTelegramSummary}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/30 transition-all active:scale-95 cursor-pointer"
                title={isKhmer ? 'ផ្ញើសេចក្តីសង្ខេបវត្តមានទៅក្រុមតេឡេក្រាម' : 'Dispatches formatted summary to Telegram Admin & Staff Groups'}
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>{isKhmer ? 'ផ្ញើរបាយការណ៍ TG' : 'Send TG Summary'}</span>
              </button>
            )}

            {hasPermission('attendance.edit') && (
              <button
                onClick={handleRunAbsenceCheck}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{isKhmer ? 'ស្វែងរកអវត្តមាន' : 'Detect Absences'}</span>
              </button>
            )}

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('edutrack:open-video-manual'))}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title={isKhmer ? 'វីដេអូណែនាំសម្រាប់គ្រូ (សកម្មភាពលើផ្ទាំងពិត & MP4)' : 'Teacher Video Manual (Real Action & MP4)'}
            >
              <Video className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="hidden sm:inline">{isKhmer ? 'វីដេអូណែនាំ' : 'Video Manual'}</span>
              <Play className="w-3.5 h-3.5 text-cyan-200 shrink-0" />
            </button>

            <button
              onClick={() => onNavigate('manual')}
              className="flex items-center gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all active:scale-95 cursor-pointer"
              title={isKhmer ? 'បើកសៀវភៅណែនាំការប្រើប្រាស់ប្រព័ន្ធ (Khmer/English)' : 'Open System User Manual (Khmer/English)'}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span>{isKhmer ? 'សៀវភៅណែនាំ' : 'Manual'}</span>
            </button>
          </div>
        </div>

        {/* Live GPS Geofence Status Strip (Screenshot App-like Indicator) */}
        {systemSettings.enforceGeofence && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${geoDistance !== null && geoDistance <= systemSettings.geofenceRadiusMeters ? 'bg-emerald-400 animate-pulse' : geoDistance !== null ? 'bg-rose-400' : 'bg-amber-400 animate-spin'}`} />
              <span className="font-bold text-white truncate">
                {geoDistance !== null && geoDistance <= systemSettings.geofenceRadiusMeters
                  ? (isKhmer ? `📍 ក្នុងបរិវេណសាលា (ចម្ងាយ ${geoDistance}ម • កាំអនុញ្ញាត ${systemSettings.geofenceRadiusMeters}ម)` : `📍 Inside Campus Boundary (${geoDistance}m / max ${systemSettings.geofenceRadiusMeters}m)`)
                  : geoDistance !== null
                  ? (isKhmer ? `⚠️ ក្រៅបរិវេណសាលា (ចម្ងាយ ${geoDistance.toLocaleString()}ម • កាំអនុញ្ញាត ${systemSettings.geofenceRadiusMeters}ម)` : `⚠️ Outside Campus Boundary (${geoDistance.toLocaleString()}m / max ${systemSettings.geofenceRadiusMeters}m)`)
                  : (isKhmer ? '🔄 កំពុងពិនិត្យទីតាំង GPS...' : '🔄 Checking device GPS position...')}
              </span>
              <span className="text-[11px] text-slate-300 hidden md:inline">
                {geoDistance !== null && geoDistance <= systemSettings.geofenceRadiusMeters
                  ? (isKhmer ? '• ទីតាំងត្រឹមត្រូវសម្រាប់ការស្កេន' : '• Verified within allowed geofence')
                  : (isKhmer ? '• ការស្កេនត្រូវបានរឹតបន្តឹងដោយសារទីតាំង' : '• Geofence restricted outside campus')}
              </span>
            </div>

            <button
              onClick={handleRefreshGps}
              disabled={isGpsRefreshing}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isGpsRefreshing ? 'animate-spin' : ''}`} />
              <span>{isKhmer ? 'ពិនិត្យ GPS ឡើងវិញ' : 'Refresh GPS'}</span>
            </button>
          </div>
        )}
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

      {/* Live Faculty Teaching & Daily Teacher Schedule Live Section - Mobile App Screenshot Aesthetic */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                {isKhmer ? 'កាលវិភាគបង្រៀនជាក់ស្តែងថ្ងៃនេះ (Live Faculty Timetable)' : 'Live Faculty Teaching & Daily Teacher Schedule'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isKhmer
                ? 'តាមដានគ្រូបង្រៀនកំពុងស្ថិតក្នុងថ្នាក់ និងកត់ត្រាវត្តមានផ្ទាល់ដោយ Admin'
                : 'Real-time active classroom teaching sessions with one-click admin attendance punch.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setLiveClassTab('in_session')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  liveClassTab === 'in_session'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isKhmer ? 'កំពុងបង្រៀន' : 'In Class Now'} ({currentlyInClass.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setLiveClassTab('all_today')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  liveClassTab === 'all_today'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{isKhmer ? 'កាលវិភាគថ្ងៃនេះ' : 'All Scheduled'} ({liveTeachingSessions.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('schedules')}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <span>{isKhmer ? 'កាលវិភាគពេញមួយថ្ងៃ' : 'Full Timetable'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Class Sessions Cards - Exact Screenshot Palette & Layout */}
        {((liveClassTab === 'in_session' ? currentlyInClass : liveTeachingSessions).length === 0) ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-800 block">
                  {liveClassTab === 'in_session'
                    ? (isKhmer ? 'គ្មានគ្រូកំពុងស្ថិតក្នុងម៉ោងបង្រៀននៅពេលនេះឡើយ' : 'No Faculty In Active Class Session Right Now')
                    : (isKhmer ? 'គ្មានកាលវិភាគបង្រៀនសម្រាប់ថ្ងៃនេះទេ' : 'No Classes Scheduled for Today')}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isKhmer
                    ? `ម៉ោងបច្ចុប្បន្ន៖ ${currentTimeStr} • មានកាលវិភាគបង្រៀនសរុប ${liveTeachingSessions.length} ម៉ោងសម្រាប់ថ្ងៃនេះ`
                    : `Terminal clock: ${currentTimeStr} • ${liveTeachingSessions.length} class periods scheduled for today`}
                </span>
              </div>
            </div>
            {liveClassTab === 'in_session' && liveTeachingSessions.length > 0 && (
              <button
                type="button"
                onClick={() => setLiveClassTab('all_today')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline self-start sm:self-auto cursor-pointer"
              >
                {isKhmer ? 'មើលកាលវិភាគទាំងអស់ថ្ងៃនេះ →' : 'View All Classes Today →'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(liveClassTab === 'in_session' ? currentlyInClass : liveTeachingSessions).map((item, idx) => {
              const sub = item.schedule;
              const rec = item.record;

              // Color palette matching screenshot
              const palette = [
                { bg: 'bg-[#e0f2fe]/75', border: 'border-l-4 border-l-[#0284c7] border-[#38bdf8]/50', avatarBg: 'bg-[#0284c7] text-white', badge: 'bg-[#0284c7]/15 text-[#0284c7]' },
                { bg: 'bg-[#dcfce7]/75', border: 'border-l-4 border-l-[#16a34a] border-[#4ade80]/50', avatarBg: 'bg-[#16a34a] text-white', badge: 'bg-[#16a34a]/15 text-[#16a34a]' },
                { bg: 'bg-[#ffedd5]/75', border: 'border-l-4 border-l-[#ea580c] border-[#fb923c]/50', avatarBg: 'bg-[#ea580c] text-white', badge: 'bg-[#ea580c]/15 text-[#ea580c]' },
                { bg: 'bg-[#f5f3ff]/75', border: 'border-l-4 border-l-[#7c3aed] border-[#c084fc]/50', avatarBg: 'bg-[#7c3aed] text-white', badge: 'bg-[#7c3aed]/15 text-[#7c3aed]' }
              ];
              const pal = palette[idx % palette.length];

              const teacherInitials = sub.teacherName
                ? sub.teacherName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                : 'FC';

              const isCheckedIn = Boolean(rec?.checkInTime);
              const isCheckedOut = Boolean(rec?.checkOutTime);

              return (
                <div
                  key={sub.id}
                  className={`p-4 rounded-2xl ${pal.bg} ${pal.border} shadow-xs flex flex-col justify-between gap-3 transition-all hover:shadow-md`}
                >
                  {/* Top Bar: Period Pill & Time Range */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                      {sub.periodName}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                      {sub.startTime} - {sub.endTime}
                    </span>
                  </div>

                  {/* Middle Content: Subject & Teacher with screenshot avatar */}
                  <div>
                    <h4 className="text-sm font-black text-slate-950 leading-snug">
                      {sub.subject}
                    </h4>
                    {sub.khmerSubject && (
                      <p className="text-xs text-slate-600 font-khmer mt-0.5">{sub.khmerSubject}</p>
                    )}

                    <div className="flex items-center gap-2.5 mt-2.5">
                      <div className={`w-8 h-8 rounded-full ${pal.avatarBg} flex items-center justify-center text-xs font-black shrink-0 shadow-xs`}>
                        {teacherInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {sub.teacherName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="font-medium truncate">{sub.gradeClass}</span>
                          <span className="text-slate-400">•</span>
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            {sub.room}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Status Badge */}
                  <div className="pt-2 border-t border-slate-900/10 flex items-center justify-between text-[11px]">
                    {isCheckedOut ? (
                      <span className="font-bold text-blue-900 bg-blue-100/90 px-2.5 py-0.5 rounded-full border border-blue-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-600" />
                        <span>{isKhmer ? 'បានស្កេនចេញ' : 'Completed'}: {rec?.checkOutTime}</span>
                      </span>
                    ) : isCheckedIn ? (
                      <span className="font-bold text-emerald-900 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>{isKhmer ? 'បានស្កេនចូល' : 'In Class'}: {rec?.checkInTime} {rec?.status === 'Late' ? '(Late)' : ''}</span>
                      </span>
                    ) : item.isInSession ? (
                      <span className="font-bold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>{isKhmer ? 'កំពុងបង្រៀន • មិនទាន់ស្កេន' : 'Active • Missing In'}</span>
                      </span>
                    ) : item.isUpcoming ? (
                      <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {isKhmer ? 'មិនទាន់ដល់ម៉ោង' : 'Upcoming'}
                      </span>
                    ) : (
                      <span className="font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {isKhmer ? 'មិនមានទិន្នន័យ' : 'Scheduled'}
                      </span>
                    )}

                    {(() => {
                      const teacherObj = teachers.find(t => t.id === sub.teacherId || t.teacherId === sub.teacherId);
                      const deptName = teacherObj?.department || sub.subjectCode;
                      return deptName ? (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${pal.badge}`}>
                          {deptName.split('&')[0].trim()}
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* Admin Quick Action Buttons */}
                  {isAdmin && (
                    <div className="pt-2 border-t border-slate-900/10 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {!isCheckedIn && (
                          <button
                            type="button"
                            onClick={() => handleAdminQuickCheckIn(sub)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                            title={isKhmer ? 'ស្កេនចូលរហ័សសម្រាប់គ្រូនេះ' : 'Quick Check-in'}
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>{isKhmer ? 'ស្កេនចូល' : 'Quick In'}</span>
                          </button>
                        )}

                        {isCheckedIn && !isCheckedOut && (
                          <button
                            type="button"
                            onClick={() => handleAdminQuickCheckOut(sub)}
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                            title={isKhmer ? 'ស្កេនចេញរហ័សសម្រាប់គ្រូនេះ' : 'Quick Check-out'}
                          >
                            <LogOut className="w-3 h-3" />
                            <span>{isKhmer ? 'ស្កេនចេញ' : 'Quick Out'}</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAdminRecordModal(sub.teacherId, sub.id)}
                        className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-800 text-[11px] font-bold border border-slate-300 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 ml-auto"
                        title={isKhmer ? 'កត់ត្រាវត្តមានលម្អិតសម្រាប់គ្រូនេះ' : 'Record full attendance for teacher'}
                      >
                        <FileText className="w-3 h-3 text-indigo-600" />
                        <span>{isKhmer ? 'កត់ត្រាវត្តមាន' : 'Record for Teacher'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
                {isAdmin && <th className="py-3 px-4 text-right">{isKhmer ? 'សកម្មភាព' : 'Action'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-400">
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
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenAdminRecordModal(record.personId, record.subjectScheduleId || record.scheduleId)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                            title={isKhmer ? 'កែប្រែ ឬកត់ត្រាវត្តមានសម្រាប់គ្រូ/បុគ្គលិកនេះ' : 'Record or adjust attendance'}
                          >
                            <FileText className="w-3 h-3 text-indigo-600" />
                            <span>{isKhmer ? 'កត់ត្រា/កែ' : 'Record'}</span>
                          </button>
                        </td>
                      )}
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

      {/* Admin Record Attendance for Teacher Modal */}
      {isAdminRecordModalOpen && (
        <AdminRecordAttendanceModal
          isOpen={isAdminRecordModalOpen}
          onClose={() => {
            setIsAdminRecordModalOpen(false);
            setAdminRecordTeacherId(undefined);
            setAdminRecordScheduleId(undefined);
          }}
          initialTeacherId={adminRecordTeacherId}
          initialSubjectScheduleId={adminRecordScheduleId}
          initialDate={selectedDate || new Date().toISOString().split('T')[0]}
          onSuccess={() => {
            setAllAttendance(StorageService.getAttendance());
          }}
        />
      )}

    </div>
  );
};
