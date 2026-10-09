import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, TeacherSubjectSchedule, TimetablePeriod } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Clock,
  MapPin,
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  CalendarDays,
  X,
  BookOpen,
  User,
  Sparkles,
  LayoutGrid,
  Layers,
  Printer,
  Download
} from 'lucide-react';

interface TeacherWeeklyTimelineCalendarProps {
  subjectSchedules: TeacherSubjectSchedule[];
  teachers: Teacher[];
  effectiveTeacher: Teacher | null;
  isTeacherAccount: boolean;
  selectedClass: string;
  selectedRoom: string;
  searchQuery: string;
  onEditSchedule?: (schedule: TeacherSubjectSchedule) => void;
  onDeleteSchedule?: (id: string, name: string) => void;
  onAddForSlot?: (dayIndex: number, periodNumber?: number, startTime?: string, endTime?: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
  periods?: TimetablePeriod[];
  onToggleToGridView?: () => void;
  onPrint?: () => void;
  onExportCsv?: () => void;
}

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_KM = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

const WEEKDAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES_KM = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហ', 'សុក្រ', 'សៅរ៍'];

// Color palette for event left-border accents (matching screenshot yellow/blue/purple)
const ACCENT_COLORS = [
  '#F59E0B', // Amber / Gold
  '#3B82F6', // Vibrant Blue
  '#8B5CF6', // Purple
  '#10B981', // Emerald Green
  '#EC4899', // Pink
  '#06B6D4'  // Cyan
];

export const TeacherWeeklyTimelineCalendar: React.FC<TeacherWeeklyTimelineCalendarProps> = ({
  subjectSchedules,
  teachers,
  effectiveTeacher,
  isTeacherAccount,
  selectedClass,
  selectedRoom,
  searchQuery: externalSearchQuery,
  onEditSchedule,
  onDeleteSchedule,
  onAddForSlot,
  canEdit = true,
  canDelete = true,
  canCreate = true,
  periods = [],
  onToggleToGridView,
  onPrint,
  onExportCsv
}) => {
  const { isKhmer } = useLanguage();
  const { currentUser } = useAuth();

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [pickerMonthOffset, setPickerMonthOffset] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [localSearch, setLocalSearch] = useState<string>('');
  const [activeMenuClass, setActiveMenuClass] = useState<TeacherSubjectSchedule | null>(null);

  // Sync date when month picker navigates
  const displayedMonthDate = useMemo(() => {
    const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + pickerMonthOffset, 1);
    return d;
  }, [selectedDate, pickerMonthOffset]);

