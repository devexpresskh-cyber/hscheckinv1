import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, TeacherSubjectSchedule, TimetablePeriod } from '../../types/index.ts';
import { StorageService } from '../../services/storageService.ts';
import { PeriodModal } from './PeriodModal.tsx';
import { PeriodManagementModal } from './PeriodManagementModal.tsx';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  Clock,
  MapPin,
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Search,
  Printer,
  CalendarDays,
  CheckCircle2,
  User,
  Sparkles,
  DollarSign,
  Sliders,
  Coffee,
  Building2
} from 'lucide-react';

export interface WeekDayDef {
  index: number; // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 0 = Sun
  shortEn: string;
  fullEn: string;
  shortKm: string;
  fullKm: string;
}

export const MON_SAT_DAYS: WeekDayDef[] = [
  { index: 1, shortEn: 'Mon', fullEn: 'Monday', shortKm: 'ចន្ទ', fullKm: 'ថ្ងៃចន្ទ' },
  { index: 2, shortEn: 'Tue', fullEn: 'Tuesday', shortKm: 'អង្គារ', fullKm: 'ថ្ងៃអង្គារ' },
  { index: 3, shortEn: 'Wed', fullEn: 'Wednesday', shortKm: 'ពុធ', fullKm: 'ថ្ងៃពុធ' },
  { index: 4, shortEn: 'Thu', fullEn: 'Thursday', shortKm: 'ព្រហ', fullKm: 'ថ្ងៃព្រហស្បតិ៍' },
  { index: 5, shortEn: 'Fri', fullEn: 'Friday', shortKm: 'សុក្រ', fullKm: 'ថ្ងៃសុក្រ' },
  { index: 6, shortEn: 'Sat', fullEn: 'Saturday', shortKm: 'សៅរ៍', fullKm: 'ថ្ងៃសៅរ៍' },
];

export const SUNDAY_DEF: WeekDayDef = {
  index: 0,
  shortEn: 'Sun',
  fullEn: 'Sunday',
  shortKm: 'អាទិត្យ',
  fullKm: 'ថ្ងៃអាទិត្យ'
};

interface PeriodSlot {
  id?: string;
  periodNumber: number;
  periodName: string;
  khmerPeriodName?: string;
  startTime: string;
  endTime: string;
  sessionType?: 'Morning' | 'Afternoon' | 'Evening' | 'Break';
  isBreak?: boolean;
  durationMinutes?: number;
  color?: string;
}

interface MonSatWeeklyTimetableProps {
  subjectSchedules: TeacherSubjectSchedule[];
  teachers: Teacher[];
  onEditSchedule?: (schedule: TeacherSubjectSchedule) => void;
  onDeleteSchedule?: (id: string, name: string) => void;
  onAddForSlot?: (dayIndex: number, periodNumber?: number, startTime?: string, endTime?: string) => void;
  initialTeacherFilter?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
  lockedTeacherId?: string;
  isTeacherRole?: boolean;
}

