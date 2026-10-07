import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../../services/storageService.ts';
import { TeacherTeachingService, TeacherLiveTeachingInfo, TeachingFacultySummary } from '../../services/teacherTeachingStatus.ts';
import { TelegramService } from '../../services/telegramService.ts';
import { AttendanceEngine } from '../../services/attendanceEngine.ts';
import { Teacher, TeacherSubjectSchedule, Department, Employee, ScheduleSubstitution } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { OfflineSyncBadge } from '../sync/OfflineSyncBadge.tsx';
import { ScheduleSubstituteModal } from '../schedules/ScheduleSubstituteModal.tsx';
import {
  GraduationCap,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CalendarDays,
  Send,
  Phone,
  Mail,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Users,
  Activity,
  Layers,
  ChevronRight,
  ExternalLink,
  Table,
  List,
  LayoutGrid,
  LogIn,
  UserPlus,
  UserCheck
} from 'lucide-react';

interface TeacherOnTeachingListProps {
  onOpenMonthlySchedule?: (teacher: Teacher) => void;
  onOpenWeeklySchedule?: (teacher: Teacher) => void;
}

export const TeacherOnTeachingList: React.FC<TeacherOnTeachingListProps> = ({
  onOpenMonthlySchedule,
  onOpenWeeklySchedule
}) => {
  const { isKhmer } = useLanguage();
  const { showToast } = useNotification();
  const { currentUser } = useAuth();

  const [teachers, setTeachers] = useState<Teacher[]>(() => StorageService.getTeachers());
  const [employees, setEmployees] = useState<Employee[]>(() => StorageService.getEmployees().filter(e => e.status === 'Active'));
  const [subjectSchedules, setSubjectSchedules] = useState<TeacherSubjectSchedule[]>(() =>
    StorageService.getSubjectSchedules()
  );
  const [attendance, setAttendance] = useState(() => StorageService.getAttendance());
  const [departments, setDepartments] = useState<Department[]>(() => StorageService.getDepartments());

  // Substitute modal states
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [substituteTargetSchedule, setSubstituteTargetSchedule] = useState<TeacherSubjectSchedule | null>(null);
  const [substituteTargetExisting, setSubstituteTargetExisting] = useState<ScheduleSubstitution | null>(null);

  const handleOpenAssignSubstitute = (sched: TeacherSubjectSchedule) => {
    setSubstituteTargetSchedule(sched);
    const todayDateStr = AttendanceEngine.getCurrentDateString();
    const existing = StorageService.findSubstitution(sched.id, todayDateStr);
    setSubstituteTargetExisting(existing || null);
    setIsSubstituteModalOpen(true);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'teaching' | 'upcoming' | 'completed' | 'off'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'list' | 'cards'>(() => {
    const saved = localStorage.getItem('teachers_on_teaching_view_mode');
    return (saved === 'table' || saved === 'list' || saved === 'cards') ? saved : 'table';
  });
  const [tick, setTick] = useState<number>(0);

  const handleViewModeChange = (mode: 'table' | 'list' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('teachers_on_teaching_view_mode', mode);
  };

  // Subscribe to storage changes
  useEffect(() => {
    const unsub = StorageService.subscribe(() => {
      setTeachers(StorageService.getTeachers());
      setSubjectSchedules(StorageService.getSubjectSchedules());
      setAttendance(StorageService.getAttendance());
      setDepartments(StorageService.getDepartments());
    });
    return unsub;
  }, []);

  // Live ticker updates every 10 seconds to keep live progress & status 100% current
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Compute live statuses for all teachers
  const { list: facultyLiveList, summary } = useMemo(() => {
    return TeacherTeachingService.getAllFacultyLiveStatus(
      teachers.filter(t => t.status === 'Active'),
      subjectSchedules,
      attendance,
      new Date()
    );
  }, [teachers, subjectSchedules, attendance, tick]);

  // Filter list
  const filteredList = useMemo(() => {
    return facultyLiveList.filter(item => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Department filter
      if (selectedDept !== 'All' && item.teacher.department !== selectedDept) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.teacher.fullName.toLowerCase().includes(q);
        const matchKhmer = (item.teacher.khmerName || '').toLowerCase().includes(q);
        const matchId = item.teacher.teacherId.toLowerCase().includes(q);
        const matchSubject = (item.teacher.subject || '').toLowerCase().includes(q);
        const matchCurrentSub = (item.currentSchedule?.subject || '').toLowerCase().includes(q);
        const matchRoom = (item.currentSchedule?.room || '').toLowerCase().includes(q);
        const matchClass = (item.currentSchedule?.gradeClass || '').toLowerCase().includes(q);

        if (!matchName && !matchKhmer && !matchId && !matchSubject && !matchCurrentSub && !matchRoom && !matchClass) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Put currently teaching first, then upcoming, then completed, then off
      const priority = { teaching: 1, upcoming: 2, completed: 3, off: 4 };
      if (priority[a.status] !== priority[b.status]) {
        return priority[a.status] - priority[b.status];
      }
      return a.teacher.fullName.localeCompare(b.teacher.fullName);
    });
  }, [facultyLiveList, statusFilter, selectedDept, searchQuery]);

  const handleSendReminder = (teacher: Teacher, sched?: TeacherSubjectSchedule) => {
    const time = sched?.startTime || '07:30';
    const loc = sched?.room || teacher.assignedLocation || 'Campus';
    TelegramService.sendScheduleReminder(teacher.fullName, time, loc, teacher.department);
    showToast(
      isKhmer
        ? `បានផ្ញើសាររំលឹកកាលវិភាគទៅកាន់ ${teacher.fullName} តាមតេឡេក្រាម!`
        : `Dispatched class schedule notification to ${teacher.fullName} via Telegram`,
      'success'
    );
  };

  const handleAdminScanInTeacher = (teacher: Teacher, sched?: TeacherSubjectSchedule) => {
    if (!sched) return;
    const curTime = AttendanceEngine.getCurrentTimeString();
    const result = AttendanceEngine.processCheckIn({
      personId: teacher.id,
      personName: teacher.fullName,
      khmerName: teacher.khmerName,
      personType: 'teacher',
      department: teacher.department || 'Academic',
      subjectScheduleId: sched.id,
      customTime: curTime,
      allowEarlyCheckInMinutes: 30,
      bypassScheduleWindow: true
    });

    if (result.success) {
      showToast(
        isKhmer
          ? `បានស្កេនវត្តមានចូលសម្រាប់គ្រូ ${teacher.fullName} (${sched.subject}) ដោយជោគជ័យ!`
          : `Recorded check-in for ${teacher.fullName} (${sched.subject})`,
        'success'
      );
      setAttendance(StorageService.getAttendance());
    } else {
      showToast(result.message, 'error');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner with Live Summary Cards & Offline Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {isKhmer ? 'បញ្ជីគ្រូបង្រៀនកំពុងបង្រៀនផ្ទាល់ (Live Roster)' : 'Teachers on Teaching (Live In-Class Roster)'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {isKhmer
              ? 'តាមដានវត្តមាន និងម៉ោងបង្រៀនជាក់ស្តែងរបស់សាស្ត្រាចារ្យគ្រប់បន្ទប់រៀនក្នុងពេលបច្ចុប្បន្ន'
              : 'Real-time monitoring of active class sessions, elapsed lecture time, room assignments, and attendance.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <OfflineSyncBadge variant="pill" />
        </div>
      </div>

      {/* KPI Aggregate Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Currently In Class */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'teaching' ? 'all' : 'teaching')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'teaching'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{isKhmer ? 'កំពុងបង្រៀន' : 'Teaching Now'}</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700">{summary.currentlyTeachingCount}</span>
            <span className="text-xs text-slate-500 font-medium">{isKhmer ? 'នាក់' : 'faculty'}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
            {isKhmer ? 'កំពុងនៅក្នុងបន្ទប់រៀន' : 'Active in class lecture'}
          </span>
        </button>

        {/* Scheduled Today */}
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs'
              : 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{isKhmer ? 'មានកាលវិភាគថ្ងៃនេះ' : 'Scheduled Today'}</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-700">{summary.scheduledTodayCount}</span>
            <span className="text-xs text-slate-500 font-medium">/ {summary.totalFaculty}</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-semibold block mt-1">
            {isKhmer ? 'គ្រូមានម៉ោងបង្រៀន' : 'Faculty rostered today'}
          </span>
        </button>

        {/* Upcoming Next */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'upcoming' ? 'all' : 'upcoming')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'upcoming'
              ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/30 shadow-xs'
              : 'bg-white border-slate-200 hover:border-sky-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{isKhmer ? 'ត្រៀមបង្រៀនបន្ទាប់' : 'Upcoming Classes'}</span>
            <Clock className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-sky-700">
              {facultyLiveList.filter(i => i.status === 'upcoming').length}
            </span>
            <span className="text-xs text-slate-500 font-medium">{isKhmer ? 'នាក់' : 'faculty'}</span>
          </div>
          <span className="text-[10px] text-sky-600 font-semibold block mt-1">
            {isKhmer ? 'វេនបន្ទាប់ក្នុងថ្ងៃនេះ' : 'Has class starting next'}
          </span>
        </button>

        {/* Completed Today */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'completed'
              ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/30 shadow-xs'
              : 'bg-white border-slate-200 hover:border-purple-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{isKhmer ? 'បានបង្រៀនចប់' : 'Completed Today'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-700">{summary.completedTodayCount}</span>
            <span className="text-xs text-slate-500 font-medium">{isKhmer ? 'នាក់' : 'faculty'}</span>
          </div>
          <span className="text-[10px] text-purple-600 font-semibold block mt-1">
            {isKhmer ? 'ចប់វេនបង្រៀនទាំងអស់' : 'All day sessions done'}
          </span>
        </button>

        {/* Checked In */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{isKhmer ? 'បានស្កេនវត្តមាន' : 'Checked In'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{summary.checkedInTodayCount}</span>
            <span className="text-xs text-slate-500 font-medium">/ {summary.scheduledTodayCount}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block mt-1">
            {isKhmer ? 'ស្កេនចូលសាលារួចរាល់' : 'Recorded attendance today'}
          </span>
        </div>
      </div>

      {/* Filter, Search, and View Mode Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Status Filter Buttons */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isKhmer ? 'ទាំងអស់' : 'All Faculty'}
            </button>
            <button
              onClick={() => setStatusFilter('teaching')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                statusFilter === 'teaching'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isKhmer ? 'កំពុងបង្រៀន' : 'Teaching Now'}</span>
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'upcoming' ? 'bg-sky-600 text-white shadow-2xs' : 'text-sky-700 hover:text-sky-900'
              }`}
            >
              {isKhmer ? 'ត្រៀមបង្រៀន' : 'Upcoming'}
            </button>
            <button
              onClick={() => setStatusFilter('off')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'off' ? 'bg-slate-300 text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isKhmer ? 'សម្រាក' : 'Off Today'}
            </button>
          </div>

          {/* Department Dropdown */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">{isKhmer ? 'គ្រប់ដេប៉ាតឺម៉ង់ (All Departments)' : 'All Departments'}</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input & View Mode Toggles */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isKhmer ? 'ស្វែងរកគ្រូ មុខវិជ្ជា បន្ទប់រៀន...' : 'Search teacher, class, room...'}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
            />
          </div>

          {/* View Mode Toggle: Table | List | Cards */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => handleViewModeChange('table')}
              title={isKhmer ? 'ទិដ្ឋភាពតារាង (Table View)' : 'Table View'}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">{isKhmer ? 'តារាង' : 'Table'}</span>
            </button>

            <button
              onClick={() => handleViewModeChange('list')}
              title={isKhmer ? 'ទិដ្ឋភាពបញ្ជី (List View)' : 'List View'}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">{isKhmer ? 'បញ្ជី' : 'List'}</span>
            </button>

            <button
              onClick={() => handleViewModeChange('cards')}
              title={isKhmer ? 'ទិដ្ឋភាពកាត (Cards View)' : 'Cards View'}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">{isKhmer ? 'កាត' : 'Cards'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Faculty Content View: Table, List, or Cards */}
      {filteredList.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-700 text-base">
            {isKhmer ? 'រកមិនឃើញគ្រូបង្រៀនតាមលក្ខខណ្ឌស្វែងរកទេ' : 'No faculty found matching the active criteria'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isKhmer ? 'សូមសាកល្បងផ្លាស់ប្តូរការស្វែងរក ឬជ្រើសរើសដេប៉ាតឺម៉ង់ផ្សេង' : 'Try resetting filters or searching a different keyword.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* ======================== 1. TABLE VIEW ======================== */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">{isKhmer ? 'គ្រូបង្រៀន' : 'Faculty / Teacher'}</th>
                  <th className="py-3.5 px-4">{isKhmer ? 'ដេប៉ាតឺម៉ង់ / មុខវិជ្ជា' : 'Department & Subject'}</th>
                  <th className="py-3.5 px-4">{isKhmer ? 'ស្ថានភាពផ្ទាល់' : 'Live Status'}</th>
                  <th className="py-3.5 px-4">{isKhmer ? 'វេនបង្រៀន & បន្ទប់' : 'Current / Next Session'}</th>
                  <th className="py-3.5 px-4">{isKhmer ? 'វត្តមាន' : 'Attendance'}</th>
                  <th className="py-3.5 px-4">{isKhmer ? 'បន្ទុកម៉ោង' : 'Workload'}</th>
                  <th className="py-3.5 px-4 text-right">{isKhmer ? 'សកម្មភាព' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map(item => {
                  const {
                    teacher,
                    status,
                    currentSchedule,
                    upcomingSchedules,
                    allTodaySchedules,
                    progressPercentage,
                    minutesRemainingInCurrent,
                    isCheckedIn,
                    checkInTime
                  } = item;

                  const isTeaching = status === 'teaching';
                  const isUpcoming = status === 'upcoming';
                  const isCompleted = status === 'completed';

                  return (
                    <tr
                      key={teacher.id}
                      className={`transition-colors hover:bg-slate-50/80 ${
                        isTeaching ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      {/* Teacher Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {teacher.photoUrl && teacher.photoUrl.trim() ? (
                              <img
                                src={teacher.photoUrl.trim()}
                                alt={teacher.fullName}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                                onError={e => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                                {teacher.fullName.charAt(0)}
                              </div>
                            )}
                            {isTeaching && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-ping" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {teacher.fullName}
                            </div>
                            {teacher.khmerName && (
                              <div className="text-[11px] text-slate-500 font-medium truncate">
                                {teacher.khmerName}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                {teacher.teacherId}
                              </span>
                              {teacher.phone && (
                                <a
                                  href={`tel:${teacher.phone}`}
                                  className="text-[11px] font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{teacher.phone}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Subject */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {teacher.department}
                        </span>
                        <div className="text-slate-600 font-medium mt-1 truncate max-w-[150px]">
                          {teacher.subject || teacher.position}
                        </div>
                      </td>

                      {/* Live Status */}
                      <td className="py-3 px-4">
                        {isTeaching ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              {isKhmer ? 'កំពុងបង្រៀន' : 'IN CLASS'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                              <span>{minutesRemainingInCurrent}m {isKhmer ? 'នៅសល់' : 'left'}</span>
                              <span>•</span>
                              <span>{progressPercentage}%</span>
                            </div>
                            <div className="w-28 bg-emerald-200/80 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        ) : isUpcoming ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            <Clock className="w-3 h-3 text-sky-500" />
                            <span>{isKhmer ? 'ត្រៀមបង្រៀន' : 'Upcoming'}</span>
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <CheckCircle2 className="w-3 h-3 text-purple-500" />
                            <span>{isKhmer ? 'បានបង្រៀនចប់' : 'Completed'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                            {isKhmer ? 'សម្រាក' : 'Off Today'}
                          </span>
                        )}
                      </td>

                      {/* Current / Next Session */}
                      <td className="py-3 px-4">
                        {isTeaching && currentSchedule ? (
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                                {currentSchedule.gradeClass}
                              </span>
                              <span className="truncate max-w-[140px]">{currentSchedule.subject}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-700">{currentSchedule.room}</span>
                              <span>•</span>
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{currentSchedule.startTime}–{currentSchedule.endTime}</span>
                            </div>
                          </div>
                        ) : isUpcoming && upcomingSchedules.length > 0 ? (
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200">
                                {upcomingSchedules[0].gradeClass}
                              </span>
                              <span className="truncate max-w-[140px]">{upcomingSchedules[0].subject}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{upcomingSchedules[0].room}</span>
                              <span>•</span>
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{upcomingSchedules[0].startTime}–{upcomingSchedules[0].endTime}</span>
                            </div>
                          </div>
                        ) : isCompleted ? (
                          <span className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-purple-500" />
                            <span>{allTodaySchedules.length} {isKhmer ? 'វេនបានបញ្ចប់' : 'sessions delivered'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {isKhmer ? 'គ្មានកាលវិភាគថ្ងៃនេះ' : 'No classes today'}
                          </span>
                        )}
                      </td>

                      {/* Attendance */}
                      <td className="py-3 px-4">
                        {isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{checkInTime ? `In: ${checkInTime}` : (isKhmer ? 'បានស្កេន' : 'Checked In')}</span>
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              isTeaching
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>{isKhmer ? 'មិនទាន់ស្កេន' : 'Not Checked In'}</span>
                          </span>
                        )}
                      </td>

                      {/* Workload */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {allTodaySchedules.length} {isKhmer ? 'ម៉ោងថ្ងៃនេះ' : 'today'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.totalWeeklyHours} hrs/wk
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {isTeaching && !isCheckedIn && currentSchedule && (
                            <button
                              onClick={() => handleAdminScanInTeacher(teacher, currentSchedule)}
                              className="px-2 py-1 rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer animate-pulse shrink-0"
                              title={isKhmer ? `ស្កេនវត្តមានចូលសម្រាប់ ${teacher.fullName}` : `Scan In ${teacher.fullName}`}
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>{isKhmer ? 'ស្កេនចូល' : 'Scan In'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => onOpenMonthlySchedule && onOpenMonthlySchedule(teacher)}
                            className="p-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                            title={isKhmer ? 'មើលកាលវិភាគប្រចាំខែ' : 'View Monthly Calendar Schedule'}
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenWeeklySchedule && onOpenWeeklySchedule(teacher)}
                            className="p-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                            title={isKhmer ? 'មើលកាលវិភាគប្រចាំសប្តាហ៍' : 'View Weekly Timetable'}
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSendReminder(teacher, currentSchedule || upcomingSchedules[0])}
                            className="p-1.5 rounded-lg text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
                            title={isKhmer ? 'ផ្ញើសាររំលឹកតាមតេឡេក្រាម' : 'Send Telegram reminder'}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Status Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">
                {isKhmer
                  ? `បង្ហាញ ${filteredList.length} នាក់ ក្នុងចំណោម ${facultyLiveList.length} នាក់`
                  : `Showing ${filteredList.length} of ${facultyLiveList.length} faculty`}
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {summary.currentlyTeachingCount} {isKhmer ? 'កំពុងបង្រៀន' : 'Teaching Now'}
              </span>
              <span>•</span>
              <span className="text-indigo-700 font-bold">
                {summary.checkedInTodayCount} {isKhmer ? 'បានស្កេនវត្តមាន' : 'Checked In'}
              </span>
            </div>
            <div className="text-slate-500 text-[11px]">
              {isKhmer ? 'ធ្វើបច្ចុប្បន្នភាពរៀងរាល់ ១០ វិនាទី' : 'Live updates every 10 seconds'}
            </div>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* ======================== 2. LIST VIEW ======================== */
        <div className="space-y-3">
          {filteredList.map(item => {
            const {
              teacher,
              status,
              currentSchedule,
              upcomingSchedules,
              allTodaySchedules,
              progressPercentage,
              minutesRemainingInCurrent,
              isCheckedIn,
              checkInTime
            } = item;

            const isTeaching = status === 'teaching';
            const isUpcoming = status === 'upcoming';
            const isCompleted = status === 'completed';

            return (
              <div
                key={teacher.id}
                className={`bg-white rounded-2xl border p-4 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isTeaching
                    ? 'border-emerald-400 ring-2 ring-emerald-500/20 bg-gradient-to-r from-emerald-50/40 via-white to-white'
                    : isUpcoming
                    ? 'border-sky-200 hover:border-sky-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Left: Faculty Identity */}
                <div className="flex items-center gap-3.5 min-w-[260px]">
                  <div className="relative shrink-0">
                    {teacher.photoUrl && teacher.photoUrl.trim() ? (
                      <img
                        src={teacher.photoUrl.trim()}
                        alt={teacher.fullName}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-base shadow-2xs">
                        {teacher.fullName.charAt(0)}
                      </div>
                    )}
                    {isTeaching && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-ping" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {teacher.fullName}
                      </span>
                      {teacher.khmerName && (
                        <span className="text-xs text-slate-500 font-medium truncate">
                          ({teacher.khmerName})
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {teacher.teacherId}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {teacher.department}
                      </span>
                      {teacher.phone && (
                        <a
                          href={`tel:${teacher.phone}`}
                          className="text-[11px] font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{teacher.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Live Class Status & Session Details */}
                <div className="flex-1 min-w-[280px] bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    {isTeaching ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span>{isKhmer ? 'កំពុងបង្រៀនផ្ទាល់' : 'IN CLASS NOW'}</span>
                      </span>
                    ) : isUpcoming ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        <Clock className="w-3 h-3 text-sky-600" />
                        <span>{isKhmer ? 'ត្រៀមបង្រៀនបន្ទាប់' : 'Upcoming Session'}</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        <CheckCircle2 className="w-3 h-3 text-purple-600" />
                        <span>{isKhmer ? 'បានបង្រៀនចប់ថ្ងៃនេះ' : 'Day Classes Done'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">
                        {isKhmer ? 'គ្មានកាលវិភាគថ្ងៃនេះ' : 'Off Today'}
                      </span>
                    )}

                    {/* Attendance badge */}
                    {isCheckedIn ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>In: {checkInTime || 'Checked'}</span>
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isTeaching
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isKhmer ? 'មិនទាន់ស្កេន' : 'Not Checked In'}
                      </span>
                    )}
                  </div>

                  {isTeaching && currentSchedule ? (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-black">
                            {currentSchedule.gradeClass}
                          </span>
                          <span>{currentSchedule.subject}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-2">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {currentSchedule.room}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {currentSchedule.startTime}–{currentSchedule.endTime}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar & Countdown */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-700">
                          <span>{isKhmer ? 'រយៈពេលបង្រៀន' : 'Elapsed Lecture Time'} ({progressPercentage}%)</span>
                          <span>{minutesRemainingInCurrent} {isKhmer ? 'នាទីទៀត' : 'min remaining'}</span>
                        </div>
                        <div className="w-full bg-emerald-200/70 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : isUpcoming && upcomingSchedules.length > 0 ? (
                    <div className="text-xs flex flex-wrap items-center justify-between gap-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[11px] font-bold">
                          {upcomingSchedules[0].gradeClass}
                        </span>
                        <span>{upcomingSchedules[0].subject}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {upcomingSchedules[0].room}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {upcomingSchedules[0].startTime}–{upcomingSchedules[0].endTime}
                        </span>
                      </div>
                    </div>
                  ) : isCompleted ? (
                    <div className="text-xs text-purple-800 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>
                        {allTodaySchedules.length} {isKhmer ? 'វេនបានបញ្ចប់ថ្ងៃនេះ' : 'sessions completed today'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      <span>{isKhmer ? 'មិនមានម៉ោងបង្រៀនដែលបានកំណត់សម្រាប់ថ្ងៃនេះទេ' : 'No academic sessions scheduled for today.'}</span>
                    </div>
                  )}
                </div>

                {/* Right: Workload & Action Buttons */}
                <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                  <div className="text-right text-xs">
                    <div className="font-bold text-slate-800">
                      {allTodaySchedules.length} {isKhmer ? 'ម៉ោងថ្ងៃនេះ' : 'classes today'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {item.totalWeeklyHours} hrs/wk
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isTeaching && !isCheckedIn && currentSchedule && (
                      <button
                        onClick={() => handleAdminScanInTeacher(teacher, currentSchedule)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs flex items-center gap-1 cursor-pointer animate-pulse shrink-0"
                        title={isKhmer ? `ស្កេនវត្តមានចូលសម្រាប់ ${teacher.fullName}` : `Scan In ${teacher.fullName}`}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{isKhmer ? 'ស្កេនចូល' : 'Scan In'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => onOpenMonthlySchedule && onOpenMonthlySchedule(teacher)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title={isKhmer ? 'មើលកាលវិភាគប្រចាំខែ' : 'View Monthly Calendar Schedule'}
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isKhmer ? 'កាលវិភាគខែ' : 'Monthly'}</span>
                    </button>

                    <button
                      onClick={() => onOpenWeeklySchedule && onOpenWeeklySchedule(teacher)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title={isKhmer ? 'មើលកាលវិភាគប្រចាំសប្តាហ៍' : 'View Weekly Timetable'}
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isKhmer ? 'សប្តាហ៍' : 'Weekly'}</span>
                    </button>

                    <button
                      onClick={() => handleSendReminder(teacher, currentSchedule || upcomingSchedules[0])}
                      className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
                      title={isKhmer ? 'ផ្ញើសាររំលឹកតាមតេឡេក្រាម' : 'Send Telegram schedule reminder'}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================== 3. CARDS GRID VIEW ======================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map(item => {
            const { teacher, status, currentSchedule, upcomingSchedules, allTodaySchedules, progressPercentage, minutesRemainingInCurrent, isCheckedIn, checkInTime } = item;

            const isTeaching = status === 'teaching';
            const isUpcoming = status === 'upcoming';
            const isCompleted = status === 'completed';
            const isOff = status === 'off';

            return (
              <div
                key={teacher.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isTeaching
                    ? 'border-emerald-300 ring-2 ring-emerald-500/20'
                    : isUpcoming
                    ? 'border-sky-200'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Bar on Card */}
                  <div
                    className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold border-b ${
                      isTeaching
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : isUpcoming
                        ? 'bg-sky-50 text-sky-800 border-sky-100'
                        : isCompleted
                        ? 'bg-purple-50 text-purple-800 border-purple-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isTeaching ? (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                          <span className="tracking-wide uppercase text-[11px] font-black">
                            {isKhmer ? 'កំពុងបង្រៀនផ្ទាល់ (IN CLASS)' : 'IN CLASS NOW'}
                          </span>
                        </>
                      ) : isUpcoming ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-sky-600" />
                          <span>{isKhmer ? 'ត្រៀមបង្រៀនបន្ទាប់' : 'Upcoming Session'}</span>
                        </>
                      ) : isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                          <span>{isKhmer ? 'បានបង្រៀនចប់ថ្ងៃនេះ' : 'Day Classes Done'}</span>
                        </>
                      ) : (
                        <span>{isKhmer ? 'គ្មានកាលវិភាគថ្ងៃនេះ' : 'Off Today'}</span>
                      )}
                    </div>

                    {/* Attendance Pill */}
                    <div className="flex items-center gap-1.5">
                      {isCheckedIn ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isTeaching
                              ? 'bg-emerald-700 text-emerald-100'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>In: {checkInTime || 'Checked'}</span>
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isTeaching
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isTeaching ? (isKhmer ? 'មិនទាន់ស្កេន' : 'Not Checked In') : (isKhmer ? 'មិនទាន់ស្កេន' : 'Not checked in')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Profile Header */}
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      {teacher.photoUrl && teacher.photoUrl.trim() ? (
                        <img
                          src={teacher.photoUrl.trim()}
                          alt={teacher.fullName}
                          className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold text-base flex items-center justify-center ring-2 ring-slate-200 shrink-0">
                          {teacher.fullName.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-slate-900 text-sm leading-tight truncate">
                          {teacher.fullName}
                        </h3>
                        {teacher.khmerName && (
                          <p className="text-[11px] text-slate-500 font-khmer truncate">
                            {teacher.khmerName}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {teacher.teacherId}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {teacher.subject}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {teacher.department}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Session Details */}
                  <div className="p-4 space-y-3">
                    {isTeaching && currentSchedule ? (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-extrabold text-emerald-950 text-xs block">
                              {currentSchedule.gradeClass} • {currentSchedule.subject}
                            </span>
                            <span className="text-[11px] text-emerald-800 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              <span>{currentSchedule.room}</span>
                              <span>•</span>
                              <Clock className="w-3 h-3 text-emerald-600" />
                              <span>{currentSchedule.startTime} – {currentSchedule.endTime}</span>
                            </span>
                          </div>
                          {currentUser.role !== 'teacher' && (
                            <span className="font-mono font-bold text-xs text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
                              {currentSchedule.currency === 'KHR' ? '៛' : '$'}{(currentSchedule.hourlyRate ?? teacher.hourlyRate ?? 20).toFixed(0)}/hr
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-emerald-900 font-bold mb-1">
                            <span>{isKhmer ? 'ដំណើរការបង្រៀន' : 'Class Progress'}: {progressPercentage}%</span>
                            <span>{minutesRemainingInCurrent} {isKhmer ? 'នាទីទៀត' : 'min remaining'}</span>
                          </div>
                          <div className="w-full bg-emerald-200/70 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : isUpcoming && upcomingSchedules.length > 0 ? (
                      <div className="p-3 bg-sky-50/60 border border-sky-200 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-sky-700 block tracking-wider mb-1">
                          {isKhmer ? 'វេនបង្រៀនបន្ទាប់' : 'Next Session Today'}:
                        </span>
                        <div className="font-bold text-slate-800 text-xs">
                          {upcomingSchedules[0].gradeClass} • {upcomingSchedules[0].subject}
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{upcomingSchedules[0].room}</span>
                          <span>•</span>
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{upcomingSchedules[0].startTime} – {upcomingSchedules[0].endTime}</span>
                        </div>
                      </div>
                    ) : isCompleted ? (
                      <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                        <div>
                          <span className="font-bold block">
                            {isKhmer ? 'បានបញ្ចប់គ្រប់ម៉ោងបង្រៀនថ្ងៃនេះ' : 'All Rostered Classes Completed'}
                          </span>
                          <span className="text-[11px] text-purple-700 block">
                            {allTodaySchedules.length} {isKhmer ? 'វេនបានបញ្ចប់' : 'sessions delivered today'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{isKhmer ? 'មិនមានម៉ោងបង្រៀនដែលបានកំណត់សម្រាប់ថ្ងៃនេះទេ' : 'No academic sessions scheduled for today.'}</span>
                      </div>
                    )}

                    {/* Active Substitution Banner if any schedule today is substituted */}
                    {(() => {
                      const todayStr = AttendanceEngine.getCurrentDateString();
                      const todaySubst = allTodaySchedules
                        .map(s => StorageService.findSubstitution(s.id, todayStr))
                        .find(Boolean);
                      if (!todaySubst) return null;
                      return (
                        <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between text-purple-900 font-bold text-[11px]">
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                              <span>{isKhmer ? 'មានអ្នកបង្រៀនជំនួសថ្ងៃនេះ៖' : 'Active Substitute Today:'}</span>
                            </span>
                            <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded font-semibold">
                              {todaySubst.subject}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {todaySubst.assignees && todaySubst.assignees.length > 0 ? (
                              todaySubst.assignees.map((a, i) => (
                                <span
                                  key={a.id || i}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-white text-purple-900 border border-purple-200 shadow-2xs"
                                >
                                  <span>{a.substituteName}</span>
                                  <span className="opacity-75 text-[9px]">
                                    ({a.substituteType === 'employee' ? (isKhmer ? 'បុគ្គលិក' : 'Staff') : (isKhmer ? 'គ្រូ' : 'Teacher')}, {a.allocatedHours}h)
                                  </span>
                                  {a.substituteType === 'employee' && (
                                    <span className="font-mono text-purple-700 bg-purple-100 px-1 rounded">
                                      ${Number(a.manualGrossWage ?? 0).toFixed(2)}
                                    </span>
                                  )}
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-white text-purple-900 border border-purple-200">
                                <span>{todaySubst.substituteName}</span>
                                <span className="opacity-75 text-[9px]">
                                  ({todaySubst.substituteType === 'employee' ? (isKhmer ? 'បុគ្គលិក' : 'Staff') : (isKhmer ? 'គ្រូ' : 'Teacher')})
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Teacher Contacts & Stats Row */}
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">
                          {allTodaySchedules.length} {isKhmer ? 'ម៉ោងថ្ងៃនេះ' : 'classes today'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">
                          {item.totalWeeklyHours} hrs/wk
                        </span>
                      </div>

                      {teacher.phone && (
                        <a
                          href={`tel:${teacher.phone}`}
                          className="text-[11px] font-mono text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{teacher.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isTeaching && !isCheckedIn && currentSchedule && (
                      <button
                        onClick={() => handleAdminScanInTeacher(teacher, currentSchedule)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs flex items-center gap-1 cursor-pointer animate-pulse shrink-0"
                        title={isKhmer ? `ស្កេនវត្តមានចូលសម្រាប់ ${teacher.fullName}` : `Scan In ${teacher.fullName}`}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{isKhmer ? 'ស្កេនចូល' : 'Scan In'}</span>
                      </button>
                    )}
                    {/* View Monthly Calendar Schedule */}
                    <button
                      onClick={() => onOpenMonthlySchedule && onOpenMonthlySchedule(teacher)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title={isKhmer ? 'មើលកាលវិភាគប្រចាំខែ' : 'View Monthly Calendar Schedule'}
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isKhmer ? 'កាលវិភាគខែ' : 'Monthly'}</span>
                    </button>

                    {/* View Weekly Mon-Sat Timetable */}
                    <button
                      onClick={() => onOpenWeeklySchedule && onOpenWeeklySchedule(teacher)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title={isKhmer ? 'មើលកាលវិភាគប្រចាំសប្តាហ៍ (ចន្ទ-សៅរ៍)' : 'View Weekly Timetable (Mon-Sat)'}
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isKhmer ? 'សប្តាហ៍' : 'Weekly'}</span>
                    </button>

                    {/* Admin Assign Substitute Button */}
                    {currentUser && currentUser.role !== 'teacher' && (currentSchedule || upcomingSchedules[0] || allTodaySchedules[0]) && (
                      <button
                        onClick={() => handleOpenAssignSubstitute((currentSchedule || upcomingSchedules[0] || allTodaySchedules[0])!)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title={isKhmer ? 'ចាត់តាំងគ្រូ ឬបុគ្គលិកបង្រៀនជំនួស (អវត្តមាន)' : 'Assign Teacher or Staff Substitute'}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                        <span>{isKhmer ? 'ជំនួស' : 'Substitute'}</span>
                      </button>
                    )}
                  </div>

                  {/* Telegram Reminder */}
                  <button
                    onClick={() => handleSendReminder(teacher, currentSchedule || upcomingSchedules[0])}
                    className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
                    title={isKhmer ? 'ផ្ញើសាររំលឹកតាមតេឡេក្រាម' : 'Send Telegram schedule reminder'}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Substitute Assignment Modal */}
      {isSubstituteModalOpen && (
        <ScheduleSubstituteModal
          isOpen={isSubstituteModalOpen}
          onClose={() => {
            setIsSubstituteModalOpen(false);
            setSubstituteTargetSchedule(null);
            setSubstituteTargetExisting(null);
          }}
          schedule={substituteTargetSchedule}
          selectedDate={AttendanceEngine.getCurrentDateString()}
          teachers={teachers}
          employees={employees}
          currentUser={currentUser || { id: 'admin', role: 'super_admin', fullName: 'Administrator', email: 'admin@school.edu', department: 'Administration', status: 'Active', createdAt: '' }}
          existingSubstitution={substituteTargetExisting}
          onSuccess={() => {
            setAttendance(StorageService.getAttendance());
          }}
        />
      )}
    </div>
  );
};