  // Generate 7 days of the current week (Sunday to Saturday) containing selectedDate
  const currentWeekDays = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday ...
    const diff = d.getDate() - day; // Sunday of this week
    const sunday = new Date(d.setDate(diff));

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(sunday);
      nextDay.setDate(sunday.getDate() + i);
      days.push(nextDay);
    }
    return days;
  }, [selectedDate]);

  // Navigate to previous or next week
  const handlePrevWeek = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 7);
    setSelectedDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 7);
    setSelectedDate(next);
  };

  // Jump to today
  const handleJumpToToday = () => {
    setSelectedDate(new Date());
    setPickerMonthOffset(0);
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is selected
  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Current day index (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const selectedDayOfWeek = selectedDate.getDay();

  // Helper to test if a schedule occurs on a day
  const isScheduleOnDay = (sub: TeacherSubjectSchedule, dayIndex: number): boolean => {
    if (sub.dayOfWeek !== undefined && sub.dayOfWeek !== null) {
      return sub.dayOfWeek === dayIndex;
    }
    if (Array.isArray(sub.daysOfWeek) && sub.daysOfWeek.length > 0) {
      return sub.daysOfWeek.includes(dayIndex);
    }
    return false;
  };

  // Filter schedules for the current view
  const activeSchedules = useMemo(() => {
    const query = (localSearch || externalSearchQuery || '').toLowerCase().trim();

    return subjectSchedules.filter(sub => {
      // Teacher filter
      if (effectiveTeacher) {
        const matchesTeacher =
          sub.teacherId === effectiveTeacher.id ||
          sub.teacherName?.toLowerCase() === effectiveTeacher.fullName.toLowerCase() ||
          (sub.teacherId && effectiveTeacher.teacherId && sub.teacherId.toLowerCase() === effectiveTeacher.teacherId.toLowerCase());
        if (!matchesTeacher) return false;
      }

      // Class filter
      if (selectedClass && selectedClass !== 'All' && sub.gradeClass !== selectedClass) {
        return false;
      }

      // Room filter
      if (selectedRoom && selectedRoom !== 'All' && sub.room !== selectedRoom) {
        return false;
      }

      // Search query
      if (query) {
        const match =
          sub.subject?.toLowerCase().includes(query) ||
          sub.khmerSubject?.toLowerCase().includes(query) ||
          sub.gradeClass?.toLowerCase().includes(query) ||
          sub.room?.toLowerCase().includes(query) ||
          sub.teacherName?.toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [subjectSchedules, effectiveTeacher, selectedClass, selectedRoom, localSearch, externalSearchQuery]);

  // Classes on the selected day
  const classesForSelectedDay = useMemo(() => {
    return activeSchedules
      .filter(sub => isScheduleOnDay(sub, selectedDayOfWeek))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [activeSchedules, selectedDayOfWeek]);

  // Count classes for each day of the current week (for dots on the week strip)
  const classCountByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < 7; i++) {
      const count = activeSchedules.filter(sub => isScheduleOnDay(sub, i)).length;
      map.set(i, count);
    }
    return map;
  }, [activeSchedules]);

  // Current time in minutes for the green indicator line
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isSelectedDateToday = isToday(selectedDate);

  // Month names
  const monthNameEn = MONTHS_EN[selectedDate.getMonth()];
  const monthNameKm = MONTHS_KM[selectedDate.getMonth()];
  const yearStr = selectedDate.getFullYear();

  // Mini calendar grid generation for the dropdown
  const miniCalendarDays = useMemo(() => {
    const year = displayedMonthDate.getFullYear();
    const month = displayedMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon...
    // Start with Monday = 0 for the mini calendar header M T W T F S S
    // Mon (1) -> 0, Tue (2) -> 1, ..., Sun (0) -> 6
    const startOffset = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNumber: number; date: Date; isCurrentMonth: boolean }> = [];

    // Leading days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ dayNumber: prevMonthDays - i, date: d, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ dayNumber: i, date: d, isCurrentMonth: true });
    }

    // Trailing days
    const totalSlots = Math.ceil(days.length / 7) * 7;
    let nextMonthDay = 1;
    while (days.length < totalSlots) {
      const d = new Date(year, month + 1, nextMonthDay);
      days.push({ dayNumber: nextMonthDay, date: d, isCurrentMonth: false });
      nextMonthDay++;
    }

    return days;
  }, [displayedMonthDate]);

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-50 rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden font-sans">
      {/* 1. Deep Blue Header (Faithful to Screenshot) */}
      <div className="bg-gradient-to-b from-[#0B2A5E] via-[#0E356E] to-[#0A2652] text-white p-4 sm:p-5 relative transition-all">
        {/* Top Controls: Jump to Today, Month Selector, Search & Add */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Previous / Today / Next mini navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              title={isKhmer ? 'សប្តាហ៍មុន' : 'Previous Week'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleJumpToToday}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-indigo-100 transition-colors uppercase tracking-wider cursor-pointer"
            >
              {isKhmer ? 'ថ្ងៃនេះ' : 'Today'}
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              title={isKhmer ? 'សប្តាហ៍បន្ទាប់' : 'Next Week'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Month Selector Dropdown Toggle (e.g. "January ∨" / "October 2026 ∨") */}
          <button
            onClick={() => {
              setIsMonthPickerOpen(!isMonthPickerOpen);
              setPickerMonthOffset(0);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl hover:bg-white/10 text-white font-extrabold text-sm sm:text-base tracking-tight transition-all cursor-pointer shadow-2xs"
          >
            <span>{isKhmer ? `${monthNameKm} ${yearStr}` : `${monthNameEn} ${yearStr}`}</span>
            {isMonthPickerOpen ? (
              <ChevronUp className="w-4 h-4 text-sky-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-sky-300" />
            )}
          </button>

          {/* Right: Search, Add, and Optional Grid View Toggle */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isSearchOpen ? 'bg-white text-indigo-900' : 'hover:bg-white/10 text-white/90 hover:text-white'
              }`}
              title={isKhmer ? 'ស្វែងរក' : 'Search schedules'}
            >
              <Search className="w-4 h-4" />
            </button>

            {canCreate && onAddForSlot && (
              <button
                onClick={() => onAddForSlot(selectedDayOfWeek)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer shadow-2xs"
                title={isKhmer ? 'បន្ថែមមុខវិជ្ជា' : 'Add class session'}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            {onToggleToGridView && (
              <button
                onClick={onToggleToGridView}
                className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer hidden sm:flex"
                title={isKhmer ? 'ប្តូរទៅតារាងក្រឡា' : 'Switch to Full Grid Table'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Search Bar (Collapsible) */}
        {isSearchOpen && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder={isKhmer ? 'ស្វែងរកមុខវិជ្ជា, បន្ទប់, ថ្នាក់...' : 'Search subject, room, class...'}
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className="w-full bg-white text-slate-900 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-400 shadow-inner"
              />
            </div>
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="text-xs text-white/70 hover:text-white"
              >
                {isKhmer ? 'សម្អាត' : 'Clear'}
              </button>
            )}
          </div>
        )}

        {/* Teacher profile subtitle banner if viewing a specific teacher */}
        {effectiveTeacher && (
          <div className="mt-2.5 text-center">
            <span className="text-[11px] text-indigo-200/90 font-medium">
              {effectiveTeacher.fullName} {effectiveTeacher.khmerName ? `(${effectiveTeacher.khmerName})` : ''} • {effectiveTeacher.subject || effectiveTeacher.department}
            </span>
          </div>
        )}

        {/* 2. Mini Monthly Calendar Dropdown (Shown on Right phone of screenshot) */}
        {isMonthPickerOpen && (
          <div className="mt-4 pt-4 border-t border-white/15 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Month Navigation Row in Dropdown */}
            <div className="flex items-center justify-between mb-3 px-2 text-xs font-bold text-sky-200">
              <button
                onClick={() => setPickerMonthOffset(prev => prev - 1)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                {MONTHS_EN[displayedMonthDate.getMonth()]} {displayedMonthDate.getFullYear()}
              </span>
              <button
                onClick={() => setPickerMonthOffset(prev => prev + 1)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days Header: M T W T F S S */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-sky-300/80 mb-2 uppercase tracking-wider">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
            </div>

            {/* Calendar Days Matrix (Zero padded: 01, 02, ..., 31) */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {miniCalendarDays.map((item, idx) => {
                const isSelectedCell = isSelected(item.date);
                const isTodayCell = isToday(item.date);
                const formattedNum = item.dayNumber < 10 ? `0${item.dayNumber}` : `${item.dayNumber}`;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDate(item.date);
                      setIsMonthPickerOpen(false);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      isSelectedCell
                        ? 'bg-[#007AFF] text-white shadow-md font-black scale-105'
                        : isTodayCell
                        ? 'bg-white/20 text-sky-200 font-black'
                        : item.isCurrentMonth
                        ? 'text-white hover:bg-white/10'
                        : 'text-white/30 hover:bg-white/5'
                    }`}
                  >
                    {formattedNum}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Horizontal Weekly Day Strip (Sun 12, Mon 13, Tue 14 [Blue active], Wed 15 ...) */}
      <div className="bg-white border-b border-slate-200/90 px-3 py-3 shadow-2xs">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {currentWeekDays.map((date, idx) => {
            const dayOfWeek = date.getDay(); // 0 to 6
            const isDaySelected = isSelected(date);
            const isDayToday = isToday(date);
            const dayName = isKhmer ? WEEKDAY_NAMES_KM[dayOfWeek] : WEEKDAY_NAMES_EN[dayOfWeek];
            const dateNumber = date.getDate();
            const sessionCount = classCountByDay.get(dayOfWeek) || 0;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer relative ${
                  isDaySelected
                    ? 'bg-[#007AFF] text-white shadow-md shadow-blue-500/25 scale-102 ring-2 ring-blue-400/40'
                    : 'text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                {/* Day Name (Sun, Mon, Tue...) */}
                <span
                  className={`text-[11px] font-semibold tracking-tight transition-colors ${
                    isDaySelected ? 'text-white/90 font-bold' : 'text-slate-400'
                  }`}
                >
                  {dayName}
                </span>

                {/* Date Number (12, 13, 14...) */}
                <span
                  className={`text-base sm:text-lg font-black font-sans leading-tight mt-0.5 ${
                    isDaySelected ? 'text-white' : 'text-slate-800'
                  }`}
                >
                  {dateNumber}
                </span>

                {/* Dot Indicator for scheduled classes */}
                <div className="h-1.5 flex items-center justify-center mt-1">
                  {sessionCount > 0 ? (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDaySelected ? 'bg-white' : 'bg-blue-600'
                      }`}
                    />
                  ) : (
                    <span className="w-1.5 h-1.5" />
                  )}
                </div>

                {/* Today small ring if today and not selected */}
                {isDayToday && !isDaySelected && (
                  <span className="absolute bottom-0.5 text-[8px] font-bold text-blue-600">
                    •
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Timeline Schedule List */}
      <div className="p-4 sm:p-5 min-h-[380px] bg-slate-50/60">
        {/* Timeline Header: Time | Event */}
        <div className="flex items-center text-xs font-bold text-slate-400 mb-3 px-1 uppercase tracking-wider">
          <div className="w-14 sm:w-16 shrink-0 font-medium">{isKhmer ? 'ម៉ោង' : 'Time'}</div>
          <div className="flex-1 font-medium pl-3">{isKhmer ? 'កម្មវិធីសិក្សា' : 'Event'}</div>
        </div>

        {/* Classes List */}
        {classesForSelectedDay.length > 0 ? (
          <div className="space-y-3.5">
            {classesForSelectedDay.map((cls, cIdx) => {
              const accentColor = cls.color || ACCENT_COLORS[cIdx % ACCENT_COLORS.length];
              const teacher = teachers.find(t => t.id === cls.teacherId);

              // Calculate start minutes for current time line comparison
              const [startH, startM] = (cls.startTime || '00:00').split(':').map(Number);
              const classStartMinutes = startH * 60 + startM;

              const [endH, endM] = (cls.endTime || '00:00').split(':').map(Number);
              const classEndMinutes = endH * 60 + endM;

              const isCurrentSession =
                isSelectedDateToday &&
                currentMinutes >= classStartMinutes &&
                currentMinutes <= classEndMinutes;

              return (
                <div key={cls.id || cIdx} className="space-y-2">
                  <div className="flex items-start gap-2 sm:gap-3 group">
                    {/* Timestamp on Left (e.g. 8:10, 9:00, 10:10) */}
                    <div className="w-14 sm:w-16 shrink-0 pt-3 text-right">
                      <span className="font-mono text-xs font-bold text-slate-400 tracking-tight block">
                        {cls.startTime}
                      </span>
                    </div>

                    {/* Clean Event Card (White, subtle shadow, colored left accent bar) */}
                    <div
                      className={`flex-1 bg-white rounded-2xl border transition-all p-3 sm:p-3.5 relative overflow-hidden shadow-2xs hover:shadow-md ${
                        isCurrentSession
                          ? 'border-emerald-300 ring-2 ring-emerald-100 bg-emerald-50/20'
                          : 'border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      {/* Left Colored Accent Bar (Yellow, Blue, Purple...) */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                        style={{ backgroundColor: accentColor }}
                      />

                      <div className="pl-2">
                        {/* Title Row + Options Menu Button */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight truncate">
                              {cls.subject}
                            </h4>
                            {cls.gradeClass && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0">
                                <GraduationCap className="w-2.5 h-2.5 text-indigo-600" />
                                <span>{cls.gradeClass}</span>
                              </span>
                            )}
                          </div>

                          {/* Options Button ("..." menu like in screenshot) */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setActiveMenuClass(cls)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title={isKhmer ? 'ជម្រើសលម្អិត' : 'More options'}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Khmer Subject Name (if exists) */}
                        {cls.khmerSubject && (
                          <p className="text-[10px] text-slate-500 font-khmer mt-0.5 truncate">
                            {cls.khmerSubject}
                          </p>
                        )}

                        {/* Subtitle Details: Time Range • Room • Subject Code */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                          <span className="font-mono font-medium text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            {cls.startTime} - {cls.endTime}
                          </span>

                          {cls.room && (
                            <span className="flex items-center gap-0.5 font-medium text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              <span>{cls.room}</span>
                            </span>
                          )}

                          {cls.subjectCode && (
                            <span className="font-mono text-[9px] uppercase px-1 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                              {cls.subjectCode}
                            </span>
                          )}

                          {!isTeacherAccount && !effectiveTeacher && cls.teacherName && (
                            <span className="text-slate-600 font-medium truncate max-w-[120px]">
                              • {isKhmer && cls.khmerTeacherName ? cls.khmerTeacherName : cls.teacherName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Green Current Time Line Indicator (Shown on Screenshot below current item) */}
                  {isSelectedDateToday && isCurrentSession && (
                    <div className="flex items-center gap-2 pl-14 sm:pl-16 py-1 animate-pulse">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
                      <div className="h-0.5 flex-1 bg-emerald-500 rounded-full" />
                      <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                        {isKhmer ? 'ម៉ោងបច្ចុប្បន្ន' : 'Current Time'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Clean Empty Day State */
          <div className="py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {isKhmer ? 'គ្មានកាលវិភាគបង្រៀនសម្រាប់ថ្ងៃនេះទេ' : 'No classes scheduled for this day'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {isKhmer
                ? `ថ្ងៃ${WEEKDAY_NAMES_KM[selectedDayOfWeek]} ទី ${selectedDate.getDate()} ខែ ${monthNameKm}`
                : `${WEEKDAY_NAMES_EN[selectedDayOfWeek]}, ${monthNameEn} ${selectedDate.getDate()}, ${yearStr}`}
            </p>

            {canCreate && onAddForSlot && (
              <button
                onClick={() => onAddForSlot(selectedDayOfWeek)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isKhmer ? 'បន្ថែមម៉ោងបង្រៀន' : 'Add Class Session'}</span>
              </button>
            )}
          </div>
        )}

        {/* Bottom Actions Bar (Export, Print, Grid Toggle) */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {onToggleToGridView && (
              <button
                onClick={onToggleToGridView}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isKhmer ? 'តារាងពេញ (Full Grid)' : 'Full Grid View'}</span>
              </button>
            )}

            {onExportCsv && (
              <button
                onClick={onExportCsv}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>CSV</span>
              </button>
            )}
          </div>

          {onPrint && (
            <button
              onClick={onPrint}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isKhmer ? 'បោះពុម្ព' : 'Print'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Class Details & Action Modal (Triggered by "..." button) */}
      {activeMenuClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300">
                  {activeMenuClass.subjectCode || 'CLASS SESSION'}
                </span>
                <h3 className="text-sm font-black text-white leading-tight">
                  {activeMenuClass.subject}
                </h3>
              </div>
              <button
                onClick={() => setActiveMenuClass(null)}
                className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3 text-xs">
              {activeMenuClass.khmerSubject && (
                <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                  <span className="text-[10px] text-indigo-500 font-bold block uppercase">{isKhmer ? 'ឈ្មោះខ្មែរ' : 'Khmer Subject'}</span>
                  <span className="font-khmer font-bold text-indigo-950 text-sm">{activeMenuClass.khmerSubject}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">{isKhmer ? 'ម៉ោងបង្រៀន' : 'Time'}</span>
                  <span className="font-mono font-bold text-slate-900">{activeMenuClass.startTime} - {activeMenuClass.endTime}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">{isKhmer ? 'បន្ទប់សិក្សា' : 'Room'}</span>
                  <span className="font-bold text-slate-900">{activeMenuClass.room || 'TBA'}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">{isKhmer ? 'កម្រិតថ្នាក់' : 'Class / Grade'}</span>
                  <span className="font-bold text-slate-900">{activeMenuClass.gradeClass || 'All'}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">{isKhmer ? 'គ្រូបង្រៀន' : 'Faculty'}</span>
                  <span className="font-bold text-slate-900 truncate block">{activeMenuClass.teacherName}</span>
                </div>
              </div>

              {/* Action buttons if permitted */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                {canEdit && onEditSchedule && (
                  <button
                    onClick={() => {
                      const target = activeMenuClass;
                      setActiveMenuClass(null);
                      onEditSchedule(target);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'កែប្រែ' : 'Edit'}</span>
                  </button>
                )}

                {canDelete && onDeleteSchedule && (
                  <button
                    onClick={() => {
                      const target = activeMenuClass;
                      setActiveMenuClass(null);
                      onDeleteSchedule(target.id, target.subject);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isKhmer ? 'លុប' : 'Delete'}</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveMenuClass(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isKhmer ? 'បិទ' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
