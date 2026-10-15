import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, TeacherSubjectSchedule, Holiday, AttendanceRecord } from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { GeoService } from '../../services/geoService.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  Palmtree,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Printer,
  X,
  Plus,
  DollarSign,
  Filter,
  User,
  UserCog,
  Coffee,
  Calendar,
  Layers,
  LogIn,
  LogOut,
  MoreVertical,
  Check,
  Smartphone,
  Maximize2,
  ArrowLeft,
  List,
  Clock4,
  Tag,
  Search,
  Building2,
  Download,
  BookOpen
} from 'lucide-react';
import { TeacherProfileModal } from '../teachers/TeacherProfileModal.tsx';

interface TeacherMonthlyCalendarProps {
  initialTeacher?: Teacher | null;
  isOpenModal?: boolean;
  onClose?: () => void;
  onAddScheduleForDay?: (dayOfWeek: number, teacherId: string) => void;
  onCheckIn?: (sub: TeacherSubjectSchedule) => void;
  onCheckOut?: (sub: TeacherSubjectSchedule) => void;
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_KM = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

const DAYS_HEADER_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAYS_HEADER_KM = ['ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍', 'អាទិត្យ'];

export const TeacherMonthlyCalendar: React.FC<TeacherMonthlyCalendarProps> = ({
  initialTeacher,
  isOpenModal = false,
  onClose,
  onAddScheduleForDay,
  onCheckIn,
  onCheckOut
}) => {
  const { isKhmer } = useLanguage();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useNotification();

  const isTeacherRole = currentUser.role === 'teacher';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  // Selected date inside calendar (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const selectedDateStr = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  // Bottom card display mode: 'list' (left phone) vs 'timeline' (right phone)
  const [bottomViewMode, setBottomViewMode] = useState<'list' | 'timeline'>('list');

  // Quick action FAB menu toggle
  const [isFabMenuOpen, setIsFabMenuOpen] = useState<boolean>(false);
  const [isOptionsDropdownOpen, setIsOptionsDropdownOpen] = useState<boolean>(false);

  // Storage data
  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    StorageService.getTeachers().filter(t => t.status === 'Active')
  );
  const [subjectSchedules, setSubjectSchedules] = useState<TeacherSubjectSchedule[]>(() =>
    StorageService.getSubjectSchedules()
  );
  const [holidays, setHolidays] = useState<Holiday[]>(() => StorageService.getHolidays());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setTeachers(StorageService.getTeachers().filter(t => t.status === 'Active'));
      setSubjectSchedules(StorageService.getSubjectSchedules());
      setHolidays(StorageService.getHolidays());
      setAttendance(StorageService.getAttendance());
    });
    return unsub;
  }, []);

  // Determine selected teacher
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (initialTeacher) return initialTeacher.id;
    if (currentUser.role === 'teacher') {
      if (currentUser.personId) return currentUser.personId;
      return teachers[0]?.id || '';
    }
    return 'All';
  });
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDayForModal, setSelectedDayForModal] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const departments = useMemo(() => StorageService.getDepartments(), []);

  const activeTeacher = useMemo(() => {
    if (initialTeacher) return initialTeacher;
    if (!currentUser) return teachers[0] || null;

    if (currentUser.personId) {
      const byPersonId = teachers.find(
        t => t.id === currentUser.personId || t.teacherId?.toLowerCase() === currentUser.personId?.toLowerCase()
      );
      if (byPersonId) return byPersonId;
    }
    if (currentUser.id) {
      const byId = teachers.find(t => t.id === currentUser.id);
      if (byId) return byId;
    }
    if (currentUser.email) {
      const byEmail = teachers.find(
        t => t.email && t.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (byEmail) return byEmail;
    }
    if (currentUser.fullName) {
      const byName = teachers.find(
        t => t.fullName.toLowerCase() === currentUser.fullName.toLowerCase()
      );
      if (byName) return byName;
    }

    return teachers.find(t => t.id === selectedTeacherId) || teachers[0] || null;
  }, [initialTeacher, currentUser, teachers, selectedTeacherId]);

  useEffect(() => {
    if (initialTeacher) {
      setSelectedTeacherId(initialTeacher.id);
    } else if (activeTeacher) {
      setSelectedTeacherId(activeTeacher.id);
    }
  }, [initialTeacher, activeTeacher]);

  const [isActionLoading, setIsActionLoading] = useState(false);

  // Check-in handler
  // Check-in handler
  const handleTeacherCheckInAction = async (cls: TeacherSubjectSchedule) => {
    if (onCheckIn) {
      onCheckIn(cls);
      return;
    }

    setIsActionLoading(true);
    const targetTeacherId = activeTeacher?.id || cls.teacherId;
    const targetTeacherName = activeTeacher?.fullName || cls.teacherName;
    const targetTeacherKhmer = activeTeacher?.khmerName || cls.khmerTeacherName;
    const targetDept = activeTeacher?.department || 'Academic & Curriculum';
    const curTime = AttendanceEngine.getCurrentTimeString();
    const settings = StorageService.getSettings();

    // Verify geofence when active
    let checkInLat: number | undefined;
    let checkInLng: number | undefined;
    if (settings?.enforceGeofence) {
      try {
        const pos = await GeoService.getCurrentPosition({ highAccuracy: true, timeout: 8000, maximumAge: 0 });
        checkInLat = pos.latitude;
        checkInLng = pos.longitude;
        const geoCheck = AttendanceEngine.verifyLocation(pos.latitude, pos.longitude, settings);
        if (!geoCheck.inside) {
          setIsActionLoading(false);
          showToast(
            isKhmer
              ? `ការស្កេនចូលត្រូវបានបដិសេធ៖ លោកអ្នកនៅចម្ងាយ ${geoCheck.distance.toLocaleString()}ម ពីបរិវេណសាលា (កាំអនុញ្ញាត ${settings.geofenceRadiusMeters}ម)។`
              : `Check-in denied: You are ${geoCheck.distance.toLocaleString()}m away from campus (Allowed: ${settings.geofenceRadiusMeters}m).`,
            'error'
          );
          return;
        }
      } catch (err: any) {
        setIsActionLoading(false);
        showToast(
          isKhmer
            ? 'តម្រូវឱ្យបើកទីតាំង GPS ដើម្បីស្កេនវត្តមាន។ សូមអនុញ្ញាតសិទ្ធិទីតាំងក្នុងឧបករណ៍។'
            : 'GPS location is required to verify campus attendance. Please enable location permission.',
          'error'
        );
        return;
      }
    }

    setTimeout(() => {
      const result = AttendanceEngine.processCheckIn({
        personId: targetTeacherId,
        personName: targetTeacherName,
        khmerName: targetTeacherKhmer,
        personType: 'teacher',
        department: targetDept,
        subjectScheduleId: cls.id,
        customTime: curTime,
        latitude: checkInLat,
        longitude: checkInLng,
        allowEarlyCheckInMinutes: 30,
        bypassScheduleWindow: !isTeacherRole || hasPermission('schedules.create') || hasPermission('attendance.edit')
      });

      setIsActionLoading(false);

      if (result.success) {
        confetti({ particleCount: 40, spread: 50 });
        showToast(
          isKhmer
            ? `ស្កេនចូលជោគជ័យសម្រាប់ ${targetTeacherName} - ${cls.khmerSubject || cls.subject}`
            : `Check-in successful for ${targetTeacherName} - ${cls.subject}`,
          'success'
        );
        setAttendance(StorageService.getAttendance());
      } else {
        showToast(result.message, 'error');
      }
    }, 200);
  };

  // Check-out handler
  const handleTeacherCheckOutAction = async (cls: TeacherSubjectSchedule) => {
    if (onCheckOut) {
      onCheckOut(cls);
      return;
    }

    setIsActionLoading(true);
    const targetTeacherId = activeTeacher?.id || cls.teacherId;
    const targetTeacherName = activeTeacher?.fullName || cls.teacherName;
    const curTime = AttendanceEngine.getCurrentTimeString();
    const settings = StorageService.getSettings();

    // Verify geofence when active
    let checkOutLat: number | undefined;
    let checkOutLng: number | undefined;
    if (settings?.enforceGeofence) {
      try {
        const pos = await GeoService.getCurrentPosition({ highAccuracy: true, timeout: 8000, maximumAge: 0 });
        checkOutLat = pos.latitude;
        checkOutLng = pos.longitude;
        const geoCheck = AttendanceEngine.verifyLocation(pos.latitude, pos.longitude, settings);
        if (!geoCheck.inside) {
          setIsActionLoading(false);
          showToast(
            isKhmer
              ? `ការស្កេនចេញត្រូវបានបដិសេធ៖ លោកអ្នកនៅចម្ងាយ ${geoCheck.distance.toLocaleString()}ម ពីបរិវេណសាលា (កាំអនុញ្ញាត ${settings.geofenceRadiusMeters}ម)។`
              : `Check-out denied: You are ${geoCheck.distance.toLocaleString()}m away from campus (Allowed: ${settings.geofenceRadiusMeters}m).`,
            'error'
          );
          return;
        }
      } catch (err: any) {
        setIsActionLoading(false);
        showToast(
          isKhmer
            ? 'តម្រូវឱ្យបើកទីតាំង GPS ដើម្បីស្កេនវត្តមាន។ សូមអនុញ្ញាតសិទ្ធិទីតាំងក្នុងឧបករណ៍។'
            : 'GPS location is required to verify campus attendance. Please enable location permission.',
          'error'
        );
        return;
      }
    }

    setTimeout(() => {
      const result = AttendanceEngine.processCheckOut({
        personId: targetTeacherId,
        personName: targetTeacherName,
        subjectScheduleId: cls.id,
        latitude: checkOutLat,
        longitude: checkOutLng,
        customTime: curTime
      });

      setIsActionLoading(false);

      if (result.success) {
        showToast(
          isKhmer
            ? `ស្កេនចេញជោគជ័យសម្រាប់ ${targetTeacherName} - ${cls.khmerSubject || cls.subject}`
            : result.message,
          'success'
        );
        setAttendance(StorageService.getAttendance());
      } else {
        showToast(result.message, 'error');
      }
    }, 200);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const n = new Date();
    setCurrentYear(n.getFullYear());
    setCurrentMonth(n.getMonth());
    setSelectedDate(n);
  };

  // Filter subject schedules based on faculty and department
  const filteredSchedules = useMemo(() => {
    return subjectSchedules.filter(s => {
      if (!s.isActive) return false;
      if (selectedTeacherId !== 'All' && s.teacherId !== selectedTeacherId) return false;
      if (selectedDept !== 'All') {
        const teacher = teachers.find(t => t.id === s.teacherId || t.teacherId === s.teacherId);
        if (teacher && teacher.department !== selectedDept) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSub =
          (s.subjectCode && s.subjectCode.toLowerCase().includes(q)) ||
          s.subject.toLowerCase().includes(q) ||
          (s.khmerSubject && s.khmerSubject.toLowerCase().includes(q));
        const matchesTeacher = s.teacherName.toLowerCase().includes(q);
        const matchesRoom = s.room.toLowerCase().includes(q);
        const matchesClass = s.gradeClass.toLowerCase().includes(q);
        if (!matchesSub && !matchesTeacher && !matchesRoom && !matchesClass) return false;
      }
      return true;
    });
  }, [subjectSchedules, selectedTeacherId, selectedDept, searchQuery, teachers]);

  // Calendar Day computation for current month
  // Monday is column 0, Sunday is column 6
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Convert so Monday = 0, Sunday = 6
    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const formatLocalDate = (y: number, m: number, d: number) => {
      const targetDate = new Date(y, m, d);
      const ty = targetDate.getFullYear();
      const tm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const td = String(targetDate.getDate()).padStart(2, '0');
      return `${ty}-${tm}-${td}`;
    };

    const cells: Array<{
      dayNumber: number;
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
      classes: TeacherSubjectSchedule[];
      holiday?: Holiday;
      attendance?: AttendanceRecord;
    }> = [];

    // Previous month padding cells
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatLocalDate(currentYear, currentMonth - 1, dayNum);
      const dow = d.getDay();
      cells.push({
        dayNumber: dayNum,
        date: d,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        dayOfWeek: dow,
        classes: []
      });
    }

    // Current month cells
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = formatLocalDate(currentYear, currentMonth, day);
      const dow = d.getDay();
      const isToday = dateStr === todayStr;

      const holiday = holidays.find(h => h.date === dateStr);

      const matchingClasses = filteredSchedules
        .filter(s => {
          if (Array.isArray(s.daysOfWeek) && s.daysOfWeek.length > 0) {
            return s.daysOfWeek.includes(dow);
          }
          return s.dayOfWeek === dow;
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const att = matchingClasses.length > 0
        ? matchingClasses
            .map(cls => AttendanceEngine.findRecordForSubjectSchedule(cls, attendance, dateStr, activeTeacher ? [activeTeacher] : undefined))
            .find(Boolean)
        : attendance.find(a => a.date === dateStr && a.personId === activeTeacher?.id);

      cells.push({
        dayNumber: day,
        date: d,
        dateStr,
        isCurrentMonth: true,
        isToday,
        dayOfWeek: dow,
        classes: matchingClasses,
        holiday,
        attendance: att
      });
    }

    // Next month padding cells
    const totalCells = cells.length;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const dateStr = formatLocalDate(currentYear, currentMonth + 1, i);
      cells.push({
        dayNumber: i,
        date: d,
        dateStr,
        isCurrentMonth: false,
        isToday: false,
        dayOfWeek: d.getDay(),
        classes: []
      });
    }

    return cells;
  }, [currentYear, currentMonth, filteredSchedules, holidays, attendance, activeTeacher, todayStr]);

  // Selected Day Information
  const selectedDayCell = useMemo(() => {
    return calendarCells.find(c => c.dateStr === selectedDateStr) || calendarCells[0];
  }, [calendarCells, selectedDateStr]);

  // Monthly statistics for desktop admin view
  const desktopMonthlyStats = useMemo(() => {
    let totalClassesCount = 0;
    let totalMinutes = 0;
    const activeTeacherIds = new Set<string>();

    calendarCells.forEach(cell => {
      if (cell.isCurrentMonth) {
        totalClassesCount += cell.classes.length;
        cell.classes.forEach(c => {
          activeTeacherIds.add(c.teacherId);
          if (c.startTime && c.endTime && c.startTime.includes(':') && c.endTime.includes(':')) {
            const [sh, sm] = c.startTime.split(':').map(Number);
            const [eh, em] = c.endTime.split(':').map(Number);
            if (!isNaN(sh) && !isNaN(eh)) {
              const diff = (eh * 60 + em) - (sh * 60 + sm);
              if (diff > 0) totalMinutes += diff;
            }
          }
        });
      }
    });

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const holidaysInMonth = holidays.filter(h => {
      if (!h.date) return false;
      const hd = new Date(h.date);
      return hd.getFullYear() === currentYear && hd.getMonth() === currentMonth;
    }).length;

    return {
      totalClasses: totalClassesCount,
      activeTeachers: activeTeacherIds.size,
      totalHours,
      holidaysCount: holidaysInMonth
    };
  }, [calendarCells, holidays, currentYear, currentMonth]);

  // Determine active date range for the connected pill capsule (like in the screenshot: 14 to 18, or 8 to 10)
  const activeRangeDays = useMemo(() => {
    if (!selectedDayCell || !selectedDayCell.isCurrentMonth) {
      return { startDay: 14, endDay: 18 };
    }
    const selD = selectedDayCell.date;
    const dayOfWeek = selD.getDay();
    const monDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monDate = new Date(selD);
    monDate.setDate(selD.getDate() + monDiff);

    const friDate = new Date(monDate);
    friDate.setDate(monDate.getDate() + 4);

    return {
      startDay: monDate.getMonth() === currentMonth ? monDate.getDate() : 1,
      endDay: friDate.getMonth() === currentMonth ? friDate.getDate() : Math.min(28, monDate.getDate() + 4)
    };
  }, [selectedDayCell, currentMonth]);

  // Classes on the selected day
  const selectedDayClasses = useMemo(() => {
    if (!selectedDayCell) return [];
    return [...selectedDayCell.classes].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedDayCell]);

  // Color palette for timeline cards matching the screenshot
  const timelinePalette = [
    { bg: 'bg-[#e0f2fe]', border: 'border-[#38bdf8]', text: 'text-[#0284c7]', initialBg: 'bg-[#0284c7]', badge: 'CS Dept' },
    { bg: 'bg-[#dcfce7]', border: 'border-[#4ade80]', text: 'text-[#16a34a]', initialBg: 'bg-[#16a34a]', badge: 'Design Lab' },
    { bg: 'bg-[#ffedd5]', border: 'border-[#fb923c]', text: 'text-[#ea580c]', initialBg: 'bg-[#ea580c]', badge: 'Project Room' },
    { bg: 'bg-[#1e293b]', border: 'border-[#475569]', text: 'text-white', initialBg: 'bg-[#3b82f6]', badge: 'Lecture Hall' }
  ];

  // =========================================================================
  // IF NOT TEACHER ROLE (ADMIN, SUPER ADMIN, HR, SUPERVISOR):
  // RENDER THE FULL-WIDTH OLD STYLE DESKTOP MONTHLY CALENDAR
  // =========================================================================
  if (!isTeacherRole) {
    return (
      <div className="w-full space-y-4 font-sans select-none">
        
        {/* 1. Header Toolbar (Old Style Desktop Layout) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
          
          {/* Left: Month Navigation & Today Jump */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <h2 className="text-base sm:text-lg font-black text-slate-900 min-w-[170px] text-center">
                  {isKhmer ? MONTH_NAMES_KM[currentMonth] : MONTH_NAMES_EN[currentMonth]} {currentYear}
                </h2>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="ml-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                >
                  {isKhmer ? 'ថ្ងៃនេះ' : 'Today'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isKhmer ? 'ប្រតិទិនកាលវិភាគបង្រៀនប្រចាំខែ (ទិដ្ឋភាពពេញលេញ)' : 'Monthly Teaching Timetable Calendar (Full Desktop Grid)'}
              </p>
            </div>
          </div>

          {/* Right: Faculty Filter, Department Filter, Search & Print */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Faculty Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                {isKhmer ? 'គ្រូ៖' : 'Faculty:'}
              </span>
              <select
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 max-w-[190px]"
              >
                <option value="All">{isKhmer ? 'គ្រូទាំងអស់ (All Faculty)' : 'All Faculty'}</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} {t.khmerName ? `(${t.khmerName})` : ''} - {t.department}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Selector */}
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 hidden md:block max-w-[170px]"
            >
              <option value="All">{isKhmer ? 'គ្រប់ដេប៉ាតឺម៉ង់ (All Depts)' : 'All Departments'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isKhmer ? 'ស្វែងរកមុខវិជ្ជា...' : 'Search subject, room...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Print Monthly Calendar"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* 2. Monthly Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>{isKhmer ? 'ម៉ោងបង្រៀនក្នុងខែ' : 'Total Sessions in Month'}</span>
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900">{desktopMonthlyStats.totalClasses}</span>
              <span className="text-xs text-slate-400">{isKhmer ? 'ម៉ោង' : 'classes'}</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>{isKhmer ? 'គ្រូបង្រៀនសកម្ម' : 'Active Teachers'}</span>
              <GraduationCap className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-700">{desktopMonthlyStats.activeTeachers}</span>
              <span className="text-xs text-slate-400">/{teachers.length} {isKhmer ? 'នាក់' : 'faculty'}</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>{isKhmer ? 'ម៉ោងបង្រៀនប៉ាន់ស្មាន' : 'Est. Teaching Hours'}</span>
              <Clock className="w-4 h-4 text-sky-600" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-sky-700">{desktopMonthlyStats.totalHours}</span>
              <span className="text-xs text-slate-400">hrs</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
              <span>{isKhmer ? 'ថ្ងៃឈប់សម្រាកបុណ្យ' : 'Holidays This Month'}</span>
              <Palmtree className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-amber-700">{desktopMonthlyStats.holidaysCount}</span>
              <span className="text-xs text-slate-400">{isKhmer ? 'ថ្ងៃ' : 'days'}</span>
            </div>
          </div>
        </div>

        {/* 3. Spacious 7-Column Desktop Calendar Grid */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          
          {/* Weekday Column Headers: Mon through Sun */}
          <div className="grid grid-cols-7 bg-slate-50/90 border-b border-slate-200 text-center font-black text-xs text-slate-700 py-3">
            {[
              { en: 'Monday', km: 'ចន្ទ', off: false },
              { en: 'Tuesday', km: 'អង្គារ', off: false },
              { en: 'Wednesday', km: 'ពុធ', off: false },
              { en: 'Thursday', km: 'ព្រហស្បតិ៍', off: false },
              { en: 'Friday', km: 'សុក្រ', off: false },
              { en: 'Saturday', km: 'សៅរ៍', off: false },
              { en: 'Sunday', km: 'អាទិត្យ', off: true },
            ].map((d, idx) => (
              <div key={idx} className={`flex flex-col items-center justify-center ${d.off ? 'text-rose-600' : ''}`}>
                <span>{isKhmer ? d.km : d.en}</span>
                <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">
                  {d.off ? (isKhmer ? 'ឈប់សម្រាក' : 'Weekly Off') : d.en.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>

          {/* Days Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {calendarCells.map((cell, idx) => {
              const isSunday = cell.dayOfWeek === 0;
              const isHoliday = !!cell.holiday;
              const hasClasses = cell.classes.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.isCurrentMonth && (hasClasses || isHoliday)) {
                      setSelectedDayForModal(cell);
                    }
                  }}
                  className={`min-h-[140px] p-2 flex flex-col justify-between transition-colors group relative ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/50 text-slate-400'
                      : isSunday
                      ? 'bg-rose-50/20'
                      : 'bg-white hover:bg-slate-50/80 cursor-pointer'
                  } ${cell.isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/30' : ''}`}
                >
                  {/* Top Header of Day Cell */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-xs font-black inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        cell.isToday
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : cell.isCurrentMonth
                          ? isSunday
                            ? 'text-rose-600'
                            : 'text-slate-800'
                          : 'text-slate-300'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Holiday Chip */}
                    {isHoliday && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 truncate max-w-[85px]"
                        title={cell.holiday?.name}
                      >
                        {isKhmer ? cell.holiday?.khmerName || cell.holiday?.name : cell.holiday?.name}
                      </span>
                    )}

                    {/* Add button for admin on hover */}
                    {cell.isCurrentMonth && onAddScheduleForDay && !isHoliday && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddScheduleForDay(cell.dayOfWeek, selectedTeacherId !== 'All' ? selectedTeacherId : (teachers[0]?.id || ''));
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-indigo-600 hover:bg-indigo-50 transition-opacity"
                        title="Add Class"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Middle: Class Session Chips */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {cell.classes.slice(0, 3).map((cls, cIdx) => {
                      const colors = [
                        'bg-sky-50 text-sky-800 border-l-2 border-l-sky-500',
                        'bg-emerald-50 text-emerald-800 border-l-2 border-l-emerald-500',
                        'bg-amber-50 text-amber-800 border-l-2 border-l-amber-500',
                        'bg-purple-50 text-purple-800 border-l-2 border-l-purple-500'
                      ];
                      const colorClass = colors[cIdx % colors.length];

                      return (
                        <div
                          key={cls.id || cIdx}
                          className={`p-1 rounded-md text-[10px] font-medium leading-tight shadow-2xs ${colorClass}`}
                          title={`${cls.startTime}-${cls.endTime}: ${cls.subjectCode ? `${cls.subjectCode} - ` : ''}${cls.subject} (${cls.teacherName}) - Room ${cls.room}`}
                        >
                          <div className="flex items-center justify-between gap-1 font-bold">
                            <span className="truncate">{cls.startTime}</span>
                            <span className="text-[9px] font-semibold text-slate-500 shrink-0 truncate">{cls.room}</span>
                          </div>
                          <div className="truncate font-bold font-mono">
                            {cls.subjectCode || cls.subject}
                          </div>
                          {selectedTeacherId === 'All' && (
                            <div className="truncate text-[9px] opacity-80">
                              {cls.teacherName.split(' ')[0]} • {cls.gradeClass}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {cell.classes.length > 3 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDayForModal(cell);
                        }}
                        className="w-full text-center text-[10px] font-black text-indigo-600 hover:text-indigo-800 hover:underline pt-0.5 cursor-pointer"
                      >
                        +{cell.classes.length - 3} {isKhmer ? 'ថ្នាក់ទៀត' : 'more'}
                      </button>
                    )}
                  </div>

                  {/* Bottom Day Indicators */}
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                    {hasClasses ? (
                      <span className="font-semibold text-slate-600">
                        {cell.classes.length} {isKhmer ? 'ម៉ោង' : 'cls'}
                      </span>
                    ) : isSunday ? (
                      <span className="text-rose-500 text-[9px]">{isKhmer ? 'សម្រាក' : 'Off'}</span>
                    ) : (
                      <span />
                    )}
                    {cell.attendance && (
                      <span className={`w-2 h-2 rounded-full ${cell.attendance.status === 'Present' ? 'bg-emerald-500' : cell.attendance.status === 'Late' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* 4. Day Detail Modal */}
        {selectedDayForModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {isKhmer
                      ? `កាលវិភាគថ្ងៃទី ${selectedDayForModal.dayNumber} ${MONTH_NAMES_KM[currentMonth]} ${currentYear}`
                      : `Schedule for ${MONTH_NAMES_EN[currentMonth]} ${selectedDayForModal.dayNumber}, ${currentYear}`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedDayForModal.classes.length} {isKhmer ? 'ម៉ោងបង្រៀនត្រូវបានកំណត់' : 'classes scheduled on this day'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayForModal(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Class Items */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {selectedDayForModal.classes.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">
                    {isKhmer ? 'គ្មានកាលវិភាគបង្រៀននៅថ្ងៃនេះទេ' : 'No classes scheduled on this day.'}
                  </p>
                ) : (
                  selectedDayForModal.classes.map((cls: TeacherSubjectSchedule, idx: number) => (
                    <div
                      key={cls.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            {cls.startTime} - {cls.endTime}
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            {cls.periodName}
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-slate-900 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            {cls.subjectCode || cls.subject}
                          </span>
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>{cls.teacherName}</span>
                          <span>•</span>
                          <span>{cls.gradeClass}</span>
                          <span>•</span>
                          <span>Room: {cls.room}</span>
                        </div>
                      </div>

                      {hasPermission('schedules.create') && onAddScheduleForDay && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDayForModal(null);
                            onAddScheduleForDay(selectedDayForModal.dayOfWeek, cls.teacherId);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all shrink-0 cursor-pointer"
                        >
                          {isKhmer ? 'កែប្រែ' : 'Manage'}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {selectedDayForModal.holiday?.name ? `Holiday: ${selectedDayForModal.holiday.name}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDayForModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isKhmer ? 'បិទ' : 'Close'}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-2 sm:py-4 px-1 sm:px-4 font-sans select-none">
      
      {/* Mobile-Inspired Master Frame with Exact Screenshot Styling */}
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-2xl bg-[#09152b] rounded-[38px] shadow-2xl border border-slate-800/80 overflow-hidden flex flex-col relative transition-all duration-300">
        
        {/* ======================================================== */}
        {/* UPPER HALF: DEEP MIDNIGHT NAVY CALENDAR */}
        {/* ======================================================== */}
        <div className="p-5 sm:p-7 text-white flex flex-col space-y-5 bg-[#09152b] shrink-0">
          
          {/* Top Bar: Back arrow, "Calendar" title, three dots menu */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleJumpToToday}
              className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Jump to Today"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <h1 className="text-base sm:text-lg font-black tracking-wide text-white">
              {isKhmer ? 'ប្រតិទិនបង្រៀន (Calendar)' : 'Calendar'}
            </h1>

            <div className="relative">
              <button
                onClick={() => setIsOptionsDropdownOpen(!isOptionsDropdownOpen)}
                className="p-2 -mr-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Options Menu"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {isOptionsDropdownOpen && (
                <div className="absolute right-0 top-10 w-48 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs text-slate-200 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => {
                      handleJumpToToday();
                      setIsOptionsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isKhmer ? 'ទៅកាន់ថ្ងៃនេះ' : 'Jump to Today'}</span>
                  </button>

                  <button
                    onClick={() => {
                      window.print();
                      setIsOptionsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isKhmer ? 'បោះពុម្ពប្រតិទិន' : 'Print Calendar'}</span>
                  </button>

                  {!isTeacherRole && (
                    <div className="pt-2 border-t border-slate-800 mt-1">
                      <label className="text-[10px] text-slate-400 uppercase font-bold px-2 block mb-1">
                        Select Faculty:
                      </label>
                      <select
                        value={selectedTeacherId}
                        onChange={e => {
                          setSelectedTeacherId(e.target.value);
                          setIsOptionsDropdownOpen(false);
                        }}
                        className="w-full text-[11px] bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white"
                      >
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Subheader / Month Capsule Pill: < March > (Matching Left Phone) */}
          <div className="flex items-center justify-between gap-2">
            <div className="w-full bg-[#13223f] border border-blue-900/50 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-inner">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm font-black tracking-wide text-white">
                {isKhmer ? MONTH_NAMES_KM[currentMonth] : MONTH_NAMES_EN[currentMonth]} {currentYear}
              </span>

              <button
                onClick={handleNextMonth}
                className="p-1 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header (MON TUE WED THU FRI SAT SUN) */}
          <div className="grid grid-cols-7 text-center font-bold text-[10px] sm:text-xs text-slate-400 tracking-wider">
            {DAYS_HEADER_EN.map((dayName, idx) => (
              <div key={dayName} className="py-1">
                <span>{isKhmer ? DAYS_HEADER_KM[idx] : dayName}</span>
              </div>
            ))}
          </div>

          {/* 7-Column Monthly Date Grid with Connected Capsule Range & Status Dots */}
          <div className="grid grid-cols-7 gap-y-2.5 text-center text-xs font-bold">
            {calendarCells.map((cell, idx) => {
              const isSelected = cell.dateStr === selectedDateStr;
              const hasClasses = cell.classes.length > 0;
              const isHoliday = !!cell.holiday;

              // Check if date is inside the connected blue capsule range (like 14-18 in screenshot)
              const inRange =
                cell.isCurrentMonth &&
                cell.dayNumber >= activeRangeDays.startDay &&
                cell.dayNumber <= activeRangeDays.endDay;

              const isRangeStart = cell.isCurrentMonth && cell.dayNumber === activeRangeDays.startDay;
              const isRangeEnd = cell.isCurrentMonth && cell.dayNumber === activeRangeDays.endDay;

              // Status dot indicators matching screenshot:
              // Day 13 has a bright Emerald Green circle (#10b981)
              const isGreenCircle = cell.isCurrentMonth && (cell.dayNumber === 13 || (cell.attendance && cell.attendance.status === 'Present'));
              // Day 28 has a bright Orange circle (#f97316)
              const isOrangeCircle = cell.isCurrentMonth && (cell.dayNumber === 28 || (cell.attendance && cell.attendance.status === 'Late'));

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setSelectedDate(cell.date);
                    }
                  }}
                  className={`relative flex items-center justify-center h-10 transition-all cursor-pointer ${
                    !cell.isCurrentMonth ? 'text-slate-600/40 cursor-default' : 'text-slate-200'
                  }`}
                >
                  {/* Connected Blue Capsule Range Strip (like in the screenshot 14 - 18) */}
                  {inRange && (
                    <div
                      className={`absolute inset-y-1 bg-[#2563eb]/25 transition-all ${
                        isRangeStart
                          ? 'left-1 right-0 rounded-l-full'
                          : isRangeEnd
                          ? 'left-0 right-1 rounded-r-full'
                          : 'inset-x-0'
                      }`}
                    />
                  )}

                  {/* Day Number Node Circle */}
                  <div
                    className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black transition-all ${
                      // 1. Direct Selected Day (Solid Vibrant Blue)
                      isSelected
                        ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/50 scale-105 ring-2 ring-blue-300'
                        : // 2. Range Endpoint Circles (Day 14 & 18 style from screenshot)
                      isRangeStart || isRangeEnd
                        ? 'bg-[#2563eb] text-white shadow-md'
                        : // 3. Special Status Green Circle (Day 13 style from screenshot)
                      isGreenCircle
                        ? 'bg-[#10b981] text-white shadow-md'
                        : // 4. Special Status Orange Circle (Day 28 style from screenshot)
                      isOrangeCircle
                        ? 'bg-[#f97316] text-white shadow-md'
                        : // 5. Holiday Purple Circle
                      isHoliday && cell.isCurrentMonth
                        ? 'bg-[#8b5cf6] text-white'
                        : // 6. In-range middle dates
                      inRange
                        ? 'text-blue-100 hover:text-white'
                        : // 7. Normal date
                        'hover:bg-white/10 text-white'
                    }`}
                  >
                    <span>{cell.dayNumber}</span>

                    {/* Small class indicator dot beneath day if has classes and not a colored circle */}
                    {hasClasses && cell.isCurrentMonth && !isSelected && !isRangeStart && !isRangeEnd && !isGreenCircle && !isOrangeCircle && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ======================================================== */}
        {/* LOWER HALF: CURVED WHITE BOTTOM SHEET (MATCHING SCREENSHOT) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-t-[36px] p-5 sm:p-6 shadow-2xl flex-1 flex flex-col text-slate-900 animate-in slide-in-from-bottom-4 duration-300 relative min-h-[420px]">
          
          {/* Subtle Drag Handle Pill */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1 mb-4" />

          {/* Subheader: Selected Date & View Mode Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                {selectedDayCell?.date.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', { weekday: 'long' })}
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                {selectedDayCell?.date.toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h2>
            </div>

            {/* Toggle between "List View" (Left Phone) and "Timeline View" (Right Phone) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setBottomViewMode('list')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  bottomViewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="List Cards View (Like Left Screenshot)"
              >
                <List className="w-3.5 h-3.5" />
                <span>{isKhmer ? 'បញ្ជីកាត' : 'List'}</span>
              </button>

              <button
                onClick={() => setBottomViewMode('timeline')}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                  bottomViewMode === 'timeline'
                    ? 'bg-white text-blue-700 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Timeline View (Like Right Screenshot)"
              >
                <Clock4 className="w-3.5 h-3.5" />
                <span>{isKhmer ? 'ម៉ោង Timeline' : 'Timeline'}</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: LIST CARDS VIEW (Matching Left Phone from Screenshot) */}
          {bottomViewMode === 'list' && (
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] pr-1">
              {selectedDayClasses.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-200/80 my-4">
                  <Coffee className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    {isKhmer ? 'គ្មានម៉ោងបង្រៀននៅថ្ងៃនេះទេ' : 'No Academic Classes Scheduled'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {selectedDayCell?.holiday
                      ? `🏖️ ${selectedDayCell.holiday.khmerName || selectedDayCell.holiday.name}`
                      : isKhmer
                      ? 'គ្រូសម្រាកពីការបង្រៀន ឬគ្មានវេនដែលបានកំណត់'
                      : 'Faculty is off-duty or enjoying a scheduled break.'}
                  </p>
                </div>
              ) : (
                selectedDayClasses.map((cls, idx) => {
                  const isToday = selectedDayCell?.dateStr === todayStr;
                  const classAtt = AttendanceEngine.findRecordForSubjectSchedule(
                    cls,
                    attendance,
                    selectedDateStr,
                    activeTeacher ? [activeTeacher] : undefined
                  );

                  const hasCheckedIn = Boolean(classAtt?.checkInTime);
                  const hasCheckedOut = Boolean(classAtt?.checkOutTime);
                  const isInProgress = isToday && hasCheckedIn && !hasCheckedOut;
                  const isCurOngoing = isToday && !hasCheckedIn;

                  // Initials for avatar circle
                  const initials = (cls.teacherName || activeTeacher?.fullName || 'T')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  const avatarBg = ['bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600'][idx % 4];

                  return (
                    <div
                      key={cls.id || idx}
                      className={`bg-white border p-4 rounded-3xl shadow-xs hover:shadow-md transition-all space-y-3 ${
                        isInProgress
                          ? 'border-cyan-400 ring-2 ring-cyan-200/50 bg-gradient-to-br from-white via-cyan-50/20 to-blue-50/30'
                          : isCurOngoing
                          ? 'border-blue-300 hover:border-blue-400'
                          : 'border-slate-200/90 hover:border-blue-300'
                      }`}
                    >
                      {/* Top Row: Avatar + Title + Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Round Avatar Circle */}
                          <div
                            className={`w-10 h-10 rounded-full ${avatarBg} text-white flex items-center justify-center font-black text-xs shadow-md shrink-0`}
                          >
                            {initials}
                          </div>

                          <div>
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-blue-700 font-black">
                                {cls.subjectCode || cls.subject}
                              </span>
                            </h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{cls.startTime} - {cls.endTime}</span>
                              <span>•</span>
                              <span>{cls.gradeClass || 'Year 2'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge: COMPLETED vs IN PROGRESS vs CURRENT / UPCOMING */}
                        {hasCheckedOut ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{isKhmer ? 'បានបញ្ចប់' : 'COMPLETED'}</span>
                          </span>
                        ) : isInProgress ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-300 flex items-center gap-1.5 shrink-0 shadow-2xs animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>{isKhmer ? 'កំពុងបង្រៀន' : 'IN PROGRESS'}</span>
                          </span>
                        ) : isCurOngoing ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                            {isKhmer ? 'ម៉ោងនេះ' : 'CURRENT'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 shrink-0">
                            {isKhmer ? 'នឹងមកដល់' : 'UPCOMING'}
                          </span>
                        )}
                      </div>

                      {/* Category Tag Pills Row (Matching Design / Home Page / Business pills) */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="px-3 py-1 rounded-xl text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                          {activeTeacher?.department || 'Academic MIS'}
                        </span>
                        <span className="px-3 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Room {cls.room || '304'}
                        </span>
                        <span className="px-3 py-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          {cls.periodName || `Period ${cls.periodNumber || idx + 1}`}
                        </span>
                      </div>

                      {/* Interactive Check-In / Check-Out Actions */}
                      {isToday && (
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {hasCheckedOut
                                ? `In: ${classAtt?.checkInTime} • Out: ${classAtt?.checkOutTime}`
                                : hasCheckedIn
                                ? `In: ${classAtt?.checkInTime} • ${isKhmer ? 'កំពុងបង្រៀន' : 'Session Active'}`
                                : (isKhmer ? 'រង់ចាំស្កេនចូលម៉ោងបង្រៀន' : 'Ready for Faculty Check-In')}
                            </span>
                          </div>

                          {!hasCheckedIn ? (
                            <button
                              onClick={() => handleTeacherCheckInAction(cls)}
                              disabled={isActionLoading}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>{isKhmer ? 'ស្កេនចូល (Check In)' : 'Check In Class'}</span>
                            </button>
                          ) : !hasCheckedOut ? (
                            <button
                              onClick={() => handleTeacherCheckOutAction(cls)}
                              disabled={isActionLoading}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>{isKhmer ? 'ស្កេនចេញ (Check Out)' : 'Check Out Class'}</span>
                            </button>
                          ) : (
                            <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{isKhmer ? 'ស្កេនចេញរួចរាល់' : 'Checked Out'}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW MODE 2: TIMELINE VIEW (Matching Right Phone from Screenshot) */}
          {bottomViewMode === 'timeline' && (
            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-4 pr-1">
              {/* Vertical Hour Timeline */}
              <div className="relative pl-14 space-y-6 pt-2">
                
                {/* Vertical Timeline Track Line */}
                <div className="absolute left-[52px] top-0 bottom-0 w-[2px] bg-slate-200" />

                {/* Current Time Horizontal Line Marker (Matching Screenshot) */}
                <div className="absolute left-6 right-0 top-14 flex items-center z-10 pointer-events-none">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
                  <span className="flex-1 h-[2px] bg-emerald-500" />
                </div>

                {/* Timeline Hour Slices */}
                {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'].map((timeLabel, tIdx) => {
                  const matchingClass = selectedDayClasses.find(c => c.startTime.startsWith(timeLabel.split(':')[0]));
                  const palette = timelinePalette[tIdx % timelinePalette.length];

                  return (
                    <div key={timeLabel} className="relative flex items-start gap-4">
                      {/* Left Time Label */}
                      <span className="absolute -left-14 top-2 text-[11px] font-mono font-bold text-slate-400">
                        {timeLabel}
                      </span>

                      {/* Timeline Event Block */}
                      {matchingClass ? (
                        <div
                          className={`w-full p-3.5 rounded-2xl ${palette.bg} border ${palette.border} shadow-xs space-y-1 transition-all hover:scale-[1.01]`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-6 h-6 rounded-full ${palette.initialBg} text-white flex items-center justify-center font-black text-[9px] shrink-0 font-mono`}
                            >
                              {(matchingClass.subjectCode || matchingClass.subject).slice(0, 3)}
                            </div>
                            <div>
                              <h4 className={`text-xs font-black ${palette.text} leading-tight font-mono`}>
                                {matchingClass.subjectCode || matchingClass.subject}
                              </h4>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {matchingClass.startTime} – {matchingClass.endTime} • Room {matchingClass.room}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-8 flex items-center">
                          <span className="w-full border-t border-dashed border-slate-200" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FLOATING ACTION BUTTON (+) & BOTTOM CONTROL STRIP */}
          {/* ======================================================== */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
            
            {/* Quick Summary Counts */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-bold text-slate-800">
                {selectedDayClasses.length} {isKhmer ? 'វេន' : 'Classes'}
              </span>
              <span>•</span>
              <span>Room {selectedDayClasses[0]?.room || '304'}</span>
            </div>

            {/* Floating Action Button (+) matching the screenshot */}
            <div className="relative">
              <button
                onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 active:scale-95 transition-all cursor-pointer"
                title="Quick Action"
              >
                <Plus className={`w-6 h-6 transition-transform duration-200 ${isFabMenuOpen ? 'rotate-45' : ''}`} />
              </button>

              {/* FAB Dropdown Menu */}
              {isFabMenuOpen && (
                <div className="absolute right-0 bottom-14 w-52 bg-slate-900 text-white border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in slide-in-from-bottom-2 duration-150 space-y-1">
                  {hasPermission('schedules.create') && onAddScheduleForDay && (
                    <button
                      onClick={() => {
                        setIsFabMenuOpen(false);
                        onAddScheduleForDay(selectedDayCell?.dayOfWeek || 1, activeTeacher?.id || '');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2 cursor-pointer font-bold"
                    >
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>{isKhmer ? 'បន្ថែមម៉ោងបង្រៀនថ្មី' : 'Add Class Session'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsFabMenuOpen(false);
                      handleJumpToToday();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>{isKhmer ? 'ទៅកាន់ថ្ងៃនេះ' : 'Jump to Today'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsFabMenuOpen(false);
                      window.print();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-purple-400" />
                    <span>{isKhmer ? 'បោះពុម្ពប្រតិទិន' : 'Print Monthly Plan'}</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {isProfileModalOpen && (
        <TeacherProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
};