export const MonSatWeeklyTimetable: React.FC<MonSatWeeklyTimetableProps> = ({
  subjectSchedules,
  teachers,
  onEditSchedule,
  onDeleteSchedule,
  onAddForSlot,
  initialTeacherFilter = 'All',
  canEdit = true,
  canDelete = true,
  canCreate = true,
  lockedTeacherId,
  isTeacherRole = false
}) => {
  const { isKhmer } = useLanguage();
  const systemSettings = StorageService.getSystemSettings();

  const [selectedTeacher, setSelectedTeacher] = useState<string>(lockedTeacherId || initialTeacherFilter);
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedRoom, setSelectedRoom] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeSunday, setIncludeSunday] = useState<boolean>(false);

  useEffect(() => {
    if (lockedTeacherId) {
      setSelectedTeacher(lockedTeacherId);
    } else if (initialTeacherFilter) {
      setSelectedTeacher(initialTeacherFilter);
    }
  }, [lockedTeacherId, initialTeacherFilter]);

  const lockedTeacher = useMemo(() => {
    return lockedTeacherId ? teachers.find(t => t.id === lockedTeacherId) : null;
  }, [lockedTeacherId, teachers]);

  // Today day of week (0=Sun, 1=Mon, ..., 6=Sat)
  const todayDayOfWeek = new Date().getDay();

  // Active days to display as columns (Mon to Sat by default, optionally Sun)
  const displayDays = useMemo(() => {
    if (includeSunday) {
      return [...MON_SAT_DAYS, SUNDAY_DEF];
    }
    return MON_SAT_DAYS;
  }, [includeSunday]);

  // Extract unique classes and rooms for filtering
  const relevantSchedulesForTeacher = useMemo(() => {
    if (lockedTeacherId && isTeacherRole) {
      return subjectSchedules.filter(s =>
        s.teacherId === lockedTeacherId ||
        (lockedTeacher && (
          s.teacherName?.toLowerCase() === lockedTeacher.fullName.toLowerCase() ||
          (s.teacherId && lockedTeacher.teacherId && s.teacherId.toLowerCase() === lockedTeacher.teacherId.toLowerCase())
        ))
      );
    }
    return subjectSchedules;
  }, [subjectSchedules, lockedTeacherId, isTeacherRole, lockedTeacher]);

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    relevantSchedulesForTeacher.forEach(s => {
      if (s.gradeClass) set.add(s.gradeClass);
    });
    return Array.from(set).sort();
  }, [relevantSchedulesForTeacher]);

  const uniqueRooms = useMemo(() => {
    const set = new Set<string>();
    relevantSchedulesForTeacher.forEach(s => {
      if (s.room) set.add(s.room);
    });
    return Array.from(set).sort();
  }, [relevantSchedulesForTeacher]);

  const [periods, setPeriods] = useState<TimetablePeriod[]>(() => StorageService.getPeriods());
  const [isPeriodManageModalOpen, setIsPeriodManageModalOpen] = useState<boolean>(false);
  const [isQuickPeriodModalOpen, setIsQuickPeriodModalOpen] = useState<boolean>(false);
  const [editingPeriod, setEditingPeriod] = useState<TimetablePeriod | null>(null);

  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setPeriods(StorageService.getPeriods());
    });
    return () => unsub();
  }, []);

  const handleAddPeriod = (p: TimetablePeriod) => {
    StorageService.addPeriod(p);
  };

  const handleUpdatePeriod = (id: string, updates: Partial<TimetablePeriod>, syncClasses: boolean) => {
    StorageService.updatePeriod(id, updates, syncClasses);
  };

  const handleDeletePeriod = (id: string) => {
    StorageService.deletePeriod(id);
  };

  const handleResetDefaults = () => {
    StorageService.resetPeriodsToDefault();
  };

  // Derive sorted periodSlots dynamically from StorageService periods
  const periodSlots: PeriodSlot[] = useMemo(() => {
    if (periods && periods.length > 0) {
      return [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    // Fallback if none in storage
    const map = new Map<number, PeriodSlot>();
    map.set(1, { id: 'p1', periodNumber: 1, periodName: 'Period 1', startTime: '07:30', endTime: '09:00', durationMinutes: 90, color: '#4F46E5' });
    map.set(2, { id: 'p2', periodNumber: 2, periodName: 'Period 2', startTime: '09:15', endTime: '10:45', durationMinutes: 90, color: '#0284C7' });
    map.set(99, { id: 'p-break', periodNumber: 99, periodName: 'Midday Break', khmerPeriodName: 'សម្រាកថ្ងៃត្រង់', startTime: '11:30', endTime: '13:30', isBreak: true, durationMinutes: 120, color: '#D97706' });
    map.set(3, { id: 'p3', periodNumber: 3, periodName: 'Period 3', startTime: '13:30', endTime: '15:00', durationMinutes: 90, color: '#059669' });
    map.set(4, { id: 'p4', periodNumber: 4, periodName: 'Period 4', startTime: '15:15', endTime: '16:45', durationMinutes: 90, color: '#7C3AED' });

    return Array.from(map.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [periods]);

  // Filter schedules according to active filters
  const filteredSchedules = useMemo(() => {
    const effectiveTeacher = lockedTeacherId || selectedTeacher;
    return subjectSchedules.filter(sub => {
      if (effectiveTeacher !== 'All') {
        const matchesTeacher =
          sub.teacherId === effectiveTeacher ||
          (lockedTeacher && (
            sub.teacherName?.toLowerCase() === lockedTeacher.fullName.toLowerCase() ||
            (sub.teacherId && lockedTeacher.teacherId && sub.teacherId.toLowerCase() === lockedTeacher.teacherId.toLowerCase())
          ));
        if (!matchesTeacher) {
          return false;
        }
      }
      if (selectedClass !== 'All' && sub.gradeClass !== selectedClass) {
        return false;
      }
      if (selectedRoom !== 'All' && sub.room !== selectedRoom) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = sub.subject.toLowerCase().includes(q);
        const matchKhmerSub = (sub.khmerSubject || '').toLowerCase().includes(q);
        const matchCode = sub.subjectCode.toLowerCase().includes(q);
        const matchTeacher = sub.teacherName.toLowerCase().includes(q);
        const matchKhmerTeacher = (sub.khmerTeacherName || '').toLowerCase().includes(q);
        const matchClass = sub.gradeClass.toLowerCase().includes(q);
        const matchRoom = sub.room.toLowerCase().includes(q);
        if (!matchSub && !matchKhmerSub && !matchCode && !matchTeacher && !matchKhmerTeacher && !matchClass && !matchRoom) {
          return false;
        }
      }
      return true;
    });
  }, [subjectSchedules, lockedTeacherId, selectedTeacher, selectedClass, selectedRoom, searchQuery]);

  // Helper to check if a schedule runs on a specific day of week
  const isScheduleOnDay = (sub: TeacherSubjectSchedule, dayIndex: number): boolean => {
    if (Array.isArray(sub.daysOfWeek) && sub.daysOfWeek.length > 0) {
      return sub.daysOfWeek.includes(dayIndex);
    }
    return sub.dayOfWeek === dayIndex;
  };

  // Get count of scheduled sessions on a given day
  const getDaySessionCount = (dayIndex: number) => {
    return filteredSchedules.filter(sub => isScheduleOnDay(sub, dayIndex)).length;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Timetable Filter Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 print:hidden">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{isKhmer ? 'ច្រោះទិន្នន័យ៖' : 'Filter Timetable:'}</span>
          </div>

          {/* Teacher Selector or Locked Badge */}
          {lockedTeacherId && isTeacherRole ? (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
              <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-indigo-900">
                {lockedTeacher?.fullName || 'My Timetable'}
                {lockedTeacher?.khmerName ? ` (${lockedTeacher.khmerName})` : ''}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
                {isKhmer ? 'កាលវិភាគផ្ទាល់ខ្លួន' : 'Owned'}
              </span>
            </div>
          ) : (
            <select
              value={selectedTeacher}
              onChange={e => setSelectedTeacher(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">{isKhmer ? 'គ្រូទាំងអស់ (All Faculty)' : 'All Teachers'}</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.fullName} {t.khmerName ? `(${t.khmerName})` : ''} - {t.subject}
                </option>
              ))}
            </select>
          )}

          {/* Class / Grade Selector */}
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">{isKhmer ? 'គ្រប់ថ្នាក់ទាំងអស់ (All Classes)' : 'All Classes'}</option>
            {uniqueClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          {/* Room Selector */}
          {uniqueRooms.length > 0 && (
            <select
              value={selectedRoom}
              onChange={e => setSelectedRoom(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 hidden sm:block"
            >
              <option value="All">{isKhmer ? 'គ្រប់បន្ទប់ (All Rooms)' : 'All Rooms'}</option>
              {uniqueRooms.map(rm => (
                <option key={rm} value={rm}>{rm}</option>
              ))}
            </select>
          )}

          {/* Sunday Toggle */}
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={includeSunday}
              onChange={e => setIncludeSunday(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span>{isKhmer ? 'បង្ហាញថ្ងៃអាទិត្យ (+Sun)' : '+ Sun'}</span>
          </label>
        </div>

        {/* Right Search & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isKhmer ? 'ស្វែងរកមុខវិជ្ជា, គ្រូ, បន្ទប់...' : 'Search subject, room, teacher...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {!isTeacherRole && canEdit && (
            <button
              onClick={() => setIsPeriodManageModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors border border-indigo-200 shrink-0"
              title="Manage Timetable Periods & Bells"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">{isKhmer ? 'កំណត់វេនម៉ោង' : 'Manage Periods'}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors shrink-0"
            title="Print Mon-Sat Weekly Timetable"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isKhmer ? 'បោះពុម្ព' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Weekly Schedule Banner Info */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {isTeacherRole
                  ? (isKhmer ? 'កាលវិភាគបង្រៀនផ្ទាល់ខ្លួនរបស់ខ្ញុំ (ចន្ទ ដល់ សៅរ៍)' : 'My Personal Teaching Timetable (Mon – Sat View)')
                  : (isKhmer ? 'កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍ (ចន្ទ ដល់ សៅរ៍)' : 'Weekly Teaching Timetable (Mon – Sat View)')}
              </h3>
              <p className="text-xs text-indigo-200 font-khmer mt-0.5">
                {isTeacherRole
                  ? (isKhmer
                      ? 'កាលវិភាគផ្លូវការសម្រាប់តែថ្នាក់ និងមុខវិជ្ជារបស់អ្នកផ្ទាល់'
                      : 'Official personal academic timetable showing exclusively your assigned classes and teaching slots')
                  : (isKhmer 
                      ? 'តារាងបែងចែកម៉ោងបង្រៀនប្រចាំសប្តាហ៍ ពីថ្ងៃចន្ទ ដល់ ថ្ងៃសៅរ៍ តាមវេននីមួយៗ'
                      : 'Official 6-day academic schedule from Monday to Saturday with real-time period mapping')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-indigo-300 uppercase tracking-wider block font-bold">
              {isKhmer ? 'ម៉ោងបង្រៀនសរុប' : 'Total Active Periods'}
            </span>
            <span className="text-lg font-mono font-black text-white">
              {filteredSchedules.length}
            </span>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="text-right">
            <span className="text-[10px] text-indigo-300 uppercase tracking-wider block font-bold">
              {isKhmer ? 'គ្រូកំពុងមើល' : 'Filtered Faculty'}
            </span>
            <span className="text-xs font-bold text-emerald-400 block truncate max-w-[160px]">
              {lockedTeacherId
                ? `${lockedTeacher?.fullName || 'My Timetable'} (${isKhmer ? 'ផ្ទាល់ខ្លួន' : 'Owned'})`
                : (selectedTeacher === 'All' 
                    ? (isKhmer ? 'គ្រូទាំងអស់' : 'All Teachers')
                    : (teachers.find(t => t.id === selectedTeacher)?.fullName || selectedTeacher))}
            </span>
          </div>
        </div>
      </div>

      {/* Printable Official Timetable Header - Only visible during print */}
      <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl">
              <Building2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight">
                {isKhmer ? (systemSettings.khmerOrgName || systemSettings.organizationName) : systemSettings.organizationName}
              </h1>
              <h2 className="text-sm font-extrabold text-indigo-900 mt-0.5 font-khmer">
                {isKhmer ? 'កាលវិភាគបង្រៀនប្រចាំសប្តាហ៍ (ចន្ទ ដល់ សៅរ៍)' : 'OFFICIAL WEEKLY TEACHING TIMETABLE (MONDAY – SATURDAY)'}
              </h2>
            </div>
          </div>

          <div className="text-right text-xs space-y-0.5">
            <div className="font-bold text-slate-900">
              <span className="text-slate-500 font-normal">{isKhmer ? 'ឆ្នាំសិក្សា៖ ' : 'Academic Year: '}</span>
              2025–2026
            </div>
            <div className="text-slate-600 font-medium">
              <span className="text-slate-500 font-normal">{isKhmer ? 'កាលបរិច្ឆេទបោះពុម្ព៖ ' : 'Printed Date: '}</span>
              {new Date().toLocaleDateString(isKhmer ? 'km-KH' : 'en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {new Date().toLocaleTimeString(isKhmer ? 'km-KH' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>

        {/* Filter / Scope summary strip */}
        <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-800">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">{isKhmer ? 'សាស្រ្តាចារ្យ / គ្រូបង្រៀន' : 'Teacher / Faculty'}</span>
              <span className="font-extrabold text-slate-900">
                {selectedTeacher === 'All'
                  ? (isKhmer ? 'គ្រប់គ្រូទាំងអស់ (All Faculty)' : 'All Teachers')
                  : teachers.find(t => t.id === selectedTeacher)?.fullName || selectedTeacher}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-300" />

            <div>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">{isKhmer ? 'កម្រិតថ្នាក់' : 'Class / Grade'}</span>
              <span className="font-extrabold text-slate-900">
                {selectedClass === 'All'
                  ? (isKhmer ? 'គ្រប់ថ្នាក់ទាំងអស់ (All Classes)' : 'All Classes')
                  : selectedClass}
              </span>
            </div>

            {selectedRoom !== 'All' && (
              <>
                <div className="h-6 w-px bg-slate-300" />
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">{isKhmer ? 'បន្ទប់សិក្សា' : 'Room'}</span>
                  <span className="font-extrabold text-slate-900">{selectedRoom}</span>
                </div>
              </>
            )}
          </div>

          <div className="text-right">
            <span className="font-bold text-slate-500 uppercase text-[10px] block">{isKhmer ? 'ម៉ោងបង្រៀនសរុប' : 'Total Active Sessions'}</span>
            <span className="font-mono font-black text-indigo-900 text-sm">
              {filteredSchedules.length} {isKhmer ? 'វេន' : 'Classes'}
            </span>
          </div>
        </div>
      </div>

      {/* Mon-Sat Header Weekly Timetable Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden timetable-print-wrapper print:border-none print:shadow-none print:rounded-none">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse min-w-[960px] timetable-print-table print:min-w-0 print:w-full print:border print:border-slate-500">
            {/* Table Header: Mon - Sat */}
            <thead>
              <tr className="bg-slate-900 text-white divide-x divide-slate-800 print:bg-slate-100 print:text-black print:divide-slate-400 print:border-b-2 print:border-slate-500">
                {/* Period / Time Slot Column */}
                <th className="w-40 py-3.5 px-4 text-xs font-black uppercase tracking-wider text-slate-300 sticky left-0 bg-slate-900 z-10 print:static print:bg-slate-100 print:text-black print:border print:border-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 print:text-slate-700" />
                    <span>{isKhmer ? 'វេន / ម៉ោង' : 'Period / Time'}</span>
                  </div>
                </th>

                {/* Day Columns: Mon, Tue, Wed, Thu, Fri, Sat (and optional Sun) */}
                {displayDays.map(day => {
                  const isToday = todayDayOfWeek === day.index;
                  const sessionCount = getDaySessionCount(day.index);

                  return (
                    <th
                      key={day.index}
                      className={`py-3.5 px-3 text-center transition-colors relative print:static print:bg-slate-100 print:text-black print:border print:border-slate-400 ${
                        isToday ? 'bg-indigo-950 text-indigo-100' : 'bg-slate-900'
                      }`}
                    >
                      {/* Highlight bar for current day */}
                      {isToday && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 print:hidden" />
                      )}

                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black uppercase tracking-wider print:text-black">
                            {day.shortEn}
                          </span>
                          <span className="text-[11px] font-khmer font-bold text-indigo-300 print:text-slate-800">
                            ({day.shortKm})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 print:text-slate-600 font-normal">
                            {isKhmer ? day.fullKm : day.fullEn}
                          </span>
                          {sessionCount > 0 && (
                            <span className="text-[9px] font-mono font-bold bg-indigo-500/30 text-indigo-200 print:bg-slate-200 print:text-black px-1.5 py-0.2 rounded-full">
                              {sessionCount}
                            </span>
                          )}
                        </div>
                        {isToday && (
                          <span className="inline-block mt-1 text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded print:hidden">
                            {isKhmer ? 'ថ្ងៃនេះ' : 'Today'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Timetable Body */}
            <tbody className="divide-y divide-slate-200 print:divide-slate-400">
              {periodSlots.map((period, pIdx) => {
                // If this slot is configured as a Break or Lunch interval
                if (period.isBreak || period.sessionType === 'Break') {
                  return (
                    <tr key={period.id || `break-${period.periodNumber}-${pIdx}`} className="bg-amber-50/70 border-y border-amber-200/90 print:bg-slate-100 print:border print:border-slate-400">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-amber-900 text-xs sticky left-0 bg-amber-50/95 z-10 border-r border-amber-200 print:static print:bg-slate-100 print:text-black print:border print:border-slate-400">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <Coffee className="w-3.5 h-3.5 text-amber-600 print:text-slate-700 shrink-0" />
                            <span>{period.startTime} – {period.endTime}</span>
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-0.5 print:hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  const fullP = periods.find(p => p.id === period.id) || {
                                    id: period.id || `p-${period.periodNumber}`,
                                    periodNumber: period.periodNumber,
                                    periodName: period.periodName,
                                    khmerPeriodName: period.khmerPeriodName,
                                    startTime: period.startTime,
                                    endTime: period.endTime,
                                    sessionType: 'Break',
                                    isBreak: true,
                                    durationMinutes: period.durationMinutes || 120,
                                    color: period.color || '#D97706',
                                    isActive: true
                                  };
                                  setEditingPeriod(fullP);
                                  setIsQuickPeriodModalOpen(true);
                                }}
                                className="p-1 rounded text-amber-700 hover:text-amber-950 hover:bg-amber-100 transition-colors"
                                title="Edit Break Slot"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {canDelete && period.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(isKhmer ? 'តើអ្នកចង់លុបម៉ោងសម្រាកនេះមែនទេ?' : 'Delete this break interval?')) {
                                      handleDeletePeriod(period.id!);
                                    }
                                  }}
                                  className="p-1 rounded text-amber-700 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete Break Slot"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        colSpan={displayDays.length}
                        className="py-2.5 px-4 text-center text-xs font-bold text-amber-900 tracking-wide print:text-black print:border print:border-slate-400"
                      >
                        <span className="font-khmer">
                          ☕ {period.khmerPeriodName || period.periodName} ({period.periodName}) • {period.durationMinutes || 120} {isKhmer ? 'នាទី' : 'mins'}
                        </span>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={period.id || `period-${period.periodNumber}-${pIdx}`} className="divide-x divide-slate-100 hover:bg-slate-50/50 transition-colors print:divide-slate-400 print:border-b print:border-slate-400">
                    {/* Period Header Column */}
                    <td className="py-4 px-3.5 align-top bg-slate-50/90 sticky left-0 z-10 border-r border-slate-200 print:static print:bg-slate-50 print:border print:border-slate-400 print:p-2">
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-white shadow-2xs w-fit print:text-black print:bg-slate-200 print:border print:border-slate-400"
                            style={{ backgroundColor: period.color || '#4F46E5' }}
                          >
                            {period.periodName}
                          </span>

                          {canEdit && (
                            <div className="flex items-center gap-0.5 print:hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  const fullP = periods.find(p => p.id === period.id) || {
                                    id: period.id || `p-${period.periodNumber}`,
                                    periodNumber: period.periodNumber,
                                    periodName: period.periodName,
                                    khmerPeriodName: period.khmerPeriodName,
                                    startTime: period.startTime,
                                    endTime: period.endTime,
                                    sessionType: period.sessionType || 'Morning',
                                    isBreak: false,
                                    durationMinutes: period.durationMinutes || 90,
                                    color: period.color || '#4F46E5',
                                    isActive: true
                                  };
                                  setEditingPeriod(fullP);
                                  setIsQuickPeriodModalOpen(true);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title={isKhmer ? 'កែសម្រួលវេននេះ' : 'Edit period slot'}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {canDelete && period.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const count = subjectSchedules.filter(s => s.periodNumber === period.periodNumber).length;
                                    if (count > 0) {
                                      if (!window.confirm(isKhmer ? `វេននេះមានមុខវិជ្ជាចំនួន ${count} ថ្នាក់។ តើអ្នកពិតជាចង់លុបវេននេះមែនទេ?` : `Period "${period.periodName}" has ${count} scheduled classes. Delete period slot?`)) {
                                        return;
                                      }
                                    }
                                    handleDeletePeriod(period.id!);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title={isKhmer ? 'លុបវេននេះ' : 'Delete period slot'}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {period.khmerPeriodName && (
                          <span className="text-[10px] font-khmer font-bold text-slate-500 print:text-slate-700 mt-1">
                            {period.khmerPeriodName}
                          </span>
                        )}

                        <span className="font-mono text-xs font-extrabold text-slate-900 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-600 print:text-slate-700 shrink-0" />
                          {period.startTime} – {period.endTime}
                        </span>
                        <span className="text-[10px] text-slate-500 print:text-slate-600 mt-0.5">
                          {period.durationMinutes || 90} {isKhmer ? 'នាទី' : 'mins duration'}
                        </span>
                      </div>
                    </td>

                      {/* Day Columns */}
                      {displayDays.map(day => {
                        // Find all classes matching this period and this day
                        const matchingClasses = filteredSchedules.filter(sub => {
                          const onDay = isScheduleOnDay(sub, day.index);
                          const onPeriod = (sub.periodNumber === period.periodNumber) || 
                            (sub.startTime === period.startTime);
                          return onDay && onPeriod;
                        });

                        const isToday = todayDayOfWeek === day.index;

                        return (
                          <td
                            key={day.index}
                            className={`py-3 px-2.5 align-top transition-colors print:p-1.5 print:border print:border-slate-400 ${
                              isToday ? 'bg-indigo-50/20' : ''
                            }`}
                          >
                            {matchingClasses.length > 0 ? (
                              <div className="space-y-2 print:space-y-1.5">
                                {matchingClasses.map(cls => {
                                  const teacher = teachers.find(t => t.id === cls.teacherId);
                                  const cardBg = cls.color || '#4F46E5';

                                  return (
                                    <div
                                      key={cls.id}
                                      onClick={() => {
                                        if (canEdit && onEditSchedule) {
                                          onEditSchedule(cls);
                                        }
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs hover:shadow-md hover:border-indigo-400 hover:ring-2 hover:ring-indigo-100 transition-all relative overflow-hidden group cursor-pointer text-left timetable-card print:p-2 print:rounded-lg print:border print:border-slate-400 print:shadow-none"
                                      style={{ borderLeftColor: cardBg, borderLeftWidth: '4px' }}
                                    >
                                      {/* Top Row: Code & Rate */}
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="font-mono text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 print:bg-slate-100 print:text-black print:border-slate-300">
                                          {cls.subjectCode || 'SUB'}
                                        </span>

                                        <div className="flex items-center gap-1">
                                          {cls.hourlyRate && (
                                            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 print:bg-slate-100 print:text-black print:border-slate-300">
                                              ${cls.hourlyRate.toFixed(0)}/h
                                            </span>
                                          )}

                                          {/* Quick Actions for Admins */}
                                          <div className="flex items-center gap-0.5 print:hidden">
                                            {canEdit && onEditSchedule && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onEditSchedule(cls);
                                                }}
                                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                                title={isKhmer ? 'កែសម្រួលវេន / មុខវិជ្ជា' : 'Edit Period / Schedule'}
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                            )}
                                            {canDelete && onDeleteSchedule && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onDeleteSchedule(cls.id, cls.subject);
                                                }}
                                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                title={isKhmer ? 'លុប' : 'Delete'}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Subject Name */}
                                      <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-2 print:text-[11px] print:line-clamp-none">
                                        {cls.subject}
                                      </h4>
                                      {cls.khmerSubject && (
                                        <p className="text-[10px] text-slate-500 font-khmer truncate mt-0.5 print:text-slate-700 print:text-[9.5px]">
                                          {cls.khmerSubject}
                                        </p>
                                      )}

                                      {/* Class Grade & Room */}
                                      <div className="mt-2 pt-2 border-t border-slate-100 print:border-slate-300 print:mt-1.5 print:pt-1 flex items-center justify-between text-[10px] text-slate-600">
                                        <div className="flex items-center gap-1 font-bold text-slate-800 print:text-black">
                                          <GraduationCap className="w-3 h-3 text-indigo-600 print:text-slate-700 shrink-0" />
                                          <span className="truncate">{cls.gradeClass}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-500 print:text-slate-700 font-medium">
                                          <MapPin className="w-3 h-3 text-slate-400 print:text-slate-600 shrink-0" />
                                          <span className="truncate">{cls.room}</span>
                                        </div>
                                      </div>

                                      {/* Teacher Name & Avatar */}
                                      <div className="mt-2 pt-2 border-t border-slate-100 print:border-slate-300 print:mt-1.5 print:pt-1 flex items-center gap-1.5">
                                        {teacher?.photoUrl ? (
                                          <img
                                            src={teacher.photoUrl}
                                            alt={cls.teacherName}
                                            className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                                          />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center shrink-0 print:border print:border-slate-400">
                                            {cls.teacherName.charAt(0)}
                                          </div>
                                        )}
                                        <span className="text-[11px] font-bold text-slate-800 truncate print:text-[10px]">
                                          {isKhmer && cls.khmerTeacherName ? cls.khmerTeacherName : cls.teacherName}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Empty Cell Slot */
                              <div className="h-full min-h-[100px] print:min-h-0 print:border-none print:p-0 rounded-2xl border-2 border-dashed border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center p-2 group text-slate-300 hover:text-indigo-600">
                                {canCreate && onAddForSlot ? (
                                  <>
                                    <button
                                      onClick={() => onAddForSlot(day.index, period.periodNumber, period.startTime, period.endTime)}
                                      className="flex flex-col items-center gap-1 text-center w-full h-full justify-center p-2 print:hidden"
                                      title={`Add class for ${day.shortEn} - ${period.periodName}`}
                                    >
                                      <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                                      </div>
                                      <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isKhmer ? '+ បន្ថែម' : '+ Add Period'}
                                      </span>
                                    </button>
                                    <span className="hidden print:inline text-slate-300 text-[10px] font-medium">-</span>
                                  </>
                                ) : (
                                  <span className="text-slate-300 text-[10px] font-medium">-</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Add Period Row */}
                {canCreate && (
                  <tr className="bg-slate-50/60 hover:bg-slate-100/60 transition-colors print:hidden">
                    <td colSpan={displayDays.length + 1} className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPeriod(null);
                          setIsQuickPeriodModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 text-xs font-bold shadow-2xs transition-all active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isKhmer ? '+ បង្កើតវេនម៉ោងបង្រៀនថ្មី (Add New Timetable Period Slot)' : '+ Add New Period Slot (e.g. Period 5 / Evening Session)'}</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Official Signatures Block - Only visible in print */}
        <div className="hidden print:grid grid-cols-3 gap-6 mt-8 pt-4 border-t border-slate-400 text-center text-xs">
          <div>
            <p className="font-bold text-slate-900 font-khmer">{isKhmer ? 'រៀបចំដោយ' : 'Prepared By'}</p>
            <p className="text-[10px] text-slate-500">{isKhmer ? 'មន្ត្រីកាលវិភាគ / រដ្ឋបាល' : 'Timetable Coordinator'}</p>
            <div className="mt-14 border-b border-dotted border-slate-400 mx-8"></div>
            <p className="text-[11px] text-slate-600 mt-1 font-medium">{isKhmer ? 'កាលបរិច្ឆេទ៖ ____ / ____ / ២០២__' : 'Date: _____ / _____ / 202___'}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 font-khmer">{isKhmer ? 'បានពិនិត្យ និងផ្ទៀងផ្ទាត់' : 'Verified By'}</p>
            <p className="text-[10px] text-slate-500">{isKhmer ? 'ប្រធានផ្នែកសិក្សាធិការ' : 'Head of Academic Affairs'}</p>
            <div className="mt-14 border-b border-dotted border-slate-400 mx-8"></div>
            <p className="text-[11px] text-slate-600 mt-1 font-medium">{isKhmer ? 'កាលបរិច្ឆេទ៖ ____ / ____ / ២០២__' : 'Date: _____ / _____ / 202___'}</p>
          </div>

          <div>
            <p className="font-bold text-slate-900 font-khmer">{isKhmer ? 'បានឃើញ និងឯកភាព' : 'Approved By'}</p>
            <p className="text-[10px] text-slate-500">{isKhmer ? 'នាយក / គណៈគ្រប់គ្រងសាលា' : 'School Director / Principal'}</p>
            <div className="mt-14 border-b border-dotted border-slate-400 mx-8"></div>
            <p className="text-[11px] text-slate-600 mt-1 font-medium">{isKhmer ? 'កាលបរិច្ឆេទ៖ ____ / ____ / ២០២__' : 'Date: _____ / _____ / 202___'}</p>
          </div>
        </div>

        {/* Footer Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 px-1 print:hidden">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Mon–Sat Academic Schedule (ចន្ទ ដល់ សៅរ៍)</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>Configurable Teaching Periods</span>
            </span>
          </div>

          <div className="flex items-center gap-1 font-semibold text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Synchronized with Faculty Attendance System</span>
          </div>
        </div>

        {/* Quick Add/Edit Period Modal */}
        {isQuickPeriodModalOpen && (
          <PeriodModal
            isOpen={isQuickPeriodModalOpen}
            onClose={() => {
              setIsQuickPeriodModalOpen(false);
              setEditingPeriod(null);
            }}
            initialPeriod={editingPeriod}
            existingPeriods={periods}
            onSave={(p, sync) => {
              if (editingPeriod) {
                handleUpdatePeriod(editingPeriod.id, p, sync);
              } else {
                handleAddPeriod(p);
              }
            }}
            isKhmer={isKhmer}
          />
        )}

        {/* Full Period Management Modal */}
        {isPeriodManageModalOpen && (
          <PeriodManagementModal
            isOpen={isPeriodManageModalOpen}
            onClose={() => setIsPeriodManageModalOpen(false)}
            periods={periods}
            subjectSchedules={subjectSchedules}
            onAddPeriod={handleAddPeriod}
            onUpdatePeriod={handleUpdatePeriod}
            onDeletePeriod={handleDeletePeriod}
            onResetDefaults={handleResetDefaults}
            isKhmer={isKhmer}
          />
        )}
      </div>
    );
  };
